/**
 * Unit Tests for Logs API Routes
 * Tests the log ingestion endpoints that handle frontend logs
 */

import request from 'supertest';
import express from 'express';
import logsRouter from '../../routes/logs';
import logger from '../../utils/logger';

// Mock the logger
jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  critical: jest.fn(),
  performance: jest.fn(),
}));

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/logs', logsRouter);

describe('Logs API Routes', () => {
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/logs/batch', () => {
    const validBatchPayload = {
      logs: [
        {
          level: 'info' as const,
          message: 'User login successful',
          timestamp: '2024-01-08T10:00:00.000Z',
          context: {
            userId: 'user_123',
            sessionId: 'session_456',
            component: 'Auth',
            action: 'login',
          },
        },
        {
          level: 'error' as const,
          message: 'API call failed',
          timestamp: '2024-01-08T10:01:00.000Z',
          context: {
            url: '/api/videos',
            method: 'GET',
            error: {
              name: 'FetchError',
              message: 'Network request failed',
              stack: 'FetchError: Network request failed\n    at fetch.js:1:1',
            },
          },
        },
      ],
      clientInfo: {
        userAgent: 'Mozilla/5.0 (Test Environment) Jest Unit Tests',
        url: 'http://localhost:3000/dashboard',
        timestamp: '2024-01-08T10:00:00.000Z',
        sessionId: 'session_456',
        userId: 'user_123',
      },
    };

    it('should process valid batch of logs successfully', async () => {
      const response = await request(app)
        .post('/api/logs/batch')
        .send(validBatchPayload)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        processed: 2,
        batchSize: 2,
        timestamp: expect.any(String),
      });

      // Verify logger was called for each log entry
      expect(mockLogger.info).toHaveBeenCalledWith(
        'User login successful',
        expect.objectContaining({
          source: 'frontend',
          clientInfo: validBatchPayload.clientInfo,
          ip: expect.any(String),
          userId: 'user_123',
          sessionId: 'session_456',
          component: 'Auth',
          action: 'login',
        })
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'API call failed',
        expect.objectContaining({
          source: 'frontend',
          clientInfo: validBatchPayload.clientInfo,
          ip: expect.any(String),
          url: '/api/videos',
          method: 'GET',
        }),
        expect.any(Error)
      );
    });

    it('should handle performance metrics in logs', async () => {
      const payloadWithPerformance = {
        logs: [
          {
            level: 'info' as const,
            message: 'Page load completed',
            timestamp: '2024-01-08T10:00:00.000Z',
            context: {
              component: 'PageLoader',
              performance: {
                metric: 'page_load_time',
                value: 1500,
                unit: 'ms',
              },
            },
          },
        ],
        clientInfo: validBatchPayload.clientInfo,
      };

      await request(app)
        .post('/api/logs/batch')
        .send(payloadWithPerformance)
        .expect(200);

      // Verify performance logging
      expect(mockLogger.performance).toHaveBeenCalledWith(
        'page_load_time',
        1500,
        expect.objectContaining({
          source: 'frontend',
          component: 'PageLoader',
        })
      );
    });

    it('should handle critical level logs correctly', async () => {
      const criticalLogPayload = {
        logs: [
          {
            level: 'critical' as const,
            message: 'System failure detected',
            timestamp: '2024-01-08T10:00:00.000Z',
            context: {
              component: 'SystemMonitor',
              error: {
                name: 'SystemError',
                message: 'Critical system failure',
                stack: 'SystemError: Critical failure\n    at system.js:1:1',
              },
            },
          },
        ],
        clientInfo: validBatchPayload.clientInfo,
      };

      await request(app)
        .post('/api/logs/batch')
        .send(criticalLogPayload)
        .expect(200);

      expect(mockLogger.critical).toHaveBeenCalledWith(
        'System failure detected',
        expect.objectContaining({
          source: 'frontend',
          component: 'SystemMonitor',
        }),
        expect.any(Error)
      );
    });

    it('should return 400 for invalid request format', async () => {
      const invalidPayload = {
        // Missing logs array
        clientInfo: validBatchPayload.clientInfo,
      };

      const response = await request(app)
        .post('/api/logs/batch')
        .send(invalidPayload)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid request format',
        message: 'logs array is required',
      });
    });

    it('should return 400 for non-array logs', async () => {
      const invalidPayload = {
        logs: 'not an array',
        clientInfo: validBatchPayload.clientInfo,
      };

      const response = await request(app)
        .post('/api/logs/batch')
        .send(invalidPayload)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid request format',
        message: 'logs array is required',
      });
    });

    it('should handle empty logs array gracefully', async () => {
      const emptyPayload = {
        logs: [],
        clientInfo: validBatchPayload.clientInfo,
      };

      const response = await request(app)
        .post('/api/logs/batch')
        .send(emptyPayload)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        processed: 0,
        message: 'No logs to process',
      });
    });

    it('should continue processing even if individual log fails', async () => {
      // Mock logger.info to throw an error on first call
      mockLogger.info.mockImplementationOnce(() => {
        throw new Error('Simulated processing error');
      });

      const response = await request(app)
        .post('/api/logs/batch')
        .send(validBatchPayload)
        .expect(200);

      // Should still process the second log
      expect(response.body.processed).toBe(1);
      expect(response.body.batchSize).toBe(2);

      // Should log the processing error
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to process frontend log entry',
        expect.objectContaining({
          source: 'backend',
          error: expect.any(Error),
          originalLog: expect.any(Object),
        })
      );
    });

    it('should handle unknown log levels gracefully', async () => {
      const unknownLevelPayload = {
        logs: [
          {
            level: 'unknown' as any,
            message: 'Unknown level log',
            timestamp: '2024-01-08T10:00:00.000Z',
          },
        ],
        clientInfo: validBatchPayload.clientInfo,
      };

      await request(app)
        .post('/api/logs/batch')
        .send(unknownLevelPayload)
        .expect(200);

      // Should default to info level
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Unknown level log',
        expect.any(Object)
      );
    });

    it('should log batch processing metadata', async () => {
      await request(app)
        .post('/api/logs/batch')
        .send(validBatchPayload)
        .expect(200);

      // Should log the batch processing summary
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Frontend log batch processed',
        expect.objectContaining({
          source: 'backend',
          batchSize: 2,
          processed: 2,
          clientInfo: validBatchPayload.clientInfo,
        })
      );
    });
  });

  describe('POST /api/logs/single', () => {
    const validSingleLog = {
      level: 'info' as const,
      message: 'Single log entry test',
      timestamp: '2024-01-08T10:00:00.000Z',
      context: {
        component: 'TestComponent',
        action: 'test_action',
      },
    };

    it('should process single log entry successfully', async () => {
      const response = await request(app)
        .post('/api/logs/single')
        .send(validSingleLog)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        timestamp: expect.any(String),
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Single log entry test',
        expect.objectContaining({
          source: 'frontend',
          component: 'TestComponent',
          action: 'test_action',
        })
      );
    });

    it('should return 400 for missing required fields', async () => {
      const invalidLog = {
        // Missing level and message
        timestamp: '2024-01-08T10:00:00.000Z',
      };

      const response = await request(app)
        .post('/api/logs/single')
        .send(invalidLog)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid log entry',
        message: 'level and message are required',
      });
    });

    it('should handle error logs with stack traces', async () => {
      const errorLog = {
        level: 'error' as const,
        message: 'Error with stack trace',
        timestamp: '2024-01-08T10:00:00.000Z',
        context: {
          error: {
            name: 'TestError',
            message: 'Test error message',
            stack: 'TestError: Test error message\n    at test.js:1:1',
          },
        },
      };

      await request(app).post('/api/logs/single').send(errorLog).expect(200);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error with stack trace',
        expect.objectContaining({
          source: 'frontend',
        }),
        expect.any(Error)
      );
    });

    it('should include User-Agent from request headers', async () => {
      await request(app)
        .post('/api/logs/single')
        .set('User-Agent', 'Custom Test Agent')
        .send(validSingleLog)
        .expect(200);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Single log entry test',
        expect.objectContaining({
          userAgent: 'Custom Test Agent',
        })
      );
    });
  });

  describe('GET /api/logs/health', () => {
    it('should return health status successfully', async () => {
      const response = await request(app).get('/api/logs/health').expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
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

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Logging system health check',
        expect.objectContaining({
          source: 'backend',
        })
      );
    });

    it('should handle health check errors gracefully', async () => {
      // Mock logger to throw error
      mockLogger.info.mockImplementationOnce(() => {
        throw new Error('Health check error');
      });

      const response = await request(app).get('/api/logs/health').expect(500);

      expect(response.body).toEqual({
        status: 'unhealthy',
        error: 'Health check failed',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Logging health check failed',
        expect.objectContaining({
          source: 'backend',
          error: expect.any(Error),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle server errors in batch endpoint', async () => {
      // Mock logger to throw error
      mockLogger.info.mockImplementation(() => {
        throw new Error('Logger error');
      });

      const response = await request(app)
        .post('/api/logs/batch')
        .send({
          logs: [
            {
              level: 'info' as const,
              message: 'Test message',
              timestamp: '2024-01-08T10:00:00.000Z',
            },
          ],
          clientInfo: {
            userAgent: 'Test',
            url: 'http://test.com',
            timestamp: '2024-01-08T10:00:00.000Z',
          },
        })
        .expect(500);

      expect(response.body).toEqual({
        error: 'Internal server error',
        message: 'Failed to process log batch',
      });
    });

    it('should handle server errors in single endpoint', async () => {
      // Mock logger to throw error
      mockLogger.info.mockImplementation(() => {
        throw new Error('Logger error');
      });

      const response = await request(app)
        .post('/api/logs/single')
        .send({
          level: 'info' as const,
          message: 'Test message',
          timestamp: '2024-01-08T10:00:00.000Z',
        })
        .expect(500);

      expect(response.body).toEqual({
        error: 'Internal server error',
        message: 'Failed to process log entry',
      });
    });
  });
});
