import { processQueueItem } from '../../../services/queueScheduler';
import { QueueItem } from '../../../types/youtube';

// Mock fs/promises
const mockUnlink = jest.fn();
jest.mock('fs/promises', () => ({
  unlink: (...args: any[]) => mockUnlink(...args)
}));

const mockCancelDownload = jest.fn();
const mockDownloadVideo = jest.fn();
const mockYoutubeService = {
  downloadVideo: mockDownloadVideo,
  cancelDownload: mockCancelDownload
} as any;

const mockSaveQueue = jest.fn().mockResolvedValue(undefined);

function makeQueueItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    id: 'test-id',
    request: { url: 'https://youtu.be/test', requestId: 'req-1', requestedAt: new Date() },
    status: 'pending',
    progress: 0,
    currentStep: 'Queued',
    queuedAt: new Date(),
    ...overrides
  } as QueueItem;
}

describe('processQueueItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveQueue.mockResolvedValue(undefined);
    mockUnlink.mockResolvedValue(undefined);
    mockCancelDownload.mockResolvedValue(undefined);
  });

  describe('cancellation handling', () => {
    it('should not start processing when item was cancelled before it started', async () => {
      const item = makeQueueItem({ status: 'cancelled' });

      await processQueueItem(item, mockYoutubeService, mockSaveQueue);

      expect(item.status).toBe('cancelled');
      expect(mockDownloadVideo).not.toHaveBeenCalled();
      expect(mockSaveQueue).not.toHaveBeenCalled();
    });

    it('should complete normally when not cancelled', async () => {
      const item = makeQueueItem();
      mockDownloadVideo.mockResolvedValue({
        status: 'success',
        videoPath: '/tmp/test.mp4'
      });

      await processQueueItem(item, mockYoutubeService, mockSaveQueue);

      expect(item.status).toBe('completed');
      expect(item.progress).toBe(100);
    });

    it('should preserve cancelled status when download completes after cancellation', async () => {
      const item = makeQueueItem();

      mockDownloadVideo.mockImplementation(async () => {
        // Simulate cancellation happening mid-download
        item.status = 'cancelled' as any;
        return { status: 'success', videoPath: '/tmp/test.mp4' };
      });

      await processQueueItem(item, mockYoutubeService, mockSaveQueue);

      expect(item.status).toBe('cancelled');
      expect(mockCancelDownload).toHaveBeenCalledWith('test-id');
    });

    it('should clean up downloaded file when cancelled after download completes', async () => {
      const item = makeQueueItem();

      mockDownloadVideo.mockImplementation(async () => {
        item.status = 'cancelled' as any;
        return { status: 'success', videoPath: '/tmp/cancelled-video.mp4' };
      });

      await processQueueItem(item, mockYoutubeService, mockSaveQueue);

      expect(mockUnlink).toHaveBeenCalledWith('/tmp/cancelled-video.mp4');
    });

    it('should not call unlink when no videoPath available after cancellation', async () => {
      const item = makeQueueItem();

      mockDownloadVideo.mockImplementation(async () => {
        item.status = 'cancelled' as any;
        return { status: 'success' }; // No videoPath
      });

      await processQueueItem(item, mockYoutubeService, mockSaveQueue);

      expect(mockUnlink).not.toHaveBeenCalled();
    });

    it('should fail gracefully when download errors out', async () => {
      const item = makeQueueItem();
      mockDownloadVideo.mockResolvedValue({
        status: 'error',
        error: 'Download failed'
      });

      await processQueueItem(item, mockYoutubeService, mockSaveQueue);

      expect(item.status).toBe('failed');
      expect(item.error).toBe('Download failed');
    });
  });
});
