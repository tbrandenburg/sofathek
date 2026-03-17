import { describe, test, expect } from 'vitest';
import { getErrorMessage } from '../lib/error';

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
});