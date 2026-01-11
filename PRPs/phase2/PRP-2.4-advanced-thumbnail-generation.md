# PRP-2.4: Advanced Thumbnail Generation System

## Purpose & Core Principles

### Purpose

Transform SOFATHEK's basic thumbnail system into a comprehensive visual preview engine that generates intelligent, context-aware thumbnails including timeline strips, scene detection, chapter markers, and animated previews that help families quickly identify and preview content before watching.

### Philosophy: Visual Storytelling Through Frames

Before generating thumbnails, ask:

- How can visual previews help families choose content faster?
- What frame selection best represents the video's content?
- How do we balance preview quality with storage efficiency?
- What thumbnail types serve different browsing contexts?

### Core Principles

1. **Intelligent Frame Selection**: Use scene analysis to pick representative frames, not random timestamps
2. **Multi-Purpose Thumbnails**: Generate different thumbnail types for different UI contexts
3. **Storage Efficiency**: Smart compression and caching to minimize disk usage
4. **Processing Speed**: Prioritize fast generation for immediate user feedback
5. **Family Safety**: Ensure thumbnail content is appropriate for all profile types

## Gap Analysis: Current vs. Target State

### Current State (What Works)

✅ **Basic thumbnail generation** using ffmpeg at fixed timestamp
✅ **Single poster-style thumbnail** per video file
✅ **Simple caching mechanism** to avoid regeneration
✅ **Integration with video scanner** for automated generation

### Critical Gaps (What's Missing)

❌ **Timeline Strips** - No way to preview video content across its duration
❌ **Scene Detection** - Thumbnails taken at arbitrary timestamps, may miss key content
❌ **Multiple Thumbnail Types** - Only one thumbnail size/style available
❌ **Chapter Markers** - No visual indication of video structure or segments
❌ **Animated Previews** - No GIF-style previews for better content understanding
❌ **Smart Frame Selection** - Current system may capture black screens, credits, or poor frames
❌ **Context-Aware Generation** - Same thumbnail approach for all content types
❌ **Quality Optimization** - No adaptive quality based on content or device

### User Impact of Gaps

- **Poor Preview Quality**: Users can't get a good sense of video content from single thumbnail
- **Inefficient Browsing**: Must open videos to understand content, slowing discovery
- **Missed Content**: Good videos with poor thumbnails get overlooked
- **No Quick Navigation**: Can't visually scrub through video without playing it

## Implementation Strategy

### Phase 1: Intelligent Frame Analysis Engine

#### 1.1 Scene Detection and Frame Analysis

