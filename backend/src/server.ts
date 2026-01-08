import app from './app';
import logger from './utils/logger';

// Environment variables with defaults
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Graceful shutdown handler
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  server.close(() => {
    logger.info('Process terminated gracefully');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Force closing server after timeout');
    process.exit(1);
  }, 10000);
};

// Start server
const server = app.listen(PORT, HOST, () => {
  logger.info(`Server running on http://${HOST}:${PORT}`);
  logger.info(`Environment: ${NODE_ENV}`);
  logger.info('Press Ctrl+C to stop the server');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error, promise) => {
  logger.error(`Unhandled Promise Rejection: ${err.message}`, {}, err);
  console.error('Unhandled Promise Rejection:', err);

  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error(`Uncaught Exception: ${err.message}`, {}, err);
  console.error('Uncaught Exception:', err);

  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle graceful shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;
