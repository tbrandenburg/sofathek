import youtubedl from 'youtube-dl-exec';
import { getErrorMessage } from '../utils/error';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { YouTubeMetadata } from '../types/youtube';
import { validateYtDlpResponse } from '../utils/validation';
import { parseYtDlpError } from '../utils/ytDlpErrorParser';

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
      if (!processResult.stdout?.trim()) {
        throw new AppError('yt-dlp returned empty stdout — no JSON metadata received', 500);
      }
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
      if (metadata.uploader_id !== undefined) result.uploaderId = metadata.uploader_id;
      if (metadata.channel_id !== undefined) result.channelId = metadata.channel_id;
      if (metadata.channel_url !== undefined) result.channelUrl = metadata.channel_url;
      if (metadata.channel_follower_count !== undefined) result.channelFollowerCount = metadata.channel_follower_count;
      if (metadata.channel_is_verified !== undefined) result.channelIsVerified = metadata.channel_is_verified;
      if (metadata.upload_date !== undefined) result.uploadDate = metadata.upload_date;
      if (metadata.timestamp !== undefined) result.timestamp = metadata.timestamp;
      if (metadata.view_count !== undefined) result.viewCount = metadata.view_count;
      if (metadata.like_count !== undefined) result.likeCount = metadata.like_count;
      if (metadata.comment_count !== undefined) result.commentCount = metadata.comment_count;
      if (metadata.width !== undefined) result.width = metadata.width;
      if (metadata.height !== undefined) result.height = metadata.height;
      if (metadata.resolution !== undefined) result.resolution = metadata.resolution;
      if (metadata.fps !== undefined) result.fps = metadata.fps;
      if (metadata.aspect_ratio !== undefined) result.aspectRatio = metadata.aspect_ratio;
      if (metadata.dynamic_range !== undefined) result.dynamicRange = metadata.dynamic_range;
      if (metadata.vcodec !== undefined) result.vcodec = metadata.vcodec;
      if (metadata.acodec !== undefined) result.acodec = metadata.acodec;
      if (metadata.vbr !== undefined) result.vbr = metadata.vbr;
      if (metadata.abr !== undefined) result.abr = metadata.abr;
      if (metadata.tbr !== undefined) result.tbr = metadata.tbr;
      if (metadata.asr !== undefined) result.asr = metadata.asr;
      if (metadata.audio_channels !== undefined) result.audioChannels = metadata.audio_channels;
      if (metadata.filesize_approx !== undefined) result.filesizeApprox = metadata.filesize_approx;
      if (metadata.categories !== undefined) result.categories = metadata.categories;
      if (metadata.tags !== undefined) result.tags = metadata.tags;
      if (metadata.age_limit !== undefined) result.ageLimit = metadata.age_limit;
      if (metadata.language !== undefined) result.language = metadata.language;
      if (metadata.availability !== undefined) result.availability = metadata.availability;
      if (metadata.is_live !== undefined) result.isLive = metadata.is_live;
      if (metadata.was_live !== undefined) result.wasLive = metadata.was_live;
      if (metadata.live_status !== undefined) result.liveStatus = metadata.live_status;
      if (metadata.playable_in_embed !== undefined) result.playableInEmbed = metadata.playable_in_embed;
      if (metadata.thumbnail !== undefined) result.thumbnailUrl = metadata.thumbnail;
      if (metadata.webpage_url !== undefined) result.webpageUrl = metadata.webpage_url;

      return result;

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      const errorMessage = getErrorMessage(error);
      const stderrMessage = stderrOutput.trim();

      logger.error('Failed to get video metadata', {
        url,
        error: errorMessage,
        stderr: stderrMessage
      });

      // Parse yt-dlp error for user-friendly message
      const errorInfo = parseYtDlpError(stderrMessage);

      // Log the parsed error type for debugging
      logger.info('Categorized yt-dlp error', { url, errorCode: errorInfo.code });

      // Throw with user-friendly message derived from yt-dlp output
      throw new AppError(`${errorInfo.message} ${errorInfo.suggestion}`, 500, true, errorInfo.code);
    }
  }
}