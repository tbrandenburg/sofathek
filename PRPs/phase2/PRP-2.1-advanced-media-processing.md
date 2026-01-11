---
name: "SOFATHEK Phase 2.1 - Advanced Media Processing Pipeline & Format Support"
description: |
  Enhance the existing ffmpeg-based media processing with advanced video format support, intelligent quality optimization, subtitle extraction, chapter detection, and multi-track audio handling while preserving all current functionality.

## Purpose

Transform the basic video processing capability into a comprehensive media pipeline supporting all major video formats, intelligent quality optimization, advanced metadata extraction, subtitle handling, and chapter detection for a professional media library experience.

## Core Principles

1. **Format Universality**: Support all common video formats with intelligent transcoding
2. **Quality Intelligence**: Automatic quality optimization based on content analysis
3. **Metadata Richness**: Extract maximum information from video files and streams
4. **Processing Efficiency**: Parallel processing and intelligent resource management
5. **Backwards Compatibility**: Preserve all existing video processing functionality

---

## Goal

Create a sophisticated media processing pipeline that automatically handles any video format, extracts comprehensive metadata including subtitles and chapters, optimizes quality for web streaming, and provides detailed processing progress while maintaining the current simple upload and processing workflow.

## Why

- **Format Limitations**: Current system only handles basic MP4/MKV formats efficiently
- **Quality Issues**: No intelligent quality optimization for different content types
- **Metadata Gaps**: Missing subtitle extraction, chapter detection, and multi-audio support
- **Processing Visibility**: No detailed progress tracking for complex media operations
- **Storage Efficiency**: No intelligent compression or format optimization
- **User Experience**: Limited metadata richness affects discovery and playback

## What

A comprehensive media processing enhancement that builds upon the existing ffmpeg integration:

### Advanced Format Support Matrix

```typescript
// Enhanced format support with intelligent handling
interface FormatSupport {
  input: {
    video: string[];
    audio: string[];
    containers: string[];
    subtitles: string[];
  };
  output: {
    web: VideoFormat;
    mobile: VideoFormat;
    archive: VideoFormat;
  };
  processing: {
    parallel: boolean;
    hardware: boolean;
    optimization: string;
  };
}

const ENHANCED_FORMAT_SUPPORT: FormatSupport = {
  input: {
    video: ['h264', 'h265', 'vp8', 'vp9', 'av1', 'mpeg2', 'mpeg4', 'xvid'],
    audio: ['aac', 'mp3', 'ac3', 'dts', 'flac', 'opus', 'vorbis'],
    containers: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp'],
    subtitles: ['srt', 'ass', 'vtt', 'sup', 'pgs', 'idx/sub', 'embedded'],
  },
  output: {
    web: { codec: 'h264', audio: 'aac', container: 'mp4', optimize: 'streaming' },
    mobile: { codec: 'h264', audio: 'aac', container: 'mp4', optimize: 'mobile' },
    archive: { codec: 'h265', audio: 'flac', container: 'mkv', optimize: 'quality' },
  },
  processing: {
    parallel: true,
    hardware: true, // GPU acceleration when available
    optimization: 'adaptive', // Based on content analysis
  },
};
```

### Intelligent Quality Optimization Engine

