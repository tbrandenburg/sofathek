# PRP-4.1: Advanced HTML5 Video Player & Controls

## Purpose & Core Philosophy

**Transform basic HTML5 video element into sophisticated streaming-grade video player that rivals Netflix and YouTube in functionality while maintaining React 19 performance optimization and accessibility standards.**

### Before implementing video player, ask:

- **Does this player enhance the viewing experience without creating barriers?**
- **How does video control design support both casual and power users?**
- **Will the player feel intuitive across all devices and input methods?**
- **Does the interface disappear during focus viewing while remaining accessible?**

### Core Principles

1. **Immersion-First Design**: Controls should enhance rather than distract from content consumption
2. **Progressive Control Complexity**: Basic controls visible, advanced features discoverable but not overwhelming
3. **Platform-Adaptive Interface**: Respect device conventions (mobile gestures, TV remotes, desktop shortcuts)
4. **Accessibility-Driven Architecture**: Screen reader compatible, keyboard navigable, high contrast compliant
5. **Performance-Conscious Implementation**: Minimize impact on video playback performance

---

## Gap Analysis: Current vs Advanced Video Player

### Current State Issues (from SOFATHEK analysis)

- **Basic HTML5 Element**: Default browser controls lack customization and Netflix-like experience
- **No Custom Controls**: Missing advanced features like playback speed, quality selection, subtitles
- **Poor Touch Support**: Default controls not optimized for mobile/tablet interaction
- **Missing Accessibility**: No keyboard shortcuts, screen reader support, or high contrast modes
- **No Integration**: Controls don't integrate with profile system, progress tracking, or theming
- **Performance Gaps**: No optimization for large video files or range request seeking
- **Limited Responsiveness**: Controls don't adapt to different screen sizes or orientations

### Netflix-Grade Target Experience

- **Custom Control Suite**: Play/pause, seeking, volume, settings, fullscreen with smooth animations
- **Intelligent Auto-Hide**: Controls appear on interaction, fade during focused viewing
- **Advanced Settings Panel**: Quality selection, playback speed, subtitles, audio tracks
- **Gesture Support**: Touch gestures for seeking, volume, brightness on mobile devices
- **Keyboard Shortcuts**: Complete keyboard navigation with customizable hotkeys
- **Profile Integration**: Resume playback, progress sync, viewing history integration
- **Adaptive Quality**: Automatic quality adjustment based on network and device capabilities
- **Multi-Track Support**: Multiple audio tracks, subtitles, chapter navigation

---

## Implementation Strategy

### 1. Custom Video Player Foundation (`VideoPlayer`)

**Philosophy**: Build composable video player architecture that separates concerns between playback engine, control interface, and platform integration.

