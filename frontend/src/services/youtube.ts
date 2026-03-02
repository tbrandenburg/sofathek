import { 
  DownloadRequest, 
  QueueStatus, 
  QueueItem, 
  YouTubeApiResponse,
  YOUTUBE_URL_PATTERNS 
} from '../types/youtube';

// Import base API utilities
import { ApiError } from './api';

// Backend API base URL (consistent with main API service)
const API_BASE_URL = 'http://localhost:3010/api';

/**
 * Generic fetch wrapper for YouTube API calls with error handling
 */
async function youtubeApiFetch<T>(
  endpoint: string, 
  options?: RequestInit
): Promise<YouTubeApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      throw new ApiError(
        `YouTube API request failed: ${response.statusText}`,
        response.status,
        response
      );
    }

    const data: YouTubeApiResponse<T> = await response.json();
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network or parsing errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown YouTube API error',
      0
    );
  }
}

/**
 * Download a YouTube video
 * POST /api/youtube/download
 */
export async function downloadVideo(request: DownloadRequest): Promise<QueueItem> {
  // Validate URL format
  const isValidUrl = YOUTUBE_URL_PATTERNS.some(pattern => pattern.test(request.url));
  if (!isValidUrl) {
    throw new ApiError('Invalid YouTube URL format', 400);
  }

  const response = await youtubeApiFetch<QueueItem>('/youtube/download', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  
  if (response.status !== 'success' || !response.data) {
    throw new ApiError(response.message || 'Failed to start YouTube download');
  }
  
  return response.data;
}

/**
 * Get YouTube download queue status
 * GET /api/youtube/queue
 */
export async function getDownloadQueue(): Promise<QueueStatus> {
  const response = await youtubeApiFetch<QueueStatus>('/youtube/queue');
  
  if (response.status !== 'success' || !response.data) {
    throw new ApiError(response.message || 'Failed to fetch download queue');
  }
  
  return response.data;
}

/**
 * Get download status for a specific item
 * GET /api/youtube/status/:id
 */
export async function getDownloadStatus(itemId: string): Promise<QueueItem> {
  const response = await youtubeApiFetch<QueueItem>(`/youtube/status/${encodeURIComponent(itemId)}`);
  
  if (response.status !== 'success' || !response.data) {
    throw new ApiError(response.message || `Download item '${itemId}' not found`);
  }
  
  return response.data;
}

/**
 * Cancel a download
 * DELETE /api/youtube/cancel/:id
 */
export async function cancelDownload(itemId: string): Promise<void> {
  const response = await youtubeApiFetch<void>(`/youtube/cancel/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
  });
  
  if (response.status !== 'success') {
    throw new ApiError(response.message || `Failed to cancel download '${itemId}'`);
  }
}

/**
 * Validate YouTube URL format
 */
export function validateYouTubeUrl(url: string): { isValid: boolean; error?: string } {
  if (!url) {
    return { isValid: false, error: 'URL is required' };
  }

  if (url.length < 10) {
    return { isValid: false, error: 'URL is too short' };
  }

  if (url.length > 2000) {
    return { isValid: false, error: 'URL is too long' };
  }

  const isValidFormat = YOUTUBE_URL_PATTERNS.some(pattern => pattern.test(url));
  if (!isValidFormat) {
    return { 
      isValid: false, 
      error: 'Invalid YouTube URL. Please provide a valid YouTube video URL.' 
    };
  }

  return { isValid: true };
}

/**
 * Extract video ID from YouTube URL
 */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // Handle different YouTube URL formats
    if (urlObj.hostname.includes('youtube.com')) {
      if (urlObj.pathname === '/watch') {
        return urlObj.searchParams.get('v');
      }
      if (urlObj.pathname.startsWith('/embed/')) {
        return urlObj.pathname.split('/embed/')[1]?.split('?')[0];
      }
      if (urlObj.pathname.startsWith('/v/')) {
        return urlObj.pathname.split('/v/')[1]?.split('?')[0];
      }
    }
    
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1); // Remove leading slash
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Format queue item title for display
 */
export function formatQueueItemTitle(item: QueueItem): string {
  if (item.metadata?.title) {
    return item.metadata.title;
  }
  
  if (item.title && item.title !== item.url) {
    return item.title;
  }
  
  // Fallback to video ID or URL
  const videoId = extractYouTubeVideoId(item.url);
  return videoId ? `YouTube Video (${videoId})` : 'YouTube Video';
}

/**
 * Get status badge color class for UI
 */
export function getStatusColor(status: QueueItem['status']): string {
  const colorMap = {
    pending: 'bg-gray-100 text-gray-800',
    processing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-orange-100 text-orange-800',
  };
  
  return colorMap[status] || 'bg-gray-100 text-gray-800';
}