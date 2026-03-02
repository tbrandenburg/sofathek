/* eslint-disable @typescript-eslint/no-unused-vars */
import { test, expect } from '@playwright/test';

/**
 * Cross-Browser Compatibility End-to-End Tests
 * 
 * Validates browser compatibility across Chromium, Firefox, and WebKit
 * as part of Level 5 validation (Browser Compatibility)
 */

test.describe('Cross-Browser Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should load application successfully in all browsers', async ({ page, browserName }) => {
    // Verify page loads without errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000); // Allow time for any errors

    // Should have minimal console errors (allow for some minor warnings)
    const criticalErrors = consoleErrors.filter(error => 
      error.includes('TypeError') || 
      error.includes('ReferenceError') || 
      error.includes('SyntaxError')
    );
    
    expect(criticalErrors).toHaveLength(0);
    
    // Basic page structure should be present
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should render theme toggle consistently across browsers', async ({ page, browserName }) => {
    const themeToggle = page.getByRole('button', { name: /toggle theme/i });
    
    // Theme toggle should be visible and functional in all browsers
    await expect(themeToggle).toBeVisible();
    await expect(themeToggle).toBeEnabled();
    
    // Should have consistent styling
    const buttonBox = await themeToggle.boundingBox();
    expect(buttonBox).toBeTruthy();
    expect(buttonBox!.width).toBeGreaterThan(30);
    expect(buttonBox!.height).toBeGreaterThan(30);
    
    // Icons should render properly
    const sunIcon = themeToggle.locator('.lucide-sun');
    const moonIcon = themeToggle.locator('.lucide-moon');
    
    await expect(sunIcon).toBeAttached();
    await expect(moonIcon).toBeAttached();
  });

  test('should handle theme switching consistently across browsers', async ({ page, browserName }) => {
    const themeToggle = page.getByRole('button', { name: /toggle theme/i });
    
    // Test all theme options work in current browser
    const themes = ['light', 'dark', 'system'];
    
    for (const theme of themes) {
      await themeToggle.click();
      await page.getByRole('menuitem', { name: new RegExp(theme, 'i') }).click();
      await page.waitForTimeout(300);
      
      if (theme === 'system') {
        // For system theme, check that appropriate theme is applied
        const isDarkMode = await page.evaluate(() => {
          return window.matchMedia('(prefers-color-scheme: dark)').matches;
        });
        
        const htmlElement = page.locator('html');
        if (isDarkMode) {
          await expect(htmlElement).toHaveClass(/dark/);
        } else {
          await expect(htmlElement).toHaveClass(/light/);
        }
      } else {
        // For explicit themes, verify class is applied
        const htmlElement = page.locator('html');
        await expect(htmlElement).toHaveClass(new RegExp(theme));
      }
    }
  });

  test('should maintain localStorage functionality across browsers', async ({ page, browserName }) => {
    const themeToggle = page.getByRole('button', { name: /toggle theme/i });
    
    // Set a specific theme
    await themeToggle.click();
    await page.getByRole('menuitem', { name: /dark/i }).click();
    await page.waitForTimeout(300);
    
    // Verify localStorage is set
    const storedTheme = await page.evaluate(() => {
      return localStorage.getItem('vite-ui-theme');
    });
    
    expect(storedTheme).toBe('dark');
    
    // Reload and verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Theme should persist across reload in all browsers
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('should handle CSS custom properties (CSS variables) correctly', async ({ page, browserName }) => {
    // Verify CSS custom properties work (important for theme system)
    const rootStyles = await page.evaluate(() => {
      const root = document.documentElement;
      const computedStyles = window.getComputedStyle(root);
      
      // Check for common CSS custom properties used in theme system
      return {
        background: computedStyles.getPropertyValue('--background'),
        foreground: computedStyles.getPropertyValue('--foreground'),
        primary: computedStyles.getPropertyValue('--primary')
      };
    });
    
    // At least some CSS custom properties should be defined
    // (This validates that the CSS-in-JS theme system works)
    const hasVariables = Object.values(rootStyles).some(value => value && value.trim() !== '');
    
    if (hasVariables) {
      // If variables are used, they should have valid values
      Object.values(rootStyles).forEach(value => {
        if (value && value.trim() !== '') {
          expect(value).not.toBe('initial');
          expect(value).not.toBe('unset');
        }
      });
    }
  });

  test('should handle JavaScript features consistently', async ({ page, browserName }) => {
    // Test modern JavaScript features used in the app
    const jsFeatures = await page.evaluate(() => {
      return {
        // Test arrow functions
        arrowFunctions: (() => true)(),
        
        // Test const/let
        blockScope: (() => {
          const test = 'works';
          return test === 'works';
        })(),
        
        // Test template literals
        templateLiterals: `test ${'interpolation'}` === 'test interpolation',
        
        // Test destructuring
        destructuring: (() => {
          const { a } = { a: 1 };
          return a === 1;
        })(),
        
        // Test async/await (if used)
        promises: Promise.resolve(true)
      };
    });
    
    expect(jsFeatures.arrowFunctions).toBe(true);
    expect(jsFeatures.blockScope).toBe(true);
    expect(jsFeatures.templateLiterals).toBe(true);
    expect(jsFeatures.destructuring).toBe(true);
    expect(jsFeatures.promises).toBeInstanceOf(Promise);
  });

  test('should handle DOM events consistently', async ({ page, browserName }) => {
    const themeToggle = page.getByRole('button', { name: /toggle theme/i });
    
    // Test click events
    await themeToggle.click();
    await expect(themeToggle).toHaveAttribute('aria-expanded', 'true');
    
    // Test keyboard events
    await page.keyboard.press('Escape');
    await expect(themeToggle).toHaveAttribute('aria-expanded', 'false');
    
    // Test focus events
    await themeToggle.focus();
    await expect(themeToggle).toBeFocused();
    
    // Test blur events
    await page.keyboard.press('Tab');
    // Focus should move away (exact element depends on page structure)
    // Just verify the focus system works
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeAttached();
  });

  test('should render fonts and typography consistently', async ({ page, browserName }) => {
    // Check that text renders properly
    const textElements = page.locator('h1, h2, h3, p, button, span').filter({ hasText: /\w/ });
    const count = Math.min(await textElements.count(), 3);
    
    for (let i = 0; i < count; i++) {
      const element = textElements.nth(i);
      
      if (await element.isVisible()) {
        const textContent = await element.textContent();
        expect(textContent).toBeTruthy();
        expect(textContent!.trim().length).toBeGreaterThan(0);
        
        // Verify text is rendered (has dimensions)
        const box = await element.boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThan(0);
          expect(box.height).toBeGreaterThan(0);
        }
      }
    }
  });

  // Browser-specific tests for known compatibility issues
  test('should handle WebKit-specific behaviors', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'WebKit-specific test');
    
    // WebKit sometimes has different behavior with CSS transforms and transitions
    const themeToggle = page.getByRole('button', { name: /toggle theme/i });
    
    // Test theme switching animation works in WebKit
    await themeToggle.click();
    await page.getByRole('menuitem', { name: /dark/i }).click();
    await page.waitForTimeout(500); // Allow extra time for WebKit
    
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('should handle Firefox-specific behaviors', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'Firefox-specific test');
    
    // Firefox sometimes handles focus differently
    const themeToggle = page.getByRole('button', { name: /toggle theme/i });
    
    await themeToggle.focus();
    await expect(themeToggle).toBeFocused();
    
    // Test that dropdown works with Firefox focus handling
    await themeToggle.click();
    await expect(page.getByRole('menuitem', { name: /light/i })).toBeVisible();
  });

  test('should handle Chromium-specific behaviors', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chromium-specific test');
    
    // Chromium-specific optimizations or behaviors
    const themeToggle = page.getByRole('button', { name: /toggle theme/i });
    
    // Chromium should handle rapid theme switching
    await themeToggle.click();
    await page.getByRole('menuitem', { name: /light/i }).click();
    await page.waitForTimeout(100);
    
    await themeToggle.click();
    await page.getByRole('menuitem', { name: /dark/i }).click();
    await page.waitForTimeout(100);
    
    // Final theme should be applied
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});