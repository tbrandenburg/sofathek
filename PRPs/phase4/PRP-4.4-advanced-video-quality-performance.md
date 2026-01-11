# PRP-4.4: Advanced Video Quality & Performance

**Project**: SOFATHEK Media Center  
**Phase**: 4 - Video Streaming & Playback  
**Priority**: High  
**Complexity**: High  
**Estimated Effort**: 12-16 hours

## Purpose & Core Principles

### Philosophy: Quality Should Adapt Intelligently to Reality

Effective video quality management isn't about serving the highest possible resolution—it's about **delivering the optimal viewing experience** within real-world constraints. Users should get the best possible quality that their device, network, and viewing context can actually support, without stuttering, buffering, or degraded performance.

**Before implementing quality management, ask**:

- How can we maximize perceived quality while minimizing buffering?
- What would Netflix-level adaptive streaming look like in our self-hosted environment?
- How do we balance quality ambitions with device limitations and network realities?

**Core principles**:

1. **Adaptive Intelligence**: Quality should automatically adjust to changing network conditions
2. **Device Awareness**: Respect device capabilities and screen sizes—don't waste resources on unperceivable quality
3. **Performance Priority**: Smooth playback trumps maximum resolution every time
4. **User Control**: Provide manual override while maintaining intelligent defaults

### The Quality Management Mental Model

Think of video quality as **intelligent resource allocation** rather than a fixed setting:

- **Fixed quality streaming**: Like ordering the largest meal regardless of appetite or budget
- **Adaptive quality streaming**: Like a smart menu that adjusts portions based on your needs and constraints
- **Performance-optimized streaming**: Like a personal chef who optimizes every aspect for your perfect dining experience

## Gap Analysis: Current State vs. Netflix-Grade Quality Management

### Current Implementation Gaps

**❌ Single Quality Serving**:

```typescript
// Current problematic approach - serves original file regardless of context
app.get('/api/videos/:id/stream', (req, res) => {
  res.sendFile(getOriginalVideoPath(req.params.id)); // Always highest quality
});
```

**❌ No Network Adaptation**: No response to changing bandwidth conditions  
**❌ No Device Optimization**: 4K video sent to phone screens, 1080p to large TVs  
**❌ No Performance Monitoring**: No feedback loop between quality and playback performance  
**❌ No Quality Options**: Users can't choose quality based on preferences or data limits  
**❌ No Intelligent Buffering**: No preemptive quality adjustment to prevent stuttering

### Netflix-Grade Quality Requirements

**✅ Adaptive Bitrate Streaming (ABS)**: Automatic quality adjustment based on network conditions  
**✅ Multi-Quality Encoding**: Multiple resolutions and bitrates available per video  
**✅ Smart Quality Selection**: Initial quality based on device and network capabilities  
**✅ Performance-Based Adaptation**: Quality adjusts based on actual playback performance  
**✅ User Quality Controls**: Manual quality selection with intelligent recommendations  
**✅ Bandwidth Estimation**: Real-time network speed detection and adaptation  
**✅ Quality Analytics**: Performance metrics to optimize quality algorithms

## Detailed Implementation

### 1. Multi-Quality Video Processing Service

**Enhanced video processing with multiple quality outputs** (`backend/src/services/qualityProcessingService.ts`):