```typescript
export class MediaOptimizationService {
  async analyzeAndOptimize(videoPath: string): Promise<OptimizationPlan> {
    const analysis = await this.analyzeVideoContent(videoPath);

    return {
      inputAnalysis: analysis,
      optimizationStrategy: this.determineOptimizationStrategy(analysis),
      outputFormats: this.generateOutputFormats(analysis),
      processingSteps: this.createProcessingPipeline(analysis),
      estimatedTime: this.estimateProcessingTime(analysis),
      resourceRequirements: this.calculateResourceNeeds(analysis),
    };
  }

  private async analyzeVideoContent(videoPath: string): Promise<VideoAnalysis> {
    // Comprehensive content analysis
    const [technical, visual, audio] = await Promise.all([
      this.analyzeTechnicalProperties(videoPath),
      this.analyzeVisualContent(videoPath),
      this.analyzeAudioContent(videoPath),
    ]);

    return {
      technical: {
        duration: technical.duration,
        resolution: technical.resolution,
        fps: technical.fps,
        bitrate: technical.bitrate,
        codec: technical.codec,
        profile: technical.profile,
        level: technical.level,
      },
      visual: {
        complexity: visual.complexity, // Static, motion, mixed
        colorRange: visual.colorRange,
        dynamicRange: visual.dynamicRange, // SDR, HDR
        sceneChanges: visual.sceneChanges,
        textContent: visual.hasText, // For subtitle detection
      },
      audio: {
        tracks: audio.tracks,
        languages: audio.languages,
        quality: audio.quality,
        channels: audio.channels,
        commentary: audio.hasCommentary,
      },
      recommendations: this.generateOptimizationRecommendations(technical, visual, audio),
    };
  }

  private determineOptimizationStrategy(analysis: VideoAnalysis): OptimizationStrategy {
    // Content-aware optimization
    if (analysis.visual.complexity === 'high' && analysis.technical.resolution >= '1080p') {
      return {
        priority: 'quality',
        method: 'two-pass',
        targetBitrate: 'adaptive',
        hardwareAcceleration: true,
      };
    } else if (analysis.technical.duration > 3600) {
      // Long content
      return {
        priority: 'efficiency',
        method: 'single-pass',
        targetBitrate: 'fixed',
        hardwareAcceleration: true,
      };
    } else {
      return {
        priority: 'balanced',
        method: 'crf',
        targetBitrate: 'variable',
        hardwareAcceleration: false,
      };
    }
  }
}
```

### Advanced Metadata Extraction Pipeline

```typescript
export class AdvancedMetadataService extends MetadataService {
  async extractComprehensiveMetadata(videoPath: string): Promise<EnhancedVideoMetadata> {
    const baseMetadata = await super.extractMetadata(videoPath);

    // Enhanced metadata extraction
    const [subtitles, chapters, audioTracks, videoAnalysis] = await Promise.all([
      this.extractSubtitles(videoPath),
      this.detectChapters(videoPath),
      this.analyzeAudioTracks(videoPath),
      this.analyzeVideoProperties(videoPath),
    ]);

    return {
      ...baseMetadata,

      // Enhanced technical information
      technical: {
        ...baseMetadata.technical,
        colorSpace: videoAnalysis.colorSpace,
        dynamicRange: videoAnalysis.dynamicRange,
        frameRate: videoAnalysis.exactFrameRate,
        scanType: videoAnalysis.scanType, // Progressive, interlaced
        aspectRatio: videoAnalysis.aspectRatio,
        pixelFormat: videoAnalysis.pixelFormat,
      },

      // Audio track information
      audioTracks: audioTracks.map(track => ({
        index: track.index,
        language: track.language,
        codec: track.codec,
        channels: track.channels,
        sampleRate: track.sampleRate,
        bitrate: track.bitrate,
        title: track.title,
        isDefault: track.isDefault,
        isCommentary: track.isCommentary,
      })),

      // Subtitle information
      subtitles: subtitles.map(subtitle => ({
        index: subtitle.index,
        language: subtitle.language,
        codec: subtitle.codec,
        title: subtitle.title,
        forced: subtitle.forced,
        sdh: subtitle.sdh, // Hearing impaired
        extractedPath: subtitle.extractedPath,
      })),

      // Chapter information
      chapters: chapters.map(chapter => ({
        index: chapter.index,
        title: chapter.title,
        startTime: chapter.startTime,
        endTime: chapter.endTime,
        thumbnailPath: chapter.thumbnailPath,
      })),

      // Content analysis
      contentAnalysis: {
        complexity: videoAnalysis.complexity,
        motionLevel: videoAnalysis.motionLevel,
        sceneCount: videoAnalysis.sceneCount,
        hasText: videoAnalysis.hasText,
        hasLogo: videoAnalysis.hasLogo,
        contentType: this.classifyContentType(videoAnalysis),
        qualityMetrics: {
          sharpness: videoAnalysis.sharpness,
          noise: videoAnalysis.noise,
          compression: videoAnalysis.compressionArtifacts,
        },
      },
    };
  }

  private async extractSubtitles(videoPath: string): Promise<SubtitleTrack[]> {
    try {
      // Extract embedded subtitles
      const embeddedSubs = await this.ffmpegService.extractEmbeddedSubtitles(videoPath);

      // Look for external subtitle files
      const externalSubs = await this.findExternalSubtitles(videoPath);

      // Process and validate subtitles
      const allSubs = [...embeddedSubs, ...externalSubs];

      return Promise.all(
        allSubs.map(async sub => {
          const processed = await this.processSubtitleTrack(sub);
          return {
            ...sub,
            processed: processed.success,
            extractedPath: processed.outputPath,
            encoding: processed.encoding,
            lineCount: processed.lineCount,
            timingAccuracy: processed.timingAccuracy,
          };
        })
      );
    } catch (error) {
      console.warn(`Subtitle extraction failed for ${videoPath}:`, error);
      return [];
    }
  }

  private async detectChapters(videoPath: string): Promise<ChapterInfo[]> {
    try {
      // Extract embedded chapters
      const embeddedChapters = await this.ffmpegService.extractChapters(videoPath);

      // If no embedded chapters, try to auto-detect from content
      if (embeddedChapters.length === 0) {
        const autoChapters = await this.autoDetectChapters(videoPath);
        return autoChapters;
      }

      // Generate thumbnails for chapters
      return Promise.all(
        embeddedChapters.map(async chapter => {
          const thumbnailPath = await this.generateChapterThumbnail(videoPath, chapter.startTime, chapter.index);

          return {
            ...chapter,
            thumbnailPath,
            duration: chapter.endTime - chapter.startTime,
          };
        })
      );
    } catch (error) {
      console.warn(`Chapter detection failed for ${videoPath}:`, error);
      return [];
    }
  }
}
```

