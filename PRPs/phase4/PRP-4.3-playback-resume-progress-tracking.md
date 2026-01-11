# PRP-4.3: Playback Resume & Progress Tracking

**Project**: SOFATHEK Media Center  
**Phase**: 4 - Video Streaming & Playback  
**Priority**: High  
**Complexity**: Medium  
**Estimated Effort**: 6-10 hours

## Purpose & Core Principles

### Philosophy: Viewing Should Flow Seamlessly Across Time and Space

Effective progress tracking isn't about storing timestamps—it's about **eliminating the friction** between when users stop watching and when they resume. The goal is to make viewing feel like a continuous experience, regardless of interruptions, device changes, or time gaps.

**Before implementing progress tracking, ask**:

- How can we make resuming feel natural and effortless?
- What would Netflix-level continuity look like in a family media center?
- How do we balance individual progress with family viewing patterns?

**Core principles**:

1. **Seamless Continuity**: Users should never wonder "where was I?" when returning to content
2. **Intelligent Persistence**: Save progress automatically without user intervention
3. **Family-Aware Tracking**: Respect different viewing contexts (individual vs family viewing)
4. **Cross-Session Reliability**: Progress survives app restarts, browser refreshes, device switches

### The Progress Tracking Mental Model

Think of progress tracking as **digital bookmarks** rather than data storage:

- **Basic progress tracking**: Like dog-earing pages—crude but functional
- **Smart progress tracking**: Like intelligent bookmarks that remember context and intent
- **Family progress tracking**: Like shared reading lists that respect individual and group progress

## Gap Analysis: Current State vs. Netflix-Grade Progress Management

### Current Implementation Gaps

**❌ No Progress Persistence**:

```typescript
// Current problematic state - progress lost on page refresh
const [currentTime, setCurrentTime] = useState(0); // Resets to 0 every time
```

**❌ No Profile-Aware Progress**: All family members share same progress position  
**❌ No Smart Resume Logic**: No logic to determine optimal resume position  
**❌ No Viewing Context**: Can't distinguish between individual vs family viewing sessions  
**❌ No Progress Synchronization**: Progress doesn't sync across devices or browser tabs  
**❌ No Viewing History Analytics**: No insights into viewing patterns or completion rates

### Netflix-Grade Progress Requirements

**✅ Automatic Progress Saving**: Save progress every 10-30 seconds without user action  
**✅ Profile-Based Progress**: Each family member has independent progress tracking  
**✅ Smart Resume Position**: Intelligent logic for where to resume (not always exact position)  
**✅ Viewing Context Awareness**: Handle family movie nights vs individual viewing differently  
**✅ Cross-Device Synchronization**: Progress follows users across devices seamlessly  
**✅ Completion Detection**: Recognize when content is "finished" vs "abandoned"  
**✅ Recently Watched Management**: Surface relevant content based on viewing history

## Detailed Implementation

### 1. Progress Storage Service Architecture

**Core progress tracking service** (`backend/src/services/progressService.ts`):

