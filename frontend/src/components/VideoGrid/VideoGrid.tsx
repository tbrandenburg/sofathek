import React from 'react';
import { VideoGridProps } from '../../types';
import { VideoCard } from '../VideoCard/VideoCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { getUserFriendlyErrorMessage } from '../../lib/error';
import { getGridColsClass } from '../../lib/utils';

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
                <Skeleton className="w-full aspect-video rounded-lg mb-4" />
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

  // Group videos by channel; videos without channel go into a separate "uncategorised" bucket
  // Using a Map + separate array avoids sentinel-string collision if a real channel is named "Other"
  const channelMap = new Map<string, typeof videos>();
  const uncategorised: typeof videos = [];

  for (const video of videos) {
    const ch = video.metadata.channel?.trim();
    if (ch) {
      const bucket = channelMap.get(ch) ?? [];
      bucket.push(video);
      channelMap.set(ch, bucket);
    } else {
      uncategorised.push(video);
    }
  }

  // Sort named channels alphabetically; "Other" bucket always last
  const sortedChannels = Array.from(channelMap.keys()).sort((a, b) => a.localeCompare(b));
  const groupCount = sortedChannels.length + (uncategorised.length > 0 ? 1 : 0);
  // Only show section headers when there is more than one group
  const showHeaders = groupCount > 1;
  const MAX_GRID_COLUMNS = 4;

  const renderGroup = (key: string, label: string, group: typeof videos) => (
    <div key={key} className="video-channel-group">
      {showHeaders && <h3 className="video-channel-title">{label}</h3>}
      <div
        className={`video-grid ${getGridColsClass(group.length)}`}
        style={
          {
            '--video-grid-columns': Math.min(group.length, MAX_GRID_COLUMNS)
          } as React.CSSProperties
        }
      >
        {group.map((video) => (
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

  return (
    <div className={`video-grid-container ${className}`}>
      {sortedChannels.map((ch) => renderGroup(ch, ch, channelMap.get(ch)!))}
      {uncategorised.length > 0 && renderGroup('__other__', 'Other', uncategorised)}
    </div>
  );
}
