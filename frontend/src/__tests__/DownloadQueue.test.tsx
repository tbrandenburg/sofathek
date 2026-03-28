import React from 'react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DownloadQueue } from '../components/DownloadQueue';
import { useDownloadQueue, useCancelDownload, useClearDownloadQueue } from '../hooks/useYouTube';
import { QueueStatus } from '../types/youtube';

// Mock the YouTube hooks
vi.mock('../hooks/useYouTube', () => ({
  useDownloadQueue: vi.fn(),
  useCancelDownload: vi.fn(),
  useClearDownloadQueue: vi.fn(),
}));

const mockUseDownloadQueue = vi.mocked(useDownloadQueue);
const mockUseCancelDownload = vi.mocked(useCancelDownload);
const mockUseClearDownloadQueue = vi.mocked(useClearDownloadQueue);

// Test wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('DownloadQueue Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock for cancel mutation
    mockUseCancelDownload.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      error: null,
      data: undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    mockUseClearDownloadQueue.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      error: null,
      data: undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  test('should render empty state when no downloads', () => {
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

    mockUseDownloadQueue.mockReturnValue({
      data: emptyQueue,
      isLoading: false,
      error: null,
      isError: false,
      refetch: vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <DownloadQueue />
      </Wrapper>
    );

    expect(screen.getByTestId('download-queue')).toBeInTheDocument();
    expect(screen.getByText('Download Queue')).toBeInTheDocument();
    expect(screen.getByText('No downloads yet')).toBeInTheDocument();
    expect(screen.getByText(/enter a youtube url above to start downloading/i)).toBeInTheDocument();
    expect(screen.getByTestId('clear-queue-button')).toBeDisabled();
  });

  test('should render loading state', () => {
    mockUseDownloadQueue.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isError: false,
      refetch: vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <DownloadQueue />
      </Wrapper>
    );

    expect(screen.getByText('Loading queue status...')).toBeInTheDocument();
  });

  test('should render error state', () => {
    mockUseDownloadQueue.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load queue'),
      isError: true,
      refetch: vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <DownloadQueue />
      </Wrapper>
    );

    expect(screen.getByText(/failed to load download queue.*failed to load queue/i)).toBeInTheDocument();
  });

  test('should render queue items with different statuses', () => {
    const queueWithItems: QueueStatus = {
      items: [
        {
          id: 'download-1',
          url: 'https://www.youtube.com/watch?v=test1',
          title: 'Pending Video',
          status: 'pending',
          progress: 0,
          currentStep: 'Queued',
          queuedAt: new Date().toISOString()
        },
        {
          id: 'download-2',
          url: 'https://www.youtube.com/watch?v=test2',
          title: 'Processing Video',
          status: 'processing',
          progress: 45,
          currentStep: 'Downloading',
          queuedAt: new Date().toISOString()
        },
        {
          id: 'download-3',
          url: 'https://www.youtube.com/watch?v=test3',
          title: 'Completed Video',
          status: 'completed',
          progress: 100,
          currentStep: 'Done',
          queuedAt: new Date().toISOString(),
          completedAt: new Date().toISOString()
        }
      ],
      totalItems: 3,
      processing: 1,
      completed: 1,
      failed: 0,
      pending: 1,
      cancelled: 0,
      lastUpdated: new Date().toISOString()
    };

    mockUseDownloadQueue.mockReturnValue({
      data: queueWithItems,
      isLoading: false,
      error: null,
      isError: false,
      refetch: vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <DownloadQueue />
      </Wrapper>
    );

    // Check that all items are rendered
    expect(screen.getByText('Pending Video')).toBeInTheDocument();
    expect(screen.getByText('Processing Video')).toBeInTheDocument();
    expect(screen.getByText('Completed Video')).toBeInTheDocument();

    // Check status displays
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Processing')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();

    // Check queue stats
    expect(screen.getByText(/3.*total/)).toBeInTheDocument();
    expect(screen.getByText(/1.*processing/)).toBeInTheDocument();
  });

  test('should show progress bar for processing items', () => {
    const processingQueue: QueueStatus = {
      items: [
        {
          id: 'download-1',
          url: 'https://www.youtube.com/watch?v=test1',
          title: 'Processing Video',
          status: 'processing',
          progress: 65,
          currentStep: 'Downloading video (65%)',
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

    mockUseDownloadQueue.mockReturnValue({
      data: processingQueue,
      isLoading: false,
      error: null,
      isError: false,
      refetch: vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <DownloadQueue />
      </Wrapper>
    );

    // Check progress display
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('Downloading video (65%)')).toBeInTheDocument();

    // Check progress bar
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '65');
  });

  test('should handle cancel button click', () => {
    const mockCancelMutate = vi.fn();
    mockUseCancelDownload.mockReturnValue({
      mutate: mockCancelMutate,
      isPending: false,
      isError: false,
      isSuccess: false,
      error: null,
      data: undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const cancelableQueue: QueueStatus = {
      items: [
        {
          id: 'download-1',
          url: 'https://www.youtube.com/watch?v=test1',
          title: 'Pending Video',
          status: 'pending',
          progress: 0,
          currentStep: 'Queued',
          queuedAt: new Date().toISOString()
        }
      ],
      totalItems: 1,
      processing: 0,
      completed: 0,
      failed: 0,
      pending: 1,
      cancelled: 0,
      lastUpdated: new Date().toISOString()
    };

    mockUseDownloadQueue.mockReturnValue({
      data: cancelableQueue,
      isLoading: false,
      error: null,
      isError: false,
      refetch: vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <DownloadQueue />
      </Wrapper>
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockCancelMutate).toHaveBeenCalledWith('download-1');
  });

  test('should not show cancel button for completed items', () => {
    const completedQueue: QueueStatus = {
      items: [
        {
          id: 'download-1',
          url: 'https://www.youtube.com/watch?v=test1',
          title: 'Completed Video',
          status: 'completed',
          progress: 100,
          currentStep: 'Done',
          queuedAt: new Date().toISOString(),
          completedAt: new Date().toISOString()
        }
      ],
      totalItems: 1,
      processing: 0,
      completed: 1,
      failed: 0,
      pending: 0,
      cancelled: 0,
      lastUpdated: new Date().toISOString()
    };

    mockUseDownloadQueue.mockReturnValue({
      data: completedQueue,
      isLoading: false,
      error: null,
      isError: false,
      refetch: vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <DownloadQueue />
      </Wrapper>
    );

    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
  });

  test('should display error details for failed items', () => {
    const failedQueue: QueueStatus = {
      items: [
        {
          id: 'download-1',
          url: 'https://www.youtube.com/watch?v=test1',
          title: 'Failed Video',
          status: 'failed',
          progress: 0,
          currentStep: 'Failed',
          queuedAt: new Date().toISOString(),
          error: 'Video not available'
        }
      ],
      totalItems: 1,
      processing: 0,
      completed: 0,
      failed: 1,
      pending: 0,
      cancelled: 0,
      lastUpdated: new Date().toISOString()
    };

    mockUseDownloadQueue.mockReturnValue({
      data: failedQueue,
      isLoading: false,
      error: null,
      isError: false,
      refetch: vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <DownloadQueue />
      </Wrapper>
    );

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText(/error.*video not available/i)).toBeInTheDocument();
  });

  test('should apply custom className', () => {
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

    mockUseDownloadQueue.mockReturnValue({
      data: emptyQueue,
      isLoading: false,
      error: null,
      isError: false,
      refetch: vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <DownloadQueue className="custom-queue-class" />
      </Wrapper>
    );

    const component = screen.getByTestId('download-queue');
    expect(component).toHaveClass('custom-queue-class');
  });

  test('should invalidate videos query when a download completes', () => {
    const queueBeforeCompletion: QueueStatus = {
      items: [
        {
          id: 'download-1',
          url: 'https://www.youtube.com/watch?v=test1',
          title: 'Processing Video',
          status: 'processing',
          progress: 80,
          currentStep: 'Downloading',
          queuedAt: new Date().toISOString(),
        },
      ],
      totalItems: 1,
      processing: 1,
      completed: 0,
      failed: 0,
      pending: 0,
      cancelled: 0,
      lastUpdated: new Date().toISOString(),
    };

    const queueAfterCompletion: QueueStatus = {
      ...queueBeforeCompletion,
      items: [
        {
          ...queueBeforeCompletion.items[0],
          status: 'completed',
          progress: 100,
          completedAt: new Date().toISOString(),
        },
      ],
      processing: 0,
      completed: 1,
    };

    mockUseDownloadQueue.mockReturnValue({
      data: queueBeforeCompletion,
      isLoading: false,
      error: null,
      isError: false,
      refetch: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { rerender } = render(
      <Wrapper>
        <DownloadQueue />
      </Wrapper>
    );

    mockUseDownloadQueue.mockReturnValue({
      data: queueAfterCompletion,
      isLoading: false,
      error: null,
      isError: false,
      refetch: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    rerender(
      <Wrapper>
        <DownloadQueue />
      </Wrapper>
    );

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['videos'] });
  });

  test('should clear queue when clear button is confirmed', () => {
    const mockClearMutate = vi.fn();
    mockUseClearDownloadQueue.mockReturnValue({
      mutate: mockClearMutate,
      isPending: false,
      isError: false,
      isSuccess: false,
      error: null,
      data: undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const queueWithItems: QueueStatus = {
      items: [
        {
          id: 'download-1',
          url: 'https://www.youtube.com/watch?v=test1',
          title: 'Queued Video',
          status: 'pending',
          progress: 0,
          currentStep: 'Queued',
          queuedAt: new Date().toISOString()
        }
      ],
      totalItems: 1,
      processing: 0,
      completed: 0,
      failed: 0,
      pending: 1,
      cancelled: 0,
      lastUpdated: new Date().toISOString()
    };

    mockUseDownloadQueue.mockReturnValue({
      data: queueWithItems,
      isLoading: false,
      error: null,
      isError: false,
      refetch: vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <DownloadQueue />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('clear-queue-button'));
    expect(mockClearMutate).toHaveBeenCalledTimes(1);
  });
});
