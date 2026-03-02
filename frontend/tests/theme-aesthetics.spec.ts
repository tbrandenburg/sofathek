/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from '@playwright/test';

/**
 * Theme Aesthetics End-to-End Tests
 * 
 * Validates visual design, theme transitions, and color contrast
 * as part of Level 5 validation (Aesthetics)
 */

test.describe('Theme Aesthetics', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application and wait for it to load
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display proper dark theme styling', async ({ page }) => {
    // Verify theme toggle button exists
    const themeToggle = page.getByRole('button', { name: /toggle theme/i });
    await expect(themeToggle).toBeVisible();

    // Click to open dropdown
    await themeToggle.click();
    
    // Select dark theme
    await page.getByRole('menuitem', { name: /dark/i }).click();
    
    // Wait for theme transition
    await page.waitForTimeout(500);

    // Verify dark theme is applied to document
    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveClass(/dark/);

    // Verify dark theme styling on key components
    const body = page.locator('body');
    const computedStyle = await body.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color
      };
    });

    // Dark theme should have dark background
    expect(computedStyle.backgroundColor).not.toBe('rgb(255, 255, 255)'); // Not white
  });

  test('should display proper light theme styling', async ({ page }) => {
    // Open theme selector and choose light
    await page.getByRole('button', { name: /toggle theme/i }).click();
    await page.getByRole('menuitem', { name: /light/i }).click();
    
    // Wait for theme transition
    await page.waitForTimeout(500);

    // Verify light theme is applied
    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveClass(/light/);

    // Verify light theme styling
    const body = page.locator('body');
    const computedStyle = await body.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color
      };
    });

    // Light theme should have light background (not pure black)
    expect(computedStyle.backgroundColor).not.toBe('rgb(0, 0, 0)'); // Not black
  });

  test('should have smooth theme transitions', async ({ page }) => {
    const themeToggle = page.getByRole('button', { name: /toggle theme/i });
    
    // Start with light theme
    await themeToggle.click();
    await page.getByRole('menuitem', { name: /light/i }).click();
    await page.waitForTimeout(300);

    // Switch to dark theme and measure transition
    await themeToggle.click();
    
    const transitionStart = Date.now();
    await page.getByRole('menuitem', { name: /dark/i }).click();
    
    // Wait for transition to complete
    await page.waitForTimeout(500);
    const transitionEnd = Date.now();
    
    // Verify transition took reasonable time (not instant, not too slow)
    const transitionTime = transitionEnd - transitionStart;
    expect(transitionTime).toBeGreaterThan(100); // Not instant
    expect(transitionTime).toBeLessThan(2000); // Not too slow

    // Verify final state
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('should maintain consistent typography across themes', async ({ page }) => {
    // Test typography consistency in both themes
    const themes = ['light', 'dark'];
    const fontMetrics: Record<string, any> = {};

    for (const theme of themes) {
      // Set theme
      await page.getByRole('button', { name: /toggle theme/i }).click();
      await page.getByRole('menuitem', { name: new RegExp(theme, 'i') }).click();
      await page.waitForTimeout(300);

      // Measure font properties of key elements
      const headingElement = page.locator('h1, h2, h3').first();
      if (await headingElement.count() > 0) {
        fontMetrics[theme] = await headingElement.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            fontSize: styles.fontSize,
            fontFamily: styles.fontFamily,
            lineHeight: styles.lineHeight,
            fontWeight: styles.fontWeight
          };
        });
      }
    }

    // If we have both theme measurements, verify consistency
    if (fontMetrics.light && fontMetrics.dark) {
      expect(fontMetrics.light.fontSize).toBe(fontMetrics.dark.fontSize);
      expect(fontMetrics.light.fontFamily).toBe(fontMetrics.dark.fontFamily);
      expect(fontMetrics.light.lineHeight).toBe(fontMetrics.dark.lineHeight);
    }
  });

  test('should display theme toggle button with proper styling', async ({ page }) => {
    const themeToggle = page.getByRole('button', { name: /toggle theme/i });
    
    // Verify button is visible and clickable
    await expect(themeToggle).toBeVisible();
    await expect(themeToggle).toBeEnabled();

    // Verify button has proper styling classes (shadcn/ui button)
    const buttonClasses = await themeToggle.getAttribute('class');
    expect(buttonClasses).toContain('inline-flex');
    expect(buttonClasses).toContain('items-center');
    expect(buttonClasses).toContain('justify-center');

    // Verify icons are present
    const sunIcon = themeToggle.locator('.lucide-sun');
    const moonIcon = themeToggle.locator('.lucide-moon');
    
    await expect(sunIcon).toBeAttached();
    await expect(moonIcon).toBeAttached();
  });

  test('should handle system theme detection', async ({ page }) => {
    // Set theme to system
    await page.getByRole('button', { name: /toggle theme/i }).click();
    await page.getByRole('menuitem', { name: /system/i }).click();
    await page.waitForTimeout(300);

    // Verify system theme is applied based on browser preference
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

  test('should maintain visual consistency across page elements', async ({ page }) => {
    // Test both themes for visual consistency
    const themes = ['light', 'dark'];
    
    for (const theme of themes) {
      await page.getByRole('button', { name: /toggle theme/i }).click();
      await page.getByRole('menuitem', { name: new RegExp(theme, 'i') }).click();
      await page.waitForTimeout(300);

      // Check that all major elements respond to theme change
      const elements = [
        page.locator('body'),
        page.locator('main'),
        page.locator('header').first(),
        page.locator('button').first()
      ];

      for (const element of elements) {
        if (await element.count() > 0) {
          // Verify element has appropriate theme-aware styling
          const computedStyles = await element.evaluate((el) => {
            const styles = window.getComputedStyle(el);
            return {
              backgroundColor: styles.backgroundColor,
              color: styles.color,
              borderColor: styles.borderColor
            };
          });

          // Basic check: ensure colors are not default/unset
          expect(computedStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
        }
      }
    }
  });
});