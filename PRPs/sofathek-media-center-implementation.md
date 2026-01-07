name: "Sofathek Media Center Implementation - Comprehensive PRP"
description: |

## Purpose

Transform the existing golden template into a fully functional Netflix-like family media center with YouTube download capabilities, comprehensive testing, and enterprise-grade quality assurance.

## Core Principles

1. **Context is King**: Leverage existing template patterns while extending for media functionality
2. **Validation Loops**: Playwright MCP integration with CEO-level quality standards
3. **Information Dense**: Build upon React 19, Express 5.x, Node.js 20+, and modern media processing
4. **Progressive Success**: Phase-based implementation with mandatory testing gates
5. **Global rules**: Follow all rules in CLAUDE.md and maintain server coexistence safety

---

## Goal

Transform the golden template repository into Sofathek, a self-hosted family media library application with Netflix-like interface, YouTube download capabilities, modern theming system (10 themes), and comprehensive video streaming functionality.

## Why

- **Family Media Management**: Centralized, self-hosted solution for family video collections
- **YouTube Integration**: Download and organize YouTube content for offline viewing
- **Modern User Experience**: Netflix-like interface with responsive design and accessibility
- **Quality Assurance**: Enterprise-grade reliability with comprehensive Playwright testing
- **Template Evolution**: Builds upon established golden template patterns and infrastructure

## What

A complete media center application featuring:

- Netflix-like paginated video grid interface
- 10-theme system (6 children + 4 adult themes) with dark/light modes
- YouTube download integration using yt-dlp
- HTML5 video player with advanced features (chapters, subtitles, quality selection)
- Profile system with analytics and usage tracking (no authentication required)
- Admin interface with user analytics and basic logging
- Comprehensive unit testing for all business logic
- Mobile-optimized responsive design
- File system-based storage with JSON metadata

### Success Criteria

- [ ] All 5 implementation phases completed with 100% Playwright test pass rate
- [ ] Netflix-like video grid displays correctly across all 10 themes and responsive breakpoints
- [ ] YouTube videos download, process, and stream successfully through complete pipeline
- [ ] Video playback with seeking, resume functionality, and progress tracking works flawlessly
- [ ] Admin interface manages downloads, file operations, and system monitoring effectively
- [ ] Zero console errors, warnings, or accessibility violations
- [ ] WCAG 2.1 AA compliance verified through automated testing
- [ ] Performance benchmarks meet Core Web Vitals standards
- [ ] All CEO quality validation gates pass with green status

## All Needed Context

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://github.com/yt-dlp/yt-dlp
  why: YouTube download integration patterns and configuration options

- url: https://github.com/fluent-ffmpeg/node-fluent-ffmpeg
  why: Video processing, thumbnail generation, and metadata extraction

- url: https://www.vidstack.io/docs/player/components/react
  why: Modern, accessible HTML5 video player component for React

- url: https://expressjs.com/en/5x/api.html
  why: Express 5.x streaming APIs for HTTP range requests and video serving

- url: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout
  why: Native CSS Grid implementation for Netflix-like responsive layouts

- url: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_container_queries
  why: Modern responsive design with Container Queries for mobile optimization

- url: https://tailwindcss.com/docs
  why: Utility-first CSS framework for theming system implementation

- url: https://playwright.dev/docs/test-assertions
  why: Comprehensive testing patterns for CEO-level quality validation

- url: https://web.dev/streams/
  why: Modern streaming APIs and performance best practices

- file: /home/tom/workspace/ai/made/workspace/sofathek/INITIAL_SOFATHEK.md
  why: Complete feature specification with 5-phase implementation plan and testing requirements

- file: /home/tom/workspace/ai/made/workspace/sofathek/frontend/src/App.tsx
  why: Existing React router patterns and component structure to extend

- file: /home/tom/workspace/ai/made/workspace/sofathek/backend/src/app.ts
  why: Express application setup patterns and middleware configuration

- file: /home/tom/workspace/ai/made/workspace/sofathek/Dockerfile
  why: Container setup with ffmpeg, yt-dlp, and media processing tools

- file: /home/tom/workspace/ai/made/workspace/sofathek/tests/playwright/phase1-foundation/infrastructure.spec.ts
  why: Existing Playwright testing patterns and CEO quality standards

- file: /home/tom/workspace/ai/made/workspace/sofathek/package.json
  why: Script patterns for testing, validation, and development workflows

- docfile: PRPs/ai_docs/react-19-features.md
  why: React 19 compiler optimizations and modern component patterns

- docfile: PRPs/ai_docs/express-5x-streaming.md
  why: Express 5.x streaming improvements and range request handling
```

### Current Codebase Tree

```bash
sofathek/ (golden template base)
├── backend/                    # Express 5.x API with TypeScript
│   ├── src/
│   │   ├── app.ts             # Express setup with security middleware
│   │   ├── routes/            # Auth, users, health routes (to extend)
│   │   ├── middleware/        # Error handling, logging (patterns to follow)
│   │   ├── services/          # Business logic (extend for media processing)
│   │   └── types/             # TypeScript definitions (extend for media)
├── frontend/                   # React 19 with Vite and TypeScript
│   ├── src/
│   │   ├── App.tsx            # Router setup (extend for media routes)
│   │   ├── components/        # Error boundary, layout (patterns to follow)
│   │   ├── context/           # Auth context (adapt for profiles)
│   │   ├── pages/             # Home, login, dashboard (replace with media)
│   │   └── hooks/             # Custom hooks (extend for media functionality)
├── tests/                     # Comprehensive Playwright testing structure
│   └── playwright/
│       ├── phase1-foundation/ # Infrastructure tests (extend for media)
│       ├── phase2-core/       # Core functionality tests
│       ├── phase3-responsive/ # Responsive design tests
│       ├── phase4-accessibility/ # WCAG compliance tests
│       └── phase5-performance/ # Performance benchmark tests
├── Dockerfile                 # Multi-stage with ffmpeg, yt-dlp pre-installed
├── docker-compose.yml         # Container orchestration setup
└── package.json              # Monorepo with test scripts and validation
```

### Desired Codebase Tree with Sofathek Implementation

```bash
sofathek/ (transformed for media center)
├── backend/
│   ├── src/
│   │   ├── app.ts             # EXTEND: Add media streaming routes
│   │   ├── routes/
│   │   │   ├── videos.js      # CREATE: Video streaming with range requests
│   │   │   ├── downloads.js   # CREATE: YouTube download management
│   │   │   ├── profiles.js    # CREATE: Profile management (no auth)
│   │   │   ├── admin.js       # CREATE: File operations and system monitoring
│   │   │   └── metadata.js    # CREATE: Video metadata and library management
│   │   ├── services/
│   │   │   ├── ytdlp.js       # CREATE: yt-dlp integration service
│   │   │   ├── ffmpeg.js      # CREATE: Video processing and thumbnails
│   │   │   ├── scanner.js     # CREATE: File system video discovery
│   │   │   └── streaming.js   # CREATE: HTTP range request handling
│   │   └── middleware/
│   │       └── videoStreaming.js # CREATE: Video serving middleware
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # EXTEND: Media routes and theme provider
│   │   ├── components/
│   │   │   ├── VideoGrid/     # CREATE: Netflix-like video grid component
│   │   │   ├── VideoPlayer/   # CREATE: HTML5 player with custom controls
│   │   │   ├── ThemeSelector/ # CREATE: 10-theme system with CSS custom props
│   │   │   ├── AdminPanel/    # CREATE: YouTube download interface
│   │   │   └── ProfileManager/ # CREATE: Profile switching (no auth)
│   │   ├── pages/
│   │   │   ├── Library/       # CREATE: Main video library view
│   │   │   ├── Category/      # CREATE: Category-filtered views
│   │   │   ├── Player/        # CREATE: Full-screen video playback
│   │   │   └── Admin/         # CREATE: Administration interface
│   │   ├── hooks/
│   │   │   ├── useTheme.js    # CREATE: Theme management hook
│   │   │   ├── useVideoPlayer.js # CREATE: Video player state hook
│   │   │   └── useVideoLibrary.js # CREATE: Library management hook
│   │   └── styles/
│   │       └── themes/        # CREATE: CSS custom properties for 10 themes
├── tests/
│   └── playwright/
│       ├── phase1-foundation/ # EXTEND: Add media infrastructure tests
│       ├── phase2-media-library/ # CREATE: Video processing pipeline tests
│       ├── phase3-ui-theming/ # CREATE: Theme and responsive tests
│       ├── phase4-video-streaming/ # CREATE: Video playback performance tests
│       ├── phase5-youtube-admin/ # CREATE: YouTube integration tests
│       ├── fixtures/          # CREATE: Test video files and metadata
│       └── utils/             # CREATE: Media testing utilities
└── data/                      # CREATE: Docker volume mount points
    ├── videos/                # Video library storage
    ├── profiles/              # User profile JSON files
    └── config/                # Application configuration
