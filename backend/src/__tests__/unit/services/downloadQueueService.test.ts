import { DownloadQueueService } from '../../../services/downloadQueueService';

// Simple mocks
const mockReadFile = jest.fn();
const mockWriteFile = jest.fn();

jest.mock('fs/promises', () => ({
  readFile: (...args: any[]) => mockReadFile(...args),
  writeFile: (...args: any[]) => mockWriteFile(...args)
}));

// Mock YouTubeDownloadService
const mockYoutubeService = {
  downloadVideo: jest.fn()
} as any;

describe('DownloadQueueService', () => {
  let service: DownloadQueueService;

  beforeEach(() => {
    service = new DownloadQueueService('/test/temp', mockYoutubeService);
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize with empty queue when no file exists', async () => {
      mockReadFile.mockRejectedValue(new Error('File not found'));

      await service.initialize();

      const status = await service.getQueueStatus();
      expect(status.totalItems).toBe(0);
    });

    it('should load existing queue from file', async () => {
      const mockQueueData = {
        queue: [
          {
            id: 'test-id',
            request: { url: 'https://youtu.be/test', requestId: 'req-1', requestedAt: new Date() },
            status: 'pending',
            progress: 0,
            currentStep: 'queued',
            queuedAt: new Date()
          }
        ]
      };
      mockReadFile.mockResolvedValue(JSON.stringify(mockQueueData));

      await service.initialize();

      const status = await service.getQueueStatus();
      expect(status.totalItems).toBe(1);
    });
  });

  describe('addToQueue', () => {
    beforeEach(async () => {
      mockReadFile.mockRejectedValue(new Error('File not found'));
      mockWriteFile.mockResolvedValue(undefined);
      await service.initialize();
    });

    it('should add download request to queue', async () => {
      const request = {
        url: 'https://youtu.be/test-video',
        requestId: 'req-1',
        requestedAt: new Date()
      };

      const queueItem = await service.addToQueue(request);

      expect(queueItem.id).toBeDefined();
      expect(queueItem.status).toBe('pending');
      
      const status = await service.getQueueStatus();
      expect(status.totalItems).toBe(1);
    });
  });

  describe('cancelDownload', () => {
    beforeEach(async () => {
      mockReadFile.mockRejectedValue(new Error('File not found'));
      mockWriteFile.mockResolvedValue(undefined);
      await service.initialize();
    });

    it('should cancel pending download', async () => {
      const request = {
        url: 'https://youtu.be/test-video',
        requestId: 'req-1',
        requestedAt: new Date()
      };

      const queueItem = await service.addToQueue(request);
      const result = await service.cancelDownload(queueItem.id);

      expect(result).toBe(true);
    });

    it('should return false for non-existent download', async () => {
      const result = await service.cancelDownload('non-existent-id');
      expect(result).toBe(false);
    });
  });
});