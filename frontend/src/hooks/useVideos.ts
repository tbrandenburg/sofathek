import { useQuery } from '@tanstack/react-query';
import { getVideos, getVideoById } from '../services/api';
import { Video, VideoScanResult } from '../types';

/**
 * Hook for fetching the complete video library
 */
export function useVideos() {
  return useQuery<VideoScanResult>({
    queryKey: ['videos'],
    queryFn: getVideos,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook for fetching a specific video by ID
 */
export function useVideo(id: string) {
  return useQuery<Video>({
    queryKey: ['video', id],
    queryFn: () => getVideoById(id),
    enabled: !!id,
    staleTime: 60000,
    retry: 2,
  });
}

/**
 * Hook for video statistics and metadata
 */
export function useVideoStats() {
  const { data: videosResult, isLoading } = useVideos();

  if (isLoading || !videosResult) {
    return {
      totalVideos: 0,
      totalSize: 0,
      totalDuration: 0,
      isLoading: true,
    };
  }

  const videos = videosResult.videos || [];
  const totalVideos = videos.length;
  const totalSize = videos.reduce((sum: number, video: Video) => sum + video.file.size, 0);
  const totalDuration = videos.reduce((sum: number, video: Video) => {
    return sum + (video.metadata.duration || 0);
  }, 0);

  return {
    totalVideos,
    totalSize,
    totalDuration,
    isLoading: false,
  };
}
