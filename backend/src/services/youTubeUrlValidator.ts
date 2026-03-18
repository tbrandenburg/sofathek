import { YOUTUBE_URL_PATTERNS, containsShellMetacharacters } from '../types/youtube';
import { getErrorMessage } from '../utils/error';
import { logger } from '../utils/logger';

export class YouTubeUrlValidator {
  async validate(url: string): Promise<boolean> {
    try {
      if (!url || typeof url !== 'string') {
        return false;
      }

      if (url.length > 2000) {
        logger.warn('URL exceeds maximum length', { url });
        return false;
      }

      if (containsShellMetacharacters(url)) {
        logger.warn('URL contains shell metacharacters - potential injection attempt', { url });
        return false;
      }

      const isValidFormat = YOUTUBE_URL_PATTERNS.some(pattern => pattern.test(url));
      
      if (!isValidFormat) {
        logger.warn('URL does not match YouTube patterns', { url });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('URL validation failed', {
        url,
        error: getErrorMessage(error)
      });
      return false;
    }
  }
}