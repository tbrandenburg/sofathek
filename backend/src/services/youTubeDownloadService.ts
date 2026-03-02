import youtubedl from 'youtube-dl-exec';
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { DownloadRequest, DownloadResult, YouTubeMetadata, YOUTUBE_URL_PATTERNS } from '../types/youtube';
import { ThumbnailService } from './thumbnailService';

/**
 * Core YouTube download functionality using yt-dlp
 */
export class YouTubeDownloadService {
  private readonly videosDirectory: string;
  private readonly tempDirectory: string;
  private readonly thumbnailService: ThumbnailService;

  constructor(
    videosDirectory: string, 
    tempDirectory: string,
    thumbnailService: ThumbnailService
  ) {
    this.videosDirectory = videosDirectory;
    this.tempDirectory = tempDirectory;
    this.thumbnailService = thumbnailService;
  }

  /**
   * Download YouTube video with metadata and thumbnail generation
   */
  async downloadVideo(request: DownloadRequest): Promise<DownloadResult> {
    const startedAt = new Date();
    const downloadId = uuidv4();

    try {
      logger.info('Starting YouTube video download', {
        downloadId,
        url: request.url,
        requestId: request.requestId
      });

      // Validate YouTube URL
      if (!await this.validateYouTubeUrl(request.url)) {
        throw new AppError('Invalid YouTube URL format', 400);
      }

      // Ensure directories exist
      await this.ensureDirectoriesExist();

      // Get video metadata first
      const metadata = await this.getVideoMetadata(request.url);
      logger.info('Retrieved video metadata', {
        downloadId,
        videoId: metadata.id,
        title: metadata.title,
        duration: metadata.duration
      });

      // Download video to temp directory
      const tempVideoPath = await this.downloadVideoFile(request.url, metadata);
      logger.info('Video downloaded to temp location', {
        downloadId,
        tempPath: tempVideoPath
      });

      // Generate thumbnail (graceful degradation)
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
          error: error instanceof Error ? error.message : String(error)
        });
        // Don't fail the entire download for thumbnail issues
        thumbnailPath = undefined;
      }

      // Move video to final location
      const finalVideoPath = await this.moveVideoToLibrary(tempVideoPath, metadata);
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
      const errorMessage = error instanceof Error ? error.message : String(error);
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

  /**
   * Validate YouTube URL format
   */
  async validateYouTubeUrl(url: string): Promise<boolean> {
    try {
      // Check against known YouTube URL patterns
      const isValidFormat = YOUTUBE_URL_PATTERNS.some(pattern => pattern.test(url));
      
      if (!isValidFormat) {
        logger.warn('URL does not match YouTube patterns', { url });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('URL validation failed', {
        url,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Get video metadata using yt-dlp
   */
  private async getVideoMetadata(url: string): Promise<YouTubeMetadata> {
    try {
      logger.info('Fetching video metadata', { url });

      const metadata = await youtubedl(url, {
        dumpSingleJson: true,
        noWarnings: true,
        skipDownload: true,
        noCheckCertificates: true
      }) as any; // Type assertion for youtube-dl-exec response

      return {
        id: metadata.id || uuidv4(),
        title: metadata.title || 'Unknown Title',
        description: metadata.description || undefined,
        duration: metadata.duration || undefined,
        uploader: metadata.uploader || metadata.channel || undefined,
        uploadDate: metadata.upload_date || undefined,
        viewCount: metadata.view_count || undefined,
        format: metadata.format || undefined,
        width: metadata.width || undefined,
        height: metadata.height || undefined,
        thumbnailUrl: metadata.thumbnail || undefined
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to get video metadata', { url, error: errorMessage });
      throw new AppError(`Failed to get video metadata: ${errorMessage}`, 500);
    }
  }

  /**
   * Download video file using yt-dlp
   */
  private async downloadVideoFile(url: string, metadata: YouTubeMetadata): Promise<string> {
    try {
      // Create safe filename
      const safeTitle = this.createSafeFilename(metadata.title);
      const outputTemplate = path.join(this.tempDirectory, `${safeTitle}-${metadata.id}.%(ext)s`);

      logger.info('Starting video file download', {
        url,
        outputTemplate,
        videoId: metadata.id
      });

      // Execute download with progress tracking
      const subprocess = youtubedl.exec(url, {
        output: outputTemplate,
        format: 'best[ext=mp4]/best',
        noPlaylist: true,
        restrictFilenames: true,
        noWarnings: true
      });

      // Log download progress
      subprocess.stdout?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('[download]')) {
          logger.debug('Download progress', { 
            videoId: metadata.id,
            progress: output.trim()
          });
        }
      });

      // Wait for download to complete
      await subprocess;

      // Find the downloaded file (yt-dlp determines the actual extension)
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Video file download failed', { url, error: errorMessage });
      throw new AppError(`Failed to download video file: ${errorMessage}`, 500);
    }
  }

  /**
   * Move video from temp to final library location
   */
  private async moveVideoToLibrary(tempPath: string, metadata: YouTubeMetadata): Promise<string> {
    try {
      const extension = path.extname(tempPath);
      const safeTitle = this.createSafeFilename(metadata.title);
      const finalFilename = `${safeTitle}-${metadata.id}${extension}`;
      const finalPath = path.join(this.videosDirectory, finalFilename);

      // Ensure videos directory exists
      await fs.mkdir(this.videosDirectory, { recursive: true });

      // Move file from temp to final location
      await fs.rename(tempPath, finalPath);

      logger.info('Video moved to library', {
        tempPath,
        finalPath,
        videoId: metadata.id
      });

      return finalPath;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to move video to library', { 
        tempPath, 
        error: errorMessage 
      });
      throw new AppError(`Failed to move video to library: ${errorMessage}`, 500);
    }
  }

  /**
   * Create filesystem-safe filename from title
   */
  private createSafeFilename(title: string): string {
    return title
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 200) // Limit length
      .trim();
  }

  /**
   * Ensure required directories exist
   */
  private async ensureDirectoriesExist(): Promise<void> {
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

  /**
   * Clean up failed download files
   */
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
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}