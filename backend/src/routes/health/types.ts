export interface DirectoryDiskSpace {
  total: number;
  free: number;
  used: number;
  usagePercent: number;
  status: 'ok' | 'warning' | 'critical';
}

export interface DirectoryHealth {
  path: string;
  exists: boolean;
  writable: boolean;
  diskSpace?: DirectoryDiskSpace;
}

export interface VideoServiceHealth {
  status: 'ok' | 'error';
  lastScan?: string;
  videoCount?: number;
  error?: string;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: any;
}

export interface HealthStatus {
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
    videosDirectory: DirectoryHealth;
    tempDirectory: DirectoryHealth;
    logsDirectory: DirectoryHealth;
  };
  services: {
    videoService: VideoServiceHealth;
  };
  checks: HealthCheck[];
}
