---
name: "SOFATHEK Phase 1.4 - Advanced Backend Services & Microservice Preparation"
description: |
  Enhance the monolithic SOFATHEK backend with service-oriented architecture patterns, advanced caching, background job processing, and WebSocket real-time features while maintaining the current working functionality.

## Purpose

Evolve the functional SOFATHEK backend from a simple Express server into a sophisticated service architecture with background processing, real-time capabilities, caching, and modular service design that prepares for future microservice migration.

## Core Principles

1. **Service Isolation**: Separate concerns into distinct, testable service modules
2. **Event-Driven Architecture**: Decouple services through event emission and handling
3. **Performance Optimization**: Intelligent caching and background processing
4. **Real-Time Capabilities**: WebSocket integration for live updates and progress tracking
5. **Operational Excellence**: Comprehensive monitoring, health checks, and graceful degradation

---

## Goal

Transform the monolithic backend into a well-architected service-oriented system with background job processing, real-time WebSocket capabilities, intelligent caching, and comprehensive monitoring while preserving all existing API functionality.

## Why

- **Performance Bottlenecks**: Current synchronous processing blocks API responses during video operations
- **User Experience**: No real-time feedback for long-running operations (downloads, uploads)
- **Scalability Limits**: Monolithic architecture doesn't scale individual components
- **Operational Visibility**: Limited insights into system performance and bottlenecks
- **Feature Limitations**: Missing real-time features expected in modern media applications
- **Maintainability**: Large controller files difficult to test and modify independently

## What

A comprehensive backend architecture enhancement with modern patterns and capabilities:

### Service-Oriented Architecture

```typescript
// Current: Monolithic route handlers
router.post('/upload', upload.single('video'), async (req, res) => {
  // Everything in one place - scanning, processing, metadata, thumbnails
});

// Enhanced: Service-oriented with clear separation
class VideoProcessingService {
  async processUpload(file: UploadedFile): Promise<ProcessingJob> {
    const job = await this.jobQueue.add('process-video', {
      filePath: file.path,
      category: file.category,
    });
    return job;
  }
}

class MetadataService {
  async extractMetadata(videoPath: string): Promise<VideoMetadata> {}
  async generateThumbnails(videoPath: string): Promise<string[]> {}
}

class NotificationService {
  async notifyProgress(jobId: string, progress: number): Promise<void> {}
}
```

### Background Job Processing with Bull Queue

```typescript
// Enhanced: Background processing for heavy operations
import Bull from 'bull';
import Redis from 'ioredis';

export class JobProcessingService {
  private videoQueue: Bull.Queue;
  private downloadQueue: Bull.Queue;

  constructor() {
    const redis = new Redis(process.env.REDIS_URL);

    this.videoQueue = new Bull('video processing', { redis });
    this.downloadQueue = new Bull('youtube download', { redis });

    this.setupProcessors();
  }

  private setupProcessors() {
    // Video processing jobs (upload, scanning, thumbnail generation)
    this.videoQueue.process('process-upload', 5, async job => {
      const { filePath, category, userId } = job.data;

      // Update progress through WebSocket
      job.progress(10);
      await this.metadataService.extractMetadata(filePath);

      job.progress(50);
      await this.thumbnailService.generateThumbnails(filePath);

      job.progress(90);
      await this.scannerService.updateLibraryIndex(filePath);

      job.progress(100);
      await this.notificationService.notifyCompletion(userId, job.id);
    });

    // YouTube download jobs
    this.downloadQueue.process('youtube-download', 3, async job => {
      const { url, quality, category } = job.data;
      return await this.youtubeService.downloadWithProgress(url, quality, progress => {
        job.progress(progress);
      });
    });
  }
}
```

### WebSocket Real-Time Communication

```typescript
// Enhanced: Real-time progress updates and notifications
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

export class WebSocketService {
  private io: SocketIOServer;

  constructor(server: any) {
    this.io = new SocketIOServer(server, {
      cors: { origin: process.env.FRONTEND_URL },
      transports: ['websocket', 'polling'],
    });

    // Redis adapter for scaling (future-ready)
    const redis = new Redis(process.env.REDIS_URL);
    this.io.adapter(createAdapter(redis, redis.duplicate()));

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', socket => {
      socket.on('join-room', (userId: string) => {
        socket.join(`user:${userId}`);
      });

      socket.on('subscribe-job', (jobId: string) => {
        socket.join(`job:${jobId}`);
      });
    });
  }

  // Emit progress updates
  notifyJobProgress(jobId: string, progress: number): void {
    this.io.to(`job:${jobId}`).emit('job-progress', { jobId, progress });
  }

  // Emit system notifications
  notifyUser(userId: string, notification: any): void {
    this.io.to(`user:${userId}`).emit('notification', notification);
  }
}
```

