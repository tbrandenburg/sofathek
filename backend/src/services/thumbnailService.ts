import execa from 'execa';
import { getErrorMessage } from '../utils/error';
import * as path from 'path';
import * as fs from 'fs/promises';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

// Import static binary for reliable FFmpeg path
import ffmpegBin from 'ffmpeg-static';

const FFMPEG_BIN = ffmpegBin || 'ffmpeg';

/**
 * Thumbnail generation service using ffmpeg directly via execa
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
      await this.ensureDirectoriesExist();

      const videoBasename = path.basename(videoPath, path.extname(videoPath));
      const thumbnailFilename = `${videoBasename}.jpg`;
      const thumbnailPath = path.join(this.thumbnailsDirectory, thumbnailFilename);

      logger.info('Generating thumbnail', { videoPath, thumbnailPath });

      await execa(FFMPEG_BIN, [
        '-y',
        '-ss', '00:00:01.000',
        '-i', videoPath,
        '-vframes', '1',
        '-q:v', '2',
        '-vf', 'scale=320:240',
        thumbnailPath,
      ]);

      await fs.access(thumbnailPath);
      logger.info('Thumbnail generated successfully', { thumbnailPath });
      return thumbnailPath;

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error('Thumbnail generation failed', { videoPath, error: errorMessage });

      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to generate thumbnail: ${errorMessage}`, 500);
    }
  }

  /**
   * Generate thumbnail with progress tracking (simplified — no progress for single-frame extraction)
   */
  async generateThumbnailWithProgress(
    videoPath: string,
    progressCallback?: (progress: number) => void
  ): Promise<string> {
    // Single-frame extraction has no meaningful progress; report 50% then 100%
    if (progressCallback) progressCallback(50);
    const result = await this.generateThumbnail(videoPath);
    if (progressCallback) progressCallback(100);
    return result;
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
    await fs.mkdir(this.tempDirectory, { recursive: true });
    await fs.mkdir(this.thumbnailsDirectory, { recursive: true });
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
          logger.warn('Failed to clean up temp file', { filename, error: getErrorMessage(error) });
        }
      }

      logger.info('Thumbnail temp cleanup completed', { cleanedCount, maxAgeHours });
      return cleanedCount;
    } catch (error) {
      logger.error('Failed to cleanup thumbnail temp files', { error: getErrorMessage(error) });
      return 0;
    }
  }
}