```typescript
// backend/src/services/thumbnails/sceneAnalyzer.ts
export class SceneAnalyzer {
  private ffprobePath: string;
  private ffmpegPath: string;

  async analyzeVideoScenes(videoPath: string): Promise<SceneAnalysis> {
    try {
      // Extract scene changes using FFmpeg's scene detection
      const sceneChanges = await this.detectSceneChanges(videoPath);

      // Analyze frame quality and content
      const frameAnalysis = await this.analyzeFrameQuality(videoPath, sceneChanges);

      // Detect chapters if available in metadata
      const chapters = await this.extractChapters(videoPath);

      // Generate timeline analysis
      const timeline = await this.createTimeline(videoPath, sceneChanges, chapters);

      return {
        duration: timeline.duration,
        sceneChanges,
        chapters,
        timeline,
        frameAnalysis,
        recommendedThumbnails: this.selectBestThumbnailTimestamps(frameAnalysis, timeline),
      };
    } catch (error) {
      console.error('Scene analysis failed:', error);
      throw new Error(`Scene analysis failed: ${error.message}`);
    }
  }

  private async detectSceneChanges(videoPath: string): Promise<SceneChange[]> {
    const command = [
      this.ffmpegPath,
      '-i',
      videoPath,
      '-vf',
      'select=gt(scene\\,0.3)',
      '-vsync',
      'vfr',
      '-f',
      'null',
      '-',
    ];

    const result = await this.executeCommand(command);

    // Parse scene change timestamps from FFmpeg output
    const sceneRegex = /frame:\s*\d+\s+fps=[\d\.]+\s+q=[\d\.-]+\s+size=\s*\d+kB\s+time=(\d{2}:\d{2}:\d{2}\.\d{2})/g;
    const scenes: SceneChange[] = [];
    let match;

    while ((match = sceneRegex.exec(result.stderr)) !== null) {
      const timestamp = this.parseTimestamp(match[1]);
      scenes.push({
        timestamp,
        confidence: 0.8, // Default confidence for scene detection
        type: 'scene_change',
      });
    }

    return scenes;
  }

  private async analyzeFrameQuality(videoPath: string, sceneChanges: SceneChange[]): Promise<FrameQuality[]> {
    const framesToAnalyze = this.selectAnalysisFrames(sceneChanges);
    const frameQualities: FrameQuality[] = [];

    for (const frameTime of framesToAnalyze) {
      try {
        // Extract frame for analysis
        const frameData = await this.extractFrame(videoPath, frameTime);

        // Analyze frame content
        const quality = await this.assessFrameQuality(frameData, frameTime);
        frameQualities.push(quality);
      } catch (error) {
        console.warn(`Failed to analyze frame at ${frameTime}:`, error.message);
      }
    }

    return frameQualities.sort((a, b) => b.score - a.score);
  }

  private async assessFrameQuality(frameBuffer: Buffer, timestamp: number): Promise<FrameQuality> {
    const sharp = require('sharp');

    try {
      const image = sharp(frameBuffer);
      const { width, height } = await image.metadata();

      // Calculate various quality metrics
      const stats = await image.stats();

      // Brightness analysis (avoid too dark or too bright frames)
      const avgBrightness = (stats.channels[0].mean + stats.channels[1].mean + stats.channels[2].mean) / 3;
      const brightnessScore = this.calculateBrightnessScore(avgBrightness);

      // Contrast analysis (avoid low contrast frames)
      const contrast = Math.max(stats.channels[0].stdev, stats.channels[1].stdev, stats.channels[2].stdev);
      const contrastScore = this.calculateContrastScore(contrast);

      // Detect black frames, fade-ins, credits, etc.
      const contentScore = await this.calculateContentScore(image, stats);

      // Face detection bonus (frames with faces are often good thumbnails)
      const faceScore = await this.detectFaces(frameBuffer);

      // Overall quality score
      const totalScore = brightnessScore * 0.3 + contrastScore * 0.3 + contentScore * 0.3 + faceScore * 0.1;

      return {
        timestamp,
        score: Math.min(totalScore, 1.0),
        brightness: avgBrightness,
        contrast,
        width,
        height,
        hasContent: contentScore > 0.5,
        hasFaces: faceScore > 0.1,
        isBlackFrame: avgBrightness < 10 && contrast < 5,
        metadata: {
          brightnessScore,
          contrastScore,
          contentScore,
          faceScore,
        },
      };
    } catch (error) {
      console.warn(`Frame quality assessment failed:`, error);
      return {
        timestamp,
        score: 0.1,
        brightness: 0,
        contrast: 0,
        width: 0,
        height: 0,
        hasContent: false,
        hasFaces: false,
        isBlackFrame: true,
        metadata: {},
      };
    }
  }

  private calculateBrightnessScore(brightness: number): number {
    // Optimal brightness range is 30-200 (out of 255)
    if (brightness < 10 || brightness > 240) return 0.1; // Too dark or too bright
    if (brightness < 30 || brightness > 200) return 0.5; // Suboptimal
    return 1.0; // Good brightness
  }

  private calculateContrastScore(contrast: number): number {
    // Higher contrast usually means more interesting content
    if (contrast < 5) return 0.1; // Very low contrast (likely black/fade)
    if (contrast < 15) return 0.5; // Low contrast
    if (contrast > 100) return 0.8; // High contrast (good)
    return contrast / 100; // Scale linearly
  }

  private async calculateContentScore(image: any, stats: any): Promise<number> {
    // Detect if frame has meaningful content vs. black/fade/credits
    const { channels } = stats;

    // Check for black frames
    const avgValue = (channels[0].mean + channels[1].mean + channels[2].mean) / 3;
    if (avgValue < 10) return 0.1;

    // Check for fade frames (very uniform color)
    const colorVariation = Math.max(
      Math.abs(channels[0].mean - channels[1].mean),
      Math.abs(channels[1].mean - channels[2].mean),
      Math.abs(channels[0].mean - channels[2].mean)
    );

    if (colorVariation < 5) return 0.3; // Likely fade or uniform color

    // Simple edge detection to assess content complexity
    try {
      const edges = await image
        .clone()
        .greyscale()
        .convolve({
          width: 3,
          height: 3,
          kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
        })
        .stats();

      const edgeIntensity = edges.channels[0].mean;
      return Math.min(edgeIntensity / 50, 1.0); // Normalize edge intensity
    } catch (error) {
      return 0.5; // Default content score if edge detection fails
    }
  }

  private selectBestThumbnailTimestamps(
    frameAnalysis: FrameQuality[],
    timeline: VideoTimeline
  ): ThumbnailRecommendation[] {
    const recommendations: ThumbnailRecommendation[] = [];

    // Primary thumbnail (best overall frame)
    const bestFrame = frameAnalysis.filter(f => f.hasContent && !f.isBlackFrame).sort((a, b) => b.score - a.score)[0];

    if (bestFrame) {
      recommendations.push({
        timestamp: bestFrame.timestamp,
        type: 'primary',
        confidence: bestFrame.score,
        reason: 'highest_quality_frame',
      });
    }

    // Timeline strip frames (evenly distributed high-quality frames)
    const stripFrames = this.selectTimelineStripFrames(frameAnalysis, timeline, 10);
    stripFrames.forEach(frame => {
      recommendations.push({
        timestamp: frame.timestamp,
        type: 'timeline_strip',
        confidence: frame.score,
        reason: 'timeline_distribution',
      });
    });

    // Chapter thumbnails (if chapters exist)
    if (timeline.chapters) {
      timeline.chapters.forEach(chapter => {
        const chapterFrame = this.findBestFrameNearTimestamp(frameAnalysis, chapter.startTime, 30);
        if (chapterFrame) {
          recommendations.push({
            timestamp: chapterFrame.timestamp,
            type: 'chapter',
            confidence: chapterFrame.score,
            reason: 'chapter_marker',
            metadata: { chapterTitle: chapter.title },
          });
        }
      });
    }

    return recommendations;
  }
}

interface SceneAnalysis {
  duration: number;
  sceneChanges: SceneChange[];
  chapters?: Chapter[];
  timeline: VideoTimeline;
  frameAnalysis: FrameQuality[];
  recommendedThumbnails: ThumbnailRecommendation[];
}

interface SceneChange {
  timestamp: number;
  confidence: number;
  type: 'scene_change' | 'fade' | 'cut';
}

interface FrameQuality {
  timestamp: number;
  score: number; // 0-1, higher is better
  brightness: number;
  contrast: number;
  width: number;
  height: number;
  hasContent: boolean;
  hasFaces: boolean;
  isBlackFrame: boolean;
  metadata: Record<string, any>;
}

interface ThumbnailRecommendation {
  timestamp: number;
  type: 'primary' | 'timeline_strip' | 'chapter' | 'animated_preview';
  confidence: number;
  reason: string;
  metadata?: Record<string, any>;
}
```