```typescript
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';

interface QualityProfile {
  name: string;
  maxWidth: number;
  maxHeight: number;
  videoBitrate: string;
  audioBitrate: string;
  fps?: number;
  profile?: string;
}

interface ProcessedQuality {
  profile: string;
  width: number;
  height: number;
  bitrate: number;
  fileSize: number;
  filePath: string;
  processingTime: number;
}

class QualityProcessingService {
  private readonly qualityProfiles: QualityProfile[] = [
    {
      name: '2160p',
      maxWidth: 3840,
      maxHeight: 2160,
      videoBitrate: '15M',
      audioBitrate: '320k',
      profile: 'high',
    },
    {
      name: '1080p',
      maxWidth: 1920,
      maxHeight: 1080,
      videoBitrate: '8M',
      audioBitrate: '256k',
      profile: 'high',
    },
    {
      name: '720p',
      maxWidth: 1280,
      maxHeight: 720,
      videoBitrate: '4M',
      audioBitrate: '192k',
      profile: 'main',
    },
    {
      name: '480p',
      maxWidth: 854,
      maxHeight: 480,
      videoBitrate: '2M',
      audioBitrate: '128k',
      profile: 'main',
    },
    {
      name: '360p',
      maxWidth: 640,
      maxHeight: 360,
      videoBitrate: '1M',
      audioBitrate: '96k',
      profile: 'baseline',
    },
  ];

  /**
   * Process video into multiple quality variants
   * Philosophy: Generate quality options intelligently - don't waste resources on imperceptible differences
   */
  async processVideoQualities(inputPath: string, outputDir: string, videoId: string): Promise<ProcessedQuality[]> {
    try {
      // Analyze input video to determine optimal qualities
      const videoInfo = await this.analyzeVideo(inputPath);
      const optimalProfiles = this.selectOptimalProfiles(videoInfo);

      const processedQualities: ProcessedQuality[] = [];

      // Process each quality variant
      for (const profile of optimalProfiles) {
        const startTime = Date.now();
        const outputPath = join(outputDir, `${videoId}_${profile.name}.mp4`);

        await this.processQuality(inputPath, outputPath, profile, videoInfo);

        const stats = await fs.stat(outputPath);
        const processedQuality: ProcessedQuality = {
          profile: profile.name,
          width: Math.min(profile.maxWidth, videoInfo.width),
          height: Math.min(profile.maxHeight, videoInfo.height),
          bitrate: this.parseBitrate(profile.videoBitrate),
          fileSize: stats.size,
          filePath: outputPath,
          processingTime: Date.now() - startTime,
        };

        processedQualities.push(processedQuality);

        console.log(`Processed ${profile.name} quality for ${videoId} in ${processedQuality.processingTime}ms`);
      }

      // Save quality manifest
      await this.saveQualityManifest(outputDir, videoId, processedQualities);

      return processedQualities;
    } catch (error) {
      console.error('Quality processing failed:', error);
      throw error;
    }
  }

  /**
   * Analyze video to determine optimal processing strategy
   */
  private async analyzeVideo(inputPath: string): Promise<VideoInfo> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        inputPath,
      ]);

      let output = '';
      ffprobe.stdout.on('data', data => {
        output += data.toString();
      });

      ffprobe.on('close', code => {
        if (code !== 0) {
          reject(new Error('ffprobe failed'));
          return;
        }

        try {
          const info = JSON.parse(output);
          const videoStream = info.streams.find((s: any) => s.codec_type === 'video');

          resolve({
            width: videoStream.width,
            height: videoStream.height,
            duration: parseFloat(info.format.duration),
            bitrate: parseInt(info.format.bit_rate),
            fps: eval(videoStream.r_frame_rate), // e.g., "30000/1001" -> 29.97
            codec: videoStream.codec_name,
          });
        } catch (parseError) {
          reject(parseError);
        }
      });
    });
  }

  /**
   * Select optimal quality profiles based on source video characteristics
   * Philosophy: Don't upscale or create unnecessarily high bitrates
   */
  private selectOptimalProfiles(videoInfo: VideoInfo): QualityProfile[] {
    const sourceResolution = videoInfo.width * videoInfo.height;

    return this.qualityProfiles.filter(profile => {
      const profileResolution = profile.maxWidth * profile.maxHeight;

      // Don't create qualities higher than source
      if (profileResolution > sourceResolution) {
        return false;
      }

      // Always include 360p for compatibility
      if (profile.name === '360p') {
        return true;
      }

      // Include profiles that are meaningfully different (at least 30% resolution reduction)
      const resolutionRatio = profileResolution / sourceResolution;
      return resolutionRatio <= 0.7;
    });
  }

  /**
   * Process individual quality variant with optimized ffmpeg settings
   */
  private async processQuality(
    inputPath: string,
    outputPath: string,
    profile: QualityProfile,
    videoInfo: VideoInfo
  ): Promise<void> {
    await fs.mkdir(dirname(outputPath), { recursive: true });

    const ffmpegArgs = [
      '-i',
      inputPath,
      '-c:v',
      'libx264',
      '-preset',
      'medium', // Balance speed vs compression
      '-profile:v',
      profile.profile || 'main',
      '-b:v',
      profile.videoBitrate,
      '-maxrate',
      profile.videoBitrate,
      '-bufsize',
      this.calculateBufferSize(profile.videoBitrate),
      '-vf',
      `scale=${profile.maxWidth}:${profile.maxHeight}:force_original_aspect_ratio=decrease`,
      '-c:a',
      'aac',
      '-b:a',
      profile.audioBitrate,
      '-movflags',
      '+faststart', // Enable progressive download
      '-f',
      'mp4',
      outputPath,
    ];

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', ffmpegArgs);

      ffmpeg.stderr.on('data', data => {
        // Monitor progress if needed
        const progress = this.parseFFmpegProgress(data.toString());
        if (progress) {
          // Could emit progress events here
        }
      });

      ffmpeg.on('close', code => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ffmpeg failed with code ${code}`));
        }
      });
    });
  }

  private calculateBufferSize(bitrate: string): string {
    const bitrateNum = this.parseBitrate(bitrate);
    // Buffer size = 2x bitrate for good streaming performance
    return `${Math.round((bitrateNum * 2) / 1000000)}M`;
  }

  private parseBitrate(bitrate: string): number {
    const match = bitrate.match(/(\d+(?:\.\d+)?)([KMG]?)/);
    if (!match) return 0;

    const [, value, unit] = match;
    const num = parseFloat(value);

    switch (unit.toUpperCase()) {
      case 'G':
        return num * 1000000000;
      case 'M':
        return num * 1000000;
      case 'K':
        return num * 1000;
      default:
        return num;
    }
  }

  private parseFFmpegProgress(output: string): ProgressInfo | null {
    const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})\.\d{2}/);
    if (!timeMatch) return null;

    const [, hours, minutes, seconds] = timeMatch;
    return {
      currentTime: parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds),
    };
  }

  private async saveQualityManifest(outputDir: string, videoId: string, qualities: ProcessedQuality[]): Promise<void> {
    const manifest = {
      videoId,
      qualities: qualities.map(q => ({
        profile: q.profile,
        width: q.width,
        height: q.height,
        bitrate: q.bitrate,
        fileSize: q.fileSize,
        filePath: q.filePath.replace(outputDir, ''), // Relative path
      })),
      createdAt: new Date().toISOString(),
    };

    const manifestPath = join(outputDir, `${videoId}_manifest.json`);
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  }
}