```

### Known Gotchas & Library Quirks

```javascript
// CRITICAL: Express 5.x requires specific range request handling for video streaming
// Pattern: Use res.sendFile with proper headers for HTTP range support
app.get('/api/videos/:id/stream', (req, res) => {
  res.sendFile(videoPath, {
    headers: {
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000'
    }
  });
});

// CRITICAL: yt-dlp requires specific format selection for compatibility
// Pattern: Use 'best[ext=mp4]' format for consistent video format
const ytdlp = require('node-yt-dlp');
await ytdlp.downloadVideo(url, {
  format: 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4] / bv*+ba/b',
  quality: 'best'
});

// CRITICAL: React 19 requires memo() for performance optimization
// Pattern: Use React.memo for video grid components to prevent re-renders
const VideoCard = memo(({ video, onPlay }) => {
  // Component implementation
});

// CRITICAL: CSS Grid requires container queries for responsive design
// Pattern: Use @container queries for mobile-first responsive layouts
.video-grid {
  container-type: inline-size;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

// CRITICAL: ffmpeg requires specific settings for web-compatible thumbnails
// Pattern: Generate WebP thumbnails for better compression and browser support
await ffmpeg('/path/to/video.mp4')
  .screenshots({
    timestamps: ['10%'],
    filename: 'thumbnail.webp',
    size: '320x180'
  });

// CRITICAL: Server coexistence safety - NEVER modify ports not opened by Sofathek
// Pattern: Only bind to designated ports (3001 for backend)
const PORT = process.env.PORT || 3001; // Fixed port assignment
app.listen(PORT, () => {
  console.log(`Sofathek backend running on port ${PORT}`);
});

// CRITICAL: File system operations must handle missing metadata gracefully
// Pattern: Auto-generate metadata when JSON files are missing
const getVideoMetadata = async (videoPath) => {
  const metadataPath = videoPath.replace(/\.(mp4|mkv|avi)$/, '.json');
  try {
    return await fs.readJson(metadataPath);
  } catch (error) {
    // Auto-generate metadata if file missing
    return await generateMetadataFromVideo(videoPath);
  }
};

// CRITICAL: Playwright tests require data-testid attributes for stability
// Pattern: Use data-testid for all interactive elements
<button data-testid="play-button" onClick={handlePlay}>
  Play Video
</button>

// CRITICAL: Theme system requires CSS custom properties for dynamic updates
// Pattern: Use CSS custom properties that can be updated via JavaScript
:root {
  --primary-color: #8B5CF6;
  --secondary-color: #A855F7;
  --neon-glow: 0 0 20px var(--primary-color);
}

// CRITICAL: Video playback requires error handling for network interruptions
// Pattern: Implement retry logic and user-friendly error messages
const handleVideoError = (error) => {
  if (error.code === MediaError.MEDIA_ERR_NETWORK) {
    showRetryButton();
  } else {
    showGenericError();
  }
};
```

## Implementation Blueprint

### Data Models and Structure

```javascript
// Core data models for type safety and consistency

// Video metadata structure (optional JSON files)
interface VideoMetadata {
  id: string;
  title: string;
  duration: number;
  fileSize: number;
  dateAdded: string;
  resolution: string;
  codec: string;
  bitrate: number;
  category: 'movies' | 'youtube' | 'family' | 'tv-shows' | 'documentaries';
  source?: string; // YouTube URL if applicable
  thumbnail: string; // Generated WebP thumbnail
  description?: string;
  tags: string[];
  chapters?: Array<{ title: string; start: number }>;
  subtitles?: string[];
  accessibility: {
    hasClosedCaptions: boolean;
    hasAudioDescription: boolean;
  };
}

// User profile structure (JSON files)
interface UserProfile {
  id: string;
  name: string;
  selectedTheme: string;
  watchHistory: Record<string, {
    currentTime: number;
    duration: number;
    lastWatched: string;
    completed: boolean;
  }>;
  preferences: {
    autoplay: boolean;
    volume: number;
    subtitle: boolean;
    quality: 'auto' | '1080p' | '720p' | '480p';
  };
}

// Download queue structure
interface DownloadJob {
  id: string;
  url: string;
  status: 'queued' | 'downloading' | 'processing' | 'completed' | 'failed';
  progress: number;
  quality: string;
  category: string;
  error?: string;
  videoMetadata?: Partial<VideoMetadata>;
}

// Theme structure for CSS custom properties
interface Theme {
  name: string;
  displayName: string;
  category: 'children' | 'adult';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
  };
  effects: {
    neonGlow: string;
    borderRadius: string;
    boxShadow: string;
  };
}
```

### List of Tasks to be Completed in Order

```yaml
PHASE 1: Core Infrastructure Adaptation
Task 1.1:
MODIFY backend/src/app.ts:
  - FIND pattern: "app.use('/api/users', userRoutes);"
  - INJECT after: New media streaming routes
  - ADD: Video streaming, downloads, profiles, admin routes
  - PRESERVE: Existing security middleware and error handling