#### 1.2 Multi-Type Thumbnail Generator

```typescript
// backend/src/services/thumbnails/thumbnailGenerator.ts
export class AdvancedThumbnailGenerator {
  private outputDir: string;
  private cacheDir: string;

  constructor(config: ThumbnailConfig) {
    this.outputDir = config.outputDir;
    this.cacheDir = config.cacheDir;
  }

  async generateAllThumbnails(videoPath: string, videoId: string, analysis: SceneAnalysis): Promise<ThumbnailSet> {
    const thumbnailSet: ThumbnailSet = {
      videoId,
      primary: null,
      timelineStrip: null,
      chapters: [],
      animatedPreview: null,
      generatedAt: new Date(),
      metadata: {
        totalFrames: analysis.frameAnalysis.length,
        scenesAnalyzed: analysis.sceneChanges.length,
        quality: 'high',
      },
    };

    // Generate primary thumbnail
    const primaryRecommendation = analysis.recommendedThumbnails.find(r => r.type === 'primary');
    if (primaryRecommendation) {
      thumbnailSet.primary = await this.generatePrimaryThumbnail(videoPath, videoId, primaryRecommendation.timestamp);
    }

    // Generate timeline strip
    const timelineRecommendations = analysis.recommendedThumbnails.filter(r => r.type === 'timeline_strip');
    if (timelineRecommendations.length > 0) {
      thumbnailSet.timelineStrip = await this.generateTimelineStrip(
        videoPath,
        videoId,
        timelineRecommendations.map(r => r.timestamp),
        analysis.timeline
      );
    }

    // Generate chapter thumbnails
    const chapterRecommendations = analysis.recommendedThumbnails.filter(r => r.type === 'chapter');
    for (const chapterRec of chapterRecommendations) {
      const chapterThumb = await this.generateChapterThumbnail(
        videoPath,
        videoId,
        chapterRec.timestamp,
        chapterRec.metadata?.chapterTitle || `Chapter ${thumbnailSet.chapters.length + 1}`
      );
      thumbnailSet.chapters.push(chapterThumb);
    }

    // Generate animated preview (optional, for high-priority videos)
    if (analysis.duration > 300 && analysis.duration < 7200) {
      // 5 min to 2 hours
      thumbnailSet.animatedPreview = await this.generateAnimatedPreview(
        videoPath,
        videoId,
        timelineRecommendations.slice(0, 5).map(r => r.timestamp)
      );
    }

    return thumbnailSet;
  }

  async generatePrimaryThumbnail(videoPath: string, videoId: string, timestamp: number): Promise<ThumbnailFile> {
    const outputPath = path.join(this.outputDir, 'primary', `${videoId}_primary.jpg`);

    // Generate multiple sizes for different UI contexts
    const sizes = [
      { name: 'large', width: 400, height: 600, quality: 90 },
      { name: 'medium', width: 200, height: 300, quality: 85 },
      { name: 'small', width: 100, height: 150, quality: 80 },
    ];

    const generatedSizes: Record<string, string> = {};

    for (const size of sizes) {
      const sizedOutputPath = outputPath.replace('.jpg', `_${size.name}.jpg`);

      await this.extractAndResizeFrame(videoPath, timestamp, sizedOutputPath, {
        width: size.width,
        height: size.height,
        quality: size.quality,
      });

      generatedSizes[size.name] = sizedOutputPath;
    }

    return {
      type: 'primary',
      timestamp,
      files: generatedSizes,
      metadata: {
        aspectRatio: '2:3', // Poster style
        generatedAt: new Date(),
      },
    };
  }

  async generateTimelineStrip(
    videoPath: string,
    videoId: string,
    timestamps: number[],
    timeline: VideoTimeline
  ): Promise<ThumbnailFile> {
    const frameWidth = 160;
    const frameHeight = 90;
    const stripWidth = frameWidth * timestamps.length;
    const stripHeight = frameHeight;

    const outputPath = path.join(this.outputDir, 'timeline', `${videoId}_timeline.jpg`);

    // Generate individual frames
    const frameBuffers: Buffer[] = [];
    for (const timestamp of timestamps) {
      const frameBuffer = await this.extractFrameBuffer(videoPath, timestamp, {
        width: frameWidth,
        height: frameHeight,
      });
      frameBuffers.push(frameBuffer);
    }

    // Composite frames into strip
    const sharp = require('sharp');
    const strip = sharp({
      create: {
        width: stripWidth,
        height: stripHeight,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    });

    const composites = frameBuffers.map((buffer, index) => ({
      input: buffer,
      left: index * frameWidth,
      top: 0,
    }));

    await strip.composite(composites).jpeg({ quality: 85 }).toFile(outputPath);

    // Generate timeline metadata
    const timelineMetadata = timestamps.map((timestamp, index) => ({
      index,
      timestamp,
      percentage: (timestamp / timeline.duration) * 100,
      position: {
        x: index * frameWidth,
        width: frameWidth,
      },
    }));

    return {
      type: 'timeline_strip',
      timestamp: 0, // Not applicable for strips
      files: {
        strip: outputPath,
      },
      metadata: {
        frameCount: timestamps.length,
        frameWidth,
        frameHeight,
        timeline: timelineMetadata,
        generatedAt: new Date(),
      },
    };
  }

  async generateAnimatedPreview(videoPath: string, videoId: string, timestamps: number[]): Promise<ThumbnailFile> {
    const outputPath = path.join(this.outputDir, 'animated', `${videoId}_preview.gif`);
    const tempDir = path.join(this.cacheDir, 'animated', videoId);

    await fs.ensureDir(tempDir);

    try {
      // Extract frames
      const frameFiles: string[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        const frameFile = path.join(tempDir, `frame_${i.toString().padStart(3, '0')}.jpg`);
        await this.extractAndResizeFrame(videoPath, timestamps[i], frameFile, {
          width: 300,
          height: 169, // 16:9 aspect ratio
          quality: 75,
        });
        frameFiles.push(frameFile);
      }

      // Create animated GIF using FFmpeg
      const command = [
        this.ffmpegPath,
        '-framerate',
        '0.5', // 0.5 FPS (2 seconds per frame)
        '-pattern_type',
        'glob',
        '-i',
        path.join(tempDir, '*.jpg'),
        '-vf',
        'fps=0.5,scale=300:169:flags=lanczos',
        '-loop',
        '0', // Infinite loop
        outputPath,
      ];

      await this.executeCommand(command);

      return {
        type: 'animated_preview',
        timestamp: 0,
        files: {
          gif: outputPath,
        },
        metadata: {
          frameCount: timestamps.length,
          duration: timestamps.length * 2, // 2 seconds per frame
          fileSize: (await fs.stat(outputPath)).size,
          generatedAt: new Date(),
        },
      };
    } finally {
      // Cleanup temp files
      await fs.remove(tempDir);
    }
  }

  async generateChapterThumbnail(
    videoPath: string,
    videoId: string,
    timestamp: number,
    chapterTitle: string
  ): Promise<ChapterThumbnail> {
    const outputPath = path.join(this.outputDir, 'chapters', `${videoId}_chapter_${timestamp}.jpg`);

    await this.extractAndResizeFrame(videoPath, timestamp, outputPath, {
      width: 320,
      height: 180,
      quality: 85,
    });

    return {
      timestamp,
      title: chapterTitle,
      thumbnailPath: outputPath,
      metadata: {
        generatedAt: new Date(),
      },
    };
  }

  private async extractAndResizeFrame(
    videoPath: string,
    timestamp: number,
    outputPath: string,
    options: ResizeOptions
  ): Promise<void> {
    // First extract frame as raw data
    const frameBuffer = await this.extractFrameBuffer(videoPath, timestamp, options);

    // Process with Sharp for better quality and smaller file size
    const sharp = require('sharp');
    await sharp(frameBuffer)
      .resize(options.width, options.height, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({
        quality: options.quality,
        mozjpeg: true, // Better compression
      })
      .toFile(outputPath);
  }

  private async extractFrameBuffer(videoPath: string, timestamp: number, options: ResizeOptions): Promise<Buffer> {
    const command = [
      this.ffmpegPath,
      '-ss',
      this.formatTimestamp(timestamp),
      '-i',
      videoPath,
      '-vframes',
      '1',
      '-vf',
      `scale=${options.width}:${options.height}:force_original_aspect_ratio=increase,crop=${options.width}:${options.height}`,
      '-f',
      'image2pipe',
      '-vcodec',
      'mjpeg',
      'pipe:1',
    ];

    const result = await this.executeCommand(command, { encoding: null });
    return result.stdout;
  }
}

interface ThumbnailSet {
  videoId: string;
  primary: ThumbnailFile | null;
  timelineStrip: ThumbnailFile | null;
  chapters: ChapterThumbnail[];
  animatedPreview: ThumbnailFile | null;
  generatedAt: Date;
  metadata: {
    totalFrames: number;
    scenesAnalyzed: number;
    quality: 'high' | 'medium' | 'low';
  };
}

interface ThumbnailFile {
  type: 'primary' | 'timeline_strip' | 'animated_preview';
  timestamp: number;
  files: Record<string, string>; // size -> file path
  metadata: Record<string, any>;
}

interface ChapterThumbnail {
  timestamp: number;
  title: string;
  thumbnailPath: string;
  metadata: Record<string, any>;
}
```

