import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Custom error class with HTTP status code
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Development error response with full stack trace
 */
interface DevErrorResponse {
  status: 'error';
  error: {
    message: string;
    statusCode: number;
    stack: string | undefined;
    isOperational: boolean;
  };
}

/**
 * Production error response without sensitive information
 */
interface ProdErrorResponse {
  status: 'error';
  message: string;
}

/**
 * Send error response in development mode
 */
const sendDevError = (err: AppError, res: Response): void => {
  const response: DevErrorResponse = {
    status: 'error',
    error: {
      message: err.message,
      statusCode: err.statusCode,
      stack: err.stack,
      isOperational: err.isOperational,
    },
  };

  res.status(err.statusCode).json(response);
};

/**
 * Send error response in production mode
 */
const sendProdError = (err: AppError, res: Response): void => {
  // Only send operational errors to client in production
  if (err.isOperational) {
    const response: ProdErrorResponse = {
      status: 'error',
      message: err.message,
    };
    res.status(err.statusCode).json(response);
  } else {
    // Don't leak error details for non-operational errors
    logger.error('Non-operational error occurred', {
      message: err.message,
      stack: err.stack,
    });

    const response: ProdErrorResponse = {
      status: 'error',
      message: 'Something went wrong!',
    };
    res.status(500).json(response);
  }
};

/**
 * Global error handling middleware for Express
 * Must have exactly 4 parameters to be recognized as error middleware
 */
export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Convert error to AppError if it isn't already
  let appError: AppError;
  if (err instanceof AppError) {
    appError = err;
  } else {
    appError = new AppError(err.message || 'Internal Server Error', 500, false);
  }

  // Log all errors
  logger.error('Error occurred', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    message: appError.message,
    statusCode: appError.statusCode,
    stack: appError.stack,
    isOperational: appError.isOperational,
  });

  // Send appropriate error response based on environment
  if (process.env.NODE_ENV === 'development') {
    sendDevError(appError, res);
  } else {
    sendProdError(appError, res);
  }
};

/**
 * Middleware to handle 404 errors for unmatched routes
 */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  const err = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(err);
};

/**
 * Async error wrapper to catch errors in async route handlers
 */
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};