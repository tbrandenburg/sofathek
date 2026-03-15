/**
 * YouTube E2E Test Fixtures
 * 
 * Mock data and test utilities for YouTube download workflow E2E tests.
 * These fixtures provide consistent test data across all YouTube-related tests.
 */

import { QueueItem, QueueStatus, YouTubeMetadata } from '../../src/types/youtube';

/**
 * Generate random test video data
 */
export function generateMockVideoId(): string {
  return 'test_' + Math.random().toString(36).substr(2, 9);
}

export function generateMockYouTubeUrl(): string {
  return `https://www.youtube.com/watch?v=${generateMockVideoId()}`;
}

export function createMockVideo(overrides: Partial<YouTubeMetadata> = {}): YouTubeMetadata {
  const videoId = generateMockVideoId();
  return {
    id: videoId,
    title: overrides.title || `Test Video ${videoId}`,
    description: overrides.description || `Test description for video ${videoId}`,
    duration: overrides.duration || 180,
    uploader: overrides.uploader || 'TestChannel',
    uploadDate: overrides.uploadDate || '2024-01-01',
    viewCount: overrides.viewCount || 1000,
    format: overrides.format || 'mp4',
    width: overrides.width || 1920,
    height: overrides.height || 1080,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    ...overrides
  };
}

/**
 * Mock YouTube URLs for testing
 * These are real YouTube URL formats but with test video IDs
 */
export const MOCK_YOUTUBE_URLS = {
  // Valid YouTube URLs (different formats) - using generators
  VALID_WATCH: generateMockYouTubeUrl(),
  VALID_YOUTU_BE: (() => {
    const videoId = generateMockVideoId();
    return `https://youtu.be/${videoId}`;
  })(),
  VALID_EMBED: (() => {
    const videoId = generateMockVideoId();
    return `https://www.youtube.com/embed/${videoId}`;
  })(),
  VALID_NO_WWW: (() => {
    const videoId = generateMockVideoId();
    return `https://youtube.com/watch?v=${videoId}`;
  })(),
  
  // Invalid URLs for validation testing
  INVALID_NOT_YOUTUBE: 'https://example.com/video',
  INVALID_MALFORMED: 'not-a-url',
  INVALID_EMPTY: '',
  INVALID_SPACES: '   ',
} as const;

/**
 * Mock YouTube video metadata
 */
export const MOCK_VIDEO_METADATA: YouTubeMetadata = createMockVideo({
  title: 'Sample Test Video',
  description: 'A sample video for testing purposes',
  uploader: 'TestChannel',
  viewCount: 1234567
});

/**
 * Mock queue items for different states
 */
export const MOCK_QUEUE_ITEMS: Record<string, QueueItem> = {
  PENDING: {
    id: 'pending-item-1',
    url: MOCK_YOUTUBE_URLS.VALID_WATCH,
    title: 'Pending Download',
    status: 'pending',
    progress: 0,
    currentStep: 'Queued',
    queuedAt: new Date('2024-01-01T10:00:00Z').toISOString(),
  },
  
  PROCESSING: {
    id: 'processing-item-1',
    url: MOCK_YOUTUBE_URLS.VALID_YOUTU_BE,
    title: 'Processing Download',
    status: 'processing',
    progress: 45,
    currentStep: 'Downloading video (45%)',
    metadata: MOCK_VIDEO_METADATA,
    queuedAt: new Date('2024-01-01T10:01:00Z').toISOString(),
    startedAt: new Date('2024-01-01T10:02:00Z').toISOString(),
  },
  
  COMPLETED: {
    id: 'completed-item-1',
    url: MOCK_YOUTUBE_URLS.VALID_EMBED,
    title: MOCK_VIDEO_METADATA.title,
    status: 'completed',
    progress: 100,
    currentStep: 'Download complete',
    metadata: MOCK_VIDEO_METADATA,
    queuedAt: new Date('2024-01-01T09:00:00Z').toISOString(),
    startedAt: new Date('2024-01-01T09:01:00Z').toISOString(),
    completedAt: new Date('2024-01-01T09:05:00Z').toISOString(),
  },
  
  FAILED: {
    id: 'failed-item-1',
    url: 'https://www.youtube.com/watch?v=invalid-id',
    title: 'Failed Download',
    status: 'failed',
    progress: 0,
    currentStep: 'Failed',
    error: 'Video not found or unavailable',
    queuedAt: new Date('2024-01-01T08:00:00Z').toISOString(),
    startedAt: new Date('2024-01-01T08:01:00Z').toISOString(),
    completedAt: new Date('2024-01-01T08:02:00Z').toISOString(),
  },
  
  CANCELLED: {
    id: 'cancelled-item-1',
    url: MOCK_YOUTUBE_URLS.VALID_NO_WWW,
    title: 'Cancelled Download',
    status: 'cancelled',
    progress: 25,
    currentStep: 'Cancelled by user',
    queuedAt: new Date('2024-01-01T07:00:00Z').toISOString(),
    startedAt: new Date('2024-01-01T07:01:00Z').toISOString(),
    completedAt: new Date('2024-01-01T07:03:00Z').toISOString(),
  },
};

/**
 * Mock queue status for different scenarios
 */
