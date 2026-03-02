import React from 'react';
import { VideoCardProps } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { formatDuration, formatFileSize, getVideoThumbnailUrl } from '../../services/api';

export function VideoCard({ 
  video, 
  onClick, 
  showMetadata = true, 
  className = '' 
}: VideoCardProps) {
  const thumbnailUrl = getVideoThumbnailUrl(video);
  
  const handleClick = () => {
    if (onClick) {
      onClick(video);
    }
  };

  return (
    <Card 
      className={`video-card cursor-pointer hover-card ${className}`}
      onClick={handleClick}
      data-testid="video-card"
    >
      {/* Video Thumbnail */}
      <div className="video-thumbnail" data-testid="video-thumbnail">
        {thumbnailUrl ? (
          <img 
            src={thumbnailUrl} 
            alt={video.metadata.title}
            className="video-image"
            onError={(e) => {
              // Fallback to placeholder if thumbnail fails to load
              const img = e.target as any;
              img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNDQgNzJMMTc2IDkwTDE0NCAxMDhWNzJaIiBmaWxsPSIjOUI5QkExIi8+Cjwvc3ZnPg==';
            }}
          />
        ) : (
          <div className="video-placeholder">
            <div className="play-icon">▶</div>
          </div>
        )}
        
        {/* Duration overlay */}
        {video.metadata.duration && (
          <div className="duration-overlay">
            {formatDuration(video.metadata.duration)}
          </div>
        )}
      </div>

      {/* Video Information */}
      <CardHeader>
        <CardTitle className="video-title" data-testid="video-title">
          {video.metadata.title}
        </CardTitle>
        
        {showMetadata && (
          <CardDescription className="video-metadata" data-testid="video-metadata">
            <div className="metadata-row">
              <span>File: {video.file.name}</span>
            </div>
            <div className="metadata-row">
              <span>Size: {formatFileSize(video.file.size)}</span>
              {video.metadata.width && video.metadata.height && (
                <span> • {video.metadata.width}×{video.metadata.height}</span>
              )}
            </div>
            {video.lastViewed && (
              <div className="metadata-row">
                <span>Last viewed: {video.lastViewed.toString().split('T')[0]}</span>
              </div>
            )}
          </CardDescription>
        )}
      </CardHeader>
    </Card>
  );
}