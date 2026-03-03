import { describe, test, expect, beforeEach, vi } from 'vitest';
import { 
  downloadVideo, 
  getDownloadQueue, 
  cancelDownload, 
  validateYouTubeUrl,
  extractYouTubeVideoId,
  formatQueueItemTitle,
  getStatusColor
} from '../services/youtube';
import { 
  DownloadRequest, 
  QueueStatus, 
  QueueItem, 
  YouTubeApiResponse,
  YOUTUBE_URL_PATTERNS 
} from '../types/youtube';
import { ApiError } from '../services/api';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('YouTube Service', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('downloadVideo', () => {
    test('should successfully start download with valid request', async () => {
      const request: DownloadRequest = {
        url: 'https://www.youtube.com/watch?v=test123abc',
        title: 'Test Video'
      };

      const mockResponse: YouTubeApiResponse<QueueItem> = {
        status: 'success',
        data: {
          id: 'test-download-1',
          url: request.url,
          title: 'Test Video',
          status: 'pending',
          progress: 0,
          currentStep: 'Queued for processing',
          queuedAt: new Date().toISOString(),
          metadata: {
            id: 'test123abc',
            title: 'Test Video'
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await downloadVideo(request);

      expect(result).toEqual(mockResponse.data);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3010/api/youtube/download',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(request)
        }
      );
    });

    test('should throw ApiError on API failure', async () => {
      const request: DownloadRequest = {
        url: 'https://www.youtube.com/watch?v=invalid'
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ status: 'error', message: 'Bad Request' })
      });

      await expect(downloadVideo(request)).rejects.toThrow(ApiError);
      await expect(downloadVideo(request)).rejects.toThrow('Bad Request');
    });

    test('should throw ApiError on network failure', async () => {
      const request: DownloadRequest = {
        url: 'https://www.youtube.com/watch?v=test123abc'
      };

      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(downloadVideo(request)).rejects.toThrow(ApiError);
      await expect(downloadVideo(request)).rejects.toThrow('Network error');
    });
  });

  describe('getDownloadQueue', () => {
    test('should return queue status successfully', async () => {
      const mockQueueStatus: QueueStatus = {
        items: [
          {
            id: 'download-1',
            url: 'https://www.youtube.com/watch?v=test1',
            title: 'Test Video 1',
            status: 'processing',
            progress: 45,
            currentStep: 'Downloading video',
            queuedAt: new Date().toISOString(),
            startedAt: new Date().toISOString()
          }
        ],
        totalItems: 1,
        processing: 1,
        completed: 0,
        failed: 0,
        pending: 0,
        cancelled: 0,
        lastUpdated: new Date().toISOString()
      };

      const mockResponse: YouTubeApiResponse<QueueStatus> = {
        status: 'success',
        data: mockQueueStatus
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await getDownloadQueue();

      expect(result).toEqual(mockQueueStatus);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3010/api/youtube/queue', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    test('should handle empty queue', async () => {
      const emptyQueue: QueueStatus = {
        items: [],
        totalItems: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        pending: 0,
        cancelled: 0,
        lastUpdated: new Date().toISOString()
      };

      const mockResponse: YouTubeApiResponse<QueueStatus> = {
        status: 'success',
        data: emptyQueue
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await getDownloadQueue();

      expect(result).toEqual(emptyQueue);
      expect(result.items).toHaveLength(0);
    });

    test('should throw ApiError on queue fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(getDownloadQueue()).rejects.toThrow(ApiError);
    });
  });

  describe('cancelDownload', () => {
    test('should successfully cancel download', async () => {
      const downloadId = 'test-download-1';
      
      const mockResponse: YouTubeApiResponse<{ message: string; queueItemId: string }> = {
        status: 'success',
        data: { message: 'Download cancelled successfully', queueItemId: downloadId }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await cancelDownload(downloadId);

      expect(result).toEqual({ message: 'Download cancelled successfully', queueItemId: downloadId });
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:3010/api/youtube/download/${downloadId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    });

    test('should handle cancel failure gracefully', async () => {
      const downloadId = 'nonexistent-download';

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ status: 'error', message: 'Not Found' })
      });

      await expect(cancelDownload(downloadId)).rejects.toThrow(ApiError);
      await expect(cancelDownload(downloadId)).rejects.toThrow('Not Found');
    });
  });

  describe('validateYouTubeUrl', () => {
    test('should validate standard YouTube watch URLs', () => {
      const validUrls = [
        'https://www.youtube.com/watch?v=test123abc',
        'https://youtube.com/watch?v=test123abc',
        'http://www.youtube.com/watch?v=test123abc',
        'https://www.youtube.com/watch?v=test123abc&t=30s',
        'https://www.youtube.com/watch?v=test123abc&list=PLtest'
      ];

      validUrls.forEach(url => {
        const result = validateYouTubeUrl(url);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    test('should validate YouTube short URLs', () => {
      const validShortUrls = [
        'https://youtu.be/test123abc',
        'http://youtu.be/test123abc',
        'https://youtu.be/test123abc?t=30'
      ];

      validShortUrls.forEach(url => {
        const result = validateYouTubeUrl(url);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    test('should reject invalid URLs', () => {
      const invalidUrls = [
        '',
        'not-a-url',
        'https://example.com',
        'https://vimeo.com/123456',
        'https://youtube.com/invalid',
        'https://www.youtube.com/watch',
        'https://www.youtube.com/watch?v=',
        'ftp://youtube.com/watch?v=test'
      ];

      invalidUrls.forEach(url => {
        const result = validateYouTubeUrl(url);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    test('should handle URL edge cases', () => {
      // Empty URL
      const emptyResult = validateYouTubeUrl('');
      expect(emptyResult.isValid).toBe(false);
      expect(emptyResult.error).toBe('URL is required');

      // Too short URL
      const shortResult = validateYouTubeUrl('short');
      expect(shortResult.isValid).toBe(false);
      expect(shortResult.error).toBe('URL is too short');

      // Too long URL
      const longUrl = 'https://www.youtube.com/watch?v=' + 'x'.repeat(2000);
      const longResult = validateYouTubeUrl(longUrl);
      expect(longResult.isValid).toBe(false);
      expect(longResult.error).toBe('URL is too long');
    });
  });

  describe('extractYouTubeVideoId', () => {
    test('should extract video ID from standard watch URLs', () => {
      const testCases = [
        { url: 'https://www.youtube.com/watch?v=test123abc', expected: 'test123abc' },
        { url: 'https://youtube.com/watch?v=abc123def456', expected: 'abc123def456' },
        { url: 'http://www.youtube.com/watch?v=test_video', expected: 'test_video' }
      ];

      testCases.forEach(({ url, expected }) => {
        expect(extractYouTubeVideoId(url)).toBe(expected);
      });
    });

    test('should extract video ID from short URLs', () => {
      const testCases = [
        { url: 'https://youtu.be/test123abc', expected: 'test123abc' },
        { url: 'http://youtu.be/abc123def456', expected: 'abc123def456' }
      ];

      testCases.forEach(({ url, expected }) => {
        expect(extractYouTubeVideoId(url)).toBe(expected);
      });
    });

    test('should return null for invalid URLs', () => {
      const invalidUrls = [
        '',
        'https://example.com',
        'https://vimeo.com/123456',
        'not-a-url'
      ];

      invalidUrls.forEach(url => {
        expect(extractYouTubeVideoId(url)).toBeNull();
      });
    });
  });

  describe('formatQueueItemTitle', () => {
    test('should use metadata title when available', () => {
      const item: QueueItem = {
        id: 'test-1',
        url: 'https://www.youtube.com/watch?v=test123abc',
        title: 'Fallback Title',
        status: 'completed',
        progress: 100,
        currentStep: 'Done',
        queuedAt: new Date().toISOString(),
        metadata: {
          id: 'test123abc',
          title: 'Never Gonna Give You Up'
        }
      };

      expect(formatQueueItemTitle(item)).toBe('Never Gonna Give You Up');
    });

    test('should fallback to item title when metadata unavailable', () => {
      const item: QueueItem = {
        id: 'test-1',
        url: 'https://www.youtube.com/watch?v=test123abc',
        title: 'Custom Title',
        status: 'pending',
        progress: 0,
        currentStep: 'Queued',
        queuedAt: new Date().toISOString()
      };

      expect(formatQueueItemTitle(item)).toBe('Custom Title');
    });

    test('should generate title from video ID when no title available', () => {
      const item: QueueItem = {
        id: 'test-1',
        url: 'https://www.youtube.com/watch?v=test123abc',
        title: 'https://www.youtube.com/watch?v=test123abc', // Same as URL
        status: 'pending',
        progress: 0,
        currentStep: 'Queued',
        queuedAt: new Date().toISOString()
      };

      expect(formatQueueItemTitle(item)).toBe('YouTube Video (test123abc)');
    });
  });

  describe('getStatusColor', () => {
    test('should return correct color classes for each status', () => {
      const statusTests = [
        { status: 'pending' as const, expected: 'bg-gray-100 text-gray-800' },
        { status: 'processing' as const, expected: 'bg-blue-100 text-blue-800' },
        { status: 'completed' as const, expected: 'bg-green-100 text-green-800' },
        { status: 'failed' as const, expected: 'bg-red-100 text-red-800' },
        { status: 'cancelled' as const, expected: 'bg-orange-100 text-orange-800' }
      ];

      statusTests.forEach(({ status, expected }) => {
        expect(getStatusColor(status)).toBe(expected);
      });
    });
  });

  describe('YOUTUBE_URL_PATTERNS constant', () => {
    test('should contain expected URL patterns', () => {
      expect(YOUTUBE_URL_PATTERNS).toBeDefined();
      expect(Array.isArray(YOUTUBE_URL_PATTERNS)).toBe(true);
      expect(YOUTUBE_URL_PATTERNS.length).toBeGreaterThan(0);
      
      // Test each pattern is a valid RegExp
      YOUTUBE_URL_PATTERNS.forEach(pattern => {
        expect(pattern).toBeInstanceOf(RegExp);
      });
    });
  });
});