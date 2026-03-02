// YouTube types adapted for frontend use
// Mirrors backend/src/types/youtube.ts but adapted for React components

/**
 * YouTube download request for API calls
 */
export interface DownloadRequest {
  /** YouTube video URL */
  url: string;
  /** Optional custom title override */
  title?: string;
}

/**
 * YouTube video metadata from yt-dlp (frontend view)
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
 * Download queue item with UI-focused properties
 */
export interface QueueItem {
  /** Unique queue item identifier */
  id: string;
  /** YouTube URL being downloaded */
  url: string;
  /** Video title (from metadata or URL) */
  title: string;
  /** Current processing status */
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  /** Download progress percentage (0-100) */
  progress: number;
  /** Current processing step description */
  currentStep: string;
  /** YouTube metadata (when available) */
  metadata?: YouTubeMetadata;
  /** Error information (when failed) */
  error?: string;
  /** Queue addition timestamp */
  queuedAt: string; // ISO string for frontend
  /** Processing start timestamp */
  startedAt?: string; // ISO string for frontend
  /** Completion timestamp */
  completedAt?: string; // ISO string for frontend
}

/**
 * Download queue status for UI display
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
  /** Cancelled items */
  cancelled: number;
  /** List of queue items */
  items: QueueItem[];
  /** Last updated timestamp */
  lastUpdated: string; // ISO string for frontend
}

/**
 * API response wrapper for YouTube operations
 */
export interface YouTubeApiResponse<T> {
  /** Response status */
  status: 'success' | 'error';
  /** Response data */
  data?: T;
  /** Error message if status is error */
  message?: string;
}

// Component Props Types

/**
 * Props for YouTubeDownload component
 */
export interface YouTubeDownloadProps {
  /** Callback when download is initiated */
  onDownloadStart?: (request: DownloadRequest) => void;
  /** Whether the form is disabled */
  disabled?: boolean;
  /** CSS class name for styling */
  className?: string;
}

/**
 * Props for DownloadQueue component
 */
export interface DownloadQueueProps {
  /** Queue status to display */
  queue: QueueStatus;
  /** Callback when item is cancelled */
  onCancelDownload?: (itemId: string) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: string | null;
  /** CSS class name for styling */
  className?: string;
}

/**
 * Props for QueueItem component
 */
export interface QueueItemProps {
  /** Queue item data */
  item: QueueItem;
  /** Callback when item is cancelled */
  onCancel?: (itemId: string) => void;
  /** CSS class name for styling */
  className?: string;
}

// Form Types

/**
 * YouTube URL form data
 */
export interface YouTubeFormData {
  /** YouTube URL input */
  url: string;
}

/**
 * Form validation result
 */
export interface FormValidation {
  /** Whether form is valid */
  isValid: boolean;
  /** Validation error message */
  error?: string;
}

// Utility Types

/**
 * Supported YouTube URL patterns for validation
 */
export const YOUTUBE_URL_PATTERNS = [
  /^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[\w-]+/,
  /^https?:\/\/(?:www\.)?youtube\.com\/embed\/[\w-]+/,
  /^https?:\/\/youtu\.be\/[\w-]+/,
  /^https?:\/\/(?:www\.)?youtube\.com\/v\/[\w-]+/
] as const;

/**
 * Status colors for UI display
 */
export const STATUS_COLORS = {
  pending: 'gray',
  processing: 'blue', 
  completed: 'green',
  failed: 'red',
  cancelled: 'orange'
} as const;

export type StatusColor = typeof STATUS_COLORS[keyof typeof STATUS_COLORS];