# Multi-stage Dockerfile for Sofathek Backend
# Pattern: Security-focused with non-root user and minimal footprint

# Builder stage - install dependencies
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
COPY scripts ./scripts

# Install dependencies (use install for development, ci for production)
RUN npm install --omit=dev && npm cache clean --force

# Runtime stage - minimal production image
FROM node:20-bookworm-slim AS runtime

# Install system dependencies for YouTube processing
# ffmpeg for thumbnail generation
# curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN addgroup --system --gid 1001 sofathek && \
    adduser --system --uid 1001 --ingroup sofathek sofathek

# Set up application directory
WORKDIR /app

# Copy dependencies from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.runtime ./.runtime

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
