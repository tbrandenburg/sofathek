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