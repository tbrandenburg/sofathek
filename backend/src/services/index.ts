/**
 * Service exports and initialization for YouTube integration
 */
import { YouTubeDownloadService } from './youTubeDownloadService';
import { DownloadQueueService } from './downloadQueueService';
import { ThumbnailService } from './thumbnailService';
import { config } from '../config';
import { logger } from '../utils/logger';
import * as path from 'path';

const VIDEOS_DIR = config.videosDir;
const TEMP_DIR = config.tempDir;
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
