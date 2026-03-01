# Feature: Sofathek YouTube Integration (Phase 2)

## Summary

Building YouTube video download and processing capabilities for Sofathek family media center using yt-dlp integration, download queue management, FFmpeg thumbnail generation, and seamless integration with existing video service infrastructure. This enables parents to curate YouTube content into their private, safe media library.

## User Story

As a tech-savvy parent in a family household with children
I want to download and curate specific YouTube videos into my family media library
So that I can provide safe, controlled access to appropriate content without exposing children to YouTube's algorithm and inappropriate material

## Problem Statement

Parents need the ability to download specific YouTube videos they approve of and integrate them into their family media center, replacing uncontrolled YouTube access with a curated, parent-governed video library that eliminates exposure to inappropriate content.

## Solution Statement

Implement YouTube download capabilities using yt-dlp integration with a queue-based processing system that automatically downloads videos, generates thumbnails with FFmpeg, and integrates downloaded content into the existing video service infrastructure for seamless family access.

## Metadata

| Field                  | Value                                             |
| ---------------------- | ------------------------------------------------- |
| Type                   | NEW_CAPABILITY                                    |
| Complexity             | HIGH                                              |
| Systems Affected       | Backend API, Video Service, File System, Queue Management |
| Dependencies           | youtube-dl-exec@^3.1.3, ffmpeggy@^2.1.0, uuid@^9.0.0 |
| Estimated Tasks        | 12                                                |
| **Research Timestamp** | **March 01, 2026 - 20:15 UTC**                   |

---

## UX Design

### Before State
```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                              BEFORE STATE                                      ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐            ║
║   │   Parent    │ ──────► │   YouTube   │ ──────► │   Manual    │            ║
║   │ Finds Video │         │   Website   │         │ Consumption │            ║
║   └─────────────┘         └─────────────┘         └─────────────┘            ║
║                                                                               ║
║   USER_FLOW: Parent finds video on YouTube → Family watches on YouTube       ║
║   PAIN_POINT: No content control, algorithmic exposure, inappropriate content ║
║   DATA_FLOW: External YouTube → Uncontrolled algorithm → Family exposure      ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### After State
```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                               AFTER STATE                                      ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐            ║
║   │   Parent    │ ──────► │  Sofathek   │ ──────► │   Family    │            ║
║   │ Adds URL    │         │  Download   │         │   Library   │            ║
║   └─────────────┘         └─────────────┘         └─────────────┘            ║
║          │                        │                       │                   ║
║          ▼                        ▼                       ▼                   ║
║   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐            ║
║   │ yt-dlp      │         │ Thumbnail   │         │   Safe      │            ║
║   │ Processing  │         │ Generation  │         │ Consumption │            ║
║   └─────────────┘         └─────────────┘         └─────────────┘            ║
║                                                                               ║
║   USER_FLOW: Parent adds YouTube URL → Download & process → Curated library   ║
║   VALUE_ADD: Complete content control, no algorithm exposure, safe viewing    ║
║   DATA_FLOW: YouTube URL → yt-dlp → Local storage → Family video library     ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Interaction Changes
| Location               | Before                  | After                           | User_Action              | Impact                        |
|------------------------|-------------------------|--------------------------------|--------------------------|-------------------------------|
| `/api/youtube/download`| Non-existent            | Accepts YouTube URLs           | POST with URL            | Can add videos to queue       |
| `/api/youtube/queue`   | Non-existent            | Returns download status        | GET request              | Can monitor download progress |
| `data/videos/`         | Manual file placement   | Automatic from YouTube         | Parent adds URL          | Videos appear automatically   |
| Family video library  | Static content only     | Dynamic YouTube integration    | Browse interface         | Access to curated YouTube     |

---

## Mandatory Reading

**CRITICAL: Implementation agent MUST read these files before starting any task:**

| Priority | File | Lines | Why Read This |
|----------|------|-------|---------------|
| P0 | `backend/src/services/videoService.ts` | 15-194 | Service architecture pattern to MIRROR exactly |
| P0 | `backend/src/routes/api.ts` | 8-138 | API endpoint patterns to FOLLOW |
| P0 | `backend/src/middleware/errorHandler.ts` | 7-138 | Error handling patterns to MIRROR |
| P0 | `backend/src/types/video.ts` | 1-95 | Type definitions to EXTEND |
| P1 | `backend/src/utils/logger.ts` | 6-31 | Logging patterns to FOLLOW |
| P1 | `backend/package.json` | 1-39 | Dependencies and scripts structure |

