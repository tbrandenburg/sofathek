/**
 * YouTube Download Full Workflow E2E Tests
 * 
 * Comprehensive end-to-end tests for the YouTube download feature.
 * Tests the complete user workflow from URL input to video availability.
 * 
 * Test Coverage:
 * - Form validation and submission
 * - Queue management and real-time updates
 * - Download progress tracking
 * - Error handling and recovery
 * - Cancel functionality
 * - UI responsiveness and accessibility
 */

import { test, expect } from '@playwright/test';
import { YouTubeTestHelpers } from './helpers';
import { 
  MOCK_YOUTUBE_URLS, 
  MOCK_QUEUE_STATUS, 
  FORM_TEST_DATA,
  MOCK_QUEUE_ITEMS 
} from './fixtures';

test.describe('YouTube Download - Full Workflow', () => {
  let helpers: YouTubeTestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new YouTubeTestHelpers(page);
    await helpers.setup();
  });

  test.afterEach(async () => {
    await helpers.cleanup();
  });

  test.describe('Page Loading and Components', () => {
    test('should load page with YouTube components visible', async () => {
      await helpers.assertions.assertPageLoaded();
      await helpers.assertions.assertNoConsoleErrors();
    });

    test('should display empty queue initially', async () => {
      await helpers.mockAPI.mockQueueStatus(MOCK_QUEUE_STATUS.EMPTY);
      await helpers.timing.waitForQueuePoll();
      await helpers.queue.expectEmptyQueue();
    });
  });

  test.describe('Form Validation', () => {
    test('should validate YouTube URLs correctly', async () => {
      // Test valid URLs
      for (const validUrl of FORM_TEST_DATA.VALID_INPUTS) {
        await helpers.form.testUrlValidation(validUrl, true);
        await helpers.form.clearForm();
      }

      // Test invalid URLs
      for (const invalidUrl of FORM_TEST_DATA.INVALID_INPUTS) {
        await helpers.form.testUrlValidation(invalidUrl, false);
        await helpers.form.clearForm();
      }
    });

    test('should show validation hints for invalid URLs', async ({ page }) => {
      await helpers.form.testUrlValidation(MOCK_YOUTUBE_URLS.INVALID_NOT_YOUTUBE, false);
      
      // Check that validation hint appears
      await expect(page.locator('text=Please enter a valid YouTube URL')).toBeVisible();
    });

    test('should clear validation hints when valid URL is entered', async ({ page }) => {
      // Enter invalid URL first
      await helpers.form.testUrlValidation(MOCK_YOUTUBE_URLS.INVALID_NOT_YOUTUBE, false);
      await expect(page.locator('text=Please enter a valid YouTube URL')).toBeVisible();

      // Then enter valid URL
      await helpers.form.testUrlValidation(MOCK_YOUTUBE_URLS.VALID_WATCH, true);
      await expect(page.locator('text=Please enter a valid YouTube URL')).not.toBeVisible();
    });
  });

  test.describe('Download Submission', () => {
    test('should submit valid download request successfully', async () => {
      await helpers.mockAPI.mockDownloadSuccess();
      await helpers.mockAPI.mockQueueStatus(MOCK_QUEUE_STATUS.SINGLE_PENDING);

      await helpers.form.submitDownloadForm(MOCK_YOUTUBE_URLS.VALID_WATCH);
      await helpers.form.expectFormSuccess();
      
      // Wait for queue to update
      await helpers.timing.waitForQueuePoll();
      await helpers.queue.waitForQueueItems(1);
    });

    test('should handle download errors gracefully', async () => {
      await helpers.mockAPI.mockDownloadError('Video not found');
      
      await helpers.form.submitDownloadForm(MOCK_YOUTUBE_URLS.VALID_WATCH);
      await helpers.form.expectFormError('Video not found');
    });

    test('should show loading state during submission', async ({ page }) => {
      // Mock with delay to see loading state
      await page.route('**/api/youtube/download', async route => {
        await page.waitForTimeout(500); // Reduced from 1000ms for faster test
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'success', data: { id: 'test' } })
        });
      });

      const submitPromise = helpers.form.submitDownloadForm(MOCK_YOUTUBE_URLS.VALID_WATCH);
      
      // Check loading state appears quickly
      await helpers.form.expectFormLoading();
      
      await submitPromise;
      
      // Clean up routes to prevent "Test ended" error
      await page.unrouteAll({ behavior: 'ignoreErrors' });
    });

    test('should clear form after successful submission', async ({ page }) => {
      await helpers.mockAPI.mockDownloadSuccess();
      
      await helpers.form.submitDownloadForm(MOCK_YOUTUBE_URLS.VALID_WATCH);
      await helpers.form.expectFormSuccess();
      
      // Form should be cleared
      await expect(page.locator('[data-testid="youtube-url-input"]')).toHaveValue('');
    });
  });

  test.describe('Queue Management', () => {
    test('should display queue with multiple items correctly', async () => {
      await helpers.mockAPI.mockQueueStatus(MOCK_QUEUE_STATUS.MIXED_QUEUE);
      await helpers.timing.waitForQueuePoll();
      
      await helpers.queue.waitForQueueItems(5);
      await helpers.queue.expectQueueStats({ 
        total: 5, 
        processing: 1, 
        completed: 1, 
        failed: 1 
      });
    });

    test('should show different status indicators for queue items', async () => {
      await helpers.mockAPI.mockQueueStatus(MOCK_QUEUE_STATUS.MIXED_QUEUE);
      await helpers.timing.waitForQueuePoll();

      // Check each status type is displayed
      await helpers.queue.expectQueueItem(MOCK_QUEUE_ITEMS.PENDING.id, 'pending');
      await helpers.queue.expectQueueItem(MOCK_QUEUE_ITEMS.PROCESSING.id, 'processing');
      await helpers.queue.expectQueueItem(MOCK_QUEUE_ITEMS.COMPLETED.id, 'completed');
      await helpers.queue.expectQueueItem(MOCK_QUEUE_ITEMS.FAILED.id, 'failed');
      await helpers.queue.expectQueueItem(MOCK_QUEUE_ITEMS.CANCELLED.id, 'cancelled');
    });

    test('should display progress bars for processing items', async () => {
      await helpers.mockAPI.mockQueueStatus(MOCK_QUEUE_STATUS.BUSY_QUEUE);
      await helpers.timing.waitForQueuePoll();

      // Check progress bars are visible and show progress
      await helpers.queue.expectProgress('processing-1', 25);
      await helpers.queue.expectProgress('processing-2', 75);
    });

    test('should update queue in real-time', async () => {
      // Start with empty queue
      await helpers.mockAPI.mockQueueStatus(MOCK_QUEUE_STATUS.EMPTY);
      await helpers.timing.waitForQueuePoll();
      await helpers.queue.expectEmptyQueue();

      // Update to queue with items
      await helpers.mockAPI.mockQueueStatus(MOCK_QUEUE_STATUS.SINGLE_PENDING);
      await helpers.timing.waitForQueuePoll();
      await helpers.queue.waitForQueueItems(1);
    });
  });

  test.describe('Download Progress Simulation', () => {
    test('should simulate complete download workflow', async () => {
      // Simulate progression: empty -> pending -> processing -> completed
      const progressStates = [
        MOCK_QUEUE_STATUS.EMPTY,
        MOCK_QUEUE_STATUS.SINGLE_PENDING,
        {
          ...MOCK_QUEUE_STATUS.SINGLE_PENDING,
          processing: 1,
          pending: 0,
          items: [{
            ...MOCK_QUEUE_ITEMS.PENDING,
            status: 'processing' as const,
            progress: 25,
            currentStep: 'Downloading video (25%)'
          }]
        },
        {
          ...MOCK_QUEUE_STATUS.SINGLE_PENDING,
          processing: 1,
          pending: 0,
          items: [{
            ...MOCK_QUEUE_ITEMS.PENDING,
            status: 'processing' as const,
            progress: 75,
            currentStep: 'Downloading video (75%)'
          }]
        },
        {
          ...MOCK_QUEUE_STATUS.SINGLE_PENDING,
          processing: 0,
          pending: 0,
          completed: 1,
          items: [{
            ...MOCK_QUEUE_ITEMS.PENDING,
            status: 'completed' as const,
            progress: 100,
            currentStep: 'Download complete'
          }]
        }
      ];

      await helpers.mockAPI.mockProgressiveQueue(progressStates);

      // Start download
      await helpers.mockAPI.mockDownloadSuccess();
      await helpers.form.submitDownloadForm(MOCK_YOUTUBE_URLS.VALID_WATCH);

      // Wait through progression
      await helpers.timing.waitForQueuePoll(); // Empty -> Pending
      await helpers.queue.waitForQueueItems(1);
      
      await helpers.timing.waitForQueuePoll(); // Pending -> Processing 25%
      await helpers.queue.expectQueueItem(MOCK_QUEUE_ITEMS.PENDING.id, 'processing');
      
      await helpers.timing.waitForQueuePoll(); // Processing 75%
      await helpers.timing.waitForQueuePoll(); // Processing -> Completed
      await helpers.queue.expectQueueItem(MOCK_QUEUE_ITEMS.PENDING.id, 'completed');
    });
  });

  test.describe('Cancel Functionality', () => {
    test('should cancel pending download', async () => {
      await helpers.mockAPI.mockQueueStatus(MOCK_QUEUE_STATUS.SINGLE_PENDING);
      await helpers.mockAPI.mockCancelSuccess();
      
      await helpers.timing.waitForQueuePoll();
      await helpers.queue.waitForQueueItems(1);

      // Cancel the download
      await helpers.queue.cancelDownload(MOCK_QUEUE_ITEMS.PENDING.id);
      
      // Mock updated queue status
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

      // Cancel buttons should be visible for pending and processing
      await expect(page.locator(`[data-testid="cancel-button-${MOCK_QUEUE_ITEMS.PENDING.id}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="cancel-button-${MOCK_QUEUE_ITEMS.PROCESSING.id}"]`)).toBeVisible();

      // Cancel buttons should NOT be visible for completed, failed, cancelled
      await expect(page.locator(`[data-testid="cancel-button-${MOCK_QUEUE_ITEMS.COMPLETED.id}"]`)).not.toBeVisible();
      await expect(page.locator(`[data-testid="cancel-button-${MOCK_QUEUE_ITEMS.FAILED.id}"]`)).not.toBeVisible();
      await expect(page.locator(`[data-testid="cancel-button-${MOCK_QUEUE_ITEMS.CANCELLED.id}"]`)).not.toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network failure
      await page.route('**/api/youtube/queue', route => route.abort());
      
      await helpers.timing.waitForQueuePoll();
      
      // Should show error state in queue component
      await expect(page.locator('[data-testid="download-queue"]')).toContainText('Failed to load');
    });

    test('should retry failed requests', async ({ page }) => {
      let requestCount = 0;
      await page.route('**/api/youtube/download', route => {
        requestCount++;
        if (requestCount < 2) {
          route.abort(); // Fail first request
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'success', data: { id: 'retry-test' } })
          });
        }
      });

      await helpers.form.submitDownloadForm(MOCK_YOUTUBE_URLS.VALID_WATCH);
      
      // Should eventually succeed after retry
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

  test.describe('Accessibility and UX', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Tab through the form
      await page.keyboard.press('Tab'); // Focus URL input
      await expect(page.locator('[data-testid="youtube-url-input"]')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Focus submit button
      await expect(page.locator('[data-testid="download-button"]')).toBeFocused();
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check form elements have labels
      const urlInput = page.locator('[data-testid="youtube-url-input"]');
      await expect(urlInput).toHaveAttribute('id', 'youtube-url');
      
      const label = page.locator('label[for="youtube-url"]');
      await expect(label).toBeVisible();
      await expect(label).toContainText('YouTube URL');
    });

    test('should announce status changes to screen readers', async ({ page }) => {
      await helpers.mockAPI.mockDownloadSuccess();
      
      await helpers.form.submitDownloadForm(MOCK_YOUTUBE_URLS.VALID_WATCH);
      
      // Success alert should have proper role
      const successAlert = page.locator('[data-testid="download-success"]');
      await expect(successAlert).toHaveAttribute('role', 'alert');
    });

    test('should work on mobile viewports', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await helpers.assertions.assertPageLoaded();
      
      // Components should still be interactive
      await helpers.form.testUrlValidation(MOCK_YOUTUBE_URLS.VALID_WATCH, true);
    });
  });

  test.describe('Performance and Edge Cases', () => {
    test('should handle rapid form submissions', async () => {
      await helpers.mockAPI.mockDownloadSuccess();
      
      // Submit multiple requests rapidly
      const promises = [
        helpers.form.submitDownloadForm(MOCK_YOUTUBE_URLS.VALID_WATCH),
        helpers.form.submitDownloadForm(MOCK_YOUTUBE_URLS.VALID_YOUTU_BE),
        helpers.form.submitDownloadForm(MOCK_YOUTUBE_URLS.VALID_EMBED),
      ];
      
      await Promise.all(promises);
      // Should not crash or show errors
      await helpers.assertions.assertNoConsoleErrors();
    });

    test('should handle large queue efficiently', async () => {
      // Create a large queue with many items
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
          title: `Video ${i + 1}`,
        })),
        lastUpdated: new Date().toISOString(),
      };

      await helpers.mockAPI.mockQueueStatus(largeQueue);
      await helpers.timing.waitForQueuePoll();

      // Should render without performance issues
      await helpers.queue.expectQueueStats({ total: 50, processing: 5 });
    });

    test('should maintain state during network interruptions', async ({ page }) => {
      // Fill form
      await page.locator('[data-testid="youtube-url-input"]').fill(MOCK_YOUTUBE_URLS.VALID_WATCH);
      
      // Simulate network interruption
      await page.route('**/api/**', route => route.abort());
      
      // Form state should be preserved
      await expect(page.locator('[data-testid="youtube-url-input"]')).toHaveValue(MOCK_YOUTUBE_URLS.VALID_WATCH);
      
      // Restore network
      await page.unroute('**/api/**');
      await helpers.mockAPI.mockDownloadSuccess();
      
      // Should be able to continue
      await helpers.form.submitDownloadForm(MOCK_YOUTUBE_URLS.VALID_WATCH);
    });
  });
});

test.describe('YouTube Download - Integration Tests', () => {
  let helpers: YouTubeTestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new YouTubeTestHelpers(page);
    await helpers.setup();
  });

  test.afterEach(async () => {
    await helpers.cleanup();
  });

  test('should integrate with existing video library', async ({ page }) => {
    // Check that YouTube components are properly integrated with main app
    await expect(page.locator('h1')).toContainText('Video Library');
    await expect(page.locator('[data-testid="youtube-download"]')).toBeVisible();
    await expect(page.locator('[data-testid="download-queue"]')).toBeVisible();
    
    // Should not interfere with existing video grid
    await expect(page.locator('.main-video-grid')).toBeVisible();
  });

  test('should use React Query for state management', async ({ page }) => {
    // This test verifies React Query integration by checking polling behavior
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

    // Wait for multiple poll cycles
    await helpers.timing.waitForQueuePoll();
    await helpers.timing.waitForQueuePoll();
    await helpers.timing.waitForQueuePoll();

    // Should have made multiple requests due to polling
    expect(requestCount).toBeGreaterThan(1);
  });
});