Task 1.2:
CREATE backend/src/routes/videos.js:
  - MIRROR pattern from: backend/src/routes/health.js
  - IMPLEMENT: HTTP range request support for video streaming
  - ADD: Metadata endpoints, library scanning, category filtering
  - FOLLOW: Express 5.x streaming best practices

Task 1.3:
CREATE backend/src/services/ytdlp.js:
  - IMPLEMENT: yt-dlp integration with queue management
  - ADD: Quality selection, progress tracking, error handling
  - PATTERN: Use async/await with proper error boundaries
  - CONFIG: Format selection for web compatibility

Task 1.4:
CREATE backend/src/services/ffmpeg.js:
  - IMPLEMENT: Thumbnail generation and metadata extraction
  - ADD: WebP thumbnail conversion for performance
  - PATTERN: Use fluent-ffmpeg with streaming interface
  - ERROR HANDLING: Graceful degradation for corrupted files

Task 1.5:
EXTEND tests/playwright/phase1-foundation/infrastructure.spec.ts:
  - ADD: Media infrastructure health checks
  - TEST: yt-dlp binary availability and functionality
  - TEST: ffmpeg processing capabilities
  - VALIDATE: Media directory permissions and structure

PHASE 2: Media Library System Implementation
Task 2.1:
CREATE backend/src/services/scanner.js:
  - IMPLEMENT: File system video discovery using Node.js 20+ fs.glob()
  - ADD: Recursive directory scanning with category organization
  - HANDLE: Missing metadata JSON files with auto-generation
  - PATTERN: Use async generators for memory efficiency

Task 2.2:
CREATE backend/src/routes/metadata.js:
  - IMPLEMENT: Video library management endpoints
  - ADD: Search, filtering, pagination for large collections
  - HANDLE: Metadata CRUD operations with validation
  - PATTERN: RESTful API design with proper HTTP status codes

Task 2.3:
CREATE tests/playwright/phase2-media-library/:
  - CREATE: video-processing.spec.ts for end-to-end processing tests
  - TEST: Upload → ffmpeg → thumbnail → metadata → library workflow
  - TEST: File system scanning and auto-metadata generation
  - VALIDATE: Error handling for corrupted files and disk full scenarios

PHASE 3: User Interface Implementation
Task 3.1:
CREATE frontend/src/components/VideoGrid/:
  - IMPLEMENT: Netflix-like responsive grid with CSS Grid
  - ADD: Intersection Observer for lazy loading performance
  - USE: React 19 memo() for optimal re-render prevention
  - PATTERN: Container Queries for mobile-first responsive design

Task 3.2:
CREATE frontend/src/components/ThemeSelector/:
  - IMPLEMENT: 10-theme system with CSS custom properties
  - ADD: Dark/light mode toggle for each theme
  - STORE: Theme preferences in profile JSON files
  - PATTERN: CSS-in-JS with dynamic custom property updates

Task 3.3:
MODIFY frontend/src/App.tsx:
  - EXTEND: Add media-specific routes (library, player, admin)
  - ADD: Theme provider context with profile integration
  - REPLACE: Auth-based routing with profile-based routing
  - PRESERVE: Error boundary and existing navigation patterns

Task 3.4:
CREATE tests/playwright/phase3-ui-theming/:
  - CREATE: theme-validation.spec.ts for visual regression testing
  - TEST: All 10 themes with pixel-perfect screenshot comparison
  - TEST: Responsive breakpoints across mobile/tablet/desktop
  - VALIDATE: WCAG 2.1 AA compliance for all theme combinations

PHASE 4: Video Streaming & Playback Implementation
Task 4.1:
CREATE frontend/src/components/VideoPlayer/:
  - IMPLEMENT: HTML5 video player with Vidstack or custom controls
  - ADD: Seeking, volume, fullscreen, progress tracking
  - STORE: Playback progress in profile watch history
  - PATTERN: Error handling for network interruptions and resume

Task 4.2:
CREATE backend/src/middleware/videoStreaming.js:
  - IMPLEMENT: HTTP range request middleware for Express 5.x
  - ADD: Proper caching headers and content-type detection
  - HANDLE: Multiple concurrent streams with rate limiting
  - PATTERN: Streaming with backpressure and memory management

Task 4.3:
CREATE frontend/src/pages/Player/:
  - IMPLEMENT: Full-screen video playback interface
  - ADD: Keyboard shortcuts and touch gesture support
  - INTEGRATE: Theme system with player UI elements
  - PATTERN: URL state management for shareable video links

Task 4.4:
CREATE tests/playwright/phase4-video-streaming/:
  - CREATE: video-playback.spec.ts for streaming performance tests
  - TEST: Video loads within 2 seconds, seeking accuracy ±1 second
  - TEST: Resume functionality across browser sessions
  - VALIDATE: Cross-browser compatibility and mobile device testing

PHASE 5: Admin Features & YouTube Integration
Task 5.1:
CREATE frontend/src/components/AdminPanel/:
  - IMPLEMENT: YouTube URL input and download management
  - ADD: Real-time download progress with WebSocket updates
  - DISPLAY: Download queue with priority and status management
  - PATTERN: Form validation and user feedback patterns

Task 5.2:
CREATE backend/src/routes/admin.js:
  - IMPLEMENT: File management operations (delete, move, rename)
  - ADD: System monitoring endpoints (storage, queue status)
  - HANDLE: Bulk operations with progress tracking
  - PATTERN: Authorization middleware for admin functions

Task 5.3:
CREATE frontend/src/pages/Admin/:
  - IMPLEMENT: Complete administration interface
  - ADD: Storage usage visualization and cleanup tools
  - INTEGRATE: System health monitoring and alerting
  - PATTERN: Real-time updates with Server-Sent Events

Task 5.4:
CREATE tests/playwright/phase5-youtube-admin/:
  - CREATE: youtube-integration.spec.ts for end-to-end yt-dlp testing
  - TEST: Real YouTube URL download with quality selection
  - TEST: Admin file operations and system monitoring
  - VALIDATE: Error handling for geo-blocked and invalid URLs

COMPREHENSIVE QUALITY ASSURANCE:
Task QA.1:
CREATE tests/playwright/accessibility/:
  - IMPLEMENT: WCAG 2.1 AA compliance validation
  - TEST: Keyboard navigation and screen reader compatibility
  - VALIDATE: Color contrast ratios meet accessibility standards
  - PATTERN: Automated accessibility testing with axe-playwright

