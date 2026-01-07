import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs-extra';

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  codec: string;
  bitrate: number;
  fileSize: number;
  format: string;
  fps?: number;
}

export interface ThumbnailOptions {
  timestamps?: string[];
  size?: string;
  format?: 'webp' | 'jpg' | 'png';
  count?: number;
}

export class FFmpegService {
  private tempPath: string;

  constructor() {
    // Use data directory structure we created
    this.tempPath = path.resolve(process.cwd(), '..', 'data', 'temp');

    // Ensure temp directory exists
    this.initializeTempDirectory();
  }

  /**
   * Initialize temporary directory
   */
  private async initializeTempDirectory(): Promise<void> {
    try {
      await fs.ensureDir(this.tempPath);
      console.log(`FFmpeg temp directory: ${this.tempPath}`);
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  }

  /**
   * Extract video metadata using ffprobe
   */
  async extractMetadata(videoPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          console.error('FFprobe error:', err);
          return reject(
            new Error(`Failed to extract metadata: ${err.message}`)
          );
        }

        try {
          const videoStream = metadata.streams.find(
            stream => stream.codec_type === 'video'
          );
          if (!videoStream) {
            throw new Error('No video stream found');
          }

          const result: VideoMetadata = {
            duration: metadata.format.duration || 0,
            width: videoStream.width || 0,
            height: videoStream.height || 0,
            codec: videoStream.codec_name || 'unknown',
            bitrate: parseInt(String(metadata.format.bit_rate || '0')),
            fileSize: parseInt(String(metadata.format.size || '0')),
            format: metadata.format.format_name || 'unknown',
            fps: this.parseFps(videoStream.r_frame_rate),
          };

          resolve(result);
        } catch (parseError) {
          reject(new Error(`Failed to parse metadata: ${parseError}`));
        }
      });
    });
  }

  /**
   * Generate video thumbnail(s)
   */
  async generateThumbnails(
    videoPath: string,
    outputDir: string,
    options: ThumbnailOptions = {}
  ): Promise<string[]> {
    await fs.ensureDir(outputDir);

    const {
      timestamps = ['10%'],
      size = '320x180',
      format = 'webp',
      count = 1,
    } = options;

    const outputPaths: string[] = [];
    const baseFilename = path.parse(videoPath).name;

    return new Promise((resolve, reject) => {
      const command = ffmpeg(videoPath);

      if (timestamps.length === 1 && count === 1) {
        // Single thumbnail
        const outputPath = path.join(outputDir, `${baseFilename}.${format}`);
        outputPaths.push(outputPath);

        command
          .screenshot({
            timestamps: timestamps,
            filename: `${baseFilename}.${format}`,
            folder: outputDir,
            size: size,
          })
          .on('end', () => resolve(outputPaths))
          .on('error', err => {
            console.error('Thumbnail generation error:', err);
            reject(new Error(`Failed to generate thumbnail: ${err.message}`));
          });
      } else {
        // Multiple thumbnails
        const outputPattern = path.join(
          outputDir,
          `${baseFilename}_%i.${format}`
        );

        command
          .screenshot({
            count: count,
            folder: outputDir,
            filename: `${baseFilename}_%i.${format}`,
            size: size,
          })
          .on('end', () => {
            // Generate expected output paths
            for (let i = 1; i <= count; i++) {
              outputPaths.push(
                path.join(outputDir, `${baseFilename}_${i}.${format}`)
              );
            }
            resolve(outputPaths);
          })
          .on('error', err => {
            console.error('Thumbnail generation error:', err);
            reject(new Error(`Failed to generate thumbnails: ${err.message}`));
          });
      }
    });
  }

  /**
   * Convert video to web-optimized format
   */
  async optimizeForWeb(
    inputPath: string,
    outputPath: string,
    options: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: 'high' | 'medium' | 'low';
      fastStart?: boolean;
    } = {}
  ): Promise<void> {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 'medium',
      fastStart = true,
    } = options;

    await fs.ensureDir(path.dirname(outputPath));

    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .format('mp4');

      // Quality settings
      switch (quality) {
        case 'high':
          command = command.videoBitrate('2500k').audioBitrate('128k');
          break;
        case 'low':
          command = command.videoBitrate('800k').audioBitrate('96k');
          break;
        case 'medium':
        default:
          command = command.videoBitrate('1500k').audioBitrate('128k');
          break;
      }

      // Scale video if necessary
      command = command.videoFilter(
        `scale='min(${maxWidth},iw):min(${maxHeight},ih)':force_original_aspect_ratio=decrease`
      );

      // Fast start for web streaming
      if (fastStart) {
        command = command.outputOptions(['-movflags', '+faststart']);
      }

      command
        .output(outputPath)
        .on('start', commandLine => {
          console.log('FFmpeg command:', commandLine);
        })
        .on('progress', progress => {
          console.log(`Processing: ${Math.round(progress.percent || 0)}% done`);
        })
        .on('end', () => {
          console.log('Video optimization completed');
          resolve();
        })
        .on('error', err => {
          console.error('Video optimization error:', err);
          reject(new Error(`Failed to optimize video: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Create video preview (short clip)
   */
  async createPreview(
    inputPath: string,
    outputPath: string,
    options: {
      startTime?: number;
      duration?: number;
      width?: number;
      height?: number;
    } = {}
  ): Promise<void> {
    const {
      startTime = 30,
      duration = 10,
      width = 640,
      height = 360,
    } = options;

    await fs.ensureDir(path.dirname(outputPath));

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(startTime)
        .duration(duration)
        .videoCodec('libx264')
        .audioCodec('aac')
        .size(`${width}x${height}`)
        .format('mp4')
        .outputOptions(['-movflags', '+faststart'])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', err => {
          console.error('Preview creation error:', err);
          reject(new Error(`Failed to create preview: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Parse frame rate from ffprobe output
   */
  private parseFps(frameRate?: string): number | undefined {
    if (!frameRate) return undefined;

    try {
      // Handle formats like "30/1" or "29.97"
      if (frameRate.includes('/')) {
        const [num, den] = frameRate.split('/').map(Number);
        return den ? Math.round((num / den) * 100) / 100 : undefined;
      }
      return parseFloat(frameRate);
    } catch {
      return undefined;
    }
  }

  /**
   * Check if FFmpeg is available
   */
  async checkAvailability(): Promise<boolean> {
    return new Promise(resolve => {
      ffmpeg.getAvailableFormats((err, formats) => {
        if (err) {
          console.error('FFmpeg not available:', err);
          resolve(false);
        } else {
          console.log('FFmpeg is available');
          resolve(true);
        }
      });
    });
  }
}

// Export singleton instance
export const ffmpegService = new FFmpegService();
