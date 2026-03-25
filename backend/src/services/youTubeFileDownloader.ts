import youtubedl from 'youtube-dl-exec';
import { getErrorMessage } from '../utils/error';
import * as path from 'path';
import * as fs from 'fs/promises';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { YouTubeMetadata } from '../types/youtube';

export class YouTubeFileDownloader {
  private readonly tempDirectory: string;
  private activeSubprocesses: Map<string, { subprocess: ReturnType<typeof youtubedl.exec>, aborted: boolean }> = new Map();

  constructor(tempDirectory: string) {
    this.tempDirectory = tempDirectory;
  }

  async download(url: string, metadata: YouTubeMetadata, downloadId?: string): Promise<string> {
    try {
      const safeTitle = this.createSafeFilename(metadata.title);
      const outputTemplate = path.join(this.tempDirectory, `${safeTitle}-${metadata.id}.%(ext)s`);

      logger.info('Starting video file download', {
        url,
        outputTemplate,
        videoId: metadata.id,
        downloadId
      });

      const subprocess = youtubedl.exec(url, {
        output: outputTemplate,
        format: 'best[ext=mp4]/best',
        noPlaylist: true,
        restrictFilenames: true,
        noWarnings: true,
        jsRuntimes: 'node'
      });

      const tracker = { subprocess, aborted: false };
      if (downloadId) {
        this.activeSubprocesses.set(downloadId, tracker);
      }

      subprocess.stdout?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('[download]')) {
          logger.debug('Download progress', { 
            videoId: metadata.id,
            progress: output.trim()
          });
        }
      });

      await subprocess;

      if (downloadId) {
        this.activeSubprocesses.delete(downloadId);
      }

      const tempFiles = await fs.readdir(this.tempDirectory);
      const downloadedFile = tempFiles.find(file => 
        file.startsWith(`${safeTitle}-${metadata.id}`)
      );

      if (!downloadedFile) {
        throw new AppError('Downloaded video file not found', 500);
      }

      const downloadedPath = path.join(this.tempDirectory, downloadedFile);
      logger.info('Video file download completed', {
        downloadedPath,
        videoId: metadata.id
      });

      return downloadedPath;

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error('Video file download failed', { url, error: errorMessage });
      throw new AppError(`Failed to download video file: ${errorMessage}`, 500);
    }
  }

  async cancelDownload(downloadId: string): Promise<boolean> {
    const tracker = this.activeSubprocesses.get(downloadId);
    if (!tracker || tracker.aborted) {
      return false;
    }

    tracker.aborted = true;
    tracker.subprocess.kill('SIGTERM');
    this.activeSubprocesses.delete(downloadId);

    logger.info('Download cancelled', { downloadId });
    return true;
  }

  private createSafeFilename(title: string): string {
    return title
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 200)
      .trim();
  }
}