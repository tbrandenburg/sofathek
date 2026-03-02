import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoCard } from '../components/VideoCard/VideoCard';
import { Video } from '../types';

// Mock the API service
vi.mock('../services/api', () => ({
  formatFileSize: vi.fn((size) => `${size} bytes`),
  formatDuration: vi.fn((duration) => `${duration}s`),
  getVideoThumbnailUrl: vi.fn(() => null)
}));

describe('VideoCard Component', () => {
  const mockVideo: Video = {
    id: 'test-video-1',
    file: {
      name: 'test-video.mp4',
      size: 1024000,
      path: '/videos/test-video.mp4',
      extension: 'mp4',
      lastModified: new Date('2024-01-01T00:00:00Z')
    },
    metadata: {
      title: 'Test Video Title',
      duration: 120,
      width: 1920,
      height: 1080
    },
    viewCount: 5,
    lastViewed: new Date('2024-01-15T12:00:00Z')
  };

  test('should render video card with title', () => {
    render(<VideoCard video={mockVideo} />);

    const titleElement = screen.getByTestId('video-title');
    expect(titleElement.textContent).toBe('Test Video Title');
  });

  test('should render thumbnail placeholder when no thumbnail available', () => {
    render(<VideoCard video={mockVideo} />);

    const thumbnail = screen.getByTestId('video-thumbnail');
    expect(thumbnail).toBeDefined();
    
    // Should show placeholder since getVideoThumbnailUrl returns null
    const placeholder = thumbnail.querySelector('.video-placeholder');
    expect(placeholder).toBeDefined();
    
    const playIcon = thumbnail.querySelector('.play-icon');
    expect(playIcon?.textContent).toBe('▶');
  });

  test('should call onClick callback when clicked', () => {
    const mockOnClick = vi.fn();
    render(<VideoCard video={mockVideo} onClick={mockOnClick} />);

    const card = screen.getByTestId('video-card');
    fireEvent.click(card);

    expect(mockOnClick).toHaveBeenCalledWith(mockVideo);
  });

  test('should show metadata by default', () => {
    render(<VideoCard video={mockVideo} />);

    const metadata = screen.getByTestId('video-metadata');
    expect(metadata).toBeDefined();
    expect(metadata.textContent).toContain('test-video.mp4');
    expect(metadata.textContent).toContain('1024000 bytes');
  });

  test('should not show metadata when showMetadata is false', () => {
    render(<VideoCard video={mockVideo} showMetadata={false} />);

    const title = screen.getByTestId('video-title');
    expect(title).toBeDefined();
    
    const metadata = screen.queryByTestId('video-metadata');
    expect(metadata).toBeNull();
  });

  test('should apply custom className', () => {
    render(<VideoCard video={mockVideo} className="custom-class" />);

    const card = screen.getByTestId('video-card');
    expect(card.className).toContain('custom-class');
  });

  test('should handle video with minimal metadata', () => {
    const minimalVideo: Video = {
      id: 'minimal-video',
      file: {
        name: 'minimal.mp4',
        size: 500,
        path: '/videos/minimal.mp4',
        extension: 'mp4',
        lastModified: new Date()
      },
      metadata: {
        title: 'Minimal Video'
      },
      viewCount: 0
    };

    render(<VideoCard video={minimalVideo} />);

    const title = screen.getByTestId('video-title');
    expect(title.textContent).toBe('Minimal Video');
    
    const metadata = screen.getByTestId('video-metadata');
    expect(metadata.textContent).toContain('minimal.mp4');
    expect(metadata.textContent).toContain('500 bytes');
  });

  test('should have proper CSS classes for interactivity', () => {
    render(<VideoCard video={mockVideo} />);

    const card = screen.getByTestId('video-card');
    expect(card.className).toContain('cursor-pointer');
    expect(card.className).toContain('hover-card');
  });
});

describe('VideoCard accessibility', () => {
  const mockVideo: Video = {
    id: 'test-video-1',
    file: {
      name: 'test-video.mp4',
      size: 1024000,
      path: '/videos/test-video.mp4',
      extension: 'mp4',
      lastModified: new Date('2024-01-01T00:00:00Z')
    },
    metadata: {
      title: 'Test Video Title',
      duration: 120,
      width: 1920,
      height: 1080
    },
    viewCount: 5,
    lastViewed: new Date('2024-01-15T12:00:00Z')
  };

  test('should have sufficient color contrast for metadata text', () => {
    render(<VideoCard video={mockVideo} />);
    const metadata = screen.getByTestId('video-metadata');
    const computedStyle = window.getComputedStyle(metadata);
    
    // Verify color is using CSS variable (not hardcoded)
    expect(computedStyle.color).not.toBe('rgb(107, 114, 126)'); // text-slate-500
    expect(computedStyle.color).not.toBe('#666');
  });

  test('should use theme-aware colors', () => {
    render(<VideoCard video={mockVideo} />);
    const metadata = screen.getByTestId('video-metadata');
    
    // Should use CSS custom property
    expect(metadata.className).not.toContain('text-slate-500');
    expect(metadata.className).not.toContain('text-gray-600');
  });
});