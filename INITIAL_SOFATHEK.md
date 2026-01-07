## FEATURE:

Implement Sofathek, a self-hosted family mediathek application, building upon the established golden template repository. Transform the template's dummy frontend and backend into a fully functional Netflix-like media management system with YouTube download capabilities.

### Implementation Strategy:

**Phase 1: Core Infrastructure Adaptation**

- Adapt template's React 19 frontend for media library interface with compiler optimizations
- Extend Express 5.x backend with improved video streaming and file management APIs
- Integrate yt-dlp for YouTube video downloading with Node.js 20+ support
- Implement file system-based storage with JSON metadata

**Phase 2: Media Library System**

- Category-based video organization (movies, youtube, family, etc.)
- Metadata extraction and thumbnail generation using ffmpeg
- File system scanning and video library indexing
- JSON-based persistence for video metadata and user profiles

**Phase 3: User Interface Implementation**

- Netflix-like paginated grid interface with native CSS Grid layout
- 10-theme system (6 children + 4 adult themes) with CSS custom properties
- Dark/light mode toggle with modern CSS-in-JS solutions
- Profile system without authentication (stored as JSON files)
- Mobile-optimized touch interface with Container Queries

**Phase 4: Video Streaming & Playback**

- Modern HTML5 video player with custom controls and progress tracking
- HTTP range request support for video seeking using Express 5.x streaming
- Playback resume functionality per user profile
- Recently watched tracking and storage

**Phase 5: Admin Features & YouTube Integration**

- Admin interface for YouTube URL input and download management
- yt-dlp integration with "best video + best audio" quality settings
- File operation controls (delete, move, rename videos)
- System status monitoring (storage usage, download queue)

### Technical Architecture:

**Frontend Extensions:**

- Replace template's dummy components with media library components using React 19
- Add video grid, player, and admin interfaces with modern component patterns
- Implement theming system with Tailwind CSS or styled-components v6+
- Responsive grid layout using native CSS Grid and Container Queries

**Backend Extensions:**

- Add video streaming endpoints with Express 5.x range request support
- Integrate yt-dlp via modern Node.js wrapper for YouTube downloads
- File system management APIs using Node.js 20+ fs.glob() when available
- Background job processing for download queue management

**Storage Architecture:**

- File system-based storage (no database required)
- JSON files for metadata, user profiles, and configuration
- Docker volume mounts for persistent data storage
- Category-based folder organization for videos

### Enhanced Directory Structure:

```
sofathek/ (built on template)
├── Makefile                    # Extended with Sofathek-specific commands
├── README.md                   # Sofathek-specific documentation
├── AGENTS.md                   # AI collaboration for media app context
├── docker-compose.yml          # Configured for media streaming
├── Dockerfile                  # Includes yt-dlp, ffmpeg, and Node.js 20
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── VideoGrid/      # Netflix-like video grid with CSS Grid
│   │   │   ├── VideoPlayer/    # Modern HTML5 player with Vidstack
│   │   │   ├── ThemeSelector/  # Profile theme management
│   │   │   ├── AdminPanel/     # YouTube download interface
│   │   │   └── ProfileManager/ # User profile switching
│   │   ├── pages/
│   │   │   ├── Library/        # Main video library view
│   │   │   ├── Category/       # Category-specific views
│   │   │   ├── Player/         # Video playback page
│   │   │   └── Admin/          # Administration interface
│   │   ├── services/
│   │   │   ├── api.js          # Video and download API calls
│   │   │   ├── player.js       # Video player utilities
│   │   │   └── themes.js       # Modern theme management system
│   │   └── styles/
│   │       └── themes/         # CSS custom properties for 10 themes
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── videos.js       # Express 5.x video streaming APIs
│   │   │   ├── downloads.js    # YouTube download management
│   │   │   ├── profiles.js     # User profile management
│   │   │   └── admin.js        # Administrative operations
│   │   ├── services/
│   │   │   ├── ytdlp.js        # YouTube download integration
│   │   │   ├── ffmpeg.js       # Video processing and thumbnails
│   │   │   ├── scanner.js      # File system scanning with modern APIs
│   │   │   └── metadata.js     # Video metadata management
│   │   └── middleware/
│   │       ├── streaming.js    # Video streaming with Express 5.x
│   │       └── fileOps.js      # File operation utilities
└── data/                       # Docker volume mount points
    ├── videos/                 # Video library storage
    ├── profiles/               # User profile JSON files
    ├── config/                 # Application configuration
    └── downloads/              # Temporary download directory
```

