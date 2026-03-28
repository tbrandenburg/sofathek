/**
 * Video download request structure (supports yt-dlp-compatible URLs)
 */
export interface DownloadRequest {
  /** Video URL (YouTube, Vimeo, Twitter/X, and 1000+ other sites supported) */
  url: string;
  /** Optional custom title override */
  title?: string;
  /** Request timestamp */
  requestedAt: Date;
  /** Unique request identifier */
  requestId: string;
}

/**
 * YouTube video metadata from yt-dlp (Tier 1 + 2 fields)
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
  /** Uploader / channel handle */
  uploaderId?: string;
  /** Channel ID */
  channelId?: string;
  /** Channel URL */
  channelUrl?: string;
  /** Channel follower count */
  channelFollowerCount?: number;
  /** Whether channel is verified */
  channelIsVerified?: boolean;
  /** Upload date (YYYYMMDD) */
  uploadDate?: string;
  /** Upload Unix timestamp */
  timestamp?: number;
  /** View count */
  viewCount?: number;
  /** Like count */
  likeCount?: number;
  /** Comment count */
  commentCount?: number;
  /** Video resolution width */
  width?: number;
  /** Video resolution height */
  height?: number;
  /** Resolution string e.g. "1920x1080" */
  resolution?: string;
  /** Frames per second */
  fps?: number;
  /** Aspect ratio */
  aspectRatio?: number;
  /** Dynamic range e.g. "SDR" */
  dynamicRange?: string;
  /** Video codec */
  vcodec?: string;
  /** Audio codec */
  acodec?: string;
  /** Video bitrate (kbps) */
  vbr?: number;
  /** Audio bitrate (kbps) */
  abr?: number;
  /** Total bitrate (kbps) */
  tbr?: number;
  /** Audio sample rate (Hz) */
  asr?: number;
  /** Audio channel count */
  audioChannels?: number;
  /** Approximate file size in bytes */
  filesizeApprox?: number;
  /** Content categories */
  categories?: string[];
  /** Content tags */
  tags?: string[];
  /** Age limit */
  ageLimit?: number;
  /** Language code */
  language?: string;
  /** Availability status */
  availability?: string;
  /** Whether currently live */
  isLive?: boolean;
  /** Whether was previously live */
  wasLive?: boolean;
  /** Live status string */
  liveStatus?: string;
  /** Whether playable in embed */
  playableInEmbed?: boolean;
  /** Thumbnail URL from YouTube */
  thumbnailUrl?: string;
  /** Original webpage URL */
  webpageUrl?: string;
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
  /** @internal - Local video file path, not exposed via API */
  videoPath?: string;
  /** @internal - Local thumbnail file path, not exposed via API */
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
  /** Cancelled items */
  cancelled: number;
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