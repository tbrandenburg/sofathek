import { test, expect } from '@playwright/test';

/**
 * Minimal Smoke Test for CI/CD Pipeline
 * 
 * Tests the most basic functionality to get CI passing
 */

test.describe('Smoke Test - Basic App Functionality', () => {
  test('should load the app with basic content', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for React app to initialize (simpler check)
    await page.waitForSelector('#root', { timeout: 30000 });
    
    // Verify basic content is present - just check for the Sofathek title
    const title = page.locator('h1');
    await expect(title).toBeVisible({ timeout: 15000 });
    await expect(title).toContainText('Sofathek');
    
    // Verify the page loads without crashing
    const errorElements = page.locator('[data-testid*="error"], .error');
    const errorCount = await errorElements.count();
    expect(errorCount).toBe(0);
  });
  
  test('should have basic page structure', async ({ page }) => {
    await page.goto('/');
    
    // Wait for app to load
    await page.waitForSelector('#root', { timeout: 30000 });
    
    // Check for basic structural elements
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });
});