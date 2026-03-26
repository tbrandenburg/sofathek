/**
 * Error Handling for Invalid vs Unsupported Sites
 *
 * Tests distinction between:
 * - Invalid URL: Malformed, wrong protocol, etc. (caught by frontend and backend)
 * - Unsupported site: Valid URL but yt-dlp may not support it (caught by backend at runtime)
 *
 * Added as part of issue #187: Fix incomplete integration test updates for broader URL validation
 */

import { test, expect } from '@playwright/test';
import { TEST_SELECTORS } from './fixtures';

const BACKEND_URL = `http://localhost:${process.env.SOFATHEK_BACKEND_PORT || '3010'}`;
const FRONTEND_URL = `http://localhost:${process.env.SOFATHEK_FRONTEND_PORT || '5183'}`;

test.describe('URL Validation Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/`, { waitUntil: 'networkidle' });
  });

  test('should reject malformed URL in frontend before backend submission', async ({ page }) => {
    const urlInput = page.locator(TEST_SELECTORS.URL_INPUT);
    const downloadButton = page.locator(TEST_SELECTORS.DOWNLOAD_BUTTON);

    await urlInput.fill('not-a-url');
    await expect(downloadButton).toBeDisabled();
    await expect(page.locator('[data-testid="url-validation-error"]')).toBeVisible();
  });

  test('should reject non-HTTP protocol URLs in frontend', async ({ page }) => {
    const urlInput = page.locator(TEST_SELECTORS.URL_INPUT);
    const downloadButton = page.locator(TEST_SELECTORS.DOWNLOAD_BUTTON);

    await urlInput.fill('ftp://example.com/video.mp4');
    await expect(downloadButton).toBeDisabled();
    await expect(page.locator('[data-testid="url-validation-error"]')).toBeVisible();
  });

  test('should accept valid non-YouTube HTTP/HTTPS URLs in frontend', async ({ page }) => {
    const urlInput = page.locator(TEST_SELECTORS.URL_INPUT);
    const downloadButton = page.locator(TEST_SELECTORS.DOWNLOAD_BUTTON);

    await urlInput.fill('https://vimeo.com/123456789');
    await expect(downloadButton).toBeEnabled();
    await expect(page.locator('[data-testid="url-validation-error"]')).not.toBeVisible();
  });

  test('should distinguish invalid URL from unsupported site via backend', async ({ page }) => {
    // Invalid URL - backend must reject with 400
    const invalidResponse = await page.request.post(`${BACKEND_URL}/api/youtube/download`, {
      data: { url: 'not-a-url' }
    });
    expect(invalidResponse.status()).toBe(400);
    const invalidData = await invalidResponse.json();
    expect(invalidData.status).toBe('error');

    // Valid URL format but possibly unsupported site - backend accepts format (not 400)
    const validFormatResponse = await page.request.post(`${BACKEND_URL}/api/youtube/download`, {
      data: { url: 'https://example.com/fake-video.mp4' }
    });
    expect(validFormatResponse.status()).not.toBe(400);
  });

  test('should show generic video URL error message (not YouTube-specific)', async ({ page }) => {
    const urlInput = page.locator(TEST_SELECTORS.URL_INPUT);

    await urlInput.fill('not-a-url');

    // Error message must not be YouTube-specific
    await expect(page.getByText(/YouTube URL/i)).not.toBeVisible();
    // Generic video URL error should be visible
    await expect(page.locator('[data-testid="url-validation-error"]')).toBeVisible();
  });
});