### Parallel Processing Engine

```typescript
export class ParallelProcessingService {
  private processingQueue: Bull.Queue;
  private maxConcurrentJobs: number;
  private hardwareCapabilities: HardwareInfo;

  constructor() {
    this.maxConcurrentJobs = this.detectOptimalConcurrency();
    this.hardwareCapabilities = this.detectHardwareCapabilities();
    this.setupProcessingQueue();
  }

  async processVideoInParallel(videoPath: string, options: ProcessingOptions): Promise<ProcessingJob[]> {
    const optimizationPlan = await this.mediaOptimizationService.analyzeAndOptimize(videoPath);

    // Create parallel processing jobs
    const jobs: ProcessingJobRequest[] = [
      {
        type: 'metadata-extraction',
        priority: 'high',
        input: videoPath,
        options: { comprehensive: true },
      },
      {
        type: 'thumbnail-generation',
        priority: 'medium',
        input: videoPath,
        options: {
          count: 10,
          chapters: true,
          timeline: true,
        },
      },
      {
        type: 'web-optimization',
        priority: 'high',
        input: videoPath,
        options: optimizationPlan.outputFormats.web,
      },
    ];

    // Add conditional jobs based on content analysis
    if (optimizationPlan.inputAnalysis.audio.tracks.length > 1) {
      jobs.push({
        type: 'audio-track-extraction',
        priority: 'low',
        input: videoPath,
        options: { extractAll: true },
      });
    }

    if (optimizationPlan.inputAnalysis.visual.textContent) {
      jobs.push({
        type: 'subtitle-extraction',
        priority: 'medium',
        input: videoPath,
        options: { autoDetect: true, ocr: true },
      });
    }

    // Queue all jobs and return tracking information
    return Promise.all(
      jobs.map(async jobRequest => {
        const job = await this.processingQueue.add(
          jobRequest.type,
          {
            ...jobRequest,
            videoId: this.generateVideoId(videoPath),
            timestamp: Date.now(),
          },
          {
            priority: this.getPriorityLevel(jobRequest.priority),
            delay: this.calculateOptimalDelay(jobRequest.type),
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
          }
        );

        return {
          jobId: job.id,
          type: jobRequest.type,
          status: 'queued',
          priority: jobRequest.priority,
          estimatedDuration: this.estimateJobDuration(jobRequest),
        };
      })
    );
  }

  private async setupProcessingQueue(): Promise<void> {
    // Metadata extraction processor
    this.processingQueue.process('metadata-extraction', 2, async job => {
      const { input, options, videoId } = job.data;

      job.progress(10);
      const metadata = await this.advancedMetadataService.extractComprehensiveMetadata(input);

      job.progress(50);
      await this.storeEnhancedMetadata(videoId, metadata);

      job.progress(100);
      return { metadata, videoId };
    });

    // Thumbnail generation processor
    this.processingQueue.process('thumbnail-generation', 3, async job => {
      const { input, options, videoId } = job.data;

      job.progress(20);
      const thumbnails = await this.generateAdvancedThumbnails(input, options);

      job.progress(80);
      await this.storeThumbnails(videoId, thumbnails);

      job.progress(100);
      return { thumbnails: thumbnails.length, videoId };
    });

    // Web optimization processor (hardware accelerated)
    this.processingQueue.process('web-optimization', 1, async job => {
      const { input, options, videoId } = job.data;

      const optimizer = this.hardwareCapabilities.hasGPU ? this.createGPUOptimizer() : this.createCPUOptimizer();

      return await optimizer.optimizeForWeb(input, options, progress => {
        job.progress(progress);
      });
    });
  }
}
```

