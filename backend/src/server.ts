import 'dotenv/config';
import { config } from './config';
import { startServer } from './app';
import { logger } from './utils/logger';

const PORT = config.port;

// Start the server
startServer(PORT)
  .then((server) => {
    logger.info('Server started successfully', { pid: process.pid });
    
    // Graceful shutdown handling
    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      server.close(() => {
        logger.info('Server closed successfully');
        process.exit(0);
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  })
  .catch((error) => {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  });
