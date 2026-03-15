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

  test.describe('Cancel Functionality', () => {
    test('should cancel pending download', async () => {
      await helpers.mockAPI.mockQueueStatus(MOCK_QUEUE_STATUS.SINGLE_PENDING);
      await helpers.mockAPI.mockCancelSuccess();

      await helpers.timing.waitForQueuePoll();
      await helpers.queue.waitForQueueItems(1);

      await helpers.queue.cancelDownload(MOCK_QUEUE_ITEMS.PENDING.id);

      await helpers.mockAPI.mockQueueStatus({
        ...MOCK_QUEUE_STATUS.SINGLE_PENDING,
        pending: 0,
        cancelled: 1,
        items: [{
          ...MOCK_QUEUE_ITEMS.PENDING,
          status: 'cancelled' as const,
          currentStep: 'Cancelled'
        }]
      });

      await helpers.timing.waitForQueuePoll();
      await helpers.queue.expectQueueItem(MOCK_QUEUE_ITEMS.PENDING.id, 'cancelled');
    });

    test('should only show cancel button for pending/processing items', async ({ page }) => {
      await helpers.mockAPI.mockQueueStatus(MOCK_QUEUE_STATUS.MIXED_QUEUE);
      await helpers.timing.waitForQueuePoll();

      await expect(page.locator(`[data-testid="cancel-button-${MOCK_QUEUE_ITEMS.PENDING.id}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="cancel-button-${MOCK_QUEUE_ITEMS.PROCESSING.id}"]`)).toBeVisible();

      await expect(page.locator(`[data-testid="cancel-button-${MOCK_QUEUE_ITEMS.COMPLETED.id}"]`)).not.toBeVisible();
      await expect(page.locator(`[data-testid="cancel-button-${MOCK_QUEUE_ITEMS.FAILED.id}"]`)).not.toBeVisible();
      await expect(page.locator(`[data-testid="cancel-button-${MOCK_QUEUE_ITEMS.CANCELLED.id}"]`)).not.toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      await page.route('**/api/youtube/queue', route => route.abort());

      await helpers.timing.waitForQueuePoll();

      await expect(page.locator('[data-testid="download-queue"]')).toContainText('Failed to load');
    });

    test('should retry failed requests', async ({ page }) => {
      let requestCount = 0;
      await page.route('**/api/youtube/download', route => {
        requestCount++;
        if (requestCount < 2) {
          route.abort();
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'success', data: { id: 'retry-test' } })
          });
        }
      });

      await helpers.form.submitDownloadForm(MOCK_YOUTUBE_URLS.VALID_WATCH);
      await helpers.timing.waitForAPIRequests();
      expect(requestCount).toBeGreaterThanOrEqual(2);
    });

    test('should display appropriate error messages', async () => {
      const customError = 'Video is private and cannot be downloaded';
      await helpers.mockAPI.mockDownloadError(customError);

      await helpers.form.submitDownloadForm(MOCK_YOUTUBE_URLS.VALID_WATCH);
      await helpers.form.expectFormError(customError);
    });
  });
});
