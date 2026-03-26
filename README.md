# Sofathek - Self-Hosted Family Media Center

A self-hosted family media center application with Netflix-like interface and broad web video download capabilities. Built as a complete full-stack solution from scratch.

## Features

- **Netflix-like Interface**: Clean, responsive grid layout with dark/light theme toggle
- **Multi-Site Video Download**: Download videos from YouTube, Vimeo, Twitter/X, and 1000+ other sites via yt-dlp with automatic library integration
- **Media Library**: File system-based video discovery with thumbnail generation
- **Video Streaming**: HTTP range request support for efficient video playback
- **Minimal Video UI**: Grid cards and player view show only the video title and thumbnail/video content (no extra metadata clutter)
- **Usage Statistics**: Simple view count tracking stored in JSON files
- **Admin Interface**: Video download management (URL input, queue control, clear queue action), delete videos, storage usage
- **Mobile-Responsive**: Optimized for all screen sizes

## Tech Stack

- **Frontend**: React 18+ with TypeScript, Shadcn/ui, Tailwind CSS
- **Backend**: Node.js/Express with yt-dlp (YouTube, Vimeo, Twitter/X, and 1000+ sites) and ffmpeg integration
- **Storage**: File system-based (no database required)
- **Deployment**: Docker containerization

## Quick Start

### Using Make (Recommended)

```bash
# Install dependencies
make install

# Start development
make dev         # Backend: http://localhost:3010, Frontend: http://localhost:5183

# Or production build
make start       # Build and start production servers
```

### Using Docker

```bash
# Start with Docker Compose
make docker

# Or manually:
docker-compose up -d
```


### Network Access Configuration

By default, the frontend now calls the backend via a **same-origin relative path** (`/api`).
This allows other devices on your LAN to work when only frontend port `5183` is exposed and API requests are reverse-proxied.

Optional override:

```bash
VITE_API_BASE_URL=http://<backend-host>:3010/api
```

Set `VITE_API_BASE_URL` only when you intentionally want the browser to call a specific backend origin directly.

## Development Commands

```bash
make help        # Show all available commands
make install     # Install all dependencies  
make dev         # Start development servers (backend:3010, frontend:5183)
make build       # Build frontend and backend
make start       # Build and start production servers
make test        # Run all tests
make lint        # Check and fix code quality
make clean       # Clean build artifacts
make stop        # Stop all servers
make docker      # Start with Docker Compose
```

### Typical Workflow

```bash
# Initial setup
make install

# Development
make dev         # Start development servers

# Code validation (auto-runs on git push)
npm run validate:fast   # Quick validation (lint + types)
npm run validate        # Full validation (includes build)

# Before committing
make lint        # Fix code style
make test        # Run tests
make build       # Verify build works

# Production deployment  
make start       # Or use make docker
```

## 🛡️ Code Validation

Sofathek includes **automatic pre-push validation** to ensure code quality:

### **Automatic Validation** (runs on `git push`):
- 📝 **Linting**: Code style and quality checks
- 🔍 **Type Checking**: TypeScript validation  
- 🏗️ **Build Testing**: Production build verification

### **Manual Validation Commands**:
```bash
npm run validate        # Full validation (~60s)
npm run validate:fast   # Skip build (~30s) 
npm run validate:skip   # Emergency skip
```

### **Video Download E2E Test Tiers**:
- `frontend/tests/youtube-download/full-workflow.spec.ts` - mocked UI workflow tests (fast)
- `frontend/tests/youtube-download/integration.spec.ts` - live frontend-backend integration tests (no external video site dependency)
- `frontend/tests/youtube-download/real-world.spec.ts` - real video download end-to-end tests (slow)
- `backend/src/__tests__/integration/routes/youtube.integration.test.ts` - real backend API integration tests with actual yt-dlp download (slow)

Additional details: `frontend/tests/README.md`.

### **Fix Issues Quickly**:
```bash
npm run lint:fix        # Auto-fix linting issues
npm run type-check      # Check TypeScript errors
npm run build           # Test production build
```

📖 **Full documentation**: [docs/PRE_PUSH_VALIDATION.md](docs/PRE_PUSH_VALIDATION.md)

## Project Structure

