import 'dotenv/config';
import path from 'path';

export interface Config {
  port: number;
  nodeEnv: string;
  logLevel: string;
  videosDir: string;
  tempDir: string;
  /** @deprecated Alias for videosDir; thumbnails are now stored alongside videos */
  thumbnailsDir: string;
  allowedOrigins: string[];
  thumbnailMaxSize: number;
  thumbnailCacheDuration: number;
  ffmpegPath: string;
  /** Populated from FFPROBE_PATH; not yet consumed by any service */
  ffprobePath: string;
  rateLimitMaxRequests: number;
  rateLimitWindowMs: number;
}

function parseIntOrDefault(value: string | undefined, defaultValue: number): number {
  if (!value) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

function validateDir(dir: string, name: string): void {
  if (!dir || typeof dir !== 'string') {
    throw new Error(`Invalid ${name}: ${dir}`);
  }
}

function parseAllowedOrigins(value: string | undefined): string[] {
  if (!value) {
    const frontendPort = process.env.SOFATHEK_FRONTEND_PORT || '8010';
    return [`http://localhost:${frontendPort}`];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getConfig(): Config {
  const videosDir = process.env.VIDEOS_DIR || process.env.VIDEOS_PATH || path.join(process.cwd(), 'data', 'videos');
  const tempDir = process.env.TEMP_DIR || path.join(process.cwd(), 'data', 'temp');

  return {
    port: parseIntOrDefault(process.env.SOFATHEK_BACKEND_PORT, 3010),
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    videosDir,
    tempDir,
    thumbnailsDir: videosDir,  // Thumbnails stored alongside videos; kept for backward compat
    allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
    thumbnailMaxSize: parseIntOrDefault(process.env.THUMBNAIL_MAX_SIZE, 10 * 1024 * 1024),
    thumbnailCacheDuration: parseIntOrDefault(process.env.THUMBNAIL_CACHE_DURATION, 86400),
    ffmpegPath: process.env.FFMPEG_PATH || '/usr/bin/ffmpeg',
    ffprobePath: process.env.FFPROBE_PATH || '/usr/bin/ffprobe',
    rateLimitMaxRequests: parseIntOrDefault(process.env.RATE_LIMIT_MAX_REQUESTS, 5),
    rateLimitWindowMs: parseIntOrDefault(process.env.RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000), // 1 hour
  };
}

export const config = getConfig();

validateDir(config.videosDir, 'VIDEOS_DIR');
validateDir(config.tempDir, 'TEMP_DIR');
// thumbnailsDir now points to videosDir; no separate validation needed
