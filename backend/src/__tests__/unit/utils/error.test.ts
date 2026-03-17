import { getErrorMessage } from '../../../utils/error';

describe('error utilities', () => {
  describe('getErrorMessage', () => {
    it('should extract message from Error instance', () => {
      const error = new Error('Test error message');
      expect(getErrorMessage(error)).toBe('Test error message');
    });

    it('should convert string to string', () => {
      expect(getErrorMessage('string error')).toBe('string error');
    });

    it('should convert number to string', () => {
      expect(getErrorMessage(123)).toBe('123');
    });

    it('should convert null to "null"', () => {
      expect(getErrorMessage(null)).toBe('null');
    });

    it('should convert undefined to "undefined"', () => {
      expect(getErrorMessage(undefined)).toBe('undefined');
    });

    it('should convert object to string', () => {
      expect(getErrorMessage({ key: 'value' })).toBe('[object Object]');
    });

    it('should handle empty string', () => {
      expect(getErrorMessage('')).toBe('');
    });

    it('should handle custom error subclasses', () => {
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