Task QA.2:
CREATE tests/playwright/performance/:
  - IMPLEMENT: Core Web Vitals benchmarking
  - TEST: Video grid loading performance with large collections
  - VALIDATE: Memory usage and streaming performance metrics
  - PATTERN: Performance regression detection and alerting

Task QA.3:
CREATE tests/playwright/visual-regression/:
  - IMPLEMENT: Pixel-perfect theme comparison testing
  - TEST: All responsive breakpoints across all themes
  - VALIDATE: Consistent design language and neon glow effects
  - PATTERN: Baseline screenshot management and diff reporting
```

### Per Task Pseudocode

```javascript
// Task 1.2: Video Streaming Route Implementation
// backend/src/routes/videos.js
import express from 'express';
import { validateVideoId } from '../middleware/validation.js';

const router = express.Router();

// PATTERN: HTTP range request support for video streaming
router.get('/:id/stream', validateVideoId, async (req, res) => {
  try {
    // CRITICAL: Get video file path from metadata service
    const videoPath = await getVideoPath(req.params.id);

    // PATTERN: Express 5.x sendFile with range support
    res.sendFile(videoPath, {
      root: process.cwd(),
      headers: {
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  } catch (error) {
    // PATTERN: Standardized error response
    res.status(404).json({ error: 'Video not found' });
  }
});

// Task 2.1: File System Scanner Implementation
// backend/src/services/scanner.js
import { glob } from 'fs';
import { promisify } from 'util';

const globAsync = promisify(glob);

export class VideoScanner {
  async scanDirectory(basePath) {
    // PATTERN: Use Node.js 20+ fs.glob() for performance
    const videoFiles = await globAsync('**/*.{mp4,mkv,avi}', {
      cwd: basePath,
      absolute: true
    });

    for (const videoFile of videoFiles) {
      // CRITICAL: Handle missing metadata gracefully
      const metadata = await this.getOrGenerateMetadata(videoFile);
      yield { file: videoFile, metadata };
    }
  }

  async getOrGenerateMetadata(videoPath) {
    const metadataPath = videoPath.replace(/\.(mp4|mkv|avi)$/, '.json');
    try {
      return await fs.readJson(metadataPath);
    } catch {
      // PATTERN: Auto-generate when missing
      return await this.generateMetadataFromVideo(videoPath);
    }
  }
}

// Task 3.1: Video Grid Component Implementation
// frontend/src/components/VideoGrid/VideoGrid.tsx
import React, { memo, useMemo } from 'react';
import { useTheme } from '../../hooks/useTheme';

const VideoGrid = memo(({ videos, category, profile }) => {
  const theme = useTheme(profile.selectedTheme);

  // PATTERN: Memoize expensive calculations
  const gridStyle = useMemo(() => ({
    '--grid-columns': 'repeat(auto-fill, minmax(300px, 1fr))',
    '--grid-gap': theme.spacing.medium,
    display: 'grid',
    gridTemplateColumns: 'var(--grid-columns)',
    gap: 'var(--grid-gap)',
    containerType: 'inline-size' // CRITICAL: Container Queries support
  }), [theme]);

  return (
    <div
      className="video-grid"
      style={gridStyle}
      data-testid="video-grid"
    >
      {videos.map(video => (
        <VideoCard
          key={video.id}
          video={video}
          watchProgress={profile.watchHistory[video.id]}
          onPlay={handleVideoPlay}
          data-testid="video-card"
        />
      ))}
    </div>
  );
});

// Task 4.1: Video Player Component Implementation
// frontend/src/components/VideoPlayer/VideoPlayer.tsx
import React, { useRef, useEffect } from 'react';

const VideoPlayer = ({ videoId, onProgress, onError }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;

    // PATTERN: Resume functionality from profile data
    const savedProgress = getSavedProgress(videoId);
    if (savedProgress && Math.abs(video.currentTime - savedProgress) > 5) {
      video.currentTime = savedProgress;
    }

    // CRITICAL: Error handling for network interruptions
    const handleError = (error) => {
      if (error.target.error?.code === MediaError.MEDIA_ERR_NETWORK) {
        onError({ type: 'network', retry: true });
      } else {
        onError({ type: 'playback', retry: false });
      }
    };

    video.addEventListener('error', handleError);
    return () => video.removeEventListener('error', handleError);
  }, [videoId]);

  return (
    <video
      ref={videoRef}
      src={`/api/videos/${videoId}/stream`}
      controls
      data-testid="video-player"
      onTimeUpdate={handleProgressUpdate}
      onLoadedMetadata={handleVideoLoaded}
    />
  );
};

// Task 5.1: YouTube Download Implementation
// backend/src/services/ytdlp.js
import { YtDlp } from 'node-yt-dlp';

export class YouTubeDownloader {
  constructor() {
    this.queue = new Map();
    this.ytdlp = new YtDlp();
  }

  async downloadVideo(url, options) {
    const jobId = generateJobId();

    // CRITICAL: Quality selection for web compatibility
    const downloadOptions = {
      format: 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4] / bv*+ba/b',
      quality: options.quality || 'best',
      outputDir: `/app/media/videos/${options.category}`,
      ...options
    };

    try {
      // PATTERN: Progress tracking with async events
      const downloadStream = this.ytdlp.download(url, downloadOptions);

      downloadStream.on('progress', (progress) => {
        this.updateJobProgress(jobId, progress.percent);
      });

      downloadStream.on('complete', async (videoPath) => {
        // PATTERN: Generate thumbnail and metadata after download
        await this.processDownloadedVideo(videoPath, options.category);
        this.completeJob(jobId);
      });

      return { jobId, status: 'queued' };
    } catch (error) {
      this.failJob(jobId, error.message);
      throw error;
    }
  }
}
```

### Integration Points

```yaml
DOCKER INTEGRATION:
  - extend: Dockerfile already includes ffmpeg, yt-dlp, Node.js 20
  - volumes: Mount /app/media for persistent video storage
  - ports: Use port 3001 for backend (server coexistence safety)

PACKAGE.JSON UPDATES:
  - add dependencies: "vidstack", "sharp", "chokidar" for file watching
  - extend scripts: Add media-specific test and validation commands
  - update engines: Ensure Node.js 20+ and npm 10+ requirements

ENVIRONMENT VARIABLES:
  - add: SOFATHEK_MEDIA_PATH for configurable media storage
  - add: SOFATHEK_TEMP_PATH for download temporary directory
  - add: YTDLP_QUALITY_DEFAULT for default download quality

FRONTEND ROUTING:
  - extend: frontend/src/App.tsx with media-specific routes
  - add routes: /library, /library/:category, /player/:videoId, /admin
  - pattern: Use React Router v6 with profile context

BACKEND API ENDPOINTS:
  - add to: backend/src/app.ts
  - pattern: RESTful API design with proper HTTP status codes
  - endpoints: /api/videos, /api/downloads, /api/profiles, /api/admin
