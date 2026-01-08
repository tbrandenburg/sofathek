# ================================
# Multi-stage Dockerfile for Sofathek Frontend
# Optimized for production deployment with Nginx
# ================================

# ================================
# Stage 1: Dependencies Installation
# ================================
FROM node:20-alpine AS dependencies

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./
COPY package*.json ../

# Install dependencies
RUN npm ci --include=dev && npm cache clean --force

# ================================
# Stage 2: Build Stage
# ================================
FROM dependencies AS build

# Copy source code
COPY frontend/src ./src
COPY frontend/public ./public
COPY frontend/index.html ./
COPY frontend/vite.config.ts ./
COPY frontend/tsconfig.json ./
COPY frontend/tsconfig.node.json ./
COPY shared ../shared

# Build arguments for production configuration
ARG VITE_API_URL=http://localhost:3001
ARG VITE_APP_NAME="Sofathek Media Center"
ARG VITE_APP_VERSION=1.0.0

# Set build environment variables
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV NODE_ENV=production

# Build the React application
RUN npm run build

# ================================
# Stage 3: Production Runtime with Nginx
# ================================
FROM nginx:alpine AS production

# Copy custom nginx configuration
COPY frontend/nginx.conf /etc/nginx/nginx.conf

# Copy built application from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Create nginx user and set permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

# Switch to nginx user
USER nginx

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]