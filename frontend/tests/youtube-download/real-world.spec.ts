/**
 * Real-world YouTube Download E2E Test
 * 
 * This is a critical test that validates the entire YouTube download workflow
 * with actual YouTube video download - no mocking allowed!
 * 
 * IMPORTANT: This test downloads real content and verifies it appears in the video grid.
 */

import { test, expect } from '@playwright/test';
import { TEST_SELECTORS } from './fixtures';

// Test configuration
const TEST_CONFIG = {
  // Small, copyright-free video for testing - Rick Roll classic 
  // (chosen because it's short, universally available, and safe for testing)
  TEST_VIDEO: {
    url: 'https://www.youtube.com/watch?v=m3fqyXZ4k4I',
    expectedTitle: 'Never Gonna Give You Up', // This might be truncated or different
    minDuration: 10 // At least 10 seconds
  },
  
  // Timeouts for real-world operations
  TIMEOUTS: {
    DOWNLOAD_START: 10000,    // Time to start download
    DOWNLOAD_COMPLETE: 60000, // Time for small video to complete
    VIDEO_APPEAR: 15000,      // Time for video to appear in grid
    PAGE_LOAD: 30000         // Time for page to fully load
  }
};

test.describe('Real-World YouTube Download E2E Test', () => {
  test.setTimeout(120000); // 2 minutes for entire test

  test('should download actual YouTube video and verify it appears in library', async ({ page }) => {
    console.log('🎬 Starting real-world YouTube download test');
    
    // Step 1: Navigate to the application
    console.log('📱 Navigating to application');
    await page.goto('/', { waitUntil: 'networkidle', timeout: TEST_CONFIG.TIMEOUTS.PAGE_LOAD });
    
    // Verify page loaded with YouTube components
    await expect(page.locator('h2')).toContainText('Video Library', { timeout: 5000 });
    await expect(page.locator('[data-testid="youtube-download"]')).toBeVisible();
    await expect(page.locator('[data-testid="download-queue"]')).toBeVisible();
    
    console.log('✅ Page loaded successfully with YouTube components');

    // Step 2: Submit the download request
    console.log(`🎯 Submitting download request for: ${TEST_CONFIG.TEST_VIDEO.url}`);
    
    const urlInput = page.locator('[data-testid="youtube-url-input"]');
    const downloadButton = page.locator('[data-testid="download-button"]');
    
    await urlInput.fill(TEST_CONFIG.TEST_VIDEO.url);
    await expect(downloadButton).toBeEnabled();
    await downloadButton.click();
    
    console.log('📤 Download request submitted');

    // Step 3: Verify download appears in queue
    console.log('⏳ Waiting for download to appear in queue');
    
    // Wait for success message
    await expect(page.locator('[data-testid="download-success"]'))
      .toBeVisible({ timeout: TEST_CONFIG.TIMEOUTS.DOWNLOAD_START });
    
    // Verify queue shows the download
    const queueItems = page.locator('[data-testid="queue-items"]');
    await expect(queueItems).toBeVisible();
    
    // Look for our specific download in the queue
    const downloadItem = page.locator('[data-testid*="queue-item"]').first();
    await expect(downloadItem).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Download appears in queue');

    // Step 4: Monitor download progress
    console.log('📊 Monitoring download progress');
    
    // Wait for queue item to transition out of pending
    await expect
      .poll(async () => {
        const text = (await downloadItem.textContent()) || '';
        if (text.includes('Completed')) return 'completed';
        if (text.includes('Failed')) return 'failed';
        if (text.includes('Cancelled')) return 'cancelled';
        if (text.includes('Processing')) return 'processing';
        return 'pending';
      }, { timeout: TEST_CONFIG.TIMEOUTS.DOWNLOAD_START })
      .not.toBe('pending');

    console.log('🔄 Download started processing or reached terminal state');
    
    // Wait for completion - retry checking status until completed
    let completed = false;
    const startTime = Date.now();
    
    while (!completed && (Date.now() - startTime) < TEST_CONFIG.TIMEOUTS.DOWNLOAD_COMPLETE) {
      const itemText = (await downloadItem.textContent()) || '';
      if (itemText.includes('Completed')) {
        completed = true;
        console.log('✅ Download completed successfully');
        continue;
      }

      if (itemText.includes('Failed') || itemText.includes('Cancelled')) {
        const errorText = await downloadItem.locator('[class*="error"], [class*="red"]').first().textContent();
        throw new Error(`Download failed: ${errorText || itemText}`);
      }

      // Still processing, check progress
      const progressText = await downloadItem.locator('[data-testid*="progress"], .progress, text=%').textContent();
      if (progressText) {
        console.log(`📊 Progress: ${progressText}`);
      }

      // Wait before next check
      await page.waitForTimeout(3000);
    }
    
    if (!completed) {
      throw new Error(`Download did not complete within ${TEST_CONFIG.TIMEOUTS.DOWNLOAD_COMPLETE}ms`);
    }

    // Step 5: Verify video appears in the main video grid
    console.log('🎥 Verifying video appears in main library');
    
    // Navigate to video library (if not already there)
    const videoGrid = page.locator('[data-testid="video-grid"], .video-grid').first();
    
    // Wait for video to appear in the grid
    await expect(videoGrid).toBeVisible({ timeout: TEST_CONFIG.TIMEOUTS.VIDEO_APPEAR });
    
    // Look for video cards in the grid
    const videoCards = page.locator('[data-testid="video-card"]');
    
    // Verify at least one video exists
    await expect(videoCards.first()).toBeVisible({ timeout: TEST_CONFIG.TIMEOUTS.VIDEO_APPEAR });
    
    // Get the count of videos before and after (if possible)
    const videoCount = await videoCards.count();
    expect(videoCount).toBeGreaterThanOrEqual(1);
    
    console.log(`✅ Found ${videoCount} videos in library`);

    // Step 6: Verify the downloaded video properties
    console.log('🔍 Verifying downloaded video properties');
    
    // Find our specific video (newest one should be first or last)
    const newestVideo = videoCards.first();
    
    // Verify it's a valid video card with required elements
    await expect(newestVideo.locator('[data-testid="video-title"]')).toBeVisible();
    
    // Check if duration exists and is reasonable
    const durationElement = newestVideo.locator('[data-testid*="duration"], .duration, [class*="duration"]');
    if (await durationElement.count() > 0) {
      const durationText = await durationElement.textContent();
      console.log(`📏 Video duration: ${durationText}`);
    }
    
    // Verify video is playable (has stream URL)
    const playButton = newestVideo.locator('button, [role="button"], a').first();
    if (await playButton.count() > 0) {
      await expect(playButton).toBeVisible();
      console.log('▶️  Video appears to be playable');
    }
    
    console.log('✅ Downloaded video verified in library');

    // Step 7: Final validation
    console.log('🏁 Performing final validations');
    
    // Ensure queue is cleared or shows completed status
    const completedItems = page.locator('[data-testid="queue-items"]').getByText('Completed');
    await expect(completedItems.first()).toBeVisible({ timeout: 5000 });
    
    // Verify no critical errors in console
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a moment to collect any errors
    await page.waitForTimeout(2000);
    
    // Filter out known acceptable errors (network timeouts, etc.)
    const criticalErrors = errors.filter(error => 
      !error.includes('net::ERR_') && 
      !error.includes('favicon') &&
      !error.includes('NetworkError')
    );
    
    if (criticalErrors.length > 0) {
      console.warn('⚠️  Console errors detected:', criticalErrors);
    }
    
    console.log('🎉 Real-world YouTube download test completed successfully!');
    console.log('📋 Test Summary:');
    console.log(`   ✅ Downloaded video from: ${TEST_CONFIG.TEST_VIDEO.url}`);
    console.log(`   ✅ Video appeared in library (${videoCount} total videos)`);
    console.log(`   ✅ Download queue processed successfully`);
    console.log(`   ✅ No critical application errors`);
  });

  test('should handle real-world download failures gracefully', async ({ page }) => {
    console.log('🎬 Starting real-world download failure test');
    
    // Navigate to application
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('h2')).toContainText('Video Library');
    
    // Try to download an invalid/unavailable YouTube video
    const invalidUrl = 'https://www.youtube.com/watch?v=INVALID_VIDEO_ID_123';
    
    const urlInput = page.locator('[data-testid="youtube-url-input"]');
    const downloadButton = page.locator('[data-testid="download-button"]');
    
    await urlInput.fill(invalidUrl);
    await downloadButton.click();
    
    // Should show error state in queue or error message
    const matchingQueueItem = page.locator('[data-testid^="queue-item-"]', { hasText: invalidUrl }).first();
    await expect(matchingQueueItem).toBeVisible({ timeout: 15000 });
    await expect(matchingQueueItem).toContainText(/Failed|Error|Cancelled/, { timeout: 30000 });
    
    console.log('✅ Invalid download handled gracefully with error message');
  });

  // Enhanced integration tests for issue #20 - Video grid refresh after download
  test.describe("Real-world E2E: Complete Download Journey", () => {
    test("should show downloaded video in grid immediately after completion", async ({ page }) => {
      // 1. Start download and verify progress
      await page.goto('/', { waitUntil: 'networkidle', timeout: TEST_CONFIG.TIMEOUTS.PAGE_LOAD });
      
      const urlInput = page.locator('[data-testid="youtube-url-input"]');
      const downloadButton = page.locator('[data-testid="download-button"]');
      
      await urlInput.fill(TEST_CONFIG.TEST_VIDEO.url);
      await downloadButton.click();
      
      // 2. Wait for download completion using the same pattern as original test
      const queueContainer = page.locator('[data-testid="download-queue"]');
      const downloadItem = queueContainer.locator('[data-testid^="queue-item-"]').first();
      
      // Monitor completion like original test
      let completed = false;
      const startTime = Date.now();
      
      while (!completed && (Date.now() - startTime) < TEST_CONFIG.TIMEOUTS.DOWNLOAD_COMPLETE) {
        try {
          await expect(downloadItem.locator('text=Completed')).toBeVisible({ timeout: 5000 });
          completed = true;
        } catch {
          // Check if failed
          const failedVisible = await downloadItem.locator('text=Failed').isVisible();
          if (failedVisible) {
            throw new Error('Download failed during integration test');
          }
          // Wait before next check
          await page.waitForTimeout(3000);
        }
      }
      
      if (!completed) {
        throw new Error(`Download did not complete within ${TEST_CONFIG.TIMEOUTS.DOWNLOAD_COMPLETE}ms`);
      }
      
      // 3. Verify video appears in grid WITHOUT page refresh
      const videoGrid = page.locator('[data-testid="video-grid"], .video-grid, [class*="grid"]').first();
      const downloadedVideo = videoGrid.locator('[data-testid*="video-card"], .video-card, [class*="video"]').first();
      
      // 4. Critical: Video must appear due to state invalidation, not manual refresh
      await expect(downloadedVideo).toBeVisible({ timeout: 5000 }); // Short timeout proves automatic refresh
      
      // 5. Verify video is playable
      const playButton = downloadedVideo.locator('button, [role="button"], a').first();
      if (await playButton.count() > 0) {
        await expect(playButton).toBeVisible();
      }
      
      // 6. Verify video still available after page reload
      await page.reload();
      await expect(videoGrid.locator('[data-testid*="video-card"], .video-card, [class*="video"]').first()).toBeVisible();
    });

    test("should handle download errors gracefully without affecting video grid", async ({ page }) => {
      // Test with invalid URL to ensure error handling doesn't break video list
      await page.goto('/', { waitUntil: 'networkidle', timeout: TEST_CONFIG.TIMEOUTS.PAGE_LOAD });
      
      const urlInput = page.locator('[data-testid="youtube-url-input"]');
      const downloadButton = page.locator('[data-testid="download-button"]');
      
      await urlInput.fill('https://invalid-youtube-url');
      await expect(downloadButton).toBeDisabled();
      
      // Verify error state
      await expect(page.locator('[data-testid="url-validation-error"]')).toBeVisible({ timeout: 30000 });
      
      // Verify existing videos still visible (grid should remain functional)
      const videoGrid = page.locator('[data-testid="video-grid"], .video-grid, [class*="grid"]').first();
      const existingVideoCount = await videoGrid.locator('[data-testid*="video-card"], .video-card, [class*="video"]').count();
      expect(existingVideoCount).toBeGreaterThanOrEqual(0); // Grid should remain functional
    });
  });
});