### Success Criteria

- [ ] **Format Support**: 95%+ of uploaded videos processed successfully regardless of format
- [ ] **Processing Speed**: 50% faster processing through parallel pipeline execution
- [ ] **Metadata Quality**: 90%+ of videos have comprehensive metadata including subtitles/chapters
- [ ] **Quality Optimization**: Automated quality settings reduce file size by 30% while maintaining visual quality
- [ ] **Hardware Utilization**: GPU acceleration used when available, CPU scaling optimized
- [ ] **Error Recovery**: 99% successful processing with intelligent fallback handling
- [ ] **Progress Tracking**: Real-time progress updates for all processing operations
- [ ] **Backwards Compatibility**: All existing video processing APIs work identically

## All Needed Context

### Current Processing Analysis

```yaml
# Existing capabilities (to preserve and enhance)
working_features:
  - Basic ffmpeg metadata extraction
  - Simple thumbnail generation (single image)
  - MP4/MKV format handling
  - File size and duration detection
  - Category-based organization

# Enhancement opportunities
gaps:
  - Limited format support (only basic containers)
  - No subtitle extraction or chapter detection
  - Single-threaded processing (slow for large files)
  - Basic thumbnail generation (no timeline or chapters)
  - No quality optimization or content analysis
  - Missing multi-audio track support
  - No hardware acceleration utilization
```

### Enhanced Dependencies

```yaml
media_processing:
  - ffmpeg: '^6.1.0' # Latest version with improved codecs
  - ffprobe-static: '^3.1.0' # Static ffprobe binary
  - sharp: '^0.33.0' # Enhanced image processing for thumbnails
  - node-ffmpeg: '^0.6.2' # Advanced ffmpeg Node.js wrapper
  - subtitle-parser: '^2.1.0' # Subtitle format parsing and conversion

hardware_acceleration:
  - nvidia-ml-py: '^12.535.0' # GPU detection and management
  - intel-quick-sync: '^1.2.0' # Intel hardware acceleration
  - vaapi-utils: '^2.1.0' # Linux hardware acceleration

analysis_tools:
  - opencv4nodejs: '^5.6.0' # Computer vision for content analysis
  - audio-analyzer: '^1.4.0' # Audio content analysis
  - video-complexity: '^2.0.1' # Video complexity measurement
```

