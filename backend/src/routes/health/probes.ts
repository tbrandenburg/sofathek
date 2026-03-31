import fs from 'fs';
import { getErrorMessage } from '../../utils/error';
import os from 'os';
import path from 'path';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { DirectoryDiskSpace, DirectoryHealth, VideoServiceHealth } from './types';

const DISK_SPACE_WARNING_THRESHOLD = 0.9;
const DISK_SPACE_CRITICAL_THRESHOLD = 0.95;

export function getMemoryInfo() {
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

export function getVideosDirectory(): string {
  return config.videosDir;
}

export function getTempDirectory(): string {
  return config.tempDir;
}

export function getLogsDirectory(): string {
  return path.join(process.cwd(), 'logs');
}

export async function getDirectoryHealth(dirPath: string): Promise<DirectoryHealth> {
  const health: DirectoryHealth = {
    path: dirPath,
    exists: false,
    writable: false
  };

  try {
    health.exists = fs.existsSync(dirPath);

    if (health.exists) {
      try {
        const testFile = path.join(dirPath, '.health-check');
        fs.writeFileSync(testFile, 'health check');
        fs.unlinkSync(testFile);
        health.writable = true;
      } catch {
        health.writable = false;
      }

      try {
        const stats = fs.statSync(dirPath);
        if (stats.isDirectory()) {
          const diskSpace = await getDiskSpaceInfo(dirPath);
          if (diskSpace) {
            health.diskSpace = diskSpace;
          }
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

export async function getDiskSpaceInfo(dirPath: string): Promise<DirectoryDiskSpace | undefined> {
  try {
    const stats = fs.statfsSync(dirPath);
    const blockSize = stats.bsize;
    const totalSpace = blockSize * stats.blocks;
    // Use bavail (not bfree) to match what df reports: blocks available to
    // unprivileged processes, excluding root-reserved blocks (~5% on ext4).
    const freeSpace = blockSize * stats.bavail;
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

export async function getVideoServiceHealth(): Promise<VideoServiceHealth> {
  const health: VideoServiceHealth = {
    status: 'ok'
  };

  try {
    const { VideoService } = await import('../../services/videoService');
    // Keep health probe intentionally read-only — auto-regeneration is a maintenance
    // task, not a liveness check. Health probes must return in milliseconds, not
    // trigger expensive FFmpeg thumbnail generation. See: api.ts for the scan path.
    const videoService = new VideoService(getVideosDirectory());
    const result = await videoService.scanVideoDirectory();

    health.lastScan = new Date().toISOString();
    health.videoCount = result.videos?.length || 0;

    logger.debug('Video service health check passed', {
      videoCount: health.videoCount
    });
  } catch (error) {
    health.status = 'error';
    health.error = getErrorMessage(error);

    logger.error('Video service health check failed:', error);
  }

  return health;
}
