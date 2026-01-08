/**
 * Frontend Usage Tracker Service
 * Handles client-side video watching statistics and communication with backend
 */

import logger from '../utils/logger';

interface VideoInfo {
  title?: string;
  duration?: number;
  [key: string]: any;
}

interface FinalStats {
  completed?: boolean;
  progress?: number;
  [key: string]: any;
}

interface InteractionData {
  [key: string]: any;
}

class UsageTracker {
  private sessionId: string | null = null;
  private currentVideoId: string | null = null;
  private watchStartTime: number | null = null;
  private lastProgressUpdate: number = 0;
  private progressUpdateInterval: number | null = null;
  private heartbeatInterval: number | null = null;

  // Configuration
  private readonly PROGRESS_UPDATE_FREQUENCY = 10; // seconds
  private readonly HEARTBEAT_FREQUENCY = 30; // seconds
  private readonly MIN_WATCH_TIME = 5; // minimum seconds to count as a view

  constructor() {
    this.initializeTracker();
  }

  /**
   * Initialize the usage tracker with session management
   */
  private initializeTracker(): void {
    // Generate session ID if not exists
    this.sessionId = this.getOrCreateSessionId();

    // Set up page visibility handling for accurate tracking
    document.addEventListener(
      'visibilitychange',
      this.handleVisibilityChange.bind(this)
    );

    // Set up beforeunload to save progress
    window.addEventListener('beforeunload', this.handlePageUnload.bind(this));

    logger.info('Usage tracker initialized', 'UsageTracker', {
      sessionId: this.sessionId,
      config: {
        progressUpdateFrequency: this.PROGRESS_UPDATE_FREQUENCY,
        heartbeatFrequency: this.HEARTBEAT_FREQUENCY,
        minWatchTime: this.MIN_WATCH_TIME,
      },
    });
    console.log('[UsageTracker] Initialized with session:', this.sessionId);
  }

  /**
   * Generate or retrieve session ID
   */
  private getOrCreateSessionId(): string {
    const storageKey = 'sofathek_session_id';
    let sessionId = sessionStorage.getItem(storageKey);

    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(storageKey, sessionId);
    }

