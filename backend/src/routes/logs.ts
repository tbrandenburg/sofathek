import { Router, Request, Response } from 'express';
import logger from '../utils/logger';

const router = Router();

// Interface for frontend log entries
interface FrontendLogEntry {
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  message: string;
  timestamp: string;
  context?: {
    url?: string;
    userAgent?: string;
    userId?: string;
    sessionId?: string;
    component?: string;
    action?: string;
    error?: {
      name: string;
      message: string;
      stack?: string;
    };
    performance?: {
      metric: string;
      value: number;
      unit: string;
    };
    [key: string]: any;
  };
}

interface LogBatchRequest {
  logs: FrontendLogEntry[];
  clientInfo: {
    userAgent: string;
    url: string;
    timestamp: string;
    sessionId?: string;
    userId?: string;
  };
}

/**
 * POST /api/logs/batch
 * Accept batch of frontend logs and process them through Winston
 */
router.post('/batch', (req: Request, res: Response) => {
  try {
    const { logs, clientInfo }: LogBatchRequest = req.body;

    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({
        error: 'Invalid request format',
        message: 'logs array is required',
      });
    }

    if (logs.length === 0) {
      return res.status(200).json({
        success: true,
        processed: 0,
        message: 'No logs to process',
      });
    }

    // Process each log entry
    let processed = 0;
    for (const log of logs) {
      try {
        // Create enriched context
        const context = {
          source: 'frontend',
          clientInfo,
          ip: req.ip || req.connection.remoteAddress,
          ...log.context,
        };

        // Route to appropriate logger method based on level
        switch (log.level) {
          case 'debug':
            logger.debug(log.message, context);
            break;
          case 'info':
            logger.info(log.message, context);
            break;
          case 'warn':
            logger.warn(log.message, context);
            break;
          case 'error':
          case 'critical':
            // Convert frontend error to Error object if present
            const error = log.context?.error
              ? new Error(log.context.error.message)
              : undefined;
            if (error && log.context?.error?.stack) {
              error.stack = log.context.error.stack;
            }

            if (log.level === 'critical') {
              logger.critical(log.message, context, error);
            } else {
              logger.error(log.message, context, error);
            }
            break;
          default:
            logger.info(log.message, context);
        }

        // Handle performance metrics
        if (log.context?.performance) {
          const { metric, value } = log.context.performance;
          logger.performance(metric, value, context);
        }

        processed++;
      } catch (logError) {
        // Log processing error but continue with other logs
        logger.error('Failed to process frontend log entry', {
          source: 'backend',
          error: logError,
          originalLog: log,
        });
      }
    }

    // Log the batch processing
    logger.info('Frontend log batch processed', {
      source: 'backend',
      batchSize: logs.length,
      processed,
      clientInfo,
      ip: req.ip || req.connection.remoteAddress,
    });

    res.json({
      success: true,
      processed,
      batchSize: logs.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to process frontend log batch', {
      source: 'backend',
      error,
      ip: req.ip || req.connection.remoteAddress,
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process log batch',
    });
  }
});

/**
 * POST /api/logs/single
 * Accept single frontend log entry
 */
router.post('/single', (req: Request, res: Response) => {
  try {
    const logEntry: FrontendLogEntry = req.body;

    if (!logEntry.level || !logEntry.message) {
      return res.status(400).json({
        error: 'Invalid log entry',
        message: 'level and message are required',
      });
    }

    // Create enriched context
    const context = {
      source: 'frontend',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      ...logEntry.context,
    };

    // Route to appropriate logger method
    switch (logEntry.level) {
      case 'debug':
        logger.debug(logEntry.message, context);
        break;
      case 'info':
        logger.info(logEntry.message, context);
        break;
      case 'warn':
        logger.warn(logEntry.message, context);
        break;
      case 'error':
      case 'critical':
        const error = logEntry.context?.error
          ? new Error(logEntry.context.error.message)
          : undefined;
        if (error && logEntry.context?.error?.stack) {
          error.stack = logEntry.context.error.stack;
        }

        if (logEntry.level === 'critical') {
          logger.critical(logEntry.message, context, error);
        } else {
          logger.error(logEntry.message, context, error);
        }
        break;
      default:
        logger.info(logEntry.message, context);
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to process single frontend log', {
      source: 'backend',
      error,
      ip: req.ip || req.connection.remoteAddress,
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process log entry',
    });
  }
});

/**
 * GET /api/logs/health
 * Check logging system health
 */
router.get('/health', (req: Request, res: Response) => {
  try {
    logger.info('Logging system health check', {
      source: 'backend',
      ip: req.ip || req.connection.remoteAddress,
    });

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      endpoints: {
        batch: '/api/logs/batch',
        single: '/api/logs/single',
        health: '/api/logs/health',
      },
      features: [
        'Winston-based logging',
        'Daily log rotation',
        'Multiple log levels',
        'Structured JSON logging',
        'Performance metrics tracking',
        'Error stack trace capture',
      ],
    });
  } catch (error) {
    logger.error('Logging health check failed', {
      source: 'backend',
      error,
      ip: req.ip || req.connection.remoteAddress,
    });

    res.status(500).json({
      status: 'unhealthy',
      error: 'Health check failed',
    });
  }
});

export default router;
