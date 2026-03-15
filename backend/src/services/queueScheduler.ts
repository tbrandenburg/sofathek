import { QueueItem } from '../types/youtube';
import { logger } from '../utils/logger';
import { YouTubeDownloadService } from './youTubeDownloadService';

type SaveQueueFn = () => Promise<void>;

export async function processQueue(
  queue: QueueItem[],
  youtubeDownloadService: YouTubeDownloadService,
  saveQueue: SaveQueueFn
): Promise<void> {
  logger.info('Starting queue processing', { queueSize: queue.length });

  while (true) {
    const nextItem = queue.find(item => item.status === 'pending');

    if (!nextItem) {
      logger.info('No pending items in queue, stopping processing');
      break;
    }

    await processQueueItem(nextItem, youtubeDownloadService, saveQueue);
  }
}

export async function processQueueItem(
  item: QueueItem,
  youtubeDownloadService: YouTubeDownloadService,
  saveQueue: SaveQueueFn
): Promise<void> {
  try {
    logger.info('Processing queue item', {
      queueItemId: item.id,
      url: item.request.url
    });

    item.status = 'processing';
    item.startedAt = new Date();
    item.progress = 0;
    item.currentStep = 'Starting download';
    await saveQueue();

    item.progress = 25;
    item.currentStep = 'Fetching video metadata';
    await saveQueue();

    const result = await youtubeDownloadService.downloadVideo(item.request);

    if (result.status === 'success') {
      item.status = 'completed';
      item.progress = 100;
      item.currentStep = 'Download completed';
      item.result = result;
      item.completedAt = new Date();

      logger.info('Queue item completed successfully', {
        queueItemId: item.id,
        videoPath: result.videoPath
      });
    } else {
      item.status = 'failed';
      item.error = result.error || 'Download failed';
      item.completedAt = new Date();

      logger.error('Queue item failed', {
        queueItemId: item.id,
        error: item.error
      });
    }

    await saveQueue();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    item.status = 'failed';
    item.error = errorMessage;
    item.completedAt = new Date();

    await saveQueue();

    logger.error('Queue item processing failed', {
      queueItemId: item.id,
      error: errorMessage
    });
  }
}
