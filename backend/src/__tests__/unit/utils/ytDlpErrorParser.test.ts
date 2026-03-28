import { parseYtDlpError } from '../../../utils/ytDlpErrorParser';

describe('parseYtDlpError', () => {
  describe('VIDEO_UNAVAILABLE', () => {
    it('should detect "video unavailable" errors', () => {
      const result = parseYtDlpError('ERROR: Video unavailable');
      expect(result.code).toBe('VIDEO_UNAVAILABLE');
      expect(result.message).toContain('not available');
    });

    it('should detect "is not available" errors', () => {
      const result = parseYtDlpError('ERROR: This video is not available');
      expect(result.code).toBe('VIDEO_UNAVAILABLE');
    });

    it('should detect HTTP Error 404', () => {
      const result = parseYtDlpError(
        'ERROR: Unable to download webpage: HTTP Error 404: Not Found'
      );
      expect(result.code).toBe('VIDEO_UNAVAILABLE');
    });

    it('should be case-insensitive', () => {
      const result = parseYtDlpError('ERROR: VIDEO UNAVAILABLE');
      expect(result.code).toBe('VIDEO_UNAVAILABLE');
    });
  });

  describe('AGE_RESTRICTED', () => {
    it('should detect age-restricted errors', () => {
      const result = parseYtDlpError('ERROR: age-restricted content');
      expect(result.code).toBe('AGE_RESTRICTED');
      expect(result.message).toContain('age-restricted');
    });

    it('should detect age limit errors', () => {
      const result = parseYtDlpError('ERROR: Video has an age limit');
      expect(result.code).toBe('AGE_RESTRICTED');
    });
  });

  describe('REGION_BLOCKED', () => {
    it('should detect geographic restriction errors', () => {
      const result = parseYtDlpError('ERROR: geographic restriction applies');
      expect(result.code).toBe('REGION_BLOCKED');
      expect(result.message).toContain('region');
    });

    it('should detect "not available in your country" errors', () => {
      const result = parseYtDlpError(
        'ERROR: The uploader has not made this video available in your country'
      );
      expect(result.code).toBe('REGION_BLOCKED');
    });

    it('should detect "not available in the current country" errors', () => {
      const result = parseYtDlpError('ERROR: This video is not available in the current country');
      expect(result.code).toBe('REGION_BLOCKED');
    });
  });

  describe('LOGIN_REQUIRED', () => {
    it('should detect login required errors', () => {
      const result = parseYtDlpError('ERROR: login required');
      expect(result.code).toBe('LOGIN_REQUIRED');
      expect(result.message).toContain('signed in');
    });

    it('should detect sign-in confirmation errors', () => {
      const result = parseYtDlpError('ERROR: sign in to confirm your age');
      expect(result.code).toBe('LOGIN_REQUIRED');
    });
  });

  describe('RATE_LIMITED', () => {
    it('should detect HTTP 429 errors', () => {
      const result = parseYtDlpError(
        "ERROR: Unable to download video subtitles for 'sv-en': HTTP Error 429: Too Many Requests"
      );
      expect(result.code).toBe('RATE_LIMITED');
      expect(result.message).toContain('rate-limiting');
    });

    it('should detect "too many requests" errors', () => {
      const result = parseYtDlpError('ERROR: too many requests from your IP');
      expect(result.code).toBe('RATE_LIMITED');
    });
  });

  describe('NETWORK_ERROR', () => {
    it('should detect HTTP error responses', () => {
      const result = parseYtDlpError('ERROR: Unable to download webpage: HTTP Error 503');
      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.message).toContain('connect');
    });

    it('should detect connection errors', () => {
      const result = parseYtDlpError('ERROR: connection error: timed out');
      expect(result.code).toBe('NETWORK_ERROR');
    });

    it('should detect timed out errors', () => {
      const result = parseYtDlpError('ERROR: download timed out after 30s');
      expect(result.code).toBe('NETWORK_ERROR');
    });
  });

  describe('DOWNLOAD_FAILED (fallback)', () => {
    it('should return fallback for unknown errors', () => {
      const result = parseYtDlpError('Some random yt-dlp error we do not recognise');
      expect(result.code).toBe('DOWNLOAD_FAILED');
    });

    it('should return fallback for empty stderr', () => {
      const result = parseYtDlpError('');
      expect(result.code).toBe('DOWNLOAD_FAILED');
    });

    it('should include a suggestion in fallback', () => {
      const result = parseYtDlpError('');
      expect(result.suggestion).toBeTruthy();
    });
  });

  describe('returned shape', () => {
    it('should always return code, message, and suggestion', () => {
      const result = parseYtDlpError('ERROR: Video unavailable');
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('suggestion');
    });

    it('should return non-empty strings for all fields', () => {
      const result = parseYtDlpError('anything');
      expect(result.code.length).toBeGreaterThan(0);
      expect(result.message.length).toBeGreaterThan(0);
      expect(result.suggestion.length).toBeGreaterThan(0);
    });
  });
});
