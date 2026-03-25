import { expect, test } from '@playwright/test';
import { YouTubeTestHelpers } from './helpers';
import { FORM_TEST_DATA, MOCK_QUEUE_STATUS, MOCK_YOUTUBE_URLS } from './fixtures';

test.describe('YouTube Download - Full Workflow', () => {
  let helpers: YouTubeTestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new YouTubeTestHelpers(page);
    await helpers.setup();
  });

  test.afterEach(async () => {
    await helpers.cleanup();
  });

  test.describe('Form Validation', () => {
    test('should validate YouTube URLs correctly', async () => {
      for (const validUrl of FORM_TEST_DATA.VALID_INPUTS) {
        await helpers.form.testUrlValidation(validUrl, true);
        await helpers.form.clearForm();
      }

      for (const invalidUrl of FORM_TEST_DATA.INVALID_INPUTS) {
        await helpers.form.testUrlValidation(invalidUrl, false);
        await helpers.form.clearForm();
      }
    });

    test('should show validation hints for invalid URLs', async ({ page }) => {
      await helpers.form.testUrlValidation(MOCK_YOUTUBE_URLS.INVALID_MALFORMED, false);
      await expect(page.locator('text=Please enter a valid video URL')).toBeVisible();
    });

    test('should clear validation hints when valid URL is entered', async ({ page }) => {
      await helpers.form.testUrlValidation(MOCK_YOUTUBE_URLS.INVALID_MALFORMED, false);
      await expect(page.locator('text=Please enter a valid video URL')).toBeVisible();

      await helpers.form.testUrlValidation(MOCK_YOUTUBE_URLS.VALID_WATCH, true);
      await expect(page.locator('text=Please enter a valid video URL')).not.toBeVisible();
    });
  });

  test.describe('Download Submission', () => {
    test('should submit valid download request successfully', async () => {
      await helpers.mockAPI.mockDownloadSuccess();
      await helpers.mockAPI.mockQueueStatus(MOCK_QUEUE_STATUS.SINGLE_PENDING);

      await helpers.form.submitDownloadForm(MOCK_YOUTUBE_URLS.VALID_WATCH);
      await helpers.form.expectFormSuccess();
      await helpers.timing.waitForQueuePoll();
      await helpers.queue.waitForQueueItems(1);
    });

    test('should handle download errors gracefully', async () => {
      await helpers.mockAPI.mockDownloadError('Video not found');

      await helpers.form.submitDownloadForm(MOCK_YOUTUBE_URLS.VALID_WATCH);
      await helpers.form.expectFormError('Video not found');
    });

    test('should show loading state during submission', async ({ page }) => {
      await page.route('**/api/youtube/download', async route => {
        await page.waitForTimeout(500);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'success', data: { id: 'test' } })
        });
      });

      const submitPromise = helpers.form.submitDownloadForm(MOCK_YOUTUBE_URLS.VALID_WATCH);

      await helpers.form.expectFormLoading();
      await submitPromise;

      await page.unrouteAll({ behavior: 'ignoreErrors' });
    });

    test('should clear form after successful submission', async ({ page }) => {
      await helpers.mockAPI.mockDownloadSuccess();

      await helpers.form.submitDownloadForm(MOCK_YOUTUBE_URLS.VALID_WATCH);
      await helpers.form.expectFormSuccess();

      await expect(page.locator('[data-testid="youtube-url-input"]')).toHaveValue('');
    });
  });
});
