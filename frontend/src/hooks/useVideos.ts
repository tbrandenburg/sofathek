import { useState, useEffect, useCallback } from 'react';
import { getVideos, getVideoById } from '../services/api';
import { Video, VideoScanResult } from '../types';

/**
 * Hook for fetching the complete video library
 */
export function useVideos() {
  const [data, setData] = useState<VideoScanResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await getVideos();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch videos'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchVideos,
  };
}

/**
 * Hook for fetching a specific video by ID
 */
export function useVideo(id: string) {
  const [data, setData] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(!!id);
  const [error, setError] = useState<Error | null>(null);

  const fetchVideo = useCallback(async () => {
    if (!id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const video = await getVideoById(id);
      setData(video);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch video'));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchVideo();
    } else {
      setData(null);
      setIsLoading(false);
      setError(null);
    }
  }, [id, fetchVideo]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchVideo,
  };
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