import React, { useRef, useEffect, useState } from 'react';
import { VideoPlayerProps } from '../../types';
import { getVideoStreamUrl } from '../../services/api';

export function VideoPlayer({
  video,
  autoplay = false,
  controls = true,
  onEnded,
  onError,
  className = ''
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Effect to handle autoplay
  useEffect(() => {
    if (autoplay && videoRef.current) {
      videoRef.current.play().catch((error) => {
        console.warn('Autoplay prevented:', error);
        // Autoplay was prevented, which is expected behavior
      });
    }
  }, [autoplay, video]);

  // Handle video loading
  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(null);
  };

  const handleLoadedData = () => {
    setIsLoading(false);
  };

  const handleError = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const videoElement = event.currentTarget;
    const error = videoElement.error;
    let errorMessage = 'Failed to load video';
    
    if (error) {
      switch (error.code) {
        case error.MEDIA_ERR_ABORTED:
          errorMessage = 'Video loading was aborted';
          break;
        case error.MEDIA_ERR_NETWORK:
          errorMessage = 'Network error while loading video';
          break;
        case error.MEDIA_ERR_DECODE:
          errorMessage = 'Video format is not supported';
          break;
        case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'Video source is not supported';
          break;
        default:
          errorMessage = 'Unknown video error';
      }
    }

    setHasError(errorMessage);
    setIsLoading(false);
    onError?.(errorMessage);
  };

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    onEnded?.();
  };

  // Get streaming URL for the video
  const streamingUrl = getVideoStreamUrl(video.file.name);

  return (
    <div className={`video-player ${className}`}>
      <div className="video-header">
        <h2 className="video-player-title">{video.metadata.title}</h2>
        <div className="video-info">
          <span className="video-resolution">{video.metadata.width}x{video.metadata.height}</span>
          <span className="video-duration">{video.metadata.duration ? `${Math.floor(video.metadata.duration / 60)}:${(video.metadata.duration % 60).toString().padStart(2, '0')}` : 'Unknown'}</span>
        </div>
      </div>

      <div className="video-container">
        {isLoading && (
          <div className="video-loading">
            <div className="loading-spinner"></div>
            <p>Loading video...</p>
          </div>
        )}

        {hasError && (
          <div className="video-error">
            <div className="error-icon">⚠️</div>
            <p>{hasError}</p>
            <button 
              className="button retry-button"
              onClick={() => {
                setHasError(null);
                setIsLoading(true);
                if (videoRef.current) {
                  videoRef.current.load();
                }
              }}
            >
              Retry
            </button>
          </div>
        )}

        <video
          ref={videoRef}
          src={streamingUrl}
          controls={controls}
          autoPlay={autoplay}
          onLoadStart={handleLoadStart}
          onLoadedData={handleLoadedData}
          onError={handleError}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          className="video-element"
          style={{ display: hasError ? 'none' : 'block' }}
        >
          <p>
            Your browser does not support the video tag. 
            <a href={streamingUrl} download>Download the video</a> instead.
          </p>
        </video>

        {!hasError && !isLoading && (
          <div className="video-overlay">
            {!isPlaying && (
              <button
                className="play-overlay-button"
                onClick={() => videoRef.current?.play()}
                aria-label="Play video"
              >
                <span className="play-icon">▶️</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="video-metadata">
        <div className="metadata-item">
          <span className="metadata-label">File Size:</span>
          <span className="metadata-value">{(video.file.size / (1024 * 1024)).toFixed(1)} MB</span>
        </div>
        <div className="metadata-item">
          <span className="metadata-label">Format:</span>
          <span className="metadata-value">{video.metadata.format || video.file.extension.toUpperCase()}</span>
        </div>
        <div className="metadata-item">
          <span className="metadata-label">Last Modified:</span>
          <span className="metadata-value">{new Date(video.file.lastModified).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}