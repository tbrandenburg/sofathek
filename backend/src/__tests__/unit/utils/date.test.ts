import { now, nowISO, nowTimestamp } from '../../../utils/date';

describe('date utilities', () => {
  describe('now', () => {
    it('should return current Date object', () => {
      const result = now();
      expect(result).toBeInstanceOf(Date);
    });

    it('should return time close to current time', () => {
      const before = Date.now();
      const result = now();
      const after = Date.now();
      expect(result.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('nowISO', () => {
    it('should return ISO string format', () => {
      const result = nowISO();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it('should return valid ISO timestamp', () => {
      const result = nowISO();
      const parsed = Date.parse(result);
      expect(parsed).not.toBeNaN();
    });
  });

  describe('nowTimestamp', () => {
    it('should return number', () => {
      const result = nowTimestamp();
      expect(typeof result).toBe('number');
    });

    it('should return current timestamp', () => {
      const before = Date.now();
      const result = nowTimestamp();
      const after = Date.now();
      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });
  });
});