import express from 'express';
import { youtubeService } from '../services/ytdlp';

const router = express.Router();

// Start YouTube download
router.post('/', async (req, res) => {
  try {
    const { url, category, quality } = req.body;

    // Validate required fields
    if (!url) {
      return res.status(400).json({
        error: 'Missing url field',
        message: 'YouTube URL is required',
      });
    }

    // Validate URL format (basic check)
    const urlPattern =
      /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/;
    if (!urlPattern.test(url)) {
      return res.status(400).json({
        error: 'Invalid YouTube URL',
        message: 'Please provide a valid YouTube URL',
      });
    }

    // Validate quality if provided
    const validQualities = ['4k', '1080p', '720p', '480p', 'best'];
    if (quality && !validQualities.includes(quality)) {
      return res.status(400).json({
        error: 'Invalid quality setting',
        message: `Quality must be one of: ${validQualities.join(', ')}`,
      });
    }

    // Queue the download
    const jobId = await youtubeService.queueDownload(url, {
      category: category || 'youtube',
      quality: quality || 'best',
    });

    res.json({
      jobId,
      status: 'queued',
      url,
      category: category || 'youtube',
      quality: quality || 'best',
      message: 'Download queued successfully',
    });
  } catch (error) {
    console.error('Error starting download:', error);
    res.status(500).json({
      error: 'Download failed',
      message:
        error instanceof Error
          ? error.message
          : 'Failed to start YouTube download',
    });
  }
});

// Get download status
router.get('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    // Get job from service
    const job = youtubeService.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
        message: 'The requested download job does not exist',
      });
    }

    // Return job details
    res.json({
      jobId: job.id,
      url: job.url,
      status: job.status,
      progress: job.progress,
      category: job.category,
      quality: job.quality,
      error: job.error,
      startTime: job.startTime,
      endTime: job.endTime,
      outputPath: job.outputPath,
      videoMetadata: job.videoMetadata,
    });
  } catch (error) {
    console.error('Error fetching download status:', error);
    res.status(500).json({
      error: 'Status fetch failed',
      message: 'Failed to fetch download status',
    });
  }
});

// Get all download jobs
router.get('/', async (req, res) => {
  try {
    const { status, category, limit } = req.query;

    // Get all jobs
    let jobs = youtubeService.getAllJobs();

    // Apply filters
    if (status) {
      jobs = jobs.filter(job => job.status === status);
    }

    if (category) {
      jobs = jobs.filter(job => job.category === category);
    }

    // Apply limit
    if (limit) {
      const limitNum = parseInt(limit as string, 10);
      if (!isNaN(limitNum)) {
        jobs = jobs.slice(0, limitNum);
      }
    }

    // Get queue statistics
    const stats = youtubeService.getQueueStats();

    res.json({
      queue: jobs,
      stats,
      message: 'Download queue retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching download queue:', error);
    res.status(500).json({
      error: 'Queue fetch failed',
      message: 'Failed to fetch download queue',
    });
  }
});

// Cancel download
router.delete('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    // Cancel the job
    const cancelled = youtubeService.cancelJob(jobId);

    if (!cancelled) {
      return res.status(404).json({
        error: 'Job not found or cannot be cancelled',
        message: 'The job does not exist or is not in a cancellable state',
      });
    }

    res.json({
      jobId,
      status: 'cancelled',
      message: 'Download cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling download:', error);
    res.status(500).json({
      error: 'Cancellation failed',
      message: 'Failed to cancel download',
    });
  }
});

// Get download queue statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = youtubeService.getQueueStats();

    res.json({
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching queue stats:', error);
    res.status(500).json({
      error: 'Stats fetch failed',
      message: 'Failed to fetch queue statistics',
    });
  }
});

// Clear completed downloads
router.post('/clear', async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['completed', 'failed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Status must be one of: completed, failed, cancelled',
      });
    }

    const jobs = youtubeService.getAllJobs();
    const jobsToRemove = jobs.filter(job => job.status === status);

    // Note: This is a simplified implementation
    // In a production system, you'd want to properly remove jobs
    res.json({
      message: `Clear ${status} jobs endpoint - implementation pending`,
      jobsFound: jobsToRemove.length,
    });
  } catch (error) {
    console.error('Error clearing downloads:', error);
    res.status(500).json({
      error: 'Clear failed',
      message: 'Failed to clear downloads',
    });
  }
});

export default router;