```

## Validation Loop

### Level 1: Syntax & Style

```bash
# Run these FIRST - fix any errors before proceeding
npm run lint                         # ESLint auto-fix for all TypeScript/JavaScript
npm run type-check                   # TypeScript compilation check
npm run format                       # Prettier formatting

# Expected: No errors. If errors, READ the error message and fix immediately.
```

### Level 2: Unit Tests with Media-Specific Patterns

```javascript
// CREATE test files for each service following existing patterns
// backend/src/services/__tests__/ytdlp.test.ts
describe('YouTubeDownloader', () => {
  test('downloads video with correct format selection', async () => {
    const downloader = new YouTubeDownloader();
    const result = await downloader.downloadVideo('https://youtube.com/watch?v=test', {
      quality: '720p',
      category: 'youtube',
    });

    expect(result.jobId).toBeTruthy();
    expect(result.status).toBe('queued');
  });

  test('handles invalid YouTube URL gracefully', async () => {
    const downloader = new YouTubeDownloader();

    await expect(downloader.downloadVideo('invalid-url', { category: 'youtube' })).rejects.toThrow(
      'Invalid YouTube URL'
    );
  });
});

// frontend/src/components/__tests__/VideoGrid.test.tsx
describe('VideoGrid', () => {
  test('renders videos in responsive grid layout', () => {
    const mockVideos = [
      { id: '1', title: 'Test Video 1', thumbnail: 'thumb1.webp' },
      { id: '2', title: 'Test Video 2', thumbnail: 'thumb2.webp' },
    ];

    render(<VideoGrid videos={mockVideos} category="all" />);

    expect(screen.getByTestId('video-grid')).toBeInTheDocument();
    expect(screen.getAllByTestId('video-card')).toHaveLength(2);
  });

  test('applies theme correctly with CSS custom properties', () => {
    const mockProfile = { selectedTheme: 'cyberpunk-purple' };

    render(<VideoGrid videos={[]} profile={mockProfile} />);

    const grid = screen.getByTestId('video-grid');
    expect(grid.style.getPropertyValue('--primary-color')).toBe('#8B5CF6');
  });
});
```

```bash
# Run and iterate until passing:
npm run test:unit
# If failing: Read error message, understand root cause, fix code, re-run
```

### Level 3: Phase-Specific Integration Tests

```bash
# Phase 1: Infrastructure Integration
npm run dev
curl -X GET http://localhost:3001/api/health
# Expected: {"status": "healthy"}

curl -X GET http://localhost:3001/api/videos
# Expected: Video library JSON response

# Phase 2: Media Processing Integration
# Upload test video file
curl -X POST http://localhost:3001/api/videos/upload \
  -F "video=@tests/fixtures/videos/sample.mp4" \
  -F "category=family"
# Expected: Upload success with processing started

# Phase 3: Frontend Integration
# Navigate to video library
curl -X GET http://localhost:3000/library
# Expected: HTML page loads without errors

# Phase 4: Video Streaming Integration
curl -H "Range: bytes=0-1023" http://localhost:3001/api/videos/test-id/stream
# Expected: Partial content response (206) with video bytes

# Phase 5: YouTube Download Integration
curl -X POST http://localhost:3001/api/downloads \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtube.com/watch?v=dQw4w9WgXcQ", "quality": "720p"}'
# Expected: Download job created successfully
```

### Level 4: Comprehensive Playwright MCP Validation

```bash
# CEO Quality Validation - ALL TESTS MUST PASS
npm run test:ceo-validation

# Individual phase validation
npm run validate:phase1           # Infrastructure health
npm run validate:phase2           # Media processing pipeline
npm run validate:phase3           # UI/UX and theming
npm run validate:phase4           # Video streaming performance
npm run validate:phase5           # YouTube integration and admin

# Specialized validation suites
npm run validate:accessibility    # WCAG 2.1 AA compliance
npm run validate:performance      # Core Web Vitals benchmarks
npm run validate:themes          # Visual regression for all themes
npm run validate:journeys        # End-to-end user journey tests

# Expected: ALL tests pass with green status
# If ANY test fails: STOP immediately, fix the issue, re-run validation
```

### Level 5: CEO Dashboard Quality Gates

```bash
# Ultimate quality validation - ZERO TOLERANCE for failures
npm run ceo:final-validation

# This command validates:
# ✅ 100% Playwright test pass rate across all phases
# ✅ Zero console errors or warnings in any browser
# ✅ Zero accessibility violations (WCAG 2.1 AA)
# ✅ Performance benchmarks meet Core Web Vitals standards
# ✅ Visual regression tests pass (pixel-perfect)
# ✅ Security scans clean (no vulnerabilities)
# ✅ All user journeys complete successfully
# ✅ Cross-browser compatibility (Chrome, Firefox, Safari, Edge)

# Expected: Exit code 0 - ALL QUALITY GATES PASS
# If exit code != 0: ENTIRE PHASE IS REJECTED - Fix all issues before proceeding
```

## Final Validation Checklist

- [ ] All tests pass: `npm run test:ceo-validation`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run type-check`
- [ ] All 5 phases complete with 100% test coverage
- [ ] YouTube downloads work end-to-end: `curl test with real URL`
- [ ] Video streaming works with range requests: `curl with Range header`
- [ ] All 10 themes render correctly across breakpoints
- [ ] WCAG 2.1 AA compliance verified through automated testing
- [ ] Performance benchmarks meet Core Web Vitals standards
- [ ] Zero console errors, warnings, or accessibility violations
- [ ] Mobile responsiveness verified on real devices
- [ ] Admin interface manages files and downloads effectively
- [ ] Error cases handled gracefully with user-friendly messages
- [ ] Server coexistence safety rules followed (port management)
- [ ] Documentation updated with API endpoints and usage

---

## Anti-Patterns to Avoid

- ❌ Don't skip Playwright tests - every feature must be tested
- ❌ Don't ignore CEO quality standards - 100% pass rate required
- ❌ Don't hardcode video paths - use configurable media directories
- ❌ Don't skip accessibility testing - WCAG 2.1 AA is mandatory
- ❌ Don't use blocking operations for video processing - use streams
- ❌ Don't modify server ports not opened by Sofathek
- ❌ Don't skip visual regression tests - themes must be pixel-perfect
- ❌ Don't ignore network error handling in video playback
- ❌ Don't skip metadata validation - handle corrupted/missing files
- ❌ Don't use synchronous file operations for video scanning

## PRP Quality Score: 9/10

**Confidence Level**: High confidence for one-pass implementation success

**Strengths**:

- Comprehensive context with existing golden template patterns
- Detailed 5-phase implementation plan with specific tasks
- Complete Playwright MCP testing framework
- Real-world media processing requirements addressed
- CEO-level quality standards with zero-tolerance validation

