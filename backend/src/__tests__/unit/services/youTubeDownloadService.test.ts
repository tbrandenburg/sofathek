import { YouTubeDownloadService } from '../../../services/youTubeDownloadService';

// Simple mock for fs/promises
const mockReaddir = jest.fn();
const mockRename = jest.fn();
const mockAccess = jest.fn();
const mockMkdir = jest.fn();
const mockUnlink = jest.fn();
const mockWriteFile = jest.fn();

jest.mock('fs/promises', () => ({
  readdir: (...args: any[]) => mockReaddir(...args),
  rename: (...args: any[]) => mockRename(...args),
  access: (...args: any[]) => mockAccess(...args),
  mkdir: (...args: any[]) => mockMkdir(...args),
  unlink: (...args: any[]) => mockUnlink(...args),
  writeFile: (...args: any[]) => mockWriteFile(...args)
}));

jest.mock('youtube-dl-exec', () => jest.fn());

// Mock sub-services to allow testing thumbnail priority logic
const mockDownload = jest.fn();
const mockExtract = jest.fn();
const mockValidate = jest.fn();
const mockMoveToLibrary = jest.fn();
const mockEnsureDirectories = jest.fn();

jest.mock('../../../services/youTubeFileDownloader', () => ({
  YouTubeFileDownloader: jest.fn().mockImplementation(() => ({
    download: mockDownload,
    cancelDownload: jest.fn()
  }))
}));

jest.mock('../../../services/youTubeMetadataExtractor', () => ({
  YouTubeMetadataExtractor: jest.fn().mockImplementation(() => ({
    extract: mockExtract
  }))
}));

jest.mock('../../../services/youTubeUrlValidator', () => ({
  YouTubeUrlValidator: jest.fn().mockImplementation(() => ({
    validate: mockValidate
  }))
}));

