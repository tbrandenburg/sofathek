/**
 * Service exports and initialization for YouTube integration
 */
import { YouTubeDownloadService } from './youTubeDownloadService';
import { YouTubeUrlValidator } from './youTubeUrlValidator';
import { YouTubeMetadataExtractor } from './youTubeMetadataExtractor';
import { YouTubeFileDownloader } from './youTubeFileDownloader';
import { VideoFileManager } from './videoFileManager';
import { DownloadQueueService } from './downloadQueueService';
import { ThumbnailService } from './thumbnailService';
import { VideoCleanupService } from './cleanupService';
import { ContentPolicyService } from './contentPolicyService';
import { contentPolicy } from './contentPolicyConfig';
import { config } from '../config';
import { logger } from '../utils/logger';

// Initialize services with configured directories
export const thumbnailService = new ThumbnailService(config.tempDir);
export const contentPolicyService = new ContentPolicyService(contentPolicy);
export const youTubeDownloadService = new YouTubeDownloadService(
  config.videosDir,
  config.tempDir,
  thumbnailService,
  contentPolicyService
);
export const videoCleanupService = new VideoCleanupService(config.videosDir, config.videoMaxAgeDays);
export const downloadQueueService = new DownloadQueueService(config.tempDir, youTubeDownloadService, videoCleanupService);

// Initialize queue service
downloadQueueService.initialize().catch(error => {
  logger.error('Failed to initialize download queue service:', error);
});

// Export service classes for testing and custom initialization
export { 
  YouTubeDownloadService, 
  YouTubeUrlValidator,
  YouTubeMetadataExtractor,
  YouTubeFileDownloader,
  VideoFileManager,
  DownloadQueueService, 
  ThumbnailService,
  VideoCleanupService,
  ContentPolicyService
};
