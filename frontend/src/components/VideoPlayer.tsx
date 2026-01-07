import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Video } from '../types';
import './VideoPlayer.css';

interface VideoPlayerProps {
  video: Video;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onLoadStart?: () => void;
  onLoadedMetadata?: () => void;
  onError?: (error: Event) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  autoPlay = false,
  muted = false,
  controls = true,
  className = '',
  onTimeUpdate,
  onDurationChange,
  onPlay,
  onPause,
  onEnded,
  onLoadStart,
  onLoadedMetadata,
  onError,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const controlsTimeoutRef = useRef<number | null>(null);

  const streamUrl = `/api/videos/${video.id}/stream`;

  // Format time for display
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Play/Pause toggle
  const togglePlayPause = useCallback(async () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    try {
      if (isPlaying) {
        await videoElement.pause();
      } else {
        await videoElement.play();
      }
    } catch (err) {
      console.error('Playback error:', err);
      setError('Failed to control playback');
    }
  }, [isPlaying]);

  // Seek to specific time
  const seekTo = useCallback((time: number) => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    videoElement.currentTime = time;
    setCurrentTime(time);
  }, []);

  // Volume control
  const changeVolume = useCallback((newVolume: number) => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    videoElement.volume = clampedVolume;
    setVolume(clampedVolume);
    setIsMuted(clampedVolume === 0);
  }, []);

  // Mute toggle
  const toggleMute = useCallback(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const newMuted = !isMuted;
    videoElement.muted = newMuted;
    setIsMuted(newMuted);
  }, [isMuted]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    try {
      if (isFullscreen) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } else {
        if (videoElement.requestFullscreen) {
          await videoElement.requestFullscreen();
        }
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, [isFullscreen]);

  // Show controls temporarily
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);

    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }

    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);

  // Event handlers
  const handlePlay = () => {
    setIsPlaying(true);
    onPlay?.();
  };

  const handlePause = () => {
    setIsPlaying(false);
    setShowControls(true);
    onPause?.();
  };

  const handleTimeUpdate = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const current = videoElement.currentTime;
    setCurrentTime(current);
    onTimeUpdate?.(current);
  };

  const handleDurationChange = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const dur = videoElement.duration;
    setDuration(dur);
    onDurationChange?.(dur);
  };

  const handleLoadStart = () => {
    setLoading(true);
    setError(null);
    onLoadStart?.();
  };

  const handleLoadedMetadata = () => {
    setLoading(false);
    onLoadedMetadata?.();
  };

  const handleError = (
    event: React.SyntheticEvent<HTMLVideoElement, Event>
  ) => {
    setLoading(false);
    setError('Failed to load video');
    onError?.(event.nativeEvent);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setShowControls(true);
    onEnded?.();
  };

  // Progress bar click handler
  const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = event.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    seekTo(newTime);
  };

  // Volume bar click handler
  const handleVolumeClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const volumeBar = event.currentTarget;
    const rect = volumeBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const newVolume = clickX / rect.width;
    changeVolume(newVolume);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!videoRef.current) return;

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          seekTo(Math.max(0, currentTime - 10));
          break;
        case 'ArrowRight':
          event.preventDefault();
          seekTo(Math.min(duration, currentTime + 10));
          break;
        case 'ArrowUp':
          event.preventDefault();
          changeVolume(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          event.preventDefault();
          changeVolume(Math.max(0, volume - 0.1));
          break;
        case 'KeyM':
          event.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          event.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlayPause,
    seekTo,
    currentTime,
    duration,
    changeVolume,
    volume,
    toggleMute,
    toggleFullscreen,
  ]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Mouse movement for controls
  const handleMouseMove = () => {
    showControlsTemporarily();
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePercentage = volume * 100;

  return (
    <div
      className={`video-player ${isFullscreen ? 'fullscreen' : ''} ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={streamUrl}
        autoPlay={autoPlay}
        muted={muted}
        onPlay={handlePlay}
        onPause={handlePause}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onLoadStart={handleLoadStart}
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleError}
        onEnded={handleEnded}
        className="video-element"
        preload="metadata"
      />

      {loading && (
        <div className="video-loading">
          <div className="loading-spinner"></div>
        </div>
      )}

      {error && (
        <div className="video-error">
          <div className="error-content">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>{error}</p>
          </div>
        </div>
      )}

      {controls && (
        <div className={`video-controls ${showControls ? 'visible' : ''}`}>
          <div className="controls-overlay">
            {/* Progress Bar */}
            <div className="progress-container">
              <div className="progress-bar" onClick={handleProgressClick}>
                <div
                  className="progress-fill"
                  style={{ width: `${progressPercentage}%` }}
                />
                <div
                  className="progress-handle"
                  style={{ left: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Control Buttons */}
            <div className="controls-bottom">
              <div className="controls-left">
                <button
                  className="control-button play-pause"
                  onClick={togglePlayPause}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  ) : (
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  )}
                </button>

                <div className="volume-container">
                  <button
                    className="control-button volume"
                    onClick={toggleMute}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted || volume === 0 ? (
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
                        <line x1="23" y1="9" x2="17" y2="15" />
                        <line x1="17" y1="9" x2="23" y2="15" />
                      </svg>
                    ) : (
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                      </svg>
                    )}
                  </button>
                  <div className="volume-bar" onClick={handleVolumeClick}>
                    <div
                      className="volume-fill"
                      style={{ width: `${isMuted ? 0 : volumePercentage}%` }}
                    />
                  </div>
                </div>

                <div className="time-display">
                  <span>{formatTime(currentTime)}</span>
                  <span>/</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="controls-right">
                <button
                  className="control-button fullscreen"
                  onClick={toggleFullscreen}
                  aria-label={
                    isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'
                  }
                >
                  {isFullscreen ? (
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
                    </svg>
                  ) : (
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
