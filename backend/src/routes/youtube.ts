import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { catchAsync, AppError } from '../middleware/errorHandler';
import { downloadQueueService, youTubeDownloadService } from '../services/index';
import { DownloadRequest } from '../types/youtube';

const router = Router();

/**
 * POST /api/youtube/download
 * Add YouTube video to download queue
 */
router.post('/download', catchAsync(async (req: Request, res: Response) => {
  const { url, title } = req.body;
  
  if (!url) {
    throw new AppError('YouTube URL is required', 400);
  }

  logger.info('YouTube download request received', { url, title });

  // Validate URL format
  const isValidUrl = await youTubeDownloadService.validateYouTubeUrl(url);
  if (!isValidUrl) {
    throw new AppError('Invalid YouTube URL format', 400);
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

  logger.info('YouTube video added to download queue', {
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

  const transformedItems = queueStatus.items.map(item => ({
    ...item,
    url: item.request.url,
    title: item.request.title || item.result?.metadata?.title || item.request.url,
    queuedAt: item.queuedAt instanceof Date ? item.queuedAt.toISOString() : item.queuedAt,
    startedAt: item.startedAt instanceof Date ? item.startedAt.toISOString() : item.startedAt,
    completedAt: item.completedAt instanceof Date ? item.completedAt.toISOString() : item.completedAt
  }));

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
  
  const responseData: any = { ...queueItem };
  
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
  
  const cancelled = await downloadQueueService.cancelDownload(id);
  
  if (!cancelled) {
    throw new AppError(`Could not cancel download with ID '${id}'. It may not exist or already be completed.`, 400);
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
 * GET /api/youtube/health
 * Health check endpoint for YouTube integration
 */
router.get('/health', catchAsync(async (_req: Request, res: Response) => {
  logger.info('YouTube service health check');
  
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