**Minor Risk Areas**:

- Complex yt-dlp integration may require iteration for edge cases
- Theme system CSS custom properties need careful cross-browser testing
- Video streaming performance optimization may need fine-tuning

**Mitigation Strategy**: Each phase includes comprehensive testing with both sunny day and rainy day scenarios, ensuring robust error handling and performance validation before progression to next phase.

---

## 🎯 PHASE 5: ADVANCED FEATURES & PWA - NEXT STEPS

**Status**: Phase 4 Complete (100%) - Ready to Begin Phase 5 (0%)

### Current Project State Summary

```bash
✅ Phase 1: Foundation Infrastructure (100%)
✅ Phase 2: Media Library System (90.5%)
✅ Phase 3: Netflix-Like Frontend (100%)
✅ Phase 4: Multi-Theme System (100%) ⭐ JUST COMPLETED
🎯 Phase 5: Advanced Features & PWA (Ready to Start - 0%)
```

**Phase 4 Accomplishments (Just Released v1.4.0)**:

- ✅ 10 production-ready streaming platform themes (Netflix, YouTube, Disney+, HBO Max, Hulu, Apple TV+, Amazon Prime, Spotify, Plex, Sofathek)
- ✅ Complete CSS custom properties system (47+ variables per theme)
- ✅ Instant theme switching with zero performance impact
- ✅ Cross-component integration and responsive design
- ✅ Theme persistence via localStorage
- ✅ Dedicated /themes showcase page
- ✅ Zero TypeScript compilation errors
- ✅ CEO-level code quality standards maintained

### Phase 5 Implementation Roadmap (4 Focus Areas)

### 5.1 Advanced Video Player Features

**Priority: HIGH | Estimated Time: 3-4 hours**

```yaml
Task 5.1.1: Video Chapters & Navigation
FILES TO CREATE:
  - frontend/src/components/VideoPlayer/VideoChapters.tsx
  - frontend/src/components/VideoPlayer/ChapterMarker.tsx
  - backend/src/services/chapterExtraction.js

IMPLEMENTATION:
  - Chapter detection from video metadata and YouTube descriptions
  - Interactive chapter markers on progress bar
  - Chapter navigation with thumbnail previews
  - Auto-generated chapters for long videos without metadata
  - Chapter-based bookmarking system

PATTERN:
interface VideoChapter {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  thumbnail?: string;
}

Task 5.1.2: Subtitle Support
FILES TO CREATE:
  - frontend/src/components/VideoPlayer/SubtitleTrack.tsx
  - frontend/src/components/VideoPlayer/SubtitleSelector.tsx
  - backend/src/services/subtitleExtraction.js

IMPLEMENTATION:
  - Support for .srt, .vtt, .ass subtitle formats
  - Auto-download subtitles for YouTube videos
  - Multi-language subtitle switching
  - Subtitle styling with theme integration
  - Closed captions accessibility compliance

Task 5.1.3: Quality Selection & Adaptive Streaming
FILES TO CREATE:
  - frontend/src/components/VideoPlayer/QualitySelector.tsx
  - backend/src/services/adaptiveStreaming.js
  - backend/src/middleware/qualityNegotiation.js

IMPLEMENTATION:
  - Multiple quality options (480p, 720p, 1080p, 4K)
  - Automatic quality adjustment based on connection speed
  - Manual quality selection with bandwidth display
  - Progressive download and streaming optimization
  - Quality-based storage management in admin

Task 5.1.4: Picture-in-Picture & Advanced Controls
FILES TO CREATE:
  - frontend/src/components/VideoPlayer/PictureInPicture.tsx
  - frontend/src/components/VideoPlayer/AdvancedControls.tsx

IMPLEMENTATION:
  - Native Picture-in-Picture API integration
  - Playback speed controls (0.25x - 2x)
  - A/B repeat functionality for learning content
  - Frame-by-frame navigation with arrow keys
  - Custom keyboard shortcuts (space, arrows, number keys)
```

### 5.2 User Analytics & Usage Statistics

**Priority: MEDIUM | Estimated Time: 2-3 hours**

```yaml
Task 5.2.1: User Analytics Collection
FILES TO CREATE:
  - frontend/src/services/analyticsCollector.js
  - frontend/src/hooks/useAnalytics.ts
  - backend/src/services/analyticsProcessor.js

IMPLEMENTATION:
  - Profile-based viewing analytics (watch time, preferences)
  - Content popularity and recommendation engine data
  - Theme switching frequency and preference analysis
  - Download patterns and storage optimization insights
  - Family-friendly content filtering analytics

PATTERN:
interface ViewingSession {
  profileId: string;
  videoId: string;
  startTime: number;
  endTime: number;
  watchDuration: number;
  completionRate: number;
  quality: string;
  theme: string;
}

Task 5.2.2: Analytics Dashboard
FILES TO CREATE:
  - frontend/src/pages/Admin/UserAnalytics.tsx
  - frontend/src/components/Admin/AnalyticsDashboard.tsx
  - frontend/src/components/Admin/UsageCharts.tsx

IMPLEMENTATION:
  - Real-time viewing statistics display
  - Popular content rankings and trends
  - Profile usage patterns visualization
  - Theme preference analytics with charts
  - Content recommendation insights

Task 5.2.3: Privacy-Focused Data Collection
FILES TO CREATE:
  - backend/src/middleware/analyticsMiddleware.js
  - backend/src/services/dataPrivacy.js

IMPLEMENTATION:
  - Anonymous analytics data collection
  - Configurable data retention policies
  - GDPR-compliant data handling
  - Opt-out mechanisms for privacy-conscious users
  - Data aggregation without personal identification
```

### 5.3 Basic Logging System

**Priority: MEDIUM | Estimated Time: 1-2 hours**

```yaml
Task 5.3.1: Frontend Logging
FILES TO CREATE:
  - frontend/src/utils/logger.ts
  - frontend/src/services/logCollector.js

IMPLEMENTATION:
  - Console logging with different levels (info, warn, error)
  - User action logging (theme switches, video plays, navigation)
  - Error boundary integration with logging
  - Performance milestone logging
  - Local storage log buffer for debugging

PATTERN:
const logger = {
  info: (message: string, context?: any) => console.log(`[INFO]`, message, context),
  warn: (message: string, context?: any) => console.warn(`[WARN]`, message, context),
  error: (message: string, error?: Error) => console.error(`[ERROR]`, message, error),
};

Task 5.3.2: Backend Logging
FILES TO CREATE:
  - backend/src/utils/logger.js
  - backend/src/middleware/requestLogger.js

IMPLEMENTATION:
  - Structured logging with Winston or similar
  - Request/response logging middleware
  - Error logging with stack traces
  - Performance timing logs
  - File-based log rotation

PATTERN:
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

### 5.4 Comprehensive Unit Testing Suite

**Priority: HIGH | Estimated Time: 4-5 hours**

```yaml
Task 5.4.1: Theme System Unit Tests
FILES TO CREATE:
  - frontend/src/themes/__tests__/ThemeProvider.test.tsx
  - frontend/src/themes/__tests__/themeConfig.test.ts
  - frontend/src/components/__tests__/ThemeSelector.test.tsx

