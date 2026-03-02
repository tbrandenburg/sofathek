import { test, expect } from '@playwright/test';

test.describe('Playwright Configuration', () => {
  test('should connect to correct development server port', async ({ page }) => {
    await page.goto('/');
    
    // Verify we're connected to the right port
    expect(page.url()).toContain('5183');
    
    // Verify page loads correctly
    await expect(page.getByRole('button', { name: 'Library' })).toBeVisible();
  });

  test('should run with consistent browser versions', async ({ browserName }) => {
    // Verify browser compatibility
    expect(['chromium', 'firefox', 'webkit']).toContain(browserName);
  });

  test('should have working webServer configuration', async ({ page }) => {
    // Test that webServer starts correctly and serves the app
    await page.goto('/');
    await expect(page).toHaveTitle(/Sofathek/);
  });
});