```typescript
import { promises as fs } from 'fs';
import { join } from 'path';

interface ViewingProgress {
  videoId: string;
  profileId: string;
  currentTime: number;
  duration: number;
  percentComplete: number;
  lastWatched: Date;
  watchedSessions: ViewingSession[];
  isCompleted: boolean;
  resumePosition: number; // Smart resume position (may differ from currentTime)
  viewingContext: 'individual' | 'family' | 'background';
}

interface ViewingSession {
  startTime: number;
  endTime: number;
  watchDuration: number;
  sessionStart: Date;
  sessionEnd: Date;
  deviceInfo?: string;
  completionRate: number;
}

interface RecentlyWatched {
  videoId: string;
  profileId: string;
  lastWatched: Date;
  progressPercent: number;
  isCompleted: boolean;
  thumbnailTime: number; // Best thumbnail position for this user's progress
}

class ProgressService {
  private readonly progressDir = join(process.env.DATA_ROOT || '/app/data', 'progress');
  private readonly recentlyWatchedDir = join(process.env.DATA_ROOT || '/app/data', 'recently-watched');
  private progressCache = new Map<string, ViewingProgress>();

  constructor() {
    this.ensureDirectories();
  }

  /**
   * Save viewing progress with intelligent batching
   * Philosophy: Progress should save transparently without impacting user experience
   */
  async saveProgress(
    videoId: string,
    profileId: string,
    currentTime: number,
    duration: number,
    viewingContext: 'individual' | 'family' | 'background' = 'individual'
  ): Promise<void> {
    try {
      const progressKey = `${profileId}-${videoId}`;
      const existing = await this.getProgress(videoId, profileId);

      const percentComplete = duration > 0 ? (currentTime / duration) * 100 : 0;
      const isCompleted = this.determineCompletionStatus(currentTime, duration, existing);
      const resumePosition = this.calculateSmartResumePosition(currentTime, duration, existing);

      const progress: ViewingProgress = {
        videoId,
        profileId,
        currentTime,
        duration,
        percentComplete,
        lastWatched: new Date(),
        watchedSessions: this.updateViewingSessions(existing?.watchedSessions || [], currentTime),
        isCompleted,
        resumePosition,
        viewingContext,
      };

      // Cache for performance
      this.progressCache.set(progressKey, progress);

      // Persist to disk (batched for performance)
      await this.persistProgress(progress);

      // Update recently watched list
      await this.updateRecentlyWatched(videoId, profileId, progress);
    } catch (error) {
      console.error('Failed to save progress:', error);
      // Non-blocking - don't interrupt playback for progress save failures
    }
  }

  /**
   * Get viewing progress with smart defaults
   * Philosophy: Always return useful information, even for new content
   */
  async getProgress(videoId: string, profileId: string): Promise<ViewingProgress | null> {
    try {
      const progressKey = `${profileId}-${videoId}`;

      // Check cache first
      if (this.progressCache.has(progressKey)) {
        return this.progressCache.get(progressKey)!;
      }

      // Load from disk
      const progressPath = join(this.progressDir, `${progressKey}.json`);

      try {
        const data = await fs.readFile(progressPath, 'utf-8');
        const progress = JSON.parse(data) as ViewingProgress;

        // Restore Date objects
        progress.lastWatched = new Date(progress.lastWatched);
        progress.watchedSessions.forEach(session => {
          session.sessionStart = new Date(session.sessionStart);
          session.sessionEnd = new Date(session.sessionEnd);
        });

        this.progressCache.set(progressKey, progress);
        return progress;
      } catch (fileError) {
        // No existing progress - return null for new content
        return null;
      }
    } catch (error) {
      console.error('Failed to get progress:', error);
      return null;
    }
  }

  /**
   * Get recently watched content for a profile
   * Philosophy: Surface content that's most relevant to resume or continue
   */
  async getRecentlyWatched(profileId: string, limit: number = 20): Promise<RecentlyWatched[]> {
    try {
      const recentPath = join(this.recentlyWatchedDir, `${profileId}.json`);

      const data = await fs.readFile(recentPath, 'utf-8');
      const recent = JSON.parse(data) as RecentlyWatched[];

      // Sort by last watched, filter out very old items
      const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days

      return recent
        .map(item => ({
          ...item,
          lastWatched: new Date(item.lastWatched),
        }))
        .filter(item => item.lastWatched > cutoffDate)
        .sort((a, b) => b.lastWatched.getTime() - a.lastWatched.getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get recently watched:', error);
      return [];
    }
  }

  /**
   * Calculate intelligent resume position
   * Philosophy: Resume where users want to be, not necessarily where they left off
   */
  private calculateSmartResumePosition(
    currentTime: number,
    duration: number,
    existing: ViewingProgress | null
  ): number {
    // If near the end (last 2 minutes), resume from beginning
    if (duration - currentTime < 120) {
      return 0;
    }

    // If very early (first 30 seconds), resume from beginning
    if (currentTime < 30) {
      return 0;
    }

    // If we have viewing history, check for common resume patterns
    if (existing?.watchedSessions) {
      const sessions = existing.watchedSessions;

      // If user frequently rewinds, suggest rewinding a bit
      const rewindPattern = this.detectRewindPattern(sessions);
      if (rewindPattern > 0) {
        return Math.max(0, currentTime - rewindPattern);
      }
    }

    // Default: resume exactly where left off
    return currentTime;
  }

  /**
   * Determine if content should be marked as completed
   */
  private determineCompletionStatus(currentTime: number, duration: number, existing: ViewingProgress | null): boolean {
    if (duration === 0) return false;

    const percentComplete = (currentTime / duration) * 100;

    // Mark as completed if watched 90% or more
    if (percentComplete >= 90) return true;

    // Mark as completed if within last 5 minutes of content
    if (duration - currentTime < 300) return true;

    // If previously marked complete, keep it complete
    return existing?.isCompleted || false;
  }

  /**
   * Update viewing sessions for analytics
   */
  private updateViewingSessions(existingSessions: ViewingSession[], currentTime: number): ViewingSession[] {
    // Keep last 10 sessions for pattern analysis
    const sessions = [...existingSessions];

    // Add or update current session
    const now = new Date();
    const lastSession = sessions[sessions.length - 1];

    if (lastSession && this.isCurrentSession(lastSession, now)) {
      // Update existing session
      lastSession.endTime = currentTime;
      lastSession.sessionEnd = now;
      lastSession.watchDuration = lastSession.endTime - lastSession.startTime;
    } else {
      // Start new session
      sessions.push({
        startTime: currentTime,
        endTime: currentTime,
        watchDuration: 0,
        sessionStart: now,
        sessionEnd: now,
        completionRate: 0,
      });
    }

    return sessions.slice(-10); // Keep last 10 sessions
  }

  private isCurrentSession(session: ViewingSession, now: Date): boolean {
    // Consider same session if less than 5 minutes gap
    const timeSinceLastUpdate = now.getTime() - session.sessionEnd.getTime();
    return timeSinceLastUpdate < 5 * 60 * 1000; // 5 minutes
  }

  private detectRewindPattern(sessions: ViewingSession[]): number {
    if (sessions.length < 3) return 0;

    const recentSessions = sessions.slice(-3);
    const rewinds = recentSessions.map(session => session.startTime - session.endTime).filter(rewind => rewind > 10); // At least 10 seconds

    if (rewinds.length >= 2) {
      return Math.floor(rewinds.reduce((sum, r) => sum + r, 0) / rewinds.length);
    }

    return 0;
  }

  private async updateRecentlyWatched(videoId: string, profileId: string, progress: ViewingProgress): Promise<void> {
    try {
      const recentPath = join(this.recentlyWatchedDir, `${profileId}.json`);

      let recentList: RecentlyWatched[] = [];
      try {
        const data = await fs.readFile(recentPath, 'utf-8');
        recentList = JSON.parse(data);
      } catch {
        // File doesn't exist yet
      }

      // Remove existing entry for this video
      recentList = recentList.filter(item => item.videoId !== videoId);

      // Add updated entry at the front
      recentList.unshift({
        videoId,
        profileId,
        lastWatched: progress.lastWatched,
        progressPercent: progress.percentComplete,
        isCompleted: progress.isCompleted,
        thumbnailTime: this.calculateOptimalThumbnailTime(progress),
      });

      // Keep last 50 items
      recentList = recentList.slice(0, 50);

      await fs.writeFile(recentPath, JSON.stringify(recentList, null, 2));
    } catch (error) {
      console.error('Failed to update recently watched:', error);
    }
  }

  private calculateOptimalThumbnailTime(progress: ViewingProgress): number {
    // Show thumbnail from 10% into content, or current position if further
    const tenPercentPosition = progress.duration * 0.1;
    return Math.max(tenPercentPosition, Math.min(progress.currentTime, progress.duration * 0.8));
  }

  private async persistProgress(progress: ViewingProgress): Promise<void> {
    const progressKey = `${progress.profileId}-${progress.videoId}`;
    const progressPath = join(this.progressDir, `${progressKey}.json`);

    await fs.writeFile(progressPath, JSON.stringify(progress, null, 2));
  }

  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.progressDir, { recursive: true });
    await fs.mkdir(this.recentlyWatchedDir, { recursive: true });
  }
}

export const progressService = new ProgressService();
```

