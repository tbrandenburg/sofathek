# Multi-stage Dockerfile for Sofathek media server with server coexistence safety
FROM node:20-alpine AS base

# Install system dependencies including media processing tools
# SAFETY RULE: Only install what Sofathek needs, don't affect system-wide configs
RUN apk add --no-cache \
    dumb-init \
    ffmpeg \
    python3 \
    py3-pip \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

# Install yt-dlp for YouTube downloads
# SAFETY RULE: Install in isolated user space
RUN pip3 install --no-cache-dir yt-dlp

# Set working directory
WORKDIR /app

# Create media directories with proper permissions
# SAFETY RULE: Ensure media storage is isolated within container
RUN mkdir -p /app/media/videos /app/media/thumbnails /app/media/temp \
    && chown -R nodejs:nodejs /app/media

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Development stage
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 3000 3001
USER nodejs
CMD ["dumb-init", "npm", "run", "dev"]

# Build stage
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# Production stage with media processing capabilities
FROM node:20-alpine AS production

# Install system dependencies including media tools
# SAFETY RULE: Only install required tools for Sofathek functionality
RUN apk add --no-cache \
    dumb-init \
    ffmpeg \
    python3 \
    py3-pip \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

# Install yt-dlp in production
RUN pip3 install --no-cache-dir yt-dlp

WORKDIR /app

# Create media directories with proper permissions
# SAFETY RULE: Media storage isolated within container filesystem
RUN mkdir -p /app/media/videos /app/media/thumbnails /app/media/temp \
    && chown -R nodejs:nodejs /app/media

# Copy package files for production dependencies
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/backend/dist ./backend/dist
COPY --from=build --chown=nodejs:nodejs /app/frontend/dist ./frontend/dist

# Health check - SAFETY RULE: Only check Sofathek's own ports (3001)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Security: run as non-root user - SAFETY RULE: Never run as root
USER nodejs

# SAFETY RULE: Only expose Sofathek's designated ports (3001 for backend)
EXPOSE 3001

# Environment variables for server coexistence safety
ENV NODE_ENV=production
ENV PORT=3001
ENV SOFATHEK_MEDIA_PATH=/app/media
ENV SOFATHEK_TEMP_PATH=/app/media/temp

# Start the application - SAFETY RULE: Use process manager for clean shutdown
CMD ["dumb-init", "node", "backend/dist/server.js"]