IMPLEMENTATION:
  - Theme switching logic validation
  - CSS custom property application testing
  - Theme persistence in localStorage testing
  - Theme configuration validation
  - Component theme integration testing

PATTERN:
describe('ThemeProvider', () => {
  test('applies theme CSS custom properties correctly', () => {
    const { getByTestId } = render(
      <ThemeProvider initialTheme="netflix-dark">
        <div data-testid="themed-component">Content</div>
      </ThemeProvider>
    );

    const themedElement = getByTestId('themed-component');
    expect(themedElement.style.getPropertyValue('--primary-color')).toBe('#E50914');
  });

  test('persists theme selection in localStorage', () => {
    const { rerender } = render(<ThemeProvider initialTheme="youtube-light" />);
    expect(localStorage.getItem('sofathek-theme')).toBe('youtube-light');
  });
});

Task 5.4.2: Video Processing Unit Tests
FILES TO CREATE:
  - backend/src/services/__tests__/ytdlp.test.js
  - backend/src/services/__tests__/ffmpeg.test.js
  - backend/src/services/__tests__/scanner.test.js

IMPLEMENTATION:
  - YouTube download queue management testing
  - Video processing pipeline validation
  - File system scanning logic testing
  - Metadata generation and extraction testing
  - Error handling for corrupted files testing

PATTERN:
describe('YouTubeDownloader', () => {
  test('queues download with correct format selection', async () => {
    const downloader = new YouTubeDownloader();
    const mockUrl = 'https://youtube.com/watch?v=test123';

    const result = await downloader.queueDownload(mockUrl, {
      quality: '720p',
      category: 'youtube'
    });

    expect(result.jobId).toBeTruthy();
    expect(result.status).toBe('queued');
    expect(result.format).toContain('mp4');
  });

  test('handles invalid YouTube URL gracefully', async () => {
    const downloader = new YouTubeDownloader();

    await expect(
      downloader.queueDownload('invalid-url', { category: 'youtube' })
    ).rejects.toThrow('Invalid YouTube URL format');
  });
});

Task 5.4.3: Video Player Logic Unit Tests
FILES TO CREATE:
  - frontend/src/components/__tests__/VideoPlayer.test.tsx
  - frontend/src/hooks/__tests__/useVideoPlayer.test.ts
  - frontend/src/services/__tests__/videoApi.test.ts

IMPLEMENTATION:
  - Video playback state management testing
  - Progress tracking and resume functionality testing
  - Error handling and retry logic testing
  - Keyboard shortcut functionality testing
  - Video streaming API integration testing

PATTERN:
describe('useVideoPlayer', () => {
  test('tracks video progress correctly', () => {
    const { result } = renderHook(() => useVideoPlayer('video-123'));

    act(() => {
      result.current.updateProgress(120); // 2 minutes
    });

    expect(result.current.currentTime).toBe(120);
    expect(result.current.watchProgress).toBeDefined();
  });

  test('resumes from saved position', () => {
    const savedProgress = { currentTime: 300, duration: 1800 };
    localStorage.setItem('video-progress-123', JSON.stringify(savedProgress));

    const { result } = renderHook(() => useVideoPlayer('video-123'));

    expect(result.current.resumeTime).toBe(300);
  });
});

Task 5.4.4: API Route Unit Tests
FILES TO CREATE:
  - backend/src/routes/__tests__/videos.test.js
  - backend/src/routes/__tests__/downloads.test.js
  - backend/src/routes/__tests__/admin.test.js

IMPLEMENTATION:
  - Video streaming endpoint testing
  - HTTP range request handling testing
  - Download management API testing
  - Error response formatting testing
  - Authentication and authorization testing

PATTERN:
describe('Video Routes', () => {
  test('GET /api/videos/:id/stream returns video with correct headers', async () => {
    const response = await request(app)
      .get('/api/videos/test-video-id/stream')
      .expect(200);

    expect(response.headers['content-type']).toContain('video/');
    expect(response.headers['accept-ranges']).toBe('bytes');
    expect(response.headers['cache-control']).toBeDefined();
  });

  test('GET /api/videos/:id/stream handles range requests', async () => {
    const response = await request(app)
      .get('/api/videos/test-video-id/stream')
      .set('Range', 'bytes=0-1023')
      .expect(206);

    expect(response.headers['content-range']).toBeDefined();
    expect(response.headers['content-length']).toBe('1024');
  });
});

Task 5.4.5: Business Logic Unit Tests
FILES TO CREATE:
  - backend/src/services/__tests__/videoLibrary.test.js
  - frontend/src/services/__tests__/profileManager.test.ts
  - backend/src/services/__tests__/downloadQueue.test.js

IMPLEMENTATION:
  - Video library management logic testing
  - Profile creation and management testing
  - Download queue priority and status testing
  - Search and filtering logic testing
  - Data validation and sanitization testing

PATTERN:
describe('VideoLibrary', () => {
  test('indexes videos correctly with metadata', async () => {
    const library = new VideoLibrary('/test/videos');
    const mockVideos = [
      { path: '/test/videos/movie1.mp4', title: 'Test Movie' },
      { path: '/test/videos/show/episode1.mp4', title: 'Test Episode' }
    ];

    const result = await library.buildIndex(mockVideos);

    expect(result.totalVideos).toBe(2);
    expect(result.categories).toContain('movies');
    expect(result.videos[0].metadata.title).toBe('Test Movie');
  });

  test('filters videos by category correctly', async () => {
    const library = new VideoLibrary('/test/videos');
    const filtered = await library.getVideosByCategory('movies');

    expect(filtered.every(video => video.category === 'movies')).toBe(true);
  });
});
```

### 5.5 Comprehensive Testing Suite

**Priority: HIGH | Estimated Time: 3-4 hours**

```yaml
Task 5.5.1: Playwright Tests for All Themes
FILES TO CREATE:
  - tests/playwright/themes/theme-switching.spec.ts
  - tests/playwright/themes/visual-regression.spec.ts
  - tests/playwright/themes/performance-comparison.spec.ts

IMPLEMENTATION:
  - Automated testing across all 10 themes
  - Visual regression testing with screenshot comparison
  - Performance benchmarking for each theme
  - Cross-browser theme compatibility validation
  - Mobile device theme testing

