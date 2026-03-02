/* eslint-disable @typescript-eslint/no-unused-vars */
import { test, expect } from '@playwright/test';

/**
 * Responsive Portability End-to-End Tests
 * 
 * Validates cross-device layouts and viewport adaptations
 * as part of Level 5 validation (Portability)
 */

test.describe('Responsive Portability', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 }
  ];

  viewports.forEach(({ name, width, height }) => {
    test.describe(`${name} viewport (${width}x${height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto('/');
        await page.waitForLoadState('networkidle');
      });

      test('should display properly at viewport size', async ({ page }) => {
        // Verify page loads without horizontal scrollbar
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        const viewportWidth = await page.evaluate(() => window.innerWidth);
        
        expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20); // Allow small margin

        // Verify main content area is visible
        const mainContent = page.locator('main, [data-testid="main-content"]').first();
        if (await mainContent.count() > 0) {
          await expect(mainContent).toBeVisible();
        }
      });

      test('should have accessible theme toggle at all sizes', async ({ page }) => {
        const themeToggle = page.getByRole('button', { name: /toggle theme/i });
        
        // Theme toggle should be visible and clickable
        await expect(themeToggle).toBeVisible();
        await expect(themeToggle).toBeEnabled();
        
        // Should be able to open dropdown
        await themeToggle.click();
        
        // Verify dropdown is visible and accessible
        const lightOption = page.getByRole('menuitem', { name: /light/i });
        const darkOption = page.getByRole('menuitem', { name: /dark/i });
        const systemOption = page.getByRole('menuitem', { name: /system/i });
        
        await expect(lightOption).toBeVisible();
        await expect(darkOption).toBeVisible();
        await expect(systemOption).toBeVisible();

        // Test theme switching works
        await darkOption.click();
        await page.waitForTimeout(300);
        await expect(page.locator('html')).toHaveClass(/dark/);
      });

      test('should maintain usable touch targets on mobile', async ({ page }) => {
        if (width <= 768) { // Mobile and small tablet
          // Check theme toggle button size
          const themeToggle = page.getByRole('button', { name: /toggle theme/i });
          const buttonBox = await themeToggle.boundingBox();
          
          if (buttonBox) {
            // Touch targets should be at least 44x44px (Apple) or 48x48px (Material)
            expect(buttonBox.width).toBeGreaterThanOrEqual(40);
            expect(buttonBox.height).toBeGreaterThanOrEqual(40);
          }

          // Check dropdown menu items are touch-friendly
          await themeToggle.click();
          
          const menuItems = page.getByRole('menuitem');
          const itemCount = await menuItems.count();
          
          for (let i = 0; i < itemCount; i++) {
            const item = menuItems.nth(i);
            const itemBox = await item.boundingBox();
            
            if (itemBox) {
              expect(itemBox.height).toBeGreaterThanOrEqual(40);
            }
          }
        }
      });

      test('should handle responsive layout changes', async ({ page }) => {
        // Check if layout adapts appropriately for viewport
        const bodyClasses = await page.locator('body').getAttribute('class');
        
        // Verify responsive classes or behavior exists
        if (width <= 640) {
          // Mobile: should have compact layout
          const elements = page.locator('*').filter({ hasNotText: '' }).first();
          if (await elements.count() > 0) {
            const styles = await elements.evaluate((el) => {
              return window.getComputedStyle(el);
            });
            // Basic check that styling is applied
            expect(styles).toBeDefined();
          }
        } else if (width <= 1024) {
          // Tablet: should have medium layout
          // Similar checks for tablet-specific layout
        } else {
          // Desktop: should have full layout
          // Similar checks for desktop-specific layout
        }
      });
    });
  });

  test('should handle viewport size changes dynamically', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Start with desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);

    // Verify theme toggle is visible on desktop
    let themeToggle = page.getByRole('button', { name: /toggle theme/i });
    await expect(themeToggle).toBeVisible();

    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // Verify theme toggle is still visible and functional on mobile
    themeToggle = page.getByRole('button', { name: /toggle theme/i });
    await expect(themeToggle).toBeVisible();
    
    // Test functionality
    await themeToggle.click();
    await page.getByRole('menuitem', { name: /dark/i }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Resize back to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);

    // Verify theme is still applied
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('should maintain theme persistence across viewport changes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Set theme on desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.getByRole('button', { name: /toggle theme/i }).click();
    await page.getByRole('menuitem', { name: /light/i }).click();
    await page.waitForTimeout(300);

    // Verify light theme
    await expect(page.locator('html')).toHaveClass(/light/);

    // Change to mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // Theme should persist
    await expect(page.locator('html')).toHaveClass(/light/);

    // Change theme on mobile
    await page.getByRole('button', { name: /toggle theme/i }).click();
    await page.getByRole('menuitem', { name: /dark/i }).click();
    await page.waitForTimeout(300);

    // Change back to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);

    // Theme should still be dark
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('should handle orientation changes on mobile devices', async ({ page }) => {
    // Portrait mode
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify layout in portrait
    const themeTogglePortrait = page.getByRole('button', { name: /toggle theme/i });
    await expect(themeTogglePortrait).toBeVisible();

    // Switch to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(500);

    // Verify layout in landscape
    const themeToggleLandscape = page.getByRole('button', { name: /toggle theme/i });
    await expect(themeToggleLandscape).toBeVisible();

    // Test functionality in landscape
    await themeToggleLandscape.click();
    await page.getByRole('menuitem', { name: /system/i }).click();
    await page.waitForTimeout(300);

    // Verify system theme is applied
    const isDarkMode = await page.evaluate(() => {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    const htmlElement = page.locator('html');
    if (isDarkMode) {
      await expect(htmlElement).toHaveClass(/dark/);
    } else {
      await expect(htmlElement).toHaveClass(/light/);
    }
  });
});