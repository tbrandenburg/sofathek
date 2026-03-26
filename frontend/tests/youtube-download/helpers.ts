/**
 * YouTube E2E Test Helpers
 * 
 * Reusable helper functions for YouTube download workflow E2E tests.
 * These helpers abstract common test operations and API mocking.
 */

import { Page, expect } from '@playwright/test';
import { TEST_SELECTORS, API_RESPONSES, TEST_TIMING } from './fixtures';
import { QueueStatus } from '../../src/types/youtube';

const BACKEND_URL = `http://localhost:${process.env.SOFATHEK_BACKEND_PORT || '3010'}`;

/**
 * Navigation and setup helpers
 */
export class NavigationHelpers {
  constructor(private page: Page) {}

  /**
   * Navigate to the home page and wait for it to load
   */
  async goToHomePage() {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Wait for the main content to be visible
    await expect(this.page.locator('h2')).toContainText('Video Library');
  }

  /**
   * Wait for YouTube components to be visible on the page
   */
  async waitForYouTubeComponents() {
    await expect(this.page.locator(TEST_SELECTORS.DOWNLOAD_FORM)).toBeVisible();
    await expect(this.page.locator(TEST_SELECTORS.DOWNLOAD_QUEUE)).toBeVisible();
  }
}

/**
 * Form interaction helpers
 */
export class FormHelpers {
  constructor(private page: Page) {}

  /**
   * Fill and submit the YouTube download form
   */
  async submitDownloadForm(url: string, shouldSucceed: boolean = true) {
    const urlInput = this.page.locator(TEST_SELECTORS.URL_INPUT);
    const submitButton = this.page.locator(TEST_SELECTORS.DOWNLOAD_BUTTON);

    await expect(urlInput).toBeEnabled();

    // Fill the form
    await urlInput.clear();
    await urlInput.fill(url);
    await expect(urlInput).toHaveValue(url);

    // Check if submit button is enabled/disabled as expected
    if (shouldSucceed) {
      await expect(submitButton).toBeEnabled();
    }

    // Submit the form
    await submitButton.click();
    
    // Add a small delay for form processing
    await this.page.waitForTimeout(TEST_TIMING.FORM_INTERACTION_DELAY);
  }

  /**
   * Validate form error state
   */
  async expectFormError(expectedMessage?: string) {
    const errorAlert = this.page.locator(TEST_SELECTORS.DOWNLOAD_ERROR);
    await expect(errorAlert).toBeVisible({ timeout: 10000 });
    
    if (expectedMessage) {
      await expect(errorAlert).toContainText(expectedMessage);
    }
  }

  /**
   * Validate form success state
   */
  async expectFormSuccess() {
    const successAlert = this.page.locator(TEST_SELECTORS.DOWNLOAD_SUCCESS);
    await expect(successAlert).toBeVisible();
    await expect(successAlert).toContainText('Download started successfully');
  }

  /**
   * Check if form is in loading state
   */
  async expectFormLoading() {
    const submitButton = this.page.locator(TEST_SELECTORS.DOWNLOAD_BUTTON);
    await expect(submitButton).toBeDisabled();
    await expect(submitButton).toContainText('Starting Download...');
  }

  /**
   * Clear the form
   */
  async clearForm() {
    await this.page.locator(TEST_SELECTORS.URL_INPUT).clear();
  }

  /**
   * Test URL validation by checking button state
   */
  async testUrlValidation(url: string, shouldBeValid: boolean) {
    await this.page.locator(TEST_SELECTORS.URL_INPUT).fill(url);
    const submitButton = this.page.locator(TEST_SELECTORS.DOWNLOAD_BUTTON);
    
    if (shouldBeValid) {
      await expect(submitButton).toBeEnabled();
    } else {
      await expect(submitButton).toBeDisabled();
    }
  }
}

/**
 * Queue interaction helpers
 */
