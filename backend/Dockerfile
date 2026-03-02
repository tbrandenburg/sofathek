# Multi-stage Dockerfile for Sofathek Backend
# Pattern: Security-focused with non-root user and minimal footprint

# Builder stage - install dependencies
FROM node:18-alpine AS builder
WORKDIR /app

# Install Python for youtube-dl-exec preinstall check
RUN apk add --no-cache python3 && ln -sf python3 /usr/bin/python

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies (use install for development, ci for production)
RUN npm install --omit=dev && npm cache clean --force

# Runtime stage - minimal production image
FROM node:18-alpine AS runtime

# Install system dependencies for YouTube processing
# python3, py3-pip for yt-dlp
# ffmpeg for thumbnail generation 
# curl for health checks
RUN apk add --no-cache python3 py3-pip ffmpeg curl && \
    pip3 install --no-cache-dir --break-system-packages yt-dlp

# Create non-root user for security
RUN addgroup -g 1001 -S sofathek && \
    adduser -S sofathek -u 1001 -G sofathek

# Set up application directory
WORKDIR /app

# Copy dependencies from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application files
COPY . .

# Create required directories and set permissions
RUN mkdir -p /app/data/videos /app/data/temp /app/logs /app/dist && \
    chown -R sofathek:sofathek /app

# Switch to non-root user
USER sofathek

# Expose port
EXPOSE 3010

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3010/health || exit 1

# Start application
CMD ["npm", "start"]