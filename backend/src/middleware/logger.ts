import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const userAgent = req.get('User-Agent') || 'Unknown';
  const ip = req.ip || req.connection.remoteAddress || 'Unknown';

  // Log the incoming request
  console.log(`[${timestamp}] ${method} ${url} - ${ip} - ${userAgent}`);

  // Log response details when response finishes
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const contentLength = res.get('Content-Length') || '0';
    
    console.log(
      `[${timestamp}] ${method} ${url} - ${statusCode} - ${contentLength}b - ${duration}ms`
    );
  });

  next();
};

export const apiLogger = (message: string, level: 'info' | 'warn' | 'error' = 'info'): void => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  switch (level) {
    case 'error':
      console.error(logMessage);
      break;
    case 'warn':
      console.warn(logMessage);
      break;
    default:
      console.log(logMessage);
      break;
  }
};