import { test } from '@playwright/test';
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

      await helpers.queue.expectQueueItem(MOCK_QUEUE_ITEMS.PENDING.id, 'pending');
      await helpers.queue.expectQueueItem(MOCK_QUEUE_ITEMS.PROCESSING.id, 'processing');
      await helpers.queue.expectQueueItem(MOCK_QUEUE_ITEMS.COMPLETED.id, 'completed');
      await helpers.queue.expectQueueItem(MOCK_QUEUE_ITEMS.FAILED.id, 'failed');
      await helpers.queue.expectQueueItem(MOCK_QUEUE_ITEMS.CANCELLED.id, 'cancelled');
    });

    test('should display progress bars for processing items', async () => {
      await helpers.mockAPI.mockQueueStatus(MOCK_QUEUE_STATUS.BUSY_QUEUE);
      await helpers.timing.waitForQueuePoll();

      await helpers.queue.expectProgress('processing-1', 25);
      await helpers.queue.expectProgress('processing-2', 75);
    });

    test('should update queue in real-time', async () => {
      await helpers.mockAPI.mockQueueStatus(MOCK_QUEUE_STATUS.EMPTY);
      await helpers.timing.waitForQueuePoll();
      await helpers.queue.expectEmptyQueue();

      await helpers.mockAPI.mockQueueStatus(MOCK_QUEUE_STATUS.SINGLE_PENDING);
      await helpers.timing.waitForQueuePoll();
      await helpers.queue.waitForQueueItems(1);
    });
  });

  test.describe('Download Progress Simulation', () => {
    test('should simulate complete download workflow', async () => {
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

      await helpers.mockAPI.mockDownloadSuccess();
      await helpers.form.submitDownloadForm(MOCK_YOUTUBE_URLS.VALID_WATCH);

      await helpers.timing.waitForQueuePoll();
      await helpers.queue.waitForQueueItems(1);

      await helpers.timing.waitForQueuePoll();
      await helpers.queue.expectQueueItem(MOCK_QUEUE_ITEMS.PENDING.id, 'processing');

      await helpers.timing.waitForQueuePoll();
      await helpers.timing.waitForQueuePoll();
      await helpers.queue.expectQueueItem(MOCK_QUEUE_ITEMS.PENDING.id, 'completed');
    });
  });
});
