import React, { useEffect, useRef } from 'react';
import { getUserFriendlyErrorMessage } from '../lib/error';
import { Card, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { useDownloadQueue, useCancelDownload, useClearDownloadQueue } from '../hooks/useYouTube';
import { useQueryClient } from '@tanstack/react-query';
import { QueueItem } from '../types/youtube';

interface DownloadQueueProps {
  className?: string;
}

interface QueueItemComponentProps {
  item: QueueItem;
  onCancel?: (itemId: string) => void;
  className?: string;
}

function QueueItemComponent({ item, onCancel, className = '' }: QueueItemComponentProps) {
  const cancelMutation = useCancelDownload();

  const handleCancel = () => {
    if (onCancel) {
      onCancel(item.id);
    } else {
      cancelMutation.mutate(item.id);
    }
  };

  const getStatusColor = (status: QueueItem['status']) => {
    switch (status) {
      case 'pending':
        return 'text-gray-600';
      case 'processing':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'cancelled':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusDisplay = (status: QueueItem['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  const canCancel = item.status === 'pending' || item.status === 'processing';

  return (
    <Card className={`queue-item ${className}`} data-testid={`queue-item-${item.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium truncate" title={item.title}>
              {item.title}
            </CardTitle>
            <CardDescription className="mt-1">
              <div className="flex items-center space-x-2 text-xs">
                <span className={`font-medium ${getStatusColor(item.status)}`}>
                  {getStatusDisplay(item.status)}
                </span>
                {item.status === 'processing' && (
                  <>
                    <span>•</span>
                    <span>{item.progress}%</span>
                    {item.currentStep && (
                      <>
                        <span>•</span>
                        <span className="truncate" title={item.currentStep}>
                          {item.currentStep}
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>
              {item.url && (
                <div className="mt-1 text-xs text-muted-foreground truncate" title={item.url}>
                  {item.url}
                </div>
              )}
              {item.error && (
                <div className="mt-1 text-xs text-red-600" title={item.error}>
                  Error: {item.error}
                </div>
              )}
            </CardDescription>
          </div>
          
          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              className="ml-2 flex-shrink-0"
              data-testid={`cancel-button-${item.id}`}
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
            </Button>
          )}
        </div>

        {/* Progress bar for processing items */}
        {item.status === 'processing' && (
          <div className="mt-3">
            <div 
              className="w-full bg-gray-200 rounded-full h-2" 
              role="progressbar"
              aria-valuenow={Math.max(0, Math.min(100, item.progress))}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, item.progress))}%` }}
                data-testid={`progress-bar-${item.id}`}
              />
            </div>
          </div>
        )}
      </CardHeader>
    </Card>
  );
}

export function DownloadQueue({ className = '' }: DownloadQueueProps) {
  const { data: queue, isLoading, error } = useDownloadQueue();
  const clearQueueMutation = useClearDownloadQueue();
  const queryClient = useQueryClient();
  const previousCompletedIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    const completedIds = new Set(
      (queue?.items ?? [])
        .filter((item) => item.status === 'completed')
        .map((item) => item.id)
    );

    if (previousCompletedIdsRef.current === null) {
      previousCompletedIdsRef.current = completedIds;
      return;
    }

    const hasNewlyCompletedItem = [...completedIds].some(
      (id) => !previousCompletedIdsRef.current?.has(id)
    );

    if (hasNewlyCompletedItem) {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    }

    previousCompletedIdsRef.current = completedIds;
  }, [queue, queryClient]);

  const handleClearQueue = () => {
    const hasQueueItems = (queue?.items?.length ?? 0) > 0;
    if (!hasQueueItems) {
      return;
    }

    const confirmed = window.confirm('Clear the full download queue? This will stop active downloads.');
    if (!confirmed) {
      return;
    }

    clearQueueMutation.mutate();
  };

  if (error) {
    return (
      <Card className={`download-queue ${className}`} data-testid="download-queue">
        <CardHeader>
          <CardTitle>Download Queue</CardTitle>
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load download queue: {getUserFriendlyErrorMessage(error)}
            </AlertDescription>
          </Alert>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={`download-queue ${className}`} data-testid="download-queue">
        <CardHeader>
          <CardTitle>Download Queue</CardTitle>
          <CardDescription>Loading queue status...</CardDescription>
        </CardHeader>
        <div className="p-6 pt-0">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded-md"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const hasItems = queue && queue.items && queue.items.length > 0;

  return (
    <Card className={`download-queue ${className}`} data-testid="download-queue">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Download Queue</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearQueue}
            disabled={clearQueueMutation.isPending || !queue || queue.totalItems === 0}
            data-testid="clear-queue-button"
          >
            {clearQueueMutation.isPending ? 'Clearing...' : 'Clear Queue'}
          </Button>
        </div>
        {queue && (
          <CardDescription>
            {queue.totalItems === 0 ? (
              'No downloads in queue'
            ) : (
              <>
                {queue.totalItems} total • {queue.processing} processing • {queue.completed} completed
                {queue.failed > 0 && ` • ${queue.failed} failed`}
                {queue.cancelled > 0 && ` • ${queue.cancelled} cancelled`}
              </>
            )}
          </CardDescription>
        )}
      </CardHeader>

      <div className="p-6 pt-0">
        {!hasItems ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-4">📥</div>
            <div className="text-lg font-medium mb-2">No downloads yet</div>
            <div className="text-sm">
              Enter a YouTube URL above to start downloading videos
            </div>
          </div>
        ) : (
          <div className="space-y-4" data-testid="queue-items">
            {queue?.items?.map((item: QueueItem) => (
              <QueueItemComponent
                key={item.id}
                item={item}
                data-testid={`queue-item-${item.id}`}
              />
            )) || []}
          </div>
        )}
      </div>
    </Card>
  );
}
