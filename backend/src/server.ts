import app from './app';
import { apiLogger } from './middleware/logger';

// Environment variables with defaults
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Graceful shutdown handler
const gracefulShutdown = (signal: string) => {
  apiLogger(`Received ${signal}, shutting down gracefully...`, 'info');
  
  server.close(() => {
    apiLogger('Process terminated gracefully', 'info');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    apiLogger('Force closing server after timeout', 'error');
    process.exit(1);
  }, 10000);
};

// Start server
const server = app.listen(PORT, HOST, () => {
  apiLogger(`Server running on http://${HOST}:${PORT}`, 'info');
  apiLogger(`Environment: ${NODE_ENV}`, 'info');
  apiLogger('Press Ctrl+C to stop the server', 'info');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error, promise) => {
  apiLogger(`Unhandled Promise Rejection: ${err.message}`, 'error');
  console.error('Unhandled Promise Rejection:', err);
  
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  apiLogger(`Uncaught Exception: ${err.message}`, 'error');
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