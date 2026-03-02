import request from 'supertest';
import express from 'express';
import fs from 'fs';
import { apiRouter } from '../../../routes/api';
import { globalErrorHandler } from '../../../middleware/errorHandler';

// Mock fs
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

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
    (mockFs.readdir as any).mockResolvedValue([]);
    mockFs.existsSync.mockReturnValue(true);
    mockFs.statSync.mockReturnValue({
      size: 1000000,
      isFile: () => true
    } as any);
    mockFs.createReadStream.mockReturnValue({
      pipe: jest.fn(),
      on: jest.fn((event, callback) => {
        if (event === 'end') {
          setTimeout(callback, 10);
        }
        return mockFs.createReadStream('') as any;
      }),
      emit: jest.fn()
    } as any);
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
      // Mock readdir to throw error
      const mockError = new Error('Service error');
      (mockFs.readdir as any).mockRejectedValue(mockError);

      const response = await request(app)
        .get('/api/videos')
        .expect(500);

      expect(response.body.status).toBe('error');
      // In development mode, error is in error.message, in production it's in message
      const errorMessage = response.body.error?.message || response.body.message;
      expect(errorMessage).toContain('Service error');
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
    it('should stream video file with Range support', async () => {
      const response = await request(app)
        .get('/api/stream/test.mp4')
        .set('Range', 'bytes=0-1023')
        .expect(206);

      expect(response.headers['content-range']).toBeDefined();
      expect(response.headers['accept-ranges']).toBe('bytes');
    }, 15000);

    it('should stream entire file without Range header', async () => {
      const response = await request(app)
        .get('/api/stream/test.mp4')
        .expect(200);

      expect(response.headers['content-length']).toBe('1000000');
    }, 15000);

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
  });
});