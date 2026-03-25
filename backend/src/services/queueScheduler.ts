import * as fs from 'fs/promises';
import { QueueItem } from '../types/youtube';
import { getErrorMessage } from '../utils/error';
import { logger } from '../utils/logger';
import { YouTubeDownloadService } from './youTubeDownloadService';

type SaveQueueFn = () => Promise<void>;

async function cleanupDownloadedFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
    logger.info('Cleaned up cancelled download file', { filePath });
  } catch (error) {
    logger.warn('Failed to clean up cancelled download file', {
      filePath,
      error: getErrorMessage(error)
    });
  }
}

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
    if (item.status === 'cancelled') {
      logger.info('Queue item was cancelled before processing started', {
        queueItemId: item.id
      });
      return;
    }

    logger.info('Processing queue item', {
      queueItemId: item.id,
      url: item.request.url
    });

    item.status = 'processing';
    item.startedAt = new Date();
    item.progress = 0;
    item.currentStep = 'Starting download';
    await saveQueue();

    if ((item as QueueItem).status === 'cancelled') {
      logger.info('Queue item cancelled during processing', {
        queueItemId: item.id
      });
      await youtubeDownloadService.cancelDownload(item.id);
      return;
    }

    item.progress = 25;
    item.currentStep = 'Fetching video metadata';
    await saveQueue();

    if ((item as QueueItem).status === 'cancelled') {
      logger.info('Queue item cancelled during metadata fetch', {
        queueItemId: item.id
      });
      await youtubeDownloadService.cancelDownload(item.id);
      return;
    }

    const result = await youtubeDownloadService.downloadVideo(item.request);

    if ((item as QueueItem).status === 'cancelled') {
      logger.info('Queue item cancelled during download, cleaning up', {
        queueItemId: item.id
      });
      await youtubeDownloadService.cancelDownload(item.id);
      if (result.videoPath) {
        await cleanupDownloadedFile(result.videoPath);
      }
      return;
    }

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
    const errorMessage = getErrorMessage(error);

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
