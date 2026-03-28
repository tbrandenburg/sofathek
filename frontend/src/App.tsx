import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Video } from './types';
import { VideoGrid } from './components/VideoGrid/VideoGrid';
import { VideoPlayer } from './components/VideoPlayer/VideoPlayer';
import { Layout, ContentContainer, PageHeader } from './components/Layout/Layout';
import { YouTubeDownload } from './components/YouTubeDownload';
import { DownloadQueue } from './components/DownloadQueue';
import { useVideos } from './hooks/useVideos';
import { getDownloadFileUrl, sanitizeFilename } from './services/api';

// Create Query Client outside component to avoid recreation on renders
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 3000, // Consider data fresh for 3 seconds (good for polling)
      gcTime: 5 * 60 * 1000, // Garbage collect after 5 minutes
      retry: 2, // Retry failed requests twice
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
    },
    mutations: {
      retry: 1, // Retry mutations once on failure
    },
  },
});

function App() {
  const { data: videosResult, isLoading, error } = useVideos();
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  const videos = videosResult?.videos ?? [];

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

  const transcriptDownloads = (selectedVideo?.metadata.transcripts ?? [])
    .filter(item => ['en', 'de', 'sv'].includes(item.language.toLowerCase()));

  return (
    <Layout>
      <ContentContainer>
        <PageHeader 
          title="Video Library" 
          subtitle={`${videos.length} videos available`}
        />
        
        {/* YouTube Download Section */}
        <div className="mb-8 space-y-6">
          <YouTubeDownload className="youtube-download-section" />
          <DownloadQueue className="download-queue-section" />
        </div>
        
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
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              {selectedVideo.file?.name && (
                <a
                  href={getDownloadFileUrl(selectedVideo.file.name)}
                  download={sanitizeFilename(selectedVideo.file.name)}
                  className="text-white hover:text-gray-300 text-xl p-2"
                  aria-label="Download video"
                  title="Download video"
                >
                  ↓
                </a>
              )}
              {selectedVideo.metadata.audio && (
                <a
                  href={getDownloadFileUrl(selectedVideo.metadata.audio)}
                  download={sanitizeFilename(selectedVideo.metadata.audio)}
                  className="text-white hover:text-gray-300 p-2"
                  aria-label="Download audio"
                  title="Download audio"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                    <path d="M15 3v11.55a4 4 0 1 1-2-3.46V7h8V3h-6z" />
                  </svg>
                </a>
              )}
              {transcriptDownloads.map((transcript) => {
                const language = transcript.language.toLowerCase();
                return (
                  <a
                    key={transcript.file}
                    href={getDownloadFileUrl(transcript.file)}
                    download={sanitizeFilename(transcript.file)}
                    className="text-white hover:text-gray-300 text-sm font-semibold px-2 py-2"
                    aria-label={`Download ${language.toUpperCase()} transcript`}
                    title={`Download ${language.toUpperCase()} transcript`}
                  >
                    {language.toUpperCase()}
                  </a>
                );
              })}
              <button 
                className="text-white hover:text-gray-300 text-2xl font-bold"
                onClick={handleClosePlayer}
                aria-label="Close video player"
              >
                ✕
              </button>
            </div>
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

// Wrap the App with QueryClientProvider
function AppWithProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

export default AppWithProviders;
