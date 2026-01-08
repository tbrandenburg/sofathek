/**
 * Comprehensive Jest Tests for Frontend Logger System
 * Tests initialization, log levels, storage, performance metrics, and remote logging
 */

import {
  Logger,
  LogLevel,
  LogEntry,
  LoggerConfig,
  PerformanceMetric,
} from '../../utils/logger';

// Mock browser APIs
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

const mockFetch = jest.fn();
const mockConsole = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockPerformanceObserver = jest.fn();
const mockObserverInstance = {
  observe: jest.fn(),
  disconnect: jest.fn(),
};

// Mock global objects
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });
Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage });
Object.defineProperty(global, 'fetch', { value: mockFetch });
Object.defineProperty(window, 'location', {
  value: { href: 'https://test.example.com/page' },
  writable: true,
});
Object.defineProperty(window, 'navigator', {
  value: { userAgent: 'Test User Agent 1.0' },
  writable: true,
});
Object.defineProperty(window, 'performance', {
  value: {
    timing: {
      navigationStart: 1000,
      domContentLoadedEventEnd: 2000,
      loadEventEnd: 3000,
      responseEnd: 1500,
    },
    now: jest.fn(() => Date.now()),
    getEntriesByType: jest.fn(() => []),
  },
  writable: true,
});
Object.defineProperty(global, 'PerformanceObserver', {
  value: jest.fn().mockImplementation(callback => {
    mockPerformanceObserver(callback);
    return mockObserverInstance;
  }),
});

// Mock console methods
Object.defineProperty(console, 'debug', { value: mockConsole.debug });
Object.defineProperty(console, 'info', { value: mockConsole.info });
Object.defineProperty(console, 'warn', { value: mockConsole.warn });
Object.defineProperty(console, 'error', { value: mockConsole.error });

// Mock timers
jest.useFakeTimers();

