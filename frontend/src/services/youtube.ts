import { 
  DownloadRequest, 
  QueueStatus, 
  QueueItem, 
  YouTubeApiResponse
} from '../types/youtube';

// Import base API utilities
import { ApiError, API_BASE_URL } from './api';
import { getErrorMessage } from '../lib/error';
import { getStatusColor } from '../lib/status';

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
      // Try to parse error response body for better error messages
      try {
        const errorData = await response.json();
        // Backend sends error responses as { status: 'error', message: 'error message' }
        let errorMessage: string;
        if (errorData && typeof errorData === 'object') {
          errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new ApiError(errorMessage, response.status, response);
      } catch (parseError) {
        // If parseError is already an ApiError, re-throw it
        if (parseError instanceof ApiError) {
          throw parseError;
        }
        // If JSON parsing fails, fall back to status text
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          response
        );
      }
    }

    const data: YouTubeApiResponse<T> = await response.json();
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
 * Download a video
 * POST /api/youtube/download
 */
export async function downloadVideo(request: DownloadRequest): Promise<QueueItem> {
  // Validate URL format - now accepts broader URLs beyond YouTube
  const validation = validateVideoUrl(request.url);
  if (!validation.isValid) {
    throw new ApiError(validation.error || 'Invalid video URL format', 400);
  }

  const response = await youtubeApiFetch<{ queueItem: QueueItem; message?: string }>('/youtube/download', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  
  if (response.status !== 'success' || !response.data?.queueItem) {
    throw new ApiError(response.message || 'Failed to start YouTube download');
  }
  
  return response.data.queueItem;
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
 * GET /api/youtube/download/:id/status
 */
export async function getDownloadStatus(itemId: string): Promise<QueueItem> {
  const response = await youtubeApiFetch<QueueItem>(`/youtube/download/${encodeURIComponent(itemId)}/status`);
  
  if (response.status !== 'success' || !response.data) {
    throw new ApiError(response.message || `Download item '${itemId}' not found`);
  }
  
  return response.data;
}

/**
 * Cancel a download
 * DELETE /api/youtube/download/:id
 */
export async function cancelDownload(itemId: string): Promise<{ message: string; queueItemId: string }> {
  const response = await youtubeApiFetch<{ message: string; queueItemId: string }>(`/youtube/download/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
  });
  
  if (response.status !== 'success' || !response.data) {
    const errorMessage = response.message || `Failed to cancel download '${itemId}'`;
    
    // Provide user-friendly messages for specific error cases
    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      throw new ApiError('This download no longer exists in the queue. It may have been removed.', 404);
    } else if (errorMessage.includes('already completed') || errorMessage.includes('409')) {
      throw new ApiError('This download has already completed and cannot be cancelled.', 409);
    } else if (errorMessage.includes('already cancelled')) {
      // This is actually OK - the item is cancelled
      return { message: 'Download was already cancelled', queueItemId: itemId };
    }
    
    throw new ApiError(errorMessage, 400);
  }
  
  return response.data;
}

/**
 * Clear the entire download queue
 * DELETE /api/youtube/queue
 */
export async function clearDownloadQueue(): Promise<{ message: string; removedCount: number; cancelledProcessingCount: number }> {
  const response = await youtubeApiFetch<{ message: string; removedCount: number; cancelledProcessingCount: number }>('/youtube/queue', {
    method: 'DELETE',
  });

  if (response.status !== 'success' || !response.data) {
    throw new ApiError(response.message || 'Failed to clear download queue', 400);
  }

  return response.data;
}

/**
 * Validate video URL format (supports YouTube and other video URLs)
 * Matches backend validation logic for consistency
 */
export function validateVideoUrl(url: string): { isValid: boolean; error?: string } {
  if (!url) {
    return { isValid: false, error: 'URL is required' };
  }

  if (url.length < 10) {
    return { isValid: false, error: 'URL is too short' };
  }

  if (url.length > 2000) {
    return { isValid: false, error: 'URL is too long' };
  }

  // First check if it matches YouTube patterns (for backward compatibility)
  const youtubePatterns = [
    /^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[\w-]+/,
    /^https?:\/\/(?:www\.)?youtube\.com\/embed\/[\w-]+/,
    /^https?:\/\/youtu\.be\/[\w-]+/,
    /^https?:\/\/(?:www\.)?youtube\.com\/v\/[\w-]+/
  ];
  
  const isYouTubeUrl = youtubePatterns.some(pattern => pattern.test(url));
  if (isYouTubeUrl) {
    return { isValid: true };
  }

  // For non-YouTube URLs, use URL constructor validation (same as backend)
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { 
      isValid: false, 
      error: 'Invalid video URL. Please provide a valid video URL (HTTP or HTTPS).' 
    };
  }

  // Check protocol (same as backend)
  const isHttpProtocol = parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  if (!isHttpProtocol) {
    return { 
      isValid: false, 
      error: 'Invalid video URL. Please provide a valid video URL (HTTP or HTTPS).' 
    };
  }

  // Check hostname exists (same as backend)
  if (!parsedUrl.hostname) {
    return { 
      isValid: false, 
      error: 'Invalid video URL. Please provide a valid video URL (HTTP or HTTPS).' 
    };
  }

  // Basic shell metacharacters check (simplified version of backend security check)
  // Note: & is allowed in URLs for query parameters
  if (url.includes(';') || url.includes('|') || url.includes('`')) {
    return { 
      isValid: false, 
      error: 'Invalid video URL. Please provide a valid video URL (HTTP or HTTPS).' 
    };
  }

  return { isValid: true };
}

/**
 * @deprecated Use validateVideoUrl instead
 * Validate YouTube URL format (kept for backward compatibility)
 */
export function validateYouTubeUrl(url: string): { isValid: boolean; error?: string } {
  return validateVideoUrl(url);
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

// Re-export status color utility for backward compatibility
export { getStatusColor };
