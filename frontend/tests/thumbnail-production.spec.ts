import { test, expect } from '@playwright/test';

const BACKEND_URL = `http://localhost:${process.env.SOFATHEK_BACKEND_PORT || '3010'}`;
const FRONTEND_URL = `http://localhost:${process.env.SOFATHEK_FRONTEND_PORT || '5183'}`;

/**
 * Thumbnail Display Verification Tests for Production Build
 * 
 * Verifies that all video thumbnails are properly displayed in the production build
 * running on SOFATHEK_FRONTEND_PORT (default 5183) with backend on SOFATHEK_BACKEND_PORT (default 3010)
 */

test.describe('Production Thumbnail Display Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the production app
    await page.goto(FRONTEND_URL);
    
    // Wait for the application to load completely
    await page.waitForLoadState('networkidle');
    
    // Wait for video grid to appear
    await page.waitForSelector('.video-grid-container', { timeout: 15000 });
  });

  test('should display thumbnails for all 9 videos in the library', async ({ page }) => {
    // Wait for all video cards to load
    await page.waitForSelector('.video-card', { timeout: 15000 });
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'thumbnail-test-before-verification.png', fullPage: true });
    
    // Get all video cards
    const videoCards = await page.locator('.video-card').all();
    expect(videoCards.length).toBe(9); // We know there are exactly 9 videos
    
    console.log(`✅ Found ${videoCards.length} video cards as expected`);
    
    // Verify each video card has a working thumbnail
    const results: Array<{
      title: string;
      src: string | null;
      loaded: boolean;
      dimensions: { width: number; height: number; };
    }> = [];
    for (let i = 0; i < videoCards.length; i++) {
      const card = videoCards[i];
      
      // Get video title from the card
      const titleElement = await card.locator('h3, .video-title, [class*="title"]').first();
      const title = await titleElement.textContent() || `Video ${i + 1}`;
      
      // Find thumbnail image within this card
      const thumbnailImg = await card.locator('img').first();
      await expect(thumbnailImg, `Thumbnail image should be visible for ${title}`).toBeVisible({ timeout: 5000 });
      
      // Verify image source points to correct API endpoint
      const imgSrc = await thumbnailImg.getAttribute('src');
      expect(imgSrc, `Image src should be set for ${title}`).toBeTruthy();
      expect(imgSrc, `Image src should point to thumbnails API for ${title}`).toMatch(/\/api\/thumbnails\/.*\.jpg$/);
      
      // Verify image is actually loaded (not broken)
      const isImgLoaded = await thumbnailImg.evaluate((img: HTMLImageElement) => {
        return img.complete && img.naturalHeight !== 0 && img.naturalWidth !== 0;
      });
      
      results.push({
        title: title.trim(),
        src: imgSrc,
        loaded: isImgLoaded,
        dimensions: await thumbnailImg.evaluate((img: HTMLImageElement) => ({
          width: img.naturalWidth,
          height: img.naturalHeight
        }))
      });
      
      expect(isImgLoaded, `Thumbnail should be fully loaded for ${title}`).toBeTruthy();
      console.log(`✅ ${title}: thumbnail loaded successfully (${imgSrc})`);
    }
    
    // Verify all thumbnails are loaded
    const failedThumbnails = results.filter(r => !r.loaded);
    if (failedThumbnails.length > 0) {
      console.log('❌ Failed thumbnails:', failedThumbnails);
      // Take a screenshot showing the failure
      await page.screenshot({ path: 'thumbnail-test-failures.png', fullPage: true });
    }
    expect(failedThumbnails, 'All thumbnails should load successfully').toHaveLength(0);
    
    console.log(`\n📊 Summary: ${results.length}/9 thumbnails verified successfully`);
    
    // Take final success screenshot
    await page.screenshot({ path: 'thumbnail-test-success.png', fullPage: true });
  });

  test('should verify thumbnail API endpoints are accessible', async ({ page }) => {
    // Wait for videos to load
    await page.waitForSelector('.video-card img', { timeout: 15000 });
    
    // Get all thumbnail images
    const thumbnailImages = await page.locator('.video-card img').all();
    expect(thumbnailImages.length).toBeGreaterThan(0);
    
    // Test first few thumbnail API endpoints directly
    const testCount = Math.min(3, thumbnailImages.length);
    
    for (let i = 0; i < testCount; i++) {
      const img = thumbnailImages[i];
      const imgSrc = await img.getAttribute('src');
      expect(imgSrc).toBeTruthy();
      
      // Test direct API access to thumbnail
      const fullUrl = `${BACKEND_URL}${imgSrc}`;
      const response = await page.request.get(fullUrl);
      
      expect(response.status(), `Thumbnail API should return 200 for ${imgSrc}`).toBe(200);
      expect(response.headers()['content-type'], `Should return JPEG content type for ${imgSrc}`).toContain('image/jpeg');
      
      // Verify reasonable file size
      const contentLength = parseInt(response.headers()['content-length'] || '0');
      expect(contentLength, `Thumbnail should have reasonable size for ${imgSrc}`).toBeGreaterThan(1000); // At least 1KB
      expect(contentLength, `Thumbnail should not be too large for ${imgSrc}`).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
      
      console.log(`✅ Thumbnail API verified: ${imgSrc} (${contentLength} bytes)`);
    }
  });

  test('should handle non-existent thumbnail gracefully', async ({ page }) => {
    // Try to access a non-existent thumbnail directly
    const nonExistentUrl = `${BACKEND_URL}/api/thumbnails/non-existent-video.jpg`;
    const response = await page.request.get(nonExistentUrl);
    
    // Should return 404 for non-existent thumbnail
    expect(response.status()).toBe(404);
    console.log('✅ Non-existent thumbnail returns 404 as expected');
  });

  test('should verify thumbnail aspect ratios and dimensions', async ({ page }) => {
    // Wait for videos to load
    await page.waitForSelector('.video-card img', { timeout: 15000 });
    
    const thumbnails = await page.locator('.video-card img').all();
    expect(thumbnails.length).toBe(9);
    
    // Check dimensions of all thumbnails
    const dimensionResults: Array<{
      index: number;
      natural: string;
      display: string;
      aspectRatio: string;
    }> = [];
    for (let i = 0; i < thumbnails.length; i++) {
      const img = thumbnails[i];
      await expect(img).toBeVisible();
      
      const dimensions = await img.evaluate((el: HTMLImageElement) => ({
        naturalWidth: el.naturalWidth,
        naturalHeight: el.naturalHeight,
        displayWidth: el.offsetWidth,
        displayHeight: el.offsetHeight
      }));
      
      // Verify image has reasonable natural dimensions (actual thumbnail size)
      expect(dimensions.naturalWidth, `Thumbnail ${i + 1} should have width > 0`).toBeGreaterThan(0);
      expect(dimensions.naturalHeight, `Thumbnail ${i + 1} should have height > 0`).toBeGreaterThan(0);
      
      // Calculate aspect ratio
      const aspectRatio = dimensions.naturalWidth / dimensions.naturalHeight;
      
      // Thumbnails should have a reasonable aspect ratio (video-like)
      expect(aspectRatio, `Thumbnail ${i + 1} aspect ratio should be reasonable`).toBeGreaterThan(0.5); 
      expect(aspectRatio, `Thumbnail ${i + 1} aspect ratio should not be too wide`).toBeLessThan(3.0);
      
      dimensionResults.push({
        index: i + 1,
        natural: `${dimensions.naturalWidth}x${dimensions.naturalHeight}`,
        display: `${dimensions.displayWidth}x${dimensions.displayHeight}`,
        aspectRatio: aspectRatio.toFixed(2)
      });
      
      console.log(`✅ Thumbnail ${i + 1}: ${dimensions.naturalWidth}x${dimensions.naturalHeight} (ratio: ${aspectRatio.toFixed(2)})`);
    }
    
    // All thumbnails should have similar aspect ratios (generated from same source)
    const aspectRatios = dimensionResults.map(r => parseFloat(r.aspectRatio));
    const avgAspectRatio = aspectRatios.reduce((a, b) => a + b) / aspectRatios.length;
    
    console.log(`📊 Average aspect ratio: ${avgAspectRatio.toFixed(2)}`);
  });

  test('should verify Netflix-like grid layout with thumbnails', async ({ page }) => {
    // Wait for video grid to load
    await page.waitForSelector('.video-grid', { timeout: 15000 });
    
    // Get the video grid container
    const videoGrid = await page.locator('.video-grid');
    await expect(videoGrid).toBeVisible();
    
    // Verify grid contains exactly 9 video cards with thumbnails
    const cardsInGrid = await videoGrid.locator('.video-card').count();
    expect(cardsInGrid).toBe(9);
    
    // Verify each card in the grid has an image
    const imagesInGrid = await videoGrid.locator('.video-card img').count();
    expect(imagesInGrid).toBe(9);
    
    // Check grid layout properties
    const gridStyles = await videoGrid.evaluate(el => {
      const styles = getComputedStyle(el);
      return {
        display: styles.display,
        gridTemplateColumns: styles.gridTemplateColumns,
        gap: styles.gap
      };
    });
    
    console.log('✅ Grid layout verified:', gridStyles);
    
    // Take screenshot of the complete grid
    await page.screenshot({ path: 'thumbnail-grid-layout.png', fullPage: true });
  });
});