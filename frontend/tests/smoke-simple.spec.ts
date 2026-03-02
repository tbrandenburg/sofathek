import { test, expect } from '@playwright/test';

/**
 * Minimal Smoke Test
 * 
 * Just verify the app loads at all - no complex component interactions
 */

test.describe('Minimal Smoke Tests', () => {
  test('should load the page without errors', async ({ page }) => {
    await page.goto('/');
    
    // Wait for React root to exist and not be empty
    await page.waitForSelector('#root:not(:empty)', { timeout: 30000 });
    
    // Just verify we have some content
    const rootContent = await page.locator('#root').textContent();
    expect(rootContent).toBeTruthy();
    expect(rootContent?.length || 0).toBeGreaterThan(0);
  });

  test('should have correct page title', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root:not(:empty)', { timeout: 30000 });
    
    // Check for page title containing "Sofathek"
    await expect(page).toHaveTitle(/Sofathek/);
  });

  test('should render without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForSelector('#root:not(:empty)', { timeout: 30000 });
    
    // Wait for any delayed errors
    await page.waitForTimeout(1000);
    
    // Filter out known harmless errors
    const criticalErrors = errors.filter(error => 
      !error.includes('ResizeObserver') &&
      !error.includes('Non-Error promise rejection')
    );
    
    expect(criticalErrors.length).toBe(0);
  });
});