export class QueueHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for queue to show specific number of items
   */
  async waitForQueueItems(expectedCount: number, timeout: number = 5000) {
    if (expectedCount === 0) {
      await expect(this.page.locator(TEST_SELECTORS.QUEUE_ITEMS)).not.toBeVisible({
        timeout
      });
    } else {
      await expect(this.page.locator(`${TEST_SELECTORS.QUEUE_ITEMS} .queue-item`)).toHaveCount(expectedCount, {
        timeout
      });
    }
  }

  /**
   * Check if a specific queue item exists and has expected status
   */
  async expectQueueItem(itemId: string, status?: string) {
    const queueItem = this.page.locator(TEST_SELECTORS.QUEUE_ITEM(itemId));
    await expect(queueItem).toBeVisible();
    
    if (status) {
      await expect(queueItem).toContainText(status, { ignoreCase: true });
    }
  }

  /**
   * Cancel a download by clicking its cancel button
   */
  async cancelDownload(itemId: string) {
    const cancelButton = this.page.locator(TEST_SELECTORS.CANCEL_BUTTON(itemId));
    await expect(cancelButton).toBeVisible();
    await expect(cancelButton).toBeEnabled();
    await cancelButton.click();
  }

  /**
   * Check progress bar for processing items
   */
  async expectProgress(itemId: string, minProgress: number) {
    const progressBar = this.page.locator(TEST_SELECTORS.PROGRESS_BAR(itemId));
    await expect(progressBar).toBeVisible();
    
    // Get the width style and verify it's at least the minimum expected
    const width = await progressBar.getAttribute('style');
    expect(width).toContain('width:');
    
    // Extract numeric value and validate against minimum
    const widthMatch = width?.match(/width:\s*(\d+(?:\.\d+)?)%/);
    if (widthMatch) {
      const currentProgress = parseFloat(widthMatch[1]);
      expect(currentProgress).toBeGreaterThanOrEqual(minProgress);
    }
  }

  /**
   * Verify queue is empty
   */
  async expectEmptyQueue() {
    await expect(this.page.locator(TEST_SELECTORS.DOWNLOAD_QUEUE)).toContainText('No downloads yet');
  }

  /**
   * Expect queue to show specific stats
   */
  async expectQueueStats(stats: { total: number; processing?: number; completed?: number; failed?: number }) {
    // Use CardHeader's CardDescription for queue stats (not individual item descriptions)
    const queueStats = this.page.locator(`${TEST_SELECTORS.DOWNLOAD_QUEUE} .card-header .card-description`).first();
    await expect(queueStats).toContainText(`${stats.total} total`);
    
    if (stats.processing !== undefined) {
      await expect(queueStats).toContainText(`${stats.processing} processing`);
    }
  }
}

/**
 * API mocking helpers
 */
export class MockAPIHelpers {
  constructor(private page: Page) {}

  /**
   * Mock the download endpoint to return success
   */
  async mockDownloadSuccess() {
    await this.page.route('**/api/youtube/download', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(API_RESPONSES.DOWNLOAD_SUCCESS)
      });
    });
  }

  /**
   * Mock the download endpoint to return error
   */
  async mockDownloadError(errorMessage?: string) {
    await this.page.route('**/api/youtube/download', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          ...API_RESPONSES.DOWNLOAD_ERROR,
          message: errorMessage || API_RESPONSES.DOWNLOAD_ERROR.message
        })
      });
    });
  }

  /**
   * Mock the queue endpoint with specific queue state
   */
  async mockQueueStatus(queueStatus: QueueStatus) {
    await this.page.route('**/api/youtube/queue', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: queueStatus
        })
      });
    });
  }

  /**
   * Mock queue endpoint to simulate queue updates over time
   */
  async mockProgressiveQueue(queueStates: QueueStatus[]) {
    let currentIndex = 0;
    
    await this.page.route('**/api/youtube/queue', async route => {
      const currentQueue = queueStates[currentIndex] || queueStates[queueStates.length - 1];
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: currentQueue
        })
      });
      
      // Advance to next state for next request
      if (currentIndex < queueStates.length - 1) {
        currentIndex++;
      }
    });
  }

  /**
   * Mock cancel endpoint
   */
  async mockCancelSuccess() {
    await this.page.route('**/api/youtube/download/*', async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(API_RESPONSES.CANCEL_SUCCESS)
        });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * Remove all API mocks
   */
  async removeAllMocks() {
    await this.page.unroute('**/api/youtube/**');
  }
}

