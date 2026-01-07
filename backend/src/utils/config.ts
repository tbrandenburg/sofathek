import { AppConfig } from '../types/index.js';

declare const process: any;

export const config: AppConfig = {
  port: 3001,
  nodeEnv: 'development',
  corsOrigin: 'http://localhost:3000',
  jwtSecret: 'fallback-secret-change-in-production',
  jwtExpiresIn: '7d',
};

// Runtime configuration loader
export function loadConfig(): AppConfig {
  return {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: (process.env.NODE_ENV as AppConfig['nodeEnv']) || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    jwtSecret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  };
}