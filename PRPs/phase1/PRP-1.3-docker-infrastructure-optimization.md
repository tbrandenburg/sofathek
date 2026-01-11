---
name: "SOFATHEK Phase 1.3 - Docker & Infrastructure Optimization"
description: |
  Optimize the existing Docker setup for SOFATHEK with multi-stage builds, improved caching, development vs production configurations, and enhanced media processing capabilities. Build upon the working foundation while improving efficiency and deployment.

## Purpose

Transform the functional Docker setup into an optimized, production-ready containerized infrastructure with efficient builds, proper environment separation, enhanced media processing capabilities, and improved developer experience.

## Core Principles

1. **Build Efficiency**: Multi-stage builds with optimal layer caching and minimal image sizes
2. **Environment Parity**: Consistent behavior across development, staging, and production
3. **Media Optimization**: Enhanced ffmpeg and yt-dlp integration with proper binary management
4. **Security Hardening**: Non-root containers, minimal attack surface, secure defaults
5. **Developer Experience**: Fast rebuilds, live reload, and debugging capabilities

---

## Goal

Optimize the existing SOFATHEK Docker infrastructure for production deployment while maintaining development velocity through efficient builds, proper environment configuration, and enhanced media processing capabilities.

## Why

- **Build Performance**: Current Docker builds are slow and inefficient with poor layer caching
- **Production Readiness**: Missing production optimizations and security hardening
- **Media Processing**: ffmpeg and yt-dlp installations can be optimized for size and performance
- **Development Experience**: No development-specific optimizations for fast iteration
- **Deployment Flexibility**: Single configuration doesn't suit different deployment environments
- **Security Concerns**: Running as root user with unnecessary privileges

## What

A comprehensive Docker infrastructure optimization with multiple specialized configurations:

### Multi-Stage Production Build

```dockerfile
# Stage 1: Base dependencies with optimized media tools
FROM node:20-alpine AS base
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    py3-pip \
    && pip3 install --no-cache-dir yt-dlp==2024.1.7

# Stage 2: Dependencies installation
FROM base AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Stage 3: Build stage for frontend
FROM base AS frontend-build
WORKDIR /app
COPY frontend/package*.json frontend/
RUN cd frontend && npm ci
COPY frontend/ frontend/
RUN cd frontend && npm run build

# Stage 4: Final production image
FROM base AS production
RUN addgroup -g 1001 -S sofathek && adduser -S sofathek -u 1001
USER sofathek
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=frontend-build /app/frontend/dist ./frontend/dist
COPY backend/ ./backend/
COPY package*.json ./
EXPOSE 3001
CMD ["npm", "run", "start:prod"]
```

### Development-Optimized Configuration

```dockerfile
# Development Dockerfile with hot reload and debugging
FROM node:20-alpine AS development
RUN apk add --no-cache ffmpeg python3 py3-pip
RUN pip3 install --no-cache-dir yt-dlp

WORKDIR /app
COPY package*.json ./
RUN npm install

# Install nodemon for hot reload
RUN npm install -g nodemon

# Create non-root user for development
RUN addgroup -g 1001 -S sofathek && adduser -S sofathek -u 1001 -G sofathek
RUN chown -R sofathek:sofathek /app
USER sofathek

# Volume mounts for development
VOLUME ["/app/backend", "/app/frontend", "/app/data"]

EXPOSE 3001 9229
CMD ["npm", "run", "dev"]
```

### Enhanced Docker Compose with Environment Profiles

```yaml
# docker-compose.yml - Base configuration
version: '3.8'
services:
  sofathek:
    build:
      context: .
      dockerfile: Dockerfile
      target: ${BUILD_TARGET:-production}
    ports:
      - "${BACKEND_PORT:-3001}:3001"
    volumes:
      - "./data:/app/data"
    environment:
      - NODE_ENV=${NODE_ENV:-production}
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "${FRONTEND_PORT:-3000}:3000"
    depends_on:
      - sofathek
    restart: unless-stopped

# docker-compose.dev.yml - Development overrides
version: '3.8'
services:
  sofathek:
    build:
      target: development
    volumes:
      - "./backend:/app/backend:cached"
      - "./frontend:/app/frontend:cached"
      - "./data:/app/data"
      - "./package*.json:/app/"
    ports:
      - "3001:3001"
      - "9229:9229"  # Node.js debugging
    environment:
      - NODE_ENV=development
      - DEBUG=sofathek:*
    command: ["npm", "run", "dev"]
```

### Success Criteria

