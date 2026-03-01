# Multi-stage Dockerfile for Sofathek Backend
# Pattern: Security-focused with non-root user and minimal footprint

# Builder stage - install dependencies
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies (use install for development, ci for production)
RUN npm install --omit=dev && npm cache clean --force

# Runtime stage - minimal production image
FROM node:18-alpine AS runtime

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
RUN mkdir -p /app/data/videos /app/logs /app/dist && \
    chown -R sofathek:sofathek /app

# Switch to non-root user
USER sofathek

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start application
CMD ["npm", "start"]