## EXAMPLES:

**Modern Video Grid Component (React 19):**

```jsx
import { memo } from 'react';
import { useTheme } from './hooks/useTheme';

const VideoGrid = memo(({ category, videos, profile }) => {
  const theme = useTheme(profile.selectedTheme);

  return (
    <div
      className="video-grid"
      style={{
        '--grid-columns': 'repeat(auto-fill, minmax(300px, 1fr))',
        '--grid-gap': theme.spacing.medium,
        display: 'grid',
        gridTemplateColumns: 'var(--grid-columns)',
        gap: 'var(--grid-gap)',
        padding: theme.spacing.large,
      }}
    >
      {videos.map(video => (
        <VideoCard
          key={video.id}
          video={video}
          watchProgress={profile.watchHistory[video.id]}
          onPlay={handleVideoPlay}
        />
      ))}
    </div>
  );
});
```

**YouTube Download API (Express 5.x):**

```javascript
// POST /api/downloads
app.post('/api/downloads', async (req, res) => {
  const { url, category } = req.body;

  try {
    const downloadJob = await ytdlpService.downloadVideo(url, {
      quality: 'best[ext=mp4]',
      outputDir: `/app/data/videos/${category}`,
      generateThumbnail: true,
      format: 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4] / bv*+ba/b',
    });

    res.json({ jobId: downloadJob.id, status: 'queued' });
  } catch (error) {
    console.error('Download error:', error);
    res.status(400).json({ error: error.message });
  }
});
```

**Modern Video Streaming Endpoint (Express 5.x):**

```javascript
// GET /api/videos/:id/stream
app.get('/api/videos/:id/stream', (req, res) => {
  const { id } = req.params;
  const videoPath = getVideoPath(id);

  // Use Express 5.x improved sendFile with proper streaming
  res.sendFile(
    videoPath,
    {
      root: process.cwd(),
      headers: {
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
      },
    },
    err => {
      if (err) {
        console.error('Streaming error:', err);
        if (!res.headersSent) {
          res.status(err.status || 500).end();
        }
      }
    }
  );
});
```

**Modern Theme System with CSS Custom Properties:**

```javascript
const themes = {
  'cyberpunk-purple': {
    '--primary-color': '#8B5CF6',
    '--secondary-color': '#A855F7',
    '--accent-color': '#EC4899',
    '--neon-glow': '0 0 20px #8B5CF6',
    '--background-color': '#1A1625',
    '--text-color': '#FFFFFF',
    '--surface-color': '#2A1F3D',
  },
  'rainbow-neon': {
    '--primary-color': '#FF6B6B',
    '--secondary-color': '#4ECDC4',
    '--accent-color': '#45B7D1',
    '--neon-glow': '0 0 15px #FF6B6B',
    '--background-color': '#2C1810',
    '--text-color': '#FFFFFF',
    '--surface-color': '#3D2317',
  },
  // ... 8 more themes
};

// Apply theme using CSS custom properties
const applyTheme = themeName => {
  const theme = themes[themeName];
  const root = document.documentElement;

  Object.entries(theme).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
};
```

**Video Metadata JSON (Enhanced):**

```json
{
  "id": "awesome-tutorial-2024",
  "title": "Awesome Tutorial Video",
  "duration": 1847,
  "fileSize": 125000000,
  "dateAdded": "2024-01-07T10:30:00Z",
  "resolution": "1920x1080",
  "codec": "h264",
  "bitrate": 2500,
  "category": "youtube",
  "source": "https://youtube.com/watch?v=...",
  "thumbnail": "thumbnail.webp",
  "description": "An amazing tutorial about...",
  "tags": ["tutorial", "educational", "tech"],
  "chapters": [
    { "title": "Introduction", "start": 0 },
    { "title": "Main Content", "start": 120 }
  ],
  "subtitles": ["en", "es"],
  "accessibility": {
    "hasClosedCaptions": true,
    "hasAudioDescription": false
  }
}
```

## DOCUMENTATION:

**Media Streaming & Processing:**