interface VideoInfo {
  width: number;
  height: number;
  duration: number;
  bitrate: number;
  fps: number;
  codec: string;
}

interface ProgressInfo {
  currentTime: number;
}

export const qualityProcessingService = new QualityProcessingService();
```

### 2. Adaptive Quality Streaming Service

**Intelligent quality selection and adaptation** (`backend/src/services/adaptiveStreamingService.ts`):

```typescript
import { Request, Response } from 'express';
import { promises as fs } from 'fs';
import { join } from 'path';

interface QualityManifest {
  videoId: string;
  qualities: QualityOption[];
  createdAt: string;
}

interface QualityOption {
  profile: string;
  width: number;
  height: number;
  bitrate: number;
  fileSize: number;
  filePath: string;
}

interface ClientCapabilities {
  screenWidth: number;
  screenHeight: number;
  connectionSpeed?: number;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'tv';
  preferredQuality?: string;
}

interface QualityRecommendation {
  recommended: QualityOption;
  alternatives: QualityOption[];
  reasoning: string;
}

class AdaptiveStreamingService {
  private qualityCache = new Map<string, QualityManifest>();
  private performanceMetrics = new Map<string, StreamingMetrics>();

  /**
   * Get quality recommendation based on client capabilities and network conditions
   * Philosophy: Recommend the best quality that won't cause performance issues
   */
  async getQualityRecommendation(videoId: string, capabilities: ClientCapabilities): Promise<QualityRecommendation> {
    try {
      const manifest = await this.getQualityManifest(videoId);
      if (!manifest || manifest.qualities.length === 0) {
        throw new Error('No quality options available');
      }

      const availableQualities = manifest.qualities.sort((a, b) => b.bitrate - a.bitrate);
      const recommended = this.selectOptimalQuality(availableQualities, capabilities);

      return {
        recommended,
        alternatives: availableQualities.filter(q => q.profile !== recommended.profile),
        reasoning: this.generateRecommendationReasoning(recommended, capabilities),
      };
    } catch (error) {
      console.error('Quality recommendation failed:', error);
      throw error;
    }
  }

  /**
   * Stream video with specified quality
   * Philosophy: Deliver requested quality efficiently with range request support
   */
  async streamQualityVideo(req: Request, res: Response, videoId: string, qualityProfile?: string): Promise<void> {
    try {
      const manifest = await this.getQualityManifest(videoId);
      if (!manifest) {
        throw new Error('Video manifest not found');
      }

      // Select quality based on request or auto-select
      const quality = qualityProfile
        ? manifest.qualities.find(q => q.profile === qualityProfile)
        : await this.autoSelectQuality(req, manifest.qualities);

      if (!quality) {
        throw new Error('Requested quality not available');
      }

      const filePath = join(process.env.MEDIA_ROOT || '/app/media', quality.filePath);

      // Set quality-specific headers
      res.setHeader('X-Video-Quality', quality.profile);
      res.setHeader('X-Video-Resolution', `${quality.width}x${quality.height}`);
      res.setHeader('X-Video-Bitrate', quality.bitrate.toString());

      // Track streaming metrics for adaptive improvement
      this.trackQualityMetrics(videoId, quality.profile, req);

      // Use existing range request streaming (from PRP-4.2)
      const { streamingService } = await import('./streamingService.js');
      await streamingService.streamVideo(req, res, quality.filePath);
    } catch (error) {
      console.error('Quality streaming error:', error);
      res.status(500).json({ error: 'Quality streaming failed' });
    }
  }