**Current External Documentation (Verified Live):**
| Source | Section | Why Needed | Last Verified |
|--------|---------|------------|---------------|
| [youtube-dl-exec v3.1.3](https://github.com/microlinkhq/youtube-dl-exec#usage) ✓ Current | Node.js yt-dlp wrapper | Core download functionality | March 01, 2026 20:15 |
| [FFmpeggy v2.1.0](https://github.com/mekwall/ffmpeggy/blob/main/README.md) ✓ Current | TypeScript FFmpeg wrapper | Thumbnail generation | March 01, 2026 20:15 |
| [yt-dlp Installation](https://github.com/yt-dlp/yt-dlp/wiki/Installation) ✓ Current | Binary installation | Docker integration | March 01, 2026 20:15 |

---

## Patterns to Mirror

**NAMING_CONVENTION:**
```typescript
// SOURCE: backend/src/services/videoService.ts:15-20
// COPY THIS PATTERN:
export class VideoService {
  private readonly videosDirectory: string;
  
  constructor(videosDirectory: string) {
    this.videosDirectory = videosDirectory;
  }
}
```

**ERROR_HANDLING:**
```typescript
// SOURCE: backend/src/middleware/errorHandler.ts:7-19
// COPY THIS PATTERN:
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}
```

**LOGGING_PATTERN:**
```typescript
// SOURCE: backend/src/utils/logger.ts:6-31
// COPY THIS PATTERN:
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'sofathek-backend' }
});
```

**API_PATTERN:**
```typescript
// SOURCE: backend/src/routes/api.ts:18-26
// COPY THIS PATTERN:
router.get('/videos', catchAsync(async (_req: Request, res: Response) => {
  logger.info('Fetching video list');
  const result = await videoService.scanVideoDirectory();
  
  res.json({
    status: 'success',
    data: result
  });
}));
```

**SERVICE_PATTERN:**
```typescript
// SOURCE: backend/src/services/videoService.ts:25-78
// COPY THIS PATTERN:
async scanVideoDirectory(): Promise<VideoScanResult> {
  await this.ensureDirectoryExists();
  
  try {
    const files = await fs.readdir(this.videosDirectory, { withFileTypes: true });
    const videoFiles = files.filter(file => file.isFile() && this.isVideoFile(file.name));
    
    const videos: Video[] = [];
    const errors: string[] = [];
    
    for (const filename of videoFiles) {
      try {
        // Process each file...
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Error processing ${filename}: ${errorMessage}`);
      }
    }
    
    return { videos, totalCount: videos.length, errors };
  } catch (error) {
    throw new AppError('Failed to scan video directory', 500);
  }
}
```

**YOUTUBE_DOWNLOAD_INTEGRATION:**
```typescript
// NEW PATTERN: Based on youtube-dl-exec current best practices
import youtubedl from 'youtube-dl-exec';

export class YouTubeDownloadService {
  private readonly videosDirectory: string;
  private readonly tempDirectory: string;

  async downloadVideo(url: string): Promise<DownloadResult> {
    try {
      // Validate URL first
      if (!await this.validateYouTubeUrl(url)) {
        throw new AppError('Invalid YouTube URL format', 400);
      }

      // Get video metadata
      const metadata = await youtubedl(url, {
        dumpSingleJson: true,
        noWarnings: true,
        skipDownload: true
      });

      // Download with progress tracking
      const downloadPath = path.join(this.tempDirectory, `${metadata.id}.%(ext)s`);
      
      const subprocess = youtubedl.exec(url, {
        output: downloadPath,
        format: 'best[ext=mp4]/best',
        noPlaylist: true,
        restrictFilenames: true
      });

      // Monitor progress
      subprocess.stdout.on('data', (data) => {
        logger.info('Download progress', { data: data.toString() });
      });

      await subprocess;
      
      // Generate thumbnail and move to library
      const finalPath = await this.processDownloadedVideo(downloadPath, metadata);
      
      return {
        id: metadata.id,
        status: 'success',
        video: await this.createVideoFromDownload(finalPath, metadata),
        completedAt: new Date()
      };
    } catch (error) {
      logger.error('YouTube download failed', { url, error: error.message });
      throw new AppError(`Download failed: ${error.message}`, 500, false);
    }
  }
}
```

**THUMBNAIL_GENERATION:**
```typescript
// NEW PATTERN: Based on FFmpeggy current best practices
import { FFmpeggy } from 'ffmpeggy';

