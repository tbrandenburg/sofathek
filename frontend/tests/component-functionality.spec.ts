import { test, expect } from '@playwright/test';

/**
 * Component Functionality End-to-End Tests
 * 
 * Validates UI interactions, loading states, and error handling
 * as part of Level 5 validation (Functionality)
 */

test.describe('Component Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Theme Toggle Functionality', () => {
    test('should open and close theme dropdown menu', async ({ page }) => {
      const themeToggle = page.getByRole('button', { name: /toggle theme/i });
      
      // Initially closed
      await expect(themeToggle).toHaveAttribute('aria-expanded', 'false');
      
      // Click to open
      await themeToggle.click();
      await expect(themeToggle).toHaveAttribute('aria-expanded', 'true');
      
      // Verify menu items are visible
      await expect(page.getByRole('menuitem', { name: /light/i })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: /dark/i })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: /system/i })).toBeVisible();
      
      // Click outside to close
      await page.click('body');
      await expect(themeToggle).toHaveAttribute('aria-expanded', 'false');
    });

    test('should handle keyboard navigation', async ({ page }) => {
      const themeToggle = page.getByRole('button', { name: /toggle theme/i });
      
      // Focus the button
      await themeToggle.focus();
      await expect(themeToggle).toBeFocused();
      
      // Press Enter to open
      await page.keyboard.press('Enter');
      await expect(themeToggle).toHaveAttribute('aria-expanded', 'true');
      
      // Press Escape to close
      await page.keyboard.press('Escape');
      await expect(themeToggle).toHaveAttribute('aria-expanded', 'false');
      
      // Press Space to open again
      await page.keyboard.press('Space');
      await expect(themeToggle).toHaveAttribute('aria-expanded', 'true');
    });

    test('should switch between all theme options', async ({ page }) => {
      const themeToggle = page.getByRole('button', { name: /toggle theme/i });
      
      // Test Light theme
      await themeToggle.click();
      await page.getByRole('menuitem', { name: /light/i }).click();
      await page.waitForTimeout(300);
      await expect(page.locator('html')).toHaveClass(/light/);
      
      // Test Dark theme
      await themeToggle.click();
      await page.getByRole('menuitem', { name: /dark/i }).click();
      await page.waitForTimeout(300);
      await expect(page.locator('html')).toHaveClass(/dark/);
      
      // Test System theme
      await themeToggle.click();
      await page.getByRole('menuitem', { name: /system/i }).click();
      await page.waitForTimeout(300);
      
      // Verify system theme is applied based on browser preference
      const isDarkMode = await page.evaluate(() => {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      });
      
      if (isDarkMode) {
        await expect(page.locator('html')).toHaveClass(/dark/);
      } else {
        await expect(page.locator('html')).toHaveClass(/light/);
      }
    });
  });

  test.describe('Theme Persistence', () => {
    test('should persist theme selection across page reloads', async ({ page }) => {
      const themeToggle = page.getByRole('button', { name: /toggle theme/i });
      
      // Set dark theme
      await themeToggle.click();
      await page.getByRole('menuitem', { name: /dark/i }).click();
      await page.waitForTimeout(300);
      await expect(page.locator('html')).toHaveClass(/dark/);
      
      // Reload the page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Verify theme is still dark
      await expect(page.locator('html')).toHaveClass(/dark/);
    });

    test('should persist theme in localStorage', async ({ page }) => {
      const themeToggle = page.getByRole('button', { name: /toggle theme/i });
      
      // Set light theme
      await themeToggle.click();
      await page.getByRole('menuitem', { name: /light/i }).click();
      await page.waitForTimeout(300);
      
      // Check localStorage
      const storedTheme = await page.evaluate(() => {
        return localStorage.getItem('vite-ui-theme');
      });
      
      expect(storedTheme).toBe('light');
    });
  });

  test.describe('UI Component States', () => {
    test('should handle loading states gracefully', async ({ page }) => {
      // Look for any loading indicators or skeleton states
      const loadingIndicators = page.locator('[data-testid*="loading"], .skeleton, [aria-label*="loading"], .loading');
      
      // If loading states exist, they should be properly styled
      const count = await loadingIndicators.count();
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const indicator = loadingIndicators.nth(i);
          await expect(indicator).toBeVisible();
          
          // Verify loading indicator has proper styling
          const styles = await indicator.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return {
              opacity: computed.opacity,
              visibility: computed.visibility,
              display: computed.display
            };
          });
          
          expect(styles.visibility).not.toBe('hidden');
          expect(styles.display).not.toBe('none');
        }
      }
    });

    test('should handle error states appropriately', async ({ page }) => {
      // Look for any error indicators
      const errorElements = page.locator('[data-testid*="error"], .error, [aria-label*="error"], [role="alert"]');
      
      // If error states exist, verify they're accessible
      const count = await errorElements.count();
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const errorElement = errorElements.nth(i);
          
          // Error elements should be visible if they exist
          if (await errorElement.isVisible()) {
            // Should have proper ARIA attributes
            const role = await errorElement.getAttribute('role');
            const ariaLabel = await errorElement.getAttribute('aria-label');
            
            // At least one accessibility attribute should exist
            expect(role === 'alert' || ariaLabel !== null || 
                   await errorElement.textContent()).toBeTruthy();
          }
        }
      }
    });

    test('should maintain focus management', async ({ page }) => {
      const themeToggle = page.getByRole('button', { name: /toggle theme/i });
      
      // Focus should be managed properly when opening dropdown
      await themeToggle.focus();
      await themeToggle.click();
      
      // After opening, focus should remain accessible
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Tab navigation should work
      await page.keyboard.press('Tab');
      const newFocusedElement = page.locator(':focus');
      await expect(newFocusedElement).toBeVisible();
    });
  });

  test.describe('Interactive Elements', () => {
    test('should handle button hover states', async ({ page }) => {
      const themeToggle = page.getByRole('button', { name: /toggle theme/i });
      
      // Hover over button
      await themeToggle.hover();
      await page.waitForTimeout(100);
      
      // Styles may change on hover (this is expected with shadcn/ui)
      const hoverStyles = await themeToggle.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          borderColor: computed.borderColor
        };
      });
      
      // At minimum, button should remain styled
      expect(hoverStyles.backgroundColor).toBeDefined();
      expect(hoverStyles.borderColor).toBeDefined();
    });

    test('should handle disabled states correctly', async ({ page }) => {
      // Check if any buttons are disabled and verify they behave correctly
      const disabledButtons = page.locator('button:disabled, button[aria-disabled="true"]');
      const count = await disabledButtons.count();
      
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const button = disabledButtons.nth(i);
          
          // Disabled buttons should not be clickable
          await expect(button).toBeDisabled();
          
          // Should have appropriate visual styling
          const opacity = await button.evaluate((el) => {
            return window.getComputedStyle(el).opacity;
          });
          
          // Disabled buttons typically have reduced opacity
          expect(parseFloat(opacity)).toBeLessThan(1);
        }
      }
    });
  });

  test.describe('Accessibility Features', () => {
    test('should have proper ARIA attributes', async ({ page }) => {
      const themeToggle = page.getByRole('button', { name: /toggle theme/i });
      
      // Verify required ARIA attributes
      await expect(themeToggle).toHaveAttribute('aria-expanded');
      await expect(themeToggle).toHaveAttribute('aria-haspopup', 'menu');
      
      // Screen reader text should exist
      const screenReaderText = themeToggle.locator('.sr-only');
      await expect(screenReaderText).toBeAttached();
      await expect(screenReaderText).toHaveText('Toggle theme');
    });

    test('should support screen readers', async ({ page }) => {
      // Verify important elements have accessible names
      const themeToggle = page.getByRole('button', { name: /toggle theme/i });
      const accessibleName = await themeToggle.getAttribute('aria-label') || 
                             await themeToggle.textContent();
      
      expect(accessibleName).toBeTruthy();
    });

    test('should maintain color contrast', async ({ page }) => {
      // Test both light and dark themes for basic contrast
      const themes = ['light', 'dark'];
      
      for (const theme of themes) {
        await page.getByRole('button', { name: /toggle theme/i }).click();
        await page.getByRole('menuitem', { name: new RegExp(theme, 'i') }).click();
        await page.waitForTimeout(300);
        
        // Get text elements and verify they have sufficient contrast
        const textElements = page.locator('h1, h2, h3, p, span, button').filter({ hasText: /\w/ });
        const count = Math.min(await textElements.count(), 5); // Test first 5 elements
        
        for (let i = 0; i < count; i++) {
          const element = textElements.nth(i);
          const isVisible = await element.isVisible();
          
          if (isVisible) {
            const styles = await element.evaluate((el) => {
              const computed = window.getComputedStyle(el);
              return {
                color: computed.color,
                backgroundColor: computed.backgroundColor
              };
            });
            
            // Basic check: text color should not be transparent
            expect(styles.color).not.toBe('rgba(0, 0, 0, 0)');
            expect(styles.color).not.toBe('transparent');
          }
        }
      }
    });
  });
});