# PRP-4.2: HTTP Range Request Streaming Optimization

**Project**: SOFATHEK Media Center  
**Phase**: 4 - Video Streaming & Playback  
**Priority**: High  
**Complexity**: Medium-High  
**Estimated Effort**: 8-12 hours

## Purpose & Core Principles

### Philosophy: Streaming Should Feel Instant

Effective video streaming isn't about moving data—it's about **eliminating perceived latency**. Users should never experience the frustration of waiting for video seeks, buffering delays, or slow startup times that plague amateur streaming implementations.

**Before implementing range requests, ask**:

- How can we make seeking feel instant regardless of video size?
- What would Netflix-grade streaming performance look like with our architecture?
- How do we balance bandwidth efficiency with user experience?

**Core principles**:

1. **Seek Performance**: Video seeking should be instantaneous, not proportional to file size
2. **Bandwidth Intelligence**: Only request what's needed, when it's needed
3. **Progressive Enhancement**: Graceful fallback from range requests to full downloads
4. **Client-Server Harmony**: Range requests should enhance both server efficiency and client responsiveness

### The Streaming Performance Mental Model

Think of HTTP range requests as **precision targeting** rather than data transfer:

- **Full file serving**: Like downloading entire movies to watch one scene
- **Range request streaming**: Like having instant access to any scene on demand
- **Smart buffering**: Like pre-loading scenes you're likely to watch next

## Gap Analysis: Current State vs. Netflix-Grade Streaming

### Current Implementation Gaps

**❌ Basic File Serving**:

```typescript
// backend/src/routes/video.ts - Current problematic approach
app.get('/api/videos/:id/stream', (req, res) => {
  const videoPath = getVideoPath(req.params.id);
  res.sendFile(videoPath); // Sends entire file regardless of need
});
```

**❌ No Range Request Support**: Seeking requires downloading from start to seek position  
**❌ No Bandwidth Optimization**: All clients get same data stream regardless of network conditions  
**❌ No Smart Buffering**: No anticipation of user seeking patterns  
**❌ No Streaming Analytics**: No insight into streaming performance or bottlenecks

### Netflix-Grade Streaming Requirements

**✅ HTTP/1.1 Range Request Protocol**: `Accept-Ranges: bytes`, `Content-Range` headers  
**✅ Instant Seeking**: Jump to any time position without downloading preceding content  
**✅ Bandwidth Adaptation**: Efficient range sizing based on client capabilities  
**✅ Smart Prefetching**: Anticipate likely seek positions for smoother experience  
**✅ Error Resilience**: Graceful handling of partial content failures  
**✅ Performance Monitoring**: Track streaming metrics for optimization opportunities

## Detailed Implementation

### 1. Express 5.x Range Request Server Architecture

**Core streaming service** (`backend/src/services/streamingService.ts`):

