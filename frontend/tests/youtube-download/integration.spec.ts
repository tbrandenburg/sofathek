/**
 * YouTube Download Integration Tests
 *
 * Tests frontend-backend integration with LIVE backend API.
 * Does NOT mock API calls - uses real backend.
 * Does NOT download real YouTube videos - uses yt-dlp skip mode.
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

test.describe('YouTube Download - Integration Tests (Live Backend)', () => {
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

      expect(response.ok()).toBe(true);
      const data = await response.json();
      expect(data.status).toBe('success');
      expect(data.data).toHaveProperty('queueItem.id');
    });

    test('should handle download errors from live backend', async ({ page }) => {
      const response = await page.request.post(`${BACKEND_URL}/api/youtube/download`, {
        data: { url: 'https://invalid-url-that-is-not-youtube.com/video' }
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.status).toBe('error');
    });
  });

  test.describe('Frontend-Backend Integration', () => {
    test('should display queue from live backend in UI', async ({ page }) => {
      await page.request.post(`${BACKEND_URL}/api/youtube/download`, {
        data: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      const queueItems = page.locator(TEST_SELECTORS.QUEUE_ITEMS);
      await expect(queueItems).toBeVisible();
    });

    test('should cancel download via live backend', async ({ page }) => {
      const startResp = await page.request.post(`${BACKEND_URL}/api/youtube/download`, {
        data: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
      });
      const { queueItem } = (await startResp.json()).data;
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
    test('should block invalid URLs in UI before backend submission', async ({ page }) => {
      const urlInput = page.locator(TEST_SELECTORS.URL_INPUT);
      const downloadButton = page.locator(TEST_SELECTORS.DOWNLOAD_BUTTON);

      await urlInput.fill('https://not-a-valid-youtube-url.com/video');
      await expect(downloadButton).toBeDisabled();
      await expect(page.getByText('Please enter a valid YouTube URL')).toBeVisible();
    });
  });
});
