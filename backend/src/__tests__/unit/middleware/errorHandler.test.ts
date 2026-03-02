import { Request, Response, NextFunction } from 'express';
import { AppError, globalErrorHandler } from '../../../middleware/errorHandler';

describe('Error Handler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      url: '/test',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent')
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('AppError', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError('Test error', 400);
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.stack).toBeDefined();
    });

    it('should use default statusCode when not provided', () => {
      const error = new AppError('Default error');
      
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });

    it('should handle custom isOperational flag', () => {
      const error = new AppError('Non-operational error', 500, false);
      
      expect(error.isOperational).toBe(false);
    });
  });

  describe('globalErrorHandler', () => {
    beforeEach(() => {
      // Mock environment
      process.env.NODE_ENV = 'test';
    });

    it('should handle AppError correctly', () => {
      const error = new AppError('Custom error', 404);

      globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Custom error'
        })
      );
    });

    it('should handle generic errors in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Generic error');

      globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Something went wrong!'
        })
      );
    });

    it('should handle generic errors in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Generic error');

      globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          error: expect.objectContaining({
            message: 'Generic error',
            statusCode: 500,
            stack: expect.any(String)
          })
        })
      );
    });

    it('should handle non-operational AppErrors in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new AppError('Programming error', 500, false);

      globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Something went wrong!'
        })
      );
    });

    it('should log all errors', () => {
      const error = new AppError('Test error', 400);
      const loggerSpy = jest.spyOn(require('../../../utils/logger').logger, 'error');

      globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(loggerSpy).toHaveBeenCalledWith('Error occurred', expect.objectContaining({
        message: 'Test error',
        statusCode: 400,
        isOperational: true
      }));
      
      loggerSpy.mockRestore();
    });

    afterEach(() => {
      // Restore environment
      delete process.env.NODE_ENV;
    });
  });
});