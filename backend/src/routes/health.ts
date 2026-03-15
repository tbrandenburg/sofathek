import { Router, Request, Response } from 'express';
import os from 'os';
import { config } from '../config';
import { catchAsync } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { getMemoryInfo, getVideosDirectory, getTempDirectory, getLogsDirectory, getDirectoryHealth, getVideoServiceHealth } from './health/probes';
import { performHealthChecks, determineOverallStatus } from './health/aggregator';
import { HealthStatus } from './health/types';

const router = Router();

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
    version: config.nodeEnv === 'development' ? '1.0.0' : (process.env.npm_package_version || '1.0.0'),
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

export default router;
