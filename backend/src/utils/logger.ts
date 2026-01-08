/**
 * Backend Logging System with Winston
 * Professional logging for Sofathek Media Center API
 *
 * Features:
 * - Multiple log levels with rotation
 * - File-based logging with daily rotation
 * - Structured logging with metadata
 * - Performance monitoring
 * - Error tracking and stack traces
 * - Request/response logging
 * - Production-ready configuration
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs-extra';

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  [key: string]: any;
}

export interface ApiLogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext, error?: Error): void;
  critical(message: string, context?: LogContext, error?: Error): void;
  performance(metric: string, value: number, context?: LogContext): void;
  request(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    context?: LogContext
  ): void;
}

class WinstonLogger implements ApiLogger {
  private logger: winston.Logger;
  private logsDirectory: string;

  constructor() {
    // Create logs directory
    this.logsDirectory = path.resolve(process.cwd(), '..', 'logs');
    this.initializeLogsDirectory();

    // Create Winston logger
    this.logger = this.createLogger();

    this.info('Winston logger initialized', {
      logsDirectory: this.logsDirectory,
      environment: process.env.NODE_ENV || 'development',
    });
  }

  /**
   * Initialize logs directory
   */
  private initializeLogsDirectory(): void {
    try {
      fs.ensureDirSync(this.logsDirectory);

      // Create subdirectories
      const subdirs = ['app', 'error', 'access', 'performance'];
      subdirs.forEach(subdir => {
        fs.ensureDirSync(path.join(this.logsDirectory, subdir));
      });
    } catch (error) {
      console.error('Failed to initialize logs directory:', error);
    }
  }

  /**
   * Create Winston logger with transports
   */
  private createLogger(): winston.Logger {
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Custom format for structured logging
    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS',
      }),
      winston.format.errors({ stack: true }),
      winston.format.metadata({
        fillExcept: ['message', 'level', 'timestamp', 'label'],
      }),
      winston.format.json()
    );

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'HH:mm:ss',
      }),
      winston.format.printf(({ timestamp, level, message, metadata }) => {
        const meta =
          metadata && Object.keys(metadata).length > 0
            ? JSON.stringify(metadata, null, 2)
            : '';
        return `${timestamp} [${level}] ${message}${meta ? '\n' + meta : ''}`;
      })
    );

    // Create transports
    const transports: winston.transport[] = [];

    // Console transport for development
    if (isDevelopment) {
      transports.push(
        new winston.transports.Console({
          format: consoleFormat,
          level: 'debug',
        })
      );
    }

    // Application logs with daily rotation
    transports.push(
      new DailyRotateFile({
        filename: path.join(
          this.logsDirectory,
          'app',
          'application-%DATE%.log'
        ),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: logFormat,
        level: 'info',
      })
    );

    // Error logs with daily rotation
    transports.push(
      new DailyRotateFile({
        filename: path.join(this.logsDirectory, 'error', 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        format: logFormat,
        level: 'error',
      })
    );

    // Access logs with daily rotation
    transports.push(
      new DailyRotateFile({
        filename: path.join(this.logsDirectory, 'access', 'access-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '50m',
        maxFiles: '30d',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        level: 'info',
      })
    );

    // Performance logs with daily rotation
    transports.push(
      new DailyRotateFile({
        filename: path.join(
          this.logsDirectory,
          'performance',
          'performance-%DATE%.log'
        ),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '7d',
        format: logFormat,
        level: 'info',
      })
    );

    return winston.createLogger({
      level: isDevelopment ? 'debug' : 'info',
      transports,
      // Handle uncaught exceptions
      exceptionHandlers: [
        new DailyRotateFile({
          filename: path.join(
            this.logsDirectory,
            'error',
            'exceptions-%DATE%.log'
          ),
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          format: logFormat,
        }),
      ],
      // Handle unhandled promise rejections
      rejectionHandlers: [
        new DailyRotateFile({
          filename: path.join(
            this.logsDirectory,
            'error',
            'rejections-%DATE%.log'
          ),
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          format: logFormat,
        }),
      ],
    });
  }

  /**
   * Create log metadata
   */
  private createMetadata(context?: LogContext): any {
    return {
      timestamp: new Date().toISOString(),
      pid: process.pid,
      hostname: require('os').hostname(),
      ...(context || {}),
    };
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, this.createMetadata(context));
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(message, this.createMetadata(context));
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, this.createMetadata(context));
  }

  error(message: string, context?: LogContext, error?: Error): void {
    const metadata = this.createMetadata(context);
    if (error) {
      metadata.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    this.logger.error(message, metadata);
  }

  critical(message: string, context?: LogContext, error?: Error): void {
    const metadata = this.createMetadata({ ...context, level: 'CRITICAL' });
    if (error) {
      metadata.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    this.logger.error(`[CRITICAL] ${message}`, metadata);
  }

  performance(metric: string, value: number, context?: LogContext): void {
    this.logger.info(
      `Performance: ${metric} = ${value}ms`,
      this.createMetadata({
        ...context,
        metric,
        value,
        type: 'performance',
      })
    );
  }

  request(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    context?: LogContext
  ): void {
    const level =
      statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    const message = `${method} ${url} ${statusCode} - ${responseTime}ms`;

    this.logger[level](
      message,
      this.createMetadata({
        ...context,
        method,
        url,
        statusCode,
        responseTime,
        type: 'request',
      })
    );
  }

  /**
   * Get logger instance for custom use
   */
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }

  /**
   * Create child logger with persistent context
   */
  child(context: LogContext): ApiLogger {
    const childLogger = new WinstonLogger();
    const originalCreateMetadata = childLogger.createMetadata.bind(childLogger);

    childLogger.createMetadata = (additionalContext?: LogContext) => {
      return originalCreateMetadata({ ...context, ...additionalContext });
    };

    return childLogger;
  }
}

// Create and export global logger instance
const logger = new WinstonLogger();

export default logger;
export { WinstonLogger };

// Legacy compatibility
export const apiLogger = (
  message: string,
  level: 'debug' | 'info' | 'warn' | 'error' = 'info',
  context?: LogContext
): void => {
  logger[level](message, context);
};
