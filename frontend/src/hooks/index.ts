/**
 * Custom React Hooks for Sofathek
 * State management and API interaction hooks
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import {
  Video,
  VideoLibrary,
  LibraryFilters,
  DownloadJob,
  DownloadQueue,
  PlayerState,
} from '../types';

// Video Library Hook
export function useVideoLibrary(initialFilters: LibraryFilters = {}) {
  const [library, setLibrary] = useState<VideoLibrary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LibraryFilters>(initialFilters);

  const loadVideos = useCallback(
    async (newFilters?: LibraryFilters) => {
      setLoading(true);
      setError(null);

      try {
        const filtersToUse = newFilters || filters;
        const result = await api.getVideos(filtersToUse);
        setLibrary(result);
        if (newFilters) {
          setFilters(newFilters);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load videos');
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  const refreshLibrary = useCallback(() => {
    loadVideos();
  }, [loadVideos]);

  const updateFilters = useCallback(
    (newFilters: Partial<LibraryFilters>) => {
      const updatedFilters = { ...filters, ...newFilters };
      loadVideos(updatedFilters);
    },
    [filters, loadVideos]
  );

  const scanLibrary = useCallback(
    async (category?: string) => {
      setLoading(true);
      setError(null);

      try {
        await api.scanLibrary(category);
        // Refresh the library after scanning
        await loadVideos();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to scan library');
      } finally {
        setLoading(false);
      }
    },
    [loadVideos]
  );

  useEffect(() => {
    loadVideos();
  }, []);

  return {
    library,
    loading,
    error,
    filters,
    refreshLibrary,
    updateFilters,
    scanLibrary,
  };
}

// Individual Video Hook
export function useVideo(id: string | null) {
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setVideo(null);
      return;
    }

    setLoading(true);
    setError(null);

    api
      .getVideo(id)
      .then(setVideo)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  return { video, loading, error };
}

// Download Queue Hook
export function useDownloadQueue() {
  const [queue, setQueue] = useState<DownloadQueue | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await api.getDownloadQueue();
      setQueue(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load download queue'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const queueDownload = useCallback(
    async (url: string, quality: string, category?: string) => {
      try {
        setError(null);
        await api.queueDownload({ url, quality: quality as any, category });
        await loadQueue(); // Refresh queue
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to queue download'
        );
        return false;
      }
    },
    [loadQueue]
  );

  const cancelDownload = useCallback(
    async (jobId: string) => {
      try {
        setError(null);
        await api.cancelDownload(jobId);
        await loadQueue(); // Refresh queue
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to cancel download'
        );
        return false;
      }
    },
    [loadQueue]
  );

  const clearCompleted = useCallback(async () => {
    try {
      setError(null);
      await api.clearCompletedDownloads();
      await loadQueue(); // Refresh queue
      return true;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to clear completed downloads'
      );
      return false;
    }
  }, [loadQueue]);

  useEffect(() => {
    loadQueue();

    // Auto-refresh every 5 seconds
    const interval = setInterval(loadQueue, 5000);
    return () => clearInterval(interval);
  }, [loadQueue]);

  return {
    queue,
    loading,
    error,
    queueDownload,
    cancelDownload,
    clearCompleted,
    refreshQueue: loadQueue,
  };
}

// Video Player Hook
export function useVideoPlayer(videoElement?: HTMLVideoElement | null) {
  const [state, setState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    muted: false,
    fullscreen: false,
    playbackRate: 1,
    buffered: 0,
    loading: false,
  });

  const updateState = useCallback((updates: Partial<PlayerState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const play = useCallback(() => {
    if (videoElement) {
      videoElement.play();
      updateState({ isPlaying: true });
    }
  }, [videoElement, updateState]);

  const pause = useCallback(() => {
    if (videoElement) {
      videoElement.pause();
      updateState({ isPlaying: false });
    }
  }, [videoElement, updateState]);

  const seek = useCallback(
    (time: number) => {
      if (videoElement) {
        videoElement.currentTime = time;
        updateState({ currentTime: time });
      }
    },
    [videoElement, updateState]
  );

  const setVolume = useCallback(
    (volume: number) => {
      if (videoElement) {
        videoElement.volume = Math.max(0, Math.min(1, volume));
        updateState({ volume: videoElement.volume, muted: videoElement.muted });
      }
    },
    [videoElement, updateState]
  );

  const toggleMute = useCallback(() => {
    if (videoElement) {
      videoElement.muted = !videoElement.muted;
      updateState({ muted: videoElement.muted });
    }
  }, [videoElement, updateState]);

  const toggleFullscreen = useCallback(async () => {
    if (!videoElement) return;

    try {
      if (!document.fullscreenElement) {
        await videoElement.requestFullscreen();
        updateState({ fullscreen: true });
      } else {
        await document.exitFullscreen();
        updateState({ fullscreen: false });
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
    }
  }, [videoElement, updateState]);

  const setPlaybackRate = useCallback(
    (rate: number) => {
      if (videoElement) {
        videoElement.playbackRate = rate;
        updateState({ playbackRate: rate });
      }
    },
    [videoElement, updateState]
  );

  // Set up event listeners when video element changes
  useEffect(() => {
    if (!videoElement) return;

    const handleTimeUpdate = () => {
      const buffered =
        videoElement.buffered.length > 0
          ? videoElement.buffered.end(videoElement.buffered.length - 1)
          : 0;

      updateState({
        currentTime: videoElement.currentTime,
        buffered: buffered / videoElement.duration || 0,
      });
    };

    const handleDurationChange = () => {
      updateState({ duration: videoElement.duration || 0 });
    };

    const handlePlay = () => updateState({ isPlaying: true });
    const handlePause = () => updateState({ isPlaying: false });
    const handleVolumeChange = () =>
      updateState({
        volume: videoElement.volume,
        muted: videoElement.muted,
      });
    const handleWaiting = () => updateState({ loading: true });
    const handleCanPlay = () => updateState({ loading: false });

    // Add event listeners
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('durationchange', handleDurationChange);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('volumechange', handleVolumeChange);
    videoElement.addEventListener('waiting', handleWaiting);
    videoElement.addEventListener('canplay', handleCanPlay);

    // Cleanup
    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('durationchange', handleDurationChange);
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('volumechange', handleVolumeChange);
      videoElement.removeEventListener('waiting', handleWaiting);
      videoElement.removeEventListener('canplay', handleCanPlay);
    };
  }, [videoElement, updateState]);

  return {
    state,
    controls: {
      play,
      pause,
      seek,
      setVolume,
      toggleMute,
      toggleFullscreen,
      setPlaybackRate,
    },
  };
}

// Categories Hook
export function useCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getVideoCategories()
      .then(result => setCategories(result.categories))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { categories, loading, error };
}

// Local Storage Hook
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
}

// Debounced Value Hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Polling Hook
export function usePolling(
  callback: () => Promise<void> | void,
  interval: number,
  dependencies: any[] = []
) {
  const callbackRef = useRef(callback);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const tick = async () => {
      try {
        await callbackRef.current();
      } catch (error) {
        console.error('Polling callback error:', error);
      }
    };

    // Initial call
    tick();

    // Set up interval
    intervalRef.current = setInterval(tick, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [interval, ...dependencies]);

  return () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };
}
