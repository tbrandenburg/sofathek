import { jest } from '@jest/globals';

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

// Global cleanup for rate limiters to prevent Jest hanging
afterAll(async () => {
  // Import and clean up all rate limiters
  try {
    const { downloadRateLimiter } = await import('../routes/youtube');
    if (downloadRateLimiter && typeof downloadRateLimiter.destroy === 'function') {
      downloadRateLimiter.destroy();
    }
  } catch (error) {
    // Rate limiter may not be imported in some test suites
  }
});