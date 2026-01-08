// Global test setup for Sofathek Media Center
require('jest-extended');

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-unit-tests';
process.env.PORT = '3001';
process.env.HOST = '0.0.0.0';
process.env.FRONTEND_URL = 'http://localhost:3000';

// Create comprehensive browser environment mocks
const mockLocalStorage = {
  store: new Map(),
  getItem: jest.fn(key => mockLocalStorage.store.get(key) || null),
  setItem: jest.fn((key, value) => mockLocalStorage.store.set(key, value)),
  removeItem: jest.fn(key => mockLocalStorage.store.delete(key)),
  clear: jest.fn(() => mockLocalStorage.store.clear()),
};

const mockSessionStorage = {
  store: new Map(),
  getItem: jest.fn(key => mockSessionStorage.store.get(key) || null),
  setItem: jest.fn((key, value) => mockSessionStorage.store.set(key, value)),
  removeItem: jest.fn(key => mockSessionStorage.store.delete(key)),
  clear: jest.fn(() => mockSessionStorage.store.clear()),
};

// Mock PerformanceObserver for performance monitoring tests
class MockPerformanceObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  disconnect() {}
}

// Mock browser environment for frontend tests
Object.defineProperty(global, 'window', {
  value: {
    location: {
      href: 'https://test.example.com/page',
      pathname: '/page',
      search: '',
      hash: '',
      origin: 'https://test.example.com',
    },
    localStorage: mockLocalStorage,
    sessionStorage: mockSessionStorage,
    navigator: {
      userAgent: 'Mozilla/5.0 (Test Environment) Jest Unit Tests',
    },
    performance: {
      getEntriesByType: jest.fn(() => []),
      now: jest.fn(() => Date.now()),
      mark: jest.fn(),
      measure: jest.fn(),
      timing: {
        navigationStart: 1234567890000,
        loadEventEnd: 1234567890123,
      },
    },
    document: {
      createElement: jest.fn(() => ({
        style: {},
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      body: {
        appendChild: jest.fn(),
        removeChild: jest.fn(),
      },
      readyState: 'complete',
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    setInterval: global.setInterval,
    clearInterval: global.clearInterval,
    setTimeout: global.setTimeout,
    clearTimeout: global.clearTimeout,
    fetch: jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
        text: () => Promise.resolve(''),
        headers: new Map(),
      })
    ),
    PerformanceObserver: MockPerformanceObserver,
    Event: class MockEvent {
      constructor(type, options = {}) {
        this.type = type;
        this.bubbles = options.bubbles || false;
        this.cancelable = options.cancelable || false;
      }
    },
    ErrorEvent: class MockErrorEvent {
      constructor(type, options = {}) {
        this.type = type;
        this.message = options.message || '';
        this.filename = options.filename || '';
        this.lineno = options.lineno || 0;
        this.colno = options.colno || 0;
        this.error = options.error || null;
        this.reason = options.reason || null;
      }
    },
    crypto: {
      getRandomValues: jest.fn(array => {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      }),
    },
  },
  writable: true,
});

// Define global browser APIs that need to be available everywhere
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

Object.defineProperty(global, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
});

Object.defineProperty(global, 'PerformanceObserver', {
  value: MockPerformanceObserver,
  writable: true,
});

Object.defineProperty(global, 'Event', {
  value: class MockEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.bubbles = options.bubbles || false;
      this.cancelable = options.cancelable || false;
    }
  },
  writable: true,
});

Object.defineProperty(global, 'ErrorEvent', {
  value: class MockErrorEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.message = options.message || '';
      this.filename = options.filename || '';
      this.lineno = options.lineno || 0;
      this.colno = options.colno || 0;
      this.error = options.error || null;
      this.reason = options.reason || null;
    }
  },
  writable: true,
});

// Mock fetch globally
Object.defineProperty(global, 'fetch', {
  value: jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
      text: () => Promise.resolve(''),
      headers: new Map(),
    })
  ),
  writable: true,
});

// Console control for tests - reduce noise while preserving important logs
global.console = {
  ...console,
  log: jest.fn(), // Mock regular logs
  debug: jest.fn(), // Mock debug logs
  info: jest.fn(), // Mock info logs
  warn: jest.fn(), // Mock warnings
  error: console.error, // Keep errors visible for debugging
};

// Mock file system operations for testing
jest.mock('fs-extra', () => ({
  ensureDir: jest.fn(() => Promise.resolve()),
  ensureDirSync: jest.fn(),
  readFile: jest.fn(() => Promise.resolve(Buffer.from('mock file content'))),
  writeFile: jest.fn(() => Promise.resolve()),
  exists: jest.fn(() => Promise.resolve(true)),
  existsSync: jest.fn(() => true),
  remove: jest.fn(() => Promise.resolve()),
  removeSync: jest.fn(),
  copy: jest.fn(() => Promise.resolve()),
  copySync: jest.fn(),
  stat: jest.fn(() => Promise.resolve({ size: 1024, isFile: () => true })),
  statSync: jest.fn(() => ({ size: 1024, isFile: () => true })),
}));

// Global test utilities
global.testUtils = {
  // Create mock Express request
  mockRequest: (overrides = {}) => ({
    method: 'GET',
    url: '/test',
    originalUrl: '/test',
    headers: {},
    body: {},
    query: {},
    params: {},
    ip: '127.0.0.1',
    get: jest.fn(header => {
      const headers = {
        'User-Agent': 'Test Agent',
        'Content-Type': 'application/json',
        ...overrides.headers,
      };
      return headers[header];
    }),
    connection: { remoteAddress: '127.0.0.1' },
    ...overrides,
  }),

  // Create mock Express response
  mockResponse: (overrides = {}) => {
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res),
      send: jest.fn(() => res),
      end: jest.fn(() => res),
      get: jest.fn(),
      set: jest.fn(),
      cookie: jest.fn(),
      clearCookie: jest.fn(),
      redirect: jest.fn(),
      render: jest.fn(),
      statusCode: 200,
      headersSent: false,
      on: jest.fn(),
      ...overrides,
    };
    return res;
  },

  // Create mock Express next function
  mockNext: () => jest.fn(),

  // Wait for async operations in tests
  waitFor: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate test data
  generateTestData: {
    logEntry: () => ({
      id: `test_${Date.now()}`,
      timestamp: Date.now(),
      level: 1, // INFO
      message: 'Test log message',
      context: 'TestComponent',
      data: { test: true },
      sessionId: 'test_session_123',
      url: 'http://localhost:3000/test',
      userAgent: 'Test Agent',
    }),

    performanceMetric: () => ({
      name: 'test_metric',
      value: 123.45,
      timestamp: Date.now(),
      context: 'TestComponent',
    }),

    videoMetadata: () => ({
      id: 'test_video_123',
      title: 'Test Video',
      duration: 3600,
      size: 1024 * 1024 * 100, // 100MB
      format: 'mp4',
      resolution: '1920x1080',
      fps: 30,
    }),
  },
};

// Mock navigator globally
Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Test Environment) Jest Unit Tests',
  },
  writable: true,
});

// Setup fake timers for consistent testing
beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();

  // Reset storage mocks for each test
  mockLocalStorage.store.clear();
  mockSessionStorage.store.clear();

  // Reset fetch mock for each test
  global.fetch.mockClear();
  if (global.window) {
    global.window.fetch.mockClear();
  }
});

// Cleanup after tests
afterEach(() => {
  jest.restoreAllMocks();
});