### Intelligent Caching Layer

```typescript
// Enhanced: Multi-level caching strategy
export class CacheService {
  private redis: Redis;
  private memoryCache: LRUCache<string, any>;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.memoryCache = new LRUCache({ max: 1000, ttl: 300000 }); // 5min TTL
  }

  // Video metadata caching
  async getVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
    // L1: Memory cache (fastest)
    let metadata = this.memoryCache.get(`video:${videoId}`);
    if (metadata) return metadata;

    // L2: Redis cache (fast)
    const cached = await this.redis.get(`video:${videoId}`);
    if (cached) {
      metadata = JSON.parse(cached);
      this.memoryCache.set(`video:${videoId}`, metadata);
      return metadata;
    }

    return null;
  }

  async setVideoMetadata(videoId: string, metadata: VideoMetadata): Promise<void> {
    // Store in both layers
    this.memoryCache.set(`video:${videoId}`, metadata);
    await this.redis.setex(`video:${videoId}`, 3600, JSON.stringify(metadata));
  }

  // Library scan caching (expensive operation)
  async getCachedScanResult(category?: string): Promise<ScanResult | null> {
    const key = `scan:${category || 'all'}`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async cacheScanResult(result: ScanResult, category?: string): Promise<void> {
    const key = `scan:${category || 'all'}`;
    await this.redis.setex(key, 300, JSON.stringify(result)); // 5min cache
  }
}
```

### Advanced Health Monitoring

```typescript
// Enhanced: Comprehensive health monitoring
export class HealthService {
  private checks: Map<string, () => Promise<HealthCheck>> = new Map();

  constructor() {
    this.registerHealthChecks();
  }

  private registerHealthChecks() {
    // Database connectivity
    this.checks.set('database', async () => {
      try {
        await this.redis.ping();
        return { status: 'healthy', responseTime: Date.now() };
      } catch (error) {
        return { status: 'unhealthy', error: error.message };
      }
    });

    // File system access
    this.checks.set('filesystem', async () => {
      try {
        const dataPath = process.env.SOFATHEK_DATA_PATH;
        await fs.access(dataPath, fs.constants.R_OK | fs.constants.W_OK);
        return { status: 'healthy', path: dataPath };
      } catch (error) {
        return { status: 'unhealthy', error: 'Cannot access data directory' };
      }
    });

    // External service availability
    this.checks.set('youtube-dl', async () => {
      try {
        const { stdout } = await exec('yt-dlp --version');
        return { status: 'healthy', version: stdout.trim() };
      } catch (error) {
        return { status: 'unhealthy', error: 'yt-dlp not available' };
      }
    });

    // System resources
    this.checks.set('resources', async () => {
      const stats = {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        cpu: process.cpuUsage(),
      };
      return { status: 'healthy', stats };
    });
  }

  async runHealthChecks(): Promise<HealthReport> {
    const results: Record<string, any> = {};
    let overallStatus = 'healthy';

    for (const [name, check] of this.checks) {
      try {
        results[name] = await Promise.race([
          check(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 5000)),
        ]);
      } catch (error) {
        results[name] = { status: 'unhealthy', error: error.message };
        overallStatus = 'degraded';
      }
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results,
    };
  }
}
```

### Success Criteria

- [ ] **Service Architecture**: Clear separation of concerns with 8+ distinct services
- [ ] **Background Processing**: All heavy operations (upload, download, scan) run asynchronously
- [ ] **Real-Time Updates**: WebSocket provides live progress for all long-running operations
- [ ] **Caching Performance**: 90%+ cache hit rate for frequently accessed data
- [ ] **API Response Time**: 95% of API calls respond within 200ms (excluding file operations)
- [ ] **Job Processing**: Background jobs process reliably with retry logic and failure handling
- [ ] **Health Monitoring**: Comprehensive health checks with detailed system insights
- [ ] **Backwards Compatibility**: All existing API endpoints work identically

## All Needed Context

### Current System Analysis

