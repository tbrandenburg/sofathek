import { Request, Response, NextFunction } from 'express';
import { createRateLimiter, rateLimitMiddleware } from '../../../middleware/rateLimiter';

describe('RateLimiter', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;
  let createdLimiters: any[] = [];

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
    createdLimiters = [];
  });

  afterEach(() => {
    // Clean up all rate limiters created in tests
    createdLimiters.forEach(limiter => {
      if (limiter && typeof limiter.destroy === 'function') {
        limiter.destroy();
      }
    });
    createdLimiters = [];
  });

  describe('within limit', () => {
    it('should allow requests under the limit', () => {
      const limiter = createRateLimiter(5, 60000);
      createdLimiters.push(limiter);
      const middleware = rateLimitMiddleware(limiter);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('exceeding limit', () => {
    it('should block requests over the limit with 429', () => {
      const limiter = createRateLimiter(2, 60000);
      createdLimiters.push(limiter);
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
      const limiter = createRateLimiter(1, 60000);
      createdLimiters.push(limiter);
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
});