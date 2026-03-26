import { DownloadQueueService } from '../../../services/downloadQueueService';

// Simple mocks
const mockReadFile = jest.fn();
const mockWriteFile = jest.fn();
const mockMkdir = jest.fn();
const mockRename = jest.fn();
const mockUnlink = jest.fn();

jest.mock('fs/promises', () => ({
  readFile: (...args: any[]) => mockReadFile(...args),
  writeFile: (...args: any[]) => mockWriteFile(...args),
  mkdir: (...args: any[]) => mockMkdir(...args),
  rename: (...args: any[]) => mockRename(...args),
  unlink: (...args: any[]) => mockUnlink(...args)
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  mkdir: (...args: any[]) => mockMkdir(...args)
}));

// Mock YouTubeDownloadService
const mockDownloadVideo = jest.fn();
const mockCancelDownload = jest.fn();
const mockYoutubeService = {
  downloadVideo: mockDownloadVideo,
  cancelDownload: mockCancelDownload
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
    mockUnlink.mockResolvedValue(undefined);
    mockCancelDownload.mockResolvedValue(undefined);
    
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

      expect(result.success).toBe(true);
    });

    it('should return false for non-existent download', async () => {
      const result = await service.cancelDownload('non-existent-id');
      expect(result.success).toBe(false);
      expect(result.reason).toBe('not_found');
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
      expect(result.success).toBe(false);
      expect(result.reason).toBe('already_completed');
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
    
    it('should handle different maxAgeHours values', async () => {
      // Test with different age limits to exercise more branches
      const cleanedCount1 = await service.cleanupOldItems(1);
      const cleanedCount2 = await service.cleanupOldItems(48);
      const cleanedCount3 = await service.cleanupOldItems(168); // 1 week
      
      expect(cleanedCount1).toBe(0);
      expect(cleanedCount2).toBe(0); 
      expect(cleanedCount3).toBe(0);
    });
  });

  describe('clearQueue', () => {
    beforeEach(async () => {
      mockReadFile.mockRejectedValue(new Error('File not found'));
      mockWriteFile.mockResolvedValue(undefined);
      await service.initialize();
    });

    it('should clear queue items and keep downloaded files intact', async () => {
      const request = {
        url: 'https://youtu.be/test-video',
        requestId: 'req-1',
        requestedAt: new Date()
      };

      const processingItem = await service.addToQueue(request);
      const completedItem = await service.addToQueue({
        ...request,
        requestId: 'req-2'
      });

      const status = service.getQueueStatus();
      const processing = status.items.find(item => item.id === processingItem.id);
      const completed = status.items.find(item => item.id === completedItem.id);

      if (!processing || !completed) {
        throw new Error('Expected queue items to exist for test setup');
      }

      processing.status = 'processing';
      completed.status = 'completed';
      completed.result = {
        id: 'download-1',
        status: 'success',
        videoPath: '/downloads/video.mp4',
        startedAt: new Date(),
        completedAt: new Date()
      };

      const result = await service.clearQueue();

      expect(result.removedCount).toBe(2);
      expect(result.cancelledProcessingCount).toBe(1);
      expect(mockCancelDownload).toHaveBeenCalledWith(processingItem.id);
      expect(mockUnlink).not.toHaveBeenCalled();
      expect(service.getQueueStatus().totalItems).toBe(0);
    });

    it('should still clear queue if cancelling active downloads fails', async () => {
      mockCancelDownload.mockRejectedValueOnce(new Error('cancel failed'));
      const request = {
        url: 'https://youtu.be/test-video',
        requestId: 'req-1',
        requestedAt: new Date()
      };

      const queueItem = await service.addToQueue(request);
      const status = service.getQueueStatus();
      const processing = status.items.find(item => item.id === queueItem.id);

      if (!processing) {
        throw new Error('Expected queue item to exist for test setup');
      }
      processing.status = 'processing';

      const result = await service.clearQueue();

      expect(result.removedCount).toBe(1);
      expect(result.cancelledProcessingCount).toBe(0);
      expect(service.getQueueStatus().totalItems).toBe(0);
    });
  });
  
  describe('error handling', () => {
    it('should handle file system errors gracefully', async () => {
      // Test error handling branches
      mockReadFile.mockRejectedValue(new Error('Permission denied'));
      mockWriteFile.mockRejectedValue(new Error('Disk full'));
      
      // Should not throw during initialization
      await expect(service.initialize()).resolves.not.toThrow();
      
      const request = {
        url: 'https://youtu.be/test123',
        requestId: 'error-test',
        requestedAt: new Date()
      };
      
      // Adding should throw because of write error
      await expect(service.addToQueue(request)).rejects.toThrow('Failed to add to queue');
    });
  });
});
