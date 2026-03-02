import { test, expect } from '@playwright/test';

/**
 * Ultra Basic Smoke Test - Minimum viable E2E test for CI
 */

test.describe('Ultra Basic Tests', () => {
  test('should load page successfully', async ({ page }) => {
    // Just try to navigate to the page
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  test('should have html content', async ({ page }) => {
    await page.goto('/');
    const content = await page.content();
    expect(content).toContain('<html');
    expect(content).toContain('</html>');
  });

  test('should have a title', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});