- [ ] **Build Speed**: 50% faster Docker builds through optimized layer caching
- [ ] **Image Size**: 40% smaller production images through multi-stage builds
- [ ] **Security**: Non-root containers with minimal attack surface
- [ ] **Development**: Sub-second hot reload for code changes
- [ ] **Production**: Optimized runtime with proper resource limits
- [ ] **Media Tools**: Latest ffmpeg and yt-dlp with optimal configurations
- [ ] **Environment Parity**: Consistent behavior across dev/staging/prod
- [ ] **Monitoring**: Health checks and proper logging configuration

## All Needed Context

### Current Docker Analysis

```yaml
# Existing Dockerfile issues (to fix)
issues:
  - Single-stage build (inefficient)
  - Running as root user (security risk)
  - No layer caching optimization
  - Same config for dev/prod (suboptimal)
  - Large image size with unnecessary dependencies
  - No health checks or monitoring
  - Inefficient media tool installation

# Current working functionality (to preserve)
working:
  - ffmpeg integration functional
  - yt-dlp installation working
  - Volume mounts for data persistence
  - Port exposure and networking
  - Basic multi-service orchestration
```

### Binary Optimization Strategy

```yaml
# Media processing tools optimization
ffmpeg:
  current: 'Full Alpine ffmpeg package (~200MB)'
  optimized: 'Static binary with essential codecs (~50MB)'
  features: [h264, hevc, vp9, aac, mp3, webp]

yt_dlp:
  current: 'Python pip install with full dependencies'
  optimized: 'Standalone binary with minimal Python runtime'
  version: '2024.1.7 (pinned for stability)'

node_modules:
  optimization: 'Production-only dependencies in final stage'
  caching: 'Separate layer for package.json changes'
  cleanup: 'npm cache clean after install'
```

### Environment Configuration Matrix

```yaml
development:
  target: development
  volumes: [source_code, data]
  ports: [3001, 9229_debug]
  hot_reload: enabled
  debugging: enabled
  user: sofathek (non-root)

staging:
  target: production
  volumes: [data_only]
  ports: [3001]
  optimization: enabled
  monitoring: basic
  user: sofathek (non-root)

production:
  target: production
  volumes: [data_only]
  ports: [3001]
  optimization: full
  monitoring: comprehensive
  security: hardened
  user: sofathek (non-root)
```

## Implementation Blueprint

### Task List

