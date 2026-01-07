## FEATURE:

Build a self-hosted family mediathek web application called "Sofathek" that provides a Netflix-like interface for managing and streaming local video content with YouTube download capabilities.

### Core Components:

**1. Video Library Management**
- Category-based folder organization (`/videos/movies/`, `/videos/youtube/`, `/videos/family/`, etc.)
- File system-based storage with JSON metadata (no database)
- Each video gets its own folder containing:
  - The MP4 video file
  - `metadata.json` (basic + technical metadata: title, duration, file size, date added, resolution, codec, bitrate)
  - `description.md` (optional description/notes)

**2. YouTube Download System**
- Integration with yt-dlp via Node.js wrapper
- Admin interface for URL input and download management
- Default quality settings: "Best video + Best audio"
- Download queue with progress tracking
- Automatic folder creation and metadata generation

**3. User Profile System**
- Profile-based accounts without authentication
- 6 children themes + 4 adult themes (10 total theme options)
- Per-profile recently watched tracking (stored as JSON)
- Dark/light mode toggle with neon color adaptation

**4. Web Interface**
- Netflix-like paginated grid view per category
- No hero banner - clean grid layout
- Responsive design: desktop and mobile optimized
- Mobile: Touch-friendly with stacked grid (no horizontal rows)
- Neon-colored styling that adapts to dark/light modes

**5. Video Streaming**
- HTML5 video player with custom controls
- Direct MP4 file serving with range request support
- Playback resume functionality
- No transcoding - serve files as-is

**6. Admin Features**
- YouTube download interface (URL paste + settings)
- File operation buttons (delete, move, rename)
- Settings management (default quality, storage paths, themes)
- System status view (storage usage, recent activity)

### Technical Architecture:

**Deployment:** Docker-first strategy with multi-container setup
**Frontend:** React.js SPA with responsive design
**Backend:** Node.js + Express.js REST API
**Storage:** File system only - no database, real-time scanning via Docker volumes
**Video Processing:** yt-dlp integration via Node.js wrapper
**Styling:** CSS-in-JS with neon color theming system

### Docker Container Setup:

**Main Application Container:**
- Node.js runtime with Express.js backend and React frontend
- Includes yt-dlp and ffmpeg for video processing
- Exposes port 3000 internally (host port configurable)

**Volume Mounts:**
- `/app/data/videos` - Main video library storage (persistent)
- `/app/data/profiles` - User settings and profiles (persistent)
- `/app/data/config` - Application configuration (persistent)
- `/app/data/downloads` - Temporary download directory (optional persistent)

**Docker Compose Structure:**
```yaml
services:
  sofathek:
    build: .
    ports:
      - "${SOFATHEK_PORT:-3000}:3000"  # Configurable host port
    volumes:
      - ./data/videos:/app/data/videos
      - ./data/profiles:/app/data/profiles
      - ./data/config:/app/data/config
      - ./data/downloads:/app/data/downloads
    environment:
      - NODE_ENV=production
      - VIDEOS_PATH=/app/data/videos
      - PROFILES_PATH=/app/data/profiles
```

**Environment Configuration (.env file):**
```env
# Port configuration - change as needed
SOFATHEK_PORT=3000

# Alternative examples:
# SOFATHEK_PORT=8080  # For web servers on port 80
# SOFATHEK_PORT=9000  # For custom setups
```

### File Structure Example:
```
Host Directory:
./data/
├── videos/                    # Docker volume mount
│   ├── movies/
│   │   └── movie-title-2024/
│   │       ├── movie-title.mp4
│   │       ├── metadata.json
│   │       └── description.md
│   ├── youtube/
│   │   └── awesome-video-123/
│   │       ├── awesome-video.mp4
│   │       ├── metadata.json
│   │       └── description.md
│   └── family/
│       └── birthday-party-2024/
│           ├── birthday-party.mp4
│           ├── metadata.json
│           └── description.md
├── profiles/                  # Docker volume mount
│   ├── profile-child1.json
│   ├── profile-child2.json
│   └── profile-adult.json
├── config/                    # Docker volume mount
│   ├── app-settings.json
│   └── download-defaults.json
└── downloads/                 # Docker volume mount (temp)
    └── in-progress/
```

**Docker Container Paths:**
- Container videos: `/app/data/videos` → Host: `./data/videos`
- Container profiles: `/app/data/profiles` → Host: `./data/profiles`
- Container config: `/app/data/config` → Host: `./data/config`

## EXAMPLES:

**Docker Deployment Example:**
1. User sets `SOFATHEK_PORT=8080` in `.env` file (or uses default 3000)
2. User runs `docker-compose up -d` 
3. Container starts and creates volume directories if needed
4. Web interface available at `http://localhost:8080` (or configured port)
5. Videos downloaded to `./data/videos` persist between container restarts
6. Profile settings in `./data/profiles` maintain user preferences
7. Easy backup: copy entire `./data/` directory

**Port Configuration Examples:**
- Default: `SOFATHEK_PORT=3000` → `http://localhost:3000`
- Web server: `SOFATHEK_PORT=8080` → `http://localhost:8080`  
- Custom: `SOFATHEK_PORT=9000` → `http://localhost:9000`
- No conflicts: Choose any available port on your system

