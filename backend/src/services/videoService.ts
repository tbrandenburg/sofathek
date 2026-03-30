import { promises as fs, Stats } from 'fs';
import { getErrorMessage } from '../utils/error';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ThumbnailService } from './thumbnailService';
import { 
  VideoFile, 
  VideoMetadata, 
  Video, 
  VideoScanResult,
  TranscriptFile,
  VideoInfoFile,
  SUPPORTED_VIDEO_EXTENSIONS,
  SupportedVideoExtension
} from '../types/video';

/**
 * Video service for file system operations and metadata extraction
 */
export class VideoService {
  private readonly videosDirectory: string;
  private thumbnailCache: Map<string, { files: string[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000;
  private readonly THUMBNAIL_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
  private readonly AUDIO_EXTENSIONS = ['.mp3'];
  private readonly TRANSCRIPT_EXTENSION = '.srt';
  private readonly INFO_EXTENSION = '.info.json';

  private readonly pendingRegeneration = new Set<string>();
  private isRegenerating = false;
  private readonly thumbnailService: ThumbnailService | null;

  constructor(videosDirectory: string, thumbnailService?: ThumbnailService) {
    this.videosDirectory = videosDirectory;
    this.thumbnailService = thumbnailService ?? null;
  }

  private scheduleRegeneration(videoPath: string): void {
    if (!this.thumbnailService) return;
    if (this.pendingRegeneration.has(videoPath)) return;
    const wasEmpty = this.pendingRegeneration.size === 0;
    this.pendingRegeneration.add(videoPath);
    // Only schedule a drain callback when the queue transitions from empty to non-empty.
    // This avoids N callbacks for N videos and ensures paths added during an active drain
    // are processed in the same run (the while loop below re-checks the set).
    if (wasEmpty) {
      setImmediate(() => this.drainRegenerationQueue().catch(err =>
        logger.error('Unexpected drain failure', { error: getErrorMessage(err) })
      ));
    }
  }

  private async drainRegenerationQueue(): Promise<void> {
    if (!this.thumbnailService) return;
    // Guards against concurrent invocations from rapid back-to-back scans
    if (this.isRegenerating) return;
    this.isRegenerating = true;
    try {
      while (this.pendingRegeneration.size > 0) {
        for (const videoPath of this.pendingRegeneration) {
          this.pendingRegeneration.delete(videoPath);
          try {
            await this.thumbnailService.generateThumbnail(videoPath);
            const videoDir = path.dirname(videoPath);
            this.thumbnailCache.delete(videoDir);
            logger.info('Auto-regenerated missing thumbnail', { videoPath });
          } catch (err) {
            logger.warn('Auto-regeneration failed, skipping', { videoPath, error: getErrorMessage(err) });
          }
        }
      }
    } finally {
      this.isRegenerating = false;
    }
  }

  /**
   * Scan the videos directory for video files
   */
  async scanVideoDirectory(): Promise<VideoScanResult> {
    const errors: string[] = [];
    const videos: Video[] = [];
    let totalSize = 0;
    const videoFiles: VideoFile[] = [];

    try {
      // Ensure directory exists
      await this.ensureDirectoryExists();

      // Read directory contents
      const files = await fs.readdir(this.videosDirectory);

      // First pass: collect all video files
      for (const filename of files) {
        try {
          const filePath = path.join(this.videosDirectory, filename);
          const stats = await fs.stat(filePath);

          // Skip directories and non-video files
          if (stats.isDirectory()) {
            continue;
          }

          if (!this.isVideoFile(filename)) {
            continue;
          }

          // Create video file info
          const videoFile = await this.createVideoFile(filePath, filename, stats);
          videoFiles.push(videoFile);

        } catch (error) {
          const errorMessage = getErrorMessage(error);
          errors.push(`Error processing ${filename}: ${errorMessage}`);
        }
      }

      // Second pass: resolve thumbnails in batches per directory
      const thumbnailMap = await this.findThumbnailsBatch(videoFiles);

      // Third pass: create videos with metadata
      for (const videoFile of videoFiles) {
        const thumbnail = thumbnailMap.get(videoFile.path);
        const metadata = await this.extractMetadata(videoFile, thumbnail);
        const video = this.createVideo(videoFile, metadata);

        videos.push(video);
        totalSize += videoFile.size;

        if (!thumbnail && this.thumbnailService) {
          this.scheduleRegeneration(videoFile.path);
        }
      }

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      errors.push(`Error reading directory: ${errorMessage}`);
    }

    return {
      videos,
      totalCount: videos.length,
      totalSize,
      scannedAt: new Date(),
      ...(errors.length > 0 && { errors })
    };
  }

  /**
   * Get metadata for a specific video file
   */
  async getVideoMetadata(filename: string): Promise<VideoMetadata | null> {
    try {
      const filePath = path.join(this.videosDirectory, filename);
      const stats = await fs.stat(filePath);

      if (!stats.isFile() || !this.isVideoFile(filename)) {
        return null;
      }

      const videoFile = await this.createVideoFile(filePath, filename, stats);
      return await this.extractMetadata(videoFile);

    } catch (error) {
      logger.error(`Error getting metadata for ${filename}:`, error);
      return null;
    }
  }

  /**
   * Validate if a file is a supported video format
   */
  validateVideoFile(filename: string): boolean {
    return this.isVideoFile(filename);
  }

  /**
   * Get video file path for streaming
   */
  getVideoFilePath(filename: string): string {
    return path.join(this.videosDirectory, filename);
  }

  /**
   * Check if directory exists, create if it doesn't
   */
  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.access(this.videosDirectory);
    } catch {
      await fs.mkdir(this.videosDirectory, { recursive: true });
    }
  }