### 2. Enhanced Progress Tracking API Routes

**Progress tracking routes** (`backend/src/routes/progress.ts`):

```typescript
import express from 'express';
import { progressService } from '../services/progressService.js';
import { videoLibrary } from '../services/videoLibrary.js';

const router = express.Router();

/**
 * Save viewing progress
 * Route: POST /api/progress/:videoId/:profileId
 * Philosophy: Progress saving should be fire-and-forget from client perspective
 */
router.post('/:videoId/:profileId', async (req, res) => {
  try {
    const { videoId, profileId } = req.params;
    const { currentTime, duration, viewingContext } = req.body;

    // Validate inputs
    if (typeof currentTime !== 'number' || typeof duration !== 'number') {
      return res.status(400).json({ error: 'Invalid progress data' });
    }

    await progressService.saveProgress(videoId, profileId, currentTime, duration, viewingContext);

    res.json({ success: true });
  } catch (error) {
    console.error('Progress save error:', error);
    // Return success even on error to prevent client retry storms
    res.json({ success: true, warning: 'Progress may not have been saved' });
  }
});

/**
 * Get viewing progress for a video
 * Route: GET /api/progress/:videoId/:profileId
 */
router.get('/:videoId/:profileId', async (req, res) => {
  try {
    const { videoId, profileId } = req.params;

    const progress = await progressService.getProgress(videoId, profileId);

    if (!progress) {
      return res.json({
        currentTime: 0,
        percentComplete: 0,
        isCompleted: false,
        resumePosition: 0,
      });
    }

    res.json({
      currentTime: progress.currentTime,
      percentComplete: progress.percentComplete,
      isCompleted: progress.isCompleted,
      resumePosition: progress.resumePosition,
      lastWatched: progress.lastWatched,
      viewingContext: progress.viewingContext,
    });
  } catch (error) {
    console.error('Progress fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

/**
 * Get recently watched content for a profile
 * Route: GET /api/progress/recent/:profileId
 */
router.get('/recent/:profileId', async (req, res) => {
  try {
    const { profileId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const recentlyWatched = await progressService.getRecentlyWatched(profileId, limit);

    // Enrich with video metadata
    const enrichedRecent = await Promise.all(
      recentlyWatched.map(async item => {
        const video = await videoLibrary.getVideo(item.videoId);
        return {
          ...item,
          video: video
            ? {
                title: video.title,
                thumbnail: video.thumbnail,
                duration: video.duration,
              }
            : null,
        };
      })
    );

    res.json(enrichedRecent.filter(item => item.video)); // Only return items with valid videos
  } catch (error) {
    console.error('Recently watched error:', error);
    res.status(500).json({ error: 'Failed to fetch recently watched' });
  }
});

/**
 * Mark content as completed
 * Route: POST /api/progress/:videoId/:profileId/complete
 */
router.post('/:videoId/:profileId/complete', async (req, res) => {
  try {
    const { videoId, profileId } = req.params;

    // Get current progress and mark as complete
    const progress = await progressService.getProgress(videoId, profileId);
    const duration = progress?.duration || req.body.duration || 0;

    await progressService.saveProgress(
      videoId,
      profileId,
      duration, // Set to end
      duration,
      'individual'
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Mark complete error:', error);
    res.status(500).json({ error: 'Failed to mark as complete' });
  }
});

export default router;
```

