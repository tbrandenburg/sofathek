import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { logger } from './utils/logger';
import { apiRouter } from './routes/api';
import healthRouter from './routes/health';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler';

// Create Express application
const app: Application = express();

// Set up CORS - allow all origins in development
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5183']
    : true, // Allow all origins in development
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Middleware for parsing JSON bodies
app.use(express.json({ limit: '10mb' }));

// Middleware for parsing URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  const start = Date.now();
  
  // Log the request
  logger.info(`${req.method} ${req.url}`, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Log the response when it finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.url} - ${res.statusCode}`, {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });
  
  next();
});

// Enhanced health check endpoint
app.use('/health', healthRouter);

// API routes
app.use('/api', apiRouter);

// 404 handler for unmatched routes (must come before error handler)
app.use(notFoundHandler);

// Global error handler (must be last middleware)
app.use(globalErrorHandler);

// Start server function
export const startServer = (port: number = 3001): Promise<any> => {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, (err?: Error) => {
      if (err) {
        logger.error('Failed to start server', { error: err.message, port });
        reject(err);
      } else {
        logger.info(`Sofathek backend server is running on port ${port}`, {
          port,
          environment: process.env.NODE_ENV || 'development',
          cors: corsOptions
        });
        resolve(server);
      }
    });
  });
};

// Export the Express application
export default app;