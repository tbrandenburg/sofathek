import request from 'supertest';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

const mockVideosDir = '/tmp/mock-videos-dir';
const mockTempDir = '/tmp/mock-custom-temp-dir';

jest.mock('../../../config', () => ({
  config: {
    videosDir: mockVideosDir,
    tempDir: mockTempDir,
    thumbnailMaxSize: 10 * 1024 * 1024,
    thumbnailCacheDuration: 86400
  }
}));

import { apiRouter } from '../../../routes/api';
import { globalErrorHandler } from '../../../middleware/errorHandler';

// Mock fs and fs.promises
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

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

describe('GET /api/thumbnails/:filename', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', apiRouter);
    app.use(globalErrorHandler);

    jest.clearAllMocks();

    mockFsPromises.readdir.mockResolvedValue([]);
    mockFsPromises.stat.mockResolvedValue({ size: 1000000 } as any);
    mockFsPromises.access.mockResolvedValue(undefined);
    mockFs.existsSync.mockReturnValue(true);
    mockFs.statSync.mockReturnValue({ size: 1000000, isFile: () => true } as any);

    mockFs.createReadStream.mockImplementation((_filePath: fs.PathLike, options?: any) => {
      const currentStat = mockFs.statSync.mock.results[mockFs.statSync.mock.results.length - 1]?.value as fs.Stats | undefined;
      const totalSize = currentStat?.size ?? 1000000;
      const start = typeof options?.start === 'number' ? options.start : 0;
      const end = typeof options?.end === 'number' ? options.end : totalSize - 1;
      const length = Math.max(0, end - start + 1);

      return Readable.from([Buffer.alloc(length)]) as any;
    });
  });

  describe('Success Cases', () => {
    it('should serve thumbnail from videos directory', async () => {
      mockFs.existsSync.mockImplementation((candidatePath: fs.PathLike) => String(candidatePath).includes('videos'));
      mockFs.statSync.mockReturnValue({ size: 50000, isFile: () => true } as any);

      const response = await request(app)
        .get('/api/thumbnails/test-video.jpg')
        .expect(200);

      expect(response.headers['content-type']).toBe('image/jpeg');
      expect(mockFs.createReadStream).toHaveBeenCalled();
    });

    it('should serve thumbnail from temp/thumbnails directory', async () => {
      const tempThumbnailsDir = path.join(mockTempDir, 'thumbnails');
      mockFs.existsSync.mockImplementation((candidatePath: fs.PathLike) => String(candidatePath).startsWith(tempThumbnailsDir));
      mockFs.statSync.mockReturnValue({ size: 75000, isFile: () => true } as any);

      const response = await request(app)
        .get('/api/thumbnails/generated-thumb.png')
        .expect(200);

      expect(response.headers['content-type']).toBe('image/png');
    });

    it('should serve thumbnail from custom TEMP_DIR', async () => {
      const expectedTempThumbPath = path.join(mockTempDir, 'thumbnails', 'custom-thumb.jpg');
      mockFs.existsSync.mockImplementation((candidatePath: fs.PathLike) => String(candidatePath) === expectedTempThumbPath);
      mockFs.statSync.mockReturnValue({ size: 42000, isFile: () => true } as any);

      const response = await request(app)
        .get('/api/thumbnails/custom-thumb.jpg')
        .expect(200);

      expect(response.headers['content-type']).toBe('image/jpeg');
      expect(mockFs.existsSync).toHaveBeenCalledWith(expectedTempThumbPath);
    });

    it('should return correct MIME type for jpeg', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ size: 10000, isFile: () => true } as any);

      const response = await request(app)
        .get('/api/thumbnails/image.jpeg')
        .expect(200);

      expect(response.headers['content-type']).toBe('image/jpeg');
    });

    it('should return correct MIME type for webp', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ size: 10000, isFile: () => true } as any);

      const response = await request(app)
        .get('/api/thumbnails/image.webp')
        .expect(200);

      expect(response.headers['content-type']).toBe('image/webp');
    });
  });

  describe('Error Cases', () => {
    it('should return 404 for non-existent thumbnail', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const response = await request(app)
        .get('/api/thumbnails/nonexistent.jpg')
        .expect(404);

      expect(response.body.status).toBe('error');
      const errorMessage = response.body.error?.message || response.body.message;
      expect(errorMessage).toContain('not found');
    });

    it('should return 400 for invalid file extension', async () => {
      const response = await request(app)
        .get('/api/thumbnails/test.exe')
        .expect(400);

      expect(response.body.status).toBe('error');
      const errorMessage = response.body.error?.message || response.body.message;
      expect(errorMessage).toContain('file type');
    });

    it('should return 404 for missing filename route', async () => {
      await request(app)
        .get('/api/thumbnails/')
        .expect(404);
    });

    it('should return 403 for permission denied access', async () => {
      mockFs.existsSync.mockImplementation(() => {
        const err = new Error('Permission denied') as NodeJS.ErrnoException;
        err.code = 'EACCES';
        throw err;
      });

      const response = await request(app)
        .get('/api/thumbnails/forbidden.jpg')
        .expect(403);

      expect(response.body.status).toBe('error');
      const errorMessage = response.body.error?.message || response.body.message;
      expect(errorMessage).toContain('Permission denied');
    });

    it('should return 403 when stat access is denied', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockImplementation(() => {
        const err = new Error('Permission denied') as NodeJS.ErrnoException;
        err.code = 'EACCES';
        throw err;
      });

      const response = await request(app)
        .get('/api/thumbnails/forbidden-stat.jpg')
        .expect(403);

      expect(response.body.status).toBe('error');
      const errorMessage = response.body.error?.message || response.body.message;
      expect(errorMessage).toContain('Permission denied');
    });
  });

  describe('Security Tests', () => {
    it('should block directory traversal attempts with ..', async () => {
      const response = await request(app)
        .get('/api/thumbnails/%2e%2e%2f%2e%2e%2fetc%2fpasswd.jpg')
        .expect(400);

      expect(response.body.status).toBe('error');
      const errorMessage = response.body.error?.message || response.body.message;
      expect(errorMessage).toContain('Invalid filename');
    });

    it('should block absolute path attempts', async () => {
      const response = await request(app)
        .get('/api/thumbnails/%2Fetc%2Fpasswd.jpg')
        .expect(400);

      expect(response.body.status).toBe('error');
      const errorMessage = response.body.error?.message || response.body.message;
      expect(errorMessage).toContain('Invalid filename');
    });

    it('should reject non-image extensions', async () => {
      const response = await request(app)
        .get('/api/thumbnails/test.txt')
        .expect(400);

      expect(response.body.status).toBe('error');
      const errorMessage = response.body.error?.message || response.body.message;
      expect(errorMessage).toContain('file type');
    });

    it('should reject no-extension files', async () => {
      const response = await request(app)
        .get('/api/thumbnails/testfile')
        .expect(400);

      expect(response.body.status).toBe('error');
      const errorMessage = response.body.error?.message || response.body.message;
      expect(errorMessage).toContain('file type');
    });
  });
});
