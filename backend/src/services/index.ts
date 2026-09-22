/**
 * Service exports and initialization for YouTube integration
 */
import { YouTubeDownloadService } from '../features/youtube/youTubeDownloadService';
import { YouTubeUrlValidator } from '../features/youtube/youTubeUrlValidator';
import { YouTubeMetadataExtractor } from '../features/youtube/youTubeMetadataExtractor';
import { YouTubeFileDownloader } from '../features/youtube/youTubeFileDownloader';
import { VideoFileManager } from '../features/video-library/videoFileManager';
import { DownloadQueueService } from './downloadQueueService';
import { ThumbnailService } from '../features/video-library/thumbnailService';
import { VideoCleanupService } from './cleanupService';
import { ContentPolicyService } from './contentPolicyService';
import { contentPolicy } from './contentPolicyConfig';
import { config } from '../config';
import { logger } from '../utils/logger';

// Initialize services with configured directories
export const thumbnailService = new ThumbnailService(config.tempDir);
export const contentPolicyService = new ContentPolicyService(contentPolicy);
export const videoFileManager = new VideoFileManager(config.videosDir, config.tempDir);
export const youTubeDownloadService = new YouTubeDownloadService(
  config.tempDir,
  videoFileManager,
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
