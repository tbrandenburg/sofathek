// Copy the shared types for backend use
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
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  corsOrigin: string;
  jwtSecret: string;
  jwtExpiresIn: string;
}

// Video and Media Types
export interface Chapter {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  thumbnail?: string;
}

export interface SubtitleTrack {
  id: string;
  language: string;
  path: string;
  default: boolean;
}

export interface VideoMetadata {
  title: string;
  duration: number;
  chapters?: Chapter[];
  subtitles?: SubtitleTrack[];
  thumbnail?: string;
  description?: string;
  resolution?: string;
  codec?: string;
  bitrate?: number;
  fileSize?: number;
}

export interface AccessibilityFeatures {
  hasClosedCaptions: boolean;
  hasAudioDescription: boolean;
}

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
  subtitles?: SubtitleTrack[];
  accessibility?: AccessibilityFeatures;
  filePath: string;
}

export interface DownloadJob {
  id: string;
  url: string;
  status: 'queued' | 'downloading' | 'processing' | 'completed' | 'failed';
  progress: number;
  quality: string;
  category: string;
  outputPath?: string;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  videoMetadata?: VideoMetadata;
}

export interface LibraryFilters {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

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
