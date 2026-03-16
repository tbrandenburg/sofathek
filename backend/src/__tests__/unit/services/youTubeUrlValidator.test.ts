import { YouTubeUrlValidator } from '../../../services/youTubeUrlValidator';

describe('YouTubeUrlValidator', () => {
  let validator: YouTubeUrlValidator;

  beforeEach(() => {
    validator = new YouTubeUrlValidator();
  });

  describe('validate', () => {
    it('should validate correct YouTube URLs', async () => {
      expect(await validator.validate('https://www.youtube.com/watch?v=test123abc')).toBe(true);
      expect(await validator.validate('https://youtu.be/test123abc')).toBe(true);
      expect(await validator.validate('https://youtube.com/watch?v=test123abc')).toBe(true);
      expect(await validator.validate('https://www.youtube.com/embed/test123abc')).toBe(true);
    });

    it('should reject invalid URLs', async () => {
      expect(await validator.validate('https://example.com')).toBe(false);
      expect(await validator.validate('not-a-url')).toBe(false);
      expect(await validator.validate('https://vimeo.com/123456')).toBe(false);
      expect(await validator.validate('')).toBe(false);
    });

    it('should handle validation errors gracefully', async () => {
      // Test with null/undefined - should return false rather than throw
      expect(await validator.validate(null as any)).toBe(false);
      expect(await validator.validate(undefined as any)).toBe(false);
    });
  });
});