  /**
   * Auto-select optimal quality based on request headers and device hints
   */
  private async autoSelectQuality(req: Request, qualities: QualityOption[]): Promise<QualityOption> {
    // Parse client capabilities from headers
    const capabilities = this.parseClientCapabilities(req);

    // Get performance history for this client
    const clientId = this.getClientId(req);
    const metrics = this.performanceMetrics.get(clientId);

    return this.selectOptimalQuality(qualities, capabilities, metrics);
  }

  /**
   * Intelligent quality selection algorithm
   * Philosophy: Balance quality ambitions with performance reality
   */
  private selectOptimalQuality(
    qualities: QualityOption[],
    capabilities: ClientCapabilities,
    metrics?: StreamingMetrics
  ): QualityOption {
    // Filter qualities that exceed screen resolution (no point in 4K on 720p screen)
    const appropriateQualities = qualities.filter(q => {
      const resolutionFactor = 1.5; // Allow some upscaling for crisp display
      return (
        q.width <= capabilities.screenWidth * resolutionFactor &&
        q.height <= capabilities.screenHeight * resolutionFactor
      );
    });

    if (appropriateQualities.length === 0) {
      // Fallback to lowest quality if screen resolution filtering removes everything
      return qualities[qualities.length - 1];
    }

    // Device-specific quality preferences
    let targetQuality: QualityOption;

    switch (capabilities.deviceType) {
      case 'mobile':
        // Prioritize data efficiency on mobile
        targetQuality = this.findQualityByProfile(appropriateQualities, ['720p', '480p', '360p']);
        break;

      case 'tablet':
        // Balance quality and efficiency
        targetQuality = this.findQualityByProfile(appropriateQualities, ['1080p', '720p', '480p']);
        break;

      case 'desktop':
        // Higher quality preference for desktop
        targetQuality = this.findQualityByProfile(appropriateQualities, ['1080p', '2160p', '720p']);
        break;

      case 'tv':
        // Maximum quality for TV viewing
        targetQuality = this.findQualityByProfile(appropriateQualities, ['2160p', '1080p', '720p']);
        break;

      default:
        targetQuality = appropriateQualities[Math.floor(appropriateQualities.length / 2)];
    }

    // Adjust based on connection speed if available
    if (capabilities.connectionSpeed) {
      targetQuality = this.adjustForBandwidth(appropriateQualities, targetQuality, capabilities.connectionSpeed);
    }

    // Adjust based on performance metrics
    if (metrics && metrics.bufferingEvents > 2) {
      // Step down quality if experiencing buffering
      const currentIndex = appropriateQualities.indexOf(targetQuality);
      if (currentIndex < appropriateQualities.length - 1) {
        targetQuality = appropriateQualities[currentIndex + 1];
      }
    }

    return targetQuality;
  }

  private findQualityByProfile(qualities: QualityOption[], preferredProfiles: string[]): QualityOption {
    for (const profile of preferredProfiles) {
      const quality = qualities.find(q => q.profile === profile);
      if (quality) return quality;
    }
    // Fallback to middle quality
    return qualities[Math.floor(qualities.length / 2)];
  }

  private adjustForBandwidth(
    qualities: QualityOption[],
    targetQuality: QualityOption,
    connectionSpeed: number
  ): QualityOption {
    // Use conservative bandwidth estimation (80% of connection speed)
    const availableBandwidth = connectionSpeed * 0.8;

    // Find highest quality that fits in bandwidth
    const suitableQualities = qualities.filter(q => q.bitrate <= availableBandwidth);

    if (suitableQualities.length === 0) {
      return qualities[qualities.length - 1]; // Lowest quality
    }

    // Prefer target quality if it fits, otherwise highest suitable
    const targetFits = suitableQualities.includes(targetQuality);
    return targetFits ? targetQuality : suitableQualities[0];
  }

  private parseClientCapabilities(req: Request): ClientCapabilities {
    // Parse from custom headers or User-Agent
    const userAgent = req.headers['user-agent'] || '';
    const screenWidth = parseInt(req.headers['x-screen-width'] as string) || 1920;
    const screenHeight = parseInt(req.headers['x-screen-height'] as string) || 1080;
    const connectionSpeed = req.headers['x-connection-speed']
      ? parseInt(req.headers['x-connection-speed'] as string)
      : undefined;

    let deviceType: ClientCapabilities['deviceType'] = 'desktop';
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      deviceType = /iPad|Tablet/.test(userAgent) ? 'tablet' : 'mobile';
    } else if (/TV|Roku|AppleTV/.test(userAgent)) {
      deviceType = 'tv';
    }

