import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { VideoService } from '../services/videoService';
import { catchAsync, AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { validateVideoFilename, validateImageFilename, validatePathInDirectory, validateDownloadableFilename } from '../utils/fileValidation';
import youtubeRouter from './youtube';

const router = Router();

// Initialize video service (in production this would come from DI container)
const videosDirectory = config.videosDir;
const videoService = new VideoService(videosDirectory);
const MAX_THUMBNAIL_SIZE = config.thumbnailMaxSize;
const THUMBNAIL_CACHE_DURATION = config.thumbnailCacheDuration;

/**
 * GET /api/videos
 * Returns list of all available videos with metadata
 */
router.get('/videos', catchAsync(async (_req: Request, res: Response) => {
  logger.info('Fetching video list');
  
  const result = await videoService.scanVideoDirectory();
  
  const transformedResult = {
    ...result,
    videos: result.videos.map(video => ({
      ...video,
      file: {
        ...video.file,
        path: `/api/stream/${encodeURIComponent(video.file.name)}`
      }
    }))
  };
  
  res.json({
    status: 'success',
    data: transformedResult
  });
}));

/**
 * GET /api/videos/:id
 * Returns metadata for a specific video by ID
 */
router.get('/videos/:id', catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.info(`Fetching video metadata for: ${id}`);
  
  const result = await videoService.scanVideoDirectory();
  const video = result.videos.find(v => v.id === id);
  
  if (!video) {
    throw new AppError(`Video with id '${id}' not found`, 404);
  }
  
  const transformedVideo = {
    ...video,
    file: {
      ...video.file,
      path: `/api/stream/${encodeURIComponent(video.file.name)}`
    }
  };
  
  res.json({
    status: 'success',
    data: transformedVideo
  });
}));

/**
 * GET /api/stream/:filename
 * Streams video file with HTTP Range request support for efficient video playback
 */
router.get('/stream/:filename', catchAsync(async (req: Request, res: Response) => {
  const { filename } = req.params;
  
  if (!filename) {
    throw new AppError('Filename parameter is required', 400);
  }
  
  // Security: Validate filename to prevent directory traversal and check extension
  validateVideoFilename(filename);
  
  const videoPath = path.join(videosDirectory, filename);
  
  logger.info(`Streaming video: ${filename}`, {
    path: videoPath,
    range: req.headers.range
  });
  
  // Verify file exists and is accessible
  try {
    if (!fs.existsSync(videoPath)) {
      throw new AppError(`Video file '${filename}' not found`, 404);
    }
  } catch (error: unknown) {
    // Re-throw AppErrors as-is
    if (error instanceof AppError) {
      throw error;
    }
    
    const fsError = error as NodeJS.ErrnoException;
    if (fsError.code === 'EACCES' || fsError.code === 'EPERM') {
      throw new AppError('Permission denied accessing video file', 403);
    }
    if (fsError.code === 'ENOENT') {
      throw new AppError(`Video file '${filename}' not found`, 404);
    }
    throw new AppError('Unable to access video file', 500);
  }
  
  // Security: Validate path is within allowed directory (function handles normalization internally)
  const allowedVideosDir = path.resolve(videosDirectory);
  validatePathInDirectory(videoPath, allowedVideosDir);
  
  // Get file stats
  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  
  // Handle range requests for efficient video streaming
  const range = req.headers.range;
  
  if (range) {
    // Parse range header (format: "bytes=start-end")
    const parts = range.replace(/bytes=/, "").split("-");
    const startStr = parts[0];
    const endStr = parts[1];
    
    if (!startStr) {
      throw new AppError('Invalid range header format', 400);
    }
    
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
    
    // Validate range
    if (start >= fileSize || end >= fileSize) {
      throw new AppError('Range not satisfiable', 416);
    }
    
    const chunkSize = (end - start) + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    
    // Set headers for partial content response
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': getVideoMimeType(path.extname(filename))
    });
    
    logger.info(`Serving partial content: ${start}-${end}/${fileSize}`);
    file.pipe(res);
    
  } else {
    // No range request - serve entire file
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Accept-Ranges': 'bytes',
      'Content-Type': getVideoMimeType(path.extname(filename))
    });
    
    logger.info(`Serving full file: ${fileSize} bytes`);
    fs.createReadStream(videoPath).pipe(res);
  }
}));

