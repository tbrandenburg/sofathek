import { jest, afterEach, afterAll } from '@jest/globals';

// Mock external dependencies globally
jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
  stat: jest.fn(),
  access: jest.fn(),
  writeFile: jest.fn(),
  readFile: jest.fn(),
}));

jest.mock('youtube-dl-exec', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('ffmpeggy', () => ({
  ffmpeg: jest.fn(),
}));

// Console suppression for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Force clear all timers after each test to prevent lingering setTimeout/setInterval
afterEach(() => {
  jest.useRealTimers();
});

// Cleanup after all tests - force exit any remaining handles
afterAll(async () => {
  // Cleanup all RateLimiter instances to prevent open handles
  try {
    const { cleanupAllRateLimiters } = await import('../middleware/rateLimiter');
    cleanupAllRateLimiters();
  } catch (error) {
    // Ignore if import fails
  }
  
  // Also try specific downloadRateLimiter cleanup for backward compatibility
  try {
    const { downloadRateLimiter } = await import('../routes/youtube');
    if (downloadRateLimiter && typeof downloadRateLimiter.destroy === 'function') {
      downloadRateLimiter.destroy();
    }
  } catch (error) {
    // Rate limiter may not be imported in some test suites
  }
  
  // Ensure all timers are cleared
  jest.useRealTimers();
  
  // Clear any pending promises by resolving them
  jest.restoreAllMocks();
  
  // Give any async cleanup a chance to complete
  await new Promise(resolve => setTimeout(resolve, 100));
});