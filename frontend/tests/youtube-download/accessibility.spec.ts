import { expect, test } from '@playwright/test';
import { YouTubeTestHelpers } from './helpers';
import { MOCK_QUEUE_ITEMS, MOCK_QUEUE_STATUS, MOCK_YOUTUBE_URLS } from './fixtures';

test.describe('YouTube Download - Full Workflow', () => {
  let helpers: YouTubeTestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new YouTubeTestHelpers(page);
    await helpers.setup();
  });

  test.afterEach(async () => {
    await helpers.cleanup();
  });

  test.describe('Accessibility and UX', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="youtube-url-input"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="download-button"]')).toBeFocused();
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      const urlInput = page.locator('[data-testid="youtube-url-input"]');
      await expect(urlInput).toHaveAttribute('id', 'youtube-url');

      const label = page.locator('label[for="youtube-url"]');
      await expect(label).toBeVisible();
      await expect(label).toContainText('YouTube URL');
    });

    test('should announce status changes to screen readers', async ({ page }) => {
      await helpers.mockAPI.mockDownloadSuccess();

      await helpers.form.submitDownloadForm(MOCK_YOUTUBE_URLS.VALID_WATCH);

      const successAlert = page.locator('[data-testid="download-success"]');
      await expect(successAlert).toHaveAttribute('role', 'alert');
    });

    test('should work on mobile viewports', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await helpers.assertions.assertPageLoaded();
      await helpers.form.testUrlValidation(MOCK_YOUTUBE_URLS.VALID_WATCH, true);
    });
  });

  test.describe('Performance and Edge Cases', () => {
    test('should handle rapid form submissions', async () => {
      await helpers.mockAPI.mockDownloadSuccess();

      const promises = [
        helpers.form.submitDownloadForm(MOCK_YOUTUBE_URLS.VALID_WATCH),
        helpers.form.submitDownloadForm(MOCK_YOUTUBE_URLS.VALID_YOUTU_BE),
        helpers.form.submitDownloadForm(MOCK_YOUTUBE_URLS.VALID_EMBED)
      ];

      await Promise.all(promises);
      await helpers.assertions.assertNoConsoleErrors();
    });

    test('should handle large queue efficiently', async () => {
      const largeQueue = {
        totalItems: 50,
        processing: 5,
        completed: 30,
        failed: 5,
        pending: 10,
        cancelled: 0,
        items: Array.from({ length: 50 }, (_, i) => ({
          ...MOCK_QUEUE_ITEMS.PROCESSING,
          id: `item-${i}`,
          title: `Video ${i + 1}`
        })),
        lastUpdated: new Date().toISOString()
      };

      await helpers.mockAPI.mockQueueStatus(largeQueue);
      await helpers.timing.waitForQueuePoll();
      await helpers.queue.expectQueueStats({ total: 50, processing: 5 });
    });

    test('should maintain state during network interruptions', async ({ page }) => {
      await page.locator('[data-testid="youtube-url-input"]').fill(MOCK_YOUTUBE_URLS.VALID_WATCH);
      await page.route('**/api/**', route => route.abort());

      await expect(page.locator('[data-testid="youtube-url-input"]')).toHaveValue(MOCK_YOUTUBE_URLS.VALID_WATCH);

      await page.unroute('**/api/**');
      await helpers.mockAPI.mockDownloadSuccess();
      await helpers.form.submitDownloadForm(MOCK_YOUTUBE_URLS.VALID_WATCH);
    });
  });

  test.describe('Integration Tests', () => {
    test('should integrate with existing video library', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Video Library');
      await expect(page.locator('[data-testid="youtube-download"]')).toBeVisible();
      await expect(page.locator('[data-testid="download-queue"]')).toBeVisible();
      await expect(page.locator('.main-video-grid')).toBeVisible();
    });

    test('should use React Query for state management', async ({ page }) => {
      let requestCount = 0;
      await page.route('**/api/youtube/queue', route => {
        requestCount++;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: MOCK_QUEUE_STATUS.EMPTY
          })
        });
      });

      await helpers.timing.waitForQueuePoll();
      await helpers.timing.waitForQueuePoll();
      await helpers.timing.waitForQueuePoll();
      expect(requestCount).toBeGreaterThan(1);
    });
  });
});