```tsx
// /frontend/src/components/VideoPlayer/VideoPlayer.tsx
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useVideoPlayer } from '../../hooks/useVideoPlayer';
import { useProfile } from '../../hooks/useProfile';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useTouchGestures } from '../../hooks/useTouchGestures';
import { useVideoProgress } from '../../hooks/useVideoProgress';
import { VideoControls } from './VideoControls';
import { VideoSettingsPanel } from './VideoSettingsPanel';
import { VideoLoadingState } from './VideoLoadingState';
import { VideoCaptions } from './VideoCaptions';
import { VideoErrorBoundary } from './VideoErrorBoundary';
import './VideoPlayer.css';

interface VideoPlayerProps {
  videoUrl: string;
  videoId: string;
  title: string;
  poster?: string;
  subtitles?: SubtitleTrack[];
  audioTracks?: AudioTrack[];
  chapters?: ChapterMarker[];
  onProgress?: (progress: number) => void;
  onEnded?: () => void;
  onError?: (error: VideoError) => void;
  autoPlay?: boolean;
  startTime?: number;
  className?: string;
}

interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  buffered: TimeRanges | null;
  volume: number;
  muted: boolean;
  playbackRate: number;
  quality: VideoQuality;
  isFullscreen: boolean;
  loading: boolean;
  error: VideoError | null;
  controlsVisible: boolean;
  settingsOpen: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  videoId,
  title,
  poster,
  subtitles = [],
  audioTracks = [],
  chapters = [],
  onProgress,
  onEnded,
  onError,
  autoPlay = false,
  startTime = 0,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const { currentProfile } = useProfile();

  // Video player state management
  const {
    state,
    actions: {
      play,
      pause,
      seek,
      setVolume,
      setMuted,
      setPlaybackRate,
      setQuality,
      toggleFullscreen,
      showControls,
      hideControls,
      toggleSettings,
    },
  } = useVideoPlayer(videoRef, {
    videoId,
    autoPlay,
    startTime,
    onProgress,
    onEnded,
    onError,
  });

  // Progress tracking and resume functionality
  const { saveProgress, getResumeTime } = useVideoProgress(videoId, currentProfile?.id);

  // Keyboard shortcuts
  const keyboardShortcuts = useMemo(
    () => ({
      Space: () => (state.isPlaying ? pause() : play()),
      ArrowLeft: () => seek(Math.max(0, state.currentTime - 10)),
      ArrowRight: () => seek(Math.min(state.duration, state.currentTime + 10)),
      ArrowUp: () => setVolume(Math.min(1, state.volume + 0.1)),
      ArrowDown: () => setVolume(Math.max(0, state.volume - 0.1)),
      KeyM: () => setMuted(!state.muted),
      KeyF: () => toggleFullscreen(),
      Escape: () => state.isFullscreen && toggleFullscreen(),
      Digit1: () => setPlaybackRate(0.25),
      Digit2: () => setPlaybackRate(0.5),
      Digit3: () => setPlaybackRate(0.75),
      Digit4: () => setPlaybackRate(1),
      Digit5: () => setPlaybackRate(1.25),
      Digit6: () => setPlaybackRate(1.5),
      Digit7: () => setPlaybackRate(2),
    }),
    [state, play, pause, seek, setVolume, setMuted, setPlaybackRate, toggleFullscreen]
  );

  useKeyboardShortcuts(keyboardShortcuts, containerRef);

  // Touch gesture support for mobile
  const touchGestures = useTouchGestures({
    onTap: () => (state.isPlaying ? pause() : play()),
    onDoubleTapLeft: () => seek(Math.max(0, state.currentTime - 10)),
    onDoubleTapRight: () => seek(Math.min(state.duration, state.currentTime + 10)),
    onSwipeUp: () => setVolume(Math.min(1, state.volume + 0.2)),
    onSwipeDown: () => setVolume(Math.max(0, state.volume - 0.2)),
    onPinch: (scale: number) => {
      // Implement picture-in-picture or zoom functionality
      if (scale > 1.2 && !state.isFullscreen) {
        toggleFullscreen();
      }
    },
  });

  // Auto-hide controls logic
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    showControls();

    // Hide controls after 3 seconds if playing
    if (state.isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        hideControls();
      }, 3000);
    }
  }, [state.isPlaying, showControls, hideControls]);

  // Mouse/touch interaction handling
  const handleUserInteraction = useCallback(() => {
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  // Initialize resume time from profile
  useEffect(() => {
    if (currentProfile && videoRef.current) {
      const resumeTime = getResumeTime();
      if (resumeTime > 0) {
        seek(resumeTime);
      }
    }
  }, [currentProfile, videoId, getResumeTime, seek]);

  // Save progress periodically
  useEffect(() => {
    if (state.currentTime > 0 && currentProfile) {
      const interval = setInterval(() => {
        saveProgress(state.currentTime);
      }, 10000); // Save every 10 seconds

      return () => clearInterval(interval);
    }
  }, [state.currentTime, currentProfile, saveProgress]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const playerClasses = [
    'video-player',
    state.isFullscreen && 'video-player--fullscreen',
    state.controlsVisible && 'video-player--controls-visible',
    state.loading && 'video-player--loading',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <VideoErrorBoundary onError={onError}>
      <div
        ref={containerRef}
        className={playerClasses}
        onMouseMove={handleUserInteraction}
        onTouchStart={handleUserInteraction}
        {...touchGestures}
        tabIndex={0}
        role="application"
        aria-label={`Video player: ${title}`}
      >
        {/* Video Element */}
        <video
          ref={videoRef}
          className="video-player__video"
          src={videoUrl}
          poster={poster}
          preload="metadata"
          playsInline
          crossOrigin="anonymous"
          aria-describedby="video-description"
          onLoadStart={() => console.log('Video load started')}
          onCanPlay={() => console.log('Video can play')}
          onWaiting={() => console.log('Video waiting for data')}
        >
          {/* Subtitle tracks */}
          {subtitles.map((track, index) => (
            <track
              key={track.language}
              kind="subtitles"
              src={track.src}
              srcLang={track.language}
              label={track.label}
              default={index === 0}
            />
          ))}

          <p id="video-description">{title} - Use spacebar to play/pause, arrow keys to seek and adjust volume.</p>
        </video>

        {/* Loading State */}
        {state.loading && <VideoLoadingState title={title} progress={state.currentTime / state.duration} />}

        {/* Captions/Subtitles */}
        <VideoCaptions tracks={subtitles} currentTime={state.currentTime} isVisible={!state.loading} />

        {/* Video Controls */}
        <VideoControls
          state={state}
          onPlay={play}
          onPause={pause}
          onSeek={seek}
          onVolumeChange={setVolume}
          onMuteToggle={() => setMuted(!state.muted)}
          onFullscreenToggle={toggleFullscreen}
          onSettingsToggle={toggleSettings}
          onPlaybackRateChange={setPlaybackRate}
          chapters={chapters}
          isVisible={state.controlsVisible}
          className="video-player__controls"
        />

        {/* Settings Panel */}
        {state.settingsOpen && (
          <VideoSettingsPanel
            state={state}
            onQualityChange={setQuality}
            onPlaybackRateChange={setPlaybackRate}
            onClose={toggleSettings}
            subtitles={subtitles}
            audioTracks={audioTracks}
          />
        )}

        {/* Keyboard shortcuts help */}
        <div className="video-player__shortcuts" aria-live="polite">
          <span className="sr-only">Press ? for keyboard shortcuts help</span>
        </div>
      </div>
    </VideoErrorBoundary>
  );
};
```

