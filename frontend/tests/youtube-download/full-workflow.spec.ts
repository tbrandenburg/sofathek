/**
 * YouTube Download Full Workflow E2E Tests
 *
 * Comprehensive end-to-end tests for the YouTube download feature.
 * Tests the complete user workflow from URL input to video availability.
 */

import { test } from '@playwright/test';
import { YouTubeTestHelpers } from './helpers';
import { MOCK_QUEUE_STATUS } from './fixtures';

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
});
