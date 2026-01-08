# ================================
# Multi-stage Dockerfile for Sofathek Backend
# Optimized for production deployment
# ================================

# ================================
# Stage 1: Development Dependencies
# ================================
FROM node:20-alpine AS base
WORKDIR /app

# Install system dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    ffmpeg \
    curl \
    && ln -sf python3 /usr/bin/python

# Install yt-dlp for YouTube downloading
RUN pip3 install --no-cache-dir yt-dlp

# ================================
# Stage 2: Dependencies Installation
# ================================
FROM base AS dependencies

# Copy package files
COPY backend/package*.json ./
COPY package*.json ../

# Install all dependencies (including dev dependencies)
RUN npm ci --include=dev

# ================================
# Stage 3: Build Stage
# ================================
FROM dependencies AS build

# Copy source code
COPY backend/src ./src
COPY backend/tsconfig.json ./
COPY shared ../shared

# Build the TypeScript application
RUN npm run build

# ================================
# Stage 4: Production Dependencies
# ================================
FROM base AS production-deps

# Copy package files
COPY backend/package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# ================================
# Stage 5: Production Runtime
# ================================
FROM base AS production

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001

# Set working directory and ownership
WORKDIR /app
RUN chown -R backend:nodejs /app
USER backend

# Copy production dependencies
COPY --from=production-deps --chown=backend:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=build --chown=backend:nodejs /app/dist ./dist

# Copy package.json for runtime
COPY --chown=backend:nodejs backend/package*.json ./

# Create necessary directories
RUN mkdir -p data logs media temp && \
    chown -R backend:nodejs data logs media temp

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3001}/api/health || exit 1

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "dist/server.js"]