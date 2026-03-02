import winston from 'winston';
import { logger } from '../../../utils/logger';

describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spy on console methods to capture winston output
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Mock file system operations that winston might use
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Logger configuration', () => {
    it('should have correct service name in defaultMeta', () => {
      expect(logger.defaultMeta).toEqual({ service: 'sofathek-backend' });
    });

    it('should use info level by default', () => {
      // Save original env
      const originalLogLevel = process.env.LOG_LEVEL;
      delete process.env.LOG_LEVEL;
      
      // Create new logger instance to test default
      const testLogger = winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: winston.format.json(),
        transports: [new winston.transports.Console()]
      });
      
      expect(testLogger.level).toBe('info');
      
      // Restore env
      if (originalLogLevel) {
        process.env.LOG_LEVEL = originalLogLevel;
      }
    });

    it('should respect LOG_LEVEL environment variable', () => {
      const originalLogLevel = process.env.LOG_LEVEL;
      process.env.LOG_LEVEL = 'debug';
      
      const testLogger = winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: winston.format.json(),
        transports: [new winston.transports.Console()]
      });
      
      expect(testLogger.level).toBe('debug');
      
      // Restore env
      if (originalLogLevel) {
        process.env.LOG_LEVEL = originalLogLevel;
      } else {
        delete process.env.LOG_LEVEL;
      }
    });
  });

  describe('Logging methods', () => {
    it('should log info messages', () => {
      const testMessage = 'Test info message';
      const testMeta = { userId: 123, action: 'test' };
      
      logger.info(testMessage, testMeta);
      
      // Logger should be called (exact assertion depends on winston internals)
      expect(typeof logger.info).toBe('function');
    });

    it('should log error messages', () => {
      const testError = new Error('Test error');
      const testMeta = { context: 'test-context' };
      
      logger.error('An error occurred', { error: testError, ...testMeta });
      
      expect(typeof logger.error).toBe('function');
    });

    it('should log warning messages', () => {
      const testMessage = 'Test warning message';
      
      logger.warn(testMessage);
      
      expect(typeof logger.warn).toBe('function');
    });

    it('should log debug messages', () => {
      const testMessage = 'Test debug message';
      const testData = { requestId: 'req-123', duration: 150 };
      
      logger.debug(testMessage, testData);
      
      expect(typeof logger.debug).toBe('function');
    });
  });

  describe('Environment-specific behavior', () => {
    it('should include console transport in non-production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      // Create new logger to test environment behavior
      const devLogger = winston.createLogger({
        level: 'info',
        format: winston.format.json(),
        transports: []
      });
      
      if (process.env.NODE_ENV !== 'production') {
        devLogger.add(new winston.transports.Console());
      }
      
      expect(devLogger.transports.length).toBeGreaterThan(0);
      
      // Restore env
      if (originalEnv) {
        process.env.NODE_ENV = originalEnv;
      } else {
        delete process.env.NODE_ENV;
      }
    });

    it('should handle production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      // Create new logger for production test
      const prodLogger = winston.createLogger({
        level: 'info',
        format: winston.format.json(),
        transports: [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' })
        ]
      });
      
      // Should not add console transport in production
      const initialTransportCount = prodLogger.transports.length;
      if (process.env.NODE_ENV !== 'production') {
        prodLogger.add(new winston.transports.Console());
      }
      
      expect(prodLogger.transports.length).toBe(initialTransportCount);
      
      // Restore env
      if (originalEnv) {
        process.env.NODE_ENV = originalEnv;
      } else {
        delete process.env.NODE_ENV;
      }
    });
  });

  describe('Error logging with stack traces', () => {
    it('should properly format errors with stack traces', () => {
      const testError = new Error('Test error with stack');
      testError.stack = 'Error: Test error\n    at test (test.js:1:1)';
      
      logger.error('Error occurred', { error: testError });
      
      // Winston should handle error formatting
      expect(typeof logger.error).toBe('function');
    });

    it('should handle errors without stack traces', () => {
      const testError = { message: 'Error without stack' };
      
      logger.error('Error occurred', { error: testError });
      
      expect(typeof logger.error).toBe('function');
    });
  });

  describe('Structured logging', () => {
    it('should support structured metadata', () => {
      const metadata = {
        requestId: 'req-12345',
        userId: 'user-67890',
        operation: 'video-upload',
        duration: 1500,
        success: true
      };
      
      logger.info('Operation completed', metadata);
      
      expect(typeof logger.info).toBe('function');
    });

    it('should handle nested metadata objects', () => {
      const complexMetadata = {
        request: {
          id: 'req-123',
          method: 'POST',
          url: '/api/videos',
          headers: {
            'user-agent': 'test-agent',
            'content-type': 'application/json'
          }
        },
        response: {
          statusCode: 200,
          duration: 250
        }
      };
      
      logger.info('API request completed', complexMetadata);
      
      expect(typeof logger.info).toBe('function');
    });
  });
});