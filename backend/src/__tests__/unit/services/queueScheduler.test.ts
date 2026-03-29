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

  describe('progress reporting', () => {
    it('should start metadata step at 5% instead of old 25%', async () => {
      const item = makeQueueItem();
      const progressSnapshots: number[] = [];

      mockDownloadVideo.mockImplementation(async (_req: unknown, _key: unknown, _cb: unknown) => {
        // Capture progress values written during the metadata step (before download)
        progressSnapshots.push(item.progress);
        return { status: 'success', videoPath: '/tmp/test.mp4' };
      });

      await processQueueItem(item, mockYoutubeService, mockSaveQueue);

      expect(progressSnapshots[0]).toBe(5);
    });

    it('should map video phase percentage into the 25–75% range', async () => {
      const item = makeQueueItem();
      let capturedCallback: ((phase: 'video' | 'audio', percent: number) => void) | undefined;

      mockDownloadVideo.mockImplementation(async (_req: unknown, _key: unknown, cb: (phase: 'video' | 'audio', percent: number) => void) => {
        capturedCallback = cb;
        return { status: 'success', videoPath: '/tmp/test.mp4' };
      });

      await processQueueItem(item, mockYoutubeService, mockSaveQueue);

      // Simulate a video progress callback with 50% yt-dlp progress
      capturedCallback?.('video', 50);
      // 25 + 50 * 0.5 = 50
      expect(item.progress).toBe(50);
      expect(item.currentStep).toContain('Downloading video');
    });

    it('should map audio phase percentage into the 75–85% range', async () => {
      const item = makeQueueItem();
      let capturedCallback: ((phase: 'video' | 'audio', percent: number) => void) | undefined;

      mockDownloadVideo.mockImplementation(async (_req: unknown, _key: unknown, cb: (phase: 'video' | 'audio', percent: number) => void) => {
        capturedCallback = cb;
        return { status: 'success', videoPath: '/tmp/test.mp4' };
      });

      await processQueueItem(item, mockYoutubeService, mockSaveQueue);

      // Simulate audio at 50% → 75 + 50 * 0.1 = 80
      capturedCallback?.('audio', 50);
      expect(item.progress).toBe(80);
      expect(item.currentStep).toContain('Downloading audio');
    });

    it('should throttle saves: only persist when progress advances by ≥2%', async () => {
      const item = makeQueueItem();
      let capturedCallback: ((phase: 'video' | 'audio', percent: number) => void) | undefined;

      mockDownloadVideo.mockImplementation(async (_req: unknown, _key: unknown, cb: (phase: 'video' | 'audio', percent: number) => void) => {
        capturedCallback = cb;
        return { status: 'success', videoPath: '/tmp/test.mp4' };
      });

      mockSaveQueue.mockClear();
      await processQueueItem(item, mockYoutubeService, mockSaveQueue);
      mockSaveQueue.mockClear();

      // Fire rapid updates: 0%, 1%, 2%, 3% yt-dlp → mapped 25, 25.5, 26, 26.5
      capturedCallback?.('video', 0);   // 25.0 → Δ=20 ≥ 2 → saved (initial was 5)
      const saveCountAfterFirst = mockSaveQueue.mock.calls.length;
      capturedCallback?.('video', 0.5); // 25.25 → Δ < 2 → skipped
      capturedCallback?.('video', 1);   // 25.5 → Δ < 2 → skipped
      capturedCallback?.('video', 3);   // 26.5 → Δ < 2 from last save at 25 → skipped
      capturedCallback?.('video', 4);   // 27 → Δ = 2 → saved
      const saveCountAfterThrottle = mockSaveQueue.mock.calls.length;

      expect(saveCountAfterFirst).toBe(1);    // only the ≥2% jump saved
      expect(saveCountAfterThrottle).toBe(2); // one more save at the 2% boundary
    });

    it('should include progress percentage in currentStep message', async () => {
      const item = makeQueueItem();
      let capturedCallback: ((phase: 'video' | 'audio', percent: number) => void) | undefined;

      mockDownloadVideo.mockImplementation(async (_req: unknown, _key: unknown, cb: (phase: 'video' | 'audio', percent: number) => void) => {
        capturedCallback = cb;
        return { status: 'success', videoPath: '/tmp/test.mp4' };
      });

      await processQueueItem(item, mockYoutubeService, mockSaveQueue);

      capturedCallback?.('video', 40); // 25 + 40*0.5 = 45
      expect(item.currentStep).toBe('Downloading video (45%)');

      capturedCallback?.('audio', 100); // 75 + 100*0.1 = 85
      expect(item.currentStep).toBe('Downloading audio (85%)');
    });
  });
});
