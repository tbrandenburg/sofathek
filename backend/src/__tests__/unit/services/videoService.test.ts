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
    stat: jest.fn(),
    readFile: jest.fn()
  }
}));

import { VideoService } from '../../../services/videoService';
import { ThumbnailService } from '../../../services/thumbnailService';
import { promises as fs } from 'fs';

// Get references to the mocked functions
const mockFs = fs as jest.Mocked<typeof fs>;

describe('VideoService', () => {
  let videoService: VideoService;
  const testVideosDir = '/test/videos';

  beforeEach(() => {
    videoService = new VideoService(testVideosDir);
    jest.clearAllMocks();
    // Default: no sidecar file present
    const enoentError = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    mockFs.readFile.mockRejectedValue(enoentError);
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

    it('should include companion audio and transcripts metadata', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir
        .mockResolvedValueOnce(['sample.mp4', 'sample.mp3', 'sample.en.srt', 'sample.de.srt'] as any)
        .mockResolvedValueOnce(['sample.mp4', 'sample.mp3', 'sample.en.srt', 'sample.de.srt'] as any)
        .mockResolvedValueOnce(['sample.mp4', 'sample.mp3', 'sample.en.srt', 'sample.de.srt'] as any);
      mockFs.stat.mockImplementation((_filePath) => {
        return Promise.resolve({
          isDirectory: () => false,
          isFile: () => true,
          size: 1000000,
          mtime: new Date('2024-01-01')
        } as any);
      });

      const result = await videoService.scanVideoDirectory();
      const video = result.videos[0];

      expect(video?.metadata.audio).toBe('sample.mp3');
      expect(video?.metadata.transcripts).toEqual([
        { language: 'de', file: 'sample.de.srt' },
        { language: 'en', file: 'sample.en.srt' }
      ]);
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

  describe('findThumbnail (video directory)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should find thumbnail in same directory as video', async () => {
      const service = new VideoService('/test/videos');

      mockFs.access.mockResolvedValueOnce(undefined); // /test/videos/video.jpg found

      const result = await (service as any).findThumbnail('/test/videos/video.mp4');

      expect(result).toBe('video.jpg');
      expect(mockFs.access).toHaveBeenCalledWith('/test/videos/video.jpg');
      expect(mockFs.access).toHaveBeenCalledTimes(1);
    });

    it('should return null when thumbnail not found in video directory', async () => {
      const service = new VideoService('/test/videos');

      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      mockFs.readdir.mockResolvedValue(['other.jpg'] as any);

      const result = await (service as any).findThumbnail('/test/videos/video.mp4');

      expect(result).toBeNull();
    });

    it('should not look in any other directory', async () => {
      const service = new VideoService('/test/videos');

      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      mockFs.readdir.mockResolvedValue([] as any);

      await (service as any).findThumbnail('/test/videos/video.mp4');

      // Should only check paths within /test/videos
      const accessCalls = (mockFs.access as jest.Mock).mock.calls.map((c: any[]) => c[0] as string);
      expect(accessCalls.every((p: string) => p.startsWith('/test/videos'))).toBe(true);
    });
  });

  describe('readInfoSidecar', () => {
    it('should return null when sidecar file does not exist', async () => {
      const enoentError = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      mockFs.readFile.mockRejectedValue(enoentError);

      const result = await (videoService as any).readInfoSidecar('/test/videos/video-abc123.mp4');

      expect(result).toBeNull();
    });

    it('should parse and return sidecar when file exists', async () => {
      const sidecar = {
        sourceUrl: 'https://www.youtube.com/watch?v=abc123',
        extractor: 'youtube',
        id: 'abc123',
        title: 'My Video',
        duration: 120,
        width: 1920,
        height: 1080,
        resolution: '1920x1080',
        tbr: 5000,
        downloadedAt: '2026-01-01T00:00:00.000Z'
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(sidecar) as any);

      const result = await (videoService as any).readInfoSidecar('/test/videos/video-abc123.mp4');

      expect(result).toEqual(sidecar);
      expect(mockFs.readFile).toHaveBeenCalledWith('/test/videos/video-abc123.info.json', 'utf-8');
    });

    it('should return null and log warning when sidecar JSON is corrupt', async () => {
      mockFs.readFile.mockResolvedValue('{ invalid json' as any);

      const result = await (videoService as any).readInfoSidecar('/test/videos/video-abc123.mp4');

      expect(result).toBeNull();
    });
  });

  describe('extractMetadata - thumbnail fallback', () => {
    const baseVideoFile = {
      path: '/test/videos/video-abc123.mp4',
      name: 'video-abc123.mp4',
      size: 1000000,
      extension: 'mp4',
      lastModified: new Date()
    };

    it('should use infoSidecar.localThumbnail when filesystem scan returns null', async () => {
      const sidecar = {
        title: 'Test Video',
        duration: 120,
        localThumbnail: 'video-abc123.jpg'
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(sidecar) as any);
      mockFs.access.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      mockFs.readdir.mockResolvedValue([] as any);

      const result = await (videoService as any).extractMetadata(baseVideoFile);

      expect(result.thumbnail).toBe('video-abc123.jpg');
    });

    it('should prefer filesystem thumbnail over infoSidecar.localThumbnail', async () => {
      const sidecar = {
        title: 'Test Video',
        duration: 120,
        localThumbnail: 'old-sidecar.jpg'
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(sidecar) as any);
      mockFs.access.mockResolvedValue(undefined); // filesystem finds video-abc123.jpg

      const result = await (videoService as any).extractMetadata(baseVideoFile);

      expect(result.thumbnail).toBe('video-abc123.jpg');
    });

    it('should return null for thumbnail when neither filesystem nor sidecar has it', async () => {
      const sidecar = {
        title: 'Test Video',
        duration: 120
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(sidecar) as any);
      mockFs.access.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      mockFs.readdir.mockResolvedValue([] as any);

      const result = await (videoService as any).extractMetadata(baseVideoFile);

      expect(result.thumbnail).toBeUndefined();
    });
  });

  describe('extractMetadata with sidecar', () => {
    it('should populate rich metadata fields from sidecar', async () => {
      const sidecar = {
        sourceUrl: 'https://www.youtube.com/watch?v=abc123',
        extractor: 'youtube',
        id: 'abc123',
        title: 'Real Title From Sidecar',
        duration: 300,
        width: 1920,
        height: 1080,
        resolution: '1920x1080',
        tbr: 5000,
        downloadedAt: '2026-01-01T00:00:00.000Z'
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(sidecar) as any);
      mockFs.access.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      mockFs.readdir.mockResolvedValue([] as any);

      const videoFile = {
        path: '/test/videos/video-abc123.mp4',
        name: 'video-abc123.mp4',
        size: 1000000,
        extension: 'mp4',
        lastModified: new Date()
      };

      const result = await (videoService as any).extractMetadata(videoFile);

      expect(result.title).toBe('Real Title From Sidecar');
      expect(result.duration).toBe(300);
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
      expect(result.format).toBe('1920x1080');
      expect(result.bitrate).toBe(5000);
    });

    it('should fall back to filename-based metadata when sidecar is absent', async () => {
      const enoentError = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      mockFs.readFile.mockRejectedValue(enoentError);
      mockFs.access.mockRejectedValue(enoentError);
      mockFs.readdir.mockResolvedValue([] as any);

      const videoFile = {
        path: '/test/videos/My_Cool_Video-abc123.mp4',
        name: 'My_Cool_Video-abc123.mp4',
        size: 1000000,
        extension: 'mp4',
        lastModified: new Date()
      };

      const result = await (videoService as any).extractMetadata(videoFile);

      expect(result.title).toBe('My Cool Video Abc123');
      expect(result.duration).toBeUndefined();
      expect(result.width).toBeUndefined();
      expect(result.height).toBeUndefined();
      expect(result.format).toBe('MP4');
    });
  });

  describe('scanVideoDirectory with ThumbnailService injection', () => {
    let mockThumbnailService: jest.Mocked<Pick<ThumbnailService, 'generateThumbnail'>>;

    beforeEach(() => {
      mockThumbnailService = {
        generateThumbnail: jest.fn()
      };
      jest.clearAllMocks();
      const enoentError = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      mockFs.readFile.mockRejectedValue(enoentError);
    });

    it('should call generateThumbnail for videos without thumbnails when ThumbnailService is injected', async () => {
      const serviceWithThumb = new VideoService(testVideosDir, mockThumbnailService as unknown as ThumbnailService);
      mockThumbnailService.generateThumbnail.mockResolvedValue('/test/videos/video1.jpg');

      mockFs.access.mockResolvedValue(undefined);
      // readdir: first call lists video files, then two calls for findThumbnailsBatch and findThumbnail fallback
      mockFs.readdir
        .mockResolvedValueOnce(['video1.mp4'] as any)   // directory listing
        .mockResolvedValueOnce([] as any)               // findThumbnailsBatch: no thumbnails found
        .mockResolvedValueOnce(['video1.jpg'] as any);  // findThumbnail after regeneration
      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        size: 1000000,
        mtime: new Date('2024-01-01')
      } as any);

      await serviceWithThumb.scanVideoDirectory();

      expect(mockThumbnailService.generateThumbnail).toHaveBeenCalledWith(
        path.join(testVideosDir, 'video1.mp4')
      );
    });

    it('should not call generateThumbnail when ThumbnailService is not injected', async () => {
      const serviceWithoutThumb = new VideoService(testVideosDir);

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir
        .mockResolvedValueOnce(['video1.mp4'] as any)
        .mockResolvedValueOnce([] as any);
      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        size: 1000000,
        mtime: new Date('2024-01-01')
      } as any);

      await serviceWithoutThumb.scanVideoDirectory();

      expect(mockThumbnailService.generateThumbnail).not.toHaveBeenCalled();
    });

    it('should handle thumbnail generation errors gracefully and continue scan', async () => {
      const serviceWithThumb = new VideoService(testVideosDir, mockThumbnailService as unknown as ThumbnailService);
      mockThumbnailService.generateThumbnail.mockRejectedValue(new Error('Generation failed'));

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir
        .mockResolvedValueOnce(['video1.mp4'] as any)
        .mockResolvedValueOnce([] as any);
      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        size: 1000000,
        mtime: new Date('2024-01-01')
      } as any);

      const result = await serviceWithThumb.scanVideoDirectory();

      // Scan should complete despite thumbnail error
      expect(result.videos).toHaveLength(1);
      expect(result.errors).toContainEqual(expect.stringContaining('Failed to generate thumbnail for video1.mp4'));
    });

    it('should not call generateThumbnail when thumbnail already exists', async () => {
      const serviceWithThumb = new VideoService(testVideosDir, mockThumbnailService as unknown as ThumbnailService);

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir
        .mockResolvedValueOnce(['video1.mp4'] as any)
        .mockResolvedValueOnce(['video1.mp4', 'video1.jpg'] as any); // thumbnail already present
      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        size: 1000000,
        mtime: new Date('2024-01-01')
      } as any);

      await serviceWithThumb.scanVideoDirectory();

      expect(mockThumbnailService.generateThumbnail).not.toHaveBeenCalled();
    });
  });
});