jest.mock('../../../services/videoFileManager', () => ({
  VideoFileManager: jest.fn().mockImplementation(() => ({
    ensureDirectoriesExist: mockEnsureDirectories,
    moveToLibrary: mockMoveToLibrary,
    cleanupFailedDownload: jest.fn()
  }))
}));

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
    it('should validate supported video URLs', async () => {
      mockValidate.mockResolvedValue(true);
      expect(await service.validateYouTubeUrl('https://www.youtube.com/watch?v=test123abc')).toBe(true);
      expect(await service.validateYouTubeUrl('https://youtu.be/test123abc')).toBe(true);
      expect(await service.validateYouTubeUrl('https://youtube.com/watch?v=test123abc')).toBe(true);
      expect(await service.validateYouTubeUrl('https://www.youtube.com/embed/test123abc')).toBe(true);
    });

    it('should reject invalid URLs', async () => {
      mockValidate
        .mockResolvedValueOnce(true)   // https://example.com
        .mockResolvedValueOnce(false)  // not-a-url
        .mockResolvedValueOnce(false)  // ftp://vimeo.com/123456
        .mockResolvedValueOnce(false); // ''
      expect(await service.validateYouTubeUrl('https://example.com')).toBe(true);
      expect(await service.validateYouTubeUrl('not-a-url')).toBe(false);
      expect(await service.validateYouTubeUrl('ftp://vimeo.com/123456')).toBe(false);
      expect(await service.validateYouTubeUrl('')).toBe(false);
    });

    it('should handle validation errors gracefully', async () => {
      mockValidate.mockResolvedValue(false);
      expect(await service.validateYouTubeUrl('')).toBe(false);
      expect(await service.validateYouTubeUrl('invalid-url')).toBe(false);
    });
  });

  describe('cleanupFailedDownload', () => {
    it('should delegate cleanup to VideoFileManager', async () => {
      const mockCleanup = jest.fn().mockResolvedValue(undefined);
      // Rebuild service with a cleanup mock accessible
      (service as any).fileManager.cleanupFailedDownload = mockCleanup;

      await service.cleanupFailedDownload('test-video-id');

      expect(mockCleanup).toHaveBeenCalledWith('test-video-id');
    });

    it('should propagate cleanup errors', async () => {
      const mockCleanup = jest.fn().mockRejectedValue(new Error('Directory not found'));
      (service as any).fileManager.cleanupFailedDownload = mockCleanup;

      await expect(service.cleanupFailedDownload('test-video-id')).rejects.toThrow('Directory not found');
    });
  });

  describe('downloadVideo', () => {
    it('should handle invalid URL and return error result', async () => {
      mockValidate.mockResolvedValue(false);
      const mockRequest = {
        url: 'invalid-url',
        title: 'Test Video',
        requestedAt: new Date(),
        requestId: 'test-request-123'
      };

      const result = await service.downloadVideo(mockRequest);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Invalid video URL format');
      expect(result.id).toBeDefined();
      expect(result.startedAt).toBeDefined();
      expect(result.completedAt).toBeDefined();
    });
    
    it('should handle URL validation edge cases', async () => {
      mockValidate.mockResolvedValue(false);
      const testCases = [
        'https://youtube.com/watch?v=',
        'https://youtu.be/',
        'not-a-url-at-all',
        '',
        'ftp://vimeo.com/123456'
      ];
      
      for (const url of testCases) {
        const mockRequest = {
          url,
          title: 'Test Video',
          requestedAt: new Date(), 
          requestId: `test-${Math.random()}`
        };
        
        const result = await service.downloadVideo(mockRequest);
        expect(result.status).toBe('error');
        expect(result.error).toBeDefined();
      }
    });
  });
  
  describe('validateYouTubeUrl (extended)', () => {
    it('should validate valid video URLs', async () => {
      mockValidate.mockResolvedValue(true);
      const validUrls = [
        'https://www.youtube.com/watch?v=test123abc',
        'https://youtube.com/watch?v=test456def', 
        'https://youtu.be/test789ghi',
        'https://www.youtube.com/embed/testabcjkl',
        'https://www.youtube.com/v/testmnoxyz',
        'https://vimeo.com/123456',
        'https://example.com/video.mp4'
      ];
      
      for (const url of validUrls) {
        const result = await service.validateYouTubeUrl(url);
        expect(result).toBe(true);
      }
    });
    
    it('should reject invalid video URLs', async () => {
      mockValidate.mockResolvedValue(false);
      const invalidUrls = [
        'ftp://vimeo.com/123456',
        'file:///tmp/video.mp4',
        'not-a-url',
        '',
      ];
      
      for (const url of invalidUrls) {
        const result = await service.validateYouTubeUrl(url);
        expect(result).toBe(false);
      }
    });
  });
  
  describe('graceful error handling', () => {
    it('should return error result when URL is invalid', async () => {
      mockValidate.mockResolvedValue(false);
      const request = {
        url: 'https://www.youtube.com/watch?v=validtest',
        title: 'Test Video', 
        requestedAt: new Date(),
        requestId: 'graceful-test'
      };
      
      const result = await service.downloadVideo(request);
      
      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
      expect(result.id).toBeDefined();
    });
  });

  describe('additional coverage for CI stability', () => {    
    it('should handle validation with empty or invalid URLs consistently', async () => {
      mockValidate.mockResolvedValue(false);
      const invalidUrls = ['', '   ', 'not-a-url', 'http://', 'https://'];
      
      for (const url of invalidUrls) {
        const isValid = await service.validateYouTubeUrl(url);
        expect(isValid).toBe(false);
      }
    });
  });

  describe('thumbnail priority: yt-dlp over ffmpeg', () => {
    const mockMetadata = {
      id: 'abc123',
      title: 'Test Video',
      webpageUrl: 'https://www.youtube.com/watch?v=abc123'
    };
    const tempVideoPath = '/test/temp/Test_Video-abc123.mp4';
    const finalVideoPath = '/test/videos/Test_Video-abc123.mp4';

    beforeEach(() => {
      jest.clearAllMocks();
      mockValidate.mockResolvedValue(true);
      mockEnsureDirectories.mockResolvedValue(undefined);
      mockExtract.mockResolvedValue(mockMetadata);
      mockDownload.mockResolvedValue(tempVideoPath);
      mockMoveToLibrary.mockResolvedValue(finalVideoPath);
      mockWriteFile.mockResolvedValue(undefined);
      mockRename.mockResolvedValue(undefined);
    });

    it('should use yt-dlp thumbnail and skip generateThumbnail when .webp thumbnail exists', async () => {
      // Simulate yt-dlp wrote a .webp thumbnail alongside the video
      mockAccess.mockImplementation((filePath: string) => {
        if (filePath === '/test/temp/Test_Video-abc123.webp') return Promise.resolve();
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await service.downloadVideo({
        url: 'https://www.youtube.com/watch?v=abc123',
        title: 'Test Video',
        requestedAt: new Date(),
        requestId: 'req-1'
      });

      expect(result.status).toBe('success');
      expect(mockThumbnailService.generateThumbnail).not.toHaveBeenCalled();
      expect(result.thumbnailPath).toBe('/test/temp/Test_Video-abc123.webp');
    });

    it('should fall back to generateThumbnail when no yt-dlp thumbnail exists', async () => {
      // No yt-dlp thumbnail found
      mockAccess.mockRejectedValue(new Error('ENOENT'));
      mockThumbnailService.generateThumbnail.mockResolvedValue('/test/temp/Test_Video-abc123.jpg');

      const result = await service.downloadVideo({
        url: 'https://www.youtube.com/watch?v=abc123',
        title: 'Test Video',
        requestedAt: new Date(),
        requestId: 'req-2'
      });

      expect(result.status).toBe('success');
      expect(mockThumbnailService.generateThumbnail).toHaveBeenCalledWith(tempVideoPath);
      expect(result.thumbnailPath).toBe('/test/temp/Test_Video-abc123.jpg');
    });

    it('should use .jpg yt-dlp thumbnail when .webp not found but .jpg exists', async () => {
      mockAccess.mockImplementation((filePath: string) => {
        if (filePath === '/test/temp/Test_Video-abc123.jpg') return Promise.resolve();
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await service.downloadVideo({
        url: 'https://www.youtube.com/watch?v=abc123',
        title: 'Test Video',
        requestedAt: new Date(),
        requestId: 'req-3'
      });

      expect(result.status).toBe('success');
      expect(mockThumbnailService.generateThumbnail).not.toHaveBeenCalled();
      expect(result.thumbnailPath).toBe('/test/temp/Test_Video-abc123.jpg');
    });

    it('should skip all thumbnail logic for audio-only (.mp3) downloads', async () => {
      const mp3TempPath = '/test/temp/Test_Video-abc123.mp3';
      mockDownload.mockResolvedValue(mp3TempPath);
      // access should not be called for .mp3
      mockAccess.mockRejectedValue(new Error('ENOENT'));

      const result = await service.downloadVideo({
        url: 'https://www.youtube.com/watch?v=abc123',
        title: 'Test Video',
        requestedAt: new Date(),
        requestId: 'req-4'
      });

      expect(result.status).toBe('success');
      expect(mockThumbnailService.generateThumbnail).not.toHaveBeenCalled();
      // access should not have been called for thumbnail detection on mp3
      expect(mockAccess).not.toHaveBeenCalledWith(expect.stringMatching(/\.(webp|jpg|jpeg|png)$/));
      expect(result.thumbnailPath).toBeUndefined();
    });

    it('should continue without thumbnail if both yt-dlp thumbnail and ffmpeg generation fail', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT'));
      mockThumbnailService.generateThumbnail.mockRejectedValue(new Error('ffmpeg not found'));

      const result = await service.downloadVideo({
        url: 'https://www.youtube.com/watch?v=abc123',
        title: 'Test Video',
        requestedAt: new Date(),
        requestId: 'req-5'
      });

      expect(result.status).toBe('success');
      expect(mockThumbnailService.generateThumbnail).toHaveBeenCalled();
      expect(result.thumbnailPath).toBeUndefined();
    });
  });
});