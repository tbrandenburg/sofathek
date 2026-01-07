/**
 * Sofathek Media Center - Phase 2 Media Library Tests
 *
 * Comprehensive testing of media processing pipeline:
 * - Video library scanning and management
 * - YouTube download integration
 * - Video streaming with HTTP range requests
 * - Thumbnail generation and serving
 * - Media file upload and processing
 *
 * CEO Quality Standards: 100% test pass rate required
 */

import { test, expect } from '@playwright/test';
import fs from 'fs-extra';
import path from 'path';

const BASE_URL = 'http://localhost:3007';
const TEST_DATA_DIR = path.resolve(__dirname, '../../../data-test');

test.describe('Phase 2: Media Library System', () => {
  test.beforeEach(async () => {
    // Ensure test data directory structure exists
    await fs.ensureDir(path.join(TEST_DATA_DIR, 'videos/youtube'));
    await fs.ensureDir(path.join(TEST_DATA_DIR, 'videos/family'));
    await fs.ensureDir(path.join(TEST_DATA_DIR, 'videos/movies'));
    await fs.ensureDir(path.join(TEST_DATA_DIR, 'thumbnails'));
    await fs.ensureDir(path.join(TEST_DATA_DIR, 'temp'));
  });

  test('should retrieve video categories', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/videos/categories`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('categories');
    expect(data).toHaveProperty('total');
    expect(Array.isArray(data.categories)).toBe(true);
    expect(data.total).toBeGreaterThanOrEqual(5);

    // Verify expected categories exist
    const expectedCategories = [
      'documentaries',
      'family',
      'movies',
      'tv-shows',
      'youtube',
    ];
    expectedCategories.forEach(category => {
      expect(data.categories).toContain(category);
    });
  });

  test('should scan video library successfully', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/videos/scan`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('message', 'Library scan completed');
    expect(data).toHaveProperty('results');
    expect(data.results).toHaveProperty('scanned');
    expect(data.results).toHaveProperty('found');
    expect(data.results).toHaveProperty('processed');
    expect(data.results).toHaveProperty('errors');
    expect(data.results).toHaveProperty('newVideos');

    // Results should be numbers
    expect(typeof data.results.scanned).toBe('number');
    expect(typeof data.results.processed).toBe('number');
    expect(typeof data.results.errors).toBe('number');
  });

  test('should retrieve video library with pagination', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/videos?limit=10&page=1`
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('videos');
    expect(data).toHaveProperty('pagination');
    expect(data).toHaveProperty('categories');
    expect(data).toHaveProperty('scanStats');

    // Pagination structure
    expect(data.pagination).toHaveProperty('page', 1);
    expect(data.pagination).toHaveProperty('limit', 10);
    expect(data.pagination).toHaveProperty('total');
    expect(data.pagination).toHaveProperty('totalPages');

    // Videos array structure
    expect(Array.isArray(data.videos)).toBe(true);

    // If videos exist, verify structure
    if (data.videos.length > 0) {
      const video = data.videos[0];
      expect(video).toHaveProperty('id');
      expect(video).toHaveProperty('title');
      expect(video).toHaveProperty('category');
      expect(video).toHaveProperty('fileSize');
      expect(video).toHaveProperty('dateAdded');
      expect(video).toHaveProperty('tags');
    }
  });

  test('should filter videos by category', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/videos?category=youtube`
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('videos');

    // All returned videos should be in the youtube category
    data.videos.forEach((video: any) => {
      expect(video.category).toBe('youtube');
    });
  });

  test('should search videos by title', async ({ request }) => {
    // First ensure we have some video in the library
    await request.post(`${BASE_URL}/api/videos/scan`);

    const response = await request.get(`${BASE_URL}/api/videos?search=rick`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('videos');

    // If results exist, they should match the search term
    data.videos.forEach((video: any) => {
      const searchMatch =
        video.title.toLowerCase().includes('rick') ||
        (video.tags &&
          video.tags.some((tag: string) => tag.toLowerCase().includes('rick')));
      expect(searchMatch).toBe(true);
    });
  });
});