### Phase 2: Smart Processing Pipeline

#### 2.1 Processing Queue and Prioritization

```typescript
// backend/src/services/thumbnails/processingQueue.ts
export class ThumbnailProcessingQueue {
  private queue: Queue;
  private sceneAnalyzer: SceneAnalyzer;
  private thumbnailGenerator: AdvancedThumbnailGenerator;

  constructor() {
    this.queue = new Queue('thumbnail-processing');
    this.sceneAnalyzer = new SceneAnalyzer();
    this.thumbnailGenerator = new AdvancedThumbnailGenerator(config.thumbnails);
    this.setupWorkers();
  }

  async queueThumbnailGeneration(
    videoId: string,
    videoPath: string,
    priority: ProcessingPriority = 'normal'
  ): Promise<string> {
    const jobId = crypto.randomUUID();

    await this.queue.add(
      'generate-thumbnails',
      {
        jobId,
        videoId,
        videoPath,
        priority,
        queuedAt: new Date(),
      },
      {
        priority: this.getPriorityValue(priority),
        attempts: 3,
        backoff: 'exponential',
        removeOnComplete: 10,
        removeOnFail: 5,
      }
    );

    return jobId;
  }

  async queueBatchProcessing(videos: Array<{ id: string; path: string }>): Promise<string> {
    const batchId = crypto.randomUUID();

    // Prioritize newer videos and shorter videos (faster processing)
    const sortedVideos = videos.sort((a, b) => {
      // Add prioritization logic here
      return 0;
    });

    for (const video of sortedVideos) {
      await this.queueThumbnailGeneration(video.id, video.path, 'batch');
    }

    return batchId;
  }

  private setupWorkers(): void {
    // Main thumbnail generation worker
    this.queue.process('generate-thumbnails', 2, async job => {
      const { jobId, videoId, videoPath, priority } = job.data;

      try {
        // Update progress
        await job.progress(10);

        // Analyze video scenes
        const analysis = await this.sceneAnalyzer.analyzeVideoScenes(videoPath);
        await job.progress(50);

        // Generate thumbnails
        const thumbnailSet = await this.thumbnailGenerator.generateAllThumbnails(videoPath, videoId, analysis);
        await job.progress(90);

        // Save thumbnail metadata
        await this.saveThumbnailMetadata(videoId, thumbnailSet);
        await job.progress(100);

        return {
          jobId,
          videoId,
          thumbnailSet,
          completedAt: new Date(),
        };
      } catch (error) {
        console.error(`Thumbnail generation failed for video ${videoId}:`, error);
        throw error;
      }
    });

    // Quick thumbnail generation (primary only)
    this.queue.process('generate-quick', 4, async job => {
      const { videoId, videoPath, timestamp } = job.data;

      const thumbnailFile = await this.thumbnailGenerator.generatePrimaryThumbnail(videoPath, videoId, timestamp);

      return {
        videoId,
        thumbnailFile,
        type: 'quick',
      };
    });
  }

  async getProcessingStats(): Promise<ProcessingStats> {
    const waiting = await this.queue.getWaiting();
    const active = await this.queue.getActive();
    const completed = await this.queue.getCompleted();
    const failed = await this.queue.getFailed();

    return {
      queued: waiting.length,
      processing: active.length,
      completed: completed.length,
      failed: failed.length,
      totalProcessed: completed.length + failed.length,
      successRate: (completed.length / (completed.length + failed.length)) * 100,
    };
  }

  private getPriorityValue(priority: ProcessingPriority): number {
    switch (priority) {
      case 'urgent':
        return 100;
      case 'high':
        return 50;
      case 'normal':
        return 10;
      case 'batch':
        return 1;
      default:
        return 5;
    }
  }
}

type ProcessingPriority = 'urgent' | 'high' | 'normal' | 'batch';

interface ProcessingStats {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  totalProcessed: number;
  successRate: number;
}
```

