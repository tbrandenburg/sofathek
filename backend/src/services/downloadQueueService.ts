import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { getErrorMessage } from '../utils/error';
import { DownloadRequest, QueueItem, QueueStatus } from '../types/youtube';
import { YouTubeDownloadService } from './youTubeDownloadService';
import { loadQueue, saveQueue } from './queuePersistence';
import { processQueue } from './queueScheduler';

interface CancelResult {
  success: boolean;
  reason?: 'not_found' | 'already_completed' | 'already_cancelled' | 'error';
}

interface ClearQueueResult {
  removedCount: number;
  cancelledProcessingCount: number;
}

/**
 * Queue management for YouTube download operations
 */
export class DownloadQueueService {
  private readonly queueFilePath: string;
  private readonly youtubeDownloadService: YouTubeDownloadService;
  private queue: QueueItem[] = [];
  private isProcessing = false;

  constructor(
    tempDirectory: string,
    youtubeDownloadService: YouTubeDownloadService
  ) {
    this.queueFilePath = path.join(tempDirectory, 'download-queue.json');
    this.youtubeDownloadService = youtubeDownloadService;
  }

  /**
   * Initialize queue service by loading existing queue
   */
  async initialize(): Promise<void> {
    try {
      await this.loadQueue();
      logger.info('Download queue service initialized', {
        queueSize: this.queue.length
      });
    } catch (error) {
      logger.warn('Failed to load existing queue, starting fresh', {
        error: getErrorMessage(error)
      });
      this.queue = [];
    }
  }

  /**
   * Add download request to queue
   */
  async addToQueue(request: DownloadRequest): Promise<QueueItem> {
    try {
      const queueItem: QueueItem = {
        id: uuidv4(),
        request,
        status: 'pending',
        progress: 0,
        currentStep: 'Queued for processing',
        queuedAt: new Date()
      };

      this.queue.push(queueItem);
      await this.saveQueue();

      logger.info('Added item to download queue', {
        queueItemId: queueItem.id,
        url: request.url,
        queueSize: this.queue.length
      });

      // Start processing if not already running
      if (!this.isProcessing) {
        this.runQueueProcessor().catch(error => {
          logger.error('Queue processing error', {
        error: getErrorMessage(error)
          });
        });
      }

      return queueItem;

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error('Failed to add item to queue', {
        url: request.url,
        error: errorMessage
      });
      throw new AppError(`Failed to add to queue: ${errorMessage}`, 500);
    }
  }

  /**
   * Get current queue status
   */
  getQueueStatus(): QueueStatus {
    const totalItems = this.queue.length;
    const processing = this.queue.filter(item => item.status === 'processing').length;
    const completed = this.queue.filter(item => item.status === 'completed').length;
    const failed = this.queue.filter(item => item.status === 'failed').length;
    const cancelled = this.queue.filter(item => item.status === 'cancelled').length;
    const pending = this.queue.filter(item => item.status === 'pending').length;

    return {
      totalItems,
      processing,
      completed,
      failed,
      cancelled,
      pending,
      items: [...this.queue], // Return copy to prevent mutation
      lastUpdated: new Date()
    };
  }