private async generateThumbnail(videoPath: string): Promise<string> {
  const thumbnailPath = path.join(
    this.tempDirectory, 
    'thumbnails', 
    `${path.basename(videoPath, path.extname(videoPath))}.jpg`
  );

  const ffmpeggy = new FFmpeggy({
    input: videoPath,
    output: thumbnailPath,
    outputOptions: [
      '-ss', '00:00:01.000',        // Seek to 1 second
      '-vframes', '1',              // Extract 1 frame
      '-q:v', '2',                  // High quality
      '-vf', 'scale=320:240'        // Resize to thumbnail
    ],
    overwriteExisting: true
  });

  await ffmpeggy.run();
  await ffmpeggy.done();

  return thumbnailPath;
}
```

---

## Current Best Practices Validation

**Security (Context7 MCP Verified):**
- [x] Current OWASP recommendations followed - URL validation, path traversal prevention
- [x] Recent CVE advisories checked - youtube-dl-exec v3.1.3 has no known vulnerabilities
- [x] Authentication patterns up-to-date - API endpoints use existing auth middleware
- [x] Data validation follows current standards - YouTube URL format validation required

**Performance (Web Intelligence Verified):**
- [x] Current optimization techniques applied - Queue-based processing prevents resource exhaustion
- [x] Recent benchmarks considered - youtube-dl-exec efficient for family-scale usage
- [x] Database patterns follow current best practices - File system approach maintained
- [x] Caching strategies align with current recommendations - Metadata caching during processing

**Community Intelligence:**
- [x] Recent Stack Overflow solutions reviewed - youtube-dl-exec subprocess management patterns
- [x] Framework maintainer recommendations followed - FFmpeggy TypeScript patterns
- [x] No deprecated patterns detected in community discussions - All approaches current
- [x] Current testing approaches validated - Integration testing for download workflows

---

## Files to Change

| File                                              | Action | Justification                            |
| ------------------------------------------------- | ------ | ---------------------------------------- |
| `backend/package.json`                           | UPDATE | Add youtube-dl-exec, ffmpeggy, uuid dependencies |
| `backend/src/types/youtube.ts`                   | CREATE | YouTube-specific type definitions        |
| `backend/src/services/youTubeDownloadService.ts` | CREATE | Core YouTube download functionality      |
| `backend/src/services/downloadQueueService.ts`  | CREATE | Queue management for download operations |
| `backend/src/services/thumbnailService.ts`      | CREATE | FFmpeg thumbnail generation service      |
| `backend/src/services/index.ts`                 | CREATE | Service exports and initialization       |
| `backend/src/routes/youtube.ts`                  | CREATE | YouTube API endpoints                    |
| `backend/src/routes/api.ts`                      | UPDATE | Import and mount YouTube routes          |
| `backend/Dockerfile`                             | UPDATE | Add yt-dlp and FFmpeg to container      |
| `docker-compose.yml`                             | UPDATE | Add temp directory volume mount          |

---

## NOT Building (Scope Limits)

Explicit exclusions to prevent scope creep:

- **Frontend UI for YouTube download** - Phase 3 scope, React interface comes later
- **Playlist download support** - Single video focus for family curation
- **Advanced format selection** - Use best available format for simplicity
- **User authentication per download** - Single-family system as per PRD
- **Content recommendation engine** - PRD explicitly avoids algorithmic discovery
- **Multi-concurrent download streams** - Sequential processing for resource control
- **Video transcoding/conversion** - Accept downloaded format as-is

---

## Step-by-Step Tasks

Execute in order. Each task is atomic and independently verifiable.

After each task: build, functionally test, then run unit tests with coverage enabled. Use npm scripts for consistency.

**Coverage Targets**: MVP 40% (Phase 2 adds substantial new functionality)

### Task 1: UPDATE `backend/package.json`

- **ACTION**: ADD YouTube integration dependencies
- **IMPLEMENT**: youtube-dl-exec@^3.1.3, ffmpeggy@^2.1.0, uuid@^9.0.0, @types/uuid
- **MIRROR**: `backend/package.json:17-37` - follow existing dependency pattern
- **IMPORTS**: Add to dependencies object with version constraints
- **GOTCHA**: youtube-dl-exec requires Python 3.9+ available as python3 in container
- **CURRENT**: youtube-dl-exec v3.1.3 is latest stable with yt-dlp auto-install
- **CONFIG_CONFLICTS**: None detected with existing dependencies
- **GENERATED_FILES**: None for dependency additions
- **VALIDATE**: `cd backend && npm install && npx tsc --noEmit`
- **FUNCTIONAL**: `cd backend && node -e "console.log(require('youtube-dl-exec'))"` - verify import
- **TEST_PYRAMID**: No additional tests needed - dependency configuration only

### Task 2: UPDATE `backend/Dockerfile`

- **ACTION**: ADD yt-dlp and FFmpeg to container image
- **IMPLEMENT**: Install python3, yt-dlp binary, and FFmpeg in Docker image
- **MIRROR**: `backend/Dockerfile:197-210` - follow existing multi-stage pattern
- **PATTERN**: Add installation commands to runtime stage after user creation
- **GOTCHA**: Install python3-pip and ffmpeg packages before copying application code
- **CURRENT**: Alpine packages python3, py3-pip, ffmpeg available in node:18-alpine
- **VALIDATE**: `cd backend && docker build -t sofathek-backend-test .`
- **FUNCTIONAL**: `docker run --rm sofathek-backend-test python3 --version && docker run --rm sofathek-backend-test ffmpeg -version` - verify tools
- **TEST_PYRAMID**: No additional tests needed - container configuration

### Task 3: UPDATE `docker-compose.yml`

- **ACTION**: ADD temp directory volume mount for YouTube downloads
- **IMPLEMENT**: Add temp volume mount and environment variables
- **MIRROR**: `docker-compose.yml:18` - follow existing volume pattern
- **SERVICES**: Add temp directory volume for download processing
- **GOTCHA**: Ensure temp directory permissions allow container write access
- **CURRENT**: Docker Compose v2 syntax with named volumes
- **VALIDATE**: `docker-compose config` - verify configuration valid
- **FUNCTIONAL**: `docker-compose up -d && docker-compose exec backend ls -la /app/data` - verify mounts
- **TEST_PYRAMID**: No additional tests needed - infrastructure configuration

### Task 4: CREATE `backend/src/types/youtube.ts`

- **ACTION**: CREATE TypeScript interfaces for YouTube operations
- **IMPLEMENT**: DownloadRequest, DownloadResult, QueueItem, QueueStatus interfaces
- **MIRROR**: `backend/src/types/video.ts:4-95` - follow existing type pattern
- **TYPES**: Extend existing patterns with YouTube-specific properties
- **CURRENT**: TypeScript 5.x interface patterns with strict typing
- **VALIDATE**: `cd backend && npx tsc --noEmit`
- **FUNCTIONAL**: Import interfaces in other modules successfully
- **TEST_PYRAMID**: No additional tests needed - type definitions only

### Task 5: CREATE `backend/src/services/thumbnailService.ts`

- **ACTION**: CREATE FFmpeg thumbnail generation service
- **IMPLEMENT**: generateThumbnail method using FFmpeggy wrapper
- **MIRROR**: `backend/src/services/videoService.ts:118-186` - follow private method pattern
- **PATTERN**: Service class with dependency injection and proper error handling
- **IMPORTS**: `ffmpeggy`, `path`, `fs/promises`, logger, custom types
- **GOTCHA**: FFmpeg requires proper input format detection and error handling
- **CURRENT**: FFmpeggy v2.1.0 TypeScript patterns with event handling
- **VALIDATE**: `cd backend && npx tsc --noEmit && npm test -- thumbnailService.test.ts`
- **FUNCTIONAL**: Create test video and verify thumbnail generation works
- **TEST_PYRAMID**: Add integration test for: thumbnail generation with various video formats

### Task 6: CREATE `backend/src/services/youTubeDownloadService.ts`

- **ACTION**: CREATE core YouTube download functionality
- **IMPLEMENT**: downloadVideo, validateYouTubeUrl, processDownloadedVideo methods
- **MIRROR**: `backend/src/services/videoService.ts:25-114` - follow service method patterns
- **PATTERN**: Async service methods with structured error handling and logging
- **IMPORTS**: `youtube-dl-exec`, `path`, `fs/promises`, logger, custom types
- **GOTCHA**: youtube-dl-exec subprocess management requires proper cleanup
- **CURRENT**: youtube-dl-exec v3.1.3 subprocess control patterns
- **VALIDATE**: `cd backend && npx tsc --noEmit && npm test -- youTubeDownloadService.test.ts`
- **FUNCTIONAL**: Test with real YouTube URL (short public domain video)
- **TEST_PYRAMID**: Add integration test for: complete download workflow with metadata extraction

### Task 7: CREATE `backend/src/services/downloadQueueService.ts`

- **ACTION**: CREATE queue management for download operations
- **IMPLEMENT**: addToQueue, getQueueStatus, processQueue, cancelDownload methods
- **MIRROR**: `backend/src/services/videoService.ts:25-78` - follow async processing pattern
- **PATTERN**: Queue state management with persistence and error collection
- **IMPORTS**: `uuid`, `fs/promises`, logger, YouTube service, custom types
- **GOTCHA**: Queue persistence requires atomic file operations and corruption handling
- **CURRENT**: Modern async/await patterns with proper concurrency control
- **VALIDATE**: `cd backend && npx tsc --noEmit && npm test -- downloadQueueService.test.ts`
- **FUNCTIONAL**: Add item to queue and verify status tracking works
- **TEST_PYRAMID**: Add E2E test for: queue processing with multiple downloads and error scenarios

### Task 8: CREATE `backend/src/services/index.ts`

- **ACTION**: CREATE service exports and initialization
- **IMPLEMENT**: Export configured service instances following existing pattern
- **MIRROR**: `backend/src/services/videoService.ts:192-194` - follow service initialization
- **PATTERN**: Export configured instances with environment-based configuration
- **IMPORTS**: All YouTube services, path, process.env
- **VALIDATE**: `cd backend && npx tsc --noEmit`
- **FUNCTIONAL**: Import services in other modules successfully
- **TEST_PYRAMID**: No additional tests needed - export configuration only

### Task 9: CREATE `backend/src/routes/youtube.ts`

- **ACTION**: CREATE YouTube API endpoints
- **IMPLEMENT**: POST /download, GET /queue, GET /download/:id/status, DELETE /download/:id routes
- **MIRROR**: `backend/src/routes/api.ts:18-138` - follow router and error handling patterns
- **PATTERN**: Express Router with catchAsync wrapper and structured responses
- **IMPORTS**: `express`, `catchAsync`, YouTube services, custom types, logger
- **GOTCHA**: Server-Sent Events for progress tracking requires proper connection handling
- **CURRENT**: Express 4.x router patterns with async error handling
- **VALIDATE**: `cd backend && npx tsc --noEmit && npm test -- youtube.routes.test.ts`
- **FUNCTIONAL**: `curl -X POST http://localhost:3001/api/youtube/download -d '{"url":"test"}'` - verify endpoint
- **TEST_PYRAMID**: Add E2E test for: complete YouTube download API workflow