#### 2.2 Adaptive Quality and Storage Management

```typescript
// backend/src/services/thumbnails/storageManager.ts
export class ThumbnailStorageManager {
  private maxStorageSize: number;
  private compressionQuality: number = 85;

  constructor(config: StorageConfig) {
    this.maxStorageSize = config.maxStorageSize || 1024 * 1024 * 1024; // 1GB default
  }

  async optimizeStorage(): Promise<StorageOptimizationResult> {
    const currentUsage = await this.calculateStorageUsage();

    if (currentUsage.totalSize > this.maxStorageSize * 0.8) {
      // Storage is > 80% full, start optimization
      const result = await this.performStorageOptimization();
      return result;
    }

    return {
      optimized: false,
      reason: 'Storage usage within limits',
      currentUsage,
    };
  }

  private async performStorageOptimization(): Promise<StorageOptimizationResult> {
    const strategies: OptimizationStrategy[] = [
      'compress_animated_previews',
      'reduce_timeline_strips',
      'cleanup_old_thumbnails',
      'reduce_quality',
    ];

    let totalSaved = 0;
    const appliedStrategies: string[] = [];

    for (const strategy of strategies) {
      const saved = await this.applyOptimizationStrategy(strategy);
      if (saved > 0) {
        totalSaved += saved;
        appliedStrategies.push(strategy);
      }

      // Check if we've freed enough space
      const currentUsage = await this.calculateStorageUsage();
      if (currentUsage.totalSize < this.maxStorageSize * 0.6) {
        break;
      }
    }

    return {
      optimized: true,
      totalSaved,
      appliedStrategies,
      currentUsage: await this.calculateStorageUsage(),
    };
  }

  private async applyOptimizationStrategy(strategy: OptimizationStrategy): Promise<number> {
    let spaceFreed = 0;

    switch (strategy) {
      case 'compress_animated_previews':
        spaceFreed = await this.compressAnimatedPreviews();
        break;

      case 'reduce_timeline_strips':
        spaceFreed = await this.reduceTimelineStripQuality();
        break;

      case 'cleanup_old_thumbnails':
        spaceFreed = await this.cleanupOldThumbnails();
        break;

      case 'reduce_quality':
        spaceFreed = await this.reduceOverallQuality();
        break;
    }

    return spaceFreed;
  }

  private async compressAnimatedPreviews(): Promise<number> {
    const animatedDir = path.join(this.thumbnailDir, 'animated');
    let spaceFreed = 0;

    if (await fs.pathExists(animatedDir)) {
      const files = await fs.readdir(animatedDir);

      for (const file of files) {
        if (file.endsWith('.gif')) {
          const filePath = path.join(animatedDir, file);
          const originalSize = (await fs.stat(filePath)).size;

          // Re-compress GIF with lower quality
          await this.recompressGif(filePath, { quality: 60, colors: 128 });

          const newSize = (await fs.stat(filePath)).size;
          spaceFreed += originalSize - newSize;
        }
      }
    }

    return spaceFreed;
  }

  private async cleanupOldThumbnails(): Promise<number> {
    // Remove thumbnails for videos that no longer exist
    // Remove thumbnails older than 6 months with low access frequency

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 6);

    let spaceFreed = 0;
    const allThumbnails = await this.getAllThumbnailFiles();

    for (const thumbnail of allThumbnails) {
      const stats = await fs.stat(thumbnail.path);

      // Check if video still exists
      const videoExists = await this.checkVideoExists(thumbnail.videoId);

      // Check access frequency
      const accessCount = await this.getThumbnailAccessCount(thumbnail.videoId);

      if (!videoExists || (stats.mtime < cutoffDate && accessCount < 5)) {
        spaceFreed += stats.size;
        await fs.remove(thumbnail.path);
      }
    }

    return spaceFreed;
  }

  async generateAdaptiveQuality(
    videoPath: string,
    videoId: string,
    storageConstraints: StorageConstraints
  ): Promise<ThumbnailSet> {
    // Adapt thumbnail generation based on available storage and video characteristics

    const videoMetadata = await this.getVideoMetadata(videoPath);
    const availableSpace = await this.getAvailableStorage();

    let quality: ThumbnailQuality = 'high';
    let generateAnimated = true;
    let timelineFrameCount = 10;

    // Adapt based on storage constraints
    if (availableSpace < storageConstraints.lowSpaceThreshold) {
      quality = 'medium';
      generateAnimated = false;
      timelineFrameCount = 5;
    }

    // Adapt based on video characteristics
    if (videoMetadata.duration > 7200) {
      // > 2 hours
      generateAnimated = false; // Skip animated previews for long videos
    }

    if (videoMetadata.fileSize > 2 * 1024 * 1024 * 1024) {
      // > 2GB
      quality = 'medium'; // Use medium quality for large files
    }

    return await this.generateWithAdaptiveSettings({
      videoPath,
      videoId,
      quality,
      generateAnimated,
      timelineFrameCount,
    });
  }
}

type OptimizationStrategy =
  | 'compress_animated_previews'
  | 'reduce_timeline_strips'
  | 'cleanup_old_thumbnails'
  | 'reduce_quality';
type ThumbnailQuality = 'high' | 'medium' | 'low';

interface StorageOptimizationResult {
  optimized: boolean;
  reason?: string;
  totalSaved?: number;
  appliedStrategies?: string[];
  currentUsage: StorageUsage;
}

interface StorageUsage {
  totalSize: number;
  fileCount: number;
  breakdown: {
    primary: number;
    timelineStrips: number;
    chapters: number;
    animated: number;
  };
}
```

