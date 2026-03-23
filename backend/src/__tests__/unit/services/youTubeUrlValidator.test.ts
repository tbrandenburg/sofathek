import { YouTubeUrlValidator } from '../../../services/youTubeUrlValidator';

describe('YouTubeUrlValidator', () => {
  let validator: YouTubeUrlValidator;

  beforeEach(() => {
    validator = new YouTubeUrlValidator();
  });

  describe('validate', () => {
    it('should validate supported video URLs', async () => {
      expect(await validator.validate('https://www.youtube.com/watch?v=test123abc')).toBe(true);
      expect(await validator.validate('https://youtu.be/test123abc')).toBe(true);
      expect(await validator.validate('https://youtube.com/watch?v=test123abc')).toBe(true);
      expect(await validator.validate('https://www.youtube.com/embed/test123abc')).toBe(true);
    });

    it('should reject invalid URLs', async () => {
      expect(await validator.validate('https://example.com')).toBe(true);
      expect(await validator.validate('not-a-url')).toBe(false);
      expect(await validator.validate('https://vimeo.com/123456')).toBe(true);
      expect(await validator.validate('')).toBe(false);
    });

    it('should handle validation errors gracefully', async () => {
      // Test with null/undefined - should return false rather than throw
      expect(await validator.validate(null as any)).toBe(false);
      expect(await validator.validate(undefined as any)).toBe(false);
    });

    it('should reject URLs with shell metacharacters - command injection prevention', async () => {
      const maliciousUrls = [
        'https://www.youtube.com/watch?v=test; rm -rf /tmp/*',
        'https://www.youtube.com/watch?v=test && cat /etc/passwd',
        'https://www.youtube.com/watch?v=test | ls -la',
        'https://www.youtube.com/watch?v=test`whoami`',
        'https://www.youtube.com/watch?v=test$(whoami)',
        'https://www.youtube.com/watch?v=test;curl attacker.com',
        'https://www.youtube.com/watch?v=test"><script>alert(1)</script>',
        'https://youtu.be/test;rm -rf /'
      ];
      
      for (const url of maliciousUrls) {
        expect(await validator.validate(url)).toBe(false);
      }
    });

    it('should reject URLs exceeding maximum length', async () => {
      const longUrl = 'https://example.com/watch?v=test' + 'a'.repeat(2000);
      expect(await validator.validate(longUrl)).toBe(false);
    });
  });
});