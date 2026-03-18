import { describe, test, expect } from 'vitest';
import { getErrorMessage, isNetworkError, getUserFriendlyErrorMessage } from '../lib/error';
import { ApiError } from '../services/api';

describe('frontend error utilities', () => {
  describe('getErrorMessage', () => {
    test('should extract message from Error instance', () => {
      const error = new Error('Test error message');
      expect(getErrorMessage(error)).toBe('Test error message');
    });

    test('should convert string to string', () => {
      expect(getErrorMessage('string error')).toBe('string error');
    });

    test('should convert number to string', () => {
      expect(getErrorMessage(123)).toBe('123');
    });

    test('should convert null to "null"', () => {
      expect(getErrorMessage(null)).toBe('null');
    });

    test('should convert undefined to "undefined"', () => {
      expect(getErrorMessage(undefined)).toBe('undefined');
    });

    test('should convert object to string', () => {
      expect(getErrorMessage({ key: 'value' })).toBe('[object Object]');
    });

    test('should handle empty string', () => {
      expect(getErrorMessage('')).toBe('');
    });

    test('should handle custom error subclasses', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }
      const error = new CustomError('Custom message');
      expect(getErrorMessage(error)).toBe('Custom message');
    });
  });

  describe('isNetworkError', () => {
    test('should return true for ApiError with status 0', () => {
      expect(isNetworkError(new ApiError('Failed', 0))).toBe(true);
    });

    test('should return false for ApiError with status 500', () => {
      expect(isNetworkError(new ApiError('Failed', 500))).toBe(false);
    });

    test('should return true for Error with "Failed to fetch" message', () => {
      expect(isNetworkError(new Error('Failed to fetch'))).toBe(true);
    });

    test('should return true for Error with case-insensitive network error messages', () => {
      expect(isNetworkError(new Error('NetworkError: Failed to load'))).toBe(true);
      expect(isNetworkError(new Error('net::ERR_INTERNET_DISCONNECTED'))).toBe(true);
    });

    test('should return false for non-network errors', () => {
      expect(isNetworkError(new Error('Server error'))).toBe(false);
      expect(isNetworkError('string error')).toBe(false);
      expect(isNetworkError(null)).toBe(false);
    });
  });

  describe('getUserFriendlyErrorMessage', () => {
    test('should return "unavailable" message for network errors', () => {
      const msg = getUserFriendlyErrorMessage(new ApiError('Failed', 0));
      expect(msg).toContain('unavailable');
    });

    test('should return original message for server errors', () => {
      const msg = getUserFriendlyErrorMessage(new ApiError('Server Error', 500));
      expect(msg).toBe('Server Error');
    });

    test('should return friendly message for generic network errors', () => {
      const msg = getUserFriendlyErrorMessage(new Error('Failed to fetch'));
      expect(msg).toContain('Backend server unavailable');
    });

    test('should return original message for non-network errors', () => {
      const msg = getUserFriendlyErrorMessage(new Error('Validation failed'));
      expect(msg).toBe('Validation failed');
    });
  });
});