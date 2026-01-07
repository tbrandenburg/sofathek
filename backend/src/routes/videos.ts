import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { videoScanner } from '../services/scanner';
import { streamingService } from '../services/streaming';
import { ffmpegService } from '../services/ffmpeg';

const router = express.Router();

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const category = req.body.category || 'family';
    const uploadDir = path.resolve(
      process.cwd(),
      '..',
      'data',
      'videos',
      category
    );
    await fs.ensureDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${Date.now()}_${sanitized}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024, // 5GB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}`));
    }
  },
});

// Get all videos from library
router.get('/', async (req, res) => {
  try {
    const category = req.query.category as string;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const search = req.query.search as string;

    let scanResult;
    if (category) {
      scanResult = await videoScanner.scanCategory(category);
    } else {
      scanResult = await videoScanner.scanAllDirectories();
    }

    let videos = scanResult.newFiles;

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      videos = videos.filter(
        video =>
          video.fileName.toLowerCase().includes(searchLower) ||
          video.metadata?.title?.toLowerCase().includes(searchLower) ||
          video.metadata?.tags?.some(tag =>
            tag.toLowerCase().includes(searchLower)
          )
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedVideos = videos.slice(startIndex, endIndex);

    // Transform for API response
    const videoResponse = paginatedVideos.map(video => ({
      id: video.id,
      title: video.metadata?.title || video.fileName,
      duration: video.metadata?.duration || 0,
      thumbnail: video.metadata?.thumbnail,
      category: video.category,
      resolution: video.metadata?.resolution,
      fileSize: video.fileSize,
      dateAdded: video.dateAdded,
      tags: video.metadata?.tags || [],
    }));

    res.json({
      videos: videoResponse,
      pagination: {
        page,
        limit,
        total: videos.length,
        totalPages: Math.ceil(videos.length / limit),
      },
      categories: await videoScanner.getCategories(),
      scanStats: {
        scanned: scanResult.scanned,
        processed: scanResult.processed,
        errors: scanResult.errors,
      },
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({
      error: 'Failed to fetch videos',
      message: 'Internal server error',
    });
  }
});

// Get library categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await videoScanner.getCategories();
    res.json({
      categories,
      total: categories.length,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      error: 'Failed to fetch categories',
      message: 'Internal server error',
    });
  }
});

// Get video by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Scan to find video by ID
    const scanResult = await videoScanner.scanAllDirectories();
    const video = scanResult.newFiles.find(v => v.id === id);

    if (!video) {
      return res.status(404).json({
        error: 'Video not found',
        message: 'The requested video does not exist',
      });
    }

    // Check if file still exists
    if (!(await fs.pathExists(video.filePath))) {
      return res.status(404).json({
        error: 'Video file not found',
        message: 'The video file has been moved or deleted',
      });
    }

    res.json({
      id: video.id,
      title: video.metadata?.title || video.fileName,
      description: video.metadata?.description || '',
      duration: video.metadata?.duration || 0,
      thumbnail: video.metadata?.thumbnail,
      category: video.category,
      resolution: video.metadata?.resolution,
      codec: video.metadata?.codec,
      bitrate: video.metadata?.bitrate,
      fileSize: video.fileSize,
      dateAdded: video.dateAdded,
      tags: video.metadata?.tags || [],
      chapters: video.metadata?.chapters || [],
      subtitles: video.metadata?.subtitles || [],
      accessibility: video.metadata?.accessibility || {
        hasClosedCaptions: false,
        hasAudioDescription: false,
      },
    });
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch video details',
    });
  }
});

// Stream video content with HTTP range support
router.get('/:id/stream', async (req, res) => {
  try {
    const { id } = req.params;

    // Find video by ID
    const scanResult = await videoScanner.scanAllDirectories();
    const video = scanResult.newFiles.find(v => v.id === id);

    if (!video) {
      return res.status(404).json({
        error: 'Video not found',
        message: 'The requested video does not exist',
      });
    }

    // Stream the video using our streaming service
    await streamingService.streamVideo(req, res, {
      videoPath: video.filePath,
      contentType: 'video/mp4', // Default to MP4
    });
  } catch (error) {
    console.error('Error streaming video:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Streaming failed',
        message: 'Failed to stream video content',
      });
    }
  }
});

// Get video thumbnail
router.get('/:id/thumbnail', async (req, res) => {
  try {
    const { id } = req.params;

    // Find video by ID
    const scanResult = await videoScanner.scanAllDirectories();
    const video = scanResult.newFiles.find(v => v.id === id);

    if (!video || !video.metadata?.thumbnail) {
      return res.status(404).json({
        error: 'Thumbnail not found',
        message: 'No thumbnail available for this video',
      });
    }

    // Construct thumbnail path
    const thumbnailPath = path.resolve(
      process.cwd(),
      '..',
      'data',
      'thumbnails',
      video.category,
      video.metadata.thumbnail
    );

    // Stream the thumbnail
    await streamingService.streamThumbnail(req, res, thumbnailPath);
  } catch (error) {
    console.error('Error fetching thumbnail:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Thumbnail not found',
        message: 'Failed to fetch video thumbnail',
      });
    }
  }
});

// Upload video endpoint
router.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No video file provided',
        message: 'Please upload a video file',
      });
    }

    const { category = 'family' } = req.body;
    const videoPath = req.file.path;

    console.log(`Processing uploaded video: ${req.file.originalname}`);

    // Process the uploaded video
    const scanResult = await videoScanner.scanCategory(category);
    const uploadedVideo = scanResult.newFiles.find(
      v => v.filePath === videoPath
    );

    if (!uploadedVideo) {
      throw new Error('Failed to process uploaded video');
    }

    // Generate metadata and thumbnail
    await videoScanner.generateMetadata(uploadedVideo);

    res.json({
      message: 'Video uploaded and processed successfully',
      video: {
        id: uploadedVideo.id,
        title: uploadedVideo.metadata?.title || uploadedVideo.fileName,
        category: uploadedVideo.category,
        duration: uploadedVideo.metadata?.duration || 0,
        thumbnail: uploadedVideo.metadata?.thumbnail,
        fileSize: uploadedVideo.fileSize,
      },
    });
  } catch (error) {
    console.error('Video upload error:', error);

    // Clean up uploaded file on error
    if (req.file?.path) {
      try {
        await fs.remove(req.file.path);
      } catch (cleanupError) {
        console.error('Failed to clean up uploaded file:', cleanupError);
      }
    }

    res.status(500).json({
      error: 'Upload failed',
      message:
        error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

// Scan library endpoint
router.post('/scan', async (req, res) => {
  try {
    const { category } = req.body || {};

    let scanResult;
    if (category) {
      scanResult = await videoScanner.scanCategory(category);
    } else {
      scanResult = await videoScanner.scanAllDirectories();
    }

    res.json({
      message: 'Library scan completed',
      results: {
        scanned: scanResult.scanned,
        found: scanResult.found,
        processed: scanResult.processed,
        errors: scanResult.errors,
        newVideos: scanResult.newFiles.length,
      },
      errors: scanResult.errorFiles,
    });
  } catch (error) {
    console.error('Library scan error:', error);
    res.status(500).json({
      error: 'Scan failed',
      message:
        error instanceof Error ? error.message : 'Failed to scan video library',
      details: error instanceof Error ? error.stack : 'Unknown error',
    });
  }
});

export default router;
