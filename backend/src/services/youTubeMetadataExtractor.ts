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

      // Only add optional properties if they exist and are not null/undefined
      if (metadata.description != null) result.description = metadata.description;
      if (metadata.duration != null) result.duration = metadata.duration;
      if (metadata.uploader != null) {
        result.uploader = metadata.uploader;
      } else if (metadata.channel != null) {
        result.uploader = metadata.channel;
      }
      if (metadata.uploader_id != null) result.uploaderId = metadata.uploader_id;
      if (metadata.channel_id != null) result.channelId = metadata.channel_id;
      if (metadata.channel_url != null) result.channelUrl = metadata.channel_url;
      if (metadata.channel_follower_count != null) result.channelFollowerCount = metadata.channel_follower_count;
      if (metadata.channel_is_verified != null) result.channelIsVerified = metadata.channel_is_verified;
      if (metadata.upload_date != null) result.uploadDate = metadata.upload_date;
      if (metadata.timestamp != null) result.timestamp = metadata.timestamp;
      if (metadata.view_count != null) result.viewCount = metadata.view_count;
      if (metadata.like_count != null) result.likeCount = metadata.like_count;
      if (metadata.comment_count != null) result.commentCount = metadata.comment_count;
      if (metadata.width != null) result.width = metadata.width;
      if (metadata.height != null) result.height = metadata.height;
      if (metadata.resolution != null) result.resolution = metadata.resolution;
      if (metadata.fps != null) result.fps = metadata.fps;
      if (metadata.aspect_ratio != null) result.aspectRatio = metadata.aspect_ratio;
      if (metadata.dynamic_range != null) result.dynamicRange = metadata.dynamic_range;
      if (metadata.vcodec != null) result.vcodec = metadata.vcodec;
      if (metadata.acodec != null) result.acodec = metadata.acodec;
      if (metadata.vbr != null) result.vbr = metadata.vbr;
      if (metadata.abr != null) result.abr = metadata.abr;
      if (metadata.tbr != null) result.tbr = metadata.tbr;
      if (metadata.asr != null) result.asr = metadata.asr;
      if (metadata.audio_channels != null) result.audioChannels = metadata.audio_channels;
      if (metadata.filesize_approx != null) result.filesizeApprox = metadata.filesize_approx;
      if (metadata.categories != null) result.categories = metadata.categories;
      if (metadata.tags != null) result.tags = metadata.tags;
      if (metadata.age_limit != null) result.ageLimit = metadata.age_limit;
      if (metadata.language != null) result.language = metadata.language;
      if (metadata.availability != null) result.availability = metadata.availability;
      if (metadata.is_live != null) result.isLive = metadata.is_live;
      if (metadata.was_live != null) result.wasLive = metadata.was_live;
      if (metadata.live_status != null) result.liveStatus = metadata.live_status;
      if (metadata.playable_in_embed != null) result.playableInEmbed = metadata.playable_in_embed;
      if (metadata.thumbnail != null) result.thumbnailUrl = metadata.thumbnail;
      if (metadata.webpage_url != null) result.webpageUrl = metadata.webpage_url;

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