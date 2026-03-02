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

## Requirements

- **Node.js 18+** (for development)
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
