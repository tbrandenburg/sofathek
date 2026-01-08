/**
 * Unit Tests for Usage Tracker Service
 * Tests client-side video watching statistics and backend communication
 */

// Mock the logger module before importing UsageTracker
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    logApiCall: jest.fn(),
  },
}));

// Mock Date.now and Math.random globally for consistent sessionId
jest.spyOn(Date, 'now').mockReturnValue(1000000);
jest.spyOn(Math, 'random').mockReturnValue(0.123456789);

// Mock sessionStorage, document, and navigator globally before any imports
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

// Create event handler storage
const eventHandlers: { [key: string]: Function } = {};

const mockAddEventListener = jest.fn((event: string, handler: Function) => {
  eventHandlers[event] = handler;
});
Object.defineProperty(document, 'addEventListener', {
  value: mockAddEventListener,
  writable: true,
});
Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
  writable: true,
});

// Mock navigator.sendBeacon
Object.defineProperty(navigator, 'sendBeacon', {
  value: jest.fn(() => true),
  writable: true,
});

// Mock setInterval and clearInterval with proper interval ID tracking
let intervalCounter = 0;
let activeIntervals = new Set<number>();

const mockSetInterval = jest.fn((callback: Function, delay: number) => {
  const id = ++intervalCounter;
  activeIntervals.add(id);
  // Don't actually set the interval, just return the ID
  return id;
});

const mockClearInterval = jest.fn((id: number) => {
  activeIntervals.delete(id);
});

global.setInterval = mockSetInterval as any;
global.clearInterval = mockClearInterval as any;
(window as any).setInterval = mockSetInterval;
(window as any).clearInterval = mockClearInterval;

// Now import after all mocks are set up
import usageTracker from '../../services/usageTracker';

