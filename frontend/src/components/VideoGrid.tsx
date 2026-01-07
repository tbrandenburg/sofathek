import React from 'react';
import { Video } from '../types';
import VideoCard from './VideoCard';
import './VideoGrid.css';

interface VideoGridProps {
  videos: Video[];
  loading?: boolean;
  error?: string;
  onVideoClick?: (video: Video) => void;
  cardSize?: 'small' | 'medium' | 'large';
  showMetadata?: boolean;
  className?: string;
  emptyMessage?: string;
  columns?: number;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  videos,
  loading = false,
  error,
  onVideoClick,
  cardSize = 'medium',
  showMetadata = true,
  className = '',
  emptyMessage = 'No videos found',
  columns,
}) => {
  if (error) {
    return (
      <div className={`video-grid-error ${className}`}>
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
          <h3>Error loading videos</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`video-grid-loading ${className}`}>
        <div
          className={`loading-grid ${columns ? 'fixed-columns' : ''}`}
          data-columns={columns}
        >
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="video-card-skeleton">
              <div className="skeleton-thumbnail"></div>
              {showMetadata && (
                <div className="skeleton-content">
                  <div className="skeleton-title"></div>
                  <div className="skeleton-metadata">
                    <div className="skeleton-tag"></div>
                    <div className="skeleton-date"></div>
                  </div>
                  <div className="skeleton-description"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className={`video-grid-empty ${className}`}>
        <div className="empty-content">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <h3>No videos found</h3>
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`video-grid ${className}`}>
      <div
        className={`video-grid-container ${columns ? 'fixed-columns' : ''}`}
        data-columns={columns}
      >
        {videos.map(video => (
          <VideoCard
            key={video.id}
            video={video}
            onClick={onVideoClick}
            size={cardSize}
            showMetadata={showMetadata}
          />
        ))}
      </div>
    </div>
  );
};

export default VideoGrid;
