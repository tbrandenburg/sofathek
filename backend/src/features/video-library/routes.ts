import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { config } from '../../config';
import { VideoService } from './videoService';
import { thumbnailService } from '../../services';
import { catchAsync, AppError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import { validateVideoFilename, validateImageFilename, validatePathInDirectory, validateDownloadableFilename, getMimeType } from '../../utils/fileValidation';
import { streamFileWithRangeSupport } from '../../utils/rangeStream';

const router = Router();

// Initialize video service with ThumbnailService for auto-regeneration
const videosDirectory = config.videosDir;
const videoService = new VideoService(videosDirectory, thumbnailService);
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
  
  streamFileWithRangeSupport(req, res, videoPath, {
    fileSize,
    mimeType: getMimeType(path.extname(filename), 'video/mp4'),
    extraHeaders: {
      'Cache-Control': `public, max-age=${THUMBNAIL_CACHE_DURATION}`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
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
  const contentType = getMimeType(extension, 'video/mp4');

  res.setHeader('Content-Type', contentType);
  // RFC 5987: use filename* with UTF-8 percent-encoding for non-ASCII filenames
  const encodedFilename = encodeURIComponent(filename);
  res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/[^\x20-\x7E]/g, '_')}"; filename*=UTF-8''${encodedFilename}`);
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

  // Security: Verify resolved path is within allowed directory (before any fs access)
  const allowedVideosDir = path.resolve(videosDirectory);
  validatePathInDirectory(thumbnailPath, allowedVideosDir);

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
  
  if (!stat || stat.size > MAX_THUMBNAIL_SIZE) {
    if (!stat) {
      throw new AppError('Unable to access thumbnail', 500);
    }
    throw new AppError(`Thumbnail too large: ${stat.size} bytes (max: ${MAX_THUMBNAIL_SIZE})`, 413);
  }
  const fileSize = stat.size;

  streamFileWithRangeSupport(req, res, thumbnailPath, {
    fileSize,
    mimeType: getMimeType(ext, 'image/jpeg'),
    extraHeaders: {
      'Cache-Control': `public, max-age=${THUMBNAIL_CACHE_DURATION}`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}));

export { router as apiRouter };
