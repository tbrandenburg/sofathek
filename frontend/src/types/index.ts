/**
 * Sofathek Frontend Types
 * Core type definitions for the media center application
 */

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    token: string;
  };
  error?: string;
  message?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface HealthCheck {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  version: string;
}

export interface AppConfig {
  apiBaseUrl: string;
  environment: 'development' | 'production' | 'test';
}

export const config: AppConfig = {
  apiBaseUrl: '/api',
  environment: 'development',
};

// Video Types
export interface Video {
  id: string;
  title: string;
  description?: string;
  duration: number;
  thumbnail?: string;
  category: string;
  resolution?: string;
  codec?: string;
  bitrate?: number;
  fileSize: number;
  dateAdded: string;
  tags: string[];
  chapters?: Chapter[];
  subtitles?: Subtitle[];
  accessibility?: AccessibilityFeatures;
}

export interface Chapter {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  thumbnail?: string;
}

export interface Subtitle {
  id: string;
  language: string;
  path: string;
  default: boolean;
}

export interface AccessibilityFeatures {
  hasClosedCaptions: boolean;
  hasAudioDescription: boolean;
}

// Library Types
export interface VideoLibrary {
  videos: Video[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  categories: string[];
  scanStats: {
    scanned: number;
    processed: number;
    errors: number;
  };
}

export interface LibraryFilters {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// Download Types
export interface DownloadJob {
  jobId: string;
  url: string;
  status: 'queued' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  category: string;
  quality: string;
  startTime?: string;
  completedTime?: string;
  error?: string;
  title?: string;
  thumbnail?: string;
}

export interface DownloadRequest {
  url: string;
  quality: 'best' | '4k' | '1080p' | '720p' | '480p';
  category?: string;
}

export interface DownloadQueue {
  queue: DownloadJob[];
  stats: {
    total: number;
    queued: number;
    active: number;
    completed: number;
    failed: number;
  };
}

// Player Types
export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  fullscreen: boolean;
  playbackRate: number;
  quality?: string;
  buffered: number;
  loading: boolean;
}

// Component Props Types
export interface VideoCardProps {
  video: Video;
  onClick: (video: Video) => void;
  onPlay?: (video: Video) => void;
  showDetails?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export interface VideoPlayerProps {
  video: Video;
  autoPlay?: boolean;
  controls?: boolean;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  className?: string;
}

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export interface CategoryFilterProps {
  categories: string[];
  selected?: string;
  onChange: (category: string | undefined) => void;
  showAll?: boolean;
}

// System Status Types
export interface SystemStatus {
  server: {
    status: string;
    version: string;
    uptime: string;
    port: number;
    environment: string;
  };
  system: {
    uptime: string;
    memory: string;
    cpu: string;
  };
  media: {
    totalVideos: number;
    totalSize: string;
    categories: string[];
    recentUploads: Video[];
  };
}
