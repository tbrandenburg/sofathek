import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/error';
import { DownloadRequest, DownloadResult, YouTubeMetadata } from '../types/youtube';
import { VideoInfoFile } from '../types/video';
import { ThumbnailService } from './thumbnailService';
import { YouTubeUrlValidator } from './youTubeUrlValidator';
import { YouTubeMetadataExtractor } from './youTubeMetadataExtractor';
import { YouTubeFileDownloader, DownloadProgressCallback } from './youTubeFileDownloader';
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

  async downloadVideo(request: DownloadRequest, cancelKey?: string, progressCallback?: DownloadProgressCallback): Promise<DownloadResult> {
    const startedAt = new Date();
    const downloadId = uuidv4();
    // Use cancelKey as the subprocess identifier when provided so callers
    // can cancel via the same key they pass to cancelDownload()
    const subprocessKey = cancelKey ?? downloadId;

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

      const tempVideoPath = await this.fileDownloader.download(request.url, metadata, subprocessKey, progressCallback);
      logger.info('Video downloaded to temp location', {
        downloadId,
        tempPath: tempVideoPath
      });

      let thumbnailPath: string | undefined;
      const isAudioOnly = path.extname(tempVideoPath).toLowerCase() === '.mp3';
      if (isAudioOnly) {
        logger.info('Skipping thumbnail generation for audio-only file', {
          downloadId,
          tempVideoPath
        });
      } else {
        // Priority 1: Use yt-dlp-written thumbnail if available
        thumbnailPath = await this.findYtDlpThumbnail(tempVideoPath);

        if (thumbnailPath) {
          logger.info('Using yt-dlp thumbnail', {
            downloadId,
            thumbnailPath
          });
        } else {
          // Priority 2: Fallback to ffmpeg generation
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
        }
      }

      const finalVideoPath = await this.fileManager.moveToLibrary(tempVideoPath, metadata);
      logger.info('Video moved to library', {
        downloadId,
        finalPath: finalVideoPath
      });

      // Write sidecar JSON next to video in library (non-critical)
      try {
        await this.writeInfoSidecar(finalVideoPath, metadata, thumbnailPath);
      } catch (error) {
        logger.warn('Info sidecar write failed, continuing', {
          downloadId,
          error: getErrorMessage(error)
        });
      }

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

  private async writeInfoSidecar(videoPath: string, metadata: YouTubeMetadata, thumbnailPath?: string): Promise<void> {
    const extension = path.extname(videoPath);
    const baseName = path.basename(videoPath, extension);
    const infoPath = path.join(path.dirname(videoPath), `${baseName}.info.json`);

    const infoFile: VideoInfoFile = {
      sourceUrl: metadata.webpageUrl ?? '',
      extractor: 'youtube',
      id: metadata.id,
      title: metadata.title,
      downloadedAt: new Date().toISOString(),
      ...(metadata.description !== undefined && { description: metadata.description }),
      ...(metadata.uploader !== undefined && { uploader: metadata.uploader }),
      ...(metadata.uploaderId !== undefined && { uploaderId: metadata.uploaderId }),
      ...(metadata.channelId !== undefined && { channelId: metadata.channelId }),
      ...(metadata.channelUrl !== undefined && { channelUrl: metadata.channelUrl }),
      ...(metadata.channelFollowerCount !== undefined && { channelFollowerCount: metadata.channelFollowerCount }),
      ...(metadata.channelIsVerified !== undefined && { channelIsVerified: metadata.channelIsVerified }),
      ...(metadata.uploadDate !== undefined && { uploadDate: metadata.uploadDate }),
      ...(metadata.timestamp !== undefined && { timestamp: metadata.timestamp }),
      ...(metadata.duration !== undefined && {
        duration: metadata.duration,
        durationString: this.formatDuration(metadata.duration)
      }),
      ...(metadata.width !== undefined && { width: metadata.width }),
      ...(metadata.height !== undefined && { height: metadata.height }),
      ...(metadata.resolution !== undefined && { resolution: metadata.resolution }),
      ...(metadata.fps !== undefined && { fps: metadata.fps }),
      ...(metadata.aspectRatio !== undefined && { aspectRatio: metadata.aspectRatio }),
      ...(metadata.dynamicRange !== undefined && { dynamicRange: metadata.dynamicRange }),
      ...(metadata.vcodec !== undefined && { vcodec: metadata.vcodec }),
      ...(metadata.acodec !== undefined && { acodec: metadata.acodec }),
      ...(metadata.vbr !== undefined && { vbr: metadata.vbr }),
      ...(metadata.abr !== undefined && { abr: metadata.abr }),
      ...(metadata.tbr !== undefined && { tbr: metadata.tbr }),
      ...(metadata.asr !== undefined && { asr: metadata.asr }),
      ...(metadata.audioChannels !== undefined && { audioChannels: metadata.audioChannels }),
      ...(metadata.filesizeApprox !== undefined && { filesizeApprox: metadata.filesizeApprox }),
      ...(metadata.viewCount !== undefined && { viewCount: metadata.viewCount }),
      ...(metadata.likeCount !== undefined && { likeCount: metadata.likeCount }),
      ...(metadata.commentCount !== undefined && { commentCount: metadata.commentCount }),
      ...(metadata.categories !== undefined && { categories: metadata.categories }),
      ...(metadata.tags !== undefined && { tags: metadata.tags }),
      ...(metadata.ageLimit !== undefined && { ageLimit: metadata.ageLimit }),
      ...(metadata.language !== undefined && { language: metadata.language }),
      ...(metadata.availability !== undefined && { availability: metadata.availability }),
      ...(metadata.isLive !== undefined && { isLive: metadata.isLive }),
      ...(metadata.wasLive !== undefined && { wasLive: metadata.wasLive }),
      ...(metadata.liveStatus !== undefined && { liveStatus: metadata.liveStatus }),
      ...(metadata.playableInEmbed !== undefined && { playableInEmbed: metadata.playableInEmbed }),
      ...(thumbnailPath !== undefined && { localThumbnail: path.basename(thumbnailPath) })
    };

    // Atomic write: write to .tmp then rename
    const tempInfoPath = `${infoPath}.tmp`;
    await fs.writeFile(tempInfoPath, JSON.stringify(infoFile, null, 2), 'utf-8');
    await fs.rename(tempInfoPath, infoPath);

    logger.info('Video info sidecar written', { infoPath });
  }

  private formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  /**
   * Find a yt-dlp-written thumbnail in the temp directory.
   * yt-dlp writes thumbnails with the same stem as the video file.
   */
  private async findYtDlpThumbnail(videoPath: string): Promise<string | undefined> {
    const THUMBNAIL_EXTENSIONS = ['.webp', '.jpg', '.jpeg', '.png'];
    const dir = path.dirname(videoPath);
    const stem = path.basename(videoPath, path.extname(videoPath));

    for (const ext of THUMBNAIL_EXTENSIONS) {
      const candidate = path.join(dir, stem + ext);
      try {
        await fs.access(candidate);
        return candidate;
      } catch {
        // Not found, try next extension
      }
    }
    return undefined;
  }
}
