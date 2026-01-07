## FEATURE:

Implement Sofathek, a self-hosted family mediathek application, building upon the established golden template repository. Transform the template's dummy frontend and backend into a fully functional Netflix-like media management system with YouTube download capabilities.

### Implementation Strategy:

**Phase 1: Core Infrastructure Adaptation**
- Adapt template's React frontend for media library interface
- Extend Express backend with video streaming and file management APIs
- Integrate yt-dlp for YouTube video downloading
- Implement file system-based storage with JSON metadata

**Phase 2: Media Library System**
- Category-based video organization (movies, youtube, family, etc.)
- Metadata extraction and thumbnail generation using ffmpeg
- File system scanning and video library indexing
- JSON-based persistence for video metadata and user profiles

**Phase 3: User Interface Implementation**
- Netflix-like paginated grid interface with responsive design
- 10-theme system (6 children + 4 adult themes) with neon color schemes
- Dark/light mode toggle with adaptive neon colors
- Profile system without authentication (stored as JSON files)
- Mobile-optimized touch interface with stacked grid layout

**Phase 4: Video Streaming & Playback**
- HTML5 video player with custom controls and progress tracking
- HTTP range request support for video seeking
- Playback resume functionality per user profile
- Recently watched tracking and storage

**Phase 5: Admin Features & YouTube Integration**
- Admin interface for YouTube URL input and download management
- yt-dlp integration with "best video + best audio" quality settings
- File operation controls (delete, move, rename videos)
- System status monitoring (storage usage, download queue)

### Technical Architecture:

**Frontend Extensions:**
- Replace template's dummy components with media library components
- Add video grid, player, and admin interfaces
- Implement theming system with CSS-in-JS and neon color palettes
- Responsive grid layout optimized for desktop and mobile

**Backend Extensions:**
- Add video streaming endpoints with range request support
- Integrate yt-dlp via Node.js wrapper for YouTube downloads
- File system management APIs for video operations
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
├── Dockerfile                  # Includes yt-dlp and ffmpeg
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── VideoGrid/      # Netflix-like video grid
│   │   │   ├── VideoPlayer/    # Custom HTML5 player
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
│   │   │   └── themes.js       # Theme management system
│   │   └── styles/
│   │       └── themes/         # 10 neon theme definitions
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── videos.js       # Video streaming and metadata APIs
│   │   │   ├── downloads.js    # YouTube download management
│   │   │   ├── profiles.js     # User profile management
│   │   │   └── admin.js        # Administrative operations
│   │   ├── services/
│   │   │   ├── ytdlp.js        # YouTube download integration
│   │   │   ├── ffmpeg.js       # Video processing and thumbnails
│   │   │   ├── scanner.js      # File system scanning
│   │   │   └── metadata.js     # Video metadata management
│   │   └── middleware/
│   │       ├── streaming.js    # Video streaming with range requests
│   │       └── fileOps.js      # File operation utilities
└── data/                       # Docker volume mount points
    ├── videos/                 # Video library storage
    ├── profiles/               # User profile JSON files
    ├── config/                 # Application configuration
    └── downloads/              # Temporary download directory