### 2. Advanced Video Controls Interface (`VideoControls`)

**Philosophy**: Controls should provide immediate feedback while maintaining visual elegance and accessibility compliance.

```tsx
// /frontend/src/components/VideoPlayer/VideoControls.tsx
import React, { useState, useRef, useCallback, memo } from 'react';
import { VideoPlayerState, ChapterMarker } from '../../types';
import { ProgressBar } from './ProgressBar';
import { VolumeControl } from './VolumeControl';
import { PlaybackSpeedControl } from './PlaybackSpeedControl';
import './VideoControls.css';

interface VideoControlsProps {
  state: VideoPlayerState;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onFullscreenToggle: () => void;
  onSettingsToggle: () => void;
  onPlaybackRateChange: (rate: number) => void;
  chapters?: ChapterMarker[];
  isVisible: boolean;
  className?: string;
}

export const VideoControls = memo<VideoControlsProps>(
  ({
    state,
    onPlay,
    onPause,
    onSeek,
    onVolumeChange,
    onMuteToggle,
    onFullscreenToggle,
    onSettingsToggle,
    onPlaybackRateChange,
    chapters = [],
    isVisible,
    className = '',
  }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [volumeVisible, setVolumeVisible] = useState(false);
    const controlsRef = useRef<HTMLDivElement>(null);

    const formatTime = useCallback((seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);

      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }, []);

    const handlePlayPauseClick = useCallback(() => {
      state.isPlaying ? onPause() : onPlay();
    }, [state.isPlaying, onPlay, onPause]);

    const handleProgressChange = useCallback(
      (time: number) => {
        setIsDragging(true);
        onSeek(time);
      },
      [onSeek]
    );

    const handleProgressEnd = useCallback(() => {
      setIsDragging(false);
    }, []);

    const controlsClasses = [
      'video-controls',
      isVisible && 'video-controls--visible',
      isDragging && 'video-controls--dragging',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={controlsRef} className={controlsClasses} role="toolbar" aria-label="Video player controls">
        {/* Progress Bar */}
        <div className="video-controls__progress-section">
          <ProgressBar
            currentTime={state.currentTime}
            duration={state.duration}
            buffered={state.buffered}
            chapters={chapters}
            onChange={handleProgressChange}
            onChangeEnd={handleProgressEnd}
            isDragging={isDragging}
            className="video-controls__progress"
          />
        </div>

        {/* Main Controls Bar */}
        <div className="video-controls__main">
          {/* Left Side Controls */}
          <div className="video-controls__left">
            {/* Play/Pause Button */}
            <button
              className="control-button control-button--primary"
              onClick={handlePlayPauseClick}
              aria-label={state.isPlaying ? 'Pause video' : 'Play video'}
            >
              <svg className="control-icon" viewBox="0 0 24 24">
                {state.isPlaying ? (
                  // Pause icon
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                ) : (
                  // Play icon
                  <path d="M8 5v14l11-7z" />
                )}
              </svg>
            </button>

            {/* Skip Back Button */}
            <button
              className="control-button"
              onClick={() => onSeek(Math.max(0, state.currentTime - 10))}
              aria-label="Skip back 10 seconds"
            >
              <svg className="control-icon" viewBox="0 0 24 24">
                <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
                <text x="12" y="15" fontSize="8" textAnchor="middle" fill="currentColor">
                  10
                </text>
              </svg>
            </button>

            {/* Skip Forward Button */}
            <button
              className="control-button"
              onClick={() => onSeek(Math.min(state.duration, state.currentTime + 10))}
              aria-label="Skip forward 10 seconds"
            >
              <svg className="control-icon" viewBox="0 0 24 24">
                <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
                <text x="12" y="15" fontSize="8" textAnchor="middle" fill="currentColor">
                  10
                </text>
              </svg>
            </button>

            {/* Volume Control */}
            <div
              className="volume-control-container"
              onMouseEnter={() => setVolumeVisible(true)}
              onMouseLeave={() => setVolumeVisible(false)}
            >
              <button className="control-button" onClick={onMuteToggle} aria-label={state.muted ? 'Unmute' : 'Mute'}>
                <svg className="control-icon" viewBox="0 0 24 24">
                  {state.muted ? (
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  ) : (
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  )}
                </svg>
              </button>

              <VolumeControl
                volume={state.volume}
                muted={state.muted}
                onChange={onVolumeChange}
                isVisible={volumeVisible}
                className="volume-control"
              />
            </div>

            {/* Time Display */}
            <div className="time-display">
              <span className="time-current" aria-label="Current time">
                {formatTime(state.currentTime)}
              </span>
              <span className="time-separator"> / </span>
              <span className="time-duration" aria-label="Total duration">
                {formatTime(state.duration)}
              </span>
            </div>
          </div>

          {/* Right Side Controls */}
          <div className="video-controls__right">
            {/* Playback Speed */}
            <PlaybackSpeedControl
              currentRate={state.playbackRate}
              onChange={onPlaybackRateChange}
              className="playback-speed-control"
            />

            {/* Settings Button */}
            <button className="control-button" onClick={onSettingsToggle} aria-label="Video settings">
              <svg className="control-icon" viewBox="0 0 24 24">
                <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
              </svg>
            </button>

            {/* Fullscreen Button */}
            <button
              className="control-button"
              onClick={onFullscreenToggle}
              aria-label={state.isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              <svg className="control-icon" viewBox="0 0 24 24">
                {state.isFullscreen ? (
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                ) : (
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }
);

VideoControls.displayName = 'VideoControls';
```

