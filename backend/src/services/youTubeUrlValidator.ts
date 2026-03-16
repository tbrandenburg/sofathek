import { YOUTUBE_URL_PATTERNS } from '../types/youtube';
import { logger } from '../utils/logger';

export class YouTubeUrlValidator {
  async validate(url: string): Promise<boolean> {
    try {
      const isValidFormat = YOUTUBE_URL_PATTERNS.some(pattern => pattern.test(url));
      
      if (!isValidFormat) {
        logger.warn('URL does not match YouTube patterns', { url });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('URL validation failed', {
        url,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
}