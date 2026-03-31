import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VideoGrid } from '../components/VideoGrid/VideoGrid';
import { Video } from '../types';

describe('VideoGrid Component', () => {
  const mockVideos: Video[] = [
    {
      id: 'video-1',
      file: {
        name: 'video1.mp4',
        size: 1024,
        path: '/videos/video1.mp4',
        extension: 'mp4',
        lastModified: new Date()
      },
      metadata: { title: 'Video 1' },
      viewCount: 0
    },
    {
      id: 'video-2',
      file: {
        name: 'video2.mp4',
        size: 2048,
        path: '/videos/video2.mp4',
        extension: 'mp4',
        lastModified: new Date()
      },
      metadata: { title: 'Video 2' },
      viewCount: 0
    }
  ];

  test('should render loading state', () => {
    render(<VideoGrid videos={[]} isLoading={true} />);

    // Check that the loading state container exists
    const loadingContainer = document.querySelector('.loading-state');
    expect(loadingContainer).toBeDefined();
    
    // Check that skeleton elements are rendered (should have 6 skeleton cards)
    const skeletonCards = document.querySelectorAll('.video-card');
    expect(skeletonCards.length).toBe(6);
    
    // Check that actual skeleton elements with animate-pulse class are present
    const skeletonElements = document.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  test('should render error state with message', () => {
    const errorMessage = 'Failed to load videos';
    render(<VideoGrid videos={[]} error={errorMessage} />);

    const errorElement = screen.getByTestId('error-message');
    expect(errorElement.textContent).toContain(errorMessage);
    
    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeDefined();
  });

  test('should render empty state when no videos', () => {
    render(<VideoGrid videos={[]} />);

    const emptyMessage = screen.getByText('No videos found');
    expect(emptyMessage).toBeDefined();
    
    const emptyDescription = screen.getByText('Your video library is empty. Add some videos to get started.');
    expect(emptyDescription).toBeDefined();
  });

  test('should render video cards when videos are provided', () => {
    const mockOnVideoSelect = vi.fn();
    render(
      <VideoGrid 
        videos={mockVideos} 
        onVideoSelect={mockOnVideoSelect} 
      />
    );

    // Should render video cards
    const videoCards = screen.getAllByTestId('video-card');
    expect(videoCards).toHaveLength(2);
  });

  test('should apply custom className', () => {
    render(<VideoGrid videos={mockVideos} className="custom-grid" />);

    const gridContainer = document.querySelector('.video-grid-container');
    expect(gridContainer?.className).toContain('custom-grid');
  });

  test('should handle empty array properly', () => {
    render(<VideoGrid videos={[]} />);

    const emptyMessage = screen.getByText('No videos found');
    expect(emptyMessage).toBeDefined();
  });

  test('should handle undefined videos array', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<VideoGrid videos={undefined as any} />);

    const emptyMessage = screen.getByText('No videos found');
    expect(emptyMessage).toBeDefined();
  });

  test('should group videos by channel name', () => {
    const videosWithChannels: Video[] = [
      {
        id: 'video-1',
        file: { name: 'video1.mp4', size: 1024, path: '/videos/video1.mp4', extension: 'mp4', lastModified: new Date() },
        metadata: { title: 'Video 1', channel: 'ChannelA' },
        viewCount: 0
      },
      {
        id: 'video-2',
        file: { name: 'video2.mp4', size: 2048, path: '/videos/video2.mp4', extension: 'mp4', lastModified: new Date() },
        metadata: { title: 'Video 2', channel: 'ChannelB' },
        viewCount: 0
      },
      {
        id: 'video-3',
        file: { name: 'video3.mp4', size: 3072, path: '/videos/video3.mp4', extension: 'mp4', lastModified: new Date() },
        metadata: { title: 'Video 3', channel: 'ChannelA' },
        viewCount: 0
      }
    ];

    render(<VideoGrid videos={videosWithChannels} />);

    expect(screen.getByText('ChannelA')).toBeDefined();
    expect(screen.getByText('ChannelB')).toBeDefined();
  });

  test('should place videos without channel under "Other"', () => {
    const mixedVideos: Video[] = [
      {
        id: 'video-1',
        file: { name: 'video1.mp4', size: 1024, path: '/videos/video1.mp4', extension: 'mp4', lastModified: new Date() },
        metadata: { title: 'Video 1', channel: 'ChannelA' },
        viewCount: 0
      },
      {
        id: 'video-2',
        file: { name: 'video2.mp4', size: 2048, path: '/videos/video2.mp4', extension: 'mp4', lastModified: new Date() },
        metadata: { title: 'Video 2' },
        viewCount: 0
      }
    ];

    render(<VideoGrid videos={mixedVideos} />);

    expect(screen.getByText('ChannelA')).toBeDefined();
    expect(screen.getByText('Other')).toBeDefined();
  });

  test('should sort channels alphabetically with Other last', () => {
    const multipleChannels: Video[] = [
      {
        id: 'video-1',
        file: { name: 'video1.mp4', size: 1024, path: '/videos/video1.mp4', extension: 'mp4', lastModified: new Date() },
        metadata: { title: 'Video 1', channel: 'ZenChannel' },
        viewCount: 0
      },
      {
        id: 'video-2',
        file: { name: 'video2.mp4', size: 2048, path: '/videos/video2.mp4', extension: 'mp4', lastModified: new Date() },
        metadata: { title: 'Video 2', channel: 'AlphaChannel' },
        viewCount: 0
      },
      {
        id: 'video-3',
        file: { name: 'video3.mp4', size: 3072, path: '/videos/video3.mp4', extension: 'mp4', lastModified: new Date() },
        metadata: { title: 'Video 3' },
        viewCount: 0
      }
    ];

    render(<VideoGrid videos={multipleChannels} />);

    const channelTitles = Array.from(document.querySelectorAll('.video-channel-title')).map(el => el.textContent);
    expect(channelTitles[0]).toBe('AlphaChannel');
    expect(channelTitles[1]).toBe('ZenChannel');
    expect(channelTitles[2]).toBe('Other');
  });

  test('should not show section headers when there is only one group', () => {
    const singleChannelVideos: Video[] = [
      {
        id: 'video-1',
        file: { name: 'video1.mp4', size: 1024, path: '/videos/video1.mp4', extension: 'mp4', lastModified: new Date() },
        metadata: { title: 'Video 1', channel: 'OnlyChannel' },
        viewCount: 0
      },
      {
        id: 'video-2',
        file: { name: 'video2.mp4', size: 2048, path: '/videos/video2.mp4', extension: 'mp4', lastModified: new Date() },
        metadata: { title: 'Video 2', channel: 'OnlyChannel' },
        viewCount: 0
      }
    ];

    render(<VideoGrid videos={singleChannelVideos} />);

    const headers = document.querySelectorAll('.video-channel-title');
    expect(headers.length).toBe(0);
  });

  test('should not merge a real channel named "Other" with uncategorised videos', () => {
    const collisionVideos: Video[] = [
      {
        id: 'video-1',
        file: { name: 'video1.mp4', size: 1024, path: '/videos/video1.mp4', extension: 'mp4', lastModified: new Date() },
        metadata: { title: 'Video 1', channel: 'Other' },
        viewCount: 0
      },
      {
        id: 'video-2',
        file: { name: 'video2.mp4', size: 2048, path: '/videos/video2.mp4', extension: 'mp4', lastModified: new Date() },
        metadata: { title: 'Video 2' },
        viewCount: 0
      }
    ];

    render(<VideoGrid videos={collisionVideos} />);

    // Two groups: named "Other" channel + uncategorised "Other" fallback → two headers both labelled "Other"
    const headers = document.querySelectorAll('.video-channel-title');
    expect(headers.length).toBe(2);
    expect(Array.from(headers).every(h => h.textContent === 'Other')).toBe(true);

    // Both videos must still appear
    const videoCards = screen.getAllByTestId('video-card');
    expect(videoCards).toHaveLength(2);
  });
});