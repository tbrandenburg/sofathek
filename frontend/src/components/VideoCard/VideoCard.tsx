import React from 'react';
import { VideoCardProps } from '../../types';
import { Card, CardHeader, CardTitle } from '../ui/card';
import { getVideoThumbnailUrl } from '../../services/api';

export function VideoCard({ 
  video, 
  onClick, 
  showMetadata = true, 
  className = '' 
}: VideoCardProps) {
  void showMetadata;
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
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const img = e.target as any;
              img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNDQgNzJMMTc2IDkwTDE0NCAxMDhWNzJaIiBmaWxsPSIjOUI5QkExIi8+Cjwvc3ZnPg==';
            }}
          />
        ) : (
          <div className="video-placeholder">
            <div className="play-icon">▶</div>
          </div>
        )}
        
      </div>

      {/* Video Information */}
      <CardHeader>
        <CardTitle className="video-title" data-testid="video-title">
          {video.metadata.title}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
