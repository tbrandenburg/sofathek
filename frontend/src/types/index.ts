// Re-export backend video types for frontend use

/**
 * File system information for a video file
 */
export interface VideoFile {
  /** Full file system path to the video */
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
  /** Thumbnail file path (relative to videos directory) */
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
 * Video discovery scan result from API
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

// Frontend-specific types

/**
 * Props for VideoGrid component
 */
export interface VideoGridProps {
  /** Array of videos to display */
  videos: Video[];
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: string | null;
  /** Callback when video is selected */
  onVideoSelect?: (video: Video) => void;
  /** CSS class name for styling */
  className?: string;
}

/**
 * Props for VideoCard component  
 */
export interface VideoCardProps {
  /** Video data to display */
  video: Video;
  /** Callback when card is clicked */
  onClick?: (video: Video) => void;
  /** Show metadata like duration, file size */
  showMetadata?: boolean;
  /** CSS class name for styling */
  className?: string;
}

/**
 * Props for VideoPlayer component
 */
export interface VideoPlayerProps {
  /** Video to play */
  video: Video;
  /** Whether to autoplay */
  autoplay?: boolean;
  /** Whether to show controls */
  controls?: boolean;
  /** Callback when video ends */
  onEnded?: () => void;
  /** Callback when video errors */
  onError?: (error: string) => void;
  /** CSS class name for styling */
  className?: string;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  /** Response status */
  status: 'success' | 'error';
  /** Response data */
  data?: T;
  /** Error message if status is error */
  message?: string;
}

/**
 * Video player state
 */
export interface VideoPlayerState {
  /** Currently playing video */
  currentVideo: Video | null;
  /** Whether player is visible */
  isPlayerOpen: boolean;
  /** Whether video is playing */
  isPlaying: boolean;
  /** Current playback time in seconds */
  currentTime: number;
  /** Video duration in seconds */
  duration: number;
  /** Whether video is muted */
  isMuted: boolean;
  /** Volume level (0-1) */
  volume: number;
}