/**
 * GET /api/download/:filename
 * Download media companion files (video/audio/transcript) as attachments
 */
router.get('/download/:filename', catchAsync(async (req: Request, res: Response) => {
  const { filename } = req.params;

  if (!filename) {
    throw new AppError('Filename parameter is required', 400);
  }

  validateDownloadableFilename(filename);
  const filePath = path.join(videosDirectory, filename);
  const allowedVideosDir = path.resolve(videosDirectory);
  validatePathInDirectory(filePath, allowedVideosDir);

  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
  } catch {
    throw new AppError(`File '${filename}' not found`, 404);
  }

  const extension = path.extname(filename).toLowerCase();
  const contentType = extension === '.mp3' ? 'audio/mpeg'
    : extension === '.srt' ? 'application/x-subrip'
      : getVideoMimeType(extension);

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  fs.createReadStream(filePath).pipe(res);
}));

// Serve thumbnail files from videos directory
router.get('/thumbnails/:filename', catchAsync(async (req: Request, res: Response) => {
  const { filename } = req.params;
  
  if (!filename) {
    throw new AppError('Filename parameter is required', 400);
  }
  
  // Security: Validate filename to prevent directory traversal and check extension
  validateImageFilename(filename);
  
  // Extract extension for MIME type detection
  const ext = path.extname(filename).toLowerCase();
  
  // Check in videos directory only (thumbnails are now always stored alongside videos)
  const thumbnailPath = path.join(videosDirectory, filename);

  let stat: fs.Stats | null = null;

  try {
    const thumbStat = fs.statSync(thumbnailPath);
    if (!thumbStat.isFile()) {
      throw new AppError(`Thumbnail '${filename}' is not a file`, 404);
    }
    stat = thumbStat;
  } catch (error: unknown) {
    const fsError = error as NodeJS.ErrnoException;
    if (error instanceof AppError) {
      throw error;
    }
    if (fsError.code === 'ENOENT') {
      throw new AppError(`Thumbnail '${filename}' not found`, 404);
    }
    if (fsError.code === 'EACCES' || fsError.code === 'EPERM') {
      throw new AppError('Permission denied accessing thumbnail', 403);
    }
    throw new AppError('Unable to access thumbnail', 500);
  }

  // Security: Verify resolved path is within allowed directory
  const allowedVideosDir = path.resolve(videosDirectory);
  validatePathInDirectory(thumbnailPath, allowedVideosDir);
  
  if (!stat || stat.size > MAX_THUMBNAIL_SIZE) {
    if (!stat) {
      throw new AppError('Unable to access thumbnail', 500);
    }
    throw new AppError(`Thumbnail too large: ${stat.size} bytes (max: ${MAX_THUMBNAIL_SIZE})`, 413);
  }
  const fileSize = stat.size;
  const range = req.headers.range;
  
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const startStr = parts[0];
    const endStr = parts[1];

    if (!startStr) {
      throw new AppError('Invalid range header format', 400);
    }

    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize) {
      throw new AppError('Range not satisfiable', 416);
    }

    const chunkSize = (end - start) + 1;
    const file = fs.createReadStream(thumbnailPath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': getThumbnailMimeType(ext),
      'Cache-Control': `public, max-age=${THUMBNAIL_CACHE_DURATION}`,
      'X-Content-Type-Options': 'nosniff'
    });

    file.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Accept-Ranges': 'bytes',
      'Content-Type': getThumbnailMimeType(ext),
      'Cache-Control': `public, max-age=${THUMBNAIL_CACHE_DURATION}`,
      'X-Content-Type-Options': 'nosniff'
    });

    fs.createReadStream(thumbnailPath).pipe(res);
  }
}));

/**
 * Helper function to get MIME type for thumbnail files
 */
function getThumbnailMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp'
  };
  return mimeTypes[extension] || 'image/jpeg';
}

/**
 * Helper function to get MIME type for video files
 */
function getVideoMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv',
    '.mkv': 'video/x-matroska',
    '.m4v': 'video/mp4'
  };
  
  return mimeTypes[extension.toLowerCase()] || 'video/mp4';
}

// Mount YouTube routes
router.use('/youtube', youtubeRouter);

export { router as apiRouter };
