import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Video } from '../types';
import './VideoCard.css';

interface VideoCardProps {
  video: Video;
  onClick?: (video: Video) => void;
  showMetadata?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  onClick,
  showMetadata = true,
  size = 'medium',
  className = '',
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick(video);
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const thumbnailUrl = video.thumbnail || `/api/videos/${video.id}/thumbnail`;
  const videoUrl = `/video/${video.id}`;

  const cardContent = (
    <div className={`video-card ${size} ${className}`} onClick={handleClick}>
      <div className="video-card-thumbnail">
        {!imageError ? (
          <>
            <img
              src={thumbnailUrl}
              alt={video.title}
              className={`thumbnail-image ${imageLoaded ? 'loaded' : ''}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
            {!imageLoaded && (
              <div className="thumbnail-loading">
                <div className="loading-spinner"></div>
              </div>
            )}
          </>
        ) : (
          <div className="thumbnail-fallback">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </div>
        )}

        {video.duration && (
          <div className="duration-badge">{formatDuration(video.duration)}</div>
        )}

        <div className="play-overlay">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        </div>
      </div>

      {showMetadata && (
        <div className="video-card-content">
          <h3 className="video-title" title={video.title}>
            {video.title}
          </h3>

          <div className="video-metadata">
            {video.category && (
              <span className="video-category">{video.category}</span>
            )}
            {video.dateAdded && (
              <span className="video-date">{formatDate(video.dateAdded)}</span>
            )}
            {video.fileSize && (
              <span className="video-size">
                {formatFileSize(video.fileSize)}
              </span>
            )}
          </div>

          {video.description && (
            <p className="video-description" title={video.description}>
              {video.description}
            </p>
          )}
        </div>
      )}
    </div>
  );

  return onClick ? (
    cardContent
  ) : (
    <Link to={videoUrl} className="video-card-link">
      {cardContent}
    </Link>
  );
};

export default VideoCard;
