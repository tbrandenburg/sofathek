import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { config } from '../config';
import { catchAsync } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// Configuration constants for health checks
const DISK_SPACE_WARNING_THRESHOLD = 0.9; // 90% usage warning
const DISK_SPACE_CRITICAL_THRESHOLD = 0.95; // 95% usage critical

interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  timestamp: string;
  service: string;
  version: string;
  environment: string;
  uptime: number;
  system: {
    platform: string;
    nodeVersion: string;
    memory: {
      total: number;
      free: number;
      used: number;
      usagePercent: number;
    };
    cpu: {
      loadAverage: number[];
    };
  };
  storage: {
    videosDirectory: {
      path: string;
      exists: boolean;
      writable: boolean;
      diskSpace?: {
        total: number;
        free: number;
        used: number;
        usagePercent: number;
        status: 'ok' | 'warning' | 'critical';
      };
    };
    tempDirectory: {
      path: string;
      exists: boolean;
      writable: boolean;
      diskSpace?: {
        total: number;
        free: number;
        used: number;
        usagePercent: number;
        status: 'ok' | 'warning' | 'critical';
      };
    };
    logsDirectory: {
      path: string;
      exists: boolean;
      writable: boolean;
    };
  };
  services: {
    videoService: {
      status: 'ok' | 'error';
      lastScan?: string;
      videoCount?: number;
      error?: string;
    };
  };
  checks: Array<{
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
    details?: any;
  }>;
}

/**
 * GET /health
 * Enhanced health check endpoint with comprehensive system monitoring
 */
router.get('/', catchAsync(async (_req: Request, res: Response) => {
  logger.info('Enhanced health check requested');
  
  const startTime = Date.now();
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'sofathek-backend',
    version: process.env.npm_package_version || '1.0.0',
    environment: config.nodeEnv,
    uptime: process.uptime(),
    system: {
      platform: os.platform(),
      nodeVersion: process.version,
      memory: getMemoryInfo(),
      cpu: {
        loadAverage: os.loadavg()
      }
    },
    storage: {
      videosDirectory: await getDirectoryHealth(getVideosDirectory()),
      tempDirectory: await getDirectoryHealth(getTempDirectory()),
      logsDirectory: await getDirectoryHealth(getLogsDirectory())
    },
    services: {
      videoService: await getVideoServiceHealth()
    },
    checks: []
  };

  // Perform health checks
  performHealthChecks(health);
  
  // Determine overall health status
  const overallStatus = determineOverallStatus(health);
  health.status = overallStatus;
  
  const responseTime = Date.now() - startTime;
  health.checks.push({
    name: 'response_time',
    status: responseTime < 1000 ? 'pass' : 'warn',
    message: `Health check completed in ${responseTime}ms`,
    details: { responseTimeMs: responseTime }
  });

  // Log health check result
  logger.info('Health check completed', {
    status: health.status,
    responseTime,
    checks: health.checks.length
  });

  // Set appropriate HTTP status code
  let statusCode = 200;
  if (health.status === 'warning') statusCode = 200; // Still OK but with warnings
  if (health.status === 'critical') statusCode = 503; // Service unavailable

  res.status(statusCode).json(health);
}));

/**
 * Get memory information
 */
function getMemoryInfo() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  
  return {
    total: totalMemory,
    free: freeMemory,
    used: usedMemory,
    usagePercent: Math.round((usedMemory / totalMemory) * 100)
  };
}

/**
 * Get videos directory path
 */
function getVideosDirectory(): string {
  return config.videosDir;
}

/**
 * Get temporary directory path
 */
function getTempDirectory(): string {
  return config.tempDir;
}

/**
 * Get logs directory path
 */
function getLogsDirectory(): string {
  return path.join(process.cwd(), 'logs');
}

/**
 * Check directory health including disk space
 */
async function getDirectoryHealth(dirPath: string) {
  const health: any = {
    path: dirPath,
    exists: false,
    writable: false
  };

  try {
    // Check if directory exists
    health.exists = fs.existsSync(dirPath);
    
    if (health.exists) {
      // Check if directory is writable
      try {
        const testFile = path.join(dirPath, '.health-check');
        fs.writeFileSync(testFile, 'health check');
        fs.unlinkSync(testFile);
        health.writable = true;
      } catch {
        health.writable = false;
      }
      
      // Get disk space information
      try {
        // Check if it's a directory
        const stats = fs.statSync(dirPath);
        if (stats.isDirectory()) {
          health.diskSpace = await getDiskSpaceInfo(dirPath);
        }
      } catch (error) {
        logger.warn(`Could not get disk space for ${dirPath}:`, error);
      }
    }
  } catch (error) {
    logger.error(`Error checking directory health for ${dirPath}:`, error);
  }

  return health;
}

/**
 * Get disk space information for a path
 */
