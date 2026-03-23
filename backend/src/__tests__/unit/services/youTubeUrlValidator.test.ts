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

  describe('SSRF prevention', () => {
    it('should reject localhost URLs', async () => {
      expect(await validator.validate('http://localhost:8080/admin')).toBe(false);
      expect(await validator.validate('http://localhost/api')).toBe(false);
      expect(await validator.validate('https://localhost.localdomain/secret')).toBe(false);
    });

    it('should reject private IP addresses', async () => {
      const privateIps = [
        'http://127.0.0.1/admin',
        'http://127.0.0.1:8080/manage',
        'http://10.0.0.1/internal',
        'http://172.16.0.1/api',
        'http://172.31.255.1/admin',
        'http://192.168.1.1/router',
        'http://169.254.0.1/link-local',
      ];
      for (const url of privateIps) {
        expect(await validator.validate(url)).toBe(false);
      }
    });

    it('should reject .local domain names', async () => {
      expect(await validator.validate('http://printer.local/admin')).toBe(false);
      expect(await validator.validate('http://nas.localdomain/config')).toBe(false);
    });
  });

  describe('URL-encoded injection prevention', () => {
    it('should reject URL-encoded shell metacharacters', async () => {
      const encodedMaliciousUrls = [
        'https://youtube.com/watch?v=test%3B%20rm%20-rf%20%2F',
        'https://youtube.com/watch?v=test%26%26%20cat%20%2Fetc%2Fpasswd',
        'https://youtube.com/watch?v=test%7C%20ls%20-la',
        'https://youtube.com/watch?v=test%60whoami%60',
        'https://youtube.com/watch?v=test%24(whoami)',
      ];
      for (const url of encodedMaliciousUrls) {
        expect(await validator.validate(url)).toBe(false);
      }
    });
  });

  describe('edge cases', () => {
    it('should reject URLs with null bytes', async () => {
      expect(await validator.validate('https://youtube.com/watch?v=test%00 malicious')).toBe(false);
    });

    it('should reject URLs with newlines', async () => {
      expect(await validator.validate('https://youtube.com/watch?v=test\nmalicious')).toBe(false);
    });

    it('should handle IPv6 addresses appropriately', async () => {
      expect(await validator.validate('http://[::1]/admin')).toBe(false);
      expect(await validator.validate('http://[fe80::1]/link-local')).toBe(false);
    });
  });
});