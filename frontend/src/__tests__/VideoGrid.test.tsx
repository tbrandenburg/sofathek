import { describe, test, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { VideoGrid } from '../components/VideoGrid/VideoGrid';
import { getGridColsClass } from '../lib/utils';
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

  test('collapses channel groups above ten videos and toggles them accessibly', () => {
    const videos = Array.from({ length: 11 }, (_, index) => ({
      id: `large-${index}`,
      file: { name: `large-${index}.mp4`, size: 1, path: `/videos/${index}.mp4`, extension: 'mp4', lastModified: new Date() },
      metadata: { title: `Large video ${index}`, channel: 'Large Channel', channelId: 'UC123' },
      viewCount: 0
    } satisfies Video));
    render(<VideoGrid videos={videos} />);
    const group = screen.getByRole('button', { name: /Large Channel \(11 videos\)/ });
    expect(group.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Large video 0')).toBeNull();
    fireEvent.click(group);
    expect(group.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Large video 0')).toBeDefined();
    fireEvent.click(group);
    expect(group.getAttribute('aria-expanded')).toBe('false');
  });

  test('keeps ten channel videos visible', () => {
    const videos = Array.from({ length: 10 }, (_, index) => ({
      id: `small-${index}`,
      file: { name: `small-${index}.mp4`, size: 1, path: `/videos/${index}.mp4`, extension: 'mp4', lastModified: new Date() },
      metadata: { title: `Small video ${index}`, channel: 'Small Channel' },
      viewCount: 0
    } satisfies Video));
    render(<VideoGrid videos={videos} />);
    expect(screen.getByText('Small video 0')).toBeDefined();
    expect(screen.queryByRole('button', { name: /Small Channel \(10 videos\)/ })).toBeNull();
  });

  test('asks for confirmation and invokes the delete action only when confirmed', () => {
    const onDelete = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<VideoGrid videos={mockVideos.slice(0, 1)} onVideoDelete={onDelete} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete video Video 1' }));
    expect(confirm).toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Delete video Video 1' }));
    expect(onDelete).toHaveBeenCalledWith(mockVideos[0]);
    confirm.mockRestore();
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

  test('should not render video-stats div (count is in PageHeader)', () => {
    render(<VideoGrid videos={mockVideos} />);

    // video-stats div should not exist - count is handled by PageHeader in App.tsx
    const statsDiv = document.querySelector('.video-stats');
    expect(statsDiv).toBeNull();
  });

  test('should apply correct grid columns based on group size', () => {
    const videosWithSingleChannel: Video[] = [
      {
        id: 'video-1',
        file: { name: 'video1.mp4', size: 1024, path: '/videos/video1.mp4', extension: 'mp4', lastModified: new Date() },
        metadata: { title: 'Video 1', channel: 'SingleChannel' },
        viewCount: 0
      }
    ];

    render(<VideoGrid videos={videosWithSingleChannel} />);

    // Single video should have grid-cols-1
    const grid = document.querySelector('.video-grid');
    expect(grid?.className).toContain('grid-cols-1');
  });
});

describe('getGridColsClass', () => {
  test.each([
    [1, 'grid-cols-1'],
    [2, 'grid-cols-2'],
    [3, 'grid-cols-3'],
    [4, 'grid-cols-4'],
    [10, 'grid-cols-4'], // capped at 4 for large groups
  ])('count %i returns %s', (count, expected) => {
    expect(getGridColsClass(count)).toBe(expected);
  });
});