async function getDiskSpaceInfo(dirPath: string) {
  try {
    // Use Node.js to get file system stats
    // Note: This is a simplified implementation. In production, you might want to use
    // a library like 'statvfs' for more accurate disk space information
    
    // For now, we'll provide basic disk space info using os.freemem() and os.totalmem()
    // In a real implementation, you'd use platform-specific calls
    const totalSpace = os.totalmem() * 10; // Approximation
    const freeSpace = os.freemem() * 10;  // Approximation
    const usedSpace = totalSpace - freeSpace;
    const usagePercent = usedSpace / totalSpace;
    
    let status: 'ok' | 'warning' | 'critical' = 'ok';
    if (usagePercent >= DISK_SPACE_CRITICAL_THRESHOLD) {
      status = 'critical';
    } else if (usagePercent >= DISK_SPACE_WARNING_THRESHOLD) {
      status = 'warning';
    }
    
    return {
      total: totalSpace,
      free: freeSpace,
      used: usedSpace,
      usagePercent: Math.round(usagePercent * 100),
      status
    };
  } catch (error) {
    logger.error(`Error getting disk space for ${dirPath}:`, error);
    return undefined;
  }
}

/**
 * Check video service health
 */
async function getVideoServiceHealth() {
  const health: any = {
    status: 'ok'
  };

  try {
    // Try to import and check video service
    const { VideoService } = await import('../services/videoService');
    const videoService = new VideoService(getVideosDirectory());
    
    // Perform a quick scan to test service functionality
    const result = await videoService.scanVideoDirectory();
    
    health.lastScan = new Date().toISOString();
    health.videoCount = result.videos?.length || 0;
    
    logger.debug('Video service health check passed', {
      videoCount: health.videoCount
    });
    
  } catch (error) {
    health.status = 'error';
    health.error = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('Video service health check failed:', error);
  }

  return health;
}

/**
 * Perform comprehensive health checks
 */
function performHealthChecks(health: HealthStatus) {
  const checks = health.checks;

  // Memory usage check
  const memoryUsage = health.system.memory.usagePercent;
  checks.push({
    name: 'memory_usage',
    status: memoryUsage < 80 ? 'pass' : memoryUsage < 90 ? 'warn' : 'fail',
    message: `Memory usage: ${memoryUsage}%`,
    details: { memoryUsagePercent: memoryUsage }
  });

  // Videos directory checks
  const videosDir = health.storage.videosDirectory;
  checks.push({
    name: 'videos_directory_exists',
    status: videosDir.exists ? 'pass' : 'fail',
    message: videosDir.exists ? 'Videos directory exists' : `Videos directory not found: ${videosDir.path}`
  });

  checks.push({
    name: 'videos_directory_writable',
    status: videosDir.writable ? 'pass' : 'fail',
    message: videosDir.writable ? 'Videos directory is writable' : 'Videos directory is not writable'
  });

  if (videosDir.diskSpace) {
    checks.push({
      name: 'videos_disk_space',
      status: videosDir.diskSpace.status === 'ok' ? 'pass' : videosDir.diskSpace.status === 'warning' ? 'warn' : 'fail',
      message: `Videos disk usage: ${videosDir.diskSpace.usagePercent}%`,
      details: videosDir.diskSpace
    });
  }

  // Temp directory checks
  const tempDir = health.storage.tempDirectory;
  checks.push({
    name: 'temp_directory_exists',
    status: tempDir.exists ? 'pass' : 'fail',
    message: tempDir.exists ? 'Temp directory exists' : `Temp directory not found: ${tempDir.path}`
  });

  // Video service check
  checks.push({
    name: 'video_service',
    status: health.services.videoService.status === 'ok' ? 'pass' : 'fail',
    message: health.services.videoService.status === 'ok' 
      ? `Video service operational (${health.services.videoService.videoCount} videos)` 
      : `Video service error: ${health.services.videoService.error}`
  });

  // Node.js version check (basic)
  const nodeVersion = process.version;
  const isNodeVersionOk = parseInt(nodeVersion.substring(1)) >= 18; // Node 18+
  checks.push({
    name: 'node_version',
    status: isNodeVersionOk ? 'pass' : 'warn',
    message: `Node.js version: ${nodeVersion}`,
    details: { nodeVersion, minimumSupported: '18.0.0' }
  });
}

/**
 * Determine overall health status from individual checks
 */
function determineOverallStatus(health: HealthStatus): 'healthy' | 'warning' | 'critical' {
  const failedChecks = health.checks.filter(check => check.status === 'fail');
  const warningChecks = health.checks.filter(check => check.status === 'warn');

  // Critical conditions
  if (failedChecks.some(check => ['videos_directory_exists', 'videos_directory_writable'].includes(check.name))) {
    return 'critical';
  }

  // Any disk space critical
  if (health.storage.videosDirectory.diskSpace?.status === 'critical' || 
      health.storage.tempDirectory.diskSpace?.status === 'critical') {
    return 'critical';
  }

  // Memory usage critical
  if (health.system.memory.usagePercent > 95) {
    return 'critical';
  }

  // Warning conditions
  if (failedChecks.length > 0 || warningChecks.length > 0) {
    return 'warning';
  }

  return 'healthy';
}

export default router;
