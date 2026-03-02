/**
 * Service exports and initialization for YouTube integration
 */
import { YouTubeDownloadService } from './youTubeDownloadService';
import { DownloadQueueService } from './downloadQueueService';
import { ThumbnailService } from './thumbnailService';
import { logger } from '../utils/logger';
import * as path from 'path';

// Environment-based configuration
const VIDEOS_DIR = process.env.VIDEOS_DIR || path.join(process.cwd(), 'data', 'videos');
const TEMP_DIR = process.env.TEMP_DIR || path.join(process.cwd(), 'data', 'temp');
const THUMBNAILS_DIR = path.join(TEMP_DIR, 'thumbnails');

// Initialize services with configured directories
export const thumbnailService = new ThumbnailService(TEMP_DIR, THUMBNAILS_DIR);
export const youTubeDownloadService = new YouTubeDownloadService(VIDEOS_DIR, TEMP_DIR, thumbnailService);
export const downloadQueueService = new DownloadQueueService(TEMP_DIR, youTubeDownloadService);

// Initialize queue service
downloadQueueService.initialize().catch(error => {
  logger.error('Failed to initialize download queue service:', error);
});

// Export service classes for testing and custom initialization
export { YouTubeDownloadService, DownloadQueueService, ThumbnailService };