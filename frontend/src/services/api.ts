import { Video, VideoScanResult, ApiResponse } from '../types';
import { getErrorMessage } from '../lib/error';

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

// Use same-origin API by default so remote clients only need frontend port access.
export const API_BASE_URL = (configuredApiBaseUrl || '/api').replace(/\/$/, '');

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public response?: Response
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const ErrorStatus = {
  NETWORK: 0,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
} as const;

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(endpoint: string): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    
    if (!response.ok) {
      throw new ApiError(
        `API request failed: ${response.statusText}`,
        response.status,
        response
      );
    }

    const data: ApiResponse<T> = await response.json();
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network or parsing errors
    throw new ApiError(
      getErrorMessage(error),
      0
    );
  }
}

/**
 * Fetch all videos from the backend
 * GET /api/videos
 */
export async function getVideos(): Promise<VideoScanResult> {
  const response = await apiFetch<VideoScanResult>('/videos');
  
  if (response.status !== 'success' || !response.data) {
    throw new ApiError(response.message || 'Failed to fetch videos');
  }
  
  return response.data;
}

/**
 * Fetch a specific video by ID
 * GET /api/videos/:id
 */
export async function getVideoById(id: string): Promise<Video> {
  const response = await apiFetch<Video>(`/videos/${encodeURIComponent(id)}`);
  
  if (response.status !== 'success' || !response.data) {
    throw new ApiError(response.message || `Video with id '${id}' not found`);
  }
  
  return response.data;
}

/**
 * Get video streaming URL for HTML5 video player
 * Returns the streaming endpoint that supports HTTP Range requests
 */
export function getVideoStreamUrl(filename: string): string {
  return `${API_BASE_URL}/stream/${encodeURIComponent(filename)}`;
}

/**
 * Get direct download URL for media assets (video/audio/transcript)
 */
export function getDownloadFileUrl(filename: string): string {
  return `${API_BASE_URL}/download/${encodeURIComponent(filename)}`;
}

/**
 * Get thumbnail URL for a video (if available)
 */
export function getVideoThumbnailUrl(video: Video): string | null {
  if (!video.metadata.thumbnail) {
    return null;
  }
  
  // Use dedicated thumbnail endpoint
  return `${API_BASE_URL}/thumbnails/${encodeURIComponent(video.metadata.thumbnail)}`;
}

export function sanitizeFilename(filename: string): string {
  return filename
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 200);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Format duration in seconds to MM:SS or HH:MM:SS
 */
export function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) {
    return '0:00';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Backend health status response
 */
export interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  timestamp: string;
  service: string;
  version: string;
  environment: string;
  uptime: number;
}

/**
 * Check if backend is available
 * GET /health
 * Returns true if backend responds successfully (status < 500)
 */
export async function checkBackendHealth(): Promise<HealthStatus | null> {
  try {
    const response = await fetch('/health');
    
    if (!response.ok && response.status < 500) {
      return null;
    }
    
    return await response.json() as HealthStatus;
  } catch {
    return null;
  }
}
