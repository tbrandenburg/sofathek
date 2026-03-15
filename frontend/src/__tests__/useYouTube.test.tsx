import { describe, test, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { 
  useYouTubeDownload, 
  useDownloadQueue, 
  useDownloadStatus,
  useCancelDownload,
  useQueueStats
} from '../hooks/useYouTube';
import { 
  downloadVideo, 
  getDownloadQueue, 
  getDownloadStatus, 
  cancelDownload 
} from '../services/youtube';
import { DownloadRequest, QueueStatus, QueueItem } from '../types/youtube';

// Mock the YouTube service
vi.mock('../services/youtube', () => ({
  downloadVideo: vi.fn(),
  getDownloadQueue: vi.fn(),
  getDownloadStatus: vi.fn(),
  cancelDownload: vi.fn()
}));

const mockDownloadVideo = vi.mocked(downloadVideo);
const mockGetDownloadQueue = vi.mocked(getDownloadQueue);
const mockGetDownloadStatus = vi.mocked(getDownloadStatus);
const mockCancelDownload = vi.mocked(cancelDownload);

// Test wrapper for React Query
const createWrapper = () => {
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

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('YouTube Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useYouTubeDownload', () => {
    test('should successfully download video', async () => {
      const mockRequest: DownloadRequest = {
        url: 'https://www.youtube.com/watch?v=test123abc',
        title: 'Test Video'
      };

      const mockQueueItem: QueueItem = {
        id: 'download-1',
        url: mockRequest.url,
        title: 'Test Video',
        status: 'pending',
        progress: 0,
        currentStep: 'Queued',
        queuedAt: new Date().toISOString()
      };

      mockDownloadVideo.mockResolvedValueOnce(mockQueueItem);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useYouTubeDownload(), { wrapper });

      await act(async () => {
        result.current.mutate(mockRequest);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockQueueItem);
      expect(mockDownloadVideo).toHaveBeenCalledWith(mockRequest, expect.any(Object));
    });

    test('should handle download error', async () => {
      const mockRequest: DownloadRequest = {
        url: 'https://www.youtube.com/watch?v=invalid'
      };

      const mockError = new Error('Invalid video URL');
      mockDownloadVideo.mockRejectedValue(mockError);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useYouTubeDownload(), { wrapper });

      await act(async () => {
        result.current.mutate(mockRequest);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      }, { timeout: 3000 });

      expect(result.current.error).toEqual(mockError);
      expect(mockDownloadVideo).toHaveBeenCalledTimes(3);
    });
  });

  describe('useDownloadQueue', () => {
    test('should fetch queue status on mount', async () => {
      const mockQueue: QueueStatus = {
        items: [
          {
            id: 'download-1',
            url: 'https://www.youtube.com/watch?v=test1',
            title: 'Test Video 1',
            status: 'processing',
            progress: 50,
            currentStep: 'Downloading',
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

      mockGetDownloadQueue.mockResolvedValueOnce(mockQueue);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDownloadQueue(), { wrapper });

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockQueue);
      expect(result.current.error).toBeNull();
      expect(mockGetDownloadQueue).toHaveBeenCalledTimes(1);
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

      mockGetDownloadQueue.mockResolvedValueOnce(emptyQueue);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDownloadQueue(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(emptyQueue);
      expect(result.current.data?.items).toHaveLength(0);
    });

    test('should handle queue fetch error', async () => {
      const mockError = new Error('Failed to fetch queue');
      mockGetDownloadQueue.mockRejectedValueOnce(mockError);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDownloadQueue(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      }, { timeout: 5000 });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toContain('["youtube","queue"]');
    });
  });

  describe('useDownloadStatus', () => {
    test('should fetch download status when itemId is provided', async () => {
      const mockItem: QueueItem = {
        id: 'download-1',
        url: 'https://www.youtube.com/watch?v=test1',
        title: 'Test Video',
        status: 'completed',
        progress: 100,
        currentStep: 'Done',
        queuedAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      };

      mockGetDownloadStatus.mockResolvedValueOnce(mockItem);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDownloadStatus('download-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockItem);
      expect(mockGetDownloadStatus).toHaveBeenCalledWith('download-1');
    });

    test('should not fetch when itemId is undefined', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useDownloadStatus(undefined), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(mockGetDownloadStatus).not.toHaveBeenCalled();
    });

    test('should refetch when itemId changes', async () => {
      const mockItem1: QueueItem = {
        id: 'download-1',
        url: 'https://www.youtube.com/watch?v=test1',
        title: 'Test Video 1',
        status: 'processing',
        progress: 50,
        currentStep: 'Downloading',
        queuedAt: new Date().toISOString()
      };

      const mockItem2: QueueItem = {
        id: 'download-2',
        url: 'https://www.youtube.com/watch?v=test2',
        title: 'Test Video 2',
        status: 'completed',
        progress: 100,
        currentStep: 'Done',
        queuedAt: new Date().toISOString()
      };

      mockGetDownloadStatus.mockResolvedValueOnce(mockItem1);
      mockGetDownloadStatus.mockResolvedValueOnce(mockItem2);

      const wrapper = createWrapper();
      const { result, rerender } = renderHook(
        ({ itemId }) => useDownloadStatus(itemId),
        { wrapper, initialProps: { itemId: 'download-1' } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockItem1);
      expect(mockGetDownloadStatus).toHaveBeenCalledWith('download-1');

      // Change itemId
      await act(async () => {
        rerender({ itemId: 'download-2' });
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockItem2);
      });

      expect(mockGetDownloadStatus).toHaveBeenCalledWith('download-2');
    });
  });

  describe('useCancelDownload', () => {
    test('should successfully cancel download', async () => {
      mockCancelDownload.mockResolvedValueOnce({ message: 'Download cancelled successfully', queueItemId: 'download-1' });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCancelDownload(), { wrapper });

      await act(async () => {
        result.current.mutate('download-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockCancelDownload).toHaveBeenCalledWith('download-1', expect.any(Object));
    });

    test('should handle cancel error', async () => {
      const mockError = new Error('Failed to cancel download');
      mockCancelDownload.mockRejectedValue(mockError);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCancelDownload(), { wrapper });

      await act(async () => {
        result.current.mutate('download-1');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      }, { timeout: 3000 });

      expect(result.current.error).toEqual(mockError);
      expect(mockCancelDownload).toHaveBeenCalledTimes(2);
    });
  });

  describe('useQueueStats', () => {
    test('should calculate queue statistics', async () => {
      const mockQueue: QueueStatus = {
        items: [
          {
            id: 'download-1',
            url: 'https://www.youtube.com/watch?v=test1',
            title: 'Test Video 1',
            status: 'completed',
            progress: 100,
            currentStep: 'Done',
            queuedAt: new Date().toISOString()
          },
          {
            id: 'download-2',
            url: 'https://www.youtube.com/watch?v=test2',
            title: 'Test Video 2',
            status: 'processing',
            progress: 50,
            currentStep: 'Downloading',
            queuedAt: new Date().toISOString()
          }
        ],
        totalItems: 2,
        processing: 1,
        completed: 1,
        failed: 0,
        pending: 0,
        cancelled: 0,
        lastUpdated: new Date().toISOString()
      };

      mockGetDownloadQueue.mockResolvedValueOnce(mockQueue);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useQueueStats(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.totalItems).toBe(2);
      expect(result.current.completed).toBe(1);
      expect(result.current.processing).toBe(1);
      expect(result.current.failed).toBe(0);
    });

    test('should return zero stats when loading', () => {
      mockGetDownloadQueue.mockImplementation(() => new Promise(() => {})); // Never resolves

      const wrapper = createWrapper();
      const { result } = renderHook(() => useQueueStats(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.totalItems).toBe(0);
      expect(result.current.completed).toBe(0);
      expect(result.current.processing).toBe(0);
      expect(result.current.failed).toBe(0);
    });
  });
});
