import { YouTubeDownloadService } from '../../../services/youTubeDownloadService';

// Simple mock for fs/promises
const mockReaddir = jest.fn();
const mockRename = jest.fn();
const mockAccess = jest.fn();
const mockMkdir = jest.fn();
const mockUnlink = jest.fn();

jest.mock('fs/promises', () => ({
  readdir: (...args: any[]) => mockReaddir(...args),
  rename: (...args: any[]) => mockRename(...args),
  access: (...args: any[]) => mockAccess(...args),
  mkdir: (...args: any[]) => mockMkdir(...args),
  unlink: (...args: any[]) => mockUnlink(...args)
}));

jest.mock('youtube-dl-exec', () => jest.fn());

// Simple mock for ThumbnailService 
const mockThumbnailService = {
  generateThumbnail: jest.fn()
} as any;

describe('YouTubeDownloadService', () => {
  let service: YouTubeDownloadService;

  beforeEach(() => {
    service = new YouTubeDownloadService('/test/videos', '/test/temp', mockThumbnailService);
    jest.clearAllMocks();
  });

  describe('validateYouTubeUrl', () => {
    it('should validate correct YouTube URLs', async () => {
      expect(await service.validateYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(await service.validateYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
      expect(await service.validateYouTubeUrl('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(await service.validateYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(true);
    });

    it('should reject invalid URLs', async () => {
      expect(await service.validateYouTubeUrl('https://example.com')).toBe(false);
      expect(await service.validateYouTubeUrl('not-a-url')).toBe(false);
      expect(await service.validateYouTubeUrl('https://vimeo.com/123456')).toBe(false);
      expect(await service.validateYouTubeUrl('')).toBe(false);
    });

    it('should handle validation errors gracefully', async () => {
      // Mock URL validation to throw an error
      const originalConsoleError = console.error;
      console.error = jest.fn(); // Suppress error logging for test

      expect(await service.validateYouTubeUrl('')).toBe(false);
      expect(await service.validateYouTubeUrl('invalid-url')).toBe(false);

      console.error = originalConsoleError;
    });
  });

  describe('cleanupFailedDownload', () => {
    it('should clean up failed download files', async () => {
      const videoId = 'test-video-id';
      const testFiles = [
        'Test_Video-test-video-id.mp4',
        'Test_Video-test-video-id.part',
        'other-file.mp4'
      ];
      
      mockReaddir.mockResolvedValue(testFiles);
      mockUnlink.mockResolvedValue(undefined);

      await service.cleanupFailedDownload(videoId);

      expect(mockUnlink).toHaveBeenCalledTimes(2);
    });

    it('should handle cleanup errors gracefully', async () => {
      const videoId = 'test-video-id';
      
      mockReaddir.mockRejectedValue(new Error('Directory not found'));

      // Should not throw
      await expect(service.cleanupFailedDownload(videoId)).resolves.not.toThrow();
    });

    it('should handle unlink errors gracefully', async () => {
      const videoId = 'test-video-id';
      const testFiles = ['Test_Video-test-video-id.mp4'];
      
      mockReaddir.mockResolvedValue(testFiles);
      mockUnlink.mockRejectedValue(new Error('Permission denied'));

      // Should not throw
      await expect(service.cleanupFailedDownload(videoId)).resolves.not.toThrow();
    });
  });

  describe('downloadVideo', () => {
    it('should handle invalid URL and return error result', async () => {
      const mockRequest = {
        url: 'invalid-url',
        title: 'Test Video',
        requestedAt: new Date(),
        requestId: 'test-request-123'
      };

      const result = await service.downloadVideo(mockRequest);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Invalid YouTube URL format');
      expect(result.id).toBeDefined();
      expect(result.startedAt).toBeDefined();
      expect(result.completedAt).toBeDefined();
    });
  });
});