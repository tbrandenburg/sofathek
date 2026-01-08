import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const method = req.method;
  const url = req.originalUrl || req.url;
  const userAgent = req.get('User-Agent') || 'Unknown';
  const ip =
    req.ip || (req.connection && req.connection.remoteAddress) || 'Unknown';

  // Log the incoming request
  logger.info('Incoming request', {
    method,
    url,
    ip,
    userAgent,
  });

  // Track performance
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const contentLength = res.get('Content-Length') || '0';

    // Log request completion
    logger.request(method, url, statusCode, duration, {
      ip,
      userAgent,
      contentLength: `${contentLength}b`,
    });

    // Log performance metrics for slow requests
    if (duration > 1000) {
      logger.performance('slow_request', duration, {
        method,
        url,
        statusCode,
        ip,
      });
    }

    // Log errors
    if (statusCode >= 400) {
      logger.error('Request error', {
        method,
        url,
        statusCode,
        duration,
        ip,
        userAgent,
      });
    }
  });

  next();
};

// Export the logger instance for direct use in routes
export { logger };