### Task 10: UPDATE `backend/src/routes/api.ts`

- **ACTION**: MOUNT YouTube routes in main API router
- **IMPLEMENT**: Import YouTube router and mount at /youtube path
- **MIRROR**: `backend/src/routes/api.ts:8-12` - follow router mounting pattern
- **PATTERN**: Add import and router.use() call following existing structure
- **IMPORTS**: Add YouTube router import at top of file
- **GOTCHA**: Mount order matters - ensure YouTube routes come before catch-all handlers
- **CURRENT**: Express router mounting patterns
- **VALIDATE**: `cd backend && npx tsc --noEmit`
- **FUNCTIONAL**: `curl http://localhost:3001/api/youtube/queue` - verify route accessible
- **TEST_PYRAMID**: No additional tests needed - route mounting only

### Task 11: CREATE `backend/src/test-youtube-integration.ts`

- **ACTION**: CREATE integration test for YouTube functionality
- **IMPLEMENT**: Test complete download workflow from URL to video library
- **MIRROR**: `backend/src/test-video-service.ts:5-28` - follow test file pattern
- **PATTERN**: Console-based integration test with step-by-step verification
- **IMPORTS**: YouTube services, path, test YouTube URL
- **GOTCHA**: Use short, public domain test video to avoid copyright issues
- **CURRENT**: Integration testing patterns for external service dependencies
- **VALIDATE**: `cd backend && npm run test:youtube`
- **FUNCTIONAL**: `npm run test:youtube` - verify complete workflow works
- **TEST_PYRAMID**: Add critical user journey test for: parent adds YouTube URL to family receiving curated content