### File Structure Enhancement

```yaml
# New processing services
backend/src/services/
├── media/
│   ├── advancedMetadata.ts      # Comprehensive metadata extraction
│   ├── formatSupport.ts         # Universal format handling
│   ├── parallelProcessing.ts    # Multi-threaded processing engine
│   ├── qualityOptimization.ts   # Intelligent quality adjustment
│   ├── subtitleExtraction.ts    # Subtitle handling and OCR
│   ├── chapterDetection.ts      # Chapter extraction and auto-detection
│   └── hardwareAcceleration.ts # GPU/hardware acceleration

# Enhanced processing pipelines
backend/src/pipelines/
├── videoProcessing.ts           # Main processing orchestration
├── thumbnailGeneration.ts       # Advanced thumbnail creation
├── metadataEnrichment.ts        # Metadata enhancement pipeline
└── qualityAssurance.ts          # Processing quality validation

# Processing job definitions
backend/src/jobs/
├── mediaProcessing/
│   ├── metadataExtraction.ts
│   ├── formatConversion.ts
│   ├── thumbnailGeneration.ts
│   └── qualityOptimization.ts
```

## Implementation Blueprint

### Task List

```yaml
Phase 2.1.1: Universal Format Support Engine
FILES:
  - backend/src/services/media/formatSupport.ts (NEW)
  - backend/src/config/mediaFormats.ts (NEW)
ACTION: Implement comprehensive format detection and conversion
PATTERN: |
  export class FormatSupportService {
    async detectAndConvert(inputPath: string): Promise<ConversionPlan> {
      const formatInfo = await this.analyzeInputFormat(inputPath);

      if (this.isWebCompatible(formatInfo)) {
        return { action: 'copy', reason: 'already_compatible' };
      }

      return {
        action: 'convert',
        inputFormat: formatInfo,
        outputFormat: this.selectOptimalWebFormat(formatInfo),
        processingOptions: this.generateConversionOptions(formatInfo),
        estimatedTime: this.estimateConversionTime(formatInfo)
      };
    }
  }

Phase 2.1.2: Advanced Metadata Extraction Pipeline
FILES:
  - backend/src/services/media/advancedMetadata.ts (NEW)
  - backend/src/services/media/subtitleExtraction.ts (NEW)
  - backend/src/services/media/chapterDetection.ts (NEW)
ACTION: Implement comprehensive metadata extraction with subtitles and chapters
ENHANCEMENT: Extract all available media information
PATTERN: |
  export class AdvancedMetadataService {
    async extractComprehensive(videoPath: string): Promise<EnhancedMetadata> {
      const processes = await Promise.allSettled([
        this.extractTechnicalMetadata(videoPath),
        this.extractSubtitles(videoPath),
        this.detectChapters(videoPath),
        this.analyzeAudioTracks(videoPath),
        this.analyzeVideoComplexity(videoPath)
      ]);

      return this.aggregateResults(processes);
    }
  }

Phase 2.1.3: Intelligent Quality Optimization
FILES:
  - backend/src/services/media/qualityOptimization.ts (NEW)
  - backend/src/services/media/contentAnalysis.ts (NEW)
ACTION: Implement content-aware quality optimization
ENHANCEMENT: Automatic quality settings based on content analysis
PATTERN: |
  export class QualityOptimizationService {
    async optimizeForContent(videoPath: string): Promise<OptimizationSettings> {
      const analysis = await this.analyzeContent(videoPath);

      return {
        video: {
          codec: this.selectOptimalCodec(analysis),
          crf: this.calculateOptimalCRF(analysis),
          preset: this.selectEncodingPreset(analysis),
          profile: this.selectProfile(analysis)
        },
        audio: {
          codec: 'aac',
          bitrate: this.calculateAudioBitrate(analysis.audio),
          channels: this.optimizeChannelLayout(analysis.audio)
        },
        processing: {
          passes: analysis.complexity > 0.7 ? 2 : 1,
          hardware: this.shouldUseHardwareAcceleration(analysis),
          parallelism: this.calculateOptimalThreads(analysis)
        }
      };
    }
  }

Phase 2.1.4: Parallel Processing Engine
FILES:
  - backend/src/services/media/parallelProcessing.ts (NEW)
  - backend/src/jobs/mediaProcessing/ (NEW DIRECTORY)
ACTION: Implement multi-threaded processing with job queues
ENHANCEMENT: Parallel processing for improved performance
PATTERN: |
  export class ParallelProcessingService {
    async processVideo(videoPath: string): Promise<ProcessingResults> {
      // Create parallel job queue
      const jobs = [
        this.queueMetadataExtraction(videoPath),
        this.queueThumbnailGeneration(videoPath),
        this.queueQualityOptimization(videoPath),
        this.queueSubtitleExtraction(videoPath)
      ];

      // Process jobs in parallel with progress tracking
      return this.executeParallelJobs(jobs);
    }
  }

Phase 2.1.5: Hardware Acceleration Integration
FILES:
  - backend/src/services/media/hardwareAcceleration.ts (NEW)
  - backend/src/config/hardwareDetection.ts (NEW)
ACTION: Implement GPU and hardware acceleration support
ENHANCEMENT: Utilize available hardware for faster processing
PATTERN: |
  export class HardwareAccelerationService {
    constructor() {
      this.capabilities = this.detectHardwareCapabilities();
    }

    createAcceleratedEncoder(format: VideoFormat): FFmpegEncoder {
      if (this.capabilities.nvidia && format.codec === 'h264') {
        return new NVENCEncoder(this.capabilities.nvidia);
      } else if (this.capabilities.intel && format.codec === 'h264') {
        return new QuickSyncEncoder(this.capabilities.intel);
      } else {
        return new SoftwareEncoder();
      }
    }
  }
```

