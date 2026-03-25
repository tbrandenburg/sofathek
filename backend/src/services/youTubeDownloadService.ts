import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/error';
import { DownloadRequest, DownloadResult } from '../types/youtube';
import { ThumbnailService } from './thumbnailService';
import { YouTubeUrlValidator } from './youTubeUrlValidator';
import { YouTubeMetadataExtractor } from './youTubeMetadataExtractor';
import { YouTubeFileDownloader } from './youTubeFileDownloader';
import { VideoFileManager } from './videoFileManager';

/**
 * Core YouTube download orchestrator using composed services
 */
export class YouTubeDownloadService {
  private readonly urlValidator: YouTubeUrlValidator;
  private readonly metadataExtractor: YouTubeMetadataExtractor;
  private readonly fileDownloader: YouTubeFileDownloader;
  private readonly fileManager: VideoFileManager;
  private readonly thumbnailService: ThumbnailService;

  constructor(
    videosDirectory: string, 
    tempDirectory: string,
    thumbnailService: ThumbnailService
  ) {
    this.urlValidator = new YouTubeUrlValidator();
    this.metadataExtractor = new YouTubeMetadataExtractor();
    this.fileDownloader = new YouTubeFileDownloader(tempDirectory);
    this.fileManager = new VideoFileManager(videosDirectory, tempDirectory);
    this.thumbnailService = thumbnailService;
  }

  async downloadVideo(request: DownloadRequest): Promise<DownloadResult> {
    const startedAt = new Date();
    const downloadId = uuidv4();

    try {
      logger.info('Starting YouTube video download', {
        downloadId,
        url: request.url,
        requestId: request.requestId
      });

      if (!await this.urlValidator.validate(request.url)) {
        throw new Error('Invalid video URL format');
      }

      await this.fileManager.ensureDirectoriesExist();

      const metadata = await this.metadataExtractor.extract(request.url);
      logger.info('Retrieved video metadata', {
        downloadId,
        videoId: metadata.id,
        title: metadata.title,
        duration: metadata.duration
      });

      const tempVideoPath = await this.fileDownloader.download(request.url, metadata, downloadId);
      logger.info('Video downloaded to temp location', {
        downloadId,
        tempPath: tempVideoPath
      });

      let thumbnailPath: string | undefined;
      try {
        thumbnailPath = await this.thumbnailService.generateThumbnail(tempVideoPath);
        logger.info('Thumbnail generated successfully', { 
          downloadId,
          thumbnailPath 
        });
      } catch (error) {
        logger.warn('Thumbnail generation failed, continuing without thumbnail', {
          downloadId,
          videoPath: tempVideoPath,
          error: getErrorMessage(error)
        });
        thumbnailPath = undefined;
      }

      const finalVideoPath = await this.fileManager.moveToLibrary(tempVideoPath, metadata);
      logger.info('Video moved to library', {
        downloadId,
        finalPath: finalVideoPath
      });

      const result: DownloadResult = {
        id: downloadId,
        status: 'success',
        metadata,
        videoPath: finalVideoPath,
        ...(thumbnailPath && { thumbnailPath }),
        completedAt: new Date(),
        startedAt
      };

      logger.info('YouTube download completed successfully', {
        downloadId,
        videoPath: finalVideoPath,
        duration: Date.now() - startedAt.getTime()
      });

      return result;

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error('YouTube download failed', {
        downloadId,
        url: request.url,
        error: errorMessage,
        duration: Date.now() - startedAt.getTime()
      });

      return {
        id: downloadId,
        status: 'error',
        error: errorMessage,
        completedAt: new Date(),
        startedAt
      };
    }
  }

  async cancelDownload(downloadId: string): Promise<void> {
    await this.fileDownloader.cancelDownload(downloadId);
  }

  async validateYouTubeUrl(url: string): Promise<boolean> {
    return this.urlValidator.validate(url);
  }

  async cleanupFailedDownload(videoId: string): Promise<void> {
    return this.fileManager.cleanupFailedDownload(videoId);
  }
}
