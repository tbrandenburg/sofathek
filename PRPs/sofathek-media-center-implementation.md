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
- HTML5 video player with resume functionality
- Profile system with theme preferences (no authentication required)
- Admin interface for file management and download queue
- Comprehensive Playwright MCP testing for all phases
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

### Phase 5 Implementation Roadmap

### 5.1 Progressive Web App (PWA) Implementation

**Priority: HIGH | Estimated Time: 2-3 hours**

```yaml
Task 5.1.1: PWA Manifest Creation
FILES TO CREATE:
  - frontend/public/manifest.json
  - frontend/src/assets/icons/ (PWA icons 192x192, 512x512)
  - frontend/src/utils/pwaUtils.ts

IMPLEMENTATION:
  - Create web app manifest with proper theme colors from current theme system
  - Generate app icons with Sofathek branding for all required sizes
  - Configure display modes, orientations, and scope
  - Add manifest link to index.html with theme-color meta tags

PATTERN:
{
  "name": "Sofathek Media Center",
  "short_name": "Sofathek",
  "display": "standalone",
  "start_url": "/library",
  "background_color": "var(--background-color)",
  "theme_color": "var(--primary-color)",
  "icons": [...]
}

Task 5.1.2: Service Worker Implementation
FILES TO CREATE:
  - frontend/public/sw.js
  - frontend/src/hooks/useOffline.ts
  - frontend/src/components/PWAInstall.tsx

IMPLEMENTATION:
  - Basic service worker for static asset caching
  - Offline fallback pages for network failures
  - Cache strategy for video thumbnails and metadata
  - Background sync for download queue when online
  - Push notifications for download completion

PATTERN:
// Cache video thumbnails and UI assets
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/thumbnails/')) {
    event.respondWith(cacheFirstStrategy(event.request));
  }
});

Task 5.1.3: Offline Functionality
FILES TO MODIFY:
  - frontend/src/components/VideoGrid.tsx
  - frontend/src/pages/Library/LibraryPage.tsx
  - backend/src/routes/videos.js

IMPLEMENTATION:
  - Offline indicator in UI when network unavailable
  - Cached video metadata for offline browsing
  - "Download for Offline" option for favorite videos
  - Resume interrupted downloads when connection restored
  - Offline-first approach for app shell and navigation

Task 5.1.4: Install Prompt Integration
FILES TO CREATE:
  - frontend/src/components/PWAInstall.tsx
  - frontend/src/hooks/usePWAInstall.ts

IMPLEMENTATION:
  - Native app install prompt for supported browsers
  - Custom install banner with Sofathek branding
  - Installation success tracking and analytics
  - Integration with existing theme system
```

### 5.2 Advanced Video Player Features

**Priority: HIGH | Estimated Time: 3-4 hours**

```yaml
Task 5.2.1: Video Chapters & Navigation
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

Task 5.2.2: Subtitle Support
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

Task 5.2.3: Quality Selection & Adaptive Streaming
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

Task 5.2.4: Picture-in-Picture & Advanced Controls
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

### 5.3 Enhanced Admin Dashboard

**Priority: MEDIUM | Estimated Time: 2-3 hours**

```yaml
Task 5.3.1: Theme Management Interface
FILES TO CREATE:
  - frontend/src/pages/Admin/ThemeManager.tsx
  - frontend/src/components/Admin/ThemeEditor.tsx
  - backend/src/routes/themeManagement.js

IMPLEMENTATION:
  - Visual theme editor with live preview
  - Custom theme creation and modification
  - Import/export theme configurations
  - Theme usage analytics across profiles
  - Bulk theme operations for family management

Task 5.3.2: System Performance Monitoring
FILES TO CREATE:
  - frontend/src/pages/Admin/PerformanceMonitor.tsx
  - frontend/src/components/Admin/MetricsChart.tsx
  - backend/src/services/metricsCollector.js

IMPLEMENTATION:
  - Real-time system metrics (CPU, memory, disk usage)
  - Video streaming performance analytics
  - Download queue performance monitoring
  - User engagement metrics and popular content
  - Performance alerts and optimization suggestions