```typescript
import { Request, Response } from 'express';
import { createReadStream, statSync } from 'fs';
import { join } from 'path';

interface StreamingOptions {
  chunkSize?: number;
  maxRangeSize?: number;
  enablePrefetch?: boolean;
}

interface RangeRequest {
  start: number;
  end: number;
  total: number;
}

class StreamingService {
  private readonly defaultChunkSize = 1024 * 1024; // 1MB default chunks
  private readonly maxRangeSize = 10 * 1024 * 1024; // 10MB max range
  private readonly streamingMetrics = new Map<string, StreamingMetrics>();

  /**
   * Parse Range header with intelligent defaults
   * Philosophy: Be liberal in what you accept, conservative in what you send
   */
  parseRangeHeader(rangeHeader: string, fileSize: number): RangeRequest | null {
    const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (!rangeMatch) return null;

    const start = parseInt(rangeMatch[1], 10);
    const requestedEnd = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : undefined;

    // Smart end calculation - balance efficiency with user needs
    const end =
      requestedEnd !== undefined
        ? Math.min(requestedEnd, fileSize - 1)
        : Math.min(start + this.defaultChunkSize - 1, fileSize - 1);

    // Prevent abuse - cap range size
    const actualEnd = Math.min(end, start + this.maxRangeSize - 1);

    return {
      start,
      end: actualEnd,
      total: fileSize,
    };
  }

  /**
   * Stream video with range request support
   * Philosophy: Optimize for the common case (seeking), handle edge cases gracefully
   */
  async streamVideo(req: Request, res: Response, videoPath: string): Promise<void> {
    try {
      const fullPath = join(process.env.MEDIA_ROOT || '/app/media', videoPath);
      const stats = statSync(fullPath);
      const fileSize = stats.size;

      // Set common headers for video streaming
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', this.getVideoContentType(videoPath));
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache

      const rangeHeader = req.headers.range;

      if (!rangeHeader) {
        // No range request - serve full file with streaming optimizations
        return this.streamFullFile(res, fullPath, fileSize);
      }

      const range = this.parseRangeHeader(rangeHeader, fileSize);
      if (!range) {
        return res.status(416).json({ error: 'Invalid range request' });
      }

      // Serve partial content
      return this.streamPartialContent(res, fullPath, range);
    } catch (error) {
      console.error('Streaming error:', error);
      res.status(500).json({ error: 'Streaming failed' });
    }
  }

  private async streamPartialContent(res: Response, filePath: string, range: RangeRequest): Promise<void> {
    const { start, end, total } = range;
    const contentLength = end - start + 1;

    // Set partial content headers
    res.status(206); // Partial Content
    res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
    res.setHeader('Content-Length', contentLength);

    // Create optimized read stream
    const stream = createReadStream(filePath, {
      start,
      end,
      highWaterMark: 64 * 1024, // 64KB read chunks for smooth streaming
    });

    // Handle streaming errors gracefully
    stream.on('error', error => {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream failed' });
      }
    });

    // Track streaming metrics
    this.trackStreamingMetrics(filePath, range);

    // Pipe with backpressure handling
    stream.pipe(res);
  }

  private async streamFullFile(res: Response, filePath: string, fileSize: number): Promise<void> {
    res.setHeader('Content-Length', fileSize);

    const stream = createReadStream(filePath, {
      highWaterMark: 512 * 1024, // 512KB chunks for full file streaming
    });

    stream.on('error', error => {
      console.error('Full stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream failed' });
      }
    });

    stream.pipe(res);
  }

  private getVideoContentType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      mp4: 'video/mp4',
      webm: 'video/webm',
      ogg: 'video/ogg',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime',
      mkv: 'video/x-matroska',
    };
    return mimeTypes[ext || ''] || 'video/mp4';
  }

  private trackStreamingMetrics(filePath: string, range: RangeRequest): void {
    const key = filePath;
    const metrics = this.streamingMetrics.get(key) || {
      totalRequests: 0,
      totalBytes: 0,
      avgRangeSize: 0,
      seekPositions: [],
    };

    metrics.totalRequests++;
    metrics.totalBytes += range.end - range.start + 1;
    metrics.avgRangeSize = metrics.totalBytes / metrics.totalRequests;
    metrics.seekPositions.push(range.start);

    this.streamingMetrics.set(key, metrics);
  }
}

interface StreamingMetrics {
  totalRequests: number;
  totalBytes: number;
  avgRangeSize: number;
  seekPositions: number[];
}

export const streamingService = new StreamingService();
```

### 2. Enhanced Video Router with Range Request Support

**Updated video routes** (`backend/src/routes/video.ts`):

```typescript
import express from 'express';
import { streamingService } from '../services/streamingService.js';
import { videoLibrary } from '../services/videoLibrary.js';

const router = express.Router();

/**
 * Stream video with HTTP range request support
 * Route: GET /api/videos/:id/stream
 * Philosophy: Streaming should be transparent to the client - just works better
 */
router.get('/:id/stream', async (req, res) => {
  try {
    const videoId = req.params.id;
    const video = await videoLibrary.getVideo(videoId);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Stream with range request optimization
    await streamingService.streamVideo(req, res, video.filePath);
  } catch (error) {
    console.error('Video streaming error:', error);
    res.status(500).json({ error: 'Streaming failed' });
  }
});

/**
 * Get streaming analytics for optimization
 * Route: GET /api/videos/:id/streaming-stats
 */
router.get('/:id/streaming-stats', async (req, res) => {
  try {
    const videoId = req.params.id;
    const video = await videoLibrary.getVideo(videoId);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const stats = streamingService.getStreamingStats(video.filePath);
    res.json(stats);
  } catch (error) {
    console.error('Streaming stats error:', error);
    res.status(500).json({ error: 'Failed to get streaming stats' });
  }
});

export default router;
```