### Integration with Existing System

```typescript
// ENHANCE: Existing video processing route
// backend/src/routes/videos.ts - Enhanced upload processing
router.post('/upload', upload.single('video'), async (req, res, next) => {
  try {
    const file = req.file;

    // NEW: Advanced format detection and processing plan
    const formatSupport = await formatSupportService.analyzeFile(file.path);
    const optimizationPlan = await qualityOptimizationService.createPlan(file.path);

    // NEW: Queue parallel processing jobs
    const processingJobs = await parallelProcessingService.processVideo(file.path, {
      format: formatSupport,
      optimization: optimizationPlan,
      priority: 'normal',
    });

    // ENHANCED: Return job tracking instead of blocking
    res.json({
      message: 'Upload initiated with advanced processing',
      uploadId: file.filename,
      processingJobs: processingJobs.map(job => ({
        jobId: job.id,
        type: job.type,
        estimatedDuration: job.estimatedDuration,
        status: job.status,
      })),
      // NEW: Processing capabilities detected
      processingCapabilities: {
        hardwareAcceleration: hardwareService.isAvailable(),
        supportedFormats: formatSupportService.getSupportedFormats(),
        parallelProcessing: true,
      },
    });
  } catch (error) {
    next(error);
  }
});

// NEW: Processing status endpoint
router.get('/processing/:uploadId/status', async (req, res) => {
  const jobs = await parallelProcessingService.getJobStatus(req.params.uploadId);

  res.json({
    uploadId: req.params.uploadId,
    overallProgress: jobs.reduce((sum, job) => sum + job.progress, 0) / jobs.length,
    jobs: jobs.map(job => ({
      jobId: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      eta: job.estimatedTimeRemaining,
      currentStep: job.currentStep,
    })),
    completed: jobs.every(job => job.status === 'completed'),
    failed: jobs.some(job => job.status === 'failed'),
  });
});
```

## Validation Loop

### Level 1: Format Support Testing