### 3. Touch Gesture Support for Mobile (`useTouchGestures`)

**Philosophy**: Touch interactions should feel native to mobile platforms while providing powerful video control capabilities.

```tsx
// /frontend/src/hooks/useTouchGestures.ts
import { useRef, useEffect, useCallback } from 'react';

interface TouchGestureCallbacks {
  onTap?: () => void;
  onDoubleTapLeft?: () => void;
  onDoubleTapRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onPinch?: (scale: number) => void;
  onBrightnessChange?: (delta: number) => void;
  onVolumeChange?: (delta: number) => void;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  lastTapTime: number;
  lastTapX: number;
  lastTapY: number;
  initialDistance: number;
  isGestureActive: boolean;
}

export function useTouchGestures(callbacks: TouchGestureCallbacks) {
  const touchState = useRef<TouchState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    lastTapTime: 0,
    lastTapX: 0,
    lastTapY: 0,
    initialDistance: 0,
    isGestureActive: false,
  });

  const getDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0];
      const now = Date.now();

      touchState.current = {
        ...touchState.current,
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: now,
        isGestureActive: true,
      };

      // Handle multi-touch for pinch gestures
      if (e.touches.length === 2) {
        touchState.current.initialDistance = getDistance(e.touches[0], e.touches[1]);
      }
    },
    [getDistance]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!touchState.current.isGestureActive) return;

      // Handle pinch gestures
      if (e.touches.length === 2 && callbacks.onPinch) {
        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        const scale = currentDistance / touchState.current.initialDistance;

        if (Math.abs(scale - 1) > 0.1) {
          // Threshold to prevent jittery gestures
          callbacks.onPinch(scale);
        }
        return;
      }

      // Single touch gestures for brightness/volume
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const deltaY = touch.clientY - touchState.current.startY;
        const deltaX = touch.clientX - touchState.current.startX;

        // Determine if this is a vertical swipe for brightness/volume
        if (Math.abs(deltaY) > 50 && Math.abs(deltaY) > Math.abs(deltaX) * 2) {
          const screenWidth = window.innerWidth;
          const isLeftSide = touchState.current.startX < screenWidth / 2;

          if (isLeftSide && callbacks.onBrightnessChange) {
            // Left side controls brightness
            callbacks.onBrightnessChange(-deltaY / 300);
          } else if (!isLeftSide && callbacks.onVolumeChange) {
            // Right side controls volume
            callbacks.onVolumeChange(-deltaY / 300);
          }
        }
      }
    },
    [callbacks, getDistance]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!touchState.current.isGestureActive) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchState.current.startX;
      const deltaY = touch.clientY - touchState.current.startY;
      const deltaTime = Date.now() - touchState.current.startTime;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Detect tap vs swipe
      if (distance < 10 && deltaTime < 300) {
        // This is a tap
        const now = Date.now();
        const timeSinceLastTap = now - touchState.current.lastTapTime;
        const distanceFromLastTap = Math.sqrt(
          Math.pow(touch.clientX - touchState.current.lastTapX, 2) +
            Math.pow(touch.clientY - touchState.current.lastTapY, 2)
        );

        // Check for double tap
        if (timeSinceLastTap < 300 && distanceFromLastTap < 50) {
          // Double tap detected
          const screenWidth = window.innerWidth;
          const isLeftSide = touch.clientX < screenWidth / 3;
          const isRightSide = touch.clientX > (screenWidth * 2) / 3;

          if (isLeftSide && callbacks.onDoubleTapLeft) {
            callbacks.onDoubleTapLeft();
          } else if (isRightSide && callbacks.onDoubleTapRight) {
            callbacks.onDoubleTapRight();
          }

          // Reset tap tracking
          touchState.current.lastTapTime = 0;
        } else {
          // Single tap
          if (callbacks.onTap) {
            callbacks.onTap();
          }

          // Update last tap info
          touchState.current.lastTapTime = now;
          touchState.current.lastTapX = touch.clientX;
          touchState.current.lastTapY = touch.clientY;
        }
      } else if (deltaTime < 300 && distance > 50) {
        // This is a swipe
        const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);

        if (isHorizontal) {
          if (deltaX > 0 && callbacks.onSwipeRight) {
            callbacks.onSwipeRight();
          } else if (deltaX < 0 && callbacks.onSwipeLeft) {
            callbacks.onSwipeLeft();
          }
        } else {
          if (deltaY > 0 && callbacks.onSwipeDown) {
            callbacks.onSwipeDown();
          } else if (deltaY < 0 && callbacks.onSwipeUp) {
            callbacks.onSwipeUp();
          }
        }
      }

      touchState.current.isGestureActive = false;
    },
    [callbacks]
  );

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}
```