### 3. React 19 Client-Side Streaming Optimizations

**Enhanced video player component** (`frontend/src/components/VideoPlayer/StreamingPlayer.tsx`):

```typescript
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useVideoStreaming } from '../../hooks/useVideoStreaming';

interface StreamingPlayerProps {
  videoId: string;
  onProgress?: (currentTime: number, duration: number) => void;
  onSeek?: (seekTime: number) => void;
}

/**
 * Enhanced video player with range request optimization
 * Philosophy: Invisible optimization - users just experience better performance
 */
export const StreamingPlayer: React.FC<StreamingPlayerProps> = ({
  videoId,
  onProgress,
  onSeek
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [streamingStats, setStreamingStats] = useState<StreamingStats | null>(null);

  const {
    streamUrl,
    prefetchRanges,
    optimizeForSeeking,
    trackSeekingPattern
  } = useVideoStreaming(videoId);

  /**
   * Smart seeking with range request optimization
   * Philosophy: Make seeking feel instant through intelligent prefetching
   */
  const handleSeek = useCallback((seekTime: number) => {
    if (!videoRef.current) return;

    setIsBuffering(true);

    // Track seeking patterns for optimization
    trackSeekingPattern(seekTime);

    // Optimize future requests based on seek behavior
    optimizeForSeeking(seekTime);

    videoRef.current.currentTime = seekTime;
    onSeek?.(seekTime);
  }, [trackSeekingPattern, optimizeForSeeking, onSeek]);

  /**
   * Monitor streaming performance
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadStart = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);

    // Enhanced progress tracking
    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      const duration = video.duration;

      onProgress?.(currentTime, duration);

      // Prefetch likely seek positions
      prefetchRanges(currentTime, duration);
    };

    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [onProgress, prefetchRanges]);

  return (
    <div className="streaming-player">
      <video
        ref={videoRef}
        src={streamUrl}
        className="streaming-player__video"
        controls
        preload="metadata" // Optimize initial load
        crossOrigin="anonymous" // Enable range requests across origins
      />

      {isBuffering && (
        <div className="streaming-player__buffer-indicator">
          <div className="buffer-spinner" />
        </div>
      )}

      {/* Development streaming stats overlay */}
      {process.env.NODE_ENV === 'development' && streamingStats && (
        <div className="streaming-player__debug-overlay">
          <div>Avg Range Size: {Math.round(streamingStats.avgRangeSize / 1024)}KB</div>
          <div>Total Requests: {streamingStats.totalRequests}</div>
          <div>Seek Efficiency: {streamingStats.seekEfficiency}%</div>
        </div>
      )}
    </div>
  );
};

interface StreamingStats {
  avgRangeSize: number;
  totalRequests: number;
  seekEfficiency: number;
}
```

### 4. Custom Hook for Streaming Optimization

**Video streaming hook** (`frontend/src/hooks/useVideoStreaming.ts`):

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseVideoStreamingReturn {
  streamUrl: string;
  prefetchRanges: (currentTime: number, duration: number) => void;
  optimizeForSeeking: (seekTime: number) => void;
  trackSeekingPattern: (seekTime: number) => void;
}

/**
 * Custom hook for intelligent video streaming optimization
 * Philosophy: Learn from user behavior to optimize future requests
 */
