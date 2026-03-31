import React from 'react';
import { VideoGridProps } from '../../types';
import { VideoCard } from '../VideoCard/VideoCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { getUserFriendlyErrorMessage } from '../../lib/error';

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
          {/* Enhanced loading with shadcn/ui Skeleton components */}
          <div className="video-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="video-card">
                <Skeleton className="w-full h-45 rounded-lg mb-4" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2 mb-1" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`video-grid-container ${className}`}>
        <div className="error-state">
          {/* Enhanced error with shadcn/ui Alert component */}
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription data-testid="error-message">
              Error loading videos: {getUserFriendlyErrorMessage(error)}
            </AlertDescription>
          </Alert>
          <Button 
            variant="outline" 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onClick={() => (window as any).location.reload()}
            className="mt-4"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
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

  // Group videos by channel; videos without channel go to "Other" (always last)
  const groupedVideos = videos.reduce<Record<string, typeof videos>>((acc, video) => {
    const channel = video.metadata.channel || 'Other';
    if (!acc[channel]) {
      acc[channel] = [];
    }
    acc[channel].push(video);
    return acc;
  }, {});

  // Sort channels alphabetically; "Other" always last
  const sortedChannels = Object.keys(groupedVideos).sort((a, b) => {
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className={`video-grid-container ${className}`}>
      <div className="video-stats">
        <p>{videos.length} video{videos.length !== 1 ? 's' : ''} available</p>
      </div>
      
      {sortedChannels.map((channel) => (
        <div key={channel} className="video-channel-group">
          <h3 className="video-channel-title">{channel}</h3>
          <div className="video-grid">
            {groupedVideos[channel].map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onClick={onVideoSelect}
                showMetadata={true}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}