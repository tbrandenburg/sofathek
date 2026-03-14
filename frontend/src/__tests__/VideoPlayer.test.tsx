import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VideoPlayer } from '../components/VideoPlayer/VideoPlayer';
import { Video } from '../types';

vi.mock('../services/api', () => ({
  getVideoStreamUrl: vi.fn((filename) => (filename ? `/stream/${filename}` : null))
}));

describe('VideoPlayer Component - Malformed Data Handling', () => {
  test('should not crash when video.file is undefined', () => {
    const malformedVideo = {
      id: 'test-video',
      file: undefined,
      metadata: {
        title: 'Test Video',
        width: 1920,
        height: 1080
      },
      viewCount: 0
    } as unknown as Video;

    expect(() => render(<VideoPlayer video={malformedVideo} />)).not.toThrow();
  });

  test('should not crash when video.file.name is missing', () => {
    const malformedVideo = {
      id: 'test-video',
      file: {
        name: undefined,
        size: 1024000,
        path: '/videos/test.mp4',
        extension: 'mp4',
        lastModified: new Date()
      },
      metadata: {
        title: 'Test Video',
        width: 1920,
        height: 1080
      },
      viewCount: 0
    } as unknown as Video;

    expect(() => render(<VideoPlayer video={malformedVideo} />)).not.toThrow();
  });

  test('should hide download link when file.name is absent', () => {
    const malformedVideo = {
      id: 'test-video',
      file: {
        name: undefined,
        size: 1024000,
        path: '/videos/test.mp4',
        extension: 'mp4',
        lastModified: new Date()
      },
      metadata: {
        title: 'Test Video',
        width: 1920,
        height: 1080
      },
      viewCount: 0
    } as unknown as Video;

    render(<VideoPlayer video={malformedVideo} />);

    const downloadLink = screen.queryByText('Download the video');
    expect(downloadLink).toBeNull();
  });

  test('should render safely with fully valid video', () => {
    const validVideo: Video = {
      id: 'test-video',
      file: {
        name: 'test-video.mp4',
        size: 1024000,
        path: '/videos/test-video.mp4',
        extension: 'mp4',
        lastModified: new Date()
      },
      metadata: {
        title: 'Test Video',
        duration: 120,
        width: 1920,
        height: 1080
      },
      viewCount: 5
    };

    expect(() => render(<VideoPlayer video={validVideo} />)).not.toThrow();

    const title = screen.getByText('Test Video');
    expect(title).toBeDefined();
  });
});