```
sofathek/
├── frontend/          # React TypeScript application
│   ├── src/           # React components and services
│   ├── dist/          # Production build output
│   └── package.json   # Frontend dependencies
├── backend/           # Express TypeScript API server
│   ├── src/           # API routes and services
│   ├── dist/          # Compiled JavaScript
│   └── package.json   # Backend dependencies
├── data/              # Persistent data storage
│   └── videos/        # Video library files
├── dev/               # Development tools and utilities
│   ├── state/         # Task ledger and development state
│   └── mock-api/      # Mock API server for testing
├── screenshots/       # E2E test screenshots
├── docker-compose.yml # Docker orchestration
├── Makefile          # Development automation
└── README.md         # This file
```

## Video Storage Setup

### Development

The application stores videos in `backend/data/videos` by default. Create the directory:

```bash
mkdir -p backend/data/videos
```

To customize the video directory, set the `VIDEOS_DIR` environment variable:

```bash
# Linux/macOS
export VIDEOS_DIR=/custom/path/to/videos

# Windows (PowerShell)
$env:VIDEOS_DIR = "C:\custom\path\to\videos"
```

### Docker

When running with Docker Compose, videos are stored in a named volume:

```bash
# Check videos volume location
docker volume inspect sofathek_videos

# Backup videos
docker run --rm -v sofathek_videos:/data -v $(pwd)/backup:/backup alpine tar czf /backup/videos.tar.gz -C /data .
```

### Environment Variables

Backend environment variables are loaded from `backend/.env` at startup and read through centralized config in `backend/src/config.ts`.
`VIDEOS_PATH` is still supported as a backward-compatible fallback, but `VIDEOS_DIR` is the canonical variable.
Start from the template:

```bash
cp backend/.env.example backend/.env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend server port |
| `NODE_ENV` | `development` | Runtime environment |
| `LOG_LEVEL` | `info` | Winston logger level |
| `VIDEOS_DIR` | `backend/data/videos` (via `cwd/data/videos`) | Path to video storage directory |
| `VIDEOS_PATH` | (fallback only) | Backward-compatible alias used only when `VIDEOS_DIR` is unset |
| `TEMP_DIR` | `backend/data/temp` (via `cwd/data/temp`) | Path to temporary/transcoding files |
| `ALLOWED_ORIGINS` | `http://localhost:5183` | Comma-separated CORS allowlist for production |
| `THUMBNAIL_MAX_SIZE` | `10485760` (10MB) | Maximum thumbnail size in bytes; larger files return HTTP 413; inaccessible thumbnail files return HTTP 403 |
| `THUMBNAIL_CACHE_DURATION` | `86400` | Thumbnail cache max-age in seconds |
| `FFMPEG_PATH` | `/usr/bin/ffmpeg` | FFmpeg binary path used when static binary is unavailable |
| `FFPROBE_PATH` | `/usr/bin/ffprobe` | FFprobe binary path used when static binary is unavailable |

## Requirements

- **Node.js 18+** (for development and yt-dlp JavaScript runtime)
- **Make** (for using the Makefile commands)  
- **Docker and Docker Compose** (for containerized deployment)
- **Python 3** (for serving production frontend)
- **ffmpeg** (for video processing - backend feature)

### Installation

```bash
# Install Node.js dependencies
make install

# Setup test data
make setup-test-data

# Verify installation
make status
```

For detailed requirements and implementation phases, see [REQUIREMENTS.md](./REQUIREMENTS.md).

# Agent Anti-Deception Rules Integration

These rules are now active for all development work:

## Critical Prevention Rules:
1. **Evidence-First Reporting** - No claims without proof
2. **Failure-First Validation** - Assume broken until proven working  
3. **No Test Theater** - Real tests only, no mocking in final validation
4. **Mandatory Adversarial Testing** - Must try to break before claiming success
5. **Task Ledger Integrity** - Verification commands required for completion
6. **Real-World Requirements** - End-to-end validation mandatory
7. **Failure Disclosure Priority** - Lead with failures immediately
8. **Binary Success Metrics** - 100% working or 100% broken, no partial credit
9. **Independent Verification** - Hostile auditor reproducibility standard
10. **Accountability Timestamps** - Evidence expires in 24 hours

## Enforcement:
- Every task completion MUST follow these rules
- Any violation results in task status reset to 'pending'
- GitHub issues will be created for rule violations

File saved: .claude/AGENT_ANTI_DECEPTION_RULES.md
