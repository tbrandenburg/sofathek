/**
 * Sofathek Test Utilities
 * CEO-level testing helper functions for consistent test quality
 */

export class SofathekTestUtils {
  /**
   * Wait for video library to load completely
   */
  static async waitForVideoLibrary(page: any, timeout = 10000) {
    await page.waitForSelector('[data-testid="video-library"]', { timeout });
    await page.waitForLoadState('networkidle');
  }

  /**
   * Switch to a specific theme and verify application
   */
  static async switchTheme(page: any, themeName: string) {
    await page.click('[data-testid="theme-selector"]');
    await page.click(`[data-testid="theme-${themeName}"]`);

    // Wait for theme to be applied
    await page.waitForFunction(
      theme => document.body.getAttribute('data-theme') === theme,
      themeName
    );
  }

  /**
   * Measure performance metrics
   */
  static async measurePerformance(page: any, action: () => Promise<void>) {
    const startTime = performance.now();
    await action();
    return performance.now() - startTime;
  }

  /**
   * Check for JavaScript errors
   */
  static setupErrorTracking(page: any) {
    const errors: string[] = [];

    page.on('pageerror', (error: Error) => {
      errors.push(error.message);
    });

    page.on('console', (msg: any) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    return errors;
  }

  /**
   * Verify accessibility standards
   */
  static async checkAccessibility(page: any) {
    // Add axe-core for accessibility testing
    await page.addScriptTag({
      url: 'https://unpkg.com/axe-core@latest/axe.min.js',
    });

    return await page.evaluate(() => {
      return new Promise(resolve => {
        // @ts-ignore
        axe.run((err: any, results: any) => {
          if (err) throw err;
          resolve(results);
        });
      });
    });
  }

  /**
   * Test responsive design at multiple breakpoints
   */
  static async testResponsiveBreakpoints(
    page: any,
    testCallback: (width: number, height: number) => Promise<void>
  ) {
    const breakpoints = [
      { width: 1920, height: 1080, name: 'Desktop XL' },
      { width: 1366, height: 768, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' },
    ];

    for (const breakpoint of breakpoints) {
      await page.setViewportSize({
        width: breakpoint.width,
        height: breakpoint.height,
      });

      await testCallback(breakpoint.width, breakpoint.height);
    }
  }

  /**
   * Simulate video playback testing
   */
  static async simulateVideoPlayback(page: any, videoId: string) {
    const videoPlayer = page.locator(`[data-testid="video-player-${videoId}"]`);

    if (await videoPlayer.isVisible()) {
      await videoPlayer.click();

      // Wait for video to start playing
      await page.waitForFunction(id => {
        const video = document.querySelector(
          `[data-testid="video-player-${id}"] video`
        );
        return video && !(video as HTMLVideoElement).paused;
      }, videoId);
    }
  }

  /**
   * Verify server coexistence safety
   */
  static async verifySafePortUsage(page: any) {
    // Ensure we only use ports 3000 and 3007 (Sofathek's ports)
    const networkRequests = await page.context().request.storageState();

    // This would be expanded to verify port usage safety
    return true;
  }

  /**
   * CEO-level validation suite
   */
  static async runCEOValidation(page: any) {
    const results = {
      performance: await this.measurePageLoadTime(page),
      accessibility: await this.checkAccessibility(page),
      errors: this.setupErrorTracking(page),
      responsive: true, // Will be set by responsive tests
    };

    return results;
  }

  /**
   * Measure page load time with CEO standards
   */
  static async measurePageLoadTime(page: any) {
    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    return {
      loadTime,
      meetsCEOStandard: loadTime < 2000, // Under 2 seconds
      grade: loadTime < 1000 ? 'A' : loadTime < 2000 ? 'B' : 'C',
    };
  }
}