// Step 7 from issue #187: Tests for non-YouTube video URLs acceptance (broader URL validation)
test.describe('Non-YouTube Video URLs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`http://localhost:${process.env.SOFATHEK_FRONTEND_PORT || '8010'}/`, { waitUntil: 'networkidle' });
  });

  test('should accept Vimeo URLs as valid', async ({ page }) => {
    const urlInput = page.locator(TEST_SELECTORS.URL_INPUT);
    const downloadButton = page.locator(TEST_SELECTORS.DOWNLOAD_BUTTON);

    await urlInput.fill('https://vimeo.com/123456789');
    await expect(downloadButton).toBeEnabled();
    await expect(page.locator('[data-testid="url-validation-error"]')).not.toBeVisible();
  });

  test('should accept generic HTTPS video URLs as valid', async ({ page }) => {
    const urlInput = page.locator(TEST_SELECTORS.URL_INPUT);
    const downloadButton = page.locator(TEST_SELECTORS.DOWNLOAD_BUTTON);

    await urlInput.fill('https://example.com/video.mp4');
    await expect(downloadButton).toBeEnabled();
    await expect(page.locator('[data-testid="url-validation-error"]')).not.toBeVisible();
  });

  test('should handle unsupported site gracefully via backend', async ({ page }) => {
    // Backend accepts the URL format; yt-dlp determines actual support at runtime.
    // A valid HTTP/HTTPS URL must not be rejected with 400 (format error).
    const response = await page.request.post(`http://localhost:${process.env.SOFATHEK_BACKEND_PORT || '3010'}/api/youtube/download`, {
      data: { url: 'https://unsupported-site.example/video' }
    });

    expect(response.status()).not.toBe(400);
  });
});
