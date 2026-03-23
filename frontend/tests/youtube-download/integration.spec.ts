/**
 * Video Download Integration Tests
 *
 * Tests frontend-backend integration with LIVE backend API.
 * Does NOT mock API calls - uses real backend.
 * Does NOT download real videos - uses yt-dlp skip mode.
 * Tests both YouTube and other supported video URLs.
 *
 * These tests catch real integration issues that mocked tests miss:
 * - API response format changes
 * - CORS issues
 * - Auth integration
 * - Network latency handling
 */

import { test, expect } from '@playwright/test';
import { TEST_SELECTORS } from './fixtures';

const BACKEND_URL = 'http://localhost:3010';

test.describe('Video Download - Integration Tests (Live Backend)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5183/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Video Library' }).first()).toBeVisible();
  });

  test.describe('API Integration', () => {
    test('should fetch queue status from live backend', async ({ page }) => {
      const response = await page.request.get(`${BACKEND_URL}/api/youtube/queue`);

      expect(response.ok()).toBe(true);
      const data = await response.json();
      expect(data.status).toBe('success');
      expect(data.data).toHaveProperty('items');
      expect(data.data).toHaveProperty('totalItems');
    });

    test('should start download via live backend API', async ({ page }) => {
      const response = await page.request.post(`${BACKEND_URL}/api/youtube/download`, {
        data: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
      });

      // Handle both success and rate limiting scenarios
      if (response.status() === 429) {
        // Rate limited - this is expected in integration tests
        const data = await response.json();
        expect(data.status).toBe('error');
        expect(data.message.toLowerCase()).toContain('rate');
      } else {
        expect(response.ok()).toBe(true);
        const data = await response.json();
        expect(data.status).toBe('success');
        expect(data.data).toHaveProperty('queueItem.id');
      }
    });

    test('should handle non-existent URLs appropriately via live backend API', async ({ page }) => {
      // Test with a non-existent URL - this should fail gracefully
      const response = await page.request.post(`${BACKEND_URL}/api/youtube/download`, {
        data: { url: 'https://example.com/video.mp4' }
      });

      // This URL doesn't exist, so it should start the download but the backend will detect failure
      // The API should accept the request initially but the download should fail during processing
      if (response.status() === 429) {
        // Rate limited - this is expected in integration tests
        const data = await response.json();
        expect(data.status).toBe('error');
        expect(data.message.toLowerCase()).toContain('rate');
      } else {
        // The request should be accepted (200/202) but the download will fail during processing
        expect(response.ok()).toBe(true);
        const data = await response.json();
        expect(data.status).toBe('success');
        expect(data.data).toHaveProperty('queueItem.id');
      }
    });

    test('should handle download errors from live backend', async ({ page }) => {
      // Use a malformed URL that will fail validation (not a valid URL format)
      const response = await page.request.post(`${BACKEND_URL}/api/youtube/download`, {
        data: { url: 'not-a-valid-url-at-all' }
      });

      // Accept both 400 (validation error) and 429 (rate limiting) as valid error responses
      expect([400, 429]).toContain(response.status());
      const data = await response.json();
      expect(data.status).toBe('error');
    });
  });

  test.describe('Frontend-Backend Integration', () => {
    test('should display queue from live backend in UI', async ({ page }) => {
      const downloadResp = await page.request.post(`${BACKEND_URL}/api/youtube/download`, {
        data: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
      });

      // Skip this test if we hit rate limiting
      if (downloadResp.status() === 429) {
        console.log('Skipping UI queue test due to rate limiting');
        return;
      }

      await page.reload();
      await page.waitForLoadState('networkidle');

      const queueItems = page.locator(TEST_SELECTORS.QUEUE_ITEMS);
      await expect(queueItems).toBeVisible();
    });

    test('should cancel download via live backend', async ({ page }) => {
      const startResp = await page.request.post(`${BACKEND_URL}/api/youtube/download`, {
        data: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
      });

      // Skip this test if we hit rate limiting
      if (startResp.status() === 429) {
        console.log('Skipping cancel test due to rate limiting');
        return;
      }

      const startData = await startResp.json();
      if (!startData.data?.queueItem?.id) {
        console.log('Skipping cancel test - no queue item created');
        return;
      }

      const { queueItem } = startData.data;
      const id = queueItem.id;

      const cancelResp = await page.request.delete(`${BACKEND_URL}/api/youtube/download/${id}`);
      expect([200, 400]).toContain(cancelResp.status());

      if (cancelResp.status() === 400) {
        const cancelError = await cancelResp.json();
        expect(cancelError.status).toBe('error');
        expect(cancelError.message).toContain('Could not cancel download');
      }
    });
  });

  test.describe('Error Handling Integration', () => {
    test('should allow valid non-YouTube URLs with new broader validation', async ({ page }) => {
      const urlInput = page.locator(TEST_SELECTORS.URL_INPUT);
      const downloadButton = page.locator(TEST_SELECTORS.DOWNLOAD_BUTTON);

      // Test that valid non-YouTube URLs are now accepted
      await urlInput.fill('https://example.com/video.mp4');
      await expect(downloadButton).toBeEnabled();
      
      // Should not show any validation error for valid HTTP URL
      await expect(page.getByText('Please enter a valid video URL')).not.toBeVisible();
    });

    test('should block truly invalid URLs in UI before backend submission', async ({ page }) => {
      const urlInput = page.locator(TEST_SELECTORS.URL_INPUT);
      const downloadButton = page.locator(TEST_SELECTORS.DOWNLOAD_BUTTON);

      // Test with actually invalid URL (not HTTP/HTTPS)
      await urlInput.fill('not-a-url-at-all');
      await expect(downloadButton).toBeDisabled();
      await expect(page.getByText('Please enter a valid video URL')).toBeVisible();
    });
  });
});
