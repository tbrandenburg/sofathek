import execa from 'execa';
import { getErrorMessage } from '../utils/error';
import * as path from 'path';
import * as fs from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

// Import static binary for reliable FFmpeg path
import ffmpegBin from 'ffmpeg-static';

/** Cached in-flight resolution promise — collapses concurrent callers onto one probe */
let resolutionPromise: Promise<string> | null = null;

/**
 * Resolve an executable ffmpeg binary path.
 * Priority: ffmpeg-static path (if executable) → 'ffmpeg' on PATH → '/usr/bin/ffmpeg'
 * Throws AppError if none is found.
 */
async function resolveFfmpegBinary(): Promise<string> {
  const candidates = [ffmpegBin, 'ffmpeg', '/usr/bin/ffmpeg'].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      if (path.isAbsolute(candidate)) {
        // For absolute paths, check execute permission directly
        await fs.access(candidate, fsConstants.X_OK);
        return candidate;
      }
      // For bare names (e.g. 'ffmpeg'), confirm it resolves on PATH by probing with -version
      await execa(candidate, ['-version'], { timeout: 5000 });
      return candidate;
    } catch {
      // Try next candidate
    }
  }

  throw new AppError(
    'FFmpeg binary not found. Ensure ffmpeg-static installed correctly or system ffmpeg is available.',
    500
  );
}

async function getFfmpegBin(): Promise<string> {
  if (!resolutionPromise) {
    resolutionPromise = resolveFfmpegBinary().then(binPath => {
      logger.info('FFmpeg binary resolved', { path: binPath });
      return binPath;
    });
  }
  return resolutionPromise;
}

/**
 * Thumbnail generation service using ffmpeg directly via execa.
 * Thumbnails are written alongside the source video file (same directory).
 */
export class ThumbnailService {
  private readonly tempDirectory: string;

  constructor(tempDirectory: string) {
    this.tempDirectory = tempDirectory;
  }

  /**
   * Generate thumbnail from video file.
   * The thumbnail is placed in the same directory as the video.
   */
  async generateThumbnail(videoPath: string): Promise<string> {
    try {
      await this.ensureDirectoriesExist();

      const videoDir = path.dirname(videoPath);
      const videoBasename = path.basename(videoPath, path.extname(videoPath));
      const thumbnailFilename = `${videoBasename}.jpg`;
      const thumbnailPath = path.join(videoDir, thumbnailFilename);

      logger.info('Generating thumbnail', { videoPath, thumbnailPath });

      const ffmpeg = await getFfmpegBin();
      await execa(ffmpeg, [
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
   * Check if thumbnail already exists for video (looks in same directory as video)
   */
  async thumbnailExists(videoPath: string): Promise<boolean> {
    try {
      const videoDir = path.dirname(videoPath);
      const videoBasename = path.basename(videoPath, path.extname(videoPath));
      const thumbnailPath = path.join(videoDir, `${videoBasename}.jpg`);
      await fs.access(thumbnailPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get thumbnail path for video (without generating).
   * Returns the path in the same directory as the video.
   */
  getThumbnailPath(videoPath: string): string {
    const videoDir = path.dirname(videoPath);
    const videoBasename = path.basename(videoPath, path.extname(videoPath));
    return path.join(videoDir, `${videoBasename}.jpg`);
  }

  /**
   * Ensure required directories exist
   */
  private async ensureDirectoriesExist(): Promise<void> {
    await fs.mkdir(this.tempDirectory, { recursive: true });
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