### Phase 3: API Integration and Frontend Support

#### 3.1 Enhanced Thumbnail API

```typescript
// backend/src/routes/thumbnails.ts
import express from 'express';
import { ThumbnailProcessingQueue } from '../services/thumbnails/processingQueue';
import { ThumbnailStorageManager } from '../services/thumbnails/storageManager';

const router = express.Router();
const processingQueue = new ThumbnailProcessingQueue();
const storageManager = new ThumbnailStorageManager(config.storage);

// Get thumbnails for a specific video
router.get('/videos/:id/thumbnails', async (req, res) => {
  try {
    const videoId = req.params.id;
    const type = req.query.type as string; // 'primary', 'timeline', 'chapters', 'animated'

    const thumbnailSet = await getThumbnailSet(videoId);

    if (!thumbnailSet) {
      // Queue thumbnail generation if none exist
      await processingQueue.queueThumbnailGeneration(videoId, await getVideoPath(videoId), 'high');

      return res.json({
        success: true,
        thumbnails: null,
        message: 'Thumbnail generation queued',
        generating: true,
      });
    }

    // Filter by type if specified
    const filteredThumbnails = type ? this.filterThumbnailsByType(thumbnailSet, type) : thumbnailSet;

    res.json({
      success: true,
      thumbnails: filteredThumbnails,
      generating: false,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get thumbnails',
      message: error.message,
    });
  }
});

// Get timeline strip for video scrubbing
router.get('/videos/:id/timeline', async (req, res) => {
  try {
    const videoId = req.params.id;
    const thumbnailSet = await getThumbnailSet(videoId);

    if (thumbnailSet?.timelineStrip) {
      // Serve timeline strip image
      const stripPath = thumbnailSet.timelineStrip.files.strip;

      res.json({
        success: true,
        timelineStrip: {
          imageUrl: `/api/thumbnails/serve/${path.basename(stripPath)}`,
          metadata: thumbnailSet.timelineStrip.metadata,
        },
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Timeline strip not available',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get timeline strip',
    });
  }
});

// Serve thumbnail files
router.get('/serve/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = await this.findThumbnailFile(filename);

    if (!filePath || !(await fs.pathExists(filePath))) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    // Set appropriate caching headers
    res.set({
      'Cache-Control': 'public, max-age=86400', // 24 hours
      ETag: await this.calculateETag(filePath),
    });

    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ error: 'Failed to serve thumbnail' });
  }
});

// Regenerate thumbnails for a video
router.post('/videos/:id/regenerate', async (req, res) => {
  try {
    const videoId = req.params.id;
    const priority = req.body.priority || 'normal';

    // Clear existing thumbnails
    await clearThumbnailCache(videoId);

    // Queue regeneration
    const jobId = await processingQueue.queueThumbnailGeneration(videoId, await getVideoPath(videoId), priority);

    res.json({
      success: true,
      jobId,
      message: 'Thumbnail regeneration queued',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to queue regeneration',
    });
  }
});

// Get processing statistics
router.get('/stats', async (req, res) => {
  try {
    const processingStats = await processingQueue.getProcessingStats();
    const storageStats = await storageManager.calculateStorageUsage();

    res.json({
      success: true,
      processing: processingStats,
      storage: storageStats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get stats',
    });
  }
});

// Batch regeneration
router.post('/regenerate/batch', async (req, res) => {
  try {
    const { videoIds, priority = 'batch' } = req.body;

    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'videoIds array required',
      });
    }

    const videos = [];
    for (const videoId of videoIds) {
      const videoPath = await getVideoPath(videoId);
      if (videoPath) {
        videos.push({ id: videoId, path: videoPath });
      }
    }

    const batchId = await processingQueue.queueBatchProcessing(videos);

    res.json({
      success: true,
      batchId,
      queuedVideos: videos.length,
      message: 'Batch thumbnail regeneration queued',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to queue batch regeneration',
    });
  }
});

export default router;
```

