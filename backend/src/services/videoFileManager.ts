import * as path from 'path';
import { getErrorMessage } from '../utils/error';
import * as fs from 'fs/promises';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { YouTubeMetadata } from '../types/youtube';

export class VideoFileManager {
  private readonly videosDirectory: string;
  private readonly tempDirectory: string;

  constructor(videosDirectory: string, tempDirectory: string) {
    this.videosDirectory = videosDirectory;
    this.tempDirectory = tempDirectory;
  }

  async moveToLibrary(tempPath: string, metadata: YouTubeMetadata): Promise<string> {
    try {
      const extension = path.extname(tempPath);
      const safeTitle = this.createSafeFilename(metadata.title);
      const finalFilename = `${safeTitle}-${metadata.id}${extension}`;
      const finalPath = path.join(this.videosDirectory, finalFilename);

      await fs.mkdir(this.videosDirectory, { recursive: true });
      await fs.rename(tempPath, finalPath);

      logger.info('Video moved to library', {
        tempPath,
        finalPath,
        videoId: metadata.id
      });

      return finalPath;

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error('Failed to move video to library', { 
        tempPath, 
        error: errorMessage 
      });
      throw new AppError(`Failed to move video to library: ${errorMessage}`, 500);
    }
  }

  async ensureDirectoriesExist(): Promise<void> {
    try {
      await fs.access(this.videosDirectory);
    } catch {
      await fs.mkdir(this.videosDirectory, { recursive: true });
      logger.info('Created videos directory', { path: this.videosDirectory });
    }

    try {
      await fs.access(this.tempDirectory);
    } catch {
      await fs.mkdir(this.tempDirectory, { recursive: true });
      logger.info('Created temp directory', { path: this.tempDirectory });
    }
  }

  async cleanupFailedDownload(videoId: string): Promise<void> {
    try {
      const tempFiles = await fs.readdir(this.tempDirectory);
      const filesToCleanup = tempFiles.filter(file => file.includes(videoId));

      for (const file of filesToCleanup) {
        const filePath = path.join(this.tempDirectory, file);
        await fs.unlink(filePath);
        logger.info('Cleaned up failed download file', { filePath });
      }
    } catch (error) {
      logger.warn('Failed to cleanup failed download files', {
        videoId,
        error: getErrorMessage(error)
      });
    }
  }

  private createSafeFilename(title: string): string {
    return title
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 200)
      .trim();
  }
}