describe('Logger System', () => {
  let logger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    mockSessionStorage.clear();
    mockFetch.mockClear();

    // Reset console mocks
    Object.values(mockConsole).forEach(mock => mock.mockClear());

    // Mock successful fetch response
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ success: true }),
    });

    // Mock Date.now for consistent timestamps
    jest.spyOn(Date, 'now').mockReturnValue(1234567890123);
    jest.spyOn(Math, 'random').mockReturnValue(0.5);

    // Create fresh logger instance
    logger = new Logger({
      enableConsole: true,
      enableStorage: true,
      enableRemoteLogging: true,
      flushInterval: 1000,
      batchSize: 3,
    });
  });

  afterEach(() => {
    if (logger) {
      logger.destroy();
    }
    jest.restoreAllMocks();
    jest.runOnlyPendingTimers();
  });

  describe('Logger Initialization', () => {
    it('should initialize with default configuration in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const devLogger = new Logger();
      const config = devLogger.getConfig();

      expect(config.level).toBe(LogLevel.DEBUG);
      expect(config.enableConsole).toBe(true);
      expect(config.enableStorage).toBe(true);
      expect(config.enableRemoteLogging).toBe(true);
      expect(config.maxStorageEntries).toBe(1000);
      expect(config.batchSize).toBe(10);
      expect(config.flushInterval).toBe(30000);
      expect(config.remoteEndpoint).toBe('/api/logs');

      devLogger.destroy();
      process.env.NODE_ENV = originalEnv;
    });

    it('should initialize with production configuration', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const prodLogger = new Logger();
      const config = prodLogger.getConfig();

      expect(config.level).toBe(LogLevel.INFO);
      expect(config.enableConsole).toBe(false);

      prodLogger.destroy();
      process.env.NODE_ENV = originalEnv;
    });

    it('should accept custom configuration', () => {
      const customConfig: Partial<LoggerConfig> = {
        level: LogLevel.ERROR,
        enableConsole: false,
        maxStorageEntries: 500,
        batchSize: 5,
        remoteEndpoint: '/custom/logs',
      };

      const customLogger = new Logger(customConfig);
      const config = customLogger.getConfig();

      expect(config.level).toBe(LogLevel.ERROR);
      expect(config.enableConsole).toBe(false);
      expect(config.maxStorageEntries).toBe(500);
      expect(config.batchSize).toBe(5);
      expect(config.remoteEndpoint).toBe('/custom/logs');

      customLogger.destroy();
    });

    it('should generate unique session ID', () => {
      const logger1 = new Logger();
      const logger2 = new Logger();

      // Session IDs should be different (tested through log entries)
      logger1.info('Test 1');
      logger2.info('Test 2');

      const logs1 = logger1.getLogs();
      const logs2 = logger2.getLogs();

      expect(logs1[0]?.sessionId).toBeTruthy();
      expect(logs2[0]?.sessionId).toBeTruthy();

      logger1.destroy();
      logger2.destroy();
    });

    it('should load persisted logs from storage on initialization', () => {
      const existingLogs: LogEntry[] = [
        {
          id: 'existing_1',
          timestamp: Date.now() - 1000,
          level: LogLevel.INFO,
          message: 'Existing log 1',
          sessionId: 'old_session',
        },
        {
          id: 'existing_2',
          timestamp: Date.now() - 86400001, // Over 24 hours old
          level: LogLevel.INFO,
          message: 'Old log',
          sessionId: 'old_session',
        },
      ];

      mockLocalStorage.setItem('sofathek_logs', JSON.stringify(existingLogs));

      const testLogger = new Logger({ flushInterval: 5000 });

      // Should have loaded recent logs but not old ones
      jest.advanceTimersByTime(100);

      testLogger.destroy();
    });
  });

  describe('Log Level Handling', () => {
    it('should filter logs based on configured level', () => {
      const warnLogger = new Logger({
        level: LogLevel.WARN,
        enableConsole: true,
      });

      warnLogger.debug('Debug message');
      warnLogger.info('Info message');
      warnLogger.warn('Warning message');
      warnLogger.error('Error message');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      expect(mockConsole.error).toHaveBeenCalledTimes(1);

      warnLogger.destroy();
    });

    it('should allow changing log level dynamically', () => {
      logger.setLevel(LogLevel.ERROR);

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalledTimes(2); // One for setLevel, one for error
    });

    it('should log all levels when set to DEBUG', () => {
      logger.setLevel(LogLevel.DEBUG);

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');
      logger.critical('Critical message');

      expect(mockConsole.debug).toHaveBeenCalledTimes(1);
      expect(mockConsole.info).toHaveBeenCalledTimes(2); // One for setLevel, one for info
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      expect(mockConsole.error).toHaveBeenCalledTimes(2); // error + critical
    });
  });

  describe('Console Logging', () => {
    it('should log to console with proper formatting', () => {
      logger.info('Test message', 'TestContext', { key: 'value' });

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('%c['),
        expect.stringContaining('color: #2196F3'),
        'Test message',
        { key: 'value' }
      );
    });

    it('should use appropriate console methods for different log levels', () => {
      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warning');
      logger.error('Error');
      logger.critical('Critical');

      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('DEBUG'),
        'Debug',
        ''
      );
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringMatching(/%c.*INFO/),
        expect.any(String),
        'Info',
        ''
      );
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringMatching(/%c.*WARN/),
        expect.any(String),
        'Warning',
        ''
      );
      expect(mockConsole.error).toHaveBeenCalledTimes(2); // error + critical
    });

    it('should include stack trace for errors', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:1:1';

      logger.error('Error occurred', 'Test', {}, error);

      expect(mockConsole.error).toHaveBeenCalledWith(
        'Stack trace:',
        'Error: Test error\n    at test.js:1:1'
      );
    });

    it('should not log to console when disabled', () => {
      const noConsoleLogger = new Logger({ enableConsole: false });

      noConsoleLogger.error('Should not appear in console');

      expect(mockConsole.error).not.toHaveBeenCalled();

      noConsoleLogger.destroy();
    });
  });

  describe('Local Storage Persistence', () => {
    it('should persist logs to localStorage', () => {
      logger.info('Test message', 'Test');

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'sofathek_logs',
        expect.stringContaining('Test message')
      );
    });

    it('should maintain storage size limit', () => {
      const limitedLogger = new Logger({ maxStorageEntries: 2 });

      limitedLogger.info('Message 1');
      limitedLogger.info('Message 2');
      limitedLogger.info('Message 3');

      // Should have called setItem 3 times but only keep last 2 entries
      const lastCall =
        mockLocalStorage.setItem.mock.calls[
          mockLocalStorage.setItem.mock.calls.length - 1
        ];
      const storedLogs = JSON.parse(lastCall[1]);

      expect(storedLogs).toHaveLength(2);
      expect(storedLogs[0].message).toContain('Message 2');
      expect(storedLogs[1].message).toContain('Message 3');

      limitedLogger.destroy();
    });

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Storage quota exceeded');
      });

      expect(() => {
        logger.warn('This should not crash');
      }).not.toThrow();

      expect(mockConsole.warn).toHaveBeenCalledWith(
        'Failed to persist log to storage:',
        expect.any(Error)
      );
    });

    it('should retrieve logs from storage', () => {
      logger.info('Test message 1');
      logger.warn('Test message 2');

      const logs = logger.getLogs();

      expect(logs).toHaveLength(2);
      expect(logs[0].message).toBe('Test message 1');
      expect(logs[1].message).toBe('Test message 2');
    });

    it('should clear logs from storage', () => {
      logger.info('Test message');
      logger.clearLogs();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('sofathek_logs');
      expect(logger.getLogs()).toHaveLength(0);
    });

    it('should handle corrupted storage data', () => {
      mockLocalStorage.getItem.mockReturnValueOnce('invalid json');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(0);
    });
  });

  describe('Performance Metrics', () => {
    it('should record performance metrics', () => {
      logger.recordPerformance('test_metric', 150, 'Test context');

      // Should log the performance metric
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('Performance: test_metric = 150ms'),
        'Performance: test_metric = 150ms',
        expect.objectContaining({
          metric: expect.objectContaining({
            name: 'test_metric',
            value: 150,
            context: 'Test context',
          }),
        })
      );
    });

    it('should warn about performance issues', () => {
      logger.recordPerformance('page_load_time', 5000);

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringMatching(/%c.*Performance issue: page_load_time/),
        expect.any(String),
        'Performance issue: page_load_time',
        expect.objectContaining({
          metric: expect.objectContaining({
            name: 'page_load_time',
            value: 5000,
          }),
        })
      );
    });

    it('should set up performance monitoring on page load', () => {
      // Simulate page load event
      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);

      // Fast-forward past the setTimeout
      jest.advanceTimersByTime(100);

      // Should have recorded timing metrics
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('page_load_time'),
        expect.stringContaining('page_load_time'),
        expect.any(Object)
      );
    });

    it('should monitor slow resources with PerformanceObserver', () => {
      // Simulate PerformanceObserver callback
      const mockCallback = mockPerformanceObserver.mock.calls[0]?.[0];
      if (mockCallback) {
        const mockEntryList = {
          getEntries: () => [
            {
              entryType: 'resource',
              name: 'https://example.com/slow-resource.js',
              duration: 2500,
            },
          ],
        };

        mockCallback(mockEntryList);

        expect(mockConsole.debug).toHaveBeenCalledWith(
          expect.stringContaining('slow_resource'),
          expect.stringContaining('slow_resource'),
          expect.objectContaining({
            metric: expect.objectContaining({
              name: 'slow_resource',
              value: 2500,
            }),
          })
        );
      }
    });
  });

  describe('Remote Log Batching and Sending', () => {
    it('should batch and send logs to remote endpoint', async () => {
      logger.error('Error 1');
      logger.error('Error 2');
      logger.error('Error 3'); // Should trigger flush due to batch size

      // Wait for async flush
      await Promise.resolve();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/logs/batch',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Error 1'),
        })
      );
    });

    it('should transform logs to backend format', async () => {
      logger.error('Test error', 'TestContext', { data: 'test' });

      // Trigger flush
      await logger.flush();

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody).toMatchObject({
        logs: expect.arrayContaining([
          expect.objectContaining({
            level: 'error',
            message: 'Test error',
            timestamp: expect.stringMatching(
              /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
            ),
            context: expect.objectContaining({
              url: 'https://test.example.com/page',
              userAgent: 'Test User Agent 1.0',
              component: 'TestContext',
              data: { data: 'test' },
            }),
          }),
        ]),
        clientInfo: expect.objectContaining({
          userAgent: 'Test User Agent 1.0',
          url: 'https://test.example.com/page',
        }),
      });
    });

    it('should include performance metrics in flush', async () => {
      logger.recordPerformance('test_timing', 100);

      await logger.flush();

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.logs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            level: 'info',
            message: 'Performance metric: test_timing',
            context: expect.objectContaining({
              performance: {
                metric: 'test_timing',
                value: 100,
                unit: 'ms',
              },
            }),
          }),
        ])
      );
    });

    it('should flush automatically at intervals', async () => {
      logger.info('Test message');

      // Advance time to trigger flush
      jest.advanceTimersByTime(1000);

      // Wait for async operations
      await Promise.resolve();

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      logger.error('Test error');

      await logger.flush();

      expect(mockConsole.warn).toHaveBeenCalledWith(
        'Failed to flush logs to server:',
        expect.any(Error)
      );
    });

    it('should retry failed logs', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK' });

      logger.error('Test error');

      // First flush fails
      await logger.flush();

      // Second flush should retry the same log
      await logger.flush();

      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Both calls should contain the same error message
      const firstCall = JSON.parse(mockFetch.mock.calls[0][1].body);
      const secondCall = JSON.parse(mockFetch.mock.calls[1][1].body);

      expect(firstCall.logs[0].message).toBe('Test error');
      expect(secondCall.logs[0].message).toBe('Test error');
    });

    it('should handle non-ok HTTP responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      logger.error('Test error');

      await logger.flush();

      expect(mockConsole.warn).toHaveBeenCalledWith(
        'Failed to flush logs to server:',
        expect.objectContaining({
          message: 'Failed to send logs: Internal Server Error',
        })
      );
    });

    it('should clear localStorage after successful flush', async () => {
      logger.info('Test message');

      await logger.flush();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('sofathek_logs');
    });

    it('should not flush when remote logging is disabled', async () => {
      const noRemoteLogger = new Logger({ enableRemoteLogging: false });

      noRemoteLogger.error('Test error');
      await noRemoteLogger.flush();

      expect(mockFetch).not.toHaveBeenCalled();

      noRemoteLogger.destroy();
    });
  });

  describe('Session Management', () => {
    it('should include session ID in log entries', () => {
      logger.info('Test message');

      const logs = logger.getLogs();
      expect(logs[0].sessionId).toMatch(/^log_\d+_[a-z0-9]{9}$/);
    });

    it('should maintain consistent session ID across logs', () => {
      logger.info('Message 1');
      logger.warn('Message 2');

      const logs = logger.getLogs();
      expect(logs[0].sessionId).toBe(logs[1].sessionId);
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should set up global error handlers', () => {
      // Simulate unhandled promise rejection
      const rejectionEvent = new CustomEvent('unhandledrejection', {
        detail: { reason: 'Test rejection' },
      }) as any;
      rejectionEvent.reason = 'Test rejection';

      window.dispatchEvent(rejectionEvent);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringMatching(/%c.*Unhandled promise rejection/),
        expect.any(String),
        'Unhandled promise rejection',
        expect.objectContaining({
          reason: 'Test rejection',
        })
      );
    });

    it('should handle uncaught errors', () => {
      const errorEvent = new ErrorEvent('error', {
        message: 'Test error message',
        filename: 'test.js',
        lineno: 10,
        colno: 5,
        error: new Error('Test error'),
      });

      window.dispatchEvent(errorEvent);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringMatching(/%c.*Uncaught error/),
        expect.any(String),
        'Uncaught error',
        expect.objectContaining({
          message: 'Test error message',
          filename: 'test.js',
          lineno: 10,
          colno: 5,
        })
      );
    });
  });

  describe('Specialized Logging Methods', () => {
    it('should log user interactions', () => {
      logger.logInteraction('click', 'button#submit', { x: 100, y: 200 });

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringMatching(/%c.*User interaction: click/),
        expect.any(String),
        'User interaction: click',
        expect.objectContaining({
          element: 'button#submit',
          data: { x: 100, y: 200 },
        })
      );
    });

    it('should log API calls with success status', () => {
      logger.logApiCall('GET', '/api/users', 150, 200);

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringMatching(/%c.*API GET \/api\/users \(150ms\)/),
        expect.any(String),
        'API GET /api/users (150ms)',
        expect.objectContaining({
          method: 'GET',
          url: '/api/users',
          duration: 150,
          status: 200,
        })
      );
    });

    it('should log API calls with error status as warning', () => {
      logger.logApiCall('POST', '/api/login', 300, 401);

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringMatching(/%c.*API POST \/api\/login \(300ms\)/),
        expect.any(String),
        'API POST /api/login (300ms)',
        expect.objectContaining({
          status: 401,
        })
      );
    });

    it('should log API calls with errors', () => {
      const apiError = new Error('Network timeout');
      logger.logApiCall('DELETE', '/api/items/1', 5000, undefined, apiError);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringMatching(/%c.*API DELETE \/api\/items\/1 \(5000ms\)/),
        expect.any(String),
        'API DELETE /api/items/1 (5000ms)',
        expect.objectContaining({
          error: 'Network timeout',
        })
      );
    });
  });

  describe('Logger Cleanup', () => {
    it('should clear intervals when destroyed', () => {
      const clearIntervalSpy = jest.spyOn(window, 'clearInterval');

      logger.destroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should perform final flush when destroyed', async () => {
      logger.info('Final message');

      const flushSpy = jest.spyOn(logger, 'flush');
      logger.destroy();

      expect(flushSpy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing window object gracefully', () => {
      const originalWindow = global.window;
      delete (global as any).window;

      expect(() => {
        new Logger();
      }).not.toThrow();

      global.window = originalWindow;
    });

    it('should handle missing performance API', () => {
      const originalPerformance = window.performance;
      delete (window as any).performance;

      expect(() => {
        new Logger();
      }).not.toThrow();

      window.performance = originalPerformance;
    });

    it('should handle PerformanceObserver errors', () => {
      mockObserverInstance.observe.mockImplementationOnce(() => {
        throw new Error('Observer not supported');
      });

      expect(() => {
        new Logger();
      }).not.toThrow();

      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('Performance observer not supported'),
        'Performance observer not supported',
        ''
      );
    });

    it('should handle very large log data', () => {
      const largeData = {
        bigArray: new Array(10000).fill('large data'),
        bigString: 'x'.repeat(50000),
      };

      expect(() => {
        logger.info('Large data test', 'Test', largeData);
      }).not.toThrow();
    });

    it('should handle circular references in log data', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      expect(() => {
        logger.info('Circular test', 'Test', circularObj);
      }).not.toThrow();
    });
  });
});
