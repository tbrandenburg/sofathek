# Sofathek - Self-Hosted Family Media Center

A self-hosted family media center application with Netflix-like interface and YouTube download capabilities. Built as a complete full-stack solution from scratch.

## Features

- **Netflix-like Interface**: Clean, responsive grid layout with dark/light theme toggle
- **YouTube Integration**: Download videos via yt-dlp with automatic library integration
- **Media Library**: File system-based video discovery with thumbnail generation
- **Video Streaming**: HTTP range request support for efficient video playback
- **Usage Statistics**: Simple view count tracking stored in JSON files
- **Admin Interface**: YouTube download management, delete videos, storage usage
- **Mobile-Responsive**: Optimized for all screen sizes

## Tech Stack

- **Frontend**: React 18+ with TypeScript, Shadcn/ui, Tailwind CSS
- **Backend**: Node.js/Express with yt-dlp and ffmpeg integration
- **Storage**: File system-based (no database required)
- **Deployment**: Docker containerization

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd sofathek

# Start with Docker
docker-compose up -d

# Or run development environment
npm run dev
```

## Project Structure

```
sofathek/
├── frontend/          # React application
├── backend/           # Express API server
├── docker/           # Docker configuration files
└── data/             # Volume mount for persistent data
    ├── videos/       # Video library storage
    └── stats.json    # Usage statistics
```

## Requirements

- Docker and Docker Compose
- Node.js 18+ (for development)
- ffmpeg (for video processing)

For detailed requirements and implementation phases, see [REQUIREMENTS.md](./REQUIREMENTS.md).
