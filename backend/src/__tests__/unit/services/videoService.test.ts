import path from 'path';

// Mock logger to avoid fs issues during winston initialization
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock fs promises module to match the service's import pattern
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
    stat: jest.fn()
  }
}));

import { VideoService } from '../../../services/videoService';
import { promises as fs } from 'fs';

// Get references to the mocked functions
const mockFs = fs as jest.Mocked<typeof fs>;

describe('VideoService', () => {
  let videoService: VideoService;
  const testVideosDir = '/test/videos';
  const testThumbnailsDir = '/test/thumbnails';

  beforeEach(() => {
    videoService = new VideoService(testVideosDir, testThumbnailsDir);
    jest.clearAllMocks();
  });

  describe('scanVideoDirectory', () => {
    it('should scan directory and return video files', async () => {
      // Mock directory contents
      mockFs.readdir.mockResolvedValue(['video1.mp4', 'video2.avi', 'readme.txt'] as any);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockImplementation((_filePath) => {
        return Promise.resolve({ 
          isDirectory: () => false, 
          isFile: () => true,
          size: 1000000,
          mtime: new Date('2024-01-01')
        } as any);
      });

      const result = await videoService.scanVideoDirectory();

      expect(result.videos).toHaveLength(2);
      expect(result.videos[0]?.file.name).toBe('video1.mp4');
      expect(result.videos[1]?.file.name).toBe('video2.avi');
      expect(result.totalCount).toBe(2);
    });

    it('should handle directory access errors gracefully', async () => {
      mockFs.access.mockRejectedValue(new Error('Permission denied'));
      mockFs.mkdir.mockRejectedValue(new Error('Cannot create directory'));
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

      const result = await videoService.scanVideoDirectory();

      expect(result.videos).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it('should skip directories and non-video files', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(['video1.mp4', 'subfolder', 'image.jpg'] as any);
      mockFs.stat.mockImplementation((_filePath) => {
        const filename = String(_filePath).split('/').pop() || '';
        if (filename === 'subfolder') {
          return Promise.resolve({
            isDirectory: () => true,
            isFile: () => false
          } as any);
        }
        return Promise.resolve({
          isDirectory: () => false,
          isFile: () => true,
          size: 1000000,
          mtime: new Date('2024-01-01')
        } as any);
      });

      const result = await videoService.scanVideoDirectory();

      expect(result.videos).toHaveLength(1);
      expect(result.videos[0]?.file.name).toBe('video1.mp4');
    });

    it('should handle individual file processing errors', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(['video1.mp4', 'corrupted.avi'] as any);
      mockFs.stat.mockImplementation((filePath) => {
        const filename = path.basename(filePath as string);
        if (filename === 'corrupted.avi') {
          throw new Error('File corrupted');
        }
        return Promise.resolve({
          isDirectory: () => false,
          isFile: () => true,
          size: 1000000,
          mtime: new Date('2024-01-01')
        } as any);
      });

      const result = await videoService.scanVideoDirectory();

      expect(result.videos).toHaveLength(1);
      expect(result.videos[0]?.file.name).toBe('video1.mp4');
    });
  });

  describe('validateVideoFile', () => {
    it('should return true for supported video extensions', async () => {
      expect(await videoService.validateVideoFile('video.mp4')).toBe(true);
      expect(await videoService.validateVideoFile('video.avi')).toBe(true);
      expect(await videoService.validateVideoFile('video.mov')).toBe(true);
      expect(await videoService.validateVideoFile('video.mkv')).toBe(true);
    });

    it('should return false for unsupported extensions', async () => {
      expect(await videoService.validateVideoFile('image.jpg')).toBe(false);
      expect(await videoService.validateVideoFile('document.pdf')).toBe(false);
      expect(await videoService.validateVideoFile('archive.zip')).toBe(false);
      expect(await videoService.validateVideoFile('')).toBe(false);
    });
  });

  describe('findThumbnail (case sensitivity)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should find thumbnail with exact case match', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const result = await (videoService as any).findThumbnail('/test/videos/Video.mp4');

      expect(result).toBe('Video.jpg');
      expect(mockFs.access).toHaveBeenCalledWith('/test/videos/Video.jpg');
    });

    it('should find thumbnail with case mismatch (case-insensitive)', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      mockFs.readdir.mockResolvedValue(['video.jpg', 'other.png'] as any);

      const result = await (videoService as any).findThumbnail('/test/videos/Video.mp4');

      expect(result).toBe('video.jpg');
    });

    it('should prefer exact case match over case-insensitive', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const result = await (videoService as any).findThumbnail('/test/videos/Video.mp4');

      expect(result).toBe('Video.jpg');
      expect(mockFs.readdir).not.toHaveBeenCalled();
    });

    it('should handle all caps video name', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      mockFs.readdir.mockResolvedValue(['video.png', 'other.jpg'] as any);

      const result = await (videoService as any).findThumbnail('/test/videos/VIDEO.AVI');

      expect(result).toBe('video.png');
    });

    it('should return null when no thumbnail exists', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      mockFs.readdir.mockResolvedValue(['other.jpg', 'readme.txt'] as any);

      const result = await (videoService as any).findThumbnail('/test/videos/MyVideo.mp4');

      expect(result).toBeNull();
    });

    it('should handle different thumbnail extensions', async () => {
      mockFs.access
        .mockRejectedValueOnce(new Error('ENOENT'))
        .mockRejectedValueOnce(new Error('ENOENT'))
        .mockResolvedValueOnce(undefined);

      const result = await (videoService as any).findThumbnail('/test/videos/Video.mp4');

      expect(result).toBe('Video.png');
    });

    it('should find jpeg thumbnail after jpg misses', async () => {
      mockFs.access
        .mockRejectedValueOnce(new Error('ENOENT'))
        .mockResolvedValueOnce(undefined);

      const result = await (videoService as any).findThumbnail('/test/videos/Video.mp4');

      expect(result).toBe('Video.jpeg');
    });

    it('should find webp thumbnail after other extensions miss', async () => {
      mockFs.access
        .mockRejectedValueOnce(new Error('ENOENT'))
        .mockRejectedValueOnce(new Error('ENOENT'))
        .mockRejectedValueOnce(new Error('ENOENT'))
        .mockResolvedValueOnce(undefined);

      const result = await (videoService as any).findThumbnail('/test/videos/Video.mp4');

      expect(result).toBe('Video.webp');
    });

    it('should prefer jpg over jpeg when both are accessible', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const result = await (videoService as any).findThumbnail('/test/videos/Video.mp4');

      expect(result).toBe('Video.jpg');
      expect(mockFs.access).toHaveBeenCalledTimes(1);
    });

    it('should match exact thumbnail filename in fallback search', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      mockFs.readdir.mockResolvedValue(['video-trailer.jpg', 'video.jpg'] as any);

      const result = await (videoService as any).findThumbnail('/test/videos/video.mp4');

      expect(result).toBe('video.jpg');
    });

    it('should return null when directory read fails', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      mockFs.readdir.mockRejectedValue(new Error('EACCES'));

      const result = await (videoService as any).findThumbnail('/test/videos/Video.mp4');

      expect(result).toBeNull();
    });

    it('should return null when thumbnail directory does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      mockFs.readdir.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      const result = await (videoService as any).findThumbnail('/nonexistent/dir/video.mp4');

      expect(result).toBeNull();
    });

    it('should handle special characters in filename', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const result = await (videoService as any).findThumbnail('/test/videos/Movie With Spaces.mp4');

      expect(result).toBe('Movie With Spaces.jpg');
    });

    it('should return null for permission errors during access checks', async () => {
      const permissionError = new Error('permission denied') as NodeJS.ErrnoException;
      permissionError.code = 'EACCES';
      mockFs.access.mockRejectedValue(permissionError);
      mockFs.readdir.mockRejectedValue(permissionError);

      const result = await (videoService as any).findThumbnail('/test/videos/movie.mp4');

      expect(result).toBeNull();
    });
  });

  describe('getVideoMetadata', () => {
    it('should return metadata for valid video file', async () => {
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 1000000,
        mtime: new Date('2024-01-01')
      } as any);

      const metadata = await videoService.getVideoMetadata('video.mp4');

      expect(metadata).toBeDefined();
      expect(metadata?.title).toBeDefined();
    });

    it('should return null for non-existent file', async () => {
      mockFs.stat.mockRejectedValue(new Error('File not found'));

      const metadata = await videoService.getVideoMetadata('missing.mp4');

      expect(metadata).toBeNull();
    });

    it('should return null for non-video file', async () => {
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 1000,
        mtime: new Date('2024-01-01')
      } as any);

      const metadata = await videoService.getVideoMetadata('image.jpg');

      expect(metadata).toBeNull();
    });
  });

  describe('extractMetadata - UUID filename handling', () => {
    it('should strip UUID suffix from video title', async () => {
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 1000000,
        mtime: new Date('2024-01-01')
      } as any);

      const metadata = await videoService.getVideoMetadata('Unknown_Title-24a69609-5e99-44ed-ac38-42254753105e.mp4');

      expect(metadata?.title).toBe('Unknown Title');
    });

    it('should handle uppercase UUID suffix', async () => {
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 1000000,
        mtime: new Date('2024-01-01')
      } as any);

      const metadata = await videoService.getVideoMetadata('Unknown_Title-24A69609-5E99-44ED-AC38-42254753105E.mp4');

      expect(metadata?.title).toBe('Unknown Title');
    });

    it('should handle mixed case UUID suffix', async () => {
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 1000000,
        mtime: new Date('2024-01-01')
      } as any);

      const metadata = await videoService.getVideoMetadata('Unknown_Title-24a69609-5E99-44ed-Ac38-42254753105e.mp4');

      expect(metadata?.title).toBe('Unknown Title');
    });

    it('should not affect normal titles without UUID', async () => {
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 1000000,
        mtime: new Date('2024-01-01')
      } as any);

      const metadata = await videoService.getVideoMetadata('My_Video_File.mp4');

      expect(metadata?.title).toBe('My Video File');
    });

    it('should handle multiple UUID segments in filename', async () => {
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 1000000,
        mtime: new Date('2024-01-01')
      } as any);

      const metadata = await videoService.getVideoMetadata('Test-24a69609-5e99-44ed-ac38-42254753105e-video-12345678-abcd-5678-def0-123456789abc.mp4');

      expect(metadata?.title).toBe('Test Video');
    });
  });

  describe('getVideoFilePath', () => {
    it('should return correct file path', async () => {
      const filePath = videoService.getVideoFilePath('test.mp4');
      expect(filePath).toBe(path.join(testVideosDir, 'test.mp4'));
    });
  });

  describe('findThumbnailsBatch', () => {
    const testVideos = [
      {
        path: '/test/videos/movie1.mp4',
        name: 'movie1.mp4',
        extension: 'mp4',
        size: 1000,
        lastModified: new Date('2024-01-01')
      },
      {
        path: '/test/videos/movie2.mp4',
        name: 'movie2.mp4',
        extension: 'mp4',
        size: 2000,
        lastModified: new Date('2024-01-01')
      },
      {
        path: '/test/videos/subfolder/movie3.mp4',
        name: 'movie3.mp4',
        extension: 'mp4',
        size: 3000,
        lastModified: new Date('2024-01-01')
      }
    ];

    it('should find thumbnails for videos in same directory', async () => {
      mockFs.readdir
        .mockResolvedValueOnce(['movie1.mp4', 'movie1.jpg', 'movie2.png', 'thumb.png'] as any)
        .mockResolvedValueOnce(['movie3.mp4', 'movie3.webp'] as any);

      const result = await videoService.findThumbnailsBatch(testVideos as any);

      expect(result.get('/test/videos/movie1.mp4')).toBe('movie1.jpg');
      expect(result.get('/test/videos/movie2.mp4')).toBe('movie2.png');
      expect(result.get('/test/videos/subfolder/movie3.mp4')).toBe('movie3.webp');
    });

    it('should cache directory scans', async () => {
      mockFs.readdir.mockResolvedValue(['movie1.mp4', 'movie1.jpg'] as any);

      await videoService.findThumbnailsBatch(testVideos.slice(0, 1) as any);
      await videoService.findThumbnailsBatch(testVideos.slice(0, 1) as any);

      expect(mockFs.readdir).toHaveBeenCalledTimes(1);
    });

    it('should handle missing thumbnails gracefully', async () => {
      mockFs.readdir.mockResolvedValue(['movie1.mp4', 'other.jpg'] as any);

      const result = await videoService.findThumbnailsBatch(testVideos.slice(0, 1) as any);

      expect(result.has('/test/videos/movie1.mp4')).toBe(false);
    });

    it('should handle directory scan errors gracefully', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

      const result = await videoService.findThumbnailsBatch(testVideos.slice(0, 1) as any);

      expect(result.size).toBe(0);
    });
  });

  describe('Path Resolution', () => {
    const originalCwd = process.cwd;
    const originalEnv = process.env;

    beforeEach(() => {
      process.cwd = () => '/mock/cwd';
      process.env = { ...originalEnv };
      delete process.env.VIDEOS_DIR;
    });

    afterEach(() => {
      process.cwd = originalCwd;
      process.env = originalEnv;
    });

    it('should use default path when VIDEOS_DIR is not set', () => {
      const service = new VideoService(
        process.env.VIDEOS_DIR || path.join(process.cwd(), 'data', 'videos'),
        '/test/thumbnails'
      );
      const filePath = service.getVideoFilePath('test.mp4');
      expect(filePath).toBe(path.join('/mock/cwd', 'data', 'videos', 'test.mp4'));
    });

    it('should use environment variable override when VIDEOS_DIR is set', () => {
      process.env.VIDEOS_DIR = '/custom/videos';
      const service = new VideoService(
        process.env.VIDEOS_DIR || path.join(process.cwd(), 'data', 'videos'),
        '/test/thumbnails'
      );
      const filePath = service.getVideoFilePath('test.mp4');
      expect(filePath).toBe(path.join('/custom/videos', 'test.mp4'));
    });

    it('should produce absolute paths', () => {
      const service = new VideoService(
        process.env.VIDEOS_DIR || path.join(process.cwd(), 'data', 'videos'),
        '/test/thumbnails'
      );
      const filePath = service.getVideoFilePath('test.mp4');
      expect(path.isAbsolute(filePath)).toBe(true);
    });

    it('should not contain dangerous path traversals in default path', () => {
      delete process.env.VIDEOS_DIR;
      const service = new VideoService(
        process.env.VIDEOS_DIR || path.join(process.cwd(), 'data', 'videos'),
        '/test/thumbnails'
      );
      const filePath = service.getVideoFilePath('test.mp4');
      expect(filePath).not.toContain('../');
    });

    it('should handle absolute custom path from environment variable', () => {
      process.env.VIDEOS_DIR = '/absolute/custom/path';
      const service = new VideoService(process.env.VIDEOS_DIR, '/test/thumbnails');
      const filePath = service.getVideoFilePath('video.mp4');
      expect(filePath).toBe('/absolute/custom/path/video.mp4');
      expect(path.isAbsolute(filePath)).toBe(true);
    });
  });

  describe('findThumbnail (thumbnails directory fallback)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should find thumbnail in thumbnails directory when not in video directory', async () => {
      const serviceWithThumbnails = new VideoService('/test/videos', '/test/thumbnails');
      
      mockFs.access
        .mockRejectedValueOnce(new Error('ENOENT')) // video dir search fails
        .mockRejectedValueOnce(new Error('ENOENT')) // video dir .jpeg fails
        .mockRejectedValueOnce(new Error('ENOENT')) // video dir .png fails  
        .mockRejectedValueOnce(new Error('ENOENT')) // video dir .webp fails
        .mockRejectedValueOnce(new Error('ENOENT')) // thumbnails dir .jpg fails
        .mockResolvedValueOnce(undefined); // thumbnails dir .jpeg succeeds

      const result = await (serviceWithThumbnails as any).findThumbnail('/test/videos/video.mp4');

      expect(result).toBe('video.jpeg');
      expect(mockFs.access).toHaveBeenCalledWith('/test/thumbnails/video.jpeg');
    });

    it('should prefer thumbnail in video directory over thumbnails directory', async () => {
      const serviceWithThumbnails = new VideoService('/test/videos', '/test/thumbnails');
      
      mockFs.access.mockResolvedValue(undefined);

      const result = await (serviceWithThumbnails as any).findThumbnail('/test/videos/video.mp4');

      expect(result).toBe('video.jpg');
      expect(mockFs.access).toHaveBeenCalledWith('/test/videos/video.jpg');
      expect(mockFs.access).toHaveBeenCalledTimes(1);
    });

    it('should return null when thumbnail not in either directory', async () => {
      const serviceWithThumbnails = new VideoService('/test/videos', '/test/thumbnails');
      
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      mockFs.readdir.mockResolvedValue(['other.jpg'] as any);

      const result = await (serviceWithThumbnails as any).findThumbnail('/test/videos/video.mp4');

      expect(result).toBeNull();
    });
  });
});
