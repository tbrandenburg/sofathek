import { containsShellMetacharacters } from '../types/youtube';
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

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        logger.warn('URL is not a valid absolute URL', { url });
        return false;
      }

      const isHttpProtocol = parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
      if (!isHttpProtocol) {
        logger.warn('URL must use HTTP or HTTPS protocol', { url, protocol: parsedUrl.protocol });
        return false;
      }

      if (!parsedUrl.hostname) {
        logger.warn('URL must contain a hostname', { url });
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