```bash
# Test various video formats
formats=("sample.mp4" "sample.mkv" "sample.avi" "sample.mov" "sample.webm")

for format in "${formats[@]}"; do
  echo "Testing format: $format"
  curl -X POST localhost:3001/api/videos/upload \
    -F "video=@tests/fixtures/$format" \
    -F "category=test"

  # Should succeed for all formats
done
```

### Level 2: Advanced Metadata Validation

```bash
# Upload video with subtitles and chapters
curl -X POST localhost:3001/api/videos/upload \
  -F "video=@tests/fixtures/movie_with_subtitles.mkv" \
  -F "category=movies"

# Check enhanced metadata extraction
VIDEO_ID=$(curl -s localhost:3001/api/videos | jq -r '.[0].id')
curl -s "localhost:3001/api/videos/$VIDEO_ID" | jq '.subtitles, .chapters, .audioTracks'

# Expected: Detailed subtitle, chapter, and audio track information
```

### Level 3: Parallel Processing Performance

```bash
# Test parallel processing performance
start_time=$(date +%s)

curl -X POST localhost:3001/api/videos/upload \
  -F "video=@tests/fixtures/large_video.mp4" \
  -F "category=test" > upload_response.json

UPLOAD_ID=$(jq -r '.uploadId' upload_response.json)

# Monitor processing progress
while true; do
  progress=$(curl -s "localhost:3001/api/videos/processing/$UPLOAD_ID/status" | jq -r '.overallProgress')
  echo "Processing progress: $progress%"

  if [[ "$progress" == "100" ]]; then
    break
  fi
  sleep 2
done

end_time=$(date +%s)
processing_time=$((end_time - start_time))
echo "Total processing time: ${processing_time}s"

# Should be significantly faster than sequential processing
```

### Level 4: Quality Optimization Validation

```bash
# Test quality optimization
curl -X POST localhost:3001/api/videos/upload \
  -F "video=@tests/fixtures/high_quality_source.mov" \
  -F "category=movies"

# Check output file sizes and quality
VIDEO_ID=$(curl -s localhost:3001/api/videos | jq -r '.[0].id')
curl -s "localhost:3001/api/videos/$VIDEO_ID" | jq '.fileSize, .bitrate, .resolution'

# Expected: Optimized file size with maintained quality
```

### Level 5: Hardware Acceleration Testing

```bash
# Check hardware capabilities
curl -s localhost:3001/api/system/hardware | jq

# Expected response showing available acceleration:
# {
#   "gpu": {
#     "nvidia": true,
#     "intel": false,
#     "amd": false
#   },
#   "acceleration": ["nvenc", "cuda"],
#   "recommendedSettings": {...}
# }
```

## Known Gotchas & Best Practices

### Format Detection and Conversion

```typescript
// ✅ GOOD: Comprehensive format analysis before processing
async analyzeInputFormat(filePath: string): Promise<FormatAnalysis> {
  const probe = await ffmpeg.ffprobe(filePath);

  return {
    container: probe.format.format_name,
    videoCodec: probe.streams.find(s => s.codec_type === 'video')?.codec_name,
    audioCodec: probe.streams.find(s => s.codec_type === 'audio')?.codec_name,
    compatibility: this.assessWebCompatibility(probe),
    requiresTranscoding: this.needsTranscoding(probe)
  };
}

// ❌ BAD: Assuming format compatibility without analysis
async processVideo(filePath: string): Promise<void> {
  // Just copy file without checking compatibility
  await fs.copy(filePath, outputPath); // May not work in browsers
}
```

### Parallel Processing Resource Management

```typescript
// ✅ GOOD: Resource-aware parallel processing
async processInParallel(jobs: ProcessingJob[]): Promise<void> {
  const maxConcurrent = Math.min(
    jobs.length,
    this.getAvailableCPUCores() - 1, // Leave one core for system
    this.getAvailableMemoryGB() / 2   // Estimate 2GB per job
  );

  const semaphore = new Semaphore(maxConcurrent);

  await Promise.all(jobs.map(async job => {
    await semaphore.acquire();
    try {
      return await this.processJob(job);
    } finally {
      semaphore.release();
    }
  }));
}

// ❌ BAD: Unlimited parallel processing
await Promise.all(jobs.map(job => this.processJob(job))); // Resource exhaustion
```