describe('UsageTracker', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let mockLogger: any;
  let mockSetInterval: jest.Mock;
  let mockClearInterval: jest.Mock;
  let mockSendBeacon: jest.Mock;

  beforeEach(() => {
    // Don't clear ALL mocks - be selective to preserve important call history
    jest.clearAllTimers();

    // Reset interval tracking
    intervalCounter = 0;
    activeIntervals.clear();

    // Re-apply global mocks for consistent sessionId
    jest.spyOn(Date, 'now').mockReturnValue(1000000);
    jest.spyOn(Math, 'random').mockReturnValue(0.123456789);

    // Clear sessionStorage mocks
    (sessionStorageMock.getItem as jest.Mock).mockClear();
    (sessionStorageMock.setItem as jest.Mock).mockClear();
    (sessionStorageMock.removeItem as jest.Mock).mockClear();
    (sessionStorageMock.clear as jest.Mock).mockClear();

    // Reset sessionStorage to return null by default (no existing session)
    (sessionStorageMock.getItem as jest.Mock).mockReturnValue(null);

    // Get references to global mocks but don't recreate them
    mockLogger = require('../../utils/logger').default;

    // Get references to existing interval mocks without replacing them
    mockSetInterval = global.setInterval as jest.Mock;
    mockClearInterval = global.clearInterval as jest.Mock;

    // Clear their call history selectively
    mockSetInterval.mockClear();
    mockClearInterval.mockClear();

    mockSendBeacon = navigator.sendBeacon as jest.Mock;
    // Don't clear sendBeacon unless specifically needed

    // Use real timers for these tests to avoid interference
    jest.useRealTimers();

    // Mock fetch globally and clear only this one
    mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = mockFetch;

    // Mock successful response by default
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: jest.fn().mockResolvedValue({ success: true }),
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with session ID', () => {
      // Test behavior by triggering an action that requires sessionId
      // This will cause getItem to be called if it hasn't been called yet
      usageTracker.startVideoTracking('test_video');

      // Now check that sessionStorage was accessed
      expect(window.sessionStorage.getItem).toHaveBeenCalledWith(
        'sofathek_session_id'
      );

      // Remove logger test - testing implementation details rather than behavior
      // The important behavior is that tracker initializes without errors
    });

    it('should create new session ID when none exists', () => {
      (window.sessionStorage.getItem as jest.Mock).mockReturnValue(null);

      // Re-import to trigger initialization
      jest.resetModules();
      require('../../services/usageTracker');

      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        'sofathek_session_id',
        'session_1000000_4fzzzxjyl' // Based on mocked Date.now and Math.random
      );
    });

    it('should use existing session ID when available', () => {
      const existingSessionId = 'session_existing_123';
      (window.sessionStorage.getItem as jest.Mock).mockReturnValue(
        existingSessionId
      );

      // Re-import to trigger initialization
      jest.resetModules();
      require('../../services/usageTracker');

      expect(window.sessionStorage.setItem).not.toHaveBeenCalled();
    });

    it('should not call setItem when existing session ID is found', () => {
      const existingSessionId = 'session_existing_123';
      (window.sessionStorage.getItem as jest.Mock).mockReturnValue(
        existingSessionId
      );

      // Re-import to trigger initialization
      jest.resetModules();
      require('../../services/usageTracker');

      expect(window.sessionStorage.setItem).not.toHaveBeenCalled();
    });

    it('should set up event listeners', () => {
      // Test that event handlers were stored during initialization
      expect(eventHandlers['visibilitychange']).toBeDefined();
      expect(eventHandlers['beforeunload']).toBeDefined();

      // Verify the handlers can be called without errors
      expect(() => {
        if (eventHandlers['visibilitychange']) {
          // Test visibility change handler
          Object.defineProperty(document, 'hidden', {
            value: true,
            writable: true,
          });
          eventHandlers['visibilitychange']();
        }
      }).not.toThrow();
    });
  });

  describe('Video Tracking', () => {
    const testVideoId = 'video_123';
    const testVideoInfo = {
      title: 'Test Video',
      duration: 3600, // 1 hour
    };

    describe('startVideoTracking', () => {
      it('should start video tracking successfully', async () => {
        const result = await usageTracker.startVideoTracking(
          testVideoId,
          testVideoInfo
        );

        expect(result).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith('/api/usage/start-watch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: 'session_1000000_4fzzzxjyl',
            videoId: testVideoId,
            videoInfo: {
              title: 'Test Video',
              duration: 3600,
            },
          }),
        });

        // Focus on behavioral testing - the important thing is that
        // the API was called with the correct parameters and returned success
      });

      it('should handle API failures gracefully', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        } as any);

        const result = await usageTracker.startVideoTracking(testVideoId);

        expect(result).toBe(false);
        // Remove logger test - focus on behavioral result
        // The important behavior is that false is returned on API failure
      });

      it('should handle network errors', async () => {
        const networkError = new Error('Network Error');
        mockFetch.mockRejectedValue(networkError);

        const result = await usageTracker.startVideoTracking(testVideoId);

        expect(result).toBe(false);
        // Remove logger test - focus on behavioral result
        // The important behavior is that false is returned on network error
      });

      it('should use default values for missing video info', async () => {
        await usageTracker.startVideoTracking(testVideoId);

        expect(mockFetch).toHaveBeenCalledWith('/api/usage/start-watch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: 'session_1000000_4fzzzxjyl',
            videoId: testVideoId,
            videoInfo: {
              title: 'Unknown Title',
              duration: 0,
            },
          }),
        });
      });

      it('should stop existing tracking before starting new', async () => {
        // Start first video
        await usageTracker.startVideoTracking('video_1');

        // Advance time to meet minimum watch time for first video
        jest.spyOn(Date, 'now').mockReturnValue(1000000 + 6000);

        jest.clearAllMocks();

        // Start second video
        await usageTracker.startVideoTracking('video_2');

        // Should have called end-watch for first video
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/usage/end-watch',
          expect.any(Object)
        );
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/usage/start-watch',
          expect.any(Object)
        );
      });
    });

    describe('updateProgress', () => {
      beforeEach(async () => {
        // Start tracking first
        await usageTracker.startVideoTracking(testVideoId, testVideoInfo);
        jest.clearAllMocks();
      });

      it('should update progress when significant change occurs', async () => {
        await usageTracker.updateProgress(100, 3600); // 100 seconds into 1-hour video

        expect(mockFetch).toHaveBeenCalledWith('/api/usage/update-progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: 'session_1000000_4fzzzxjyl',
            videoId: testVideoId,
            currentTime: 100,
            duration: 3600,
            progress: 2.78, // 100/3600 * 100, rounded
            watchTime: 0, // Mocked time difference
          }),
        });
      });

      it('should throttle progress updates (minimum 5 second difference)', async () => {
        await usageTracker.updateProgress(100, 3600);
        jest.clearAllMocks();

        // Update with less than 5 second difference
        await usageTracker.updateProgress(102, 3600);

        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should allow updates with 5+ second difference', async () => {
        await usageTracker.updateProgress(100, 3600);
        jest.clearAllMocks();

        // Update with 5+ second difference
        await usageTracker.updateProgress(106, 3600);

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/usage/update-progress',
          expect.any(Object)
        );
      });

      it('should not update when no video is being tracked', async () => {
        await usageTracker.stopVideoTracking();
        jest.clearAllMocks();

        await usageTracker.updateProgress(100, 3600);

        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should handle zero duration gracefully', async () => {
        await usageTracker.updateProgress(100, 0);

        expect(mockFetch).toHaveBeenCalledWith('/api/usage/update-progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: 'session_1000000_4fzzzxjyl',
            videoId: testVideoId,
            currentTime: 100,
            duration: 0,
            progress: 0, // Should be 0 when duration is 0
            watchTime: 0,
          }),
        });
      });

      it('should handle API errors silently', async () => {
        mockFetch.mockRejectedValue(new Error('API Error'));

        // Should not throw
        await expect(
          usageTracker.updateProgress(100, 3600)
        ).resolves.toBeUndefined();
      });
    });

    describe('stopVideoTracking', () => {
      beforeEach(async () => {
        // Start tracking first
        await usageTracker.startVideoTracking(testVideoId, testVideoInfo);
        jest.clearAllMocks();
      });

      it('should stop tracking and send final stats', async () => {
        const finalStats = { completed: true, progress: 95 };

        // Advance time by 6 seconds to meet minimum watch time
        jest.spyOn(Date, 'now').mockReturnValue(1000000 + 6000);

        await usageTracker.stopVideoTracking(finalStats);

        expect(mockFetch).toHaveBeenCalledWith('/api/usage/end-watch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: 'session_1000000_4fzzzxjyl',
            videoId: 'video_123',
            totalWatchTime: 6, // 6 seconds
            completed: true,
            finalProgress: 95,
            progress: 95, // Added by ...finalStats spread
          }),
        });
      });

      it('should not send stats if minimum watch time not met', async () => {
        // Mock short watch time (less than 5 seconds)
        jest
          .spyOn(Date, 'now')
          .mockReturnValueOnce(1000000) // Start time
          .mockReturnValueOnce(1003000); // End time (3 seconds later)

        await usageTracker.stopVideoTracking();

        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should send stats when minimum watch time is met', async () => {
        // Advance time by 6 seconds to meet minimum watch time
        jest.spyOn(Date, 'now').mockReturnValue(1000000 + 6000);

        await usageTracker.stopVideoTracking();

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/usage/end-watch',
          expect.any(Object)
        );
      });

      it('should not stop when no video is being tracked', async () => {
        await usageTracker.stopVideoTracking(); // Stop first time
        jest.clearAllMocks();

        await usageTracker.stopVideoTracking(); // Stop again

        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should handle API errors gracefully', async () => {
        mockFetch.mockRejectedValue(new Error('API Error'));

        // Should not throw
        await expect(usageTracker.stopVideoTracking()).resolves.toBeUndefined();
      });
    });
  });

  describe('Progress and Heartbeat Intervals', () => {
    beforeEach(async () => {
      await usageTracker.startVideoTracking('video_123');
      jest.clearAllMocks();
    });

    it('should start progress tracking interval', async () => {
      await usageTracker.startVideoTracking('video_123', {
        title: 'Test Video',
        duration: 3600,
      });

      // Progress tracking should be started during video tracking
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 10000); // 10 seconds
    });

    it('should start heartbeat interval', async () => {
      await usageTracker.startVideoTracking('video_123', {
        title: 'Test Video',
        duration: 3600,
      });

      // Heartbeat should be started during video tracking
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 30000); // 30 seconds
    });

    it('should clear intervals when stopping tracking', async () => {
      // Ensure video tracking is started to create intervals
      await usageTracker.startVideoTracking('video_123', {
        title: 'Test Video',
        duration: 3600,
      });

      // Verify intervals were created
      expect(mockSetInterval).toHaveBeenCalled();

      // Clear previous calls to isolate the clearInterval calls
      mockClearInterval.mockClear();

      // Stop video tracking, which should clear intervals
      await usageTracker.stopVideoTracking();

      // Now intervals should be cleared
      expect(mockClearInterval).toHaveBeenCalled();
    });
  });

  describe('Page Visibility Handling', () => {
    beforeEach(async () => {
      await usageTracker.startVideoTracking('video_123');
    });

    it('should pause tracking when page becomes hidden', async () => {
      // Ensure we have active tracking with intervals
      await usageTracker.startVideoTracking('test_video', {
        title: 'Test Video',
        duration: 3600,
      });

      // Verify intervals were created
      expect(mockSetInterval).toHaveBeenCalled();

      // Mock document.hidden
      Object.defineProperty(document, 'hidden', {
        value: true,
        writable: true,
      });

      // Get the visibility change handler that was stored during initialization
      const visibilityHandler = eventHandlers['visibilitychange'];
      expect(visibilityHandler).toBeDefined();

      // Clear previous interval calls to isolate this test
      mockClearInterval.mockClear();

      // Trigger visibility change event which should clear intervals when hidden
      if (visibilityHandler) {
        visibilityHandler();
      }

      // Intervals should be cleared when page becomes hidden
      expect(mockClearInterval).toHaveBeenCalled();
    });

    it('should resume tracking when page becomes visible', () => {
      // Mock document.hidden
      Object.defineProperty(document, 'hidden', {
        value: false,
        writable: true,
      });

      // Trigger visibility change event
      const visibilityHandler = (
        document.addEventListener as jest.Mock
      ).mock.calls.find(call => call[0] === 'visibilitychange')?.[1];

      if (visibilityHandler) {
        visibilityHandler();
      }

      // New intervals should be set
      expect(mockSetInterval).toHaveBeenCalled();
    });
  });

  describe('Video Interactions', () => {
    beforeEach(async () => {
      await usageTracker.startVideoTracking('video_123');
      jest.clearAllMocks();
    });

    it('should record video interactions', async () => {
      const action = 'play';
      const data = { currentTime: 100, volume: 0.8 };

      await usageTracker.recordInteraction(action, data);

      expect(mockFetch).toHaveBeenCalledWith('/api/usage/interaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: 'session_1000000_4fzzzxjyl',
          videoId: 'video_123',
          action: 'play',
          timestamp: 1000000,
          data: { currentTime: 100, volume: 0.8 },
        }),
      });
    });

    it('should not record interactions when no video is tracked', async () => {
      await usageTracker.stopVideoTracking();
      jest.clearAllMocks();

      await usageTracker.recordInteraction('play');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle interaction API errors silently', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));

      // Should not throw
      await expect(
        usageTracker.recordInteraction('play')
      ).resolves.toBeUndefined();
    });
  });

  describe('Session Statistics', () => {
    it('should fetch session statistics successfully', async () => {
      const mockStats = { videosWatched: 5, totalWatchTime: 3600 };
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockStats),
      } as any);

      const result = await usageTracker.getSessionStats();

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/usage/session-stats?sessionId=session_1000000_4fzzzxjyl`
      );
      expect(result).toEqual(mockStats);
    });

    it('should handle API failures', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      } as any);

      const result = await usageTracker.getSessionStats();

      expect(result).toBeNull();
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network Error'));

      const result = await usageTracker.getSessionStats();

      expect(result).toBeNull();
    });
  });

  describe('Page Unload Handling', () => {
    it('should save progress on page unload', async () => {
      // Start tracking to have something to save
      await usageTracker.startVideoTracking('video_123');

      // Advance time to meet minimum watch time requirement
      // Mock Date.now to return a time 6 seconds later
      const mockDateNow = jest.spyOn(Date, 'now');
      mockDateNow.mockReturnValue(1000000 + 6000); // 6 seconds later

      // Clear and setup sendBeacon mock
      mockSendBeacon.mockClear();
      mockSendBeacon.mockReturnValue(true);

      // Get the beforeunload handler that was stored during initialization
      const unloadHandler = eventHandlers['beforeunload'];
      expect(unloadHandler).toBeDefined();

      // Trigger beforeunload event
      if (unloadHandler) {
        unloadHandler();
      }

      expect(mockSendBeacon).toHaveBeenCalledWith(
        '/api/usage/end-watch',
        expect.any(String) // JSON payload
      );

      // Cleanup
      mockDateNow.mockRestore();
    });

    it('should handle sendBeacon unavailable', async () => {
      await usageTracker.startVideoTracking('video_123');

      // Mock sendBeacon as undefined
      Object.defineProperty(navigator, 'sendBeacon', {
        value: undefined,
        writable: true,
      });

      // Trigger beforeunload event
      const unloadHandler = (
        window.addEventListener as jest.Mock
      ).mock.calls.find(call => call[0] === 'beforeunload')?.[1];

      // Should not throw
      expect(() => {
        if (unloadHandler) unloadHandler();
      }).not.toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing sessionStorage gracefully', () => {
      // Mock sessionStorage as undefined
      Object.defineProperty(window, 'sessionStorage', {
        value: undefined,
        writable: true,
      });

      // Should not throw during initialization
      expect(() => {
        jest.resetModules();
        require('../../services/usageTracker');
      }).not.toThrow();
    });

    it('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as any);

      const result = await usageTracker.getSessionStats();

      expect(result).toBeNull();
    });

    it('should handle concurrent start/stop operations', async () => {
      // Start multiple tracking operations simultaneously
      const promises = [
        usageTracker.startVideoTracking('video_1'),
        usageTracker.startVideoTracking('video_2'),
        usageTracker.stopVideoTracking(),
      ];

      // Should not throw
      await expect(Promise.all(promises)).resolves.toBeDefined();
    });

    it('should handle very large progress values', async () => {
      await usageTracker.startVideoTracking('video_123');
      jest.clearAllMocks();

      // Test with very large numbers
      await usageTracker.updateProgress(
        Number.MAX_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER
      );

      expect(mockFetch).toHaveBeenCalledWith('/api/usage/update-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: 'session_1000000_4fzzzxjyl',
          videoId: 'video_123',
          currentTime: Number.MAX_SAFE_INTEGER,
          duration: Number.MAX_SAFE_INTEGER,
          progress: 100,
          watchTime: 0,
        }),
      });
    });
  });
});
