import request from 'supertest';
import express from 'express';
import fs from 'fs';
import { apiRouter } from '../../../routes/api';
import { VideoService } from '../../../services/videoService';

// Mock fs
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock VideoService
jest.mock('../../../services/videoService');

describe('API Routes', () => {
  let app: express.Application;
  const MockedVideoService = VideoService as jest.MockedClass<typeof VideoService>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', apiRouter);
    jest.clearAllMocks();
  });

  describe('GET /api/videos', () => {
    it('should return list of videos', async () => {
      const mockScanResult = {
        videos: [
          { 
            id: 'test1', 
            file: { 
              name: 'video1.mp4', 
              path: '/test/video1.mp4',
              size: 1000000,
              extension: 'mp4',
              lastModified: new Date()
            }, 
            metadata: { 
              title: 'Test Video 1', 
              format: 'MP4' 
            },
            viewCount: 0
          }
        ],
        totalCount: 1,
        totalSize: 1000000,
        scannedAt: new Date()
      };

      MockedVideoService.prototype.scanVideoDirectory.mockResolvedValue(mockScanResult);

      const response = await request(app)
        .get('/api/videos')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.videos).toHaveLength(1);
      expect(response.body.data.videos[0].id).toBe('test1');
    });

    it('should handle video service errors', async () => {
      MockedVideoService.prototype.scanVideoDirectory.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/videos')
        .expect(500);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Service error');
    });
  });

  describe('GET /api/videos/:id', () => {
    it('should return specific video by id', async () => {
      const mockScanResult = {
        videos: [
          { 
            id: 'test1', 
            file: { 
              name: 'video1.mp4',
              path: '/test/video1.mp4',
              size: 1000000,
              extension: 'mp4',
              lastModified: new Date()
            }, 
            metadata: { 
              title: 'Test Video 1' 
            },
            viewCount: 0
          }
        ],
        totalCount: 1,
        totalSize: 1000000,
        scannedAt: new Date()
      };

      MockedVideoService.prototype.scanVideoDirectory.mockResolvedValue(mockScanResult);

      const response = await request(app)
        .get('/api/videos/test1')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.id).toBe('test1');
    });

    it('should return 404 for non-existent video', async () => {
      const mockScanResult = {
        videos: [],
        totalCount: 0,
        totalSize: 0,
        scannedAt: new Date()
      };

      MockedVideoService.prototype.scanVideoDirectory.mockResolvedValue(mockScanResult);

      const response = await request(app)
        .get('/api/videos/nonexistent')
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('not found');
    });
  });

  describe('GET /api/stream/:filename', () => {
    beforeEach(() => {
      // Mock file system operations for streaming
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        size: 1000000
      } as any);
      mockFs.createReadStream.mockReturnValue({
        pipe: jest.fn(),
        on: jest.fn(),
        emit: jest.fn()
      } as any);
    });

    it('should stream video file with Range support', async () => {
      const response = await request(app)
        .get('/api/stream/test.mp4')
        .set('Range', 'bytes=0-1023')
        .expect(206);

      expect(response.headers['content-range']).toBeDefined();
      expect(response.headers['accept-ranges']).toBe('bytes');
      expect(mockFs.createReadStream).toHaveBeenCalled();
    });

    it('should stream entire file without Range header', async () => {
      const response = await request(app)
        .get('/api/stream/test.mp4')
        .expect(200);

      expect(response.headers['content-length']).toBe('1000000');
      expect(mockFs.createReadStream).toHaveBeenCalledWith(
        expect.stringContaining('test.mp4')
      );
    });

    it('should return 404 for non-existent file', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const response = await request(app)
        .get('/api/stream/nonexistent.mp4')
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('not found');
    });

    it('should handle invalid range headers', async () => {
      const response = await request(app)
        .get('/api/stream/test.mp4')
        .set('Range', 'bytes=-')
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid range header format');
    });

    it('should handle range not satisfiable', async () => {
      const response = await request(app)
        .get('/api/stream/test.mp4')
        .set('Range', 'bytes=2000000-3000000') // Beyond file size
        .expect(416);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Range not satisfiable');
    });

    it('should require filename parameter', async () => {
      await request(app)
        .get('/api/stream/')
        .expect(404); // Express returns 404 for missing route parameter
    });
  });
});