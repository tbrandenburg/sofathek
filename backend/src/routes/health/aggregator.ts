import { HealthStatus } from './types';

export function performHealthChecks(health: HealthStatus): void {
  const checks = health.checks;

  const memoryUsage = health.system.memory.usagePercent;
  checks.push({
    name: 'memory_usage',
    status: memoryUsage < 80 ? 'pass' : memoryUsage < 90 ? 'warn' : 'fail',
    message: `Memory usage: ${memoryUsage}%`,
    details: { memoryUsagePercent: memoryUsage }
  });

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

  const tempDir = health.storage.tempDirectory;
  checks.push({
    name: 'temp_directory_exists',
    status: tempDir.exists ? 'pass' : 'fail',
    message: tempDir.exists ? 'Temp directory exists' : `Temp directory not found: ${tempDir.path}`
  });

  checks.push({
    name: 'video_service',
    status: health.services.videoService.status === 'ok' ? 'pass' : 'fail',
    message: health.services.videoService.status === 'ok'
      ? `Video service operational (${health.services.videoService.videoCount} videos)`
      : `Video service error: ${health.services.videoService.error}`
  });

  const nodeVersion = process.version;
  const isNodeVersionOk = parseInt(nodeVersion.substring(1), 10) >= 18;
  checks.push({
    name: 'node_version',
    status: isNodeVersionOk ? 'pass' : 'warn',
    message: `Node.js version: ${nodeVersion}`,
    details: { nodeVersion, minimumSupported: '18.0.0' }
  });
}

export function determineOverallStatus(health: HealthStatus): 'healthy' | 'warning' | 'critical' {
  const failedChecks = health.checks.filter(check => check.status === 'fail');
  const warningChecks = health.checks.filter(check => check.status === 'warn');

  if (failedChecks.some(check => ['videos_directory_exists', 'videos_directory_writable'].includes(check.name))) {
    return 'critical';
  }

  if (health.storage.videosDirectory.diskSpace?.status === 'critical' || health.storage.tempDirectory.diskSpace?.status === 'critical') {
    return 'critical';
  }

  if (health.system.memory.usagePercent > 95) {
    return 'critical';
  }

  if (failedChecks.length > 0 || warningChecks.length > 0) {
    return 'warning';
  }

  return 'healthy';
}