**Docker Development vs Production:**
- Development: Live code mounting with nodemon auto-restart
- Production: Multi-stage build with optimized React bundle
- Both modes use same volume structure for data persistence
1. Admin pastes YouTube URL in download interface
2. System fetches metadata and shows preview
3. Admin confirms download with category selection
4. yt-dlp downloads "best video + best audio" as MP4
5. System creates folder structure and metadata.json
6. Video appears in library immediately

**Profile Theme Examples:**
- Children themes: "Rainbow Neon", "Space Adventure", "Ocean Waves", "Forest Magic", "Candy Land", "Superhero"
- Adult themes: "Cyberpunk Purple", "Electric Blue", "Neon Green", "Sunset Orange"

**Grid Layout Example:**
- Desktop: 4-6 videos per row with large thumbnails
- Tablet: 3-4 videos per row
- Mobile: 2 videos per row, stack vertically
- Each thumbnail shows: title, duration, watch progress bar

**Metadata JSON Example:**
```json
{
  "title": "Awesome Tutorial Video",
  "duration": 1847,
  "fileSize": 125000000,
  "dateAdded": "2024-01-07T10:30:00Z",
  "resolution": "1920x1080",
  "codec": "h264",
  "bitrate": 2500,
  "category": "youtube",
  "watchProgress": 0.75,
  "thumbnail": "thumbnail.jpg"
}
```

## DOCUMENTATION:

**Node.js + yt-dlp Integration:**
- https://github.com/iqbal-rashed/ytdlp-nodejs - Node.js wrapper for yt-dlp
- https://github.com/yt-dlp/yt-dlp - Official yt-dlp documentation
- https://stackoverflow.com/questions/65122256/serving-video-with-node-js - Video streaming with Express

**React Component Libraries:**
- https://react.dev/ - React official documentation
- https://www.npmjs.com/package/react-router-dom - Client-side routing
- https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video - HTML5 video element

**Video Streaming & File Handling:**
- https://blog.j2i.net/2021/01/10/video-streaming-with-node-and-express/ - Video streaming implementation
- https://nodejs.org/api/fs.html - Node.js File System API
- https://expressjs.com/en/starter/static-files.html - Serving static files

**CSS Theming & Responsive Design:**
- https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout - CSS Grid for responsive layouts
- https://styled-components.com/ - CSS-in-JS styling approach
- https://web.dev/prefers-color-scheme/ - Dark/light mode detection

**Docker & Container Deployment:**
- https://docs.docker.com/compose/ - Docker Compose documentation
- https://nodejs.org/en/docs/guides/nodejs-docker-webapp/ - Node.js Docker best practices
- https://docs.docker.com/storage/volumes/ - Docker volume management
- https://github.com/BretFisher/node-docker-good-defaults - Node.js Docker optimization

## OTHER CONSIDERATIONS:

**Security:**
- Input validation for YouTube URLs (prevent malicious links)
- File path sanitization to prevent directory traversal
- Rate limiting on download endpoints
- No authentication required, but consider basic session management for profiles

**Performance:**
- Implement video thumbnail generation using ffmpeg
- Use Express.js static file serving with proper caching headers
- Consider lazy loading for large video grids
- Implement proper HTTP range requests for video seeking

**Error Handling:**
- Graceful handling of yt-dlp download failures
- File corruption detection and recovery
- Network timeout handling for downloads
- User-friendly error messages in the UI

**File Management:**
- Duplicate detection when downloading existing content
- File cleanup for failed downloads
- Folder structure validation and auto-repair
- Proper handling of special characters in filenames

**Future Extensibility:**
- Plugin architecture for additional download sources
- API endpoints designed for potential mobile app
- Configuration file structure for easy deployment
- Multi-platform Docker builds (ARM64 for Raspberry Pi)
- Kubernetes deployment manifests for scalability

**Development Setup:**
- Docker development environment with live reload
- Use nodemon for development server auto-restart
- ESLint + Prettier for code formatting
- Jest for unit testing API endpoints
- Cypress for end-to-end UI testing
- Multi-stage Dockerfile (dev/prod optimized)

**Docker Deployment Considerations:**
- Volume permissions and user mapping (avoid root user)
- Health checks for container orchestration
- Environment variable configuration management
- Log aggregation and monitoring setup
- Backup strategies for Docker volumes
- Container resource limits and optimization

**Success Criteria:**
1. User can paste a YouTube URL and download video to specified category
2. Downloaded videos appear in grid view immediately after processing
3. Video playback works smoothly with seek/resume functionality
4. Profile switching changes theme and shows personalized recently watched
5. Interface is fully responsive and touch-friendly on mobile devices
6. Admin can manage files (delete, move) and view system status
7. Dark/light mode toggle works with proper neon color adaptation
8. System handles file system scanning without performance issues for moderate collections (100-1000 videos)
9. Docker deployment works with `docker-compose up` single command
10. Data persistence works correctly across container restarts and updates
11. Volume mounts allow easy access to media files from host system
12. Container can be easily backed up and restored by copying data directory
13. Port configuration via `.env` file allows flexible deployment without conflicts
14. Single container approach keeps deployment simple and resource-efficient