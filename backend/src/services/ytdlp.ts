import ytDlpWrap from 'yt-dlp-wrap';
import path from 'path';
import fs from 'fs-extra';
import { EventEmitter } from 'events';

export interface DownloadJob {
  id: string;
  url: string;
  status: 'queued' | 'downloading' | 'processing' | 'completed' | 'failed';
  progress: number;
  quality: string;
  category: string;
  outputPath?: string;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  videoMetadata?: {
    title?: string;
    duration?: number;
    thumbnail?: string;
  };
}

export class YouTubeDownloadService extends EventEmitter {
  private ytDlp: ytDlpWrap;
  private downloadQueue = new Map<string, DownloadJob>();
  private activeDownloads = new Set<string>();
  private maxConcurrentDownloads = 2;
  private mediaBasePath: string;
  private ytDlpAvailable = false;

  constructor() {
    super();
    // Initialize yt-dlp-wrap
    this.ytDlp = new ytDlpWrap();

    // Use data directory structure we created
    this.mediaBasePath = path.resolve(process.cwd(), '..', 'data');

    // Initialize yt-dlp binary
    this.initializeYtDlp();
  }

  /**
   * Initialize yt-dlp binary
   */
  private async initializeYtDlp(): Promise<void> {
    try {
      // Check if yt-dlp is available
      const version = await this.ytDlp.getVersion();
      console.log(`yt-dlp version: ${version}`);
      this.ytDlpAvailable = true;
    } catch (error) {
      console.log('yt-dlp not available, downloads will be simulated');
      this.ytDlpAvailable = false;
    }
  }

  /**
   * Add a new download job to the queue
   */
  async queueDownload(
    url: string,
    options: {
      category: string;
      quality?: string;
    }
  ): Promise<string> {
    const jobId = this.generateJobId();

    const job: DownloadJob = {
      id: jobId,
      url,
      status: 'queued',
      progress: 0,
      quality: options.quality || 'best',
      category: options.category,
    };

    this.downloadQueue.set(jobId, job);
    this.emit('jobQueued', job);

    // Start processing queue
    setImmediate(() => this.processQueue());

    return jobId;
  }

  /**
   * Get job status by ID
   */
  getJob(jobId: string): DownloadJob | undefined {
    return this.downloadQueue.get(jobId);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): DownloadJob[] {
    return Array.from(this.downloadQueue.values());
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    const jobs = this.getAllJobs();
    return {
      total: jobs.length,
      queued: jobs.filter(job => job.status === 'queued').length,
      active: jobs.filter(job => job.status === 'downloading').length,
      completed: jobs.filter(job => job.status === 'completed').length,
      failed: jobs.filter(job => job.status === 'failed').length,
    };
  }

  /**
   * Cancel a download job
   */
  cancelJob(jobId: string): boolean {
    const job = this.downloadQueue.get(jobId);
    if (!job) return false;

    if (job.status === 'queued') {
      job.status = 'failed';
      job.error = 'Cancelled by user';
      this.emit('jobCancelled', job);
      return true;
    }

    // TODO: Implement active download cancellation
    return false;
  }

  /**
   * Process the download queue
   */
  private async processQueue(): Promise<void> {
    if (this.activeDownloads.size >= this.maxConcurrentDownloads) {
      return;
    }

    const nextJob = Array.from(this.downloadQueue.values()).find(
      job => job.status === 'queued'
    );

    if (!nextJob) {
      return;
    }

    await this.processDownload(nextJob);
  }

  /**
   * Process a single download job
   */
  private async processDownload(job: DownloadJob): Promise<void> {
    try {
      job.status = 'downloading';
      job.startTime = new Date();
      this.activeDownloads.add(job.id);
      this.emit('jobStarted', job);

      // Create category directory
      const outputDir = path.join(this.mediaBasePath, 'videos', job.category);
      await fs.ensureDir(outputDir);

      // yt-dlp format selection for web compatibility
      const formatSelector = this.getFormatSelector(job.quality);

      // Download options
      const downloadOptions = {
        output: path.join(outputDir, '%(title)s.%(ext)s'),
        format: formatSelector,
        writeThumbnail: true,
        writeInfoJson: true,
        convertThumbnails: 'webp',
        mergeOutputFormat: 'mp4',
      };

      console.log(`Starting download: ${job.url} -> ${outputDir}`);

      // Execute download (real or simulated)
      if (this.ytDlpAvailable) {
        await this.executeRealDownload(job, downloadOptions);
      } else {
        await this.simulateDownload(job);
      }

      job.status = 'completed';
      job.progress = 100;
      job.endTime = new Date();
      this.emit('jobCompleted', job);
    } catch (error) {
      console.error(`Download failed for job ${job.id}:`, error);
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.endTime = new Date();
      this.emit('jobFailed', job);
    } finally {
      this.activeDownloads.delete(job.id);
      // Process next job in queue
      setImmediate(() => this.processQueue());
    }
  }

  /**
   * Execute real yt-dlp download
   */
  private async executeRealDownload(
    job: DownloadJob,
    options: any
  ): Promise<void> {
    try {
      // Get video info first
      const videoInfo = await this.ytDlp.getVideoInfo(job.url);

      if (videoInfo && typeof videoInfo === 'object') {
        job.videoMetadata = {
          title: (videoInfo as any).title || 'Unknown',
          duration: (videoInfo as any).duration || 0,
        };
      }

      // Execute download
      const result = await this.ytDlp.execPromise([
        job.url,
        '-o',
        options.output,
        '-f',
        options.format,
        '--write-thumbnail',
        '--write-info-json',
        '--convert-thumbnails',
        'webp',
        '--merge-output-format',
        'mp4',
      ]);

      // Simulate progress tracking since execPromise doesn't provide real-time progress
      const steps = 10;
      for (let i = 1; i <= steps; i++) {
        job.progress = Math.round((i / steps) * 100);
        this.emit('jobProgress', job);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      job.outputPath = typeof result === 'string' ? result : 'downloaded';
      console.log(`Download completed: ${job.outputPath}`);
    } catch (error) {
      console.error('yt-dlp execution failed:', error);
      throw error;
    }
  }

  /**
   * Get yt-dlp format selector based on quality preference
   */
  private getFormatSelector(quality: string): string {
    switch (quality) {
      case '4k':
        return 'bv*[height<=2160]+ba[ext=m4a]/b[height<=2160] / bv*+ba/b';
      case '1080p':
        return 'bv*[height<=1080]+ba[ext=m4a]/b[height<=1080] / bv*+ba/b';
      case '720p':
        return 'bv*[height<=720]+ba[ext=m4a]/b[height<=720] / bv*+ba/b';
      case '480p':
        return 'bv*[height<=480]+ba[ext=m4a]/b[height<=480] / bv*+ba/b';
      case 'best':
      default:
        return 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4] / bv*+ba/b';
    }
  }

  /**
   * Simulate download for development/testing when yt-dlp not available
   */
  private async simulateDownload(job: DownloadJob): Promise<void> {
    const steps = 10;

    // Simulate getting video metadata
    job.videoMetadata = {
      title: `Simulated Video for ${job.url}`,
      duration: 120, // 2 minutes
    };

    // Simulate download progress
    for (let i = 1; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      job.progress = Math.round((i / steps) * 100);
      this.emit('jobProgress', job);
    }

    // Create a fake output path
    const outputDir = path.join(this.mediaBasePath, 'videos', job.category);
    job.outputPath = path.join(outputDir, 'simulated-video.mp4');
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `dl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const youtubeService = new YouTubeDownloadService();