Task 5.5.2: Performance Regression Tests
FILES TO CREATE:
  - tests/playwright/performance/core-web-vitals.spec.ts
  - tests/playwright/performance/video-streaming.spec.ts
  - tests/playwright/performance/theme-switching.spec.ts

IMPLEMENTATION:
  - Core Web Vitals benchmark validation
  - Video streaming performance regression detection
  - Theme switching performance monitoring
  - Memory leak detection and prevention
  - Bundle size regression testing

Task 5.5.3: Cross-browser Compatibility Tests
FILES TO CREATE:
  - tests/playwright/cross-browser/compatibility.spec.ts
  - tests/playwright/cross-browser/feature-detection.spec.ts

IMPLEMENTATION:
  - Chrome, Firefox, Safari, Edge compatibility testing
  - PWA functionality across different browsers
  - Video codec support validation
  - Feature detection and graceful degradation
  - Mobile browser testing (iOS Safari, Chrome Mobile)

Task 5.5.4: Mobile Device Testing
FILES TO CREATE:
  - tests/playwright/mobile/responsive-design.spec.ts
  - tests/playwright/mobile/touch-interactions.spec.ts
  - tests/playwright/mobile/performance.spec.ts

IMPLEMENTATION:
  - Responsive design validation across device sizes
  - Touch gesture support for video player
  - Mobile performance optimization testing
  - PWA installation and offline functionality
  - Mobile-specific accessibility testing
```

### Implementation Order & Dependencies

```bash
🎯 PHASE 5 EXECUTION PLAN (Recommended Order):

WEEK 1: Advanced Video Player (Tasks 5.1.1 - 5.1.4)
├── Day 1: Video Chapters & Navigation (5.1.1)
├── Day 2: Subtitle Support (5.1.2)
├── Day 3: Quality Selection & Adaptive Streaming (5.1.3)
└── Day 4: Picture-in-Picture & Advanced Controls (5.1.4)

WEEK 2: Analytics & Logging (Tasks 5.2.1 - 5.3.2)
├── Day 1-2: User Analytics & Usage Statistics (5.2.1 - 5.2.3)
└── Day 3-4: Basic Logging System (5.3.1 - 5.3.2)

WEEK 3: Comprehensive Unit Testing (Tasks 5.4.1 - 5.4.5)
├── Day 1: Theme System Unit Tests (5.4.1)
├── Day 2: Video Processing Unit Tests (5.4.2)
├── Day 3: Video Player Logic Unit Tests (5.4.3)
├── Day 4: API Route Unit Tests (5.4.4)
└── Day 5: Business Logic Unit Tests (5.4.5)
```

### Success Criteria for Phase 5

```yaml
Advanced Player Features:
- [ ] Video chapters display and navigate correctly with thumbnail previews
- [ ] Subtitles load and display properly in all supported formats (.srt, .vtt, .ass)
- [ ] Quality selection works with smooth transitions between resolutions
- [ ] Picture-in-Picture mode functions across all major browsers
- [ ] Keyboard shortcuts and accessibility features work seamlessly
- [ ] Advanced controls (speed, A/B repeat, frame navigation) function properly

User Analytics & Statistics:
- [ ] Profile-based viewing analytics accurately track watch time and preferences
- [ ] Content popularity metrics provide actionable insights for recommendations
- [ ] Theme switching analytics identify user preference patterns
- [ ] Privacy-focused data collection complies with GDPR standards
- [ ] Analytics dashboard displays real-time usage statistics clearly

Basic Logging System:
- [ ] Frontend logging captures user actions and errors with appropriate levels
- [ ] Backend logging provides structured logs with request/response tracking
- [ ] Error logging includes full stack traces for debugging
- [ ] Performance logging identifies bottlenecks and optimization opportunities
- [ ] Log rotation and storage management prevents disk space issues

Comprehensive Unit Testing:
- [ ] Theme system tests achieve 95%+ code coverage for theming logic
- [ ] Video processing tests validate YouTube download and ffmpeg operations
- [ ] Video player tests ensure playback state management works correctly
- [ ] API route tests verify streaming endpoints and error handling
- [ ] Business logic tests cover core functionality with edge cases
- [ ] All tests run in under 30 seconds with 100% pass rate
```

### Risk Mitigation & Contingencies

```yaml
Advanced Player Implementation Risks:
  - Risk: Video codec compatibility across browsers for chapters and quality selection
  - Mitigation: Multiple format support with automatic detection and fallbacks
  - Fallback: Basic HTML5 video player with reduced feature set

Analytics & Privacy Risks:
  - Risk: Data privacy concerns with user analytics collection
  - Mitigation: Anonymous data collection with clear opt-out mechanisms
  - Fallback: Basic usage statistics without personal data tracking

Unit Testing Complexity Risks:
  - Risk: Complex video processing logic difficult to test in isolation
  - Mitigation: Mock services and dependency injection patterns
  - Fallback: Integration tests to cover critical user journeys

Performance Impact Risks:
  - Risk: Advanced player features and analytics may impact video streaming performance
  - Mitigation: Progressive enhancement and performance monitoring
  - Fallback: Feature flags to disable advanced functionality if needed
```

### Files Modified vs Created Summary

```bash
PHASE 5 FILE IMPACT SUMMARY:

NEW FILES TO CREATE (~25 files):
├── Advanced Player: VideoChapters.tsx, SubtitleTrack.tsx, QualitySelector.tsx, PictureInPicture.tsx
├── Analytics: analyticsCollector.js, UserAnalytics.tsx, AnalyticsDashboard.tsx
├── Logging: logger.ts (frontend), logger.js (backend), requestLogger.js
├── Backend Services: chapterExtraction.js, subtitleExtraction.js, adaptiveStreaming.js
├── Unit Tests: 15+ test files covering all major business logic components
└── Support Components: AdvancedControls.tsx, UsageCharts.tsx, logCollector.js

EXISTING FILES TO MODIFY (~10 files):
├── Frontend: VideoPlayer.tsx (advanced features), App.tsx (analytics integration)
├── Backend: app.ts (logging middleware), videos.js (quality selection)
├── Admin: AdminPage.tsx (analytics dashboard)
└── Configuration: package.json (test dependencies), jest.config.js (coverage)
```

### Expected Timeline & Effort Distribution

```bash
PHASE 5 EFFORT BREAKDOWN:
├── Advanced Video Player Features: 50% (3-4 hours)
├── User Analytics & Statistics: 25% (2-3 hours)
├── Basic Logging System: 15% (1-2 hours)
└── Comprehensive Unit Testing: 10% (4-5 hours)

TOTAL ESTIMATED TIME: 10-14 hours
RECOMMENDED TIMELINE: 3 weeks (3-4 hours per week)
```

**🎯 Phase 5 focuses on advanced video features, essential analytics, basic logging, and comprehensive unit testing to ensure robust business logic validation while maintaining the CEO-level quality standards established in Phase 4.**