Task 5.3.3: User Analytics & Usage Statistics
FILES TO CREATE:
  - frontend/src/pages/Admin/UserAnalytics.tsx
  - frontend/src/components/Admin/AnalyticsDashboard.tsx
  - backend/src/services/analyticsCollector.js

IMPLEMENTATION:
  - Profile-based viewing analytics (watch time, preferences)
  - Content popularity and recommendation engine data
  - Theme switching frequency and preference analysis
  - Download patterns and storage optimization insights
  - Family-friendly content filtering analytics

Task 5.3.4: Bulk Management Tools
FILES TO CREATE:
  - frontend/src/components/Admin/BulkVideoManager.tsx
  - frontend/src/components/Admin/FileOperations.tsx
  - backend/src/services/bulkOperations.js

IMPLEMENTATION:
  - Bulk video categorization and metadata editing
  - Mass thumbnail regeneration and quality conversion
  - Storage cleanup and duplicate video detection
  - Automated content organization rules
  - Backup and restore functionality
```

### 5.4 Performance Monitoring & Analytics

**Priority: MEDIUM | Estimated Time: 2 hours**

```yaml
Task 5.4.1: Real-time Performance Metrics
FILES TO CREATE:
  - frontend/src/hooks/usePerformanceMonitoring.ts
  - frontend/src/components/PerformanceIndicator.tsx
  - backend/src/middleware/performanceTracking.js

IMPLEMENTATION:
  - Core Web Vitals tracking (LCP, FID, CLS)
  - Theme switching performance measurement
  - Video loading time analytics
  - Memory usage monitoring and leak detection
  - Real-time performance dashboard

Task 5.4.2: Theme Analytics System
FILES TO CREATE:
  - frontend/src/services/themeAnalytics.js
  - backend/src/services/themeMetrics.js

IMPLEMENTATION:
  - Theme switching frequency tracking
  - Performance impact per theme measurement
  - User preference patterns analysis
  - Theme-specific engagement metrics
  - A/B testing framework for theme improvements

Task 5.4.3: Error Tracking & Monitoring
FILES TO CREATE:
  - frontend/src/utils/errorTracking.ts
  - backend/src/middleware/errorAnalytics.js

IMPLEMENTATION:
  - Comprehensive error logging and categorization
  - Video playback failure analysis
  - Network interruption handling metrics
  - User error reporting system
  - Automated error recovery suggestions
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

WEEK 1: PWA Foundation (Tasks 5.1.1 - 5.1.4)
├── Day 1: PWA Manifest & Icons (5.1.1)
├── Day 2: Service Worker Implementation (5.1.2)
├── Day 3: Offline Functionality (5.1.3)
└── Day 4: Install Prompt Integration (5.1.4)

WEEK 2: Advanced Player Features (Tasks 5.2.1 - 5.2.4)
├── Day 1: Video Chapters & Navigation (5.2.1)
├── Day 2: Subtitle Support (5.2.2)
├── Day 3: Quality Selection & Adaptive Streaming (5.2.3)
└── Day 4: Picture-in-Picture & Advanced Controls (5.2.4)

WEEK 3: Admin & Analytics (Tasks 5.3.1 - 5.4.3)
├── Day 1-2: Enhanced Admin Dashboard (5.3.1 - 5.3.4)
└── Day 3-4: Performance Monitoring & Analytics (5.4.1 - 5.4.3)

WEEK 4: Comprehensive Testing (Tasks 5.5.1 - 5.5.4)
├── Day 1: Playwright Theme Tests (5.5.1)
├── Day 2: Performance Regression Tests (5.5.2)
├── Day 3: Cross-browser Compatibility (5.5.3)
└── Day 4: Mobile Device Testing (5.5.4)
```

### Success Criteria for Phase 5

```yaml
PWA Functionality:
- [ ] App installs successfully on mobile and desktop
- [ ] Offline browsing works with cached thumbnails
- [ ] Service worker caches critical assets
- [ ] Push notifications work for download completion
- [ ] PWA passes all Lighthouse audit requirements

