import 'dotenv/config';

interface Config {
  port: number;
  nodeEnv: string;
  logLevel: string;
  videosDir: string;
  tempDir: string;
  allowedOrigins: string[];
  thumbnailMaxSize: number;
  thumbnailCacheDuration: number;
}

function getConfig(): Config {
  const requiredVars = ['VIDEOS_DIR', 'TEMP_DIR'];
  const missing = requiredVars.filter((v) => !process.env[v]);

  if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    videosDir: process.env.VIDEOS_DIR || '/path/to/videos',
    tempDir: process.env.TEMP_DIR || '/path/to/temp',
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5183'],
    thumbnailMaxSize: parseInt(process.env.THUMBNAIL_MAX_SIZE || '', 10) || 10 * 1024 * 1024,
    thumbnailCacheDuration: parseInt(process.env.THUMBNAIL_CACHE_DURATION || '', 10) || 86400,
  };
}

export const config = getConfig();
