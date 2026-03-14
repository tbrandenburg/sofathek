import { describe, test, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { useVideos, useVideo, useVideoStats } from '../hooks/useVideos';
import { getVideos, getVideoById } from '../services/api';
import { VideoScanResult, Video } from '../types';

// Mock the API service
vi.mock('../services/api', () => ({
  getVideos: vi.fn(),
  getVideoById: vi.fn()
}));

const mockGetVideos = vi.mocked(getVideos);
const mockGetVideoById = vi.mocked(getVideoById);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function QueryWrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useVideos Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useVideos', () => {
    test('should fetch videos on mount', async () => {
      const mockVideosResult: VideoScanResult = {
        videos: [
          {
            id: 'test-1',
            file: { name: 'test1.mp4', size: 1024, path: '/videos/test1.mp4', extension: 'mp4', lastModified: new Date() },
            metadata: { title: 'Test Video 1', duration: 120 },
            viewCount: 0
          }
        ],
        totalCount: 1,
        totalSize: 1024,
        scannedAt: new Date()
      };

      mockGetVideos.mockResolvedValueOnce(mockVideosResult);

      const { result } = renderHook(() => useVideos(), { wrapper: createWrapper() });

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeNull();

      // Wait for resolution
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockVideosResult);
      expect(result.current.error).toBeNull();
      expect(mockGetVideos).toHaveBeenCalledTimes(1);
    });

    test('should handle error state', async () => {
      const mockError = new Error('Failed to fetch videos');
      mockGetVideos.mockRejectedValue(mockError);

      const { result } = renderHook(() => useVideos(), { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 5000 }
      );

      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toEqual(mockError);
      expect(mockGetVideos).toHaveBeenCalledTimes(3);
    });

    test('should allow refetch', async () => {
      mockGetVideos.mockResolvedValue({
        videos: [],
        totalCount: 0,
        totalSize: 0,
        scannedAt: new Date()
      });

      const { result } = renderHook(() => useVideos(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear previous calls
      mockGetVideos.mockClear();

      // Trigger refetch
      await act(async () => {
        result.current.refetch();
      });

      expect(mockGetVideos).toHaveBeenCalledTimes(1);
    });
  });

  describe('useVideo', () => {
    test('should fetch specific video when id is provided', async () => {
      const mockVideo: Video = {
        id: 'test-1',
        file: { name: 'test1.mp4', size: 1024, path: '/videos/test1.mp4', extension: 'mp4', lastModified: new Date() },
        metadata: { title: 'Test Video 1', duration: 120 },
        viewCount: 5
      };

      mockGetVideoById.mockResolvedValueOnce(mockVideo);

      const { result } = renderHook(() => useVideo('test-1'), { wrapper: createWrapper() });

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockVideo);
      expect(result.current.error).toBeNull();
      expect(mockGetVideoById).toHaveBeenCalledWith('test-1');
    });

    test('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useVideo(''), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeNull();
      expect(mockGetVideoById).not.toHaveBeenCalled();
    });

    test('should refetch when id changes', async () => {
      mockGetVideoById.mockResolvedValue({
        id: 'test-1',
        file: { name: 'test.mp4', size: 1024, path: '/videos/test.mp4', extension: 'mp4', lastModified: new Date() },
        metadata: { title: 'Test Video', duration: 120 },
        viewCount: 0
      });

      const { result, rerender } = renderHook(
        ({ id }) => useVideo(id),
        { initialProps: { id: 'test-1' }, wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetVideoById).toHaveBeenCalledWith('test-1');
      mockGetVideoById.mockClear();

      // Change the id
      await act(async () => {
        rerender({ id: 'test-2' });
      });

      expect(mockGetVideoById).toHaveBeenCalledWith('test-2');
    });
  });

  describe('useVideoStats', () => {
    test('should calculate statistics from video data', async () => {
      const mockVideos: VideoScanResult = {
        videos: [
          {
            id: 'video-1',
            file: { name: 'video1.mp4', size: 1000, path: '/videos/video1.mp4', extension: 'mp4', lastModified: new Date() },
            metadata: { title: 'Video 1', duration: 120 },
            viewCount: 0
          },
          {
            id: 'video-2',
            file: { name: 'video2.mp4', size: 2000, path: '/videos/video2.mp4', extension: 'mp4', lastModified: new Date() },
            metadata: { title: 'Video 2', duration: 180 },
            viewCount: 0
          }
        ],
        totalCount: 2,
        totalSize: 3000,
        scannedAt: new Date()
      };

      mockGetVideos.mockResolvedValueOnce(mockVideos);

      const { result } = renderHook(() => useVideoStats(), { wrapper: createWrapper() });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.totalVideos).toBe(2);
      expect(result.current.totalSize).toBe(3000);
      expect(result.current.totalDuration).toBe(300); // 120 + 180
    });

    test('should handle missing duration gracefully', async () => {
      const mockVideos: VideoScanResult = {
        videos: [
          {
            id: 'video-1',
            file: { name: 'video1.mp4', size: 1000, path: '/videos/video1.mp4', extension: 'mp4', lastModified: new Date() },
            metadata: { title: 'Video 1' }, // No duration
            viewCount: 0
          }
        ],
        totalCount: 1,
        totalSize: 1000,
        scannedAt: new Date()
      };

      mockGetVideos.mockResolvedValueOnce(mockVideos);

      const { result } = renderHook(() => useVideoStats(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.totalVideos).toBe(1);
      expect(result.current.totalSize).toBe(1000);
      expect(result.current.totalDuration).toBe(0); // undefined duration treated as 0
    });

    test('should return zero stats when loading', () => {
      mockGetVideos.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useVideoStats(), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.totalVideos).toBe(0);
      expect(result.current.totalSize).toBe(0);
      expect(result.current.totalDuration).toBe(0);
    });
  });
});
