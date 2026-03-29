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

      // Pass 1: download best video+audio merged as MP4 (prefer) or WebM (fallback), plus subtitles
      const videoSubprocess = youtubedl.exec(url, {
        output: outputTemplate,
        format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo[ext=webm]+bestaudio[ext=webm]/best[ext=mp4]/best[ext=webm]',
        mergeOutputFormat: 'mp4/webm',
        writeSub: true,
        writeAutoSub: true,
        subLang: 'sv.*,en.*,de.*',
        convertSubs: 'srt',
        noPlaylist: true,
        restrictFilenames: true,
        noWarnings: true,
        ignoreErrors: true,
        jsRuntimes: 'node'
      });

      const tracker = { subprocess: videoSubprocess, aborted: false };
      if (downloadId) {
        this.activeSubprocesses.set(downloadId, tracker);
      }

      videoSubprocess.stderr?.on('data', (data) => {
        stderrOutput += data.toString();
      });

      videoSubprocess.stdout?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('[download]')) {
          logger.debug('Download progress', { videoId: metadata.id, progress: output.trim() });
        }
      });

      await videoSubprocess;

      // Pass 2: extract audio as MP3 (best audio only, no video stream)
      if (!tracker.aborted) {
        logger.info('Extracting audio track', { url, videoId: metadata.id });
        const audioSubprocess = youtubedl.exec(url, {
          output: outputTemplate,
          format: 'bestaudio',
          extractAudio: true,
          audioFormat: 'mp3',
          noPlaylist: true,
          restrictFilenames: true,
          noWarnings: true,
          ignoreErrors: true,
          jsRuntimes: 'node'
        });

        if (downloadId) {
          tracker.subprocess = audioSubprocess;
        }

        audioSubprocess.stderr?.on('data', (data) => {
          stderrOutput += data.toString();
        });

        await audioSubprocess;
      }

      if (downloadId) {
        this.activeSubprocesses.delete(downloadId);
      }

      const tempFiles = await fs.readdir(this.tempDirectory);
      const prefix = `${safeTitle}-${metadata.id}`;
      const videoExtensions = new Set(['.mp4', '.webm']);
      const downloadedFile = tempFiles.find(
        file => file.startsWith(prefix) && videoExtensions.has(path.extname(file).toLowerCase())
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
