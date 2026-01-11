# PRP-5.1: YouTube Download Management & yt-dlp Integration

**Project**: SOFATHEK Media Center  
**Phase**: 5 - Admin Features & YouTube Integration  
**Priority**: Critical  
**Complexity**: High  
**Estimated Effort**: 16-20 hours

## Purpose & Core Principles

### Philosophy: Content Acquisition Should Feel Like Magic, Not Technical Plumbing

Effective YouTube integration isn't about wrapping command-line tools—it's about **transforming URLs into family-accessible content** with zero technical friction. Users should be able to paste a YouTube URL and have it seamlessly become part of their personal media library, with the same quality and reliability they expect from Netflix or Disney+.

**Before implementing YouTube integration, ask**:

- How can we make adding YouTube content feel as natural as browsing Netflix?
- What would Disney+ level content acquisition look like in a self-hosted environment?
- How do we balance download flexibility with family-friendly simplicity?

**Core principles**:

1. **URL-to-Library Magic**: Paste URL → Perfect video in library, automatically categorized and ready to watch
2. **Quality Intelligence**: Automatically select the best format/quality that serves the family's needs
3. **Progress Transparency**: Users always know what's happening, with clear status and time estimates
4. **Error Grace**: Network issues, geo-blocking, or format problems never break the user experience
5. **Family Context**: Downloads integrate seamlessly with profiles, themes, and parental controls

### The YouTube Integration Mental Model

Think of YouTube downloading as **content acquisition** rather than file downloading:

- **Basic downloaders**: Like manually copying files—technical and fragile
- **Smart content acquisition**: Like having a personal content curator who understands your family's needs
- **SOFATHEK YouTube integration**: Like having Disney+ automatically add requested content to your library

## Gap Analysis: Current State vs. Netflix-Grade Content Acquisition

### Current Implementation Gaps

**❌ No Content Acquisition System**:

```typescript
// Current problematic state - no way to add external content
const videoLibrary = scanLocalFiles('/media/videos'); // Only existing files
```

**❌ No Quality Intelligence**: Users must understand technical video formats and quality options  
**❌ No Download Management**: No queue system, progress tracking, or error handling  
**❌ No Content Integration**: Downloaded content doesn't integrate with existing media library  
**❌ No Family Context**: No understanding of age-appropriate content or family preferences  
**❌ No Metadata Enrichment**: Downloads lack proper titles, descriptions, thumbnails, and categories

### Netflix-Grade Content Acquisition Requirements

**✅ One-Click Content Addition**: Paste YouTube URL → Content appears in library automatically  
**✅ Intelligent Quality Selection**: Automatic format/quality selection based on family needs and storage  
**✅ Smart Download Queue**: Priority management, concurrent downloads, bandwidth optimization  
**✅ Rich Content Integration**: Downloads get proper metadata, thumbnails, categories, and family ratings  
**✅ Progress Transparency**: Real-time download status, time estimates, and error communication  
**✅ Error Recovery**: Automatic retry logic, alternative format fallbacks, geo-blocking solutions  
**✅ Family-Aware Downloads**: Content filtering, parental controls, and profile-appropriate categorization

## Detailed Implementation

### 1. YouTube Download Service Architecture

**Core yt-dlp integration service** (`backend/src/services/youtubeService.ts`):

