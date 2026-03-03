import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  downloadVideo, 
  getDownloadQueue, 
  getDownloadStatus, 
  cancelDownload 
} from '../services/youtube';
import { DownloadRequest, QueueStatus, QueueItem } from '../types/youtube';

/**
 * Hook for downloading YouTube videos with optimistic updates
 */
export function useYouTubeDownload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: downloadVideo,
    
    // Optimistic update on mutation start
    onMutate: async (newRequest: DownloadRequest) => {
      // Cancel any outgoing refetches for the queue
      await queryClient.cancelQueries({ queryKey: ['youtube', 'queue'] });

      // Snapshot the previous queue state
      const previousQueue = queryClient.getQueryData<QueueStatus>(['youtube', 'queue']);

      // Optimistically add the new item to the queue
      if (previousQueue) {
        const optimisticItem: QueueItem = {
          id: `temp-${Date.now()}`, // Temporary ID
          url: newRequest.url,
          title: newRequest.title || 'YouTube Video',
          status: 'pending',
          progress: 0,
          currentStep: 'Queued',
          queuedAt: new Date().toISOString(),
        };

        queryClient.setQueryData<QueueStatus>(['youtube', 'queue'], {
          ...previousQueue,
          totalItems: previousQueue.totalItems + 1,
          pending: previousQueue.pending + 1,
          items: [...previousQueue.items, optimisticItem],
          lastUpdated: new Date().toISOString(),
        });
      }

      // Return context for onError and onSettled
      return { previousQueue, newRequest };
    },

    // Rollback optimistic update on error
    onError: (error, variables, context) => {
      if (context?.previousQueue) {
        queryClient.setQueryData(['youtube', 'queue'], context.previousQueue);
      }
    },

    // Invalidate queries after success or error
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['youtube', 'queue'] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
  });
}

/**
 * Hook for fetching YouTube download queue with real-time polling
 */
export function useDownloadQueue() {
  return useQuery({
    queryKey: ['youtube', 'queue'],
    queryFn: getDownloadQueue,
    refetchInterval: 3000, // Poll every 3 seconds for real-time updates
    staleTime: 1000, // Consider data stale after 1 second
    gcTime: 10000, // Keep in cache for 10 seconds
    retry: 2, // Retry failed requests twice
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
  });
}

/**
 * Hook for fetching download status of a specific item
 */
export function useDownloadStatus(itemId?: string) {
  return useQuery({
    queryKey: ['youtube', 'status', itemId],
    queryFn: () => getDownloadStatus(itemId!),
    enabled: !!itemId, // Only run query if itemId is provided
    refetchInterval: (query) => {
      // Only poll if item is still processing
      const data = query?.state?.data;
      return data?.status === 'processing' || data?.status === 'pending' ? 2000 : false;
    },
    staleTime: 1000,
    retry: 2,
  });
}

/**
 * Hook for cancelling downloads with optimistic updates
 */
export function useCancelDownload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelDownload,
    
    // Optimistic update on mutation start
    onMutate: async (itemId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['youtube', 'queue'] });
      await queryClient.cancelQueries({ queryKey: ['youtube', 'status', itemId] });

      // Snapshot the previous queue state
      const previousQueue = queryClient.getQueryData<QueueStatus>(['youtube', 'queue']);

      // Optimistically update the item status to cancelled
      if (previousQueue) {
        const updatedItems = previousQueue.items.map(item =>
          item.id === itemId
            ? { ...item, status: 'cancelled' as const, currentStep: 'Cancelled' }
            : item
        );

        // Recalculate status counts
        const statusCounts = updatedItems.reduce(
          (acc, item) => {
            acc[item.status]++;
            return acc;
          },
          { pending: 0, processing: 0, completed: 0, failed: 0, cancelled: 0 }
        );

        queryClient.setQueryData<QueueStatus>(['youtube', 'queue'], {
          ...previousQueue,
          ...statusCounts,
          items: updatedItems,
          lastUpdated: new Date().toISOString(),
        });
      }

      return { previousQueue, itemId };
    },

    // Rollback optimistic update on error
    onError: (error, itemId, context) => {
      if (context?.previousQueue) {
        queryClient.setQueryData(['youtube', 'queue'], context.previousQueue);
      }
    },

    // Invalidate queries after completion
    onSettled: (data, error, itemId) => {
      queryClient.invalidateQueries({ queryKey: ['youtube', 'queue'] });
      queryClient.invalidateQueries({ queryKey: ['youtube', 'status', itemId] });
    },
  });
}

/**
 * Hook for queue statistics
 */
export function useQueueStats() {
  const { data: queue, isLoading } = useDownloadQueue();

  if (isLoading || !queue) {
    return {
      totalItems: 0,
      processing: 0,
      pending: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      isLoading: true,
    };
  }

  return {
    totalItems: queue.totalItems,
    processing: queue.processing,
    pending: queue.pending,
    completed: queue.completed,
    failed: queue.failed,
    cancelled: queue.cancelled,
    isLoading: false,
  };
}

/**
 * Hook for clearing completed/failed items from queue
 */
export function useClearQueue() {
  const queryClient = useQueryClient();
  const cancelMutation = useCancelDownload();

  const clearCompleted = () => {
    const queue = queryClient.getQueryData<QueueStatus>(['youtube', 'queue']);
    if (!queue) return;

    // Cancel all completed and failed items
    const itemsToCancel = queue.items.filter(
      item => item.status === 'completed' || item.status === 'failed'
    );

    itemsToCancel.forEach(item => {
      cancelMutation.mutate(item.id);
    });
  };

  const clearAll = () => {
    const queue = queryClient.getQueryData<QueueStatus>(['youtube', 'queue']);
    if (!queue) return;

    // Cancel all items except currently processing
    const itemsToCancel = queue.items.filter(
      item => item.status !== 'processing'
    );

    itemsToCancel.forEach(item => {
      cancelMutation.mutate(item.id);
    });
  };

  return {
    clearCompleted,
    clearAll,
    isClearing: cancelMutation.isPending,
  };
}