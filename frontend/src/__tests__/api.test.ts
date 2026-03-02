import { describe, test, expect, beforeEach, vi } from 'vitest';
import { 
  getVideos, 
  getVideoById, 
  getVideoStreamUrl, 
  getVideoThumbnailUrl,
  formatFileSize,
  formatDuration,
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
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3010/api/videos');
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
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3010/api/videos/test-video-1');
    });

    test('should properly encode video ID in URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: {} })
      });

      await getVideoById('video with spaces');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3010/api/videos/video%20with%20spaces');
    });
  });

  describe('getVideoStreamUrl', () => {
    test('should return correct streaming URL', () => {
      const url = getVideoStreamUrl('test-video.mp4');
      expect(url).toBe('http://localhost:3010/api/stream/test-video.mp4');
    });

    test('should properly encode filename', () => {
      const url = getVideoStreamUrl('video with spaces.mp4');
      expect(url).toBe('http://localhost:3010/api/stream/video%20with%20spaces.mp4');
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
      expect(url).toBe('http://localhost:3010/api/stream/thumb.jpg');
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
});