#### 3.2 Frontend Integration Hooks

```typescript
// frontend/src/hooks/useThumbnails.ts
export const useThumbnails = (videoId: string) => {
  const [thumbnails, setThumbnails] = useState<ThumbnailSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadThumbnails();
  }, [videoId]);

  const loadThumbnails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/thumbnails/videos/${videoId}/thumbnails`);
      const data = await response.json();

      if (data.success) {
        setThumbnails(data.thumbnails);
        setGenerating(data.generating);

        // Poll for updates if generating
        if (data.generating) {
          startPolling();
        }
      }
    } catch (error) {
      console.error('Failed to load thumbnails:', error);
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/thumbnails/videos/${videoId}/thumbnails`);
        const data = await response.json();

        if (data.success && !data.generating) {
          setThumbnails(data.thumbnails);
          setGenerating(false);
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Polling failed:', error);
        clearInterval(pollInterval);
      }
    }, 2000);

    // Cleanup after 5 minutes
    setTimeout(() => clearInterval(pollInterval), 300000);
  };

  const regenerateThumbnails = async (priority: 'high' | 'normal' = 'normal') => {
    try {
      await fetch(`/api/thumbnails/videos/${videoId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority }),
      });

      setGenerating(true);
      startPolling();
    } catch (error) {
      console.error('Failed to regenerate thumbnails:', error);
    }
  };

  return {
    thumbnails,
    loading,
    generating,
    regenerateThumbnails,
  };
};

