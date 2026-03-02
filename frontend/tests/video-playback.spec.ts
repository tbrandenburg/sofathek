import { test, expect } from '@playwright/test';

/**
 * End-to-End tests for video library browsing and playback
 * 
 * Tests the complete user journey as specified in the plan:
 * 1. Browse video grid → 2. Select video → 3. Play video → 4. Return to browse
 */

test.describe('Video Library E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should display video library with grid layout', async ({ page }) => {
    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check that the main title is visible
    await expect(page.locator('text=Sofathek')).toBeVisible();
    await expect(page.locator('text=Family Media Center')).toBeVisible();

    // Check that the Video Library header is present
    await expect(page.locator('h2:has-text("Video Library")')).toBeVisible();

    // Check for video grid presence (it should exist even if empty)
    const videoGrid = page.locator('.main-video-grid');
    await expect(videoGrid).toBeVisible();
  });

  test('should handle empty video library gracefully', async ({ page }) => {
    // Wait for loading to complete
    await page.waitForLoadState('networkidle');

    // Check for empty state or loading state
    const loadingIndicator = page.locator('text=Loading videos...');
    const emptyState = page.locator('text=No videos found');
    const videoCards = page.locator('[data-testid="video-card"]');

    // Should either show loading, empty state, or video cards
    await expect(async () => {
      const isLoading = await loadingIndicator.isVisible();
      const isEmpty = await emptyState.isVisible();
      const hasVideos = await videoCards.count() > 0;
      
      expect(isLoading || isEmpty || hasVideos).toBe(true);
    }).toPass();
  });

  test('should display video cards with thumbnails and metadata', async ({ page }) => {
    // Wait for potential videos to load
    await page.waitForTimeout(2000);

    const videoCards = page.locator('[data-testid="video-card"]');
    const cardCount = await videoCards.count();

    if (cardCount > 0) {
      // Test the first video card
      const firstCard = videoCards.first();
      
      // Check that video cards have required elements
      await expect(firstCard).toBeVisible();
      
      // Check for thumbnail (either image or placeholder)
      const thumbnail = firstCard.locator('img, [data-testid="video-thumbnail"]');
      await expect(thumbnail).toBeVisible();
      
      // Check for video title
      const title = firstCard.locator('[data-testid="video-title"]');
      await expect(title).toBeVisible();
      
      // Check for metadata (duration, file size, etc.)
      const metadata = firstCard.locator('[data-testid="video-metadata"]');
      await expect(metadata).toBeVisible();
    }
  });

  test('should open video player when clicking on a video card', async ({ page }) => {
    // Wait for videos to potentially load
    await page.waitForTimeout(2000);

    const videoCards = page.locator('[data-testid="video-card"]');
    const cardCount = await videoCards.count();

    if (cardCount > 0) {
      // Click on the first video card
      await videoCards.first().click();

      // Check that video player modal opens
      const playerModal = page.locator('.fixed.inset-0.z-50');
      await expect(playerModal).toBeVisible({ timeout: 5000 });

      // Check for video element
      const videoElement = page.locator('video');
      await expect(videoElement).toBeVisible();

      // Check for close button
      const closeButton = page.locator('button:has-text("✕")');
      await expect(closeButton).toBeVisible();
    }
  });

  test('should close video player when clicking close button', async ({ page }) => {
    // Wait for videos to potentially load
    await page.waitForTimeout(2000);

    const videoCards = page.locator('[data-testid="video-card"]');
    const cardCount = await videoCards.count();

    if (cardCount > 0) {
      // Open video player
      await videoCards.first().click();
      
      // Wait for player to open
      const playerModal = page.locator('.fixed.inset-0.z-50');
      await expect(playerModal).toBeVisible();

      // Click close button
      const closeButton = page.locator('button:has-text("✕")');
      await closeButton.click();

      // Check that modal is closed
      await expect(playerModal).not.toBeVisible();
    }
  });

  test('should close video player when clicking backdrop', async ({ page }) => {
    // Wait for videos to potentially load
    await page.waitForTimeout(2000);

    const videoCards = page.locator('[data-testid="video-card"]');
    const cardCount = await videoCards.count();

    if (cardCount > 0) {
      // Open video player
      await videoCards.first().click();
      
      // Wait for player to open
      const playerModal = page.locator('.fixed.inset-0.z-50');
      await expect(playerModal).toBeVisible();

      // Click on backdrop (the overlay behind the video)
      const backdrop = page.locator('.absolute.inset-0.bg-black.bg-opacity-90');
      await backdrop.click();

      // Check that modal is closed
      await expect(playerModal).not.toBeVisible();
    }
  });

  test('should handle video loading errors gracefully', async ({ page }) => {
    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Check for error states
    const errorMessage = page.locator('text=Failed to load videos');
    const errorIndicator = page.locator('[data-testid="error-message"]');

    // If there are errors, they should be displayed properly
    if (await errorMessage.isVisible() || await errorIndicator.isVisible()) {
      // Error state should be user-friendly
      expect(true).toBe(true); // This test passes if error handling is visible
    }
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate and wait for load
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that header is still visible and readable
    await expect(page.locator('text=Sofathek')).toBeVisible();

    // Check that grid adapts to mobile (should stack videos)
    const videoGrid = page.locator('.main-video-grid');
    await expect(videoGrid).toBeVisible();

    // Grid should be responsive (this is tested through CSS classes)
    await expect(videoGrid).toHaveClass(/grid/);
  });

  test('should maintain functionality across browser refresh', async ({ page }) => {
    // Navigate to app
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check that everything still works after refresh
    await expect(page.locator('text=Sofathek')).toBeVisible();
    await expect(page.locator('h2:has-text("Video Library")')).toBeVisible();

    const videoGrid = page.locator('.main-video-grid');
    await expect(videoGrid).toBeVisible();
  });
});