    return {
      screenWidth,
      screenHeight,
      connectionSpeed,
      deviceType,
      preferredQuality: req.headers['x-preferred-quality'] as string,
    };
  }

  private generateRecommendationReasoning(quality: QualityOption, capabilities: ClientCapabilities): string {
    const reasons = [];

    if (quality.width <= capabilities.screenWidth) {
      reasons.push(`matches your ${capabilities.screenWidth}x${capabilities.screenHeight} screen`);
    }

    if (capabilities.deviceType === 'mobile' && quality.profile === '720p') {
      reasons.push('optimized for mobile data usage');
    }

    if (capabilities.connectionSpeed && quality.bitrate <= capabilities.connectionSpeed * 0.8) {
      reasons.push('fits your network bandwidth');
    }

    return reasons.length > 0
      ? `Recommended because it ${reasons.join(' and ')}`
      : `Best available quality for your device`;
  }

  private async getQualityManifest(videoId: string): Promise<QualityManifest | null> {
    try {
      if (this.qualityCache.has(videoId)) {
        return this.qualityCache.get(videoId)!;
      }

      const manifestPath = join(process.env.MEDIA_ROOT || '/app/media', 'qualities', `${videoId}_manifest.json`);

      const data = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(data) as QualityManifest;

      this.qualityCache.set(videoId, manifest);
      return manifest;
    } catch (error) {
      console.error('Failed to load quality manifest:', error);
      return null;
    }
  }

  private trackQualityMetrics(videoId: string, quality: string, req: Request): void {
    const clientId = this.getClientId(req);
    const metrics = this.performanceMetrics.get(clientId) || {
      bufferingEvents: 0,
      qualityChanges: 0,
      avgBitrate: 0,
      sessionStart: Date.now(),
    };

    // Track quality changes
    if (metrics.lastQuality && metrics.lastQuality !== quality) {
      metrics.qualityChanges++;
    }
    metrics.lastQuality = quality;

    this.performanceMetrics.set(clientId, metrics);
  }

  private getClientId(req: Request): string {
    // Generate client ID from IP + User-Agent for tracking
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const ua = req.headers['user-agent'] || 'unknown';
    return Buffer.from(`${ip}:${ua}`).toString('base64').slice(0, 16);
  }
}

interface StreamingMetrics {
  bufferingEvents: number;
  qualityChanges: number;
  avgBitrate: number;
  sessionStart: number;
  lastQuality?: string;
}

export const adaptiveStreamingService = new AdaptiveStreamingService();
```

### 3. React 19 Quality Management Component

**Enhanced video player with quality controls** (`frontend/src/components/VideoPlayer/QualityControlPlayer.tsx`):

```typescript
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useVideoQuality } from '../../hooks/useVideoQuality';
import { useDeviceCapabilities } from '../../hooks/useDeviceCapabilities';

interface QualityControlPlayerProps {
  videoId: string;
  autoQuality?: boolean;
  onQualityChange?: (quality: QualityOption) => void;
  onPerformanceUpdate?: (metrics: PerformanceMetrics) => void;
}

interface QualityOption {
  profile: string;
  width: number;
  height: number;
  bitrate: number;
  label: string;
}

interface PerformanceMetrics {
  bufferingTime: number;
  droppedFrames: number;
  avgBitrate: number;
  qualityChanges: number;
}

/**
 * Video player with adaptive quality management and user controls
 * Philosophy: Deliver optimal quality automatically while giving users control
 */
