import request from 'supertest';
import express from 'express';
import fs from 'fs';
import { Readable } from 'stream';
import { apiRouter } from '../../../routes/api';
import { globalErrorHandler } from '../../../middleware/errorHandler';

// Mock fs and fs.promises
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock fs.promises which is used by VideoService
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    readdir: jest.fn(),
    stat: jest.fn(),
    access: jest.fn()
  },
  existsSync: jest.fn(),
  statSync: jest.fn(),
  createReadStream: jest.fn()
}));

const mockFsPromises = jest.requireMock('fs').promises;

describe('API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', apiRouter);
    app.use(globalErrorHandler);
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Default mocks for fs operations
    mockFsPromises.readdir.mockResolvedValue([]);
    mockFsPromises.stat.mockResolvedValue({
      size: 1000000,
      isFile: () => true,
      isDirectory: () => false
    } as any);
    mockFsPromises.access.mockResolvedValue(undefined);
    mockFs.existsSync.mockReturnValue(true);
    mockFs.statSync.mockReturnValue({
      size: 1000000,
      isFile: () => true
    } as any);
    
    // Default stream mock - will be overridden in specific tests
    const defaultMockStream = new Readable({
      read() {
        this.push(null); // End the stream immediately
      }
    });
    mockFs.createReadStream.mockReturnValue(defaultMockStream as any);
  });

  describe('GET /api/videos', () => {
    it('should return list of videos', async () => {
      const response = await request(app)
        .get('/api/videos')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.videos).toEqual([]);
      expect(response.body.data.totalCount).toBe(0);
    });

    it('should handle video service errors', async () => {
      // Mock readdir to throw error - VideoService uses fs.promises.readdir
      const mockError = new Error('Service error');
      mockFsPromises.readdir.mockRejectedValue(mockError);

      const response = await request(app)
        .get('/api/videos')
        .expect(200); // VideoService is designed to be fault-tolerant, returns 200 with errors array

      expect(response.body.status).toBe('success');
      expect(response.body.data.errors).toHaveLength(1);
      expect(response.body.data.errors[0]).toContain('Service error');
      expect(response.body.data.videos).toEqual([]);
      expect(response.body.data.totalCount).toBe(0);
    });
  });

  describe('GET /api/videos/:id', () => {
    it('should return 404 for non-existent video', async () => {
      const response = await request(app)
        .get('/api/videos/nonexistent')
        .expect(404);

      expect(response.body.status).toBe('error');
      const errorMessage = response.body.error?.message || response.body.message;
      expect(errorMessage).toContain('not found');
    });
  });

  describe('GET /api/stream/:filename', () => {
    // Note: Range streaming tests are covered by E2E tests where actual streaming works
    // These integration tests would require complex stream mocking that doesn't add value
    // beyond what the working E2E tests already validate

    it('should return 404 for non-existent file', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const response = await request(app)
        .get('/api/stream/nonexistent.mp4')
        .expect(404);

      expect(response.body.status).toBe('error');
      const errorMessage = response.body.error?.message || response.body.message;
      expect(errorMessage).toContain('not found');
    });

    it('should handle invalid range headers', async () => {
      const response = await request(app)
        .get('/api/stream/test.mp4')
        .set('Range', 'bytes=-')
        .expect(400);

      expect(response.body.status).toBe('error');
      const errorMessage = response.body.error?.message || response.body.message;
      expect(errorMessage).toContain('Invalid range header format');
    });

    it('should handle range not satisfiable', async () => {
      const response = await request(app)
        .get('/api/stream/test.mp4')
        .set('Range', 'bytes=2000000-3000000') // Beyond file size
        .expect(416);

      expect(response.body.status).toBe('error');
      const errorMessage = response.body.error?.message || response.body.message;
      expect(errorMessage).toBe('Range not satisfiable');
    });

    it('should reject path traversal attempts', async () => {
      const response = await request(app)
        .get('/api/stream/..%2F..%2F..%2Fetc%2Fpasswd')  // URL encoded ../../../etc/passwd
        .expect(400);

      expect(response.body.status).toBe('error');
      const errorMessage = response.body.error?.message || response.body.message;
      expect(errorMessage).toContain('Invalid filename');
    });

    it('should reject absolute paths', async () => {
      const response = await request(app)
        .get('/api/stream/%2Fetc%2Fpasswd')  // URL encoded /etc/passwd
        .expect(400);

      expect(response.body.status).toBe('error');
      const errorMessage = response.body.error?.message || response.body.message;
      expect(errorMessage).toContain('Invalid filename');
    });

    it('should reject non-video file extensions', async () => {
      const response = await request(app)
        .get('/api/stream/malicious.exe')
        .expect(400);

      expect(response.body.status).toBe('error');
      const errorMessage = response.body.error?.message || response.body.message;
      expect(errorMessage).toContain('Invalid file type');
    });

    it('should reject files with no extension', async () => {
      const response = await request(app)
        .get('/api/stream/README')
        .expect(400);

      expect(response.body.status).toBe('error');
      const errorMessage = response.body.error?.message || response.body.message;
      expect(errorMessage).toContain('Invalid file type');
    });
  });

  describe('GET /api/thumbnails/:filename', () => {
    const mockStat = {
      size: 1024,
      isFile: () => true
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockFs.statSync.mockReturnValue(mockStat as fs.Stats);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.createReadStream.mockImplementation((_filePath: fs.PathLike, options?: any) => {
        const currentStat = mockFs.statSync.mock.results[mockFs.statSync.mock.results.length - 1]?.value as fs.Stats | undefined;
        const totalSize = currentStat?.size ?? mockStat.size;
        const start = typeof options?.start === 'number' ? options.start : 0;
        const end = typeof options?.end === 'number' ? options.end : totalSize - 1;
        const length = Math.max(0, end - start + 1);

        return Readable.from([Buffer.alloc(length)]) as any;
      });
    });

    it('should return 404 for non-existent thumbnail', async () => {
      mockFs.statSync.mockImplementation(() => {
        const err = new Error('not found') as NodeJS.ErrnoException;
        err.code = 'ENOENT';
        throw err;
      });

      const response = await request(app)
        .get('/api/thumbnails/nonexistent.jpg')
        .expect(404);

      expect(response.body.status).toBe('error');
      const errorMessage = response.body.error?.message || response.body.message;
      expect(errorMessage).toContain('not found');
    });

    it('should reject thumbnails exceeding size limit', async () => {
      const largeStat = {
        ...mockStat,
        size: 20 * 1024 * 1024
      };
      mockFs.statSync.mockReturnValue(largeStat as fs.Stats);

      const response = await request(app)
        .get('/api/thumbnails/large.jpg')
        .expect(413);

      expect(response.body.status).toBe('error');
      const errorMessage = response.body.error?.message || response.body.message;
      expect(errorMessage).toContain('too large');
    });

    it('should serve thumbnails under size limit', async () => {
      const response = await request(app)
        .get('/api/thumbnails/test.jpg')
        .expect(200);

      expect(response.headers['content-type']).toBe('image/jpeg');
      expect(response.headers['cache-control']).toBe('public, max-age=86400');
    });

    it('should support range requests', async () => {
      const response = await request(app)
        .get('/api/thumbnails/test.jpg')
        .set('Range', 'bytes=0-511')
        .expect(206);

      expect(response.headers['content-range']).toMatch(/bytes 0-511\/\d+/);
      expect(response.headers['content-length']).toBe('512');
    });

    it('should handle invalid range headers', async () => {
      const response = await request(app)
        .get('/api/thumbnails/test.jpg')
        .set('Range', 'bytes=-')
        .expect(400);

      expect(response.body.status).toBe('error');
      const errorMessage = response.body.error?.message || response.body.message;
      expect(errorMessage).toContain('Invalid range header format');
    });

    it('should handle range not satisfiable', async () => {
      const response = await request(app)
        .get('/api/thumbnails/test.jpg')
        .set('Range', 'bytes=2000-3000')
        .expect(416);

      expect(response.body.status).toBe('error');
      const errorMessage = response.body.error?.message || response.body.message;
      expect(errorMessage).toBe('Range not satisfiable');
    });

    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/thumbnails/test.jpg')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['accept-ranges']).toBe('bytes');
    });
  });
});
