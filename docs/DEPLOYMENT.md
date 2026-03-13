# Sofathek Production Deployment Guide

Complete guide for deploying Sofathek family media center in production environments using Docker.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Deploy with Docker Compose](#quick-deploy-with-docker-compose)
- [Manual Docker Deployment](#manual-docker-deployment)
- [Environment Configuration](#environment-configuration)
- [Storage Setup](#storage-setup)
- [Network Configuration](#network-configuration)
- [SSL/HTTPS Setup](#ssl-https-setup)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Backup & Maintenance](#backup--maintenance)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+, CentOS 8+, etc.), macOS, or Windows with Docker
- **Docker**: Version 20.10+ with Docker Compose v2.0+
- **RAM**: Minimum 2GB, Recommended 4GB+ for smooth operation
- **Storage**: 20GB+ free space for application + media storage
- **Network**: Internet access for Docker image downloads and YouTube integration

### Installation Commands

**Ubuntu/Debian:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

**CentOS/RHEL:**
```bash
# Install Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER
```

---

## Quick Deploy with Docker Compose

### 1. Download Release

```bash
# Create application directory
mkdir -p /opt/sofathek
cd /opt/sofathek

# Download latest release
curl -L https://github.com/your-org/sofathek/archive/refs/tags/v1.5.0.tar.gz | tar -xz --strip-components=1

# Or clone repository
git clone https://github.com/your-org/sofathek.git .
git checkout v1.5.0
```

### 2. Configure Environment

```bash
# Create environment file
cp .env.example .env

# Edit configuration
nano .env
```

**Required Environment Variables:**
```env
# Application Settings
NODE_ENV=production
PORT=3010
FRONTEND_PORT=5183

# Storage Paths (absolute paths recommended)
VIDEOS_DIR=/opt/sofathek/data/videos
TEMP_DIR=/opt/sofathek/data/temp
LOGS_DIR=/opt/sofathek/data/logs

# Security (change these!)
SESSION_SECRET=your-secure-random-secret-here
API_KEY=your-api-key-here

# YouTube-DL Settings
YOUTUBE_DL_FORMAT=bestvideo[height<=720]+bestaudio/best[height<=720]
MAX_DOWNLOAD_SIZE=2147483648  # 2GB in bytes

# Logging
LOG_LEVEL=info
```

### Video Storage Configuration

The video storage directory can be customized using environment variables:

| Variable     | Default                    | Description                          |
|--------------|----------------------------|--------------------------------------|
| `VIDEOS_DIR` | `/opt/sofathek/data/videos`| Production video storage path        |
| `VIDEOS_PATH`| (development default)      | Alternative env var, takes precedence in dev |
| `TEMP_DIR`   | `/opt/sofathek/data/temp`   | Temporary download storage            |

**Docker Example:**

```bash
docker run -d \
  -e VIDEOS_DIR=/custom/videos \
  -v /host/videos:/custom/videos:rw \
  sofathek/backend
```

**Volume Backup:**

```bash
# Using named volumes
docker run --rm -v sofathek_videos:/data -v $(pwd)/backup:/backup alpine tar czf backup/videos.tar.gz -C /data .
```

### 3. Deploy Application

```bash
# Create required directories
mkdir -p data/{videos,temp,logs}

# Set proper permissions
chmod 755 data/
chmod 755 data/{videos,temp,logs}

# Start services
docker compose up -d

# Check status
docker compose ps
docker compose logs -f
```

### 4. Verify Deployment

```bash
# Test health endpoint
curl http://localhost:3010/health

# Test frontend
curl http://localhost:5183

# Check logs
docker compose logs backend
docker compose logs frontend
```

---

## Manual Docker Deployment

### 1. Pull Docker Images

```bash
# Backend
docker pull sofathek/sofathek-backend:v1.5.0

# Frontend
docker pull sofathek/sofathek-frontend:v1.5.0
```

### 2. Create Network

```bash
docker network create sofathek-network
```

### 3. Deploy Backend

```bash
docker run -d \
  --name sofathek-backend \
  --network sofathek-network \
  -p 3010:3010 \
  -e NODE_ENV=production \
  -e PORT=3010 \
  -e VIDEOS_DIR=/app/data/videos \
  -e TEMP_DIR=/app/data/temp \
  -v /opt/sofathek/data/videos:/app/data/videos:rw \
  -v /opt/sofathek/data/temp:/app/data/temp:rw \
  -v /opt/sofathek/data/logs:/app/logs:rw \
  --restart unless-stopped \
  sofathek/sofathek-backend:v1.5.0
```

### 4. Deploy Frontend

```bash
docker run -d \
  --name sofathek-frontend \
  --network sofathek-network \
  -p 5183:5183 \
  --restart unless-stopped \
  sofathek/sofathek-frontend:v1.5.0
```

---

## Environment Configuration

### Production Environment Variables

Create `/opt/sofathek/.env` with the following configuration:

```env
###################
# Application Core
###################
NODE_ENV=production
PORT=3010
FRONTEND_PORT=5183

###################
# Storage Configuration
###################
# Videos directory - where downloaded videos are stored
VIDEOS_DIR=/opt/sofathek/data/videos

# Temporary directory - for download processing
TEMP_DIR=/opt/sofathek/data/temp

# Logs directory - application logs
LOGS_DIR=/opt/sofathek/data/logs

###################
# Security Settings
###################
# Session secret - CHANGE THIS!
SESSION_SECRET=CHANGE-THIS-TO-A-RANDOM-64-CHARACTER-STRING

# API key for administrative functions - CHANGE THIS!
API_KEY=CHANGE-THIS-TO-A-SECURE-API-KEY

###################
# YouTube Download Settings
###################
# Video quality/format preferences
YOUTUBE_DL_FORMAT=bestvideo[height<=720]+bestaudio/best[height<=720]

# Maximum file size (2GB default)
MAX_DOWNLOAD_SIZE=2147483648

# Download timeout in seconds
DOWNLOAD_TIMEOUT=3600

###################
# Performance Settings
###################
# Maximum concurrent downloads
MAX_CONCURRENT_DOWNLOADS=2

# FFmpeg thumbnail generation settings
THUMBNAIL_QUALITY=3
THUMBNAIL_SIZE=320x180

###################
# Logging Configuration
###################
LOG_LEVEL=info
LOG_MAX_FILES=7
LOG_MAX_SIZE=10m

###################
# Network Configuration
###################
# CORS settings (adjust for your domain)
CORS_ORIGIN=http://localhost:5183,http://your-domain.com

# Trust proxy headers (if behind reverse proxy)
TRUST_PROXY=true
```

### Security Best Practices

1. **Change Default Secrets:**
   ```bash
   # Generate secure session secret
   openssl rand -base64 64

   # Generate API key
   openssl rand -hex 32
   ```

2. **File Permissions:**
   ```bash
   # Set secure permissions
   chmod 600 /opt/sofathek/.env
   chmod 755 /opt/sofathek/data
   chmod 755 /opt/sofathek/data/{videos,temp,logs}
   
   # Set ownership
   sudo chown -R 1001:1001 /opt/sofathek/data
   ```

---

## Storage Setup

### Directory Structure

```
/opt/sofathek/
├── docker-compose.yml
├── .env
└── data/
    ├── videos/          # Downloaded videos (persistent)
    ├── temp/            # Temporary download files (can be cleared)
    └── logs/            # Application logs (rotated automatically)
```

### Storage Requirements

- **Videos Directory**: Primary storage for media files
  - Size: Plan for your media collection (100GB-1TB+)
  - Performance: SSD recommended for better streaming performance
  - Backup: Critical data - implement backup strategy

- **Temp Directory**: Temporary processing space
  - Size: 10-20GB (2-3x largest video file expected)
  - Performance: Fast I/O preferred
  - Backup: Not required - can be cleared

- **Logs Directory**: Application logging
  - Size: 1-5GB (auto-rotated)
  - Backup: Optional - useful for troubleshooting

### Volume Mount Options

```yaml
# In docker-compose.yml
volumes:
  # Read-write access for video library
  - /opt/sofathek/data/videos:/app/data/videos:rw
  
  # Temporary processing space
  - /opt/sofathek/data/temp:/app/data/temp:rw
  
  # Log persistence
  - /opt/sofathek/data/logs:/app/logs:rw
  
  # Optional: Custom configuration
  - /opt/sofathek/config:/app/config:ro
```

---

## Network Configuration

### Port Configuration

| Service | Port | Purpose | External Access |
|---------|------|---------|----------------|
| Backend | 3010 | API and video streaming | Required |
| Frontend | 5183 | Web interface | Required |

### Firewall Setup

**UFW (Ubuntu):**
```bash
# Allow SSH (if remote)
sudo ufw allow 22

# Allow application ports
sudo ufw allow 3010
sudo ufw allow 5183

# Enable firewall
sudo ufw enable
```

**Firewalld (CentOS):**
```bash
# Allow application ports
sudo firewall-cmd --permanent --add-port=3010/tcp
sudo firewall-cmd --permanent --add-port=5183/tcp
sudo firewall-cmd --reload
```

### Reverse Proxy Setup (Optional)

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Frontend
    location / {
        proxy_pass http://localhost:5183;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:3010;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:3010;
        access_log off;
    }
    
    # Video streaming (with buffering)
    location /api/stream {
        proxy_pass http://localhost:3010;
        proxy_buffering off;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## SSL/HTTPS Setup

### Using Certbot (Let's Encrypt)

1. **Install Certbot:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

2. **Obtain Certificate:**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

3. **Auto-renewal:**
   ```bash
   sudo crontab -e
   # Add line:
   0 12 * * * /usr/bin/certbot renew --quiet
   ```

### Manual SSL Certificate

If using custom certificates, update Nginx:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    
    # ... rest of configuration
}
```

---

## Monitoring & Health Checks

### Built-in Health Endpoint

The application provides comprehensive health monitoring at `/health`:

```bash
# Basic health check
curl http://localhost:3010/health

# Detailed status with jq
curl -s http://localhost:3010/health | jq '.'

# Check specific components
curl -s http://localhost:3010/health | jq '.storage.videosDirectory'
curl -s http://localhost:3010/health | jq '.services.videoService'
```

**Health Check Response:**
```json
{
  "status": "healthy|warning|critical",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "system": {
    "memory": { "usagePercent": 45 },
    "platform": "linux",
    "uptime": 86400
  },
  "storage": {
    "videosDirectory": {
      "exists": true,
      "writable": true,
      "diskSpace": { "usagePercent": 60, "status": "ok" }
    }
  },
  "services": {
    "videoService": { "status": "ok", "videoCount": 42 }
  }
}
```

### Docker Health Checks

Docker containers include built-in health checks:

```bash
# Check container health
docker ps
docker inspect sofathek-backend --format='{{.State.Health.Status}}'

# View health check logs
docker inspect sofathek-backend | jq '.[0].State.Health.Log'
```

### Monitoring Script

Create `/opt/sofathek/monitor.sh`:

```bash
#!/bin/bash

# Sofathek Health Monitor
LOG_FILE="/opt/sofathek/data/logs/monitor.log"
WEBHOOK_URL=""  # Optional: Slack/Discord webhook

echo "$(date): Starting Sofathek health check" >> $LOG_FILE

# Check health endpoint
HEALTH=$(curl -s -w "%{http_code}" http://localhost:3010/health -o /tmp/health.json)
HTTP_CODE="${HEALTH: -3}"

if [ "$HTTP_CODE" = "200" ]; then
    STATUS=$(jq -r '.status' /tmp/health.json)
    echo "$(date): Health check passed - Status: $STATUS" >> $LOG_FILE
    
    if [ "$STATUS" != "healthy" ]; then
        echo "$(date): WARNING - Application status: $STATUS" >> $LOG_FILE
        # Optional: Send webhook notification
    fi
else
    echo "$(date): ERROR - Health check failed with HTTP $HTTP_CODE" >> $LOG_FILE
    # Optional: Send alert notification
fi

# Cleanup
rm -f /tmp/health.json
```

**Schedule monitoring:**
```bash
chmod +x /opt/sofathek/monitor.sh
crontab -e
# Add line for every 5 minutes:
*/5 * * * * /opt/sofathek/monitor.sh
```

---

## Backup & Maintenance

### Backup Strategy

1. **Videos Directory (Critical):**
   ```bash
   # Daily backup script
   rsync -avz /opt/sofathek/data/videos/ /backup/sofathek-videos-$(date +%Y%m%d)/
   
   # Or tar backup
   tar -czf /backup/sofathek-videos-$(date +%Y%m%d).tar.gz -C /opt/sofathek/data videos/
   ```

2. **Configuration Backup:**
   ```bash
   # Backup configuration
   cp /opt/sofathek/.env /backup/sofathek-env-$(date +%Y%m%d)
   cp /opt/sofathek/docker-compose.yml /backup/
   ```

3. **Database/Metadata:**
   ```bash
   # Backup video metadata (JSON files in video directories)
   find /opt/sofathek/data/videos -name "*.json" | tar -czf /backup/sofathek-metadata-$(date +%Y%m%d).tar.gz -T -
   ```

### Maintenance Tasks

**Weekly Maintenance Script:**
```bash
#!/bin/bash
# /opt/sofathek/maintenance.sh

echo "Starting Sofathek maintenance - $(date)"

# Clean temporary files
find /opt/sofathek/data/temp -type f -mtime +7 -delete
echo "Cleaned temporary files older than 7 days"

# Rotate logs (if not using Docker log rotation)
find /opt/sofathek/data/logs -name "*.log" -size +100M -exec gzip {} \;
find /opt/sofathek/data/logs -name "*.gz" -mtime +30 -delete
echo "Rotated and cleaned old logs"

# Check disk space
DISK_USAGE=$(df /opt/sofathek/data | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 85 ]; then
    echo "WARNING: Disk usage is ${DISK_USAGE}% - Consider cleanup"
fi

# Docker cleanup
docker container prune -f
docker image prune -f
echo "Cleaned Docker containers and images"

# Update containers (optional - remove if you prefer manual updates)
# cd /opt/sofathek && docker compose pull && docker compose up -d

echo "Maintenance completed - $(date)"
```

**Schedule maintenance:**
```bash
chmod +x /opt/sofathek/maintenance.sh
crontab -e
# Add line for weekly maintenance:
0 2 * * 0 /opt/sofathek/maintenance.sh >> /opt/sofathek/data/logs/maintenance.log 2>&1
```

---

## Troubleshooting

### Common Issues

#### 1. Cannot Connect to Application

**Symptoms:** Browser shows "connection refused" or timeout
**Solution:**
```bash
# Check if containers are running
docker compose ps

# Check container logs
docker compose logs backend
docker compose logs frontend

# Check port binding
netstat -tulpn | grep -E "(3010|5183)"

# Test connectivity
curl http://localhost:3010/health
curl http://localhost:5183
```

#### 2. Video Downloads Failing

**Symptoms:** YouTube downloads return errors
**Solution:**
```bash
# Check backend logs
docker compose logs backend | grep -i youtube

# Update yt-dlp in container
docker compose exec backend pip3 install --upgrade yt-dlp

# Check disk space
df -h /opt/sofathek/data

# Verify temp directory permissions
ls -la /opt/sofathek/data/temp
```

#### 3. High Memory Usage

**Symptoms:** Application becomes slow or unresponsive
**Solution:**
```bash
# Check memory usage
docker stats

# Check health endpoint
curl -s http://localhost:3010/health | jq '.system.memory'

# Restart containers
docker compose restart

# Check for memory leaks in logs
docker compose logs backend | grep -i memory
```

#### 4. Storage Issues

**Symptoms:** "disk full" errors or failed downloads
**Solution:**
```bash
# Check disk usage
df -h /opt/sofathek/data

# Find large files
du -sh /opt/sofathek/data/* | sort -hr

# Clean temp directory
rm -rf /opt/sofathek/data/temp/*

# Check health status
curl -s http://localhost:3010/health | jq '.storage'
```

### Logging and Debugging

#### Enable Debug Logging

```bash
# Edit .env file
echo "LOG_LEVEL=debug" >> /opt/sofathek/.env

# Restart containers
docker compose restart

# View debug logs
docker compose logs -f backend
```

#### Log Locations

- **Application logs:** `/opt/sofathek/data/logs/`
- **Container logs:** `docker compose logs [service]`
- **System logs:** `/var/log/syslog` or `journalctl -u docker`

#### Health Check Details

```bash
# Full health report
curl -s http://localhost:3010/health | jq '.' > health-report.json

# Check specific subsystems
curl -s http://localhost:3010/health | jq '.checks[] | select(.status != "pass")'

# Monitor health over time
while true; do
    echo "$(date): $(curl -s http://localhost:3010/health | jq -r '.status')"
    sleep 30
done
```

### Performance Optimization

#### Container Resource Limits

Add to `docker-compose.yml`:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'
```

#### Nginx Caching (if using reverse proxy)

```nginx
# Add to nginx configuration
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location /api/stream {
    proxy_pass http://localhost:3010;
    proxy_cache_bypass $http_pragma;
    proxy_cache_revalidate on;
}
```

---

## Support and Updates

### Getting Help

1. **Check health endpoint:** `curl http://localhost:3010/health`
2. **Review logs:** `docker compose logs`
3. **Check documentation:** [MAINTENANCE.md](./MAINTENANCE.md)
4. **GitHub Issues:** Report issues with logs and health check output

### Updating Sofathek

```bash
# Backup current installation
cp -r /opt/sofathek /opt/sofathek-backup-$(date +%Y%m%d)

# Download new version
cd /opt/sofathek
git fetch --tags
git checkout v1.6.0  # Replace with desired version

# Update containers
docker compose pull
docker compose up -d

# Verify update
curl http://localhost:3010/health | jq '.version'
```

### Version Information

- **Documentation Version:** 1.5.0
- **Last Updated:** March 2, 2026
- **Compatibility:** Docker 20.10+, Docker Compose v2.0+

---

*For maintenance and troubleshooting procedures, see [MAINTENANCE.md](./MAINTENANCE.md)*