  /**
   * Check if file has a supported video extension
   */
  private isVideoFile(filename: string): boolean {
    const extension = path.extname(filename).toLowerCase().slice(1);
    return SUPPORTED_VIDEO_EXTENSIONS.includes(extension as SupportedVideoExtension);
  }

  /**
   * Create VideoFile object from file system data
   */
  private async createVideoFile(
    filePath: string, 
    filename: string, 
    stats: Stats
  ): Promise<VideoFile> {
    return {
      path: filePath,
      name: filename,
      size: stats.size,
      extension: path.extname(filename).toLowerCase().slice(1),
      lastModified: stats.mtime
    };
  }

  /**
   * Extract metadata from video file.
   * Prefers rich data from .info.json sidecar when present; falls back to filename-based metadata.
   */
  private async extractMetadata(videoFile: VideoFile, existingThumbnail?: string | null): Promise<VideoMetadata> {
    const nameWithoutExt = path.basename(videoFile.name, path.extname(videoFile.name));
    
    const title = nameWithoutExt
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ' ')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase())
      .replace(/\s+/g, ' ')
      .trim();

    // Try to read info sidecar for rich metadata
    const infoSidecar = await this.readInfoSidecar(videoFile.path);

    // Check for existing thumbnail (jpg, jpeg, png, webp); fall back to sidecar-recorded path.
    // path.basename() strips any accidental path traversal from the sidecar value.
    const filesystemThumbnail = await this.findThumbnail(videoFile.path);
    const sidecarThumbnail = infoSidecar?.localThumbnail
      ? path.basename(infoSidecar.localThumbnail) || null
      : null;
    const thumbnail = existingThumbnail !== undefined
      ? existingThumbnail
      : filesystemThumbnail ?? sidecarThumbnail;
    const audio = await this.findAudio(videoFile.path);
    const transcripts = await this.findTranscripts(videoFile.path);

    return {
      title: infoSidecar?.title ?? title,
      ...(infoSidecar?.duration !== undefined && { duration: infoSidecar.duration }),
      ...(infoSidecar?.width !== undefined && { width: infoSidecar.width }),
      ...(infoSidecar?.height !== undefined && { height: infoSidecar.height }),
      format: infoSidecar?.resolution ?? videoFile.extension.toUpperCase(),
      ...(infoSidecar?.tbr !== undefined && { bitrate: infoSidecar.tbr }),
      ...(thumbnail && { thumbnail }),
      ...(audio && { audio }),
      ...(transcripts.length > 0 && { transcripts })
    };
  }

  private async readInfoSidecar(videoPath: string): Promise<VideoInfoFile | null> {
    const videoDir = path.dirname(videoPath);
    const baseName = path.basename(videoPath, path.extname(videoPath));
    const infoPath = path.join(videoDir, `${baseName}${this.INFO_EXTENSION}`);

    try {
      const content = await fs.readFile(infoPath, 'utf-8');
      return JSON.parse(content) as VideoInfoFile;
    } catch (error) {
      if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      logger.warn('Failed to read info sidecar', { infoPath, error: getErrorMessage(error) });
      return null;
    }
  }

  private async findAudio(videoPath: string): Promise<string | null> {
    const videoDir = path.dirname(videoPath);
    const baseName = path.basename(videoPath, path.extname(videoPath));

    for (const ext of this.AUDIO_EXTENSIONS) {
      const audioPath = path.join(videoDir, `${baseName}${ext}`);
      try {
        await fs.access(audioPath);
        return `${baseName}${ext}`;
      } catch {
        // Try next supported audio extension
      }
    }

    return null;
  }

  private async findTranscripts(videoPath: string): Promise<TranscriptFile[]> {
    const videoDir = path.dirname(videoPath);
    const baseName = path.basename(videoPath, path.extname(videoPath));

    try {
      const files = await fs.readdir(videoDir);
      const transcripts = files
        .filter(file => file.startsWith(`${baseName}.`) && file.endsWith(this.TRANSCRIPT_EXTENSION))
        .map(file => ({
          language: this.parseTranscriptLanguage(file, baseName),
          file
        }))
        .sort((a, b) => a.language.localeCompare(b.language));

      return transcripts;
    } catch {
      return [];
    }
  }

  private parseTranscriptLanguage(filename: string, baseName: string): string {
    const suffix = filename.substring(baseName.length + 1, filename.length - this.TRANSCRIPT_EXTENSION.length);
    if (!suffix) {
      return 'unknown';
    }
    const languageToken = suffix.split('.')[0];
    return languageToken || 'unknown';
  }

  /**
   * Look for thumbnail file matching the video filename
   * Checks for: video-name.jpg, video-name.jpeg, video-name.png, video-name.webp
   * First attempts exact case match, then falls back to case-insensitive search
   */
  private async findThumbnail(videoPath: string): Promise<string | null> {
    const videoDir = path.dirname(videoPath);
    const baseName = path.basename(videoPath, path.extname(videoPath));

    return this.findThumbnailInDirectory(videoDir, baseName);
  }

  private async findThumbnailInDirectory(directory: string, baseName: string): Promise<string | null> {
    for (const ext of this.THUMBNAIL_EXTENSIONS) {
      const exactThumbPath = path.join(directory, baseName + ext);
      try {
        await fs.access(exactThumbPath);
        return baseName + ext;
      } catch {
        // Exact match failed, continue to case-insensitive fallback
      }
    }

    try {
      const files = await fs.readdir(directory);
      const lowerBaseName = baseName.toLowerCase();

      for (const ext of this.THUMBNAIL_EXTENSIONS) {
        const targetFilename = lowerBaseName + ext;
        const match = files.find(file => file.toLowerCase() === targetFilename);
        if (match) {
          return match;
        }
      }
    } catch {
      // Directory read failed, return null
    }
    
    return null;
  }

  private groupVideosByDirectory(videos: VideoFile[]): Map<string, VideoFile[]> {
    const groups = new Map<string, VideoFile[]>();

    for (const video of videos) {
      const dir = path.dirname(video.path);
      if (!groups.has(dir)) {
        groups.set(dir, []);
      }
      groups.get(dir)!.push(video);
    }

    return groups;
  }

  private isImageFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return this.THUMBNAIL_EXTENSIONS.includes(ext);
  }

  private async getOrScanDirectory(dir: string): Promise<string[]> {
    const cached = this.thumbnailCache.get(dir);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      return cached.files;
    }

    try {
      const files = await fs.readdir(dir);
      this.thumbnailCache.set(dir, { files, timestamp: now });
      return files;
    } catch {
      return [];
    }
  }

  async findThumbnailsBatch(videos: VideoFile[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    const dirGroups = this.groupVideosByDirectory(videos);

    for (const [dir, videoFiles] of dirGroups) {
      const files = await this.getOrScanDirectory(dir);
      const fileSet = new Set(files.filter(file => this.isImageFile(file)));

      for (const videoFile of videoFiles) {
        const baseName = path.basename(videoFile.path, path.extname(videoFile.path));

        for (const ext of this.THUMBNAIL_EXTENSIONS) {
          const candidate = baseName + ext;
          if (fileSet.has(candidate)) {
            results.set(videoFile.path, candidate);
            break;
          }
        }
      }
    }

    return results;
  }

  /**
   * Create complete Video object
   */
  private createVideo(videoFile: VideoFile, metadata: VideoMetadata): Video {
    const id = path.basename(videoFile.name, path.extname(videoFile.name));
    
    return {
      id,
      file: videoFile,
      metadata,
      viewCount: 0 // Will be loaded from stats.json in future iterations
    };
  }
}

/**
 * Default video service instance (no ThumbnailService — callers should inject one via constructor).
 * The production API route wires ThumbnailService via routes/api.ts using the shared singleton.
 */
export const videoService = new VideoService(config.videosDir);