// Timeline scrubbing hook
export const useTimelineScrubbing = (videoId: string) => {
  const [timelineData, setTimelineData] = useState(null);
  const [hoverTimestamp, setHoverTimestamp] = useState<number | null>(null);

  useEffect(() => {
    loadTimelineData();
  }, [videoId]);

  const loadTimelineData = async () => {
    try {
      const response = await fetch(`/api/thumbnails/videos/${videoId}/timeline`);
      const data = await response.json();

      if (data.success) {
        setTimelineData(data.timelineStrip);
      }
    } catch (error) {
      console.error('Failed to load timeline data:', error);
    }
  };

  const getTimestampFromPosition = (x: number, containerWidth: number) => {
    if (!timelineData?.metadata?.timeline) return null;

    const percentage = (x / containerWidth) * 100;
    const frame = timelineData.metadata.timeline.find((frame, index, arr) => {
      const nextFrame = arr[index + 1];
      return percentage >= frame.percentage && (!nextFrame || percentage < nextFrame.percentage);
    });

    return frame?.timestamp || null;
  };

  return {
    timelineData,
    hoverTimestamp,
    setHoverTimestamp,
    getTimestampFromPosition,
  };
};
```

## Validation Loops

### Level 1: Unit Testing

```typescript
// tests/services/thumbnails/sceneAnalyzer.test.ts
describe('SceneAnalyzer', () => {
  test('should detect scene changes', async () => {
    const analyzer = new SceneAnalyzer();
    const analysis = await analyzer.analyzeVideoScenes('./test-videos/sample.mp4');

    expect(analysis.sceneChanges.length).toBeGreaterThan(0);
    expect(analysis.frameAnalysis.length).toBeGreaterThan(0);
  });

  test('should filter out black frames', async () => {
    const analyzer = new SceneAnalyzer();
    const analysis = await analyzer.analyzeVideoScenes('./test-videos/with-blackframes.mp4');

    const blackFrames = analysis.frameAnalysis.filter(f => f.isBlackFrame);
    const goodFrames = analysis.frameAnalysis.filter(f => !f.isBlackFrame && f.hasContent);

    expect(goodFrames.length).toBeGreaterThan(blackFrames.length);
  });
});
```

### Level 2: Integration Testing

```bash
# Test thumbnail generation pipeline
npm run test:thumbnails:generation

# Test storage optimization
npm run test:thumbnails:storage

# Test processing queue
npm run test:thumbnails:queue

# Test frame quality assessment
npm run test:thumbnails:quality
```

### Level 3: Visual Quality Testing

- **Manual Review**: Sample 100 generated thumbnails for visual quality assessment
- **A/B Testing**: Compare old vs. new thumbnail system for user engagement
- **Performance Testing**: Measure generation speed vs. quality tradeoffs
- **Storage Testing**: Verify optimization strategies maintain acceptable quality

## Success Metrics

### Technical Performance

- **Generation Speed**: < 30 seconds for complete thumbnail set (2-hour video)
- **Storage Efficiency**: < 10MB storage per video for complete thumbnail set
- **Frame Quality**: > 85% of selected frames rated "good" or "excellent" by manual review
- **Processing Reliability**: < 2% failure rate for thumbnail generation jobs

### User Experience

- **Visual Appeal**: 60% improvement in content browsing engagement
- **Preview Accuracy**: Users correctly identify video content from thumbnails 90% of the time
- **Discovery Enhancement**: 40% increase in content exploration through better thumbnails
- **Load Performance**: Thumbnails load within 200ms for 95th percentile requests

### System Efficiency

- **Cache Hit Rate**: > 98% for repeated thumbnail requests
- **Queue Processing**: 95% of thumbnail jobs complete within 2 minutes
- **Storage Growth**: Thumbnail storage grows at < 5% rate relative to video library size
- **Resource Usage**: Thumbnail generation uses < 20% system CPU during batch processing

## Anti-Patterns to Avoid

❌ **Random Timestamp Selection**: Don't generate thumbnails at fixed intervals without scene analysis
**Why bad**: Results in poor quality thumbnails (black screens, transitions, credits)
**Better**: Use intelligent scene detection and frame quality assessment

❌ **Single Thumbnail Size**: Don't generate only one thumbnail resolution
**Why bad**: Poor performance on different devices and UI contexts
**Better**: Generate multiple sizes for different use cases (grid view, detail view, mobile)

❌ **Synchronous Processing**: Don't block video scanning waiting for thumbnail generation
**Why bad**: Slows down library discovery and makes system feel unresponsive
**Better**: Asynchronous background processing with progressive enhancement

❌ **Storage Waste**: Don't keep all generated thumbnails indefinitely
**Why bad**: Unlimited storage growth degrades system performance
**Better**: Implement intelligent cleanup and storage optimization

❌ **Quality Overkill**: Don't generate ultra-high quality thumbnails for all content
**Why bad**: Wastes storage and processing time for marginal quality gains
**Better**: Adaptive quality based on content characteristics and storage constraints

❌ **Missing Fallbacks**: Don't fail completely when advanced thumbnail generation fails
**Why bad**: Users lose all thumbnail functionality due to edge cases
**Better**: Graceful degradation to simple thumbnails when advanced processing fails

## Variation Guidance

**IMPORTANT**: Thumbnail generation should adapt to content type and system constraints.

**For Short Videos** (< 10 minutes):

- Skip animated previews
- Generate fewer timeline frames
- Focus on single best thumbnail
- Simpler processing pipeline

**For Long Content** (> 2 hours):

- Chapter-based thumbnails
- Extended timeline strips
- Skip animated previews
- More aggressive scene detection

**For Storage-Constrained Systems**:

- Lower quality settings
- Fewer thumbnail variants
- Aggressive cleanup policies
- Prioritize primary thumbnails only

**For High-Performance Systems**:

- Maximum quality settings
- Advanced scene analysis
- Animated previews for all content
- Extended timeline strips

## Remember

**Great thumbnails are the first impression of your content library.** The goal isn't to create the most technically sophisticated thumbnail system possible—it's to help families quickly identify and preview content through intelligent visual representation.

Smart thumbnail generation should work invisibly in the background, always improving the visual appeal of the library while respecting system resources and storage constraints. Focus on quality over quantity, and ensure thumbnails accurately represent content.

**SOFATHEK users should be able to identify any video in their library at a glance, just like browsing Netflix.**
