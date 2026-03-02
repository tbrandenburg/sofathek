import { DownloadQueueService } from '../../../services/downloadQueueService';

// Simple mocks
const mockReadFile = jest.fn();
const mockWriteFile = jest.fn();
const mockMkdir = jest.fn();
const mockRename = jest.fn();

jest.mock('fs/promises', () => ({
  readFile: (...args: any[]) => mockReadFile(...args),
  writeFile: (...args: any[]) => mockWriteFile(...args),
  mkdir: (...args: any[]) => mockMkdir(...args),
  rename: (...args: any[]) => mockRename(...args)
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  mkdir: (...args: any[]) => mockMkdir(...args)
}));

// Mock YouTubeDownloadService
const mockDownloadVideo = jest.fn();
const mockYoutubeService = {
  downloadVideo: mockDownloadVideo
} as any;

describe('DownloadQueueService', () => {
  let service: DownloadQueueService;

  beforeEach(() => {
    service = new DownloadQueueService('/test/temp', mockYoutubeService);
    jest.clearAllMocks();
    
    // Set up default successful mocks
    mockWriteFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockRename.mockResolvedValue(undefined);
    
    // Mock YouTube service to return success result
    mockDownloadVideo.mockResolvedValue({
      status: 'success',
      videoPath: '/test/output/video.mp4',
      thumbnailPath: '/test/output/thumbnail.jpg'
    });
  });

  describe('initialize', () => {
    it('should initialize with empty queue when no file exists', async () => {
      mockReadFile.mockRejectedValue(new Error('File not found'));

      await service.initialize();

      const status = await service.getQueueStatus();
      expect(status.totalItems).toBe(0);
    });

    it('should load existing queue from file', async () => {
      const mockQueueData = [
        {
          id: 'test-id',
          request: { url: 'https://youtu.be/test', requestId: 'req-1', requestedAt: new Date().toISOString() },
          status: 'pending',
          progress: 0,
          currentStep: 'queued',
          queuedAt: new Date().toISOString()
        }
      ];
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
      expect(queueItem.request.url).toBe(request.url);
      
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

    it('should return false when canceling already completed download', async () => {
      const request = {
        url: 'https://youtu.be/test-video',
        requestId: 'req-1',
        requestedAt: new Date()
      };

      const queueItem = await service.addToQueue(request);
      // Manually set status to completed
      const status = service.getQueueStatus();
      const item = status.items.find(i => i.id === queueItem.id);
      if (item) {
        item.status = 'completed';
      }
      
      const result = await service.cancelDownload(queueItem.id);
      expect(result).toBe(false);
    });
  });

  describe('cleanupOldItems', () => {
    beforeEach(async () => {
      mockReadFile.mockRejectedValue(new Error('File not found'));
      mockWriteFile.mockResolvedValue(undefined);
      await service.initialize();
    });

    it('should handle cleanup with no old items', async () => {
      const cleanedCount = await service.cleanupOldItems(24);
      expect(cleanedCount).toBe(0);
    });
  });
});