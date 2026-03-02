import React, { useState } from 'react';
import { Video } from './types';
import { VideoGrid } from './components/VideoGrid/VideoGrid';
import { VideoPlayer } from './components/VideoPlayer/VideoPlayer';
import { Layout, ContentContainer, PageHeader } from './components/Layout/Layout';
import { useVideos } from './hooks/useVideos';

function App() {
  const { data: videosResult, isLoading, error } = useVideos();
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  const videos = videosResult?.videos || [];

  // Handle video selection
  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video);
    setIsPlayerOpen(true);
  };

  // Handle closing video player
  const handleClosePlayer = () => {
    setIsPlayerOpen(false);
    setSelectedVideo(null);
  };

  // Handle player errors
  const handlePlayerError = (error: string) => {
    console.error('Video player error:', error);
    // Could show a toast notification here
  };

  return (
    <Layout>
      <ContentContainer>
        <PageHeader 
          title="Video Library" 
          subtitle={`${videos.length} videos available`}
        />
        
        <VideoGrid
          videos={videos}
          isLoading={isLoading}
          error={error?.message || null}
          onVideoSelect={handleVideoSelect}
          className="main-video-grid"
        />
      </ContentContainer>

      {/* Video Player Modal */}
      {isPlayerOpen && selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black bg-opacity-90" 
            onClick={handleClosePlayer} 
          />
          <div className="relative bg-black rounded-lg overflow-hidden max-w-4xl w-full mx-4">
            <button 
              className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 text-2xl font-bold"
              onClick={handleClosePlayer}
              aria-label="Close video player"
            >
              ✕
            </button>
            <VideoPlayer
              video={selectedVideo}
              controls={true}
              onError={handlePlayerError}
              onEnded={() => {
                // Auto-close player when video ends
                setTimeout(() => handleClosePlayer(), 2000);
              }}
              className="w-full"
            />
          </div>
        </div>
      )}
    </Layout>
  );
}

export default App;