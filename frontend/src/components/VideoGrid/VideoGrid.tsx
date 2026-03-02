import React from 'react';
import { VideoGridProps } from '../../types';
import { VideoCard } from '../VideoCard/VideoCard';

export function VideoGrid({ 
  videos, 
  isLoading = false, 
  error = null, 
  onVideoSelect, 
  className = '' 
}: VideoGridProps) {
  
  if (isLoading) {
    return (
      <div className={`video-grid-container ${className}`}>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading videos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`video-grid-container ${className}`}>
        <div className="error-state">
          <p data-testid="error-message">Error loading videos: {error}</p>
          <button className="button retry-button" onClick={() => (window as any).location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className={`video-grid-container ${className}`}>
        <div className="empty-state">
          <div className="empty-icon">📽️</div>
          <h2>No videos found</h2>
          <p>Your video library is empty. Add some videos to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`video-grid-container ${className}`}>
      <div className="video-stats">
        <p>{videos.length} video{videos.length !== 1 ? 's' : ''} available</p>
      </div>
      
      <div className="video-grid">
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            onClick={onVideoSelect}
            showMetadata={true}
          />
        ))}
      </div>
    </div>
  );
}