### 4. Advanced Progress Bar with Chapter Support (`ProgressBar`)

**Philosophy**: Progress indication should provide rich information about video structure while remaining visually clean.

```tsx
// /frontend/src/components/VideoPlayer/ProgressBar.tsx
import React, { useRef, useCallback, useState, useEffect, memo } from 'react';
import { ChapterMarker } from '../../types';
import './ProgressBar.css';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  buffered: TimeRanges | null;
  chapters?: ChapterMarker[];
  onChange: (time: number) => void;
  onChangeEnd: () => void;
  isDragging: boolean;
  className?: string;
}

export const ProgressBar = memo<ProgressBarProps>(
  ({ currentTime, duration, buffered, chapters = [], onChange, onChangeEnd, isDragging, className = '' }) => {
    const progressRef = useRef<HTMLDivElement>(null);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
    const [isDraggingLocal, setIsDraggingLocal] = useState(false);

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    // Calculate buffered ranges
    const bufferedRanges = [];
    if (buffered && duration > 0) {
      for (let i = 0; i < buffered.length; i++) {
        const start = (buffered.start(i) / duration) * 100;
        const end = (buffered.end(i) / duration) * 100;
        bufferedRanges.push({ start, end });
      }
    }

    const getTimeFromPosition = useCallback(
      (clientX: number): number => {
        if (!progressRef.current) return 0;

        const rect = progressRef.current.getBoundingClientRect();
        const position = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return position * duration;
      },
      [duration]
    );

    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        setIsDraggingLocal(true);
        const time = getTimeFromPosition(e.clientX);
        onChange(time);
      },
      [getTimeFromPosition, onChange]
    );

    const handleMouseMove = useCallback(
      (e: React.MouseEvent) => {
        const time = getTimeFromPosition(e.clientX);
        setHoverTime(time);

        // Load thumbnail preview (implement based on your thumbnail generation system)
        // setThumbnailPreview(getThumbnailForTime(time));

        if (isDraggingLocal) {
          onChange(time);
        }
      },
      [getTimeFromPosition, isDraggingLocal, onChange]
    );

    const handleMouseUp = useCallback(() => {
      if (isDraggingLocal) {
        setIsDraggingLocal(false);
        onChangeEnd();
      }
    }, [isDraggingLocal, onChangeEnd]);

    const handleMouseLeave = useCallback(() => {
      setHoverTime(null);
      setThumbnailPreview(null);
    }, []);

    // Global mouse events for dragging
    useEffect(() => {
      if (isDraggingLocal) {
        const handleGlobalMouseMove = (e: MouseEvent) => {
          const time = getTimeFromPosition(e.clientX);
          onChange(time);
        };

        const handleGlobalMouseUp = () => {
          setIsDraggingLocal(false);
          onChangeEnd();
        };

        document.addEventListener('mousemove', handleGlobalMouseMove);
        document.addEventListener('mouseup', handleGlobalMouseUp);

        return () => {
          document.removeEventListener('mousemove', handleGlobalMouseMove);
          document.removeEventListener('mouseup', handleGlobalMouseUp);
        };
      }
    }, [isDraggingLocal, getTimeFromPosition, onChange, onChangeEnd]);

    const formatTime = useCallback((seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);

      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }, []);

    return (
      <div
        ref={progressRef}
        className={`progress-bar ${className} ${isDragging || isDraggingLocal ? 'progress-bar--dragging' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        role="slider"
        aria-label="Video progress"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
        tabIndex={0}
      >
        {/* Background Track */}
        <div className="progress-bar__track">
          {/* Buffered Ranges */}
          {bufferedRanges.map((range, index) => (
            <div
              key={index}
              className="progress-bar__buffered"
              style={{
                left: `${range.start}%`,
                width: `${range.end - range.start}%`,
              }}
            />
          ))}

          {/* Chapter Markers */}
          {chapters.map((chapter, index) => (
            <div
              key={chapter.id || index}
              className="progress-bar__chapter"
              style={{
                left: `${(chapter.startTime / duration) * 100}%`,
              }}
              title={chapter.title}
            />
          ))}

          {/* Progress Fill */}
          <div className="progress-bar__fill" style={{ width: `${progressPercent}%` }} />

          {/* Scrubber Handle */}
          <div className="progress-bar__handle" style={{ left: `${progressPercent}%` }} />

          {/* Hover Preview */}
          {hoverTime !== null && (
            <div
              className="progress-bar__preview"
              style={{
                left: `${(hoverTime / duration) * 100}%`,
              }}
            >
              {thumbnailPreview && (
                <div className="preview-thumbnail">
                  <img src={thumbnailPreview} alt="Video preview" />
                </div>
              )}
              <div className="preview-time">{formatTime(hoverTime)}</div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';
```

---

## Anti-Patterns to Avoid

❌ **Browser Default Controls**: Don't rely on default HTML5 video controls for production applications

- **Why bad**: Limited customization, poor accessibility, inconsistent across browsers
- **Better**: Build custom controls with proper ARIA labels and keyboard navigation

❌ **Desktop-Only Control Design**: Don't design video controls that only work with mouse interaction

- **Why bad**: Excludes mobile users, violates accessibility guidelines, poor touch experience
- **Better**: Touch-first design with mobile gestures and appropriately sized controls

❌ **Performance-Ignorant Implementation**: Don't implement video controls without considering playback performance

- **Why bad**: Complex controls can interfere with video playback, cause frame drops
- **Better**: Minimize DOM manipulation during playback, use CSS animations, optimize re-renders

❌ **Accessibility Afterthought**: Don't add accessibility features as an afterthought to video controls

- **Why bad**: Screen readers can't navigate video content, keyboard users excluded
- **Better**: Accessibility-first architecture with comprehensive keyboard shortcuts and ARIA support

❌ **Generic Video Player**: Don't create generic video player without considering content context

- **Why bad**: Family content needs different controls than adult content, profiles matter
- **Better**: Context-aware controls that adapt to user profiles and content types

---

## Variation Guidance

**IMPORTANT**: Video player implementations should vary based on content type and user context.

**Vary by Content Type**:

- **Movies**: Cinematic controls with chapter support, minimal UI during playback
- **Educational Content**: Enhanced seeking, bookmarking, note-taking integration
- **Children's Content**: Simplified controls, parental lock features, colorful design
- **Live Streams**: Real-time indicators, chat integration, quality adaptation

**Vary by Device Context**:

- **Mobile Phones**: Touch gestures, portrait mode support, battery optimization
- **Tablets**: Hybrid touch/precision controls, picture-in-picture support
- **Smart TVs**: Remote control navigation, 10-foot UI design, voice control
- **Desktop**: Full keyboard shortcuts, multi-monitor support, advanced settings

**Vary by User Profile**:

- **Children**: Large buttons, simplified controls, time limit indicators
- **Adults**: Full feature set, advanced settings, performance controls
- **Accessibility**: High contrast mode, larger controls, voice navigation
- **Power Users**: Keyboard shortcuts, frame-by-frame seeking, technical overlays

**Avoid converging on single YouTube-clone player** - adapt controls and functionality to match your specific content and family-focused user needs.

---

## Remember

**Video players are the gateway to content consumption.** Every control decision should enhance rather than distract from the viewing experience.

The best video players:

- Disappear during focused viewing while remaining instantly accessible
- Adapt intelligently to content type, device capabilities, and user preferences
- Provide professional-grade functionality through intuitive interfaces
- Maintain flawless playback performance regardless of control complexity

**This video player framework empowers SOFATHEK to deliver Netflix-quality video experiences while serving family-specific needs across all devices and usage contexts.**
