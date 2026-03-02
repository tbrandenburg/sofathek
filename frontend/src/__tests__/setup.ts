import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock global fetch for tests
global.fetch = vi.fn();

// Mock window.location for tests
Object.defineProperty(window, 'location', {
  value: {
    reload: vi.fn()
  },
  writable: true
});