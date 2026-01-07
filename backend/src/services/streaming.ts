import { Request, Response } from 'express';
import fs from 'fs-extra';
import path from 'path';
import mime from 'mime-types';

export interface StreamOptions {
  videoPath: string;
  contentType?: string;
  cacheControl?: string;
}

export class VideoStreamingService {
  private static readonly CHUNK_SIZE = 10 ** 6; // 1MB chunks
  private static readonly MAX_AGE = 31536000; // 1 year cache

  /**
   * Stream video with HTTP range support for progressive loading
   */
  static async streamVideo(
    req: Request,
    res: Response,
    options: StreamOptions
  ): Promise<void> {
    const { videoPath, contentType, cacheControl } = options;

    try {
      // Check if file exists
      if (!(await fs.pathExists(videoPath))) {
        res.status(404).json({
          error: 'Video not found',
          message: 'The requested video file does not exist',
        });
        return;
      }

      // Get file stats
      const stats = await fs.stat(videoPath);
      const fileSize = stats.size;
      const fileName = path.basename(videoPath);
      const fileExtension = path.extname(videoPath).toLowerCase();

      // Determine content type
      const mimeType =
        contentType || mime.lookup(fileExtension) || 'application/octet-stream';

      // Parse Range header
      const range = req.headers.range;

      if (!range) {
        // No range requested - send entire file
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
          'Cache-Control': cacheControl || `public, max-age=${this.MAX_AGE}`,
          'Content-Disposition': `inline; filename="${fileName}"`,
        });

        const stream = fs.createReadStream(videoPath);
        stream.pipe(res);
        return;
      }

      // Parse range header (e.g., "bytes=0-1023")
      const rangeMatch = range.match(/bytes=(\d+)-(\d*)/);
      if (!rangeMatch) {
        res.status(416).json({
          error: 'Invalid Range',
          message: 'Malformed Range header',
        });
        return;
      }

      const start = parseInt(rangeMatch[1], 10);
      const end = rangeMatch[2]
        ? parseInt(rangeMatch[2], 10)
        : Math.min(start + this.CHUNK_SIZE - 1, fileSize - 1);

      // Validate range
      if (start >= fileSize || end >= fileSize || start > end) {
        res.status(416).json({
          error: 'Range Not Satisfiable',
          message: `Requested range not satisfiable. File size: ${fileSize}`,
        });
        return;
      }

      const contentLength = end - start + 1;

      // Send partial content response (206)
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': contentLength,
        'Content-Type': mimeType,
        'Cache-Control': cacheControl || `public, max-age=${this.MAX_AGE}`,
        'Content-Disposition': `inline; filename="${fileName}"`,
      });

      // Create read stream for the requested range
      const stream = fs.createReadStream(videoPath, { start, end });

      // Handle stream errors
      stream.on('error', error => {
        console.error('Stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Streaming Error',
            message: 'Failed to stream video content',
          });
        }
      });

      // Pipe the stream to response
      stream.pipe(res);
    } catch (error) {
      console.error('Video streaming error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to process video streaming request',
        });
      }
    }
  }

  /**
   * Stream thumbnail image
   */
  static async streamThumbnail(
    req: Request,
    res: Response,
    thumbnailPath: string
  ): Promise<void> {
    try {
      // Check if thumbnail exists
      if (!(await fs.pathExists(thumbnailPath))) {
        res.status(404).json({
          error: 'Thumbnail not found',
          message: 'The requested thumbnail does not exist',
        });
        return;
      }

      // Get file stats
      const stats = await fs.stat(thumbnailPath);
      const fileSize = stats.size;
      const fileName = path.basename(thumbnailPath);
      const fileExtension = path.extname(thumbnailPath).toLowerCase();

      // Determine content type
      const mimeType = mime.lookup(fileExtension) || 'image/jpeg';

      // Set response headers for image
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Cache-Control': `public, max-age=${this.MAX_AGE}`,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Last-Modified': stats.mtime.toUTCString(),
        ETag: `"${stats.mtime.getTime()}-${fileSize}"`,
      });

      // Create and pipe read stream
      const stream = fs.createReadStream(thumbnailPath);

      stream.on('error', error => {
        console.error('Thumbnail stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Streaming Error',
            message: 'Failed to stream thumbnail',
          });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error('Thumbnail streaming error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to process thumbnail request',
        });
      }
    }
  }

  /**
   * Get video file info for streaming
   */
  static async getVideoInfo(videoPath: string): Promise<{
    exists: boolean;
    size?: number;
    mimeType?: string;
    lastModified?: Date;
  }> {
    try {
      if (!(await fs.pathExists(videoPath))) {
        return { exists: false };
      }

      const stats = await fs.stat(videoPath);
      const fileExtension = path.extname(videoPath).toLowerCase();
      const mimeType = mime.lookup(fileExtension) || 'application/octet-stream';

      return {
        exists: true,
        size: stats.size,
        mimeType,
        lastModified: stats.mtime,
      };
    } catch (error) {
      console.error('Error getting video info:', error);
      return { exists: false };
    }
  }

  /**
   * Validate video format for streaming
   */
  static isStreamableFormat(filePath: string): boolean {
    const extension = path.extname(filePath).toLowerCase();
    const streamableFormats = ['.mp4', '.webm', '.ogg', '.m4v'];
    return streamableFormats.includes(extension);
  }

  /**
   * Get optimal streaming quality based on file size and client capabilities
   */
  static getOptimalQuality(
    fileSize: number,
    userAgent?: string
  ): {
    quality: 'high' | 'medium' | 'low';
    chunkSize: number;
  } {
    // Simple heuristic based on file size
    if (fileSize > 500 * 1024 * 1024) {
      // 500MB+
      return { quality: 'high', chunkSize: 2 * 1024 * 1024 }; // 2MB chunks
    } else if (fileSize > 100 * 1024 * 1024) {
      // 100MB+
      return { quality: 'medium', chunkSize: 1 * 1024 * 1024 }; // 1MB chunks
    } else {
      return { quality: 'low', chunkSize: 512 * 1024 }; // 512KB chunks
    }
  }
}

// Export singleton for convenience
export const streamingService = VideoStreamingService;