### Task 12: CREATE `backend/src/test-download-queue.ts`

- **ACTION**: CREATE queue management test
- **IMPLEMENT**: Test queue operations, status tracking, and error handling
- **MIRROR**: `backend/src/test-api-routes.ts:16-71` - follow test execution pattern
- **PATTERN**: Test multiple queue scenarios with cleanup
- **IMPORTS**: Queue service, test data, console logging
- **VALIDATE**: `cd backend && npm run test:queue`
- **FUNCTIONAL**: `npm run test:queue` - verify queue management works
- **TEST_PYRAMID**: No additional tests needed - covered by integration tests above

---

## Testing Strategy

### Unit Tests to Write

| Test File                                           | Test Cases                                  | Validates         |
| --------------------------------------------------- | ------------------------------------------- | ----------------- |
| `backend/src/services/thumbnailService.test.ts`    | Thumbnail generation, FFmpeg error handling | Video processing  |
| `backend/src/services/youTubeDownloadService.test.ts` | URL validation, download workflow, metadata | Download logic    |
| `backend/src/services/downloadQueueService.test.ts` | Queue operations, persistence, concurrency  | Queue management  |
| `backend/src/routes/youtube.test.ts`               | API endpoints, request validation, responses | HTTP interface    |

### Edge Cases Checklist

