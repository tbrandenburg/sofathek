/**
 * YouTube download request structure
 */
export interface DownloadRequest {
  /** YouTube video URL */
  url: string;
  /** Optional custom title override */
  title?: string;
  /** Request timestamp */
  requestedAt: Date;
  /** Unique request identifier */
  requestId: string;
}

/**
 * YouTube video metadata from yt-dlp
 */
export interface YouTubeMetadata {
  /** YouTube video ID */
  id: string;
  /** Video title from YouTube */
  title: string;
  /** Video description */
  description?: string;
  /** Video duration in seconds */
  duration?: number;
  /** Channel name */
  uploader?: string;
  /** Upload date */
  uploadDate?: string;
  /** View count */
  viewCount?: number;
  /** Video format information */
  format?: string;
  /** Video resolution width */
  width?: number;
  /** Video resolution height */
  height?: number;
  /** Thumbnail URL from YouTube */
  thumbnailUrl?: string;
}

/**
 * Download processing result
 */
export interface DownloadResult {
  /** Unique download identifier */
  id: string;
  /** Download status */
  status: 'success' | 'error' | 'cancelled';
  /** YouTube metadata */
  metadata?: YouTubeMetadata;
  /** Local video file path (if successful) */
  videoPath?: string;
  /** Local thumbnail file path (if generated) */
  thumbnailPath?: string;
  /** Error message (if failed) */
  error?: string;
  /** Download completion timestamp */
  completedAt: Date;
  /** Download start timestamp */
  startedAt: Date;
}

/**
 * Download queue item
 */
export interface QueueItem {
  /** Unique queue item identifier */
  id: string;
  /** Original download request */
  request: DownloadRequest;
  /** Current processing status */
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  /** Download progress percentage (0-100) */
  progress: number;
  /** Current processing step description */
  currentStep: string;
  /** Download result (when completed) */
  result?: DownloadResult;
  /** Error information (when failed) */
  error?: string;
  /** Queue addition timestamp */
  queuedAt: Date;
  /** Processing start timestamp */
  startedAt?: Date;
  /** Completion timestamp */
  completedAt?: Date;
}

/**
 * Download queue status summary
 */
export interface QueueStatus {
  /** Total items in queue */
  totalItems: number;
  /** Currently processing items */
  processing: number;
  /** Completed items */
  completed: number;
  /** Failed items */
  failed: number;
  /** Pending items */
  pending: number;
  /** List of queue items */
  items: QueueItem[];
  /** Last updated timestamp */
  lastUpdated: Date;
}

const SHELL_METACHARACTERS = /[;&|`$(){}[\]<>\\\n\x00]/;

const PRIVATE_IP_PATTERNS = [
  /^127\./,                          // Loopback
  /^10\./,                           // Class A private
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // Class B private
  /^192\.168\./,                      // Class C private
  /^169\.254\./,                      // Link-local
  /^0\./,                            // Current network
  /^224\./,                          // Multicast
  /^240\./,                          // Reserved
  /^localhost$/i,                    // localhost hostname
  /^.*\.local$/i,                   // .local domains
] as const;

const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
] as const;

/**
 * Supported YouTube URL patterns for validation
 */
export const YOUTUBE_URL_PATTERNS = [
  /^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[\w-]+/,
  /^https?:\/\/(?:www\.)?youtube\.com\/embed\/[\w-]+/,
  /^https?:\/\/youtu\.be\/[\w-]+/,
  /^https?:\/\/(?:www\.)?youtube\.com\/v\/[\w-]+/
] as const;

export const containsShellMetacharacters = (url: string): boolean => {
  const decodedUrl = decodeURIComponent(url);
  return SHELL_METACHARACTERS.test(decodedUrl) || SHELL_METACHARACTERS.test(url);
};

export const isPrivateNetworkHost = (hostname: string): boolean => {
  const lowerHost = hostname.toLowerCase();
  
  // Check exact blocked hostnames
  if (BLOCKED_HOSTNAMES.includes(lowerHost as any)) {
    return true;
  }
  
  // Check for any .local domain or .localdomain
  if (lowerHost.endsWith('.local') || lowerHost.endsWith('.localdomain')) {
    return true;
  }
  
  return PRIVATE_IP_PATTERNS.some(pattern => pattern.test(hostname));
};

/**
 * YouTube download quality options
 */
export const YOUTUBE_QUALITY_OPTIONS = [
  'best[ext=mp4]/best',
  'best[height<=720]/best',
  'best[height<=480]/best'
] as const;

export type YouTubeQualityOption = typeof YOUTUBE_QUALITY_OPTIONS[number];