import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { 
  VideoFile, 
  VideoMetadata, 
  Video, 
  VideoScanResult,
  SUPPORTED_VIDEO_EXTENSIONS,
  SupportedVideoExtension
} from '../types/video';

/**
 * Video service for file system operations and metadata extraction
 */
export class VideoService {
  private readonly videosDirectory: string;

  constructor(videosDirectory: string) {
    this.videosDirectory = videosDirectory;
  }

  /**
   * Scan the videos directory for video files
   */
  async scanVideoDirectory(): Promise<VideoScanResult> {
    const errors: string[] = [];
    const videos: Video[] = [];
    let totalSize = 0;

    try {
      // Ensure directory exists
      await this.ensureDirectoryExists();

      // Read directory contents
      const files = await fs.readdir(this.videosDirectory);

      // Process each file
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
          const metadata = await this.extractMetadata(videoFile);
          const video = this.createVideo(videoFile, metadata);

          videos.push(video);
          totalSize += videoFile.size;

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Error processing ${filename}: ${errorMessage}`);
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
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
    stats: any
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
   * Extract metadata from video file
   * For Phase 1, we'll use basic filename-based metadata
   * Future phases can integrate ffprobe for detailed video analysis
   */
  private async extractMetadata(videoFile: VideoFile): Promise<VideoMetadata> {
    const nameWithoutExt = path.basename(videoFile.name, path.extname(videoFile.name));
    
    const title = nameWithoutExt
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase())
      .trim();

    // Check for existing thumbnail (jpg, jpeg, png, webp)
    const thumbnail = await this.findThumbnail(videoFile.path);

    return {
      title,
      format: videoFile.extension.toUpperCase(),
      ...(thumbnail && { thumbnail })
    };
  }

  /**
   * Look for thumbnail file matching the video filename
   * Checks for: video-name.jpg, video-name.jpeg, video-name.png, video-name.webp
   */
  private async findThumbnail(videoPath: string): Promise<string | null> {
    const videoDir = path.dirname(videoPath);
    const baseName = path.basename(videoPath, path.extname(videoPath));
    const extensions = ['.jpg', '.jpeg', '.png', '.webp'];
    
    for (const ext of extensions) {
      const thumbPath = path.join(videoDir, baseName + ext);
      try {
        await fs.access(thumbPath);
        // Return just the filename for the metadata
        return baseName + ext;
      } catch {
        // Thumbnail doesn't exist, try next extension
      }
    }
    
    return null;
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
 * Default video service instance
 * Uses environment variable or default path
 */
export const videoService = new VideoService(
  process.env.VIDEOS_DIR || path.join(process.cwd(), 'data', 'videos')
);