export const QualityControlPlayer: React.FC<QualityControlPlayerProps> = ({
  videoId,
  autoQuality = true,
  onQualityChange,
  onPerformanceUpdate
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    bufferingTime: 0,
    droppedFrames: 0,
    avgBitrate: 0,
    qualityChanges: 0
  });

  const deviceCapabilities = useDeviceCapabilities();
  const {
    availableQualities,
    currentQuality,
    recommendedQuality,
    switchQuality,
    isQualityLoading,
    adaptiveMode,
    setAdaptiveMode
  } = useVideoQuality(videoId, deviceCapabilities);

  /**
   * Handle manual quality selection
   */
  const handleQualitySelect = useCallback(async (quality: QualityOption) => {
    if (!videoRef.current) return;

    const currentTime = videoRef.current.currentTime;
    const wasPlaying = !videoRef.current.paused;

    setIsBuffering(true);

    try {
      await switchQuality(quality.profile);

      // Restore playback position
      videoRef.current.currentTime = currentTime;
      if (wasPlaying) {
        await videoRef.current.play();
      }

      onQualityChange?.(quality);
      setShowQualityMenu(false);

      // Track quality change
      setPerformanceMetrics(prev => ({
        ...prev,
        qualityChanges: prev.qualityChanges + 1
      }));

    } catch (error) {
      console.error('Quality switch failed:', error);
    } finally {
      setIsBuffering(false);
    }
  }, [switchQuality, onQualityChange]);

  /**
   * Monitor video performance for adaptive quality decisions
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let bufferingStartTime: number | null = null;
    let performanceCheckInterval: NodeJS.Timeout;

    const handleWaiting = () => {
      setIsBuffering(true);
      bufferingStartTime = Date.now();
    };

    const handleCanPlay = () => {
      setIsBuffering(false);

      if (bufferingStartTime) {
        const bufferingDuration = Date.now() - bufferingStartTime;
        setPerformanceMetrics(prev => ({
          ...prev,
          bufferingTime: prev.bufferingTime + bufferingDuration
        }));
        bufferingStartTime = null;
      }
    };

    // Monitor performance metrics
    const checkPerformance = () => {
      if (video.getVideoPlaybackQuality) {
        const quality = video.getVideoPlaybackQuality();
        setPerformanceMetrics(prev => {
          const newMetrics = {
            ...prev,
            droppedFrames: quality.droppedVideoFrames,
            avgBitrate: calculateCurrentBitrate(video)
          };

          onPerformanceUpdate?.(newMetrics);
          return newMetrics;
        });

        // Trigger adaptive quality adjustment if performance is poor
        if (autoQuality && adaptiveMode && shouldAdjustQuality(quality)) {
          suggestQualityAdjustment(quality);
        }
      }
    };

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);

    performanceCheckInterval = setInterval(checkPerformance, 5000); // Check every 5 seconds

    return () => {
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      clearInterval(performanceCheckInterval);
    };
  }, [autoQuality, adaptiveMode, onPerformanceUpdate]);

  /**
   * Suggest quality adjustment based on performance
   */
  const suggestQualityAdjustment = useCallback((playbackQuality: VideoPlaybackQuality) => {
    if (!availableQualities || availableQualities.length <= 1) return;

    const droppedFrameRate = playbackQuality.droppedVideoFrames / playbackQuality.totalVideoFrames;

    if (droppedFrameRate > 0.02) { // More than 2% dropped frames
      // Step down quality
      const currentIndex = availableQualities.findIndex(q => q.profile === currentQuality?.profile);
      if (currentIndex < availableQualities.length - 1) {
        const lowerQuality = availableQualities[currentIndex + 1];
        console.log(`Auto-adjusting quality down to ${lowerQuality.profile} due to performance`);
        handleQualitySelect(lowerQuality);
      }
    }
  }, [availableQualities, currentQuality, handleQualitySelect]);

  return (
    <div className="quality-control-player">
      <video
        ref={videoRef}
        src={currentQuality ? `/api/videos/${videoId}/stream/${currentQuality.profile}` : ''}
        className="quality-control-player__video"
        controls
        preload="metadata"
      />

      {/* Buffering indicator */}
      {(isBuffering || isQualityLoading) && (
        <div className="quality-control-player__buffering">
          <div className="buffering-spinner" />
          <p>
            {isQualityLoading ? 'Switching quality...' : 'Buffering...'}
          </p>
        </div>
      )}

      {/* Quality controls overlay */}
      <div className="quality-control-player__controls">
        {/* Quality menu button */}
        <button
          onClick={() => setShowQualityMenu(!showQualityMenu)}
          className="quality-control-player__quality-button"
          aria-label="Video quality settings"
        >
          <span className="quality-icon">HD</span>
          {currentQuality && (
            <span className="current-quality">{currentQuality.profile}</span>
          )}
        </button>

        {/* Auto quality toggle */}
        <button
          onClick={() => setAdaptiveMode(!adaptiveMode)}
          className={`quality-control-player__auto-button ${adaptiveMode ? 'active' : ''}`}
          aria-label="Auto quality"
        >
          AUTO
        </button>

        {/* Quality selection menu */}
        {showQualityMenu && (
          <div className="quality-control-player__quality-menu">
            <div className="quality-menu-header">
              <h3>Video Quality</h3>
              <button
                onClick={() => setShowQualityMenu(false)}
                className="close-button"
              >
                ×
              </button>
            </div>

            <div className="quality-options">
              {/* Auto quality option */}
              <div
                className={`quality-option ${adaptiveMode ? 'selected' : ''}`}
                onClick={() => {
                  setAdaptiveMode(true);
                  setShowQualityMenu(false);
                }}
              >
                <div className="quality-label">
                  <strong>Auto</strong>
                  {recommendedQuality && (
                    <span className="recommended">({recommendedQuality.profile} recommended)</span>
                  )}
                </div>
                <div className="quality-description">
                  Automatically adjusts quality based on your connection
                </div>
              </div>

              {/* Manual quality options */}
              {availableQualities?.map((quality) => (
                <div
                  key={quality.profile}
                  className={`quality-option ${currentQuality?.profile === quality.profile ? 'selected' : ''}`}
                  onClick={() => handleQualitySelect(quality)}
                >
                  <div className="quality-label">
                    <strong>{quality.label}</strong>
                    <span className="quality-resolution">
                      {quality.width}x{quality.height}
                    </span>
                  </div>
                  <div className="quality-bitrate">
                    {Math.round(quality.bitrate / 1000000)} Mbps
                  </div>
                </div>
              ))}
            </div>

            {/* Performance info */}
            {process.env.NODE_ENV === 'development' && (
              <div className="quality-debug-info">
                <h4>Performance Metrics</h4>
                <div>Buffering Time: {Math.round(performanceMetrics.bufferingTime / 1000)}s</div>
                <div>Dropped Frames: {performanceMetrics.droppedFrames}</div>
                <div>Quality Changes: {performanceMetrics.qualityChanges}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper functions
function calculateCurrentBitrate(video: HTMLVideoElement): number {
  // Estimate current bitrate based on buffer health
  if (video.buffered.length === 0) return 0;

  const bufferEnd = video.buffered.end(video.buffered.length - 1);
  const bufferStart = video.buffered.start(0);
  const bufferDuration = bufferEnd - bufferStart;

  // This is a rough estimate - in production you'd use more sophisticated methods
  return bufferDuration > 0 ? (video.videoWidth * video.videoHeight * 0.1) : 0;
}

function shouldAdjustQuality(playbackQuality: VideoPlaybackQuality): boolean {
  const droppedFrameRate = playbackQuality.droppedVideoFrames / playbackQuality.totalVideoFrames;
  return droppedFrameRate > 0.02; // More than 2% dropped frames indicates performance issues
}

interface VideoPlaybackQuality {
  droppedVideoFrames: number;
  totalVideoFrames: number;
  corruptedVideoFrames: number;
}
```

## Anti-Patterns to Avoid

### ❌ **Quality Overkill Anti-Pattern**: Always Serve Maximum Quality

**What not to do**:

```typescript
// DON'T: Always serve highest quality regardless of context
const selectedQuality = availableQualities[0]; // Always 4K, even for mobile!
```

**Why it's problematic**: Wastes bandwidth, causes buffering, poor battery life on mobile devices

**Better approach**:

```typescript
// DO: Select appropriate quality based on device and network
const selectedQuality = selectOptimalQuality(device, network, availableQualities);
```

### ❌ **Quality Switching Chaos Anti-Pattern**: Constant Quality Changes

**What not to do**:

```typescript
// DON'T: Switch quality on every network fluctuation
networkSpeed.onChange(() => {
  switchToOptimalQuality(); // Causes constant interruptions!
});
```

**Why it's problematic**: Disrupts viewing experience, causes constant buffering, user frustration

**Better approach**:

```typescript
// DO: Debounced quality switching with hysteresis
const debouncedQualityCheck = debounce(() => {
  if (shouldSwitchQuality(currentQuality, networkSpeed, performanceMetrics)) {
    switchQuality();
  }
}, 30000); // Only check every 30 seconds
```

### ❌ **Bandwidth Assumption Anti-Pattern**: Fixed Bitrate Targeting

**What not to do**:

```typescript
// DON'T: Assume bandwidth equals bitrate capacity
if (networkSpeed >= videoBitrate) {
  selectQuality(quality); // Ignores real-world network fluctuations
}
```

**Why it's problematic**: Network varies, other apps use bandwidth, causes stuttering

**Better approach**:

```typescript
// DO: Conservative bandwidth estimation with safety margin
const safeNetworkCapacity = networkSpeed * 0.7; // 30% safety margin
if (safeNetworkCapacity >= videoBitrate) {
  selectQuality(quality);
}
```

### ❌ **Processing Waste Anti-Pattern**: Generating Unnecessary Quality Variants

**What not to do**:

```typescript
// DON'T: Generate every possible quality variant
const allQualities = ['2160p', '1440p', '1080p', '900p', '720p', '540p', '480p', '360p', '240p'];
allQualities.forEach(processQuality); // Massive storage waste for 480p source!
```

**Why it's problematic**: Wastes storage, processing time, no quality benefit from upscaling

**Better approach**:

```typescript
// DO: Generate only meaningful quality variants
const sourceResolution = getSourceResolution(video);
const meaningfulQualities = selectMeaningfulQualities(sourceResolution);
meaningfulQualities.forEach(processQuality);
```

## Variation Guidance

**IMPORTANT**: Quality management implementations should vary based on content type, viewing context, and infrastructure constraints.

**For Movies (2+ hours)**: Conservative quality selection, fewer switches, prioritize consistency over peak quality
**For Short Content (< 15 minutes)**: Aggressive quality selection, faster adaptation, optimize for immediate viewing
**For Educational Content**: Prioritize clarity over compression, maintain stable quality, support offline scenarios
**For Kids Content**: Battery-conscious quality on mobile, simpler quality options, parental data controls
**For Live/Recorded TV**: Real-time adaptation, handle variable source quality, broadcasting optimizations
**For High-Motion Content**: Higher bitrates for same resolution, motion-aware compression, frame rate priority

**Network Context Variations**:
**Fast WiFi**: Aggressive quality upgrades, larger buffers, 4K preference where appropriate
**Mobile Data**: Conservative quality selection, data usage tracking, quality caps based on data plans
**Slow Connections**: Aggressive quality downgrades, extended buffering, offline options

**Avoid converging on**: Single quality selection algorithm, uniform adaptation speed, one-size-fits-all processing profiles

## Validation & Testing

### 1. Quality Processing Validation

**Multi-quality generation testing**:

```typescript
// tests/quality/processing.test.ts
describe('Quality Processing', () => {
  test('generates appropriate quality variants', async () => {
    const mockVideo = { width: 1920, height: 1080, bitrate: 8000000 };
    const qualities = await qualityProcessingService.processVideoQualities(
      'test-input.mp4',
      '/tmp/output',
      'test-video'
    );

    // Should not upscale beyond source resolution
    expect(qualities.every(q => q.width <= mockVideo.width)).toBe(true);
    expect(qualities.every(q => q.height <= mockVideo.height)).toBe(true);

    // Should include meaningful quality steps
    expect(qualities.length).toBeGreaterThanOrEqual(3);
    expect(qualities.length).toBeLessThanOrEqual(5);
  });
});
```

### 2. Adaptive Quality Logic Testing

**Quality selection algorithm validation**:

```typescript
describe('Adaptive Quality Selection', () => {
  test('respects device screen resolution', () => {
    const qualities = [
      { profile: '2160p', width: 3840, height: 2160, bitrate: 15000000 },
      { profile: '1080p', width: 1920, height: 1080, bitrate: 8000000 },
      { profile: '720p', width: 1280, height: 720, bitrate: 4000000 },
    ];

    const mobileCapabilities = {
      screenWidth: 720,
      screenHeight: 1280,
      deviceType: 'mobile' as const,
    };

    const selected = adaptiveStreamingService.selectOptimalQuality(qualities, mobileCapabilities);

    // Should not select 2160p for mobile device
    expect(selected.profile).not.toBe('2160p');
    expect(selected.width).toBeLessThanOrEqual(mobileCapabilities.screenWidth * 1.5);
  });
});
```

### 3. Performance Monitoring Testing

**Quality adaptation performance validation**:

```typescript
describe('Performance-Based Quality Adaptation', () => {
  test('downgrades quality on poor performance', async () => {
    const mockMetrics = {
      droppedVideoFrames: 150,
      totalVideoFrames: 3000, // 5% dropped frames
    };

    const shouldAdjust = shouldAdjustQuality(mockMetrics);
    expect(shouldAdjust).toBe(true);
  });
});
```

## Success Metrics

### Quality Metrics

- **Buffering Reduction**: 70% reduction in buffering events compared to fixed-quality streaming
- **Quality Satisfaction**: 85% of users satisfied with automatically selected quality
- **Bandwidth Efficiency**: 40% reduction in unnecessary bandwidth usage through smart quality selection
- **Storage Efficiency**: Generate only meaningful quality variants (3-5 per video instead of 8-10)

### Performance Metrics

- **Quality Switch Time**: < 2 seconds for seamless quality transitions
- **Adaptation Accuracy**: 90% of quality selections result in smooth playback without buffering
- **Processing Speed**: Multi-quality processing completes within 3x real-time of source video duration
- **Resource Usage**: Quality processing uses < 80% CPU during off-peak hours

### User Experience Metrics

- **Seamless Playback**: 95% of viewing sessions complete without quality-related interruptions
- **Manual Override Usage**: < 15% of users manually change auto-selected quality
- **Cross-Device Consistency**: Quality preferences and performance adapt correctly across device switches
- **Network Adaptation Speed**: Quality adjusts within 30 seconds of significant network changes

## Integration Points

### Backend Integration

- **Video Processing Pipeline**: Integrate multi-quality processing into existing video scanning and processing
- **Storage Management**: Optimize storage allocation for quality variants, cleanup unused qualities
- **API Enhancement**: Extend video API with quality selection and performance feedback endpoints

### Frontend Integration

- **Video Player**: Enhanced player with quality controls and adaptive streaming
- **Progress Tracking**: Quality changes preserved in viewing progress and resume functionality
- **Profile System**: Quality preferences and performance data per family profile
- **Settings Management**: Global quality preferences and data usage controls

### Infrastructure Integration

- **Docker**: Optimize container resources for video processing and quality generation
- **Nginx**: Configure proxy for efficient quality variant serving and caching
- **Monitoring**: Quality performance metrics collection and alerting for optimization

---

**Implementation Priority**: This PRP should be implemented after PRP-4.1 (Video Player), PRP-4.2 (Streaming), and PRP-4.3 (Progress Tracking) as it builds upon their infrastructure while significantly enhancing the viewing experience. Quality management is essential for handling diverse device types and network conditions in a family media center.

**Next PRP Dependencies**: PRP-4.5 (Multi-Device Sync) can leverage quality analytics and preference synchronization capabilities developed here.
