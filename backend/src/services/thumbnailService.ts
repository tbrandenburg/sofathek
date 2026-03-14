import { FFmpeggy } from 'ffmpeggy';
import * as path from 'path';
import * as fs from 'fs/promises';
import { config } from '../config';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

// Import static binaries for reliable FFmpeg/FFprobe paths
import ffmpegBin from 'ffmpeg-static';
const ffprobeStatic = require('ffprobe-static');

// Configure FFmpeg binary paths for FFmpeggy using DefaultConfig with static binaries
try {
  if (FFmpeggy.DefaultConfig) {
      FFmpeggy.DefaultConfig = {
        ...FFmpeggy.DefaultConfig,
        ffmpegBin: ffmpegBin || config.ffmpegPath,
        ffprobeBin: ffprobeStatic.path || config.ffprobePath,
      };
    logger.info('FFmpeggy DefaultConfig configured with static binaries', { 
      ffmpegBin: ffmpegBin || 'system fallback', 
      ffprobeBin: ffprobeStatic.path || 'system fallback' 
    });
  } else {
    logger.warn('FFmpeggy.DefaultConfig is not available');
  }
} catch (error) {
  // Fallback for older versions or test environments
  logger.warn('Could not configure FFmpeggy DefaultConfig, using fallback method', {
    error: error instanceof Error ? error.message : String(error)
  });
}

/**
 * Thumbnail generation service using FFmpeggy
 */
export class ThumbnailService {
  private readonly tempDirectory: string;
  private readonly thumbnailsDirectory: string;

  constructor(tempDirectory: string, thumbnailsDirectory: string) {
    this.tempDirectory = tempDirectory;
    this.thumbnailsDirectory = thumbnailsDirectory;
  }

  /**
   * Generate thumbnail from video file
   */
  async generateThumbnail(videoPath: string): Promise<string> {
    try {
      // Ensure directories exist
      await this.ensureDirectoriesExist();

      // Generate unique thumbnail filename
      const videoBasename = path.basename(videoPath, path.extname(videoPath));
      const thumbnailFilename = `${videoBasename}.jpg`;
      const thumbnailPath = path.join(this.thumbnailsDirectory, thumbnailFilename);

      logger.info('Generating thumbnail', {
        videoPath,
        thumbnailPath,
        videoBasename
      });

      // Create FFmpeggy instance with thumbnail extraction options
      const ffmpeggy = new FFmpeggy({
        input: videoPath,
        output: thumbnailPath,
        outputOptions: [
          '-ss', '00:00:01.000',        // Seek to 1 second
          '-vframes', '1',              // Extract 1 frame
          '-q:v', '2',                  // High quality
          '-vf', 'scale=320:240'        // Resize to thumbnail
        ],
        overwriteExisting: true
      });

      // Run FFmpeg thumbnail generation
      await ffmpeggy.run();
      await ffmpeggy.done();

      // Verify thumbnail was created
      try {
        await fs.access(thumbnailPath);
        logger.info('Thumbnail generated successfully', { thumbnailPath });
        return thumbnailPath;
      } catch (error) {
        throw new AppError('Thumbnail file was not created', 500);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Thumbnail generation failed', {
        videoPath,
        error: errorMessage
      });
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(`Failed to generate thumbnail: ${errorMessage}`, 500);
    }
  }

  /**
   * Generate thumbnail with progress tracking
   */
  async generateThumbnailWithProgress(
    videoPath: string,
    progressCallback?: (progress: number) => void
  ): Promise<string> {
    try {
      // Ensure directories exist
      await this.ensureDirectoriesExist();

      // Generate unique thumbnail filename
      const videoBasename = path.basename(videoPath, path.extname(videoPath));
      const thumbnailFilename = `${videoBasename}.jpg`;
      const thumbnailPath = path.join(this.thumbnailsDirectory, thumbnailFilename);

      logger.info('Generating thumbnail with progress tracking', {
        videoPath,
        thumbnailPath
      });

      // Create FFmpeggy instance with progress tracking
      const ffmpeggy = new FFmpeggy({
        input: videoPath,
        output: thumbnailPath,
        outputOptions: [
          '-ss', '00:00:01.000',
          '-vframes', '1',
          '-q:v', '2',
          '-vf', 'scale=320:240'
        ],
        overwriteExisting: true
      });

      // Set up progress tracking
      if (progressCallback) {
        ffmpeggy.on('progress', (progress) => {
          if (progress.percent) {
            progressCallback(Math.round(progress.percent));
          }
        });
      }

      // Set up error handling
      ffmpeggy.on('error', (error) => {
        logger.error('FFmpeg thumbnail error', { error: error.message });
      });

      // Run thumbnail generation
      await ffmpeggy.run();
      await ffmpeggy.done();

      // Verify thumbnail was created
      try {
        await fs.access(thumbnailPath);
        logger.info('Thumbnail with progress generated successfully', { thumbnailPath });
        return thumbnailPath;
      } catch (error) {
        throw new AppError('Thumbnail file was not created', 500);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Thumbnail generation with progress failed', {
        videoPath,
        error: errorMessage
      });
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(`Failed to generate thumbnail: ${errorMessage}`, 500);
    }
  }

  /**
   * Check if thumbnail already exists for video
   */
  async thumbnailExists(videoPath: string): Promise<boolean> {
    try {
      const videoBasename = path.basename(videoPath, path.extname(videoPath));
      const thumbnailPath = path.join(this.thumbnailsDirectory, `${videoBasename}.jpg`);
      
      await fs.access(thumbnailPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get thumbnail path for video (without generating)
   */
  getThumbnailPath(videoPath: string): string {
    const videoBasename = path.basename(videoPath, path.extname(videoPath));
    return path.join(this.thumbnailsDirectory, `${videoBasename}.jpg`);
  }

  /**
   * Ensure required directories exist
   */
  private async ensureDirectoriesExist(): Promise<void> {
    try {
      await fs.access(this.tempDirectory);
    } catch {
      await fs.mkdir(this.tempDirectory, { recursive: true });
      logger.info('Created temp directory', { path: this.tempDirectory });
    }

    try {
      await fs.access(this.thumbnailsDirectory);
    } catch {
      await fs.mkdir(this.thumbnailsDirectory, { recursive: true });
      logger.info('Created thumbnails directory', { path: this.thumbnailsDirectory });
    }
  }

  /**
   * Clean up old temporary thumbnail files
   */
  async cleanupTempFiles(maxAgeHours: number = 24): Promise<number> {
    try {
      const files = await fs.readdir(this.tempDirectory);
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
      let cleanedCount = 0;

      for (const filename of files) {
        try {
          const filePath = path.join(this.tempDirectory, filename);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime.getTime() < cutoffTime) {
            await fs.unlink(filePath);
            cleanedCount++;
            logger.debug('Cleaned up old temp file', { filePath });
          }
        } catch (error) {
          logger.warn('Failed to clean up temp file', { 
            filename, 
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      logger.info('Thumbnail temp cleanup completed', { 
        cleanedCount, 
        maxAgeHours 
      });
      
      return cleanedCount;
    } catch (error) {
      logger.error('Failed to cleanup thumbnail temp files', {
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
    }
  }
}
