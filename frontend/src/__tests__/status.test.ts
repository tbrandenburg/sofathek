import { describe, test, expect } from 'vitest';
import { getStatusColor } from '../lib/status';

describe('frontend status utilities', () => {
  describe('getStatusColor', () => {
    test('should return correct color for pending status', () => {
      expect(getStatusColor('pending')).toBe('bg-gray-100 text-gray-800');
    });

    test('should return correct color for processing status', () => {
      expect(getStatusColor('processing')).toBe('bg-blue-100 text-blue-800');
    });

    test('should return correct color for completed status', () => {
      expect(getStatusColor('completed')).toBe('bg-green-100 text-green-800');
    });

    test('should return correct color for failed status', () => {
      expect(getStatusColor('failed')).toBe('bg-red-100 text-red-800');
    });

    test('should return correct color for cancelled status', () => {
      expect(getStatusColor('cancelled')).toBe('bg-orange-100 text-orange-800');
    });

    test('should return default color for unknown status', () => {
      expect(getStatusColor('unknown' as any)).toBe('bg-gray-100 text-gray-800');
    });
  });
});