### 3. React 19 Progress Tracking Component

**Enhanced video player with progress tracking** (`frontend/src/components/VideoPlayer/ProgressTrackingPlayer.tsx`):

```typescript
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useProgressTracking } from '../../hooks/useProgressTracking';
import { useProfile } from '../../hooks/useProfile';

interface ProgressTrackingPlayerProps {
  videoId: string;
  autoResume?: boolean;
  onProgressUpdate?: (progress: ProgressData) => void;
}

interface ProgressData {
  currentTime: number;
  duration: number;
  percentComplete: number;
  isCompleted: boolean;
}

/**
 * Video player with automatic progress tracking and resume functionality
 * Philosophy: Progress tracking should be invisible but reliable
 */
export const ProgressTrackingPlayer: React.FC<ProgressTrackingPlayerProps> = ({
  videoId,
  autoResume = true,
  onProgressUpdate
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const { currentProfile } = useProfile();

  const {
    progress,
    saveProgress,
    loadProgress,
    isProgressLoaded
  } = useProgressTracking(videoId, currentProfile?.id);

  /**
   * Initialize video with saved progress
   */
  useEffect(() => {
    if (!isProgressLoaded || !videoRef.current) return;

    const video = videoRef.current;

    const handleLoadedMetadata = async () => {
      if (progress && progress.resumePosition > 0) {
        if (autoResume) {
          // Auto-resume without prompting
          video.currentTime = progress.resumePosition;
        } else {
          // Show resume prompt for user choice
          setShowResumePrompt(true);
        }
      }
      setIsLoading(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [progress, isProgressLoaded, autoResume]);

  /**
   * Track progress during playback
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentProfile) return;

    let progressUpdateTimeout: NodeJS.Timeout;

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      const duration = video.duration;

      if (duration > 0) {
        const percentComplete = (currentTime / duration) * 100;
        const progressData: ProgressData = {
          currentTime,
          duration,
          percentComplete,
          isCompleted: percentComplete >= 90
        };

        // Update parent component
        onProgressUpdate?.(progressData);

        // Debounced progress saving (every 10 seconds max)
        clearTimeout(progressUpdateTimeout);
        progressUpdateTimeout = setTimeout(() => {
          saveProgress(currentTime, duration);
        }, 10000);
      }
    };

    // Also save on pause/seek for immediate persistence
    const handlePause = () => {
      clearTimeout(progressUpdateTimeout);
      saveProgress(video.currentTime, video.duration);
    };

    const handleSeeked = () => {
      clearTimeout(progressUpdateTimeout);
      saveProgress(video.currentTime, video.duration);
    };

    // Save progress before page unload
    const handleBeforeUnload = () => {
      saveProgress(video.currentTime, video.duration);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeked', handleSeeked);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearTimeout(progressUpdateTimeout);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeked', handleSeeked);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentProfile, saveProgress, onProgressUpdate]);

  /**
   * Handle manual resume action
   */
  const handleResume = useCallback(() => {
    if (videoRef.current && progress) {
      videoRef.current.currentTime = progress.resumePosition;
      setShowResumePrompt(false);
    }
  }, [progress]);

  const handleStartOver = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setShowResumePrompt(false);
    }
  }, []);

  return (
    <div className="progress-tracking-player">
      <video
        ref={videoRef}
        src={`/api/videos/${videoId}/stream`}
        className="progress-tracking-player__video"
        controls
        preload="metadata"
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="progress-tracking-player__loading">
          <div className="loading-spinner" />
          <p>Loading your progress...</p>
        </div>
      )}

      {/* Resume prompt overlay */}
      {showResumePrompt && progress && (
        <div className="progress-tracking-player__resume-overlay">
          <div className="resume-prompt">
            <h3>Resume Watching?</h3>
            <p>
              Pick up where you left off at{' '}
              {Math.floor(progress.resumePosition / 60)}:
              {Math.floor(progress.resumePosition % 60).toString().padStart(2, '0')}
            </p>
            <div className="resume-actions">
              <button
                onClick={handleResume}
                className="btn btn-primary"
              >
                Resume
              </button>
              <button
                onClick={handleStartOver}
                className="btn btn-secondary"
              >
                Start Over
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress indicator */}
      {progress && progress.percentComplete > 0 && (
        <div className="progress-tracking-player__progress-indicator">
          <div
            className="progress-bar"
            style={{ width: `${progress.percentComplete}%` }}
          />
          {progress.isCompleted && (
            <div className="completion-badge">✓ Completed</div>
          )}
        </div>
      )}
    </div>
  );
};
```