```yaml
# Existing functionality to preserve
working_features:
  - Video scanning and metadata extraction
  - File upload handling
  - YouTube download integration
  - Video streaming with range requests
  - Category-based organization
  - Admin operations and monitoring

# Performance bottlenecks to address
bottlenecks:
  - Synchronous video processing blocks API responses
  - Full library rescans on every API call
  - No caching of expensive operations
  - No real-time progress feedback
  - Large controller files with mixed concerns
```

### New Dependencies

```yaml
production_dependencies:
  - bull: '^4.12.0' # Background job processing
  - ioredis: '^5.3.2' # Redis client for caching and jobs
  - socket.io: '^4.7.4' # WebSocket real-time communication
  - lru-cache: '^10.1.0' # In-memory caching layer
  - '@socket.io/redis-adapter': '^8.2.1' # Scaling WebSockets

development_dependencies:
  - bull-board: '^5.10.2' # Job queue monitoring UI
  - redis-cli: '^2.1.2' # Redis debugging tools

infrastructure:
  - redis: '^7.2' # Required for jobs and caching
```

### Service Architecture Design

```yaml
# Service layer organization
services:
  VideoProcessingService:
    responsibilities: [metadata_extraction, thumbnail_generation, format_conversion]
    dependencies: [ffmpegService, cacheService]

  YouTubeDownloadService:
    responsibilities: [url_validation, download_management, progress_tracking]
    dependencies: [ytdlpService, jobProcessingService]

  LibraryScannerService:
    responsibilities: [file_discovery, index_updates, category_management]
    dependencies: [cacheService, metadataService]

  NotificationService:
    responsibilities: [real_time_updates, user_notifications, progress_tracking]
    dependencies: [webSocketService, cacheService]

  CacheService:
    responsibilities: [metadata_caching, scan_result_caching, performance_optimization]
    dependencies: [redis, lru_cache]

  HealthService:
    responsibilities: [system_monitoring, dependency_checks, performance_metrics]
    dependencies: [all_services]
```

## Implementation Blueprint

### Task List

```yaml
Phase 1.4.1: Redis Infrastructure Setup
FILES:
  - backend/src/config/redis.ts (NEW)
  - backend/src/services/cache.ts (NEW)
ACTION: Setup Redis connection and caching infrastructure
PATTERN: |
  // Redis configuration with retry logic
  export const createRedisConnection = () => {
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    redis.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });

    return redis;
  };

Phase 1.4.2: Background Job Processing System
FILES:
  - backend/src/services/jobProcessing.ts (NEW)
  - backend/src/services/videoProcessing.ts (ENHANCE)
ACTION: Implement Bull queue for background processing
ENHANCEMENT: Move heavy operations out of API request cycle
PATTERN: |
  export class JobProcessingService {
    private videoQueue: Bull.Queue;

    constructor() {
      this.videoQueue = new Bull('video-processing', {
        redis: redisConfig,
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 50,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 }
        }
      });

      this.setupProcessors();
    }

    async addVideoProcessingJob(data: VideoJobData): Promise<Bull.Job> {
      return this.videoQueue.add('process-video', data, {
        priority: data.priority || 0,
        delay: data.delay || 0
      });
    }
  }

Phase 1.4.3: WebSocket Real-Time Communication
FILES:
  - backend/src/services/webSocket.ts (NEW)
  - backend/src/middleware/socketAuth.ts (NEW)
ACTION: Implement Socket.io for real-time updates
ENHANCEMENT: Live progress tracking and notifications
PATTERN: |
  export class WebSocketService extends EventEmitter {
    private io: SocketIOServer;

    constructor(server: any) {
      super();

      this.io = new SocketIOServer(server, {
        cors: { origin: process.env.FRONTEND_URL },
        transports: ['websocket', 'polling']
      });

      this.setupEventHandlers();
      this.setupRoomManagement();
    }

    emitJobProgress(jobId: string, progress: JobProgress): void {
      this.io.to(`job:${jobId}`).emit('job-progress', progress);
    }

    emitLibraryUpdate(category: string, update: LibraryUpdate): void {
      this.io.to(`library:${category}`).emit('library-update', update);
    }
  }

Phase 1.4.4: Service Layer Refactoring
FILES:
  - backend/src/services/video.ts (REFACTOR from routes/videos.ts)
  - backend/src/services/download.ts (REFACTOR from routes/downloads.ts)
  - backend/src/services/library.ts (NEW)
ACTION: Extract business logic into dedicated services
ENHANCEMENT: Separation of concerns and testability
PATTERN: |
  // Extract from route handlers to services
  export class VideoService {
    constructor(
      private cacheService: CacheService,
      private metadataService: MetadataService,
      private jobService: JobProcessingService
    ) {}

    async getVideoLibrary(filters: LibraryFilters): Promise<LibraryResponse> {
      // Try cache first
      const cached = await this.cacheService.getCachedLibrary(filters);
      if (cached) return cached;

      // Generate response
      const response = await this.generateLibraryResponse(filters);

      // Cache result
      await this.cacheService.cacheLibraryResponse(filters, response);

      return response;
    }

    async processVideoUpload(file: UploadedFile): Promise<ProcessingJob> {
      // Queue background processing
      const job = await this.jobService.addVideoProcessingJob({
        type: 'upload-processing',
        filePath: file.path,
        category: file.category,
        userId: file.userId
      });

      return { jobId: job.id, status: 'queued' };
    }
  }

Phase 1.4.5: Enhanced Health Monitoring
FILES:
  - backend/src/services/health.ts (NEW)
  - backend/src/routes/health.ts (ENHANCE)
ACTION: Comprehensive system health monitoring
ENHANCEMENT: Operational visibility and debugging
PATTERN: |
  export class HealthService {
    async getSystemHealth(): Promise<HealthReport> {
      const checks = await Promise.allSettled([
        this.checkRedisHealth(),
        this.checkFileSystemHealth(),
        this.checkExternalServicesHealth(),
        this.checkResourceUsage()
      ]);

      return this.aggregateHealthResults(checks);
    }

    private async checkRedisHealth(): Promise<HealthCheck> {
      const start = Date.now();
      try {
        await this.redis.ping();
        return {
          name: 'redis',
          status: 'healthy',
          responseTime: Date.now() - start
        };
      } catch (error) {
        return {
          name: 'redis',
          status: 'unhealthy',
          error: error.message
        };
      }
    }
  }
```

