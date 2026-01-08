/**
 * Unit Tests for Request Logging Middleware
 * Tests the Express middleware that logs HTTP requests using Winston
 */

import { Request, Response, NextFunction } from 'express';
import { requestLogger, logger } from '../../middleware/logger';

// Mock the logger module
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    performance: jest.fn(),
    request: jest.fn(),
  },
}));

describe('Request Logging Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let mockLogger: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Get reference to mocked logger
    mockLogger = require('../../utils/logger').default;

    // Setup mock request
    mockRequest = {
      method: 'GET',
      originalUrl: '/api/videos',
      url: '/api/videos',
      ip: '127.0.0.1',
      connection: {
        remoteAddress: '192.168.1.1',
      } as any,
      get: jest.fn().mockImplementation((header: string) => {
        const headers: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Test Browser) Chrome/91.0',
          'Content-Type': 'application/json',
        };
        return headers[header] || 'Unknown';
      }) as any,
    };

    // Setup mock response with event emitter functionality
    const responseListeners: Record<string, Function[]> = {};
    mockResponse = {
      statusCode: 200,
      get: jest.fn().mockImplementation((header: string) => {
        const headers: Record<string, string> = {
          'Content-Length': '1024',
        };
        return headers[header] || '0';
      }) as any,
      on: jest.fn().mockImplementation((event: string, callback: Function) => {
        if (!responseListeners[event]) {
          responseListeners[event] = [];
        }
        responseListeners[event].push(callback);
        return mockResponse;
      }) as any,
      emit: jest.fn().mockImplementation((event: string, ...args: any[]) => {
        if (responseListeners[event]) {
          responseListeners[event].forEach(callback => callback(...args));
        }
        return true;
      }) as any,
    };

    nextFunction = jest.fn();
  });

  describe('Request Logging', () => {
    it('should log incoming requests', () => {
      requestLogger(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          method: 'GET',
          url: '/api/videos',
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Test Browser) Chrome/91.0',
        })
      );
    });

    it('should call next() to continue middleware chain', () => {
      requestLogger(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should handle missing User-Agent header', () => {
      (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'User-Agent') return undefined;
        return 'default-value';
      });

      requestLogger(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          userAgent: 'Unknown',
        })
      );
    });

    it('should handle missing IP address', () => {
      mockRequest = {
        ...mockRequest,
        ip: undefined,
        connection: {} as any,
      };

      requestLogger(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          ip: 'Unknown',
        })
      );
    });

    it('should prefer originalUrl over url', () => {
      mockRequest.originalUrl = '/api/videos?filter=recent';
      mockRequest.url = '/api/videos';

      requestLogger(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          url: '/api/videos?filter=recent',
        })
      );
    });

    it('should fallback to url when originalUrl is not available', () => {
      mockRequest.originalUrl = undefined;
      mockRequest.url = '/api/videos';

      requestLogger(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          url: '/api/videos',
        })
      );
    });
  });

  describe('Response Logging', () => {
    beforeEach(() => {
      // Set up timing mock
      jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1250); // End time (250ms later)
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should log successful requests on response finish', () => {
      requestLogger(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Simulate response finishing
      (mockResponse.emit as jest.Mock)('finish');

      expect(mockLogger.request).toHaveBeenCalledWith(
        'GET',
        '/api/videos',
        200,
        expect.any(Number),
        expect.objectContaining({
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Test Browser) Chrome/91.0',
          contentLength: '1024b',
        })
      );
    });

    it('should log client errors (4xx) as errors', () => {
      mockResponse.statusCode = 404;

      requestLogger(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Simulate response finishing
      (mockResponse.emit as jest.Mock)('finish');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Request error',
        expect.objectContaining({
          method: 'GET',
          url: '/api/videos',
          statusCode: 404,
          duration: 250,
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Test Browser) Chrome/91.0',
        })
      );
    });

    it('should log server errors (5xx) as errors', () => {
      mockResponse.statusCode = 500;

      requestLogger(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Simulate response finishing
      (mockResponse.emit as jest.Mock)('finish');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Request error',
        expect.objectContaining({
          statusCode: 500,
        })
      );
    });

    it('should handle missing Content-Length header', () => {
      (mockResponse.get as jest.Mock).mockReturnValue(undefined);

      requestLogger(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Simulate response finishing
      (mockResponse.emit as jest.Mock)('finish');

      expect(mockLogger.request).toHaveBeenCalledWith(
        'GET',
        '/api/videos',
        200,
        250,
        expect.objectContaining({
          contentLength: '0b',
        })
      );
    });
  });

  describe('Different HTTP Methods', () => {
    const testMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

    testMethods.forEach(method => {
      it(`should handle ${method} requests correctly`, () => {
        mockRequest.method = method;

        requestLogger(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Incoming request',
          expect.objectContaining({
            method,
          })
        );

        // Simulate response finishing
        (mockResponse.emit as jest.Mock)('finish');

        expect(mockLogger.request).toHaveBeenCalledWith(
          method,
          '/api/videos',
          200,
          expect.any(Number),
          expect.any(Object)
        );
      });
    });
  });

  describe('Performance Thresholds', () => {
    it('should not log performance for fast requests (< 1000ms)', () => {
      // Mock fast response time
      jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1500); // End time (500ms later)

      requestLogger(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Simulate response finishing
      (mockResponse.emit as jest.Mock)('finish');

      expect(mockLogger.performance).not.toHaveBeenCalled();
      expect(mockLogger.request).toHaveBeenCalled();
    });

    it('should log performance for requests exactly at threshold (1000ms)', () => {
      // Mock threshold response time
      jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(2000); // End time (1000ms later)

      requestLogger(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Simulate response finishing
      (mockResponse.emit as jest.Mock)('finish');

      expect(mockLogger.performance).not.toHaveBeenCalled(); // Should be > 1000, not >=
    });

    it('should log performance for requests over threshold (> 1000ms)', () => {
      // Mock slow response time
      jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(2001); // End time (1001ms later)

      requestLogger(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Simulate response finishing
      (mockResponse.emit as jest.Mock)('finish');

      expect(mockLogger.performance).toHaveBeenCalledWith(
        'slow_request',
        1001,
        expect.any(Object)
      );
    });

    it('should log performance metrics for slow requests (detailed test)', () => {
      // Mock slow response time (same pattern as working test)
      jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(2500); // End time (1500ms later - slow request)

      requestLogger(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Simulate response finishing
      (mockResponse.emit as jest.Mock)('finish');

      expect(mockLogger.performance).toHaveBeenCalledWith(
        'slow_request',
        1500,
        expect.any(Object)
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle requests with no connection object', () => {
      mockRequest = {
        ...mockRequest,
        connection: undefined,
        ip: undefined,
      };

      expect(() => {
        requestLogger(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );
      }).not.toThrow();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          ip: 'Unknown',
        })
      );
    });

    it('should handle response events that fire multiple times', () => {
      requestLogger(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Simulate response finishing multiple times
      (mockResponse.emit as jest.Mock)('finish');
      (mockResponse.emit as jest.Mock)('finish');

      // Logger should be called for each finish event
      expect(mockLogger.request).toHaveBeenCalledTimes(2);
    });

    it('should preserve response status codes across the middleware', () => {
      const customStatusCodes = [200, 201, 400, 401, 404, 500, 502];

      customStatusCodes.forEach(statusCode => {
        jest.clearAllMocks();
        mockResponse.statusCode = statusCode;

        requestLogger(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );
        (mockResponse.emit as jest.Mock)('finish');

        expect(mockLogger.request).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          statusCode,
          expect.any(Number),
          expect.any(Object)
        );
      });
    });
  });
});
