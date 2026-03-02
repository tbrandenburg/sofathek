import { test, expect, type Page } from '@playwright/test';

/**
 * Ultra Basic Smoke Test - Minimum viable E2E test for CI
 * Enhanced with server readiness checks for CI reliability
 */

// Helper function to wait for server readiness
async function waitForServerReady(page: Page, maxRetries = 5): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 10000 });
      if (response?.status() === 200) {
        return true;
      }
    } catch (error) {
      console.log(`Server readiness check ${i + 1}/${maxRetries} failed, retrying...`);
      await page.waitForTimeout(2000); // Wait 2 seconds before retry
    }
  }
  return false;
}

test.describe('Ultra Basic Tests', () => {
  test('should load page successfully with server readiness check', async ({ page }) => {
    // Wait for server to be ready with retry mechanism
    const serverReady = await waitForServerReady(page);
    expect(serverReady).toBe(true);
    
    // Verify the response status (200 or 304 are both successful)
    const response = await page.goto('/');
    expect(response?.status()).toBeGreaterThanOrEqual(200);
    expect(response?.status()).toBeLessThan(400);
  });

  test('should have html content', async ({ page }) => {
    await waitForServerReady(page);
    await page.goto('/');
    const content = await page.content();
    expect(content).toContain('<html');
    expect(content).toContain('</html>');
  });

  test('should have a title', async ({ page }) => {
    await waitForServerReady(page);
    await page.goto('/');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});