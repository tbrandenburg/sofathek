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

  beforeEach(() => {
    videoService = new VideoService(testVideosDir);
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

  describe('getVideoFilePath', () => {
    it('should return correct file path', async () => {
      const filePath = videoService.getVideoFilePath('test.mp4');
      expect(filePath).toBe(path.join(testVideosDir, 'test.mp4'));
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
        process.env.VIDEOS_DIR || path.join(process.cwd(), 'data', 'videos')
      );
      const filePath = service.getVideoFilePath('test.mp4');
      expect(filePath).toBe(path.join('/mock/cwd', 'data', 'videos', 'test.mp4'));
    });

    it('should use environment variable override when VIDEOS_DIR is set', () => {
      process.env.VIDEOS_DIR = '/custom/videos';
      const service = new VideoService(
        process.env.VIDEOS_DIR || path.join(process.cwd(), 'data', 'videos')
      );
      const filePath = service.getVideoFilePath('test.mp4');
      expect(filePath).toBe(path.join('/custom/videos', 'test.mp4'));
    });

    it('should produce absolute paths', () => {
      const service = new VideoService(
        process.env.VIDEOS_DIR || path.join(process.cwd(), 'data', 'videos')
      );
      const filePath = service.getVideoFilePath('test.mp4');
      expect(path.isAbsolute(filePath)).toBe(true);
    });

    it('should not contain dangerous path traversals in default path', () => {
      delete process.env.VIDEOS_DIR;
      const service = new VideoService(
        process.env.VIDEOS_DIR || path.join(process.cwd(), 'data', 'videos')
      );
      const filePath = service.getVideoFilePath('test.mp4');
      expect(filePath).not.toContain('../');
    });

    it('should handle absolute custom path from environment variable', () => {
      process.env.VIDEOS_DIR = '/absolute/custom/path';
      const service = new VideoService(process.env.VIDEOS_DIR);
      const filePath = service.getVideoFilePath('video.mp4');
      expect(filePath).toBe('/absolute/custom/path/video.mp4');
      expect(path.isAbsolute(filePath)).toBe(true);
    });
  });
});
