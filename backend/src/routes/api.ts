import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { VideoService } from '../services/videoService';
import { catchAsync, AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import youtubeRouter from './youtube';

const router = Router();

// Initialize video service (in production this would come from DI container)
const videosDirectory = process.env.VIDEOS_PATH || path.join(process.cwd(), 'data', 'videos');
const videoService = new VideoService(videosDirectory);

/**
 * GET /api/videos
 * Returns list of all available videos with metadata
 */
router.get('/videos', catchAsync(async (_req: Request, res: Response) => {
  logger.info('Fetching video list');
  
  const result = await videoService.scanVideoDirectory();
  
  res.json({
    status: 'success',
    data: result
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
  
  res.json({
    status: 'success',
    data: video
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
  
  const videoPath = path.join(videosDirectory, filename);
  
  logger.info(`Streaming video: ${filename}`, {
    path: videoPath,
    range: req.headers.range
  });
  
  // Verify file exists and is accessible
  if (!fs.existsSync(videoPath)) {
    throw new AppError(`Video file '${filename}' not found`, 404);
  }
  
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