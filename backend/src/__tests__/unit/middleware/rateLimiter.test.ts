import { Request, Response, NextFunction } from 'express';
import { createRateLimiter, rateLimitMiddleware, RateLimiter } from '../../../middleware/rateLimiter';

describe('RateLimiter', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;
  let testLimiters: RateLimiter[] = [];

  beforeEach(() => {
    mockReq = {
      ip: '192.168.1.1',
      path: '/api/youtube/download',
      socket: {
        remoteAddress: '192.168.1.1'
      } as any
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  afterEach(() => {
    // Clean up any test rate limiters
    testLimiters.forEach(limiter => limiter.close());
    testLimiters = [];
  });

  const createTestLimiter = (maxRequests: number, windowMs: number): RateLimiter => {
    const limiter = createRateLimiter(maxRequests, windowMs);
    testLimiters.push(limiter);
    return limiter;
  };

  describe('within limit', () => {
    it('should allow requests under the limit', () => {
      const limiter = createTestLimiter(5, 60000);
      const middleware = rateLimitMiddleware(limiter);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('exceeding limit', () => {
    it('should block requests over the limit with 429', () => {
      const limiter = createTestLimiter(2, 60000);
      const middleware = rateLimitMiddleware(limiter);

      // Make 2 requests (at limit)
      middleware(mockReq as Request, mockRes as Response, mockNext);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Third request should be blocked
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(3);
      const error = (mockNext as any).mock.calls[2][0];
      expect(error.statusCode).toBe(429);
      expect(error.message).toContain('Rate limit exceeded');
    });
  });

  describe('different IPs', () => {
    it('should track limits separately per IP', () => {
      const limiter = createTestLimiter(1, 60000);
      const middleware = rateLimitMiddleware(limiter);

      // First IP makes request
      (mockReq as any).ip = '192.168.1.1';
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Different IP should still be allowed
      (mockReq as any).ip = '192.168.1.2';
      mockNext.mockClear();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('cleanup', () => {
    it('should clear interval on close', () => {
      const limiter = createTestLimiter(5, 60000);
      
      // Verify interval is created
      expect((limiter as any).cleanupIntervalId).not.toBeNull();
      
      // Close the limiter
      limiter.close();
      
      // Verify interval is cleared
      expect((limiter as any).cleanupIntervalId).toBeNull();
    });

    it('should handle multiple close calls safely', () => {
      const limiter = createTestLimiter(5, 60000);
      
      // First close
      limiter.close();
      expect((limiter as any).cleanupIntervalId).toBeNull();
      
      // Second close should not throw
      expect(() => limiter.close()).not.toThrow();
    });
  });
});