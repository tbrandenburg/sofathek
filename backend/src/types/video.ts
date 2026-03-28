/**
 * Video file system data structure
 */
export interface VideoFile {
  /**
   * Internal: Full file system path to the video
   * NOT exposed via API - use streamUrl for public access
   */
  path: string;
  /** Filename with extension */
  name: string;
  /** File size in bytes */
  size: number;
  /** File extension (e.g., 'mp4', 'webm') */
  extension: string;
  /** Last modified timestamp */
  lastModified: Date;
}

/**
 * Video metadata extracted from file or filename
 */
export interface VideoMetadata {
  /** Display title for the video */
  title: string;
  /** Video duration in seconds (if available) */
  duration?: number;
  /** Video resolution width */
  width?: number;
  /** Video resolution height */
  height?: number;
  /** Video format/codec information */
  format?: string;
  /** Video bitrate */
  bitrate?: number;
  /** Thumbnail file name (relative to videos directory) */
  thumbnail?: string;
  /** Matching downloaded audio file name (relative to videos directory) */
  audio?: string;
  /** Matching subtitle files (relative to videos directory) */
  transcripts?: TranscriptFile[];
}

/**
 * Transcript file metadata discovered next to a video file
 */
export interface TranscriptFile {
  /** Language code (e.g. en, de, sv, unknown) */
  language: string;
  /** Subtitle filename (relative to videos directory) */
  file: string;
}

/**
 * Rich video metadata stored in sidecar .info.json file.
 * Mirrors yt-dlp's --write-info-json output, filtered to useful fields.
 */
export interface VideoInfoFile {
  // Source
  sourceUrl: string;
  extractor: string;
  // Identity
  id: string;
  title: string;
  description?: string;
  // Channel
  uploader?: string;
  uploaderId?: string;
  channelId?: string;
  channelUrl?: string;
  channelFollowerCount?: number;
  channelIsVerified?: boolean;
  // Temporal
  uploadDate?: string;
  timestamp?: number;
  releaseYear?: number;
  // Playback
  duration?: number;
  durationString?: string;
  width?: number;
  height?: number;
  resolution?: string;
  fps?: number;
  aspectRatio?: number;
  dynamicRange?: string;
  vcodec?: string;
  acodec?: string;
  vbr?: number;
  abr?: number;
  tbr?: number;
  asr?: number;
  audioChannels?: number;
  filesizeApprox?: number;
  // Engagement
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  // Classification
  categories?: string[];
  tags?: string[];
  ageLimit?: number;
  language?: string;
  availability?: string;
  // Status
  isLive?: boolean;
  wasLive?: boolean;
  liveStatus?: string;
  playableInEmbed?: boolean;
  // Chapters & heatmap
  chapters?: Array<{ title: string; start_time: number; end_time: number }>;
  heatmap?: Array<{ start_time: number; end_time: number; value: number }>;
  // Local files (set at write time)
  localThumbnail?: string;
  downloadedAt: string;
}

/**
 * Complete video information combining file and metadata
 */
export interface Video {
  /** Unique identifier (typically filename without extension) */
  id: string;
  /** File system information */
  file: VideoFile;
  /** Video metadata */
  metadata: VideoMetadata;
  /** View count for statistics */
  viewCount: number;
  /** Last viewed timestamp */
  lastViewed?: Date;
}

/**
 * Video streaming range request information
 */
export interface VideoRange {
  /** Start byte position */
  start: number;
  /** End byte position */
  end: number;
  /** Total file size */
  total: number;
}

/**
 * Video discovery scan result
 */
export interface VideoScanResult {
  /** Array of discovered videos */
  videos: Video[];
  /** Total number of videos found */
  totalCount: number;
  /** Total size of all videos in bytes */
  totalSize: number;
  /** Scan timestamp */
  scannedAt: Date;
  /** Any errors encountered during scan */
  errors?: string[];
}

/**
 * Supported video file extensions
 */
export const SUPPORTED_VIDEO_EXTENSIONS = [
  'mp4',
  'webm',
  'avi',
  'mkv',
  'mov',
  'wmv',
  'flv',
  'm4v'
] as const;

export type SupportedVideoExtension = typeof SUPPORTED_VIDEO_EXTENSIONS[number];