/**
 * Live API helpers - call real backend (for integration tests)
 */
export class LiveAPIHelpers {
  constructor(private page: Page) {}

  async getQueueStatus(): Promise<QueueStatus> {
    const response = await this.page.request.get(`${BACKEND_URL}/api/youtube/queue`);
    const data = await response.json();
    return data.data;
  }

  async startDownload(url: string): Promise<{ id: string }> {
    const response = await this.page.request.post(`${BACKEND_URL}/api/youtube/download`, {
      data: { url }
    });
    const data = await response.json();
    return { id: data.data.queueItem.id };
  }

  async cancelDownload(id: string): Promise<void> {
    await this.page.request.delete(`${BACKEND_URL}/api/youtube/download/${id}`);
  }
}

/**
 * Timing and polling helpers
 */
export class TimingHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for API requests to complete
   */
  async waitForAPIRequests(timeout: number = TEST_TIMING.API_RESPONSE_DELAY) {
    await this.page.waitForTimeout(timeout);
  }

  /**
   * Wait for queue polling cycle
   */
  async waitForQueuePoll() {
    await this.page.waitForTimeout(TEST_TIMING.QUEUE_POLL_INTERVAL + 250);
  }

  /**
   * Wait for download simulation to complete
   */
  async waitForDownloadSimulation() {
    await this.page.waitForTimeout(TEST_TIMING.DOWNLOAD_SIMULATION_DURATION);
  }
}

/**
 * Assertion helpers for common test patterns
 */
export class AssertionHelpers {
  constructor(private page: Page) {}

  /**
   * Assert that the page is fully loaded with YouTube components
   */
  async assertPageLoaded() {
    await expect(this.page.locator(TEST_SELECTORS.DOWNLOAD_FORM)).toBeVisible();
    await expect(this.page.locator(TEST_SELECTORS.DOWNLOAD_QUEUE)).toBeVisible();
    await expect(this.page.locator(TEST_SELECTORS.URL_INPUT)).toBeVisible();
    await expect(this.page.locator(TEST_SELECTORS.DOWNLOAD_BUTTON)).toBeVisible();
  }

  /**
   * Assert no JavaScript errors in console
   */
  async assertNoConsoleErrors() {
    const logs: string[] = [];
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });
    
    // Allow some time for any errors to appear
    await this.page.waitForTimeout(1000);
    
    expect(logs).toHaveLength(0);
  }
}

/**
 * Main test helper class that combines all helpers
 */
export class YouTubeTestHelpers {
  public navigation: NavigationHelpers;
  public form: FormHelpers;
  public queue: QueueHelpers;
  public mockAPI: MockAPIHelpers;
  public liveAPI: LiveAPIHelpers;
  public timing: TimingHelpers;
  public assertions: AssertionHelpers;

  constructor(private page: Page) {
    this.navigation = new NavigationHelpers(page);
    this.form = new FormHelpers(page);
    this.queue = new QueueHelpers(page);
    this.mockAPI = new MockAPIHelpers(page);
    this.liveAPI = new LiveAPIHelpers(page);
    this.timing = new TimingHelpers(page);
    this.assertions = new AssertionHelpers(page);
  }

  /**
   * Complete setup for YouTube E2E tests
   */
  async setup() {
    await this.navigation.goToHomePage();
    await this.navigation.waitForYouTubeComponents();
    await this.assertions.assertPageLoaded();
  }

  /**
   * Clean up after tests
   */
  async cleanup() {
    await this.mockAPI.removeAllMocks();
  }
}
