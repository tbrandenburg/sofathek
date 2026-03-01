# Sofathek - Self-Hosted Family Media Center

## Project Overview

Implement Sofathek, a self-hosted family media center application with Netflix-like interface and YouTube download capabilities. This will be a complete full-stack solution built from scratch.

## Core Requirements

### 1. Architecture
- **Frontend**: React-based Netflix-like interface
- **Backend**: Node.js/Express API server
- **Storage**: File system-based (no database required)
- **Containerization**: Docker for deployment
- **Data Persistence**: JSON files for metadata

### 2. Key Features

#### Media Library Management
- Simple video library (single view for all videos)
- File system scanning and automatic video discovery
- Metadata extraction and thumbnail generation using ffmpeg
- Basic video playback
- Simple view count statistics

#### YouTube Integration
- YouTube video download via yt-dlp (one at a time)
- Basic progress indicator during download
- Automatic processing and library integration

#### Usage Statistics
- Track simple video view counts
- Store statistics in JSON files (no database required)
- Display basic stats in admin interface
- Privacy-focused (no personal data collection)

#### User Experience
- Netflix-like paginated grid interface
- Dark/light theme toggle with modern design
- Single-user interface (no authentication or profiles)
- Mobile-responsive design

#### Admin Features
- YouTube URL input and download
- Delete videos functionality
- View basic statistics and storage usage

### 3. Technical Stack

#### Frontend
- React 18+ with TypeScript
- Shadcn/ui design system (minimal components)
- Tailwind CSS for styling and responsive design
- Dark/light theme toggle
- HTML5 video player

#### Backend
- Node.js with Express
- yt-dlp integration for YouTube downloads
- ffmpeg for video processing and thumbnails
- HTTP range requests for video streaming

#### Infrastructure
- Docker containerization
- Volume mounts for persistent storage
- Development and production configurations

### 4. Implementation Phases

#### Phase 1: Project Setup & Core Streaming
- Initialize React + Express project structure
- Set up TypeScript configuration
- Configure Docker development environment
- Implement basic video streaming endpoints
- File system scanning and video discovery

#### Phase 2: YouTube Integration & Library
- yt-dlp service integration for single video downloads
- Basic admin interface for URL input
- Simple video library grid view
- Thumbnail generation with ffmpeg

#### Phase 3: UI Polish & Basic Features
- Dark/light theme toggle implementation
- Mobile responsive design
- Simple view count statistics
- Basic admin features (delete videos, storage info)

### 5. Quality Requirements

#### Performance
- Video streaming should start within 2 seconds
- Thumbnail loading should be optimized (lazy loading)
- Mobile responsiveness across all screen sizes
- Efficient handling of large video collections

#### User Experience
- Clean, simple interface with Shadcn/ui components
- Dark/light theme toggle
- Basic video playback
- Clear error messages and loading states

#### Technical Quality
- TypeScript for type safety
- Proper error handling and logging
- Docker containerization for easy deployment
- Clean code architecture and documentation

### 6. File Structure (Planned)

```
sofathek/
├── frontend/          # React application
├── backend/           # Express API server
├── docker/           # Docker configuration files
└── data/             # Volume mount for persistent data
    ├── videos/       # Video library storage
    └── stats.json    # Simple usage statistics
```

### 7. Success Criteria

- ✅ Simple video library system
- ✅ YouTube video download and processing
- ✅ Clean responsive interface with modern design
- ✅ Dark/light theme toggle
- ✅ Basic video streaming
- ✅ Simple view count statistics
- ✅ Basic admin interface
- ✅ Docker deployment ready
- ✅ Mobile-friendly responsive design

## Next Steps

1. Set up project structure and basic video streaming
2. Integrate yt-dlp for YouTube downloads
3. Create simple React frontend with video library
4. Add dark/light theme toggle and basic statistics
5. Polish UI and add basic admin features

This document serves as the foundational requirements for implementing Sofathek. Each phase should be completed with proper testing before moving to the next phase.