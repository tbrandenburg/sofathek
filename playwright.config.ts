import { defineConfig, devices } from '@playwright/test';

/**
 * Ultra-Rigorous Playwright Configuration for Sofathek
 * CEO-level quality standards with zero tolerance policy
 *
 * This configuration implements the 5-phase testing strategy with
 * comprehensive coverage for all user journeys, themes, and scenarios.
 */
export default defineConfig({
  testDir: './tests/playwright',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list', { printSteps: true }],
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://127.0.0.1:3008',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* Global timeout for all actions */
    actionTimeout: 30000,

    /* Navigation timeout */
    navigationTimeout: 30000,
  },

  /* Global test timeout - CEO standards require thorough testing */
  timeout: 60000,

  /* Expect timeout for assertions */
  expect: {
    timeout: 10000,
  },

  /* Configure projects for major browsers */
  projects: [
    /* Phase 1: Desktop Browsers - Core Functionality */
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      testMatch: [
        'tests/playwright/phase1-foundation/**/*.spec.ts',
        'tests/playwright/phase2-media-library/**/*.spec.ts',
        'tests/playwright/journeys/**/*.spec.ts',
      ],
    },
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
      testMatch: [
        'tests/playwright/phase1-foundation/**/*.spec.ts',
        'tests/playwright/phase2-media-library/**/*.spec.ts',
      ],
    },
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
      testMatch: [
        'tests/playwright/phase1-foundation/**/*.spec.ts',
        'tests/playwright/phase2-media-library/**/*.spec.ts',
      ],
    },

    /* Phase 2: Mobile Devices - Responsive Testing */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: [
        'tests/playwright/phase3-responsive/**/*.spec.ts',
        'tests/playwright/journeys/**/*.spec.ts',
      ],
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
      testMatch: ['tests/playwright/phase3-responsive/**/*.spec.ts'],
    },

    /* Phase 3: Accessibility & Performance */
    {
      name: 'accessibility-audit',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      testMatch: ['tests/playwright/phase4-accessibility/**/*.spec.ts'],
    },
    {
      name: 'performance-audit',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      testMatch: ['tests/playwright/phase5-performance/**/*.spec.ts'],
    },

    /* Phase 4: Theme Validation - All 10 Themes */
    {
      name: 'theme-validation',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      testMatch: ['tests/playwright/themes/**/*.spec.ts'],
    },
  ],

  /* Web Server Configuration - Start dev server before tests */
  webServer: [
    {
      command: 'cd backend && npm run build && PORT=3007 node dist/server.js',
      port: 3007,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    // Frontend disabled for Phase 1 - backend infrastructure only
    // {
    //   command: 'cd frontend && PORT=3008 npm run dev',
    //   port: 3008,
    //   reuseExistingServer: !process.env.CI,
    //   timeout: 120000,
    // },
  ],

  /* Global Setup and Teardown */
  globalSetup: require.resolve('./tests/playwright/global-setup.ts'),
  globalTeardown: require.resolve('./tests/playwright/global-teardown.ts'),
});