- https://github.com/yt-dlp/yt-dlp - Modern YouTube downloader (yt-dlp official)
- https://github.com/fluent-ffmpeg/node-fluent-ffmpeg - FFmpeg integration for Node.js
- https://web.dev/streams/ - Modern streaming APIs and best practices

**Frontend Media Components:**

- https://www.vidstack.io/docs/player/components/react - Modern, accessible video player
- https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video - HTML5 video element reference
- https://plyr.io/docs/react - Lightweight, accessible video player alternative

**Modern CSS & Styling:**

- https://tailwindcss.com/docs - Utility-first CSS framework
- https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout - Native CSS Grid
- https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_container_queries - Container Queries for responsive design

**File System & Storage:**

- https://nodejs.org/api/fs.html - Node.js file system operations
- https://github.com/sindresorhus/globby - File pattern matching
- https://docs.docker.com/storage/volumes/ - Docker volume persistence

**UI/UX for Media Applications:**

- https://ui.shadcn.com/ - Modern React component library
- https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Basic_concepts_of_grid_layout - CSS Grid fundamentals
- https://styled-components.com/docs/advanced#theming - Advanced theming patterns

**Express.js & Backend:**

- https://expressjs.com/en/5x/api.html - Express 5.x API documentation
- https://nodejs.org/api/stream.html - Node.js streams for video handling
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests - HTTP range requests

**YouTube Integration:**

- https://github.com/yt-dlp/yt-dlp - yt-dlp official documentation
- https://github.com/distube/ytdl-core - Modern YouTube library alternative
- https://developers.google.com/youtube/v3 - YouTube API reference

## OTHER CONSIDERATIONS:

**Performance & Scalability:**

- Lazy loading for video thumbnails with Intersection Observer API
- WebP/AVIF thumbnails for better compression
- Service Workers for offline video caching
- Memory management for large video collections using streaming APIs
- Progressive video loading with modern video codecs (AV1, HEVC)

**User Experience:**

- Keyboard shortcuts using modern KeyboardEvent APIs
- Drag-and-drop with File System Access API (when available)
- Batch operations with Web Workers for non-blocking UI
- Advanced search with fuzzy matching algorithms
- WCAG 2.1 AA compliance for accessibility

**Content Management:**

- Duplicate video detection using perceptual hashing
- Automatic metadata extraction with machine learning
- Batch thumbnail generation with WebAssembly FFmpeg
- Video quality assessment using modern metrics
- Smart storage cleanup with usage analytics

**Security & Privacy:**

- Input sanitization with modern validation libraries
- Rate limiting with Redis or in-memory stores
- Content Security Policy (CSP) for XSS prevention
- Privacy-first design with local-only data processing
- Secure headers and HTTPS enforcement

**Mobile Optimization:**

- Touch-optimized controls with Pointer Events API
- Responsive design with Container Queries
- Offline-first architecture with Service Workers
- Battery-efficient video streaming with adaptive bitrate
- iOS/Android PWA installation support

**Administration Features:**

- Real-time download progress with WebSockets
- System health monitoring with Prometheus metrics
- Structured logging with modern logging libraries
- Configuration backup with automated scheduling
- User activity analytics with privacy compliance

**Modern Development:**

- TypeScript for type safety and developer experience
- ESM modules for better tree-shaking
- Vite or modern bundlers for faster development
- Docker multi-stage builds for smaller images
- GitHub Actions for CI/CD automation

**Success Criteria:**

1. Template repository successfully adapted into functional Sofathek application
2. YouTube videos can be downloaded and automatically organized by category
3. Video library displays in responsive CSS Grid interface
4. All 10 themes work correctly with CSS custom properties and dark/light mode
5. Video playback works smoothly with seeking and resume functionality using modern APIs
6. Profile switching maintains individual user preferences and watch history
7. Admin interface allows complete video and download management
8. Docker deployment maintains data persistence across container updates
9. Mobile interface provides touch-friendly navigation with modern web APIs
10. File system scanning handles moderate video collections (100-1000 videos) efficiently
11. Application builds successfully on the established template foundation with modern tooling
12. All template testing infrastructure works with Sofathek-specific components
13. Performance meets Core Web Vitals standards for media applications
14. Accessibility compliance with WCAG 2.1 AA standards
15. Modern browser compatibility with graceful degradation