    return sessionId;
  }

  /**
   * Start tracking a video view
   * @param videoId - The ID of the video being watched
   * @param videoInfo - Additional video information
   */
  public async startVideoTracking(
    videoId: string,
    videoInfo: VideoInfo = {}
  ): Promise<boolean> {
    const startTime = Date.now();

    try {
      logger.info('Starting video tracking', 'UsageTracker', {
        videoId,
        videoTitle: videoInfo.title,
        duration: videoInfo.duration,
      });
      console.log('[UsageTracker] Starting tracking for video:', videoId);

      // Stop any existing tracking
      this.stopVideoTracking();

      this.currentVideoId = videoId;
      this.watchStartTime = Date.now();
      this.lastProgressUpdate = 0;

      // Start the watch session on backend
      const response = await fetch('/api/usage/start-watch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          videoId: this.currentVideoId,
          videoInfo: {
            title: videoInfo.title || 'Unknown Title',
            duration: videoInfo.duration || 0,
            ...videoInfo,
          },
        }),
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        logger.error('Failed to start tracking on backend', 'UsageTracker', {
          videoId,
          status: response.status,
          statusText: response.statusText,
          duration,
        });
        console.warn(
          '[UsageTracker] Failed to start tracking on backend:',
          response.statusText
        );
        return false;
      }

      logger.logApiCall(
        'POST',
        '/api/usage/start-watch',
        duration,
        response.status
      );

      // Start periodic progress updates
      this.startProgressTracking();
      this.startHeartbeat();

      logger.info('Video tracking started successfully', 'UsageTracker', {
        videoId,
        duration,
      });

      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(
        'Error starting video tracking',
        'UsageTracker',
        {
          videoId,
          duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        error instanceof Error ? error : undefined
      );
      console.error('[UsageTracker] Error starting video tracking:', error);
      return false;
    }
  }

  /**
   * Update video progress
   * @param currentTime - Current playback time in seconds
   * @param duration - Total video duration in seconds
   */
  public async updateProgress(
    currentTime: number,
    duration: number
  ): Promise<void> {
    if (!this.currentVideoId || !this.watchStartTime) {
      return;
    }

    try {
      // Only update if significant progress change (avoid spam)
      const progressDiff = Math.abs(currentTime - this.lastProgressUpdate);
      if (progressDiff < 5) {
        // 5 second minimum difference
        return;
      }

      this.lastProgressUpdate = currentTime;

      const watchTime = Math.floor((Date.now() - this.watchStartTime) / 1000);
      const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

      await fetch('/api/usage/update-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          videoId: this.currentVideoId,
          currentTime: Math.floor(currentTime),
          duration: Math.floor(duration),
          progress: Math.round(progress * 100) / 100,
          watchTime: watchTime,
        }),
      });
    } catch (error) {
      console.error('[UsageTracker] Error updating progress:', error);
    }
  }

  /**
   * Stop tracking current video
   * @param finalStats - Final playback statistics
   */
  public async stopVideoTracking(finalStats: FinalStats = {}): Promise<void> {
    if (!this.currentVideoId || !this.watchStartTime) {
      return;
    }

    try {
      console.log(
        '[UsageTracker] Stopping tracking for video:',
        this.currentVideoId
      );

      // Stop intervals
      this.stopProgressTracking();
      this.stopHeartbeat();

      const totalWatchTime = Math.floor(
        (Date.now() - this.watchStartTime) / 1000
      );

      // Only record if minimum watch time met
      if (totalWatchTime >= this.MIN_WATCH_TIME) {
        await fetch('/api/usage/end-watch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: this.sessionId,
            videoId: this.currentVideoId,
            totalWatchTime: totalWatchTime,
            completed: finalStats.completed || false,
            finalProgress: finalStats.progress || 0,
            ...finalStats,
          }),
        });
      }

      // Reset tracking state
      this.currentVideoId = null;
      this.watchStartTime = null;
      this.lastProgressUpdate = 0;
    } catch (error) {
      console.error('[UsageTracker] Error stopping video tracking:', error);
    }
  }

  /**
   * Start periodic progress updates
   */
  private startProgressTracking(): void {
    this.progressUpdateInterval = window.setInterval(() => {
      // This will be called by VideoPlayer component
      // We'll trigger progress update from the video element
      const videoElement = (window as any)
        .sofathekVideoElement as HTMLVideoElement;
      if (videoElement) {
        this.updateProgress(videoElement.currentTime, videoElement.duration);
      }
    }, this.PROGRESS_UPDATE_FREQUENCY * 1000);
  }

  /**
   * Stop progress tracking
   */
  private stopProgressTracking(): void {
    if (this.progressUpdateInterval) {
      clearInterval(this.progressUpdateInterval);
      this.progressUpdateInterval = null;
    }
  }

  /**
   * Start heartbeat to keep session alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = window.setInterval(async () => {
      if (this.currentVideoId) {
        try {
          await fetch('/api/usage/heartbeat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: this.sessionId,
              videoId: this.currentVideoId,
            }),
          });
        } catch (error) {
          console.warn(
            '[UsageTracker] Heartbeat failed:',
            (error as Error).message
          );
        }
      }
    }, this.HEARTBEAT_FREQUENCY * 1000);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Handle page visibility changes
   */
  private handleVisibilityChange(): void {
    if (document.hidden) {
      // Page hidden - pause tracking but don't stop
      this.stopProgressTracking();
      console.log('[UsageTracker] Pausing tracking - page hidden');
    } else {
      // Page visible again - resume tracking
      if (this.currentVideoId) {
        this.startProgressTracking();
        console.log('[UsageTracker] Resuming tracking - page visible');
      }
    }
  }

  /**
   * Handle page unload
   */
  private handlePageUnload(): void {
    // Synchronously save final state
    if (this.currentVideoId && this.watchStartTime) {
      const totalWatchTime = Math.floor(
        (Date.now() - this.watchStartTime) / 1000
      );

      if (totalWatchTime >= this.MIN_WATCH_TIME) {
        // Use sendBeacon for reliable data transmission on page unload
        const data = JSON.stringify({
          sessionId: this.sessionId,
          videoId: this.currentVideoId,
          totalWatchTime: totalWatchTime,
          completed: false,
          unloadSave: true,
        });

        navigator.sendBeacon('/api/usage/end-watch', data);
      }
    }
  }

  /**
   * Record video interaction event
   * @param action - The action performed (play, pause, seek, etc.)
   * @param data - Additional action data
   */
  public async recordInteraction(
    action: string,
    data: InteractionData = {}
  ): Promise<void> {
    if (!this.currentVideoId) {
      return;
    }

    try {
      await fetch('/api/usage/interaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          videoId: this.currentVideoId,
          action: action,
          timestamp: Date.now(),
          data: data,
        }),
      });
    } catch (error) {
      console.error('[UsageTracker] Error recording interaction:', error);
    }
  }

  /**
   * Get current session statistics
   */
  public async getSessionStats(): Promise<any> {
    try {
      const response = await fetch(
        `/api/usage/session-stats?sessionId=${this.sessionId}`
      );
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('[UsageTracker] Error fetching session stats:', error);
    }
    return null;
  }
}

// Create global instance
const usageTracker = new UsageTracker();

// Export for ES modules and global access
export default usageTracker;
(window as any).usageTracker = usageTracker;
