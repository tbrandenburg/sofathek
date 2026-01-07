# Multi-stage Dockerfile for production deployment
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

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

# Production stage
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache dumb-init \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files for production dependencies
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/backend/dist ./backend/dist
COPY --from=build --chown=nodejs:nodejs /app/frontend/dist ./frontend/dist

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Security: run as non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Start the application
CMD ["dumb-init", "node", "backend/dist/server.js"]