Advanced Player:
- [ ] Video chapters display and navigate correctly
- [ ] Subtitles load and display properly in all supported formats
- [ ] Quality selection works with smooth transitions
- [ ] Picture-in-Picture mode functions across browsers
- [ ] Keyboard shortcuts and accessibility features work

Admin Dashboard:
- [ ] Theme management interface allows custom theme creation
- [ ] Performance monitoring displays real-time metrics
- [ ] User analytics provide actionable insights
- [ ] Bulk operations handle large video collections efficiently

Testing & Quality:
- [ ] All 10 themes pass visual regression tests
- [ ] Performance tests meet Core Web Vitals standards
- [ ] Cross-browser testing passes on all major browsers
- [ ] Mobile testing validates touch interactions and responsiveness
- [ ] 100% test coverage maintained across all new features
```

### Risk Mitigation & Contingencies

```yaml
PWA Implementation Risks:
  - Risk: Browser compatibility issues with service workers
  - Mitigation: Progressive enhancement with feature detection
  - Fallback: Graceful degradation to standard web app

Advanced Player Risks:
  - Risk: Video codec compatibility across browsers
  - Mitigation: Multiple format support with automatic detection
  - Fallback: Basic HTML5 video player with reduced features

Performance Risks:
  - Risk: Theme system performance impact with many themes
  - Mitigation: CSS custom property caching and optimization
  - Fallback: Static theme compilation as backup option
```

### Files Modified vs Created Summary

```bash
PHASE 5 FILE IMPACT SUMMARY:

NEW FILES TO CREATE (~35 files):
├── frontend/public/manifest.json
├── frontend/public/sw.js
├── frontend/src/components/PWAInstall.tsx
├── frontend/src/components/VideoPlayer/VideoChapters.tsx
├── frontend/src/components/VideoPlayer/SubtitleTrack.tsx
├── frontend/src/components/VideoPlayer/QualitySelector.tsx
├── frontend/src/components/VideoPlayer/PictureInPicture.tsx
├── frontend/src/pages/Admin/ThemeManager.tsx
├── frontend/src/pages/Admin/PerformanceMonitor.tsx
├── frontend/src/pages/Admin/UserAnalytics.tsx
├── backend/src/services/chapterExtraction.js
├── backend/src/services/subtitleExtraction.js
├── backend/src/services/adaptiveStreaming.js
├── backend/src/services/metricsCollector.js
├── backend/src/services/analyticsCollector.js
├── backend/src/routes/themeManagement.js
├── tests/playwright/themes/ (5+ test files)
├── tests/playwright/performance/ (4+ test files)
├── tests/playwright/cross-browser/ (3+ test files)
└── tests/playwright/mobile/ (3+ test files)

EXISTING FILES TO MODIFY (~15 files):
├── frontend/src/App.tsx (PWA integration)
├── frontend/src/components/VideoPlayer.tsx (advanced features)
├── frontend/src/pages/Library/LibraryPage.tsx (PWA offline support)
├── frontend/src/pages/Admin/AdminPage.tsx (enhanced dashboard)
├── backend/src/app.ts (new routes)
├── backend/src/routes/videos.js (quality selection)
├── package.json (PWA dependencies)
├── frontend/public/index.html (PWA manifest)
└── Various test configuration files
```

### Expected Timeline & Effort Distribution

```bash
PHASE 5 EFFORT BREAKDOWN:
├── PWA Implementation: 40% (2-3 hours)
├── Advanced Player Features: 35% (3-4 hours)
├── Admin Dashboard Enhancement: 15% (2-3 hours)
└── Comprehensive Testing: 10% (3-4 hours)

TOTAL ESTIMATED TIME: 10-14 hours
RECOMMENDED TIMELINE: 2-3 weeks (2-3 hours per session)
```

**🎯 Phase 5 is ready for immediate implementation with the existing Phase 4 theme system providing the perfect foundation for advanced PWA and player features.**