- [ ] Invalid YouTube URLs (malformed, private, deleted videos)
- [ ] Very long videos (>2 hours duration limits)
- [ ] Age-restricted content (family safety validation)
- [ ] Network interruptions during download
- [ ] Disk space exhaustion during processing
- [ ] Concurrent download queue overflow
- [ ] FFmpeg thumbnail generation failures
- [ ] YouTube rate limiting responses
- [ ] Corrupted download files
- [ ] Queue persistence file corruption

---

## Validation Commands

### Level 1: STATIC_ANALYSIS

```bash
npm run --workspaces --if-present lint && npm run --workspaces --if-present type-check
# TypeScript compilation and ESLint validation
```

**EXPECT**: Exit 0, no TypeScript errors or linting warnings

### Level 2: BUILD_AND_FUNCTIONAL

```bash
docker-compose up --build -d && sleep 15 && curl -f http://localhost:3001/api/youtube/queue
# Build containers with YouTube tools and verify API responds
```

**EXPECT**: Build succeeds with yt-dlp and FFmpeg, queue API returns JSON

### Level 3: UNIT_TESTS

```bash
npm run --workspaces --if-present test -- --coverage --collectCoverageFrom="src/**/*.ts" --testPathPattern="youtube|thumbnail|queue"
# Run YouTube-related tests with coverage
```

**EXPECT**: All tests pass, coverage >= 40% for new YouTube functionality

### Level 4: FULL_SUITE

```bash
npm run --workspaces --if-present test -- --coverage && docker-compose up --build -d
# Complete test suite and successful container deployment
```

**EXPECT**: All tests pass, containers start successfully

### Level 5: CURRENT_STANDARDS_VALIDATION

Use Context7 MCP to verify:
- [ ] youtube-dl-exec patterns match current best practices
- [ ] FFmpeggy configuration uses latest recommended settings
- [ ] Download queue management follows current patterns
- [ ] API endpoints follow current REST standards

### Level 6: YOUTUBE_INTEGRATION_VALIDATION

```bash
npm run test:youtube && npm run test:queue
# Test complete YouTube download and queue workflows
```

**EXPECT**: Download completes successfully, queue operations work correctly