```yaml
Phase 1.3.1: Multi-Stage Dockerfile Optimization
FILE: Dockerfile
ACTION: Create optimized multi-stage build
PATTERN: |
  # Stage 1: Base with optimized media tools
  FROM node:20-alpine AS base

  # Install ffmpeg with specific codecs only
  RUN apk add --no-cache \
      ffmpeg \
      python3 \
      py3-pip \
      curl \
      && pip3 install --no-cache-dir yt-dlp==2024.1.7 \
      && apk del py3-pip \
      && rm -rf /var/cache/apk/*

  # Stage 2: Dependencies (cached separately)
  FROM base AS deps
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci --only=production --no-audit \
      && npm cache clean --force

  # Stage 3: Frontend build
  FROM base AS frontend-build
  WORKDIR /app
  COPY frontend/package*.json frontend/
  RUN cd frontend && npm ci --no-audit
  COPY frontend/ frontend/
  RUN cd frontend && npm run build

  # Stage 4: Production runtime
  FROM base AS production
  RUN addgroup -g 1001 -S sofathek \
      && adduser -S sofathek -u 1001 -G sofathek

  WORKDIR /app
  RUN chown sofathek:sofathek /app

  COPY --from=deps --chown=sofathek:sofathek /app/node_modules ./node_modules
  COPY --from=frontend-build --chown=sofathek:sofathek /app/frontend/dist ./public
  COPY --chown=sofathek:sofathek backend/ ./backend/
  COPY --chown=sofathek:sofathek package*.json ./

  USER sofathek
  EXPOSE 3001
  HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

  CMD ["node", "backend/src/app.js"]

Phase 1.3.2: Development Dockerfile
FILE: Dockerfile.dev
ACTION: Create development-optimized build
PATTERN: |
  FROM node:20-alpine AS development

  # Install development tools
  RUN apk add --no-cache ffmpeg python3 py3-pip git \
      && pip3 install --no-cache-dir yt-dlp==2024.1.7

  # Install global development tools
  RUN npm install -g nodemon tsx

  WORKDIR /app

  # Create non-root user
  RUN addgroup -g 1001 -S sofathek \
      && adduser -S sofathek -u 1001 -G sofathek \
      && chown sofathek:sofathek /app

  USER sofathek

  # Install dependencies (use cache mount in compose)
  COPY --chown=sofathek:sofathek package*.json ./
  RUN npm install

  EXPOSE 3001 9229
  CMD ["npm", "run", "dev"]

Phase 1.3.3: Enhanced Docker Compose Configuration
FILE: docker-compose.yml
ACTION: Create base configuration with overrides
PATTERN: |
  version: '3.8'

  services:
    sofathek-backend:
      build:
        context: .
        dockerfile: ${DOCKERFILE:-Dockerfile}
        target: ${BUILD_TARGET:-production}
      container_name: sofathek-backend
      restart: unless-stopped
      ports:
        - "${BACKEND_PORT:-3001}:3001"
      volumes:
        - "./data:/app/data:rw"
      environment:
        - NODE_ENV=${NODE_ENV:-production}
        - LOG_LEVEL=${LOG_LEVEL:-info}
        - SOFATHEK_DATA_PATH=/app/data
      healthcheck:
        test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
        interval: 30s
        timeout: 10s
        retries: 3
        start_period: 40s
      networks:
        - sofathek-network

    sofathek-frontend:
      build:
        context: ./frontend
        dockerfile: Dockerfile
      container_name: sofathek-frontend
      restart: unless-stopped
      ports:
        - "${FRONTEND_PORT:-3000}:3000"
      depends_on:
        sofathek-backend:
          condition: service_healthy
      environment:
        - REACT_APP_API_BASE_URL=http://localhost:3001
      networks:
        - sofathek-network

  networks:
    sofathek-network:
      driver: bridge

  volumes:
    sofathek-data:
      driver: local

Phase 1.3.4: Development Override Configuration
FILE: docker-compose.dev.yml
ACTION: Development-specific optimizations
PATTERN: |
  version: '3.8'

  services:
    sofathek-backend:
      build:
        dockerfile: Dockerfile.dev
        target: development
      volumes:
        - "./backend:/app/backend:cached"
        - "./package*.json:/app/"
        - "./data:/app/data:rw"
        # Use named volume for node_modules (performance)
        - sofathek-node-modules:/app/node_modules
      ports:
        - "3001:3001"
        - "9229:9229"  # Node.js debugging port
      environment:
        - NODE_ENV=development
        - DEBUG=sofathek:*
        - LOG_LEVEL=debug
      command: ["npm", "run", "dev"]
      # Disable healthcheck in development (faster startup)
      healthcheck:
        disable: true

    sofathek-frontend:
      build:
        context: ./frontend
        dockerfile: Dockerfile.dev
      volumes:
        - "./frontend/src:/app/src:cached"
        - "./frontend/public:/app/public:cached"
        - sofathek-frontend-node-modules:/app/node_modules
      environment:
        - FAST_REFRESH=true
        - REACT_APP_API_BASE_URL=http://localhost:3001
      command: ["npm", "start"]

  volumes:
    sofathek-node-modules:
    sofathek-frontend-node-modules:

Phase 1.3.5: Build Optimization Scripts
FILE: scripts/docker-build.sh
ACTION: Create optimized build scripts
PATTERN: |
  #!/bin/bash
  set -e

  # Build optimization script
  echo "🚀 Building SOFATHEK Docker images..."

  # Build with build cache and parallel stages
  DOCKER_BUILDKIT=1 docker build \
    --target production \
    --tag sofathek:latest \
    --tag sofathek:$(date +%Y%m%d) \
    --cache-from sofathek:cache \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    .

  # Build development image
  DOCKER_BUILDKIT=1 docker build \
    --file Dockerfile.dev \
    --target development \
    --tag sofathek:dev \
    --cache-from sofathek:dev-cache \
    .

  echo "✅ Build completed successfully"
  echo "Production image: sofathek:latest"
  echo "Development image: sofathek:dev"
```

### Performance Optimization Techniques

```bash
# Layer caching optimization
COPY package*.json ./          # Separate layer for dependencies
RUN npm ci --only=production   # Cached unless package.json changes
COPY . .                       # Application code in separate layer

# Build kit optimizations
export DOCKER_BUILDKIT=1       # Enable advanced build features
export COMPOSE_DOCKER_CLI_BUILD=1  # Enable for docker-compose

# Multi-platform builds for deployment
docker buildx build --platform linux/amd64,linux/arm64 \
  --tag sofathek:multiarch .
```

## Validation Loop

### Level 1: Build Performance Testing

