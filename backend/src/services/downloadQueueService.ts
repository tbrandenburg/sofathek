import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { DownloadRequest, QueueItem, QueueStatus } from '../types/youtube';
import { YouTubeDownloadService } from './youTubeDownloadService';
import { loadQueue, saveQueue } from './queuePersistence';
import { processQueue } from './queueScheduler';

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
        error: error instanceof Error ? error.message : String(error)
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
            error: error instanceof Error ? error.message : String(error)
          });
        });
      }

      return queueItem;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
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
    const pending = this.queue.filter(item => item.status === 'pending').length;

    return {
      totalItems,
      processing,
      completed,
      failed,
      pending,
      items: [...this.queue], // Return copy to prevent mutation
      lastUpdated: new Date()
    };
  }

  /**
   * Cancel download by queue item ID
   */
  async cancelDownload(queueItemId: string): Promise<boolean> {
    try {
      const itemIndex = this.queue.findIndex(item => item.id === queueItemId);
      
      if (itemIndex === -1) {
        logger.warn('Queue item not found for cancellation', { queueItemId });
        return false;
      }

      const item = this.queue[itemIndex];
      
      if (!item) {
        logger.warn('Queue item is undefined', { queueItemId, itemIndex });
        return false;
      }
      
      if (item.status === 'completed') {
        logger.warn('Cannot cancel completed download', { queueItemId });
        return false;
      }

      // Update item status
      item.status = 'cancelled';
      item.completedAt = new Date();
      item.error = 'Cancelled by user';

      await this.saveQueue();

      logger.info('Download cancelled', { queueItemId });
      return true;

    } catch (error) {
      logger.error('Failed to cancel download', {
        queueItemId,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
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
        error: error instanceof Error ? error.message : String(error)
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
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
    }
  }
}
