import youtubedl from 'youtube-dl-exec';
import { getErrorMessage } from '../utils/error';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { YouTubeMetadata } from '../types/youtube';
import { validateYtDlpResponse } from '../utils/validation';

export class YouTubeMetadataExtractor {
  async extract(url: string): Promise<YouTubeMetadata> {
    let stderrOutput = '';

    try {
      logger.info('Fetching video metadata', { url });

      const subprocess = youtubedl.exec(url, {
        dumpSingleJson: true,
        skipDownload: true,
        noCheckCertificates: true,
        jsRuntimes: 'node'
      });

      subprocess.stderr?.on('data', (data) => {
        stderrOutput += data.toString();
      });

      const processResult = await subprocess;
      const rawMetadata = JSON.parse(processResult.stdout);
      const metadata = validateYtDlpResponse(rawMetadata);

      const result: YouTubeMetadata = {
        id: metadata.id || uuidv4(),
        title: metadata.title || 'Unknown Title'
      };

      // Only add optional properties if they exist and are not undefined
      if (metadata.description !== undefined) result.description = metadata.description;
      if (metadata.duration !== undefined) result.duration = metadata.duration;
      if (metadata.uploader !== undefined) {
        result.uploader = metadata.uploader;
      } else if (metadata.channel !== undefined) {
        result.uploader = metadata.channel;
      }
      if (metadata.upload_date !== undefined) result.uploadDate = metadata.upload_date;
      if (metadata.view_count !== undefined) result.viewCount = metadata.view_count;
      if (metadata.format !== undefined) result.format = metadata.format;
      if (metadata.width !== undefined) result.width = metadata.width;
      if (metadata.height !== undefined) result.height = metadata.height;
      if (metadata.thumbnail !== undefined) result.thumbnailUrl = metadata.thumbnail;

      return result;

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      const stderrMessage = stderrOutput.trim();
      const detailedMessage = stderrMessage
        ? `${errorMessage || 'yt-dlp metadata fetch failed'} (stderr: ${stderrMessage})`
        : errorMessage;

      logger.error('Failed to get video metadata', { url, error: detailedMessage });
      throw new AppError(`Failed to get video metadata: ${detailedMessage}`, 500);
    }
  }
}