### 4. Progress Tracking Custom Hook

**Custom hook for progress management** (`frontend/src/hooks/useProgressTracking.ts`):

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';

interface ProgressData {
  currentTime: number;
  percentComplete: number;
  isCompleted: boolean;
  resumePosition: number;
  lastWatched: Date;
  viewingContext: 'individual' | 'family' | 'background';
}

interface UseProgressTrackingReturn {
  progress: ProgressData | null;
  saveProgress: (currentTime: number, duration: number, context?: string) => void;
  loadProgress: () => Promise<void>;
  isProgressLoaded: boolean;
}

/**
 * Custom hook for video progress tracking
 * Philosophy: Progress should persist automatically and load seamlessly
 */
export const useProgressTracking = (videoId: string, profileId?: string): UseProgressTrackingReturn => {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isProgressLoaded, setIsProgressLoaded] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  /**
   * Load existing progress for video and profile
   */
  const loadProgress = useCallback(async () => {
    if (!videoId || !profileId) {
      setIsProgressLoaded(true);
      return;
    }

    try {
      const response = await fetch(`/api/progress/${videoId}/${profileId}`);
      if (response.ok) {
        const progressData = await response.json();

        if (progressData.currentTime > 0) {
          setProgress({
            ...progressData,
            lastWatched: new Date(progressData.lastWatched),
          });
        }
      }
    } catch (error) {
      console.error('Failed to load progress:', error);
    } finally {
      setIsProgressLoaded(true);
    }
  }, [videoId, profileId]);

  /**
   * Save progress with debouncing to prevent excessive API calls
   */
  const saveProgress = useCallback(
    (currentTime: number, duration: number, context: string = 'individual') => {
      if (!videoId || !profileId || duration === 0) return;

      const percentComplete = (currentTime / duration) * 100;
      const isCompleted = percentComplete >= 90;

      // Update local state immediately for responsive UI
      setProgress(prev => ({
        currentTime,
        percentComplete,
        isCompleted,
        resumePosition: currentTime,
        lastWatched: new Date(),
        viewingContext: context as any,
      }));

      // Debounce API calls
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await fetch(`/api/progress/${videoId}/${profileId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              currentTime,
              duration,
              viewingContext: context,
            }),
          });
        } catch (error) {
          console.error('Failed to save progress:', error);
          // TODO: Implement offline queue for failed saves
        }
      }, 2000); // 2 second debounce
    },
    [videoId, profileId]
  );

  // Load progress when videoId or profileId changes
  useEffect(() => {
    setIsProgressLoaded(false);
    setProgress(null);
    loadProgress();
  }, [loadProgress]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    progress,
    saveProgress,
    loadProgress,
    isProgressLoaded,
  };
};
```

## Anti-Patterns to Avoid

### ❌ **Excessive Save Frequency Anti-Pattern**: Saving Progress Every Second

**What not to do**:

```typescript
// DON'T: Save progress on every timeupdate event
video.addEventListener('timeupdate', () => {
  saveProgress(video.currentTime); // Called multiple times per second!
});
```

**Why it's problematic**: Overwhelms server, causes performance issues, provides no user benefit

**Better approach**:

```typescript
// DO: Debounced progress saving
const debouncedSave = debounce(() => {
  saveProgress(video.currentTime);
}, 10000); // Save max once per 10 seconds

video.addEventListener('timeupdate', debouncedSave);
```

### ❌ **Exact Position Resume Anti-Pattern**: Always Resume at Exact Second

**What not to do**:

```typescript
// DON'T: Always resume at exact position
video.currentTime = progress.currentTime; // Could be mid-sentence or mid-action
```

**Why it's problematic**: Can resume in awkward moments, missing context, or after credits

**Better approach**:

```typescript
// DO: Smart resume positioning
const resumePosition = calculateSmartResumePosition(progress.currentTime, video.duration);
video.currentTime = resumePosition; // May rewind slightly for better context
```

### ❌ **Global Progress Anti-Pattern**: One Progress for All Family Members

**What not to do**:

```typescript
// DON'T: Share progress across all users
const saveProgress = (videoId, currentTime) => {
  localStorage.setItem(`progress-${videoId}`, currentTime); // Same for everyone
};
```

**Why it's problematic**: Ruins experience for other family members, no individual tracking

**Better approach**:

```typescript
// DO: Profile-aware progress tracking
const saveProgress = (videoId, profileId, currentTime) => {
  saveProfileProgress(videoId, profileId, currentTime); // Individual progress per profile
};
```

### ❌ **Synchronous Save Anti-Pattern**: Blocking UI for Progress Saves

**What not to do**:

```typescript
// DON'T: Block user interaction during save
const saveProgress = async (currentTime) => {
  video.pause(); // Blocks video during save
  await fetch('/api/progress', {...});
  video.play();
};
```

**Why it's problematic**: Creates stuttering playback, poor user experience

**Better approach**:

```typescript
// DO: Fire-and-forget progress saving
const saveProgress = (currentTime) => {
  fetch('/api/progress', {...}).catch(console.error); // Non-blocking
};
```

## Variation Guidance

**IMPORTANT**: Progress tracking implementations should vary based on content type and viewing context.

**For Movies (90+ minutes)**: Save progress more frequently, smart resume with rewind, completion at 95%
**For TV Episodes (20-45 minutes)**: Less frequent saves, exact resume position, completion at 85%  
**For Short Clips (< 10 minutes)**: Minimal progress tracking, completion at 90%, no resume prompts
**For Educational Content**: Chapter-based progress, bookmark important positions, detailed analytics
**For Kids Content**: Simple completion tracking, parental controls on resume, time limits integration
**For Family Movie Nights**: Shared progress mode, disable individual tracking temporarily

**Avoid converging on**: Single save frequency for all content, uniform completion thresholds, one resume strategy fits all

## Validation & Testing

### 1. Progress Persistence Testing

**Cross-session continuity testing**:

```typescript
// tests/progress/persistence.test.ts
describe('Progress Persistence', () => {
  test('progress survives browser refresh', async () => {
    // Save progress
    await progressService.saveProgress('video-1', 'profile-1', 300, 3600);

    // Simulate browser refresh by clearing cache
    progressService.clearCache();

    // Verify progress loads correctly
    const loaded = await progressService.getProgress('video-1', 'profile-1');
    expect(loaded?.currentTime).toBe(300);
  });
});
```

### 2. Smart Resume Logic Testing

**Resume position calculation testing**:

```typescript
describe('Smart Resume Logic', () => {
  test('rewinds for better context when near end', () => {
    const resumePos = calculateSmartResumePosition(3540, 3600); // 1 minute left
    expect(resumePos).toBe(0); // Should restart
  });

  test('maintains position for mid-content', () => {
    const resumePos = calculateSmartResumePosition(1800, 3600); // Halfway
    expect(resumePos).toBe(1800); // Should maintain
  });
});
```

### 3. Performance Testing

**Progress save performance validation**:

```typescript
// Load testing for concurrent progress saves
describe('Progress Save Performance', () => {
  test('handles concurrent saves without blocking', async () => {
    const promises = Array.from({ length: 100 }, (_, i) =>
      progressService.saveProgress(`video-${i}`, 'profile-1', 300, 3600)
    );

    const startTime = Date.now();
    await Promise.all(promises);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(1000); // Should complete within 1 second
  });
});
```

## Success Metrics

### User Experience Metrics

- **Resume Success Rate**: > 95% of resume attempts succeed without user confusion
- **Progress Save Reliability**: > 99.5% of progress updates persist successfully
- **Resume Position Accuracy**: > 90% of users satisfied with smart resume positioning
- **Cross-Session Continuity**: Progress maintained across 100% of app restarts and device switches

### Performance Metrics

- **Save Latency**: Progress saves complete within 100ms (non-blocking)
- **Load Performance**: Progress loads within 200ms on video initialization
- **Storage Efficiency**: Progress data stays under 1KB per video per profile
- **API Call Frequency**: Max 6 progress saves per hour per active video

### Family Usage Metrics

- **Profile Isolation**: 0% cross-contamination of progress between profiles
- **Recently Watched Accuracy**: > 85% of recently watched suggestions are relevant
- **Completion Detection**: > 95% accuracy in automatically detecting completed content

## Integration Points

### Backend Integration

- **Profile System**: Seamless integration with family profile management
- **Video Library**: Progress data enriches video metadata and recommendations
- **Analytics Service**: Progress patterns inform content curation and optimization

### Frontend Integration

- **Video Player**: Automatic progress saving and smart resume functionality
- **Home Screen**: Recently watched section with progress indicators
- **Profile Switching**: Progress isolation and cross-profile viewing prevention

### Future Enhancement Integration

- **Cross-Device Sync**: Foundation for multi-device progress synchronization
- **Recommendation Engine**: Viewing history powers content suggestions
- **Parental Controls**: Progress data enables viewing time limits and content filtering

---

**Implementation Priority**: This PRP should be implemented immediately after PRP-4.1 (Video Player) and PRP-4.2 (Streaming Optimization) as it provides the foundation for a Netflix-like viewing experience. Progress tracking significantly impacts user retention and satisfaction.

**Next PRP Dependencies**: PRP-4.4 (Quality Management) can use progress analytics for optimization, PRP-4.5 (Multi-Device Sync) builds directly on this progress tracking foundation.
