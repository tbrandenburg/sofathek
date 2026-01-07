import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { ffmpegService } from './ffmpeg';

export interface VideoFile {
  id: string;
  filePath: string;
  fileName: string;
  category: string;
  metadata?: VideoMetadata;
  metadataPath?: string;
  hasMetadata: boolean;
  dateAdded: Date;
  fileSize: number;
}

export interface VideoMetadata {
  id: string;
  title: string;
  duration: number;
  fileSize: number;
  dateAdded: string;
  resolution: string;
  codec: string;
  bitrate: number;
  category: string;
  source?: string;
  thumbnail: string;
  description?: string;
  tags: string[];
  chapters?: Array<{ title: string; start: number }>;
  subtitles?: string[];
  accessibility: {
    hasClosedCaptions: boolean;
    hasAudioDescription: boolean;
  };
}

export interface ScanResult {
  scanned: number;
  found: number;
  processed: number;
  errors: number;
  newFiles: VideoFile[];
  errorFiles: Array<{ path: string; error: string }>;
}

export class VideoScannerService {
  private mediaBasePath: string;
  private supportedExtensions = [
    '.mp4',
    '.mkv',
    '.avi',
    '.mov',
    '.webm',
    '.m4v',
  ];

  constructor() {
    // Use local data directory within the project
    this.mediaBasePath = path.resolve(__dirname, '..', '..', '..', 'data');
  }

  /**
   * Ensure directory structure exists
   */
  private async ensureDirectoryStructure(): Promise<void> {
    const directories = [
      'videos/movies',
      'videos/tv-shows',
      'videos/documentaries',
      'videos/family',
      'videos/youtube',
      'thumbnails',
      'profiles',
      'temp',
    ];

    for (const dir of directories) {
      await fs.ensureDir(path.join(this.mediaBasePath, dir));
    }
  }