test.describe('Phase 2: YouTube Download System', () => {
  test('should queue YouTube download successfully', async ({ request }) => {
    const downloadRequest = {
      url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw', // Short test video
      quality: '720p',
      category: 'youtube',
    };

    const response = await request.post(`${BASE_URL}/api/downloads`, {
      data: downloadRequest,
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('jobId');
    expect(data).toHaveProperty('status', 'queued');
    expect(data).toHaveProperty('url', downloadRequest.url);
    expect(data).toHaveProperty('quality', downloadRequest.quality);
    expect(data).toHaveProperty('message', 'Download queued successfully');

    // Verify jobId format
    expect(data.jobId).toMatch(/^dl_\d+_[a-z0-9]+$/);
  });

  test('should reject invalid YouTube URLs', async ({ request }) => {
    const invalidRequest = {
      url: 'https://not-youtube.com/watch?v=invalid',
      quality: '720p',
    };

    const response = await request.post(`${BASE_URL}/api/downloads`, {
      data: invalidRequest,
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('Invalid YouTube URL');
  });

  test('should reject invalid quality settings', async ({ request }) => {
    const invalidRequest = {
      url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
      quality: '8k', // Invalid quality
    };

    const response = await request.post(`${BASE_URL}/api/downloads`, {
      data: invalidRequest,
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('quality');
  });

  test('should retrieve download job status', async ({ request }) => {
    // First queue a download
    const downloadRequest = {
      url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
      quality: '480p',
    };

    const queueResponse = await request.post(`${BASE_URL}/api/downloads`, {
      data: downloadRequest,
    });

    expect(queueResponse.status()).toBe(200);
    const queueData = await queueResponse.json();

    // Check job status
    const statusResponse = await request.get(
      `${BASE_URL}/api/downloads/${queueData.jobId}`
    );

    expect(statusResponse.status()).toBe(200);

    const statusData = await statusResponse.json();
    expect(statusData).toHaveProperty('jobId', queueData.jobId);
    expect(statusData).toHaveProperty('status');
    expect(statusData).toHaveProperty('url', downloadRequest.url);
    expect(statusData).toHaveProperty('quality', downloadRequest.quality);

    // Status should be valid
    const validStatuses = ['queued', 'downloading', 'completed', 'failed'];
    expect(validStatuses).toContain(statusData.status);
  });

  test('should retrieve download queue with statistics', async ({
    request,
  }) => {
    const response = await request.get(`${BASE_URL}/api/downloads`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('queue');
    expect(data).toHaveProperty('stats');
    expect(data).toHaveProperty(
      'message',
      'Download queue retrieved successfully'
    );

    // Queue should be array
    expect(Array.isArray(data.queue)).toBe(true);

    // Stats structure
    expect(data.stats).toHaveProperty('total');
    expect(data.stats).toHaveProperty('queued');
    expect(data.stats).toHaveProperty('active');
    expect(data.stats).toHaveProperty('completed');
    expect(data.stats).toHaveProperty('failed');

    // Stats should be numbers
    Object.values(data.stats).forEach(stat => {
      expect(typeof stat).toBe('number');
      expect(stat).toBeGreaterThanOrEqual(0);
    });
  });

  test('should cancel download job', async ({ request }) => {
    // Queue a download first
    const downloadRequest = {
      url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
      quality: '720p',
    };

    const queueResponse = await request.post(`${BASE_URL}/api/downloads`, {
      data: downloadRequest,
    });

    const queueData = await queueResponse.json();

    // Cancel the job
    const cancelResponse = await request.delete(
      `${BASE_URL}/api/downloads/${queueData.jobId}`
    );

    expect(cancelResponse.status()).toBe(200);

    const cancelData = await cancelResponse.json();
    expect(cancelData).toHaveProperty('message');
    expect(cancelData.message).toContain('cancelled');
  });
});

test.describe('Phase 2: Video Streaming', () => {
  let testVideoId: string;

  test.beforeAll(async ({ request }) => {
    // Ensure we have at least one video for streaming tests
    const scanResponse = await request.post(`${BASE_URL}/api/videos/scan`);
    const scanData = await scanResponse.json();

    const videosResponse = await request.get(`${BASE_URL}/api/videos`);
    const videosData = await videosResponse.json();

    if (videosData.videos.length > 0) {
      testVideoId = videosData.videos[0].id;
    }
  });

  test('should retrieve individual video metadata', async ({ request }) => {
    test.skip(!testVideoId, 'No test video available');

    const response = await request.get(`${BASE_URL}/api/videos/${testVideoId}`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('id', testVideoId);
    expect(data).toHaveProperty('title');
    expect(data).toHaveProperty('category');
    expect(data).toHaveProperty('fileSize');
    expect(data).toHaveProperty('dateAdded');
    expect(data).toHaveProperty('tags');
    expect(data).toHaveProperty('accessibility');

    // Accessibility structure
    expect(data.accessibility).toHaveProperty('hasClosedCaptions');
    expect(data.accessibility).toHaveProperty('hasAudioDescription');
  });

  test('should handle video streaming with range requests', async ({
    request,
  }) => {
    test.skip(!testVideoId, 'No test video available');

    // Test basic streaming request
    const response = await request.get(
      `${BASE_URL}/api/videos/${testVideoId}/stream`,
      {
        headers: {
          Range: 'bytes=0-1023', // Request first 1KB
        },
      }
    );

    // Should return partial content for range request
    expect([200, 206]).toContain(response.status());

    const headers = response.headers();

    if (response.status() === 206) {
      expect(headers).toHaveProperty('content-range');
      expect(headers).toHaveProperty('accept-ranges', 'bytes');
    }

    expect(headers).toHaveProperty('content-type');
    expect(headers['content-type']).toMatch(/^video\//);
  });

  test('should serve video thumbnails', async ({ request }) => {
    test.skip(!testVideoId, 'No test video available');

    // First check if video has thumbnail
    const videoResponse = await request.get(
      `${BASE_URL}/api/videos/${testVideoId}`
    );
    const videoData = await videoResponse.json();

    if (videoData.thumbnail) {
      const thumbnailResponse = await request.get(
        `${BASE_URL}/api/videos/${testVideoId}/thumbnail`
      );

      expect(thumbnailResponse.status()).toBe(200);

      const headers = thumbnailResponse.headers();
      expect(headers).toHaveProperty('content-type');
      expect(headers['content-type']).toMatch(/^image\//);
    }
  });

  test('should handle non-existent video requests gracefully', async ({
    request,
  }) => {
    const nonExistentId = 'non_existent_video_id_12345';

    const response = await request.get(
      `${BASE_URL}/api/videos/${nonExistentId}`
    );

    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data).toHaveProperty('error', 'Video not found');
    expect(data).toHaveProperty(
      'message',
      'The requested video does not exist'
    );
  });

  test('should handle non-existent thumbnail requests gracefully', async ({
    request,
  }) => {
    const nonExistentId = 'non_existent_video_id_12345';

    const response = await request.get(
      `${BASE_URL}/api/videos/${nonExistentId}/thumbnail`
    );

    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data).toHaveProperty('error', 'Thumbnail not found');
  });
});

test.describe('Phase 2: Admin Integration', () => {
  test('should provide system status with media metrics', async ({
    request,
  }) => {
    const response = await request.get(`${BASE_URL}/api/admin/status`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('server');
    expect(data).toHaveProperty('system');
    expect(data).toHaveProperty('media');

    // Media statistics
    expect(data.media).toHaveProperty('totalVideos');
    expect(data.media).toHaveProperty('totalSize');
    expect(data.media).toHaveProperty('categories');
    expect(data.media).toHaveProperty('recentUploads');

    expect(typeof data.media.totalVideos).toBe('number');
    expect(typeof data.media.totalSize).toBe('string');
    expect(Array.isArray(data.media.categories)).toBe(true);
    expect(Array.isArray(data.media.recentUploads)).toBe(true);
  });
});

test.describe('Phase 2: Error Handling', () => {
  test('should handle malformed download requests', async ({ request }) => {
    const invalidRequest = {
      url: 'not-a-url',
      quality: null,
    };

    const response = await request.post(`${BASE_URL}/api/downloads`, {
      data: invalidRequest,
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  test('should handle missing required fields in download requests', async ({
    request,
  }) => {
    const response = await request.post(`${BASE_URL}/api/downloads`, {
      data: {},
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('url');
  });

  test('should handle invalid video streaming requests', async ({
    request,
  }) => {
    const response = await request.get(
      `${BASE_URL}/api/videos/invalid_id/stream`
    );

    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data).toHaveProperty('error', 'Video not found');
  });

  test('should maintain server stability under load', async ({ request }) => {
    // Send multiple concurrent requests to test stability
    const promises = Array.from({ length: 10 }, () =>
      request.get(`${BASE_URL}/api/videos/categories`)
    );

    const responses = await Promise.all(promises);

    // All requests should succeed
    responses.forEach(response => {
      expect(response.status()).toBe(200);
    });
  });
});