export const MOCK_QUEUE_STATUS: Record<string, QueueStatus> = {
  EMPTY: {
    totalItems: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    pending: 0,
    cancelled: 0,
    items: [],
    lastUpdated: new Date().toISOString(),
  },
  
  SINGLE_PENDING: {
    totalItems: 1,
    processing: 0,
    completed: 0,
    failed: 0,
    pending: 1,
    cancelled: 0,
    items: [MOCK_QUEUE_ITEMS.PENDING],
    lastUpdated: new Date().toISOString(),
  },
  
  MIXED_QUEUE: {
    totalItems: 5,
    processing: 1,
    completed: 1,
    failed: 1,
    pending: 1,
    cancelled: 1,
    items: [
      MOCK_QUEUE_ITEMS.PROCESSING,
      MOCK_QUEUE_ITEMS.PENDING,
      MOCK_QUEUE_ITEMS.COMPLETED,
      MOCK_QUEUE_ITEMS.FAILED,
      MOCK_QUEUE_ITEMS.CANCELLED,
    ],
    lastUpdated: new Date().toISOString(),
  },
  
  BUSY_QUEUE: {
    totalItems: 3,
    processing: 2,
    completed: 0,
    failed: 0,
    pending: 1,
    cancelled: 0,
    items: [
      {
        ...MOCK_QUEUE_ITEMS.PROCESSING,
        id: 'processing-1',
        progress: 25,
        currentStep: 'Extracting video information'
      },
      {
        ...MOCK_QUEUE_ITEMS.PROCESSING,
        id: 'processing-2', 
        progress: 75,
        currentStep: 'Downloading video (75%)'
      },
      {
        ...MOCK_QUEUE_ITEMS.PENDING,
        id: 'pending-1'
      },
    ],
    lastUpdated: new Date().toISOString(),
  },
};

/**
 * API Response templates for mocking
 */
export const API_RESPONSES = {
  DOWNLOAD_SUCCESS: {
    status: 'success' as const,
    data: {
      queueItem: {
        id: 'new-download-123',
        url: generateMockYouTubeUrl(),
        title: 'YouTube Video',
        status: 'pending' as const,
        progress: 0,
        currentStep: 'Queued',
        queuedAt: new Date().toISOString(),
      },
      message: 'Download added to queue successfully'
    }
  },
  
  DOWNLOAD_ERROR: {
    status: 'error' as const,
    message: 'Invalid YouTube URL or video unavailable'
  },
  
  CANCEL_SUCCESS: {
    status: 'success' as const,
    data: {
      id: 'cancelled-item-id',
      message: 'Download cancelled successfully'
    }
  },
  
  QUEUE_ERROR: {
    status: 'error' as const,
    message: 'Failed to fetch download queue'
  }
} as const;

/**
 * Test data for form validation scenarios
 */
export const FORM_TEST_DATA = {
  VALID_INPUTS: [
    MOCK_YOUTUBE_URLS.VALID_WATCH,
    MOCK_YOUTUBE_URLS.VALID_YOUTU_BE,
    MOCK_YOUTUBE_URLS.VALID_EMBED,
    MOCK_YOUTUBE_URLS.VALID_NO_WWW,
  ],
  
  INVALID_INPUTS: [
    MOCK_YOUTUBE_URLS.INVALID_NOT_YOUTUBE,
    MOCK_YOUTUBE_URLS.INVALID_MALFORMED,
    MOCK_YOUTUBE_URLS.INVALID_EMPTY,
    MOCK_YOUTUBE_URLS.INVALID_SPACES,
  ]
} as const;

/**
 * Test timeouts and delays for realistic testing
 */
export const TEST_TIMING = {
  FORM_INTERACTION_DELAY: 100, // ms
  API_RESPONSE_DELAY: 500, // ms
  QUEUE_POLL_INTERVAL: 3000, // ms
  DOWNLOAD_SIMULATION_DURATION: 3000, // ms
  RETRY_TIMEOUT: 5000, // ms
} as const;

/**
 * CSS selectors for E2E testing
 */
export const TEST_SELECTORS = {
  // YouTube Download Form
  DOWNLOAD_FORM: '[data-testid="youtube-download"]',
  URL_INPUT: '[data-testid="youtube-url-input"]',
  DOWNLOAD_BUTTON: '[data-testid="download-button"]',
  DOWNLOAD_ERROR: '[data-testid="download-error"]',
  DOWNLOAD_SUCCESS: '[data-testid="download-success"]',
  
  // Download Queue
  DOWNLOAD_QUEUE: '[data-testid="download-queue"]',
  QUEUE_ITEMS: '[data-testid="queue-items"]',
  QUEUE_ITEM: (id: string) => `[data-testid="queue-item-${id}"]`,
  CANCEL_BUTTON: (id: string) => `[data-testid="cancel-button-${id}"]`,
  PROGRESS_BAR: (id: string) => `[data-testid="progress-bar-${id}"]`,
  
  // General UI elements
  LOADING_SPINNER: '.animate-spin',
  ALERT_ERROR: '[role="alert"][variant="destructive"]',
  ALERT_SUCCESS: '[role="alert"]:not([variant="destructive"])',
} as const;