### Hardware Acceleration Fallbacks

```typescript
// ✅ GOOD: Graceful fallback when hardware acceleration fails
async createEncoder(options: EncodingOptions): Promise<Encoder> {
  try {
    if (this.hardwareCapabilities.nvidia) {
      return new NVENCEncoder(options);
    }
  } catch (error) {
    console.warn('NVENC not available, falling back to software:', error.message);
  }

  try {
    if (this.hardwareCapabilities.intel) {
      return new QuickSyncEncoder(options);
    }
  } catch (error) {
    console.warn('QuickSync not available, falling back to software:', error.message);
  }

  // Always have software fallback
  return new SoftwareEncoder(options);
}

// ❌ BAD: Hard dependency on hardware acceleration
async createEncoder(): Promise<Encoder> {
  return new NVENCEncoder(); // Fails if NVENC not available
}
```

### Memory Management for Large Files

```typescript
// ✅ GOOD: Stream-based processing for large files
async processLargeVideo(inputPath: string): Promise<void> {
  const inputStream = fs.createReadStream(inputPath);
  const outputStream = fs.createWriteStream(outputPath);

  const ffmpegProcess = ffmpeg(inputStream)
    .videoCodec('libx264')
    .audioCodec('aac')
    .format('mp4')
    .on('progress', (progress) => {
      this.updateProgress(progress.percent);
    })
    .stream(outputStream);

  return new Promise((resolve, reject) => {
    ffmpegProcess.on('end', resolve);
    ffmpegProcess.on('error', reject);
  });
}

// ❌ BAD: Loading entire file into memory
async processVideo(inputPath: string): Promise<Buffer> {
  const fileBuffer = await fs.readFile(inputPath); // Memory exhaustion for large files
  return this.processBuffer(fileBuffer);
}
```

## Success Metrics

**Format Support Improvement**:

- Supported input formats: 15+ (vs current 3-4)
- Processing success rate: 95%+ across all formats
- Format conversion accuracy: 100% for web compatibility

**Processing Performance**:

- Processing speed improvement: 50%+ through parallelization
- Hardware acceleration utilization: 80%+ when available
- Memory efficiency: 60% reduction in peak memory usage

**Metadata Quality**:

- Comprehensive metadata extraction: 90%+ of videos
- Subtitle extraction success: 85%+ for videos with embedded subtitles
- Chapter detection accuracy: 90%+ for videos with chapters

**Quality Optimization**:

- File size reduction: 30% average while maintaining quality
- Quality consistency: SSIM > 0.95 compared to source
- Adaptive optimization: Content-aware settings for 100% of videos

## Time Estimate

**Total Implementation Time**: 20-25 hours

- Format support engine: 4-5 hours
- Advanced metadata extraction: 6-7 hours
- Quality optimization: 4-5 hours
- Parallel processing: 4-5 hours
- Hardware acceleration: 3-4 hours
- Testing and validation: 4-5 hours

**Confidence Level**: Medium-High - Complex media processing with well-established tools

---

## Anti-Patterns to Avoid

❌ **Format Overengineering**: Don't support obscure formats that add complexity without benefit
❌ **Processing Bottlenecks**: Don't create processing queues that become single points of failure
❌ **Quality Assumptions**: Don't apply the same optimization settings to all content types
❌ **Resource Exhaustion**: Don't run unlimited parallel processes without resource monitoring
❌ **Hardware Dependencies**: Don't create hard dependencies on specific hardware acceleration

## Remember

This enhancement transforms SOFATHEK's media processing from basic file handling to a sophisticated, production-grade media pipeline. Every enhancement preserves existing functionality while adding the intelligence, performance, and format support needed for a professional media center.

**Professional media processing with family-simple operation.**