export const useVideoStreaming = (videoId: string): UseVideoStreamingReturn => {
  const [streamUrl, setStreamUrl] = useState('');
  const seekingPatternRef = useRef<number[]>([]);
  const prefetchCacheRef = useRef<Map<string, boolean>>(new Map());

  // Initialize streaming URL
  useEffect(() => {
    setStreamUrl(`/api/videos/${videoId}/stream`);
  }, [videoId]);

  /**
   * Track user seeking patterns for intelligent prefetching
   */
  const trackSeekingPattern = useCallback((seekTime: number) => {
    seekingPatternRef.current.push(seekTime);

    // Keep only recent seeks (last 10)
    if (seekingPatternRef.current.length > 10) {
      seekingPatternRef.current.shift();
    }

    // Send analytics for server-side optimization
    if (seekingPatternRef.current.length % 5 === 0) {
      fetch(`/api/videos/${videoId}/seek-analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seekPattern: seekingPatternRef.current,
          timestamp: Date.now()
        })
      }).catch(console.error);
    }
  }, [videoId]);

  /**
   * Smart prefetching based on current position and seeking patterns
   */
  const prefetchRanges = useCallback((currentTime: number, duration: number) => {
    // Prefetch strategy: anticipate likely seek positions
    const prefetchPositions = calculatePrefetchPositions(
      currentTime,
      duration,
      seekingPatternRef.current
    );

    prefetchPositions.forEach(position => {
      const cacheKey = `${videoId}-${Math.floor(position)}`;

      if (!prefetchCacheRef.current.has(cacheKey)) {
        // Prefetch small range at this position
        prefetchRange(position);
        prefetchCacheRef.current.set(cacheKey, true);
      }
    });
  }, [videoId]);

  /**
   * Optimize seeking behavior based on user patterns
   */
  const optimizeForSeeking = useCallback((seekTime: number) => {
    // Analyze recent seeking pattern
    const recentSeeks = seekingPatternRef.current.slice(-5);

    if (recentSeeks.length >= 3) {
      const avgSeekDistance = calculateAverageSeekDistance(recentSeeks);

      // Adjust prefetch strategy based on seeking behavior
      if (avgSeekDistance > 60) {
        // Large jumps - prefetch chapter boundaries
        prefetchChapterBoundaries(seekTime);
      } else if (avgSeekDistance < 10) {
        // Fine scrubbing - prefetch nearby ranges
        prefetchNearbyRanges(seekTime);
      }
    }
  }, []);

  return {
    streamUrl,
    prefetchRanges,
    optimizeForSeeking,
    trackSeekingPattern
  };
};

/**
 * Calculate intelligent prefetch positions based on viewing patterns
 */
function calculatePrefetchPositions(
  currentTime: number,
  duration: number,
  seekHistory: number[]
): number[] {
  const positions: number[] = [];

  // Always prefetch a bit ahead for smooth playback
  positions.push(currentTime + 30); // 30 seconds ahead

  // Prefetch based on seeking patterns
  if (seekHistory.length >= 3) {
    const commonSeekDistances = analyzeSe seekPatterns(seekHistory);
    commonSeekDistances.forEach(distance => {
      const nextPosition = currentTime + distance;
      if (nextPosition < duration) {
        positions.push(nextPosition);
      }
    });
  }

  // Prefetch common positions (10%, 25%, 50%, 75% of video)
  const commonPositions = [0.1, 0.25, 0.5, 0.75].map(p => p * duration);
  positions.push(...commonPositions.filter(p =>
    Math.abs(p - currentTime) > 60 && p < duration
  ));

  return positions.slice(0, 5); // Limit prefetch count
}

function analyzeSe seekPatterns(seekHistory: number[]): number[] {
  // Analyze common seek distances
  const distances: number[] = [];
  for (let i = 1; i < seekHistory.length; i++) {
    distances.push(Math.abs(seekHistory[i] - seekHistory[i - 1]));
  }

  // Return most common distances
  const distanceFreq = distances.reduce((acc, dist) => {
    const rounded = Math.round(dist / 10) * 10; // Round to 10-second intervals
    acc[rounded] = (acc[rounded] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  return Object.entries(distanceFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([dist]) => parseInt(dist));
}

function prefetchRange(position: number): void {
  // Create invisible video element for prefetching
  const prefetchVideo = document.createElement('video');
  prefetchVideo.preload = 'metadata';
  prefetchVideo.currentTime = position;

  // Clean up after prefetch
  setTimeout(() => {
    prefetchVideo.remove();
  }, 1000);
}

function calculateAverageSeekDistance(seeks: number[]): number {
  if (seeks.length < 2) return 0;

  const distances = [];
  for (let i = 1; i < seeks.length; i++) {
    distances.push(Math.abs(seeks[i] - seeks[i - 1]));
  }

  return distances.reduce((sum, dist) => sum + dist, 0) / distances.length;
}

function prefetchChapterBoundaries(currentTime: number): void {
  // Prefetch at common chapter boundaries (every 5 minutes)
  const chapterLength = 300; // 5 minutes
  const nearbyChapters = [
    Math.floor(currentTime / chapterLength) * chapterLength,
    (Math.floor(currentTime / chapterLength) + 1) * chapterLength
  ];

  nearbyChapters.forEach(prefetchRange);
}

function prefetchNearbyRanges(currentTime: number): void {
  // Prefetch small ranges nearby for scrubbing
  [-15, -5, 5, 15].forEach(offset => {
    prefetchRange(currentTime + offset);
  });
}
```

## Anti-Patterns to Avoid

### ❌ **Range Request Anti-Pattern**: Oversized Range Requests

**What not to do**:

```typescript
// DON'T: Accept unlimited range sizes
const end = requestedEnd || fileSize - 1; // Could be entire file!
```

**Why it's problematic**: Allows clients to request entire files, defeating range request benefits

**Better approach**:

```typescript
// DO: Cap range size intelligently
const maxRangeSize = 10 * 1024 * 1024; // 10MB max
const end = Math.min(requestedEnd || start + defaultChunkSize, start + maxRangeSize);
```

### ❌ **Buffer Flooding Anti-Pattern**: Aggressive Prefetching

**What not to do**:

```typescript
// DON'T: Prefetch everything "just in case"
const prefetchPositions = Array.from({ length: 100 }, (_, i) => i * 30); // 50 minutes!
```

**Why it's problematic**: Wastes bandwidth, overwhelms server, provides no user benefit

**Better approach**:

```typescript
// DO: Intelligent, limited prefetching
const prefetchPositions = calculateSmartPrefetch(currentTime, seekingPattern).slice(0, 5);
```

### ❌ **Seek Blocking Anti-Pattern**: Synchronous Range Requests

**What not to do**:

```typescript
// DON'T: Block UI during seeking
video.currentTime = seekTime; // Blocks until range loaded
updateUI(); // Won't run until seek completes
```

**Why it's problematic**: Creates stuttering, unresponsive UI during seeks

**Better approach**:

```typescript
// DO: Asynchronous seeking with immediate feedback
setIsBuffering(true); // Immediate UI update
video.currentTime = seekTime; // Non-blocking
// UI remains responsive during seek
```

### ❌ **Range Header Parsing Anti-Pattern**: Brittle String Parsing

**What not to do**:

```typescript
// DON'T: Fragile parsing that breaks on edge cases
const [start, end] = rangeHeader.split('bytes=')[1].split('-');
```

**Why it's problematic**: Breaks on malformed headers, missing end values, multiple ranges

**Better approach**:

```typescript
// DO: Robust parsing with error handling
const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d*)/);
if (!rangeMatch) return null; // Graceful failure
```

## Variation Guidance

**IMPORTANT**: Range request implementations should vary based on context and usage patterns.

**For Family Movie Watching**: Larger initial chunks (2-5MB), aggressive forward prefetching
**For Content Browsing**: Smaller chunks (512KB-1MB), minimal prefetching to conserve bandwidth  
**For Mobile Clients**: Adaptive chunk sizing based on connection speed, aggressive caching
**For Desktop Clients**: Larger chunks for better performance, more prefetch strategies
**For Educational Content**: Chapter-boundary prefetching, resume-position optimization
**For Short Clips**: Full file serving may be more efficient than range requests

**Avoid converging on**: Single chunk size for all scenarios, uniform prefetch strategies, one-size-fits-all range handling

## Validation & Testing

### 1. Range Request Protocol Compliance

**HTTP protocol testing**:

```bash
# Test range request headers
curl -H "Range: bytes=0-1023" http://localhost:3000/api/videos/test-id/stream

# Verify partial content response
# Should return: 206 Partial Content, Content-Range header
```

**Automated range request tests**:

```typescript
// tests/streaming/rangeRequests.test.ts
describe('Range Request Streaming', () => {
  test('returns partial content for valid range', async () => {
    const response = await request(app).get('/api/videos/test-video/stream').set('Range', 'bytes=0-1023').expect(206);

    expect(response.headers['content-range']).toMatch(/bytes 0-1023\/\d+/);
    expect(response.body.length).toBe(1024);
  });

  test('handles invalid range gracefully', async () => {
    await request(app).get('/api/videos/test-video/stream').set('Range', 'bytes=invalid-range').expect(416);
  });
});
```

### 2. Streaming Performance Validation

**Seek performance benchmarks**:

```typescript
// tests/performance/seekPerformance.test.ts
describe('Seek Performance', () => {
  test('seeking should complete within 500ms', async () => {
    const startTime = Date.now();

    // Simulate range request for seek position
    const response = await request(app).get('/api/videos/large-video/stream').set('Range', 'bytes=50000000-50001023'); // 50MB position

    const seekTime = Date.now() - startTime;
    expect(seekTime).toBeLessThan(500);
  });
});
```

### 3. Bandwidth Efficiency Testing

**Range size optimization validation**:

```typescript
// Monitor range request sizes don't exceed reasonable limits
const MAX_REASONABLE_RANGE = 10 * 1024 * 1024; // 10MB

test('range requests stay within reasonable bounds', () => {
  const range = streamingService.parseRangeHeader('bytes=0-', fileSize);
  const rangeSize = range.end - range.start + 1;

  expect(rangeSize).toBeLessThanOrEqual(MAX_REASONABLE_RANGE);
});
```

## Success Metrics

### Performance Metrics

- **Seek Latency**: < 300ms for any seek position in files up to 4GB
- **Initial Buffering**: < 2 seconds for video start regardless of file size
- **Bandwidth Efficiency**: 60% reduction in unnecessary data transfer vs full file serving
- **Server Load**: Handle 3x more concurrent streams vs full file serving

### User Experience Metrics

- **Perceived Performance**: 95% of seeks feel "instant" (< 500ms perceived delay)
- **Buffering Events**: < 5% of playback time spent buffering with good network
- **Seek Accuracy**: 99% of seeks land within 1 second of intended position

### Technical Metrics

- **Range Request Success Rate**: > 98% successful partial content responses
- **Cache Hit Rate**: > 70% of prefetch predictions result in actual seeks
- **Error Rate**: < 1% of streaming requests fail due to range handling issues

## Integration Points

### Backend Integration

- **Express 5.x Router**: Enhanced video routes with range request middleware
- **Video Library Service**: Integration with existing video metadata for streaming optimization
- **Performance Monitoring**: Streaming analytics collection for continuous optimization

### Frontend Integration

- **Video Player Component**: Enhanced with range request awareness and smart buffering
- **Profile System**: Streaming preferences per profile (bandwidth limits, quality preferences)
- **Download Manager**: Coordinate between streaming and download functionality

### Infrastructure Integration

- **Docker**: Streaming service configuration and performance tuning
- **Nginx Proxy**: Range request passthrough configuration for production deployments
- **Monitoring**: Streaming performance metrics collection and alerting

---

**Implementation Priority**: This PRP should be implemented early in Phase 4 as it provides the foundation for all advanced video streaming features. Range request optimization directly impacts user satisfaction and server efficiency across all video playback scenarios.

**Next PRP Dependencies**: PRP-4.3 (Playback Resume) builds on streaming analytics, PRP-4.4 (Quality Management) uses range request infrastructure for adaptive streaming.