```typescript
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join, basename, extname } from 'path';
import { EventEmitter } from 'events';

interface YouTubeDownloadJob {
  id: string;
  url: string;
  status: 'queued' | 'downloading' | 'processing' | 'completed' | 'failed';
  progress: number;
  speed: string;
  eta: string;
  quality: string;
  format: string;
  category: string;
  requestedBy: string; // profileId
  startTime: Date;
  completedTime?: Date;
  error?: string;
  outputPath?: string;
  metadata?: YouTubeVideoInfo;
}

interface YouTubeVideoInfo {
  title: string;
  description: string;
  duration: number;
  uploader: string;
  uploadDate: string;
  viewCount: number;
  likeCount: number;
  ageLimit: number;
  categories: string[];
  tags: string[];
  thumbnail: string;
}

interface DownloadOptions {
  quality: 'best' | 'worst' | '2160p' | '1440p' | '1080p' | '720p' | '480p' | '360p';
  format: 'mp4' | 'webm' | 'mkv' | 'auto';
  category: 'youtube' | 'educational' | 'entertainment' | 'family' | 'music';
  extractAudio: boolean;
  subtitles: boolean | string[]; // true for auto, array for specific languages
  profileId: string;
}

class YouTubeService extends EventEmitter {
  private downloadQueue = new Map<string, YouTubeDownloadJob>();
  private activeDownloads = new Set<string>();
  private readonly maxConcurrentDownloads = 3;
  private readonly downloadDir = process.env.SOFATHEK_MEDIA_PATH || '/app/media';

  /**
   * Add YouTube URL to download queue with intelligent options
   * Philosophy: Make adding content as simple as pasting a URL
   */
  async queueDownload(url: string, options: Partial<DownloadOptions> = {}): Promise<string> {
    try {
      // Validate and normalize YouTube URL
      const normalizedUrl = this.normalizeYouTubeUrl(url);
      if (!normalizedUrl) {
        throw new Error('Invalid YouTube URL format');
      }

      // Check for duplicate downloads
      const existingJob = this.findExistingDownload(normalizedUrl);
      if (existingJob) {
        return existingJob.id;
      }

      // Extract video information before downloading
      const videoInfo = await this.extractVideoInfo(normalizedUrl);

      // Apply intelligent defaults based on content analysis
      const smartOptions = await this.applyIntelligentDefaults(videoInfo, options);

      const jobId = this.generateJobId();
      const job: YouTubeDownloadJob = {
        id: jobId,
        url: normalizedUrl,
        status: 'queued',
        progress: 0,
        speed: '0 B/s',
        eta: 'calculating...',
        quality: smartOptions.quality,
        format: smartOptions.format,
        category: smartOptions.category,
        requestedBy: smartOptions.profileId || 'default',
        startTime: new Date(),
        metadata: videoInfo,
      };

      this.downloadQueue.set(jobId, job);
      this.emit('jobQueued', job);

      // Start download if slots available
      this.processQueue();

      return jobId;
    } catch (error) {
      console.error('Failed to queue download:', error);
      throw new Error(`Failed to queue download: ${error.message}`);
    }
  }

  /**
   * Extract YouTube video information using yt-dlp
   */
  private async extractVideoInfo(url: string): Promise<YouTubeVideoInfo> {
    return new Promise((resolve, reject) => {
      const ytDlp = spawn('yt-dlp', ['--dump-json', '--no-download', '--ignore-errors', url]);

      let output = '';
      ytDlp.stdout.on('data', data => {
        output += data.toString();
      });

      ytDlp.stderr.on('data', data => {
        console.warn('yt-dlp stderr:', data.toString());
      });

      ytDlp.on('close', code => {
        if (code !== 0) {
          reject(new Error('Failed to extract video information'));
          return;
        }

        try {
          const videoData = JSON.parse(output);
          resolve({
            title: videoData.title || 'Unknown Title',
            description: videoData.description || '',
            duration: videoData.duration || 0,
            uploader: videoData.uploader || 'Unknown',
            uploadDate: videoData.upload_date || new Date().toISOString().slice(0, 10),
            viewCount: videoData.view_count || 0,
            likeCount: videoData.like_count || 0,
            ageLimit: videoData.age_limit || 0,
            categories: videoData.categories || [],
            tags: videoData.tags || [],
            thumbnail: videoData.thumbnail || '',
          });
        } catch (parseError) {
          reject(new Error('Failed to parse video information'));
        }
      });
    });
  }

  /**
   * Apply intelligent defaults based on video content and family context
   */
  private async applyIntelligentDefaults(
    videoInfo: YouTubeVideoInfo,
    userOptions: Partial<DownloadOptions>
  ): Promise<DownloadOptions> {
    const defaults: DownloadOptions = {
      quality: 'best',
      format: 'mp4',
      category: 'youtube',
      extractAudio: false,
      subtitles: true,
      profileId: 'default',
    };

    // Intelligent quality selection based on duration and content type
    if (videoInfo.duration > 3600) {
      // > 1 hour
      defaults.quality = '720p'; // Balance quality vs storage for long content
    } else if (videoInfo.duration < 300) {
      // < 5 minutes
      defaults.quality = 'best'; // High quality for short clips
    }

    // Category classification based on content analysis
    if (this.isEducationalContent(videoInfo)) {
      defaults.category = 'educational';
    } else if (this.isFamilyContent(videoInfo)) {
      defaults.category = 'family';
    } else if (this.isMusicContent(videoInfo)) {
      defaults.category = 'music';
      defaults.extractAudio = true; // Option to extract audio for music
    }

    // Age-appropriate handling
    if (videoInfo.ageLimit > 0) {
      defaults.category = 'entertainment'; // Adult supervision required
    }

    return { ...defaults, ...userOptions };
  }

  /**
   * Process download queue with concurrent download management
   * Philosophy: Downloads should be efficient but not overwhelming to system
   */
  private async processQueue(): Promise<void> {
    const queuedJobs = Array.from(this.downloadQueue.values())
      .filter(job => job.status === 'queued')
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    const availableSlots = this.maxConcurrentDownloads - this.activeDownloads.size;

    for (let i = 0; i < Math.min(availableSlots, queuedJobs.length); i++) {
      const job = queuedJobs[i];
      this.startDownload(job);
    }
  }

  /**
   * Start individual download with comprehensive progress tracking
   */
  private async startDownload(job: YouTubeDownloadJob): Promise<void> {
    try {
      job.status = 'downloading';
      this.activeDownloads.add(job.id);
      this.emit('downloadStarted', job);

      const outputTemplate = this.getOutputTemplate(job);
      const ytDlpArgs = this.buildYtDlpArgs(job, outputTemplate);

      const ytDlp = spawn('yt-dlp', ytDlpArgs);

      // Track download progress
      ytDlp.stderr.on('data', data => {
        const progress = this.parseProgress(data.toString());
        if (progress) {
          job.progress = progress.percent;
          job.speed = progress.speed;
          job.eta = progress.eta;
          this.emit('downloadProgress', job);
        }
      });

      ytDlp.on('close', async code => {
        this.activeDownloads.delete(job.id);

        if (code === 0) {
          job.status = 'processing';
          await this.postProcessDownload(job);
        } else {
          job.status = 'failed';
          job.error = 'Download process failed';
          this.emit('downloadFailed', job);
        }

        // Process next item in queue
        this.processQueue();
      });
    } catch (error) {
      this.activeDownloads.delete(job.id);
      job.status = 'failed';
      job.error = error.message;
      this.emit('downloadFailed', job);
    }
  }

  /**
   * Build optimized yt-dlp arguments for family media center
   */
  private buildYtDlpArgs(job: YouTubeDownloadJob, outputTemplate: string): string[] {
    const args = [
      '--format',
      this.getFormatSelector(job.quality, job.format),
      '--output',
      outputTemplate,
      '--no-playlist', // Download single video, not entire playlist
      '--write-thumbnail',
      '--convert-thumbnails',
      'webp', // Optimize thumbnails for web
      '--embed-metadata',
      '--add-metadata',
      '--parse-metadata',
      'title:%(title)s',
      '--restrict-filenames', // Ensure filesystem-safe filenames
      '--no-overwrites',
      '--continue', // Resume interrupted downloads
      '--retries',
      '3',
      '--fragment-retries',
      '3',
    ];

    // Add subtitle options if requested
    if (job.metadata && this.shouldDownloadSubtitles(job)) {
      args.push('--write-subs', '--sub-langs', 'en,es,fr,de', '--convert-subs', 'srt');
    }

    // Add quality-specific optimizations
    if (job.quality !== 'best') {
      args.push('--format-sort', 'res,fps,codec:h264,tbr');
    }

    args.push(job.url);
    return args;
  }

  /**
   * Post-process downloaded content for integration with SOFATHEK library
   */
  private async postProcessDownload(job: YouTubeDownloadJob): Promise<void> {
    try {
      const videoPath = await this.findDownloadedFile(job);
      if (!videoPath) {
        throw new Error('Downloaded file not found');
      }

      // Generate SOFATHEK-compatible metadata
      const metadata = await this.generateVideoMetadata(job, videoPath);

      // Move to organized directory structure
      const finalPath = await this.organizeDownloadedVideo(videoPath, job.category);

      // Generate thumbnails if not already present
      await this.ensureThumbnails(finalPath);

      // Save metadata file
      const metadataPath = finalPath.replace(extname(finalPath), '.json');
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      job.status = 'completed';
      job.completedTime = new Date();
      job.outputPath = finalPath;

      this.emit('downloadCompleted', job);

      // Trigger library rescan
      this.emit('libraryUpdate', { category: job.category, newVideo: finalPath });
    } catch (error) {
      job.status = 'failed';
      job.error = `Post-processing failed: ${error.message}`;
      this.emit('downloadFailed', job);
    }
  }

  /**
   * Get intelligent format selector for yt-dlp
   */
  private getFormatSelector(quality: string, format: string): string {
    const baseFormat = format === 'auto' ? 'mp4/webm/mkv' : format;

    switch (quality) {
      case 'best':
        return `bv*[ext=${baseFormat}]+ba[ext=m4a]/b[ext=${baseFormat}]`;
      case '2160p':
        return `bv*[height<=2160][ext=${baseFormat}]+ba[ext=m4a]/b[height<=2160][ext=${baseFormat}]`;
      case '1440p':
        return `bv*[height<=1440][ext=${baseFormat}]+ba[ext=m4a]/b[height<=1440][ext=${baseFormat}]`;
      case '1080p':
        return `bv*[height<=1080][ext=${baseFormat}]+ba[ext=m4a]/b[height<=1080][ext=${baseFormat}]`;
      case '720p':
        return `bv*[height<=720][ext=${baseFormat}]+ba[ext=m4a]/b[height<=720][ext=${baseFormat}]`;
      case '480p':
        return `bv*[height<=480][ext=${baseFormat}]+ba[ext=m4a]/b[height<=480][ext=${baseFormat}]`;
      case '360p':
        return `bv*[height<=360][ext=${baseFormat}]+ba[ext=m4a]/b[height<=360][ext=${baseFormat}]`;
      default:
        return 'worst[ext=mp4]/worst';
    }
  }

  /**
   * Parse yt-dlp progress output for real-time tracking
   */
  private parseProgress(output: string): { percent: number; speed: string; eta: string } | null {
    // Parse yt-dlp progress format: [download] 45.2% of 123.45MiB at 1.23MiB/s ETA 00:45
    const progressMatch = output.match(/\[download\]\s+(\d+\.?\d*)%.*?(\d+\.?\d*\w+\/s).*?ETA\s+(\d+:\d+)/);

    if (progressMatch) {
      return {
        percent: parseFloat(progressMatch[1]),
        speed: progressMatch[2],
        eta: progressMatch[3],
      };
    }

    return null;
  }

  /**
   * Content classification helpers for intelligent categorization
   */
  private isEducationalContent(info: YouTubeVideoInfo): boolean {
    const educationalKeywords = ['tutorial', 'learn', 'education', 'course', 'lesson', 'how to', 'explain'];
    const titleAndDesc = (info.title + ' ' + info.description).toLowerCase();

    return (
      educationalKeywords.some(keyword => titleAndDesc.includes(keyword)) ||
      info.categories.some(cat => cat.toLowerCase().includes('education'))
    );
  }

  private isFamilyContent(info: YouTubeVideoInfo): boolean {
    const familyKeywords = ['kids', 'children', 'family', 'cartoon', 'animation', 'disney'];
    const titleAndDesc = (info.title + ' ' + info.description).toLowerCase();

    return (
      (familyKeywords.some(keyword => titleAndDesc.includes(keyword)) || info.ageLimit === 0) &&
      info.categories.some(cat => ['Entertainment', 'Film & Animation'].includes(cat))
    );
  }

  private isMusicContent(info: YouTubeVideoInfo): boolean {
    return (
      info.categories.includes('Music') ||
      info.tags.some(tag => ['music', 'song', 'album', 'artist'].includes(tag.toLowerCase()))
    );
  }

  private shouldDownloadSubtitles(job: YouTubeDownloadJob): boolean {
    // Download subtitles for educational content and family content
    return job.category === 'educational' || job.category === 'family' || job.subtitles === true;
  }

  private normalizeYouTubeUrl(url: string): string | null {
    // Handle various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return url.includes('playlist')
          ? `https://www.youtube.com/playlist?list=${match[1]}`
          : `https://www.youtube.com/watch?v=${match[1]}`;
      }
    }

    return null;
  }

  private generateJobId(): string {
    return `yt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private findExistingDownload(url: string): YouTubeDownloadJob | undefined {
    return Array.from(this.downloadQueue.values()).find(job => job.url === url && job.status !== 'failed');
  }

  /**
   * Get download queue status and statistics
   */
  getQueueStatus(): {
    total: number;
    queued: number;
    downloading: number;
    completed: number;
    failed: number;
    jobs: YouTubeDownloadJob[];
  } {
    const jobs = Array.from(this.downloadQueue.values());

    return {
      total: jobs.length,
      queued: jobs.filter(j => j.status === 'queued').length,
      downloading: jobs.filter(j => j.status === 'downloading').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      jobs: jobs.sort((a, b) => b.startTime.getTime() - a.startTime.getTime()),
    };
  }

  /**
   * Cancel download job
   */
  cancelDownload(jobId: string): boolean {
    const job = this.downloadQueue.get(jobId);
    if (!job) return false;

    if (job.status === 'queued') {
      this.downloadQueue.delete(jobId);
      this.emit('downloadCancelled', job);
      return true;
    }

    // For active downloads, would need to track and kill the yt-dlp process
    return false;
  }

  private getOutputTemplate(job: YouTubeDownloadJob): string {
    const categoryDir = join(this.downloadDir, 'videos', job.category);
    return join(categoryDir, '%(title)s.%(ext)s');
  }

  private async generateVideoMetadata(job: YouTubeDownloadJob, videoPath: string): Promise<any> {
    // Generate SOFATHEK-compatible metadata from YouTube info
    return {
      id: basename(videoPath, extname(videoPath)),
      title: job.metadata?.title || 'Unknown Title',
      duration: job.metadata?.duration || 0,
      dateAdded: new Date().toISOString(),
      category: job.category,
      source: job.url,
      description: job.metadata?.description || '',
      uploader: job.metadata?.uploader || 'Unknown',
      tags: job.metadata?.tags || [],
      accessibility: {
        hasClosedCaptions: this.shouldDownloadSubtitles(job),
        hasAudioDescription: false,
      },
    };
  }

  private async organizeDownloadedVideo(tempPath: string, category: string): Promise<string> {
    const categoryDir = join(this.downloadDir, 'videos', category);
    await fs.mkdir(categoryDir, { recursive: true });

    const filename = basename(tempPath);
    const finalPath = join(categoryDir, filename);

    await fs.rename(tempPath, finalPath);
    return finalPath;
  }

  private async findDownloadedFile(job: YouTubeDownloadJob): Promise<string | null> {
    // Implementation to find the actual downloaded file
    // This would need to match yt-dlp's output template logic
    return null; // Placeholder
  }

  private async ensureThumbnails(videoPath: string): Promise<void> {
    // Generate thumbnail if not already created by yt-dlp
    // Integration with existing ffmpeg thumbnail service
  }
}

export const youtubeService = new YouTubeService();
```

### 2. Download Management API Routes

**YouTube download API endpoints** (`backend/src/routes/downloads.ts`):

```typescript
import express from 'express';
import { youtubeService } from '../services/youtubeService.js';
import { body, param, validationResult } from 'express-validator';

const router = express.Router();

/**
 * Queue YouTube download
 * Route: POST /api/downloads
 * Philosophy: Adding content should be as simple as pasting a URL
 */
router.post(
  '/',
  [
    body('url').isURL().withMessage('Valid YouTube URL required'),
    body('quality').optional().isIn(['best', 'worst', '2160p', '1440p', '1080p', '720p', '480p', '360p']),
    body('category').optional().isIn(['youtube', 'educational', 'entertainment', 'family', 'music']),
    body('profileId').optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { url, quality, format, category, extractAudio, subtitles, profileId } = req.body;

      const jobId = await youtubeService.queueDownload(url, {
        quality: quality || 'best',
        format: format || 'mp4',
        category: category || 'youtube',
        extractAudio: extractAudio || false,
        subtitles: subtitles !== undefined ? subtitles : true,
        profileId: profileId || 'default',
      });

      res.json({
        success: true,
        jobId,
        message: 'Download queued successfully',
        queuePosition: youtubeService.getQueueStatus().queued,
      });
    } catch (error) {
      console.error('Download queue error:', error);
      res.status(500).json({
        error: 'Failed to queue download',
        message: error.message,
      });
    }
  }
);

/**
 * Get download queue status
 * Route: GET /api/downloads/queue
 */
router.get('/queue', async (req, res) => {
  try {
    const status = youtubeService.getQueueStatus();
    res.json(status);
  } catch (error) {
    console.error('Queue status error:', error);
    res.status(500).json({ error: 'Failed to get queue status' });
  }
});

/**
 * Get specific download job status
 * Route: GET /api/downloads/:jobId
 */
router.get('/:jobId', [param('jobId').isString().notEmpty()], async (req, res) => {
  try {
    const { jobId } = req.params;
    const status = youtubeService.getQueueStatus();
    const job = status.jobs.find(j => j.id === jobId);

    if (!job) {
      return res.status(404).json({ error: 'Download job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Job status error:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

/**
 * Cancel download job
 * Route: DELETE /api/downloads/:jobId
 */
router.delete('/:jobId', [param('jobId').isString().notEmpty()], async (req, res) => {
  try {
    const { jobId } = req.params;
    const cancelled = youtubeService.cancelDownload(jobId);

    if (cancelled) {
      res.json({ success: true, message: 'Download cancelled' });
    } else {
      res.status(400).json({ error: 'Cannot cancel download - may be in progress or already completed' });
    }
  } catch (error) {
    console.error('Cancel download error:', error);
    res.status(500).json({ error: 'Failed to cancel download' });
  }
});

/**
 * Get supported sites and formats
 * Route: GET /api/downloads/supported
 */
router.get('/supported', async (req, res) => {
  try {
    // This would query yt-dlp for supported sites
    res.json({
      sites: ['YouTube', 'Vimeo', 'Twitch', 'TikTok'], // Simplified for now
      qualities: ['best', '2160p', '1440p', '1080p', '720p', '480p', '360p', 'worst'],
      formats: ['mp4', 'webm', 'mkv'],
      categories: ['youtube', 'educational', 'entertainment', 'family', 'music'],
    });
  } catch (error) {
    console.error('Supported formats error:', error);
    res.status(500).json({ error: 'Failed to get supported formats' });
  }
});

/**
 * Validate YouTube URL without downloading
 * Route: POST /api/downloads/validate
 */
router.post('/validate', [body('url').isURL().withMessage('Valid URL required')], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { url } = req.body;

    // Extract basic info to validate URL
    const videoInfo = await youtubeService.extractVideoInfo(url);

    res.json({
      valid: true,
      info: {
        title: videoInfo.title,
        duration: videoInfo.duration,
        uploader: videoInfo.uploader,
        thumbnail: videoInfo.thumbnail,
        estimatedSize: this.estimateFileSize(videoInfo.duration),
      },
    });
  } catch (error) {
    console.error('URL validation error:', error);
    res.status(400).json({
      valid: false,
      error: 'Invalid or inaccessible URL',
      message: error.message,
    });
  }
});

/**
 * WebSocket endpoint for real-time download progress
 * This would be implemented with Socket.IO or native WebSockets
 */
router.get('/progress/:jobId/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const { jobId } = req.params;

  const progressHandler = job => {
    if (job.id === jobId) {
      res.write(
        `data: ${JSON.stringify({
          progress: job.progress,
          speed: job.speed,
          eta: job.eta,
          status: job.status,
        })}\n\n`
      );
    }
  };

  youtubeService.on('downloadProgress', progressHandler);
  youtubeService.on('downloadCompleted', progressHandler);
  youtubeService.on('downloadFailed', progressHandler);

  req.on('close', () => {
    youtubeService.off('downloadProgress', progressHandler);
    youtubeService.off('downloadCompleted', progressHandler);
    youtubeService.off('downloadFailed', progressHandler);
  });
});

function estimateFileSize(duration: number): string {
  // Rough estimation based on typical YouTube compression
  const mbPerMinute = 10; // Conservative estimate for 720p
  const estimatedMB = Math.round((duration / 60) * mbPerMinute);

  if (estimatedMB < 1024) {
    return `~${estimatedMB} MB`;
  } else {
    return `~${(estimatedMB / 1024).toFixed(1)} GB`;
  }
}

export default router;
```

### 3. React 19 YouTube Download Interface

**YouTube download management component** (`frontend/src/components/Admin/YouTubeDownloader.tsx`):

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { useYouTubeDownloads } from '../../hooks/useYouTubeDownloads';
import { useProfile } from '../../hooks/useProfile';

interface YouTubeDownloaderProps {
  onDownloadComplete?: (videoPath: string) => void;
}

interface DownloadJob {
  id: string;
  url: string;
  status: 'queued' | 'downloading' | 'processing' | 'completed' | 'failed';
  progress: number;
  speed: string;
  eta: string;
  quality: string;
  category: string;
  title?: string;
  error?: string;
}

/**
 * YouTube downloader with intelligent defaults and family-friendly interface
 * Philosophy: Make adding YouTube content feel like adding to Netflix library
 */
export const YouTubeDownloader: React.FC<YouTubeDownloaderProps> = ({
  onDownloadComplete
}) => {
  const [url, setUrl] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [downloadOptions, setDownloadOptions] = useState({
    quality: 'best',
    category: 'youtube',
    subtitles: true
  });

  const { currentProfile } = useProfile();
  const {
    queueDownload,
    downloadQueue,
    cancelDownload,
    isLoading,
    error
  } = useYouTubeDownloads();

  /**
   * Validate YouTube URL and show preview
   */
  const validateUrl = useCallback(async (inputUrl: string) => {
    if (!inputUrl.trim()) {
      setValidationResult(null);
      return;
    }

    setIsValidating(true);
    try {
      const response = await fetch('/api/downloads/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: inputUrl })
      });

      const result = await response.json();

      if (result.valid) {
        setValidationResult(result.info);
        // Apply intelligent defaults based on content
        setDownloadOptions(prev => ({
          ...prev,
          category: suggestCategory(result.info.title, result.info.duration)
        }));
      } else {
        setValidationResult({ error: result.message });
      }
    } catch (error) {
      setValidationResult({ error: 'Failed to validate URL' });
    } finally {
      setIsValidating(false);
    }
  }, []);

  /**
   * Handle URL input with debounced validation
   */
  const handleUrlChange = useCallback((inputUrl: string) => {
    setUrl(inputUrl);

    // Debounce validation
    const timeoutId = setTimeout(() => {
      if (inputUrl.includes('youtube.com') || inputUrl.includes('youtu.be')) {
        validateUrl(inputUrl);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [validateUrl]);

  /**
   * Start download with user-selected options
   */
  const handleDownload = async () => {
    if (!url || !validationResult || validationResult.error) {
      return;
    }

    try {
      const jobId = await queueDownload(url, {
        ...downloadOptions,
        profileId: currentProfile?.id
      });

      // Clear form on successful queue
      setUrl('');
      setValidationResult(null);

    } catch (error) {
      console.error('Failed to start download:', error);
    }
  };

  return (
    <div className="youtube-downloader">
      <div className="youtube-downloader__header">
        <h2>Add YouTube Content</h2>
        <p>Paste any YouTube URL to add it to your library</p>
      </div>

      {/* URL Input */}
      <div className="youtube-downloader__input-section">
        <div className="url-input-group">
          <input
            type="url"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="url-input"
            data-testid="youtube-url-input"
          />

          {isValidating && (
            <div className="validation-spinner" data-testid="url-validating">
              Checking...
            </div>
          )}
        </div>

        {/* URL Validation Results */}
        {validationResult && (
          <div className={`validation-result ${validationResult.error ? 'error' : 'success'}`}>
            {validationResult.error ? (
              <div className="validation-error" data-testid="url-error">
                ❌ {validationResult.error}
              </div>
            ) : (
              <div className="validation-preview" data-testid="url-preview">
                <div className="preview-thumbnail">
                  {validationResult.thumbnail && (
                    <img src={validationResult.thumbnail} alt="Video thumbnail" />
                  )}
                </div>
                <div className="preview-info">
                  <h4>{validationResult.title}</h4>
                  <div className="preview-meta">
                    <span>Duration: {formatDuration(validationResult.duration)}</span>
                    <span>By: {validationResult.uploader}</span>
                    <span>Size: {validationResult.estimatedSize}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Download Options */}
      {validationResult && !validationResult.error && (
        <div className="youtube-downloader__options">
          <h3>Download Options</h3>

          <div className="options-grid">
            {/* Quality Selection */}
            <div className="option-group">
              <label htmlFor="quality-select">Quality</label>
              <select
                id="quality-select"
                value={downloadOptions.quality}
                onChange={(e) => setDownloadOptions(prev => ({ ...prev, quality: e.target.value }))}
                data-testid="quality-selector"
              >
                <option value="best">Best Available</option>
                <option value="2160p">4K (2160p)</option>
                <option value="1440p">1440p</option>
                <option value="1080p">1080p</option>
                <option value="720p">720p</option>
                <option value="480p">480p</option>
                <option value="360p">360p</option>
              </select>
              <small>Higher quality = larger file size</small>
            </div>

            {/* Category Selection */}
            <div className="option-group">
              <label htmlFor="category-select">Category</label>
              <select
                id="category-select"
                value={downloadOptions.category}
                onChange={(e) => setDownloadOptions(prev => ({ ...prev, category: e.target.value }))}
                data-testid="category-selector"
              >
                <option value="youtube">YouTube</option>
                <option value="educational">Educational</option>
                <option value="entertainment">Entertainment</option>
                <option value="family">Family</option>
                <option value="music">Music</option>
              </select>
            </div>

            {/* Subtitles Option */}
            <div className="option-group">
              <label>
                <input
                  type="checkbox"
                  checked={downloadOptions.subtitles}
                  onChange={(e) => setDownloadOptions(prev => ({ ...prev, subtitles: e.target.checked }))}
                />
                Download subtitles (recommended)
              </label>
            </div>
          </div>

          <button
            onClick={handleDownload}
            disabled={isLoading || !validationResult || validationResult.error}
            className="download-button"
            data-testid="download-button"
          >
            {isLoading ? 'Adding to Queue...' : 'Add to Library'}
          </button>
        </div>
      )}

      {/* Download Queue */}
      <div className="youtube-downloader__queue">
        <h3>Download Queue ({downloadQueue.length})</h3>

        {downloadQueue.length === 0 ? (
          <div className="empty-queue">
            No downloads in progress
          </div>
        ) : (
          <div className="queue-list">
            {downloadQueue.map((job) => (
              <DownloadJobItem
                key={job.id}
                job={job}
                onCancel={() => cancelDownload(job.id)}
                onComplete={onDownloadComplete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message" data-testid="error-message">
          ❌ {error}
        </div>
      )}
    </div>
  );
};

/**
 * Individual download job display component
 */
const DownloadJobItem: React.FC<{
  job: DownloadJob;
  onCancel: () => void;
  onComplete?: (path: string) => void;
}> = ({ job, onCancel, onComplete }) => {
  useEffect(() => {
    if (job.status === 'completed' && onComplete) {
      onComplete(job.outputPath);
    }
  }, [job.status, onComplete]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued': return '⏳';
      case 'downloading': return '⬇️';
      case 'processing': return '⚙️';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued': return '#fbbf24';
      case 'downloading': return '#3b82f6';
      case 'processing': return '#8b5cf6';
      case 'completed': return '#10b981';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="download-job-item" data-testid="download-job">
      <div className="job-header">
        <span className="job-status" style={{ color: getStatusColor(job.status) }}>
          {getStatusIcon(job.status)} {job.status.toUpperCase()}
        </span>
        <div className="job-actions">
          {(job.status === 'queued' || job.status === 'downloading') && (
            <button onClick={onCancel} className="cancel-button" title="Cancel download">
              ❌
            </button>
          )}
        </div>
      </div>

      <div className="job-details">
        <div className="job-title">{job.title || 'Loading...'}</div>
        <div className="job-meta">
          Quality: {job.quality} • Category: {job.category}
        </div>

        {job.status === 'downloading' && (
          <div className="job-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${job.progress}%` }}
              />
            </div>
            <div className="progress-details">
              {job.progress.toFixed(1)}% • {job.speed} • ETA: {job.eta}
            </div>
          </div>
        )}

        {job.status === 'failed' && (
          <div className="job-error">
            Error: {job.error}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper functions
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function suggestCategory(title: string, duration: number): string {
  const titleLower = title.toLowerCase();

  if (titleLower.includes('tutorial') || titleLower.includes('learn') || titleLower.includes('how to')) {
    return 'educational';
  }

  if (titleLower.includes('music') || titleLower.includes('song') || duration < 600) {
    return 'music';
  }

  if (titleLower.includes('kids') || titleLower.includes('children') || titleLower.includes('family')) {
    return 'family';
  }

  return 'youtube';
}
```

## Anti-Patterns to Avoid

### ❌ **Direct yt-dlp Exposure Anti-Pattern**: Exposing Technical Complexity

**What not to do**:

```typescript
// DON'T: Expose raw yt-dlp complexity to users
<input placeholder="Enter yt-dlp format string like 'bv*[height<=720]+ba'" />
```

**Why it's problematic**: Users shouldn't need to understand video codecs, containers, or yt-dlp syntax

**Better approach**:

```typescript
// DO: Provide simple, meaningful options
<select>
  <option value="best">Best Quality</option>
  <option value="720p">Standard (720p) - Good for most content</option>
  <option value="480p">Compact (480p) - Saves storage space</option>
</select>
```

### ❌ **Download Flooding Anti-Pattern**: Unlimited Concurrent Downloads

**What not to do**:

```typescript
// DON'T: Allow unlimited simultaneous downloads
urls.forEach(url => startDownload(url)); // Could overwhelm system!
```

**Why it's problematic**: Overwhelms bandwidth, storage I/O, and system resources

**Better approach**:

```typescript
// DO: Intelligent queue management with limits
const maxConcurrentDownloads = 3;
const downloadSlots = availableSlots();
processQueue(Math.min(queuedJobs.length, downloadSlots));
```

### ❌ **Progress Black Hole Anti-Pattern**: No Download Feedback

**What not to do**:

```typescript
// DON'T: Silent downloads with no progress indication
await ytdlp.download(url); // User has no idea what's happening
```

**Why it's problematic**: Users don't know if system is working, how long to wait, or if errors occurred

**Better approach**:

```typescript
// DO: Real-time progress with meaningful feedback
downloadStream.on('progress', progress => {
  updateUI({
    percent: progress.percent,
    speed: progress.speed,
    eta: progress.eta,
    status: 'Downloading...',
  });
});
```

### ❌ **Format Chaos Anti-Pattern**: Inconsistent Video Formats

**What not to do**:

```typescript
// DON'T: Allow random formats that might not play in browsers
const formats = ['mkv', 'avi', 'flv', 'mov']; // Many won't work in HTML5 video
```

**Why it's problematic**: Creates playback compatibility issues, inconsistent user experience

**Better approach**:

```typescript
// DO: Standardize on web-compatible formats
const preferredFormats = 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]'; // Ensure MP4 output
```

## Validation & Testing

### 1. YouTube Integration Testing

**Real YouTube download testing**:

```typescript
// tests/youtube/integration.test.ts
describe('YouTube Integration', () => {
  test('downloads real YouTube video successfully', async () => {
    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Rick Roll for testing

    const jobId = await youtubeService.queueDownload(testUrl, {
      quality: '720p',
      category: 'youtube',
      profileId: 'test-profile',
    });

    expect(jobId).toBeTruthy();

    // Wait for download completion (with timeout)
    await waitForDownload(jobId, 120000); // 2 minute timeout

    const job = youtubeService.getJob(jobId);
    expect(job.status).toBe('completed');
    expect(job.outputPath).toBeTruthy();

    // Verify file exists and is playable
    const stats = await fs.stat(job.outputPath);
    expect(stats.size).toBeGreaterThan(0);
  });

  test('handles geo-blocked content gracefully', async () => {
    const blockedUrl = 'https://www.youtube.com/watch?v=BLOCKED_VIDEO';

    await expect(youtubeService.queueDownload(blockedUrl)).rejects.toThrow(
      /not available in your region|geo.?blocked/i
    );
  });
});
```

### 2. Download Queue Management Testing

**Queue processing and concurrency testing**:

```typescript
describe('Download Queue Management', () => {
  test('processes queue with concurrency limits', async () => {
    const urls = [
      'https://youtube.com/watch?v=test1',
      'https://youtube.com/watch?v=test2',
      'https://youtube.com/watch?v=test3',
      'https://youtube.com/watch?v=test4',
      'https://youtube.com/watch?v=test5',
    ];

    // Queue multiple downloads
    const jobIds = await Promise.all(urls.map(url => youtubeService.queueDownload(url)));

    expect(jobIds).toHaveLength(5);

    // Verify concurrent download limit respected
    const status = youtubeService.getQueueStatus();
    expect(status.downloading).toBeLessThanOrEqual(3); // Max concurrent limit
    expect(status.queued + status.downloading).toBe(5);
  });
});
```

### 3. Content Integration Testing

**Library integration and metadata testing**:

```typescript
describe('Content Integration', () => {
  test('downloaded content integrates with video library', async () => {
    const jobId = await youtubeService.queueDownload(testUrl, {
      category: 'educational',
    });

    await waitForDownload(jobId);

    // Verify video appears in library
    const videos = await videoLibrary.getVideosByCategory('educational');
    const downloadedVideo = videos.find(v => v.source === testUrl);

    expect(downloadedVideo).toBeTruthy();
    expect(downloadedVideo.metadata.title).toBeTruthy();
    expect(downloadedVideo.thumbnail).toBeTruthy();
  });
});
```

## Success Metrics

### Download Performance Metrics

- **Queue Processing Speed**: Average time from URL submission to download start < 30 seconds
- **Download Success Rate**: > 95% of valid YouTube URLs download successfully
- **Concurrent Download Efficiency**: 3 simultaneous downloads without system performance degradation
- **Error Recovery Rate**: > 90% of network/temporary failures automatically retry successfully

### User Experience Metrics

- **URL-to-Library Time**: Complete workflow (paste URL → video ready in library) < 5 minutes for typical content
- **One-Click Success Rate**: > 90% of downloads succeed with default settings (no user configuration needed)
- **Progress Clarity**: Users always know download status and time estimates within 10% accuracy
- **Error Communication**: 100% of failed downloads provide clear, actionable error messages

### Content Quality Metrics

- **Format Consistency**: 100% of downloads produce web-playable MP4 files
- **Metadata Completeness**: > 95% of downloads include title, description, and thumbnail
- **Category Accuracy**: > 85% of automatic category suggestions are appropriate
- **Integration Success**: 100% of completed downloads appear correctly in video library

## Integration Points

### Backend Integration

- **Video Library Service**: Automatic integration of downloaded content with existing library scanning
- **Metadata Service**: Seamless metadata generation and storage for downloaded content
- **File Organization**: Integration with existing category-based directory structure

### Frontend Integration

- **Admin Interface**: YouTube downloader integrated into existing admin panel navigation
- **Video Library**: Downloaded content appears alongside existing videos with consistent UI
- **Progress Tracking**: Download progress integrates with existing progress tracking systems

### Infrastructure Integration

- **Docker**: yt-dlp binary and dependencies included in existing container setup
- **Storage**: Downloads respect existing media directory structure and permissions
- **Monitoring**: Download metrics integrate with existing system monitoring and logging

---

**Implementation Priority**: This PRP should be implemented early in Phase 5 as it provides the core content acquisition functionality that enables the self-hosted media center to grow beyond manually uploaded content. YouTube integration is often the primary feature users expect from a modern media center.

**Next PRP Dependencies**: PRP-5.2 (File Operations) builds on download management for organizing content, PRP-5.3 (System Monitoring) tracks download system performance and storage usage.
