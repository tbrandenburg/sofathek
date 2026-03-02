import { VideoService } from '../../../services/videoService';
import { promises as fs } from 'fs';
import path from 'path';

// Mock fs promises
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
      mockFs.access.mockResolvedValue();
      mockFs.stat.mockImplementation((filePath) => {
        return Promise.resolve({ 
          isDirectory: () => false, 
          isFile: () => true,
          size: 1000000,
          mtime: new Date('2024-01-01')
        } as any);
      });

      const result = await videoService.scanVideoDirectory();

      expect(result.videos).toHaveLength(2);
      expect(result.totalSize).toBe(2000000);
      expect(result.totalCount).toBe(2);
      expect(result.scannedAt).toBeInstanceOf(Date);
    });

    it('should handle directory access errors gracefully', async () => {
      mockFs.access.mockRejectedValue(new Error('Permission denied'));
      mockFs.mkdir.mockRejectedValue(new Error('Cannot create directory'));
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

      const result = await videoService.scanVideoDirectory();

      expect(result.videos).toEqual([]);
      expect(result.errors).toContain('Error reading directory: Permission denied');
    });

    it('should skip directories and non-video files', async () => {
      mockFs.access.mockResolvedValue();
      mockFs.readdir.mockResolvedValue(['video1.mp4', 'subfolder', 'image.jpg'] as any);
      mockFs.stat.mockImplementation((_filePath) => {
        const filename = String(_filePath).split('/').pop() || '';
        return Promise.resolve({ 
          isDirectory: () => filename === 'subfolder',
          isFile: () => filename !== 'subfolder',
          size: 1000000,
          mtime: new Date('2024-01-01')
        } as any);
      });

      const result = await videoService.scanVideoDirectory();

      expect(result.videos).toHaveLength(1);
      expect(result.videos[0]?.file.name).toBe('video1.mp4');
    });

    it('should handle individual file processing errors', async () => {
      mockFs.access.mockResolvedValue();
      mockFs.readdir.mockResolvedValue(['video1.mp4', 'corrupted.avi'] as any);
      mockFs.stat.mockImplementation((filePath) => {
        const filename = path.basename(filePath as string);
        if (filename === 'corrupted.avi') {
          return Promise.reject(new Error('File corrupted'));
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
      expect(result.errors).toContain('Error processing corrupted.avi: File corrupted');
    });
  });

  describe('validateVideoFile', () => {
    it('should return true for supported video extensions', () => {
      expect(videoService.validateVideoFile('test.mp4')).toBe(true);
      expect(videoService.validateVideoFile('test.avi')).toBe(true);
      expect(videoService.validateVideoFile('test.mkv')).toBe(true);
      expect(videoService.validateVideoFile('test.mov')).toBe(true);
      expect(videoService.validateVideoFile('TEST.MP4')).toBe(true); // Case insensitive
    });

    it('should return false for unsupported extensions', () => {
      expect(videoService.validateVideoFile('test.txt')).toBe(false);
      expect(videoService.validateVideoFile('test.pdf')).toBe(false);
      expect(videoService.validateVideoFile('test.jpg')).toBe(false);
      expect(videoService.validateVideoFile('test')).toBe(false); // No extension
    });
  });

  describe('getVideoMetadata', () => {
    it('should return metadata for valid video file', async () => {
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 1000000,
        mtime: new Date('2024-01-01')
      } as any);

      const metadata = await videoService.getVideoMetadata('test-video.mp4');

      expect(metadata).toBeDefined();
      expect(metadata?.title).toBe('Test Video');
      expect(metadata?.format).toBe('MP4');
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

      const metadata = await videoService.getVideoMetadata('document.txt');

      expect(metadata).toBeNull();
    });
  });

  describe('getVideoFilePath', () => {
    it('should return correct file path', () => {
      const filename = 'test-video.mp4';
      const expectedPath = path.join(testVideosDir, filename);
      
      const result = videoService.getVideoFilePath(filename);
      
      expect(result).toBe(expectedPath);
    });
  });
});