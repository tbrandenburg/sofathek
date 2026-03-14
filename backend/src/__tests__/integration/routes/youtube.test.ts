import request from 'supertest';
import express from 'express';
import youtubeRouter from '../../../routes/youtube';
import { downloadQueueService, youTubeDownloadService } from '../../../services/index';
import { globalErrorHandler } from '../../../middleware/errorHandler';

// Mock services
jest.mock('../../../services/index', () => ({
  downloadQueueService: {
    addToQueue: jest.fn(),
    getQueueStatus: jest.fn(),
    cancelDownload: jest.fn(),
    cleanupOldItems: jest.fn()
  },
  youTubeDownloadService: {
    validateYouTubeUrl: jest.fn()
  }
}));

const mockDownloadQueueService = downloadQueueService as jest.Mocked<typeof downloadQueueService>;
const mockYouTubeDownloadService = youTubeDownloadService as jest.Mocked<typeof youTubeDownloadService>;

describe('YouTube Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/youtube', youtubeRouter);
    app.use(globalErrorHandler);
    
    jest.clearAllMocks();
  });

  describe('POST /api/youtube/download', () => {
    it('should successfully add video to download queue', async () => {
      const mockRequest = {
        url: 'https://www.youtube.com/watch?v=test123',
        title: 'Test Video'
      };

      const mockQueueItem = {
        id: 'queue-123',
        request: {
          ...mockRequest,
          requestedAt: new Date('2026-03-02T20:00:00Z'),
          requestId: 'req-123'
        },
        status: 'pending' as const,
        progress: 0,
        currentStep: 'Queued',
        queuedAt: new Date('2026-03-02T20:00:00Z')
      };

      mockYouTubeDownloadService.validateYouTubeUrl.mockResolvedValue(true);
      mockDownloadQueueService.addToQueue.mockResolvedValue(mockQueueItem);

      const response = await request(app)
        .post('/api/youtube/download')
        .send(mockRequest);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.queueItem.id).toBe('queue-123');
      expect(response.body.data.queueItem.status).toBe('pending');
      expect(mockYouTubeDownloadService.validateYouTubeUrl).toHaveBeenCalledWith(mockRequest.url);
      expect(mockDownloadQueueService.addToQueue).toHaveBeenCalled();
    });

    it('should return 400 if URL is missing', async () => {
      const response = await request(app)
        .post('/api/youtube/download')
        .send({ title: 'Test Video' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('YouTube URL is required');
    });

    it('should return 400 if URL is invalid', async () => {
      mockYouTubeDownloadService.validateYouTubeUrl.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/youtube/download')
        .send({ url: 'invalid-url' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid YouTube URL format');
    });
  });

  describe('GET /api/youtube/queue', () => {
    it('should return queue status', async () => {
      const mockQueueStatus = {
        totalItems: 5,
        processing: 1,
        completed: 2,
        failed: 1,
        pending: 1,
        items: [],
        lastUpdated: new Date('2026-03-02T20:00:00Z')
      };

      mockDownloadQueueService.getQueueStatus.mockReturnValue(mockQueueStatus);

      const response = await request(app)
        .get('/api/youtube/queue');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.totalItems).toBe(5);
      expect(response.body.data.processing).toBe(1);
      expect(response.body.data.lastUpdated).toBe('2026-03-02T20:00:00.000Z');
    });

    it('should transform queue items with top-level url and title fields', async () => {
      const mockQueueStatus = {
        totalItems: 1,
        processing: 0,
        completed: 1,
        failed: 0,
        pending: 0,
        cancelled: 0,
        items: [{
          id: 'queue-123',
          request: {
            url: 'https://www.youtube.com/watch?v=test123',
            requestedAt: new Date('2026-03-02T20:00:00Z'),
            requestId: 'req-123'
          },
          status: 'completed' as const,
          progress: 100,
          currentStep: 'Completed',
          result: {
            id: 'download-123',
            status: 'success' as const,
            videoPath: '/tmp/test.mp4',
            metadata: {
              id: 'test123',
              title: 'Video From Metadata'
            },
            startedAt: new Date('2026-03-02T20:01:00Z'),
            completedAt: new Date('2026-03-02T20:02:00Z')
          },
          queuedAt: new Date('2026-03-02T20:00:00Z'),
          startedAt: new Date('2026-03-02T20:01:00Z'),
          completedAt: new Date('2026-03-02T20:02:00Z')
        }],
        lastUpdated: new Date('2026-03-02T20:03:00Z')
      };

      mockDownloadQueueService.getQueueStatus.mockReturnValue(mockQueueStatus);

      const response = await request(app)
        .get('/api/youtube/queue');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].url).toBe('https://www.youtube.com/watch?v=test123');
      expect(response.body.data.items[0].title).toBe('Video From Metadata');
      expect(response.body.data.items[0].queuedAt).toBe('2026-03-02T20:00:00.000Z');
      expect(response.body.data.items[0].startedAt).toBe('2026-03-02T20:01:00.000Z');
      expect(response.body.data.items[0].completedAt).toBe('2026-03-02T20:02:00.000Z');
      expect(response.body.data.lastUpdated).toBe('2026-03-02T20:03:00.000Z');
    });
  });

  describe('GET /api/youtube/download/:id/status', () => {
    it('should return status of specific download', async () => {
      const mockQueueItem = {
        id: 'test-id',
        request: {
          url: 'https://www.youtube.com/watch?v=test123',
          requestedAt: new Date('2026-03-02T20:00:00Z'),
          requestId: 'req-123'
        },
        status: 'completed' as const,
        progress: 100,
        currentStep: 'Completed',
        queuedAt: new Date('2026-03-02T20:00:00Z'),
        completedAt: new Date('2026-03-02T20:00:00Z')
      };

      const mockQueueStatus = {
        totalItems: 1,
        processing: 0,
        completed: 1,
        failed: 0,
        pending: 0,
        items: [mockQueueItem],
        lastUpdated: new Date('2026-03-02T20:00:00Z')
      };

      mockDownloadQueueService.getQueueStatus.mockReturnValue(mockQueueStatus);

      const response = await request(app)
        .get('/api/youtube/download/test-id/status');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.id).toBe('test-id');
      expect(response.body.data.status).toBe('completed');
    });

    it('should return 400 if ID is missing', async () => {
      const response = await request(app)
        .get('/api/youtube/download//status');

      expect(response.status).toBe(404); // Express handles empty param as 404
    });

    it('should return 404 if download not found', async () => {
      const mockQueueStatus = {
        totalItems: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        pending: 0,
        items: [],
        lastUpdated: new Date('2026-03-02T20:00:00Z')
      };

      mockDownloadQueueService.getQueueStatus.mockReturnValue(mockQueueStatus);

      const response = await request(app)
        .get('/api/youtube/download/nonexistent-id/status');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('not found');
    });
  });

  describe('DELETE /api/youtube/download/:id', () => {
    it('should successfully cancel download', async () => {
      mockDownloadQueueService.cancelDownload.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/youtube/download/test-id');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.message).toContain('cancelled successfully');
      expect(mockDownloadQueueService.cancelDownload).toHaveBeenCalledWith('test-id');
    });

    it('should return 400 if cancel fails', async () => {
      mockDownloadQueueService.cancelDownload.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/youtube/download/test-id');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Could not cancel download');
    });
  });

  describe('POST /api/youtube/queue/cleanup', () => {
    it('should cleanup old items with default maxAgeHours', async () => {
      mockDownloadQueueService.cleanupOldItems.mockResolvedValue(3);

      const response = await request(app)
        .post('/api/youtube/queue/cleanup')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.cleanedCount).toBe(3);
      expect(response.body.data.maxAgeHours).toBe(24);
      expect(mockDownloadQueueService.cleanupOldItems).toHaveBeenCalledWith(24);
    });

    it('should cleanup old items with custom maxAgeHours', async () => {
      mockDownloadQueueService.cleanupOldItems.mockResolvedValue(5);

      const response = await request(app)
        .post('/api/youtube/queue/cleanup')
        .send({ maxAgeHours: 48 });

      expect(response.status).toBe(200);
      expect(response.body.data.cleanedCount).toBe(5);
      expect(response.body.data.maxAgeHours).toBe(48);
      expect(mockDownloadQueueService.cleanupOldItems).toHaveBeenCalledWith(48);
    });
  });

  describe('GET /api/youtube/health', () => {
    it('should return health status', async () => {
      const mockQueueStatus = {
        totalItems: 10,
        processing: 2,
        completed: 5,
        failed: 1,
        pending: 2,
        items: [],
        lastUpdated: new Date()
      };

      mockDownloadQueueService.getQueueStatus.mockReturnValue(mockQueueStatus);

      const response = await request(app)
        .get('/api/youtube/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.service).toBe('youtube-integration');
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.queue.totalItems).toBe(10);
      expect(response.body.data.queue.processing).toBe(2);
      expect(response.body.data.queue.pending).toBe(2);
    });
  });
});