  /**
   * Scan all video directories for files
   */
  async scanAllDirectories(): Promise<ScanResult> {
    const videosPath = path.join(this.mediaBasePath, 'videos');
    const result: ScanResult = {
      scanned: 0,
      found: 0,
      processed: 0,
      errors: 0,
      newFiles: [],
      errorFiles: [],
    };

    try {
      await fs.ensureDir(videosPath);

      // Get all video files recursively
      const pattern = `**/*{${this.supportedExtensions.join(',')}}`;
      const videoFiles = await glob(pattern, {
        cwd: videosPath,
        absolute: true,
        nocase: true,
      });

      result.scanned = videoFiles.length;

      for (const filePath of videoFiles) {
        try {
          const videoFile = await this.processVideoFile(filePath);
          result.newFiles.push(videoFile);
          result.processed++;

          // Auto-generate metadata if missing
          if (!videoFile.hasMetadata) {
            await this.generateMetadata(videoFile);
            result.found++;
          }
        } catch (error) {
          console.error(`Error processing ${filePath}:`, error);
          result.errorFiles.push({
            path: filePath,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          result.errors++;
        }
      }

      console.log(
        `Scan completed: ${result.processed}/${result.scanned} files processed`
      );
      return result;
    } catch (error) {
      console.error('Error scanning directories:', error);
      throw new Error(`Failed to scan video directories: ${error}`);
    }
  }

  /**
   * Scan specific category directory
   */
  async scanCategory(category: string): Promise<ScanResult> {
    const categoryPath = path.join(this.mediaBasePath, 'videos', category);
    const result: ScanResult = {
      scanned: 0,
      found: 0,
      processed: 0,
      errors: 0,
      newFiles: [],
      errorFiles: [],
    };

    try {
      if (!(await fs.pathExists(categoryPath))) {
        console.log(`Category directory does not exist: ${categoryPath}`);
        return result;
      }

      const pattern = `*{${this.supportedExtensions.join(',')}}`;
      const videoFiles = await glob(pattern, {
        cwd: categoryPath,
        absolute: true,
        nocase: true,
      });

      result.scanned = videoFiles.length;

      for (const filePath of videoFiles) {
        try {
          const videoFile = await this.processVideoFile(filePath);
          result.newFiles.push(videoFile);
          result.processed++;

          if (!videoFile.hasMetadata) {
            await this.generateMetadata(videoFile);
            result.found++;
          }
        } catch (error) {
          console.error(`Error processing ${filePath}:`, error);
          result.errorFiles.push({
            path: filePath,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          result.errors++;
        }
      }

      return result;
    } catch (error) {
      console.error(`Error scanning category ${category}:`, error);
      throw new Error(`Failed to scan category ${category}: ${error}`);
    }
  }

  /**
   * Process a single video file
   */
  private async processVideoFile(filePath: string): Promise<VideoFile> {
    const stats = await fs.stat(filePath);
    const fileName = path.basename(filePath);
    const category = this.extractCategory(filePath);
    const id = this.generateVideoId(filePath);

    // Check for existing metadata
    const metadataPath = this.getMetadataPath(filePath);
    const hasMetadata = await fs.pathExists(metadataPath);

    let metadata: VideoMetadata | undefined;
    if (hasMetadata) {
      try {
        metadata = await fs.readJson(metadataPath);
      } catch (error) {
        console.warn(`Failed to read metadata for ${filePath}:`, error);
      }
    }

    return {
      id,
      filePath,
      fileName,
      category,
      metadata,
      metadataPath,
      hasMetadata,
      dateAdded: stats.birthtime || stats.mtime,
      fileSize: stats.size,
    };
  }

  /**
   * Generate metadata for a video file
   */
  async generateMetadata(videoFile: VideoFile): Promise<VideoMetadata> {
    try {
      console.log(`Generating metadata for: ${videoFile.fileName}`);

      // Extract technical metadata using FFmpeg
      const ffmpegMetadata = await ffmpegService.extractMetadata(
        videoFile.filePath
      );

      // Generate thumbnail
      const thumbnailDir = path.join(
        this.mediaBasePath,
        'thumbnails',
        videoFile.category
      );
      await fs.ensureDir(thumbnailDir);

      const thumbnailPaths = await ffmpegService.generateThumbnails(
        videoFile.filePath,
        thumbnailDir,
        { format: 'webp', size: '320x180' }
      );

      const metadata: VideoMetadata = {
        id: videoFile.id,
        title: this.extractTitle(videoFile.fileName),
        duration: Math.round(ffmpegMetadata.duration),
        fileSize: videoFile.fileSize,
        dateAdded: videoFile.dateAdded.toISOString(),
        resolution: `${ffmpegMetadata.width}x${ffmpegMetadata.height}`,
        codec: ffmpegMetadata.codec,
        bitrate: ffmpegMetadata.bitrate,
        category: videoFile.category,
        thumbnail: thumbnailPaths[0] ? path.basename(thumbnailPaths[0]) : '',
        description: '',
        tags: this.generateTags(videoFile),
        subtitles: [],
        accessibility: {
          hasClosedCaptions: false,
          hasAudioDescription: false,
        },
      };

      // Save metadata to JSON file
      const metadataPath = this.getMetadataPath(videoFile.filePath);
      await fs.writeJson(metadataPath, metadata, { spaces: 2 });

      console.log(`Metadata generated for: ${videoFile.fileName}`);
      return metadata;
    } catch (error) {
      console.error(
        `Failed to generate metadata for ${videoFile.fileName}:`,
        error
      );
      throw new Error(`Metadata generation failed: ${error}`);
    }
  }

  /**
   * Get metadata file path for a video
   */
  private getMetadataPath(videoPath: string): string {
    const parsed = path.parse(videoPath);
    return path.join(parsed.dir, `${parsed.name}.json`);
  }

  /**
   * Extract category from file path
   */
  private extractCategory(filePath: string): string {
    const videosPath = path.join(this.mediaBasePath, 'videos');
    const relativePath = path.relative(videosPath, filePath);
    const category = relativePath.split(path.sep)[0];
    return category || 'uncategorized';
  }

  /**
   * Generate unique video ID
   */
  private generateVideoId(filePath: string): string {
    const fileName = path.basename(filePath, path.extname(filePath));
    const category = this.extractCategory(filePath);
    const timestamp = Date.now();
    return `${category}_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`.toLowerCase();
  }

  /**
   * Extract title from filename
   */
  private extractTitle(fileName: string): string {
    const nameWithoutExt = path.parse(fileName).name;
    // Remove common patterns like [1080p], (2023), etc.
    const cleaned = nameWithoutExt
      .replace(/\[[^\]]*\]/g, '') // Remove [bracketed] text
      .replace(/\([^)]*\)/g, '') // Remove (parenthesized) text
      .replace(/[-_.]/g, ' ') // Replace separators with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    return cleaned || nameWithoutExt;
  }

  /**
   * Generate tags based on file information
   */
  private generateTags(videoFile: VideoFile): string[] {
    const tags: string[] = [];

    // Category tag
    tags.push(videoFile.category);

    // File type tag
    const ext = path.extname(videoFile.fileName).toLowerCase();
    if (ext) {
      tags.push(ext.substring(1)); // Remove the dot
    }

    // Date-based tag
    const year = videoFile.dateAdded.getFullYear();
    tags.push(year.toString());

    return tags;
  }

  /**
   * Get all available categories
   */
  async getCategories(): Promise<string[]> {
    const videosPath = path.join(this.mediaBasePath, 'videos');

    try {
      await fs.ensureDir(videosPath);
      const items = await fs.readdir(videosPath);
      const categories: string[] = [];

      for (const item of items) {
        const itemPath = path.join(videosPath, item);
        const stat = await fs.stat(itemPath);
        if (stat.isDirectory()) {
          categories.push(item);
        }
      }

      return categories.sort();
    } catch (error) {
      console.error('Error reading categories:', error);
      return [];
    }
  }
}

// Export singleton instance
export const videoScanner = new VideoScannerService();