```

## EXAMPLES:

**Video Grid Component:**
```jsx
const VideoGrid = ({ category, videos, profile }) => {
  const theme = useTheme(profile.selectedTheme);
  return (
    <GridContainer theme={theme}>
      {videos.map(video => (
        <VideoCard 
          key={video.id}
          video={video}
          watchProgress={profile.watchHistory[video.id]}
          onPlay={handleVideoPlay}
        />
      ))}
    </GridContainer>
  );
};
```

**YouTube Download API:**
```javascript
// POST /api/downloads
app.post('/api/downloads', async (req, res) => {
  const { url, category } = req.body;
  
  try {
    const downloadJob = await ytdlpService.downloadVideo(url, {
      quality: 'best[ext=mp4]',
      outputDir: `/app/data/videos/${category}`,
      generateThumbnail: true
    });
    
    res.json({ jobId: downloadJob.id, status: 'queued' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

**Video Streaming Endpoint:**
```javascript
// GET /api/videos/:id/stream
app.get('/api/videos/:id/stream', (req, res) => {
  const { id } = req.params;
  const range = req.headers.range;
  
  const videoPath = getVideoPath(id);
  const stat = fs.statSync(videoPath);
  
  if (range) {
    // Handle range requests for video seeking
    const [start, end] = parseRange(range, stat.size);
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': 'video/mp4'
    });
    fs.createReadStream(videoPath, { start, end }).pipe(res);
  } else {
    // Stream entire video
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': 'video/mp4'
    });
    fs.createReadStream(videoPath).pipe(res);
  }
});
```

**Theme System:**
```javascript
const themes = {
  'cyberpunk-purple': {
    primary: '#8B5CF6',
    secondary: '#A855F7',
    accent: '#EC4899',
    neonGlow: '0 0 20px #8B5CF6',
    background: '#1A1625'
  },
  'rainbow-neon': {
    primary: '#FF6B6B',
    secondary: '#4ECDC4', 
    accent: '#45B7D1',
    neonGlow: '0 0 15px #FF6B6B',
    background: '#2C1810'
  }
  // ... 8 more themes
};
```

**Video Metadata JSON:**
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
  "thumbnail": "thumbnail.jpg",
  "description": "An amazing tutorial about...",
  "tags": ["tutorial", "educational", "tech"]
}
```

## DOCUMENTATION:

**Media Streaming & Processing:**
- https://github.com/iqbal-rashed/ytdlp-nodejs - Node.js yt-dlp wrapper
- https://github.com/fluent-ffmpeg/node-fluent-ffmpeg - FFmpeg integration
- https://blog.j2i.net/2021/01/10/video-streaming-with-node-and-express/ - Video streaming implementation

**Frontend Media Components:**
- https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video - HTML5 video element
- https://github.com/cookpete/react-player - React video player options
- https://css-tricks.com/creating-a-custom-video-player/ - Custom video controls

**File System & Storage:**
- https://nodejs.org/api/fs.html - Node.js file system operations
- https://github.com/sindresorhus/globby - File pattern matching
- https://docs.docker.com/storage/volumes/ - Docker volume persistence

**UI/UX for Media Applications:**
- https://www.figma.com/community/file/1100890357362776956 - Netflix UI patterns
- https://material-ui.com/components/grid/ - Responsive grid systems
- https://github.com/styled-components/styled-components - Dynamic theming

**YouTube Integration:**
- https://github.com/yt-dlp/yt-dlp - yt-dlp documentation
- https://github.com/fent/node-ytdl-core - Alternative YouTube library
- https://developers.google.com/youtube/v3 - YouTube API reference

## OTHER CONSIDERATIONS:

**Performance & Scalability:**
- Lazy loading for video thumbnails and metadata
- Video thumbnail caching strategies
- Efficient file system scanning algorithms
- Memory management for large video collections
- Progressive video loading for mobile devices

**User Experience:**
- Keyboard shortcuts for video player control
- Drag-and-drop for local file uploads
- Batch operations for video management
- Search and filter capabilities across video library
- Accessibility features for video player controls

**Content Management:**
- Duplicate video detection and handling
- Automatic metadata extraction from video files
- Batch thumbnail generation for existing videos
- Video quality assessment and reporting
- Storage usage monitoring and cleanup tools

**Security & Privacy:**
- Input sanitization for YouTube URLs and file paths
- Rate limiting for download operations
- File type validation and security scanning
- Privacy considerations for family usage
- Local network access restrictions

**Mobile Optimization:**
- Touch-optimized video controls
- Responsive grid layouts for different screen sizes
- Offline video playback capabilities
- Mobile-specific gesture controls
- Battery-efficient video streaming

**Administration Features:**
- Download queue management and prioritization
- System health monitoring and alerting
- Log management and debugging tools
- Configuration backup and restore
- User activity tracking and analytics

**Success Criteria:**
1. Template repository successfully adapted into functional Sofathek application
2. YouTube videos can be downloaded and automatically organized by category
3. Video library displays in responsive Netflix-like grid interface
4. All 10 themes work correctly with dark/light mode adaptation
5. Video playback works smoothly with seeking and resume functionality
6. Profile switching maintains individual user preferences and watch history
7. Admin interface allows complete video and download management
8. Docker deployment maintains data persistence across container updates
9. Mobile interface provides touch-friendly navigation and video controls
10. File system scanning handles moderate video collections (100-1000 videos) efficiently
11. Application builds successfully on the established template foundation
12. All template testing infrastructure works with Sofathek-specific components