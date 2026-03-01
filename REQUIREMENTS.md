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
- Category-based video organization (movies, youtube, family, etc.)
- File system scanning and automatic video discovery
- Metadata extraction and thumbnail generation using ffmpeg
- Video playback with progress tracking and resume functionality

#### YouTube Integration
- YouTube video download via yt-dlp
- Quality selection and download queue management
- Automatic processing and library integration

#### User Experience
- Netflix-like paginated grid interface
- 10-theme system with dark/light mode support
- Profile system for multiple users (no authentication required)
- Mobile-responsive design

#### Admin Features
- YouTube URL input and download management
- File operations (delete, move, rename videos)
- System monitoring (storage usage, download queue status)

### 3. Technical Stack

#### Frontend
- React 18+ with TypeScript
- Modern CSS Grid layout
- CSS custom properties for theming
- HTML5 video player with custom controls

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

#### Phase 1: Project Setup & Basic Infrastructure
- Initialize React + Express project structure
- Set up TypeScript configuration
- Configure Docker development environment
- Implement basic API structure and health endpoints

#### Phase 2: Media Library Core
- File system scanning and video discovery
- Metadata extraction with ffmpeg
- Thumbnail generation
- Basic video streaming endpoints
- JSON-based metadata storage

#### Phase 3: Frontend Interface
- Netflix-like video grid component
- Video card display with thumbnails
- Basic video player integration
- Category navigation
- Responsive design implementation

#### Phase 4: YouTube Integration
- yt-dlp service integration
- Download queue management
- Admin interface for URL input
- Progress tracking and status updates

#### Phase 5: Advanced Features
- Theme system implementation (10 themes)
- User profiles and preferences
- Playback progress tracking and resume
- Advanced admin features and monitoring

### 5. Quality Requirements

#### Performance
- Video streaming should start within 2 seconds
- Thumbnail loading should be optimized (lazy loading)
- Mobile responsiveness across all screen sizes
- Efficient handling of large video collections

#### User Experience
- Intuitive Netflix-like interface
- Smooth theme switching
- Reliable video playback with seeking
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
├── data/             # Volume mount for persistent data
│   ├── videos/       # Video library storage
│   ├── profiles/     # User profiles (JSON)
│   └── config/       # Application configuration
└── docs/            # Documentation
```

### 7. Success Criteria

- ✅ Complete video library management system
- ✅ YouTube video download and processing
- ✅ Netflix-like responsive interface
- ✅ Multiple theme support
- ✅ Video streaming with progress tracking
- ✅ Admin interface for management
- ✅ Docker deployment ready
- ✅ Mobile-friendly responsive design

## Next Steps

1. Set up project structure and development environment
2. Implement basic backend API with video streaming
3. Create React frontend with video grid interface
4. Integrate yt-dlp for YouTube downloads
5. Add theming system and user profiles
6. Implement admin features and system monitoring

This document serves as the foundational requirements for implementing Sofathek. Each phase should be completed with proper testing before moving to the next phase.