### API Integration Points

```typescript
// PRESERVE: Existing API contracts while adding enhancements
// Enhanced video upload with job tracking
router.post('/upload', upload.single('video'), async (req, res) => {
  try {
    // NEW: Return job ID instead of blocking on processing
    const job = await videoService.processVideoUpload(req.file);

    res.json({
      message: 'Upload initiated successfully',
      jobId: job.jobId,
      status: job.status,
      // NEW: WebSocket endpoint for real-time updates
      trackingUrl: `/api/jobs/${job.jobId}/status`,
    });
  } catch (error) {
    next(error);
  }
});

// NEW: Job status endpoint for frontend polling
router.get('/jobs/:jobId/status', async (req, res) => {
  const job = await jobService.getJobStatus(req.params.jobId);
  res.json(job);
});

// ENHANCED: Library endpoint with intelligent caching
router.get('/', validateQuery, async (req, res) => {
  const filters = {
    category: req.query.category,
    page: req.query.page,
    limit: req.query.limit,
    search: req.query.search,
  };

  // NEW: Cached response, background refresh if stale
  const library = await videoService.getVideoLibrary(filters);

  res.json({
    ...library,
    // NEW: Cache metadata
    cached: library.fromCache,
    lastUpdated: library.lastUpdated,
  });
});
```

## Validation Loop

### Level 1: Redis Infrastructure

```bash
# Start Redis (if not running)
docker run -d --name redis -p 6379:6379 redis:7.2-alpine

# Test Redis connection
npm run test:redis

# Verify caching works
curl -s http://localhost:3001/api/videos?category=movies
# Should cache the result

curl -s http://localhost:3001/api/videos?category=movies
# Should return cached result (faster response)
```

### Level 2: Background Job Processing

```bash
# Start the enhanced backend
npm run dev

# Upload a video (should return immediately with job ID)
curl -X POST localhost:3001/api/videos/upload \
  -F "video=@test.mp4" \
  -F "category=family"

# Expected response:
# {
#   "message": "Upload initiated successfully",
#   "jobId": "12345",
#   "status": "queued"
# }

# Check job status
curl localhost:3001/api/jobs/12345/status
# Should show processing progress
```

### Level 3: WebSocket Real-Time Updates

```javascript
// Frontend test (browser console)
const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected to WebSocket');
  socket.emit('subscribe-job', '12345');
});

socket.on('job-progress', progress => {
  console.log('Job progress:', progress);
});

// Should receive real-time progress updates during video processing
```

### Level 4: Performance & Caching

```bash
# Test library performance (should be fast after first call)
time curl -s http://localhost:3001/api/videos > /dev/null
# First call: slower (cache miss)

time curl -s http://localhost:3001/api/videos > /dev/null
# Second call: much faster (cache hit)

# Check cache statistics
curl localhost:3001/api/health/cache
# Should show hit/miss ratios and performance metrics
```

### Level 5: System Health Monitoring

```bash
# Check comprehensive system health
curl -s http://localhost:3001/api/health | jq

# Expected response with all subsystems:
# {
#   "status": "healthy",
#   "checks": {
#     "redis": { "status": "healthy", "responseTime": 2 },
#     "filesystem": { "status": "healthy" },
#     "youtube-dl": { "status": "healthy", "version": "2024.1.7" },
#     "resources": { "status": "healthy", "memory": {...} }
#   }
# }
```

## Known Gotchas & Best Practices

### Job Queue Configuration

```typescript
// ✅ GOOD: Proper job options with retry logic
const jobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: 10, // Keep only recent successful jobs
  removeOnFail: 50, // Keep failed jobs for debugging
};

// ❌ BAD: No retry logic or job cleanup
queue.add('job', data); // Jobs accumulate, no error handling
```

### Caching Strategy

```typescript
// ✅ GOOD: Multi-level caching with appropriate TTLs
async getCachedData(key: string) {
  // L1: Memory (fast, short TTL)
  let data = memoryCache.get(key);
  if (data) return data;

  // L2: Redis (medium speed, longer TTL)
  data = await redis.get(key);
  if (data) {
    memoryCache.set(key, data);
    return JSON.parse(data);
  }

  return null;
}

// ❌ BAD: Single level caching with no TTL management
cache.set(key, data); // Never expires, memory leak
```

### WebSocket Room Management

```typescript
// ✅ GOOD: Proper room joining and cleanup
socket.on('subscribe-job', jobId => {
  socket.join(`job:${jobId}`);
  // Auto-leave room when job completes
  job.on('completed', () => socket.leave(`job:${jobId}`));
});

// ❌ BAD: No room management
socket.on('subscribe-job', jobId => {
  // Socket stays in room forever, memory leak
  socket.join(`job:${jobId}`);
});
```

### Service Dependency Injection

```typescript
// ✅ GOOD: Constructor injection for testability
class VideoService {
  constructor(
    private cache: CacheService,
    private jobs: JobService,
    private websocket: WebSocketService
  ) {}
}

// ❌ BAD: Direct service imports (hard to test)
class VideoService {
  processVideo() {
    const cache = new CacheService(); // Tight coupling
    const jobs = new JobService();
  }
}
```

## Success Metrics

**Performance Improvements**:

- API response time: 95% under 200ms (vs current 2-5 second blocking calls)
- Cache hit rate: 85%+ for frequently accessed data
- Background job processing: 100% of heavy operations asynchronous

**Real-Time Capabilities**:

- WebSocket connection success rate: 99%+
- Progress update latency: < 100ms
- Concurrent WebSocket connections: Support 100+ users

**System Reliability**:

- Job processing success rate: 95%+ (with retries)
- Health check response time: < 50ms
- Service uptime: 99.9%+ (with graceful degradation)

**Architecture Quality**:

- Service separation: 8+ distinct, testable services
- Code coverage: 90%+ for service layer
- Dependency injection: 100% of services use DI pattern

## Time Estimate

**Total Implementation Time**: 8-12 hours

- Redis infrastructure setup: 1-2 hours
- Background job processing: 3-4 hours
- WebSocket implementation: 2-3 hours
- Service layer refactoring: 2-3 hours
- Health monitoring: 1 hour
- Testing and validation: 2-3 hours

**Confidence Level**: Medium-High - Established patterns with some complexity

---

## Anti-Patterns to Avoid

❌ **Service Coupling**: Don't create tight dependencies between services that prevent independent testing
❌ **WebSocket Abuse**: Don't send all data through WebSocket, use for real-time updates only
❌ **Cache Invalidation Complexity**: Don't create overly complex cache invalidation logic
❌ **Job Queue Overflow**: Don't queue jobs without rate limiting or resource management
❌ **Health Check Overload**: Don't make health checks so comprehensive they become slow

## Remember

This transformation elevates SOFATHEK from a functional media server to a sophisticated, scalable backend architecture. Every enhancement preserves existing functionality while adding the performance, real-time capabilities, and operational excellence needed for production deployment.

**Same API, service-grade architecture.**
