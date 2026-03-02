# Sofathek System Maintenance & Monitoring

Comprehensive guide for monitoring, maintaining, and troubleshooting your Sofathek family media center in production.

## Table of Contents

- [Health Monitoring](#health-monitoring)
- [Log Analysis](#log-analysis)
- [Performance Monitoring](#performance-monitoring)
- [Backup Procedures](#backup-procedures)
- [Common Issues & Solutions](#common-issues--solutions)
- [Preventive Maintenance](#preventive-maintenance)
- [Security Maintenance](#security-maintenance)
- [Emergency Procedures](#emergency-procedures)

---

## Health Monitoring

### Using the Built-in Health Endpoint

Sofathek includes a comprehensive health monitoring system accessible at `/health`.

#### Basic Health Check

```bash
# Quick health status
curl -s http://localhost:3010/health | jq -r '.status'

# Full health report
curl -s http://localhost:3010/health | jq '.'

# Check specific components
curl -s http://localhost:3010/health | jq '.system.memory'
curl -s http://localhost:3010/health | jq '.storage.videosDirectory'
curl -s http://localhost:3010/health | jq '.services.videoService'
```

#### Health Status Meanings

| Status | Description | Action Required |
|--------|-------------|-----------------|
| `healthy` | All systems operational | None |
| `warning` | Some issues detected | Monitor closely |
| `critical` | Service degradation | Immediate attention |

#### Interpreting Health Check Results

**System Information:**
```json
{
  "system": {
    "memory": {
      "usagePercent": 65,     // < 80% good, < 90% warning, > 90% critical
      "total": 8589934592,
      "free": 3012477952,
      "used": 5577456640
    },
    "cpu": {
      "loadAverage": [0.5, 0.7, 0.8]  // 1min, 5min, 15min averages
    },
    "uptime": 86400           // Seconds since startup
  }
}
```

**Storage Health:**
```json
{
  "storage": {
    "videosDirectory": {
      "exists": true,
      "writable": true,
      "diskSpace": {
        "usagePercent": 75,   // < 90% ok, < 95% warning, > 95% critical
        "status": "ok",       // ok | warning | critical
        "total": 1000000000000,
        "free": 250000000000
      }
    }
  }
}
```

### Automated Health Monitoring

#### Create Health Monitor Script

Create `/opt/sofathek/scripts/health-monitor.sh`:

```bash
#!/bin/bash

# Sofathek Health Monitoring Script
HEALTH_URL="http://localhost:3010/health"
LOG_FILE="/opt/sofathek/data/logs/health-monitor.log"
ALERT_LOG="/opt/sofathek/data/logs/alerts.log"
WEBHOOK_URL=""  # Optional: Slack/Discord webhook for alerts

# Configuration
MEMORY_WARNING_THRESHOLD=80
MEMORY_CRITICAL_THRESHOLD=90
DISK_WARNING_THRESHOLD=85
DISK_CRITICAL_THRESHOLD=95

# Function to log with timestamp
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to send alert (webhook optional)
send_alert() {
    local level="$1"
    local message="$2"
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ALERT [$level] $message" | tee -a "$ALERT_LOG"
    
    # Optional webhook notification
    if [ -n "$WEBHOOK_URL" ]; then
        curl -X POST "$WEBHOOK_URL" \
             -H "Content-Type: application/json" \
             -d "{\"text\":\"🚨 Sofathek Alert [$level]: $message\"}" \
             --silent --output /dev/null
    fi
}

# Get health status
HEALTH_RESPONSE=$(curl -s --max-time 10 "$HEALTH_URL" 2>/dev/null)
CURL_EXIT=$?

if [ $CURL_EXIT -ne 0 ] || [ -z "$HEALTH_RESPONSE" ]; then
    send_alert "CRITICAL" "Health endpoint unreachable (curl exit code: $CURL_EXIT)"
    exit 1
fi

# Parse health data
OVERALL_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.status // "unknown"')
MEMORY_USAGE=$(echo "$HEALTH_RESPONSE" | jq -r '.system.memory.usagePercent // 0')
VIDEO_DISK_USAGE=$(echo "$HEALTH_RESPONSE" | jq -r '.storage.videosDirectory.diskSpace.usagePercent // 0')
VIDEO_COUNT=$(echo "$HEALTH_RESPONSE" | jq -r '.services.videoService.videoCount // 0')
UPTIME=$(echo "$HEALTH_RESPONSE" | jq -r '.uptime // 0')

# Check overall status
if [ "$OVERALL_STATUS" = "critical" ]; then
    send_alert "CRITICAL" "System status is CRITICAL"
elif [ "$OVERALL_STATUS" = "warning" ]; then
    send_alert "WARNING" "System status is WARNING"
fi

# Check memory usage
if [ "$MEMORY_USAGE" -ge "$MEMORY_CRITICAL_THRESHOLD" ]; then
    send_alert "CRITICAL" "Memory usage critical: ${MEMORY_USAGE}%"
elif [ "$MEMORY_USAGE" -ge "$MEMORY_WARNING_THRESHOLD" ]; then
    send_alert "WARNING" "Memory usage high: ${MEMORY_USAGE}%"
fi

# Check disk usage
if [ "$VIDEO_DISK_USAGE" -ge "$DISK_CRITICAL_THRESHOLD" ]; then
    send_alert "CRITICAL" "Video disk usage critical: ${VIDEO_DISK_USAGE}%"
elif [ "$VIDEO_DISK_USAGE" -ge "$DISK_WARNING_THRESHOLD" ]; then
    send_alert "WARNING" "Video disk usage high: ${VIDEO_DISK_USAGE}%"
fi

# Log normal status
log_message "Health check completed - Status: $OVERALL_STATUS, Memory: ${MEMORY_USAGE}%, Disk: ${VIDEO_DISK_USAGE}%, Videos: $VIDEO_COUNT, Uptime: ${UPTIME}s"
```

#### Schedule Health Monitoring

```bash
# Make script executable
chmod +x /opt/sofathek/scripts/health-monitor.sh

# Add to crontab for every 5 minutes
crontab -e
# Add line:
*/5 * * * * /opt/sofathek/scripts/health-monitor.sh

# Add hourly summary
0 * * * * /opt/sofathek/scripts/health-monitor.sh | grep "Health check completed" | tail -1
```

---

## Log Analysis

### Log Locations

| Component | Location | Purpose |
|-----------|----------|---------|
| Application | `/opt/sofathek/data/logs/combined.log` | All application events |
| Errors | `/opt/sofathek/data/logs/error.log` | Error events only |
| Health Monitor | `/opt/sofathek/data/logs/health-monitor.log` | Health check results |
| Alerts | `/opt/sofathek/data/logs/alerts.log` | System alerts |
| Docker Backend | `docker compose logs backend` | Container output |
| Docker Frontend | `docker compose logs frontend` | Container output |

### Log Analysis Commands

#### Recent Activity

```bash
# Last 100 lines of application logs
tail -100 /opt/sofathek/data/logs/combined.log

# Follow logs in real-time
tail -f /opt/sofathek/data/logs/combined.log

# Show only errors from last hour
journalctl --since "1 hour ago" | grep ERROR

# Docker container logs
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
```

#### Error Analysis

```bash
# Find all errors in the last 24 hours
grep "$(date -d '1 day ago' '+%Y-%m-%d')" /opt/sofathek/data/logs/error.log

# Count error types
grep -o '"level":"error".*"message":"[^"]*"' /opt/sofathek/data/logs/error.log | \
  cut -d'"' -f8 | sort | uniq -c | sort -nr

# Find failed video downloads
grep -i "download.*failed\|youtube.*error" /opt/sofathek/data/logs/combined.log

# Memory-related issues
grep -i "memory\|out of memory\|heap" /opt/sofathek/data/logs/combined.log
```

#### Performance Analysis

```bash
# Response time analysis
grep "response.*time" /opt/sofathek/data/logs/combined.log | \
  grep -o '[0-9]\+ms' | sort -n | tail -10

# Database/file operation timing
grep -E "(scan.*directory|video.*service)" /opt/sofathek/data/logs/combined.log

# Health check performance
grep "Health check completed" /opt/sofathek/data/logs/health-monitor.log | \
  tail -20 | awk '{print $6, $8, $10}'
```

### Log Rotation Configuration

#### Automatic Log Rotation

Create `/etc/logrotate.d/sofathek`:

```
/opt/sofathek/data/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    copytruncate
    create 644 1001 1001
}
```

#### Manual Log Management

```bash
# Compress old logs
find /opt/sofathek/data/logs -name "*.log" -size +100M -exec gzip {} \;

# Clean logs older than 30 days
find /opt/sofathek/data/logs -name "*.gz" -mtime +30 -delete

# Archive logs by month
mkdir -p /opt/sofathek/data/logs/archive/$(date +%Y-%m)
mv /opt/sofathek/data/logs/*.log.*.gz /opt/sofathek/data/logs/archive/$(date +%Y-%m)/
```

---

## Performance Monitoring

### System Resource Monitoring

#### Real-time Resource Usage

```bash
# Container resource usage
docker stats --no-stream

# System resource usage
htop
# Or
top -p $(pgrep -f "node.*server.js")

# Disk I/O monitoring
iotop -p $(pgrep -f "node.*server.js")

# Memory usage details
cat /proc/$(pgrep -f "node.*server.js")/status | grep -E "VmSize|VmRSS|VmData"
```

#### Performance Metrics Script

Create `/opt/sofathek/scripts/performance-monitor.sh`:

```bash
#!/bin/bash

# Sofathek Performance Monitoring
METRICS_FILE="/opt/sofathek/data/logs/performance.log"

# Get container stats
BACKEND_STATS=$(docker stats sofathek-backend --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}" | tail -1)
FRONTEND_STATS=$(docker stats sofathek-frontend --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | tail -1)

# Get system metrics
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | xargs)
DISK_USAGE=$(df -h /opt/sofathek/data | awk 'NR==2 {print $5}')

# Health endpoint response time
HEALTH_TIME=$(curl -w "@-" -s -o /dev/null http://localhost:3010/health <<< '@{\"response_time\":\"%{time_total}\"}' | jq -r '.response_time')

# Log metrics
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backend: $BACKEND_STATS | Load: $LOAD_AVG | Disk: $DISK_USAGE | Health: ${HEALTH_TIME}s" >> "$METRICS_FILE"
```

### Performance Benchmarking

#### Video Streaming Performance

```bash
# Test video streaming performance
curl -w "@-" http://localhost:3010/api/stream/sample-video.mp4 -r 0-1048576 <<< '
{
  "time_namelookup": "%{time_namelookup}",
  "time_connect": "%{time_connect}",
  "time_appconnect": "%{time_appconnect}",
  "time_pretransfer": "%{time_pretransfer}",
  "time_redirect": "%{time_redirect}",
  "time_starttransfer": "%{time_starttransfer}",
  "time_total": "%{time_total}",
  "speed_download": "%{speed_download}"
}'
```

#### API Response Time Testing

```bash
# Test API endpoints
for endpoint in "/health" "/api/videos" "/api/stream/test.mp4"; do
    echo "Testing $endpoint:"
    curl -w "Time: %{time_total}s, Size: %{size_download} bytes\n" \
         -s -o /dev/null "http://localhost:3010$endpoint"
done
```

---

## Backup Procedures

### Automated Backup System

#### Create Backup Script

Create `/opt/sofathek/scripts/backup.sh`:

```bash
#!/bin/bash

# Sofathek Backup Script
BACKUP_DIR="/backup/sofathek"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directories
mkdir -p "$BACKUP_DIR/daily"
mkdir -p "$BACKUP_DIR/config"
mkdir -p "$BACKUP_DIR/logs"

# Function to log backup events
log_backup() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] BACKUP: $1" | tee -a /opt/sofathek/data/logs/backup.log
}

log_backup "Starting backup process"

# 1. Configuration Backup (daily)
log_backup "Backing up configuration files"
tar -czf "$BACKUP_DIR/config/config-$DATE.tar.gz" \
    -C /opt/sofathek \
    .env docker-compose.yml \
    --warning=no-file-changed 2>/dev/null

# 2. Video Metadata Backup (critical)
log_backup "Backing up video metadata"
find /opt/sofathek/data/videos -name "*.json" -type f | \
    tar -czf "$BACKUP_DIR/daily/metadata-$DATE.tar.gz" -T -

# 3. Application Logs Backup (weekly)
if [ "$(date +%u)" = "7" ]; then
    log_backup "Weekly log backup"
    tar -czf "$BACKUP_DIR/logs/logs-$DATE.tar.gz" \
        -C /opt/sofathek/data logs/ \
        --exclude="logs/*.tmp" \
        --warning=no-file-changed 2>/dev/null
fi

# 4. Video Files Backup (conditional - only if backup storage available)
VIDEOS_SIZE=$(du -sb /opt/sofathek/data/videos | cut -f1)
BACKUP_AVAIL=$(df "$BACKUP_DIR" | awk 'NR==2 {print $4 * 1024}')

if [ "$VIDEOS_SIZE" -lt "$BACKUP_AVAIL" ]; then
    log_backup "Backing up video files (incremental)"
    rsync -av --partial --inplace \
          --exclude="*.tmp" \
          --exclude="*.partial" \
          /opt/sofathek/data/videos/ \
          "$BACKUP_DIR/videos/" >> /opt/sofathek/data/logs/backup.log 2>&1
else
    log_backup "Skipping video backup - insufficient space (need: $VIDEOS_SIZE, available: $BACKUP_AVAIL)"
fi

# 5. Database Export (if using database in future)
# pg_dump sofathek > "$BACKUP_DIR/daily/database-$DATE.sql"

# Cleanup old backups
log_backup "Cleaning up old backups"
find "$BACKUP_DIR/daily" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR/config" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR/logs" -name "*.tar.gz" -mtime +90 -delete  # Keep logs longer

# Backup verification
BACKUP_COUNT=$(find "$BACKUP_DIR/daily" -name "*$DATE*" | wc -l)
if [ "$BACKUP_COUNT" -gt 0 ]; then
    log_backup "Backup completed successfully - $BACKUP_COUNT files created"
else
    log_backup "ERROR: Backup may have failed - no files created with today's date"
fi

# Health check after backup
curl -s http://localhost:3010/health > /dev/null && \
    log_backup "Post-backup health check: PASSED" || \
    log_backup "Post-backup health check: FAILED"
```

#### Schedule Backups

```bash
chmod +x /opt/sofathek/scripts/backup.sh

# Add to crontab
crontab -e
# Daily backup at 2 AM
0 2 * * * /opt/sofathek/scripts/backup.sh

# Weekly full backup on Sundays at 1 AM
0 1 * * 0 /opt/sofathek/scripts/backup.sh --full
```

### Backup Verification

#### Create Backup Verification Script

Create `/opt/sofathek/scripts/verify-backup.sh`:

```bash
#!/bin/bash

# Backup Verification Script
BACKUP_DIR="/backup/sofathek"
TEMP_RESTORE="/tmp/sofathek-restore-test"

echo "Verifying latest backups..."

# Verify configuration backup
LATEST_CONFIG=$(ls -t "$BACKUP_DIR/config/"*.tar.gz 2>/dev/null | head -1)
if [ -n "$LATEST_CONFIG" ]; then
    echo "Testing config backup: $LATEST_CONFIG"
    mkdir -p "$TEMP_RESTORE/config"
    tar -tzf "$LATEST_CONFIG" > /dev/null && echo "✓ Config backup verified" || echo "✗ Config backup corrupted"
    rm -rf "$TEMP_RESTORE/config"
fi

# Verify metadata backup
LATEST_METADATA=$(ls -t "$BACKUP_DIR/daily/"metadata-*.tar.gz 2>/dev/null | head -1)
if [ -n "$LATEST_METADATA" ]; then
    echo "Testing metadata backup: $LATEST_METADATA"
    tar -tzf "$LATEST_METADATA" > /dev/null && echo "✓ Metadata backup verified" || echo "✗ Metadata backup corrupted"
fi

# Check backup sizes
echo "Backup sizes:"
du -h "$BACKUP_DIR"/* 2>/dev/null | sort -hr

# Check available backup space
echo "Backup storage:"
df -h "$BACKUP_DIR"
```

---

## Common Issues & Solutions

### Issue 1: High Memory Usage

**Symptoms:**
- Health check shows memory usage > 90%
- Application becomes slow or unresponsive
- Docker containers restarting frequently

**Diagnosis:**
```bash
# Check container memory usage
docker stats --no-stream

# Check health endpoint
curl -s http://localhost:3010/health | jq '.system.memory'

# Check for memory leaks in logs
grep -i "memory\|heap\|out of memory" /opt/sofathek/data/logs/error.log
```

**Solutions:**

1. **Restart containers:**
   ```bash
   docker compose restart
   ```

2. **Adjust memory limits:**
   ```yaml
   # In docker-compose.yml
   services:
     backend:
       deploy:
         resources:
           limits:
             memory: 1G
   ```

3. **Clean up temporary files:**
   ```bash
   rm -rf /opt/sofathek/data/temp/*
   docker system prune -f
   ```

### Issue 2: Disk Space Full

**Symptoms:**
- Health check shows disk usage > 95%
- Video downloads failing
- "No space left on device" errors

**Diagnosis:**
```bash
# Check disk usage
df -h /opt/sofathek/data

# Find large files
du -sh /opt/sofathek/data/* | sort -hr

# Check health endpoint
curl -s http://localhost:3010/health | jq '.storage'
```

**Solutions:**

1. **Clean temporary files:**
   ```bash
   rm -rf /opt/sofathek/data/temp/*
   find /opt/sofathek/data/videos -name "*.tmp" -delete
   find /opt/sofathek/data/videos -name "*.partial" -delete
   ```

2. **Compress old logs:**
   ```bash
   find /opt/sofathek/data/logs -name "*.log" -size +50M -exec gzip {} \;
   ```

3. **Archive or delete old videos:**
   ```bash
   # List videos by size
   find /opt/sofathek/data/videos -name "*.mp4" -exec du -h {} + | sort -hr

   # Move old videos to archive
   mkdir -p /archive/sofathek-videos
   find /opt/sofathek/data/videos -name "*.mp4" -mtime +90 -exec mv {} /archive/sofathek-videos/ \;
   ```

### Issue 3: Video Downloads Failing

**Symptoms:**
- YouTube downloads return errors
- Videos stuck in "processing" state
- Download queue not processing

**Diagnosis:**
```bash
# Check backend logs for download errors
docker compose logs backend | grep -i "youtube\|download\|yt-dlp"

# Test yt-dlp manually
docker compose exec backend yt-dlp --version
docker compose exec backend yt-dlp "https://www.youtube.com/watch?v=test"

# Check temp directory permissions
ls -la /opt/sofathek/data/temp/
```

**Solutions:**

1. **Update yt-dlp:**
   ```bash
   docker compose exec backend pip3 install --upgrade yt-dlp
   docker compose restart backend
   ```

2. **Clear download queue:**
   ```bash
   rm -rf /opt/sofathek/data/temp/*
   docker compose restart backend
   ```

3. **Check network connectivity:**
   ```bash
   docker compose exec backend curl -I https://www.youtube.com/
   ```

### Issue 4: Frontend Not Loading

**Symptoms:**
- Browser shows connection refused
- Frontend container not starting
- 502/503 errors from reverse proxy

**Diagnosis:**
```bash
# Check container status
docker compose ps

# Check frontend logs
docker compose logs frontend

# Test frontend connectivity
curl http://localhost:5183
```

**Solutions:**

1. **Restart frontend service:**
   ```bash
   docker compose restart frontend
   ```

2. **Check port conflicts:**
   ```bash
   netstat -tulpn | grep 5183
   ```

3. **Rebuild frontend container:**
   ```bash
   docker compose build frontend
   docker compose up -d frontend
   ```

### Issue 5: Health Check Endpoint Unreachable

**Symptoms:**
- Health monitor alerts about unreachable endpoint
- Health URL returns timeout or connection refused

**Diagnosis:**
```bash
# Check backend service
docker compose ps backend

# Check backend logs
docker compose logs backend

# Test direct connection
curl -v http://localhost:3010/health
```

**Solutions:**

1. **Restart backend service:**
   ```bash
   docker compose restart backend
   ```

2. **Check container networking:**
   ```bash
   docker network inspect sofathek_sofathek_network
   ```

3. **Verify port binding:**
   ```bash
   docker port sofathek-backend
   ```

---

## Preventive Maintenance

### Weekly Maintenance Tasks

Create `/opt/sofathek/scripts/weekly-maintenance.sh`:

```bash
#!/bin/bash

# Weekly Maintenance Script
echo "Starting weekly maintenance - $(date)"

# 1. Clean temporary files
echo "Cleaning temporary files..."
find /opt/sofathek/data/temp -type f -mtime +7 -delete
find /opt/sofathek/data/temp -type d -empty -delete

# 2. Rotate and compress logs
echo "Managing log files..."
find /opt/sofathek/data/logs -name "*.log" -size +100M -exec gzip {} \;
find /opt/sofathek/data/logs -name "*.gz" -mtime +30 -delete

# 3. Docker cleanup
echo "Cleaning Docker resources..."
docker container prune -f
docker image prune -f
docker volume prune -f

# 4. System updates (optional - be careful in production)
# echo "Checking for system updates..."
# apt list --upgradable

# 5. Health check verification
echo "Verifying system health..."
HEALTH_STATUS=$(curl -s http://localhost:3010/health | jq -r '.status')
echo "Current health status: $HEALTH_STATUS"

if [ "$HEALTH_STATUS" != "healthy" ]; then
    echo "WARNING: System health is $HEALTH_STATUS"
    curl -s http://localhost:3010/health | jq '.checks[] | select(.status != "pass")'
fi

# 6. Backup verification
echo "Verifying recent backups..."
/opt/sofathek/scripts/verify-backup.sh

# 7. Performance report
echo "Performance summary:"
docker stats --no-stream | grep sofathek

echo "Weekly maintenance completed - $(date)"
```

### Monthly Maintenance Tasks

1. **Security Updates:**
   ```bash
   # Update base system
   sudo apt update && sudo apt upgrade -y
   
   # Update Docker images
   cd /opt/sofathek
   docker compose pull
   docker compose up -d
   ```

2. **Capacity Planning:**
   ```bash
   # Analyze storage trends
   du -sh /opt/sofathek/data/videos/* | sort -hr | head -20
   
   # Check growth rate
   find /opt/sofathek/data/videos -type f -newermt "30 days ago" | wc -l
   ```

3. **Configuration Review:**
   ```bash
   # Review environment variables
   grep -v "^#\|^$" /opt/sofathek/.env
   
   # Check for configuration changes
   git diff HEAD~1 docker-compose.yml .env
   ```

---

## Security Maintenance

### Security Checklist

#### Monthly Security Tasks

1. **Update Dependencies:**
   ```bash
   # Check for security updates
   docker compose exec backend npm audit
   docker compose exec backend npm audit fix
   
   # Update Docker images
   docker compose pull
   docker compose up -d
   ```

2. **Review Access Logs:**
   ```bash
   # Check for unusual access patterns
   grep -E "(4[0-9]{2}|5[0-9]{2})" /var/log/nginx/access.log | tail -20
   
   # Check failed health checks
   grep "Health.*failed" /opt/sofathek/data/logs/alerts.log
   ```

3. **Verify File Permissions:**
   ```bash
   # Check critical file permissions
   ls -la /opt/sofathek/.env
   ls -la /opt/sofathek/data/
   
   # Fix permissions if needed
   chmod 600 /opt/sofathek/.env
   chmod 755 /opt/sofathek/data/
   ```

#### Security Monitoring

Create `/opt/sofathek/scripts/security-check.sh`:

```bash
#!/bin/bash

# Security Check Script
SECURITY_LOG="/opt/sofathek/data/logs/security.log"

log_security() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] SECURITY: $1" | tee -a "$SECURITY_LOG"
}

# Check file permissions
ENV_PERMS=$(stat -c "%a" /opt/sofathek/.env)
if [ "$ENV_PERMS" != "600" ]; then
    log_security "WARNING: .env file has insecure permissions: $ENV_PERMS"
fi

# Check for failed login attempts (if using authentication)
FAILED_AUTH=$(grep -i "auth.*fail\|unauthorized" /opt/sofathek/data/logs/combined.log | wc -l)
if [ "$FAILED_AUTH" -gt 10 ]; then
    log_security "WARNING: $FAILED_AUTH failed authentication attempts detected"
fi

# Check Docker daemon security
DOCKER_SOCKET_PERMS=$(stat -c "%a" /var/run/docker.sock 2>/dev/null || echo "N/A")
log_security "Docker socket permissions: $DOCKER_SOCKET_PERMS"

# Check for unusual network connections
CONNECTIONS=$(netstat -tnlp | grep -E "(3010|5183)" | wc -l)
log_security "Active connections on app ports: $CONNECTIONS"

log_security "Security check completed"
```

---

## Emergency Procedures

### Emergency Response Checklist

#### Service Down Emergency

1. **Immediate Assessment:**
   ```bash
   # Check service status
   docker compose ps
   
   # Check health endpoint
   curl http://localhost:3010/health
   
   # Check recent logs
   docker compose logs --tail=50 backend
   ```

2. **Quick Recovery Steps:**
   ```bash
   # Restart all services
   docker compose restart
   
   # If restart fails, force recreate
   docker compose down && docker compose up -d
   
   # Check system resources
   free -h
   df -h /opt/sofathek/data
   ```

3. **Escalation Criteria:**
   - Services don't start after restart
   - Disk space < 5% free
   - Memory usage > 95% consistently
   - Health check fails for > 15 minutes

#### Data Recovery Procedures

1. **Video Library Recovery:**
   ```bash
   # Stop services
   docker compose down
   
   # Restore from backup
   rsync -av /backup/sofathek/videos/ /opt/sofathek/data/videos/
   
   # Restore metadata
   cd /opt/sofathek/data/videos
   tar -xzf /backup/sofathek/daily/metadata-latest.tar.gz
   
   # Restart services
   docker compose up -d
   ```

2. **Configuration Recovery:**
   ```bash
   # Restore configuration
   tar -xzf /backup/sofathek/config/config-latest.tar.gz -C /opt/sofathek/
   
   # Verify configuration
   docker compose config
   
   # Restart with restored config
   docker compose up -d
   ```

### Disaster Recovery Plan

#### Complete System Rebuild

1. **Preparation:**
   - Ensure backups are available
   - Document current system configuration
   - Have deployment documentation ready

2. **Recovery Steps:**
   ```bash
   # 1. Fresh system setup
   # Follow DEPLOYMENT.md prerequisites section
   
   # 2. Restore application
   mkdir -p /opt/sofathek
   cd /opt/sofathek
   
   # 3. Restore configuration
   tar -xzf /backup/sofathek/config/config-latest.tar.gz
   
   # 4. Restore data
   mkdir -p data/{videos,temp,logs}
   rsync -av /backup/sofathek/videos/ data/videos/
   
   # 5. Deploy application
   docker compose up -d
   
   # 6. Verify recovery
   curl http://localhost:3010/health
   ```

3. **Post-Recovery Verification:**
   - Health check returns "healthy"
   - Video library accessible
   - Downloads functioning
   - Monitoring restored

---

## Support Information

### Getting Help

1. **Check Health Status:**
   ```bash
   curl -s http://localhost:3010/health | jq '.'
   ```

2. **Collect Diagnostic Information:**
   ```bash
   # Create diagnostic bundle
   mkdir -p /tmp/sofathek-diagnostics
   
   # System info
   uname -a > /tmp/sofathek-diagnostics/system-info.txt
   docker version >> /tmp/sofathek-diagnostics/system-info.txt
   
   # Health check
   curl -s http://localhost:3010/health > /tmp/sofathek-diagnostics/health.json
   
   # Recent logs
   tail -200 /opt/sofathek/data/logs/combined.log > /tmp/sofathek-diagnostics/recent-logs.txt
   docker compose logs --tail=100 > /tmp/sofathek-diagnostics/container-logs.txt
   
   # Configuration (sanitized)
   grep -v "SECRET\|KEY\|PASSWORD" /opt/sofathek/.env > /tmp/sofathek-diagnostics/config.txt
   
   # Create archive
   tar -czf sofathek-diagnostics-$(date +%Y%m%d).tar.gz -C /tmp sofathek-diagnostics/
   ```

3. **Contact Channels:**
   - GitHub Issues: Include diagnostic bundle
   - Health check output
   - Clear problem description

### Version Information

- **Maintenance Guide Version:** 1.5.0
- **Last Updated:** March 2, 2026
- **Compatible Versions:** Sofathek 1.5.0+

---

*For deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)*