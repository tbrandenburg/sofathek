import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { catchAsync, AppError } from '../middleware/errorHandler';
import { downloadQueueService, youTubeDownloadService } from '../services/index';
import { DownloadRequest } from '../types/youtube';
import { createRateLimiter, rateLimitMiddleware } from '../middleware/rateLimiter';
import { config } from '../config';

const router = Router();

const downloadRateLimiter = createRateLimiter(
  config.rateLimitMaxRequests,
  config.rateLimitWindowMs
);

export { downloadRateLimiter };

/**
 * POST /api/youtube/download
 * Add video to download queue (supports YouTube, Vimeo, Twitter/X, and 1000+ other sites)
 */
router.post('/download', rateLimitMiddleware(downloadRateLimiter), catchAsync(async (req: Request, res: Response) => {
  const { url, title } = req.body;
  
  if (!url) {
    throw new AppError('Video URL is required', 400);
  }

  logger.info('Video download request received', { url, title });

  // Validate URL format
  const isValidUrl = await youTubeDownloadService.validateYouTubeUrl(url);
  if (!isValidUrl) {
    throw new AppError('Invalid video URL format', 400);
  }

  // Create download request
  const downloadRequest: DownloadRequest = {
    url,
    title,
    requestedAt: new Date(),
    requestId: uuidv4()
  };

  // Add to queue
  const queueItem = await downloadQueueService.addToQueue(downloadRequest);

  logger.info('Video added to download queue', {
    queueItemId: queueItem.id,
    url,
    requestId: downloadRequest.requestId
  });

  res.status(201).json({
    status: 'success',
    data: {
      queueItem,
      message: 'Video added to download queue'
    }
  });
}));

/**
 * GET /api/youtube/queue
 * Get current download queue status
 */
router.get('/queue', catchAsync(async (_req: Request, res: Response) => {
  logger.info('Fetching download queue status');
  
  const queueStatus = downloadQueueService.getQueueStatus();

  const transformedItems = queueStatus.items.map(item => {
    const { result, ...rest } = item;
    return {
      ...rest,
      url: item.request.url,
      title: item.request.title || item.result?.metadata?.title || item.request.url,
      queuedAt: item.queuedAt instanceof Date ? item.queuedAt.toISOString() : item.queuedAt,
      startedAt: item.startedAt instanceof Date ? item.startedAt.toISOString() : item.startedAt,
      completedAt: item.completedAt instanceof Date ? item.completedAt.toISOString() : item.completedAt,
      result: result ? {
        id: result.id,
        status: result.status,
        metadata: result.metadata,
        error: result.error,
        completedAt: result.completedAt instanceof Date ? result.completedAt.toISOString() : result.completedAt,
        startedAt: result.startedAt instanceof Date ? result.startedAt.toISOString() : result.startedAt
      } : undefined
    };
  });

  const transformedStatus = {
    ...queueStatus,
    items: transformedItems,
    lastUpdated: queueStatus.lastUpdated instanceof Date ? queueStatus.lastUpdated.toISOString() : queueStatus.lastUpdated
  };
  
  res.json({
    status: 'success',
    data: transformedStatus
  });
}));

/**
 * GET /api/youtube/download/:id/status
 * Get status of specific download by queue item ID
 */
router.get('/download/:id/status', catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!id) {
    throw new AppError('Queue item ID is required', 400);
  }

  logger.info('Fetching download status', { queueItemId: id });
  
  const queueStatus = downloadQueueService.getQueueStatus();
  const queueItem = queueStatus.items.find(item => item.id === id);
  
  if (!queueItem) {
    throw new AppError(`Download with ID '${id}' not found`, 404);
  }
  
  const { result, ...restItem } = queueItem;

  const responseData: typeof restItem & { diagnostics?: any; result?: any } = { ...restItem };

  if (result) {
    responseData.result = {
      id: result.id,
      status: result.status,
      metadata: result.metadata,
      error: result.error,
      completedAt: result.completedAt instanceof Date ? result.completedAt.toISOString() : result.completedAt,
      startedAt: result.startedAt instanceof Date ? result.startedAt.toISOString() : result.startedAt
    };
  }

  // Add diagnostic context for failed downloads
  if (queueItem.status === 'failed' && queueItem.error) {
    responseData.diagnostics = {
      error: queueItem.error,
      failedAt: queueItem.completedAt,
      requestUrl: queueItem.request.url,
      lastKnownStep: queueItem.currentStep
    };
  }
  
  res.json({
    status: 'success',
    data: responseData
  });
}));

/**
 * DELETE /api/youtube/download/:id
 * Cancel download by queue item ID
 */
router.delete('/download/:id', catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!id) {
    throw new AppError('Queue item ID is required', 400);
  }

  logger.info('Cancel download request', { queueItemId: id });
  
  const result = await downloadQueueService.cancelDownload(id);
  
  if (!result.success) {
    // Provide specific error messages based on reason
    if (result.reason === 'not_found') {
      throw new AppError(`Download with ID '${id}' not found in queue.`, 404);
    } else if (result.reason === 'already_completed') {
      throw new AppError(`Cannot cancel download '${id}' - it has already completed.`, 409);
    } else if (result.reason === 'already_cancelled') {
      // Return success instead of error - already cancelled is success
      res.json({
        status: 'success',
        data: {
          message: 'Download was already cancelled',
          queueItemId: id
        }
      });
      return;
    }
    throw new AppError(`Could not cancel download with ID '${id}': ${result.reason}`, 400);
  }
  
  logger.info('Download cancelled successfully', { queueItemId: id });
  
  res.json({
    status: 'success',
    data: {
      message: 'Download cancelled successfully',
      queueItemId: id
    }
  });
}));

/**
 * POST /api/youtube/queue/cleanup
 * Clean up old completed/failed items from queue
 */
router.post('/queue/cleanup', catchAsync(async (req: Request, res: Response) => {
  const { maxAgeHours = 24 } = req.body;
  
  logger.info('Queue cleanup request', { maxAgeHours });
  
  const cleanedCount = await downloadQueueService.cleanupOldItems(maxAgeHours);
  
  res.json({
    status: 'success',
    data: {
      message: `Cleaned up ${cleanedCount} old queue items`,
      cleanedCount,
      maxAgeHours
    }
  });
}));

/**
 * DELETE /api/youtube/queue
 * Clear all queue items and stop active downloads
 */
router.delete('/queue', catchAsync(async (_req: Request, res: Response) => {
  logger.info('Queue clear request');
  const result = await downloadQueueService.clearQueue();

  res.json({
    status: 'success',
    data: {
      message: `Cleared ${result.removedCount} queue items`,
      removedCount: result.removedCount,
      cancelledProcessingCount: result.cancelledProcessingCount
    }
  });
}));

/**
 * GET /api/youtube/health
 * Health check endpoint for YouTube integration
 */
router.get('/health', catchAsync(async (_req: Request, res: Response) => {
  logger.info('Video download service health check');
  
  // Basic health checks
  const queueStatus = downloadQueueService.getQueueStatus();
  
  const health = {
    service: 'youtube-integration',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    queue: {
      totalItems: queueStatus.totalItems,
      processing: queueStatus.processing,
      pending: queueStatus.pending
    }
  };
  
  res.json({
    status: 'success',
    data: health
  });
}));

export default router;