### Level 7: MANUAL_VALIDATION

1. Start Docker environment: `docker-compose up -d`
2. Add YouTube video: `curl -X POST http://localhost:3001/api/youtube/download -H "Content-Type: application/json" -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'`
3. Monitor queue status: `curl http://localhost:3001/api/youtube/queue`
4. Verify download completion: Check video appears in `/api/videos` list
5. Test thumbnail generation: Verify thumbnail file created
6. Check family library: Confirm video accessible through existing video service

---

## Acceptance Criteria

- [ ] YouTube URL input validates correctly (accepts valid URLs, rejects invalid)
- [ ] Video download completes successfully for standard YouTube videos
- [ ] Thumbnail generation creates proper image files
- [ ] Downloaded videos automatically integrate into existing video library
- [ ] Queue management handles multiple downloads sequentially
- [ ] API endpoints return proper status codes and JSON responses
- [ ] Error handling provides clear feedback for common failure scenarios
- [ ] Level 1-3 validation commands pass with exit 0
- [ ] Unit tests cover >= 40% of new YouTube functionality
- [ ] Docker container includes required tools (yt-dlp, FFmpeg)
- [ ] File system permissions allow container write access
- [ ] **Implementation follows current youtube-dl-exec best practices**
- [ ] **No deprecated yt-dlp command patterns used**
- [ ] **FFmpeg processing follows current security guidelines**

---

## Completion Checklist

- [ ] All tasks completed in dependency order
- [ ] Each task validated immediately after completion
- [ ] Level 1: Static analysis (lint + type-check) passes
- [ ] Level 2: Build and functional validation passes
- [ ] Level 3: Unit tests pass with 40% coverage
- [ ] Level 4: Full test suite + build succeeds
- [ ] Level 5: Current standards validation passes
- [ ] Level 6: YouTube integration validation passes
- [ ] Level 7: Manual validation confirms end-to-end workflow
- [ ] All acceptance criteria met
- [ ] Phase 2 ready for Phase 3 (Library Interface)

---

## Real-time Intelligence Summary

**Context7 MCP Queries Made**: 3 (youtube-dl-exec, FFmpeggy patterns, yt-dlp documentation)
**Web Intelligence Sources**: 2 (yt-dlp installation, youtube-dl-exec usage)
**Last Verification**: March 01, 2026 20:15 UTC
**Security Advisories Checked**: youtube-dl-exec, yt-dlp - no critical vulnerabilities in latest versions
**Deprecated Patterns Avoided**: youtube-dl legacy patterns, outdated FFmpeg commands

---

## Risks and Mitigations

| Risk                                        | Likelihood   | Impact       | Mitigation                                    |
| ------------------------------------------- | ------------ | ------------ | --------------------------------------------- |
| YouTube API changes breaking yt-dlp         | MEDIUM       | HIGH         | Pin yt-dlp version, implement fallback error handling |
| Large video files exhausting disk space    | MEDIUM       | MEDIUM       | Implement storage monitoring, file size limits |
| FFmpeg processing failures                  | LOW          | MEDIUM       | Comprehensive error handling, format validation |
| Download queue corruption                   | LOW          | MEDIUM       | Atomic file operations, queue backup/restore |
| Python dependency issues in container       | LOW          | HIGH         | Test Python availability in Docker build |
| Copyright concerns with downloaded content  | LOW          | HIGH         | Clear family use documentation, parental responsibility |
| Documentation changes during implementation | LOW          | MEDIUM       | Context7 MCP re-verification during execution |

---

## Notes

This Phase 2 implementation enables the core YouTube integration capability that transforms Sofathek from a static media server to a dynamic content curation system. The focus is on reliable, family-scale video acquisition with proper error handling and integration with existing infrastructure.

### Current Intelligence Considerations

- youtube-dl-exec v3.1.3 provides stable Node.js integration with automatic yt-dlp management
- FFmpeggy v2.1.0 offers modern TypeScript patterns for thumbnail generation
- yt-dlp maintains active development with regular YouTube compatibility updates
- Queue-based processing prevents resource exhaustion on family hardware
- File system integration maintains existing video service compatibility

The implementation prioritizes family safety through parental content curation while providing the technical foundation for Phase 3's user interface development.