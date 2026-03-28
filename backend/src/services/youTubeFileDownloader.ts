import youtubedl from 'youtube-dl-exec';
import { getErrorMessage } from '../utils/error';
import * as path from 'path';
import * as fs from 'fs/promises';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { YouTubeMetadata } from '../types/youtube';
import { parseYtDlpError } from '../utils/ytDlpErrorParser';

export class YouTubeFileDownloader {
  private readonly tempDirectory: string;
  private activeSubprocesses: Map<string, { subprocess: ReturnType<typeof youtubedl.exec>, aborted: boolean }> = new Map();

  constructor(tempDirectory: string) {
    this.tempDirectory = tempDirectory;
  }

  async download(url: string, metadata: YouTubeMetadata, downloadId?: string): Promise<string> {
    let stderrOutput = '';

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
        format: 'bestvideo+bestaudio',
        mergeOutputFormat: 'mp4',
        extractAudio: true,
        audioFormat: 'mp3',
        writeSub: true,
        writeAutoSub: true,
        subLang: 'sv.*,en.*,de.*',
        convertSubs: 'srt',
        noPlaylist: true,
        restrictFilenames: true,
        noWarnings: true,
        jsRuntimes: 'node'
      });

      const tracker = { subprocess, aborted: false };
      if (downloadId) {
        this.activeSubprocesses.set(downloadId, tracker);
      }

      subprocess.stderr?.on('data', (data) => {
        stderrOutput += data.toString();
      });

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
        file.startsWith(`${safeTitle}-${metadata.id}`) && path.extname(file).toLowerCase() === '.mp4'
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
      if (error instanceof AppError) {
        throw error;
      }
      const errorMessage = getErrorMessage(error);
      const stderrMessage = stderrOutput.trim() || ((error as any).stderr as string | undefined)?.trim() || '';
      logger.error('Video file download failed', {
        url,
        error: errorMessage,
        stderr: stderrMessage
      });

      // Parse yt-dlp error for user-friendly message
      const errorInfo = parseYtDlpError(stderrMessage);

      // Log the parsed error type for debugging
      logger.info('Categorized yt-dlp error', { url, errorCode: errorInfo.code });

      throw new AppError(`${errorInfo.message} ${errorInfo.suggestion}`, 500, true, errorInfo.code);
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
