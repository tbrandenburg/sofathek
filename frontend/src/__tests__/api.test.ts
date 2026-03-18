import { describe, test, expect, beforeEach, vi } from 'vitest';
import { 
  getVideos, 
  getVideoById, 
  getVideoStreamUrl, 
  getVideoThumbnailUrl,
  sanitizeFilename,
  formatFileSize,
  formatDuration,
  checkBackendHealth,
  ApiError 
} from '../services/api';
import { Video } from '../types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Service', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('getVideos', () => {
    test('should return video list on successful API call', async () => {
      const mockResponse = {
        status: 'success',
        data: {
          videos: [
            {
              id: 'test-video-1',
              file: { name: 'test.mp4', size: 1024, path: '/videos/test.mp4', extension: 'mp4', lastModified: new Date() },
              metadata: { title: 'Test Video 1', duration: 120 },
              viewCount: 0
            }
          ],
          totalCount: 1,
          totalSize: 1024,
          scannedAt: new Date()
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await getVideos();

      expect(result).toEqual(mockResponse.data);
      expect(mockFetch).toHaveBeenCalledWith('/api/videos');
    });

    test('should throw ApiError on API failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(getVideos()).rejects.toThrow(ApiError);
      await expect(getVideos()).rejects.toThrow('API request failed: Internal Server Error');
    });

    test('should throw ApiError on network failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(getVideos()).rejects.toThrow(ApiError);
      await expect(getVideos()).rejects.toThrow('Network error');
    });
  });

  describe('getVideoById', () => {
    test('should return specific video on successful API call', async () => {
      const mockVideo: Video = {
        id: 'test-video-1',
        file: { 
          name: 'test.mp4', 
          size: 1024, 
          path: '/videos/test.mp4', 
          extension: 'mp4', 
          lastModified: new Date() 
        },
        metadata: { title: 'Test Video 1', duration: 120 },
        viewCount: 5
      };

      const mockResponse = {
        status: 'success',
        data: mockVideo
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await getVideoById('test-video-1');

      expect(result).toEqual(mockVideo);
      expect(mockFetch).toHaveBeenCalledWith('/api/videos/test-video-1');
    });

    test('should properly encode video ID in URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: {} })
      });

      await getVideoById('video with spaces');

      expect(mockFetch).toHaveBeenCalledWith('/api/videos/video%20with%20spaces');
    });
  });

  describe('getVideoStreamUrl', () => {
    test('should return correct streaming URL', () => {
      const url = getVideoStreamUrl('test-video.mp4');
      expect(url).toBe('/api/stream/test-video.mp4');
    });

    test('should properly encode filename', () => {
      const url = getVideoStreamUrl('video with spaces.mp4');
      expect(url).toBe('/api/stream/video%20with%20spaces.mp4');
    });
  });

  describe('getVideoThumbnailUrl', () => {
    test('should return thumbnail URL when thumbnail exists', () => {
      const video: Video = {
        id: 'test',
        file: { name: 'test.mp4', size: 1024, path: '/videos/test.mp4', extension: 'mp4', lastModified: new Date() },
        metadata: { title: 'Test Video', thumbnail: 'thumb.jpg' },
        viewCount: 0
      };

      const url = getVideoThumbnailUrl(video);
      expect(url).toBe('/api/thumbnails/thumb.jpg');
    });

    test('should return null when no thumbnail', () => {
      const video: Video = {
        id: 'test',
        file: { name: 'test.mp4', size: 1024, path: '/videos/test.mp4', extension: 'mp4', lastModified: new Date() },
        metadata: { title: 'Test Video' },
        viewCount: 0
      };

      const url = getVideoThumbnailUrl(video);
      expect(url).toBeNull();
    });
  });

  describe('sanitizeFilename', () => {
    test('should replace special characters with underscores', () => {
      expect(sanitizeFilename('video<>:"/\\|?*.mp4')).toBe('video_.mp4');
    });

    test('should preserve alphanumeric and . - _ characters', () => {
      expect(sanitizeFilename('my-video_file.MP4')).toBe('my-video_file.MP4');
    });

    test('should handle empty string', () => {
      expect(sanitizeFilename('')).toBe('');
    });

    test('should limit filename length to 200 characters', () => {
      const longName = 'a'.repeat(300) + '.mp4';
      expect(sanitizeFilename(longName).length).toBe(200);
    });

    test('should collapse multiple underscores into one', () => {
      expect(sanitizeFilename('video   with   spaces.mp4')).toBe('video_with_spaces.mp4');
    });

    test('should trim leading and trailing whitespace', () => {
      expect(sanitizeFilename('  video.mp4  ')).toBe('video.mp4');
    });

    test('should remove path traversal separators', () => {
      expect(sanitizeFilename('../../etc/passwd.mp4')).toBe('.._.._etc_passwd.mp4');
    });
  });

  describe('formatFileSize', () => {
    test('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0.0 B');
      expect(formatFileSize(512)).toBe('512.0 B');
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(1073741824)).toBe('1.0 GB');
    });
  });

  describe('formatDuration', () => {
    test('should format duration in seconds correctly', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(30)).toBe('0:30');
      expect(formatDuration(60)).toBe('1:00');
      expect(formatDuration(90)).toBe('1:30');
      expect(formatDuration(3661)).toBe('1:01:01');
    });

    test('should handle undefined duration', () => {
      expect(formatDuration(undefined)).toBe('0:00');
    });

    test('should handle negative duration', () => {
      expect(formatDuration(-10)).toBe('0:00');
    });
  });

  describe('ApiError', () => {
    test('should create error with correct properties', () => {
      const error = new ApiError('Test error', 404);
      
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(404);
      expect(error.name).toBe('ApiError');
      expect(error instanceof Error).toBe(true);
    });

    test('should default to status 500', () => {
      const error = new ApiError('Test error');
      expect(error.status).toBe(500);
    });
  });

  describe('checkBackendHealth', () => {
    test('should return health status when backend is available', async () => {
      const mockHealth = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'sofathek-backend',
        version: '1.0.0',
        environment: 'test',
        uptime: 100,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHealth
      });

      const result = await checkBackendHealth();

      expect(result).toEqual(mockHealth);
      expect(mockFetch).toHaveBeenCalledWith('/api/health');
    });

    test('should return null when backend is unavailable', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await checkBackendHealth();

      expect(result).toBeNull();
    });

    test('should return null when backend returns 4xx error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await checkBackendHealth();

      expect(result).toBeNull();
    });

    test('should return health status when backend returns warning', async () => {
      const mockHealth = {
        status: 'warning',
        timestamp: new Date().toISOString(),
        service: 'sofathek-backend',
        version: '1.0.0',
        environment: 'test',
        uptime: 100,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHealth
      });

      const result = await checkBackendHealth();

      expect(result).toEqual(mockHealth);
    });
  });
});