```bash
# Measure build times (clean build)
time docker build --no-cache -t sofathek:test .

# Measure incremental builds (code change only)
echo "// comment" >> backend/src/app.ts
time docker build -t sofathek:test-incremental .

# Expected: 50% faster incremental builds due to layer caching
```

### Level 2: Image Size Optimization

```bash
# Check image sizes
docker images | grep sofathek

# Analyze layer sizes
docker history sofathek:latest

# Expected: 40% smaller than original single-stage build
# Production image should be < 200MB (excluding media files)
```

### Level 3: Development Experience

```bash
# Start development environment
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Test hot reload (make a code change)
echo "console.log('test change');" >> backend/src/app.ts

# Expected: Server restarts automatically within 2-3 seconds
# No full container rebuild required
```

### Level 4: Production Deployment

```bash
# Test production build
NODE_ENV=production docker-compose up -d

# Verify health checks
docker-compose ps
# All services should show "healthy" status

# Test media processing capabilities
curl -X POST localhost:3001/api/videos/upload \
  -F "video=@test.mp4" \
  -F "category=family"

# Expected: Video processes successfully with ffmpeg and yt-dlp available
```

### Level 5: Security Validation

```bash
# Verify non-root execution
docker exec -it sofathek-backend whoami
# Expected: "sofathek" (not "root")

# Check for unnecessary packages
docker exec -it sofathek-backend apk list
# Should only show essential packages, no build tools

# Verify file permissions
docker exec -it sofathek-backend ls -la /app
# Files should be owned by sofathek:sofathek
```

## Known Gotchas & Best Practices

### Layer Caching Optimization

```dockerfile
# ✅ GOOD: Separate layers for different change frequencies
COPY package*.json ./           # Changes rarely
RUN npm ci --only=production    # Cached when package.json unchanged
COPY backend/ ./backend/        # Changes frequently, separate layer

# ❌ BAD: Everything in one layer
COPY . .                        # Any change invalidates entire layer
RUN npm install
```

### Node Modules Handling

```dockerfile
# ✅ GOOD: Production-only dependencies in final stage
FROM base AS deps
RUN npm ci --only=production --no-audit

FROM base AS production
COPY --from=deps /app/node_modules ./node_modules

# ❌ BAD: Development dependencies in production
RUN npm install  # Includes devDependencies, larger image
```

### Security Best Practices

```dockerfile
# ✅ GOOD: Non-root user with proper ownership
RUN adduser -S sofathek -u 1001
COPY --chown=sofathek:sofathek . .
USER sofathek

# ❌ BAD: Running as root
USER root  # Unnecessary privileges, security risk
```

### Development Volume Mounts

```yaml
# ✅ GOOD: Cached mounts for performance
volumes:
  - "./backend:/app/backend:cached"
  - "node-modules:/app/node_modules"  # Named volume for performance

# ❌ BAD: Bind mount node_modules (slow)
volumes:
  - "./backend:/app/backend"
  - "./node_modules:/app/node_modules"  # Slow on macOS/Windows
```

## Success Metrics

**Build Performance**:

- Clean builds complete in < 3 minutes
- Incremental builds complete in < 30 seconds
- Layer cache hit rate > 80%

**Image Optimization**:

- Production image < 200MB (excluding media)
- Development image < 300MB
- No unnecessary dependencies in production

**Development Experience**:

- Hot reload responds in < 3 seconds
- Debug port accessible for IDE integration
- Source maps work correctly

**Production Readiness**:

- Health checks pass consistently
- Non-root execution verified
- Security scanning shows no high/critical issues

**Media Processing**:

- ffmpeg and yt-dlp functional after optimization
- Video processing maintains performance
- No regression in media capabilities

## Time Estimate

**Total Implementation Time**: 3-4 hours

- Multi-stage Dockerfile: 1 hour
- Docker Compose optimization: 1 hour
- Development configuration: 1 hour
- Testing and validation: 1-2 hours

**Confidence Level**: High - Standard Docker optimization practices

---

## Anti-Patterns to Avoid

❌ **Over-Optimization**: Don't sacrifice maintainability for marginal performance gains
❌ **Environment Inconsistency**: Don't create dev/prod environments that behave differently
❌ **Security Shortcuts**: Don't run as root or skip user creation for convenience  
❌ **Cache Busting**: Don't structure Dockerfile layers that invalidate caches frequently
❌ **Volume Confusion**: Don't bind mount node_modules in development (performance killer)

## Remember

This optimization maintains 100% of SOFATHEK's existing functionality while dramatically improving build performance, security posture, and deployment flexibility. The multi-stage approach ensures lean production images while preserving rich development capabilities.

**Same functionality, optimized foundation.**