  /**
   * Cancel download by queue item ID
   */
  async cancelDownload(queueItemId: string): Promise<CancelResult> {
    try {
      const itemIndex = this.queue.findIndex(item => item.id === queueItemId);
      
      if (itemIndex === -1) {
        logger.warn('Queue item not found for cancellation', { queueItemId });
        return { success: false, reason: 'not_found' };
      }

      const item = this.queue[itemIndex];
      
      if (!item) {
        logger.warn('Queue item is undefined', { queueItemId, itemIndex });
        return { success: false, reason: 'not_found' };
      }
      
      if (item.status === 'completed') {
        logger.warn('Cannot cancel completed download', { queueItemId, status: item.status });
        return { success: false, reason: 'already_completed' };
      }

      if (item.status === 'cancelled') {
        logger.info('Download already cancelled', { queueItemId, status: item.status });
        return { success: true, reason: 'already_cancelled' };
      }

      // Allow cancellation of 'pending' and 'processing' items
      if (item.status !== 'pending' && item.status !== 'processing') {
        logger.warn('Cannot cancel download with status', { queueItemId, status: item.status });
        return { success: false, reason: 'error' };
      }

      // Update item status
      item.status = 'cancelled';
      item.completedAt = new Date();
      item.error = 'Cancelled by user';

      // Clean up any temp files if download was already completed before cancel was processed
      if (item.result?.videoPath) {
        try {
          await fs.unlink(item.result.videoPath);
          logger.info('Cleaned up video file for cancelled download', {
            queueItemId,
            videoPath: item.result.videoPath
          });
        } catch (error) {
          logger.warn('Failed to clean up video file for cancelled download', {
            queueItemId,
            error: getErrorMessage(error)
          });
        }
      }

      await this.saveQueue();

      logger.info('Download cancelled', { queueItemId });
      return { success: true };

    } catch (error) {
      logger.error('Failed to cancel download', {
        queueItemId,
        error: getErrorMessage(error)
      });
      return { success: false, reason: 'error' };
    }
  }

  private async runQueueProcessor(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    
    try {
      await processQueue(this.queue, this.youtubeDownloadService, () => this.saveQueue());

    } catch (error) {
      logger.error('Queue processing failed', {
        error: getErrorMessage(error)
      });
    } finally {
      this.isProcessing = false;
      logger.info('Queue processing stopped');
    }
  }

  /**
   * Load queue from persistent storage
   */
  private async loadQueue(): Promise<void> {
    this.queue = await loadQueue(this.queueFilePath);
  }

  /**
   * Save queue to persistent storage
   */
  private async saveQueue(): Promise<void> {
    await saveQueue(this.queueFilePath, this.queue);
  }

  /**
   * Clean up old completed/failed items from queue
   */
  async cleanupOldItems(maxAgeHours: number = 24): Promise<number> {
    try {
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
      const initialCount = this.queue.length;
      
      this.queue = this.queue.filter(item => {
        const shouldKeep = item.status === 'pending' || 
                          item.status === 'processing' ||
                          !item.completedAt ||
                          item.completedAt.getTime() > cutoffTime;
        return shouldKeep;
      });

      const cleanedCount = initialCount - this.queue.length;
      
      if (cleanedCount > 0) {
        await this.saveQueue();
        logger.info('Cleaned up old queue items', { 
          cleanedCount, 
          remainingCount: this.queue.length,
          maxAgeHours 
        });
      }

      return cleanedCount;

    } catch (error) {
      logger.error('Failed to cleanup old queue items', {
        error: getErrorMessage(error)
      });
      return 0;
    }
  }

  /**
   * Clear all queue items and cancel any active downloads.
   */
  async clearQueue(): Promise<ClearQueueResult> {
    const snapshot = [...this.queue];
    let cancelledProcessingCount = 0;

    for (const item of snapshot) {
      if (item.status === 'processing') {
        try {
          await this.youtubeDownloadService.cancelDownload(item.id);
          cancelledProcessingCount += 1;
        } catch (error) {
          logger.warn('Failed to cancel active download while clearing queue', {
            queueItemId: item.id,
            error: getErrorMessage(error)
          });
        }
      }

      if (item.result?.videoPath) {
        try {
          await fs.unlink(item.result.videoPath);
        } catch (error) {
          logger.warn('Failed to remove queue item file while clearing queue', {
            queueItemId: item.id,
            error: getErrorMessage(error)
          });
        }
      }
    }

    this.queue = [];
    await this.saveQueue();

    logger.info('Queue cleared', {
      removedCount: snapshot.length,
      cancelledProcessingCount
    });

    return {
      removedCount: snapshot.length,
      cancelledProcessingCount
    };
  }
}
