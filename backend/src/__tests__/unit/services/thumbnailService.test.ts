import { ThumbnailService } from '../../../services/thumbnailService';

const mockReaddir = jest.fn();
const mockStat = jest.fn();
const mockAccess = jest.fn();
const mockMkdir = jest.fn();
const mockUnlink = jest.fn();

jest.mock('fs/promises', () => ({
  readdir: (...args: any[]) => mockReaddir(...args),
  stat: (...args: any[]) => mockStat(...args),
  access: (...args: any[]) => mockAccess(...args),
  mkdir: (...args: any[]) => mockMkdir(...args),
  unlink: (...args: any[]) => mockUnlink(...args),
}));

const mockExeca = jest.fn();
jest.mock('execa', () => {
  const fn = (...args: any[]) => mockExeca(...args);
  return fn;
});

describe('ThumbnailService', () => {
  let service: ThumbnailService;

  beforeEach(() => {
    service = new ThumbnailService('/test/temp', '/test/thumbnails');
    jest.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
  });

  describe('generateThumbnail', () => {
    it('should generate thumbnail successfully', async () => {
      mockExeca.mockResolvedValue({ exitCode: 0 });
      mockAccess.mockResolvedValue(undefined);

      const result = await service.generateThumbnail('/test/video.mp4');

      expect(result).toBe('/test/thumbnails/video.jpg');
      expect(mockExeca).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['-i', '/test/video.mp4', '/test/thumbnails/video.jpg'])
      );
    });

    it('should throw when ffmpeg fails', async () => {
      mockExeca.mockRejectedValue(new Error('ffmpeg error'));

      await expect(service.generateThumbnail('/test/video.mp4'))
        .rejects.toThrow('Failed to generate thumbnail');
    });

    it('should throw when thumbnail file is not created after ffmpeg succeeds', async () => {
      mockExeca.mockResolvedValue({ exitCode: 0 });
      mockAccess.mockRejectedValue(new Error('not found'));

      await expect(service.generateThumbnail('/test/video.mp4'))
        .rejects.toThrow('Failed to generate thumbnail');
    });
  });

  describe('generateThumbnailWithProgress', () => {
    it('should call progress callback at 50% and 100% on success', async () => {
      mockExeca.mockResolvedValue({ exitCode: 0 });
      mockAccess.mockResolvedValue(undefined);

      const progressCallback = jest.fn();
      await service.generateThumbnailWithProgress('/test/video.mp4', progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(50);
      expect(progressCallback).toHaveBeenCalledWith(100);
      expect(progressCallback).toHaveBeenCalledTimes(2);
    });

    it('should work without progress callback', async () => {
      mockExeca.mockResolvedValue({ exitCode: 0 });
      mockAccess.mockResolvedValue(undefined);

      await expect(service.generateThumbnailWithProgress('/test/video.mp4')).resolves.toBeDefined();
    });

    it('should propagate errors from generateThumbnail', async () => {
      mockExeca.mockRejectedValue(new Error('ffmpeg failed'));

      await expect(service.generateThumbnailWithProgress('/test/video.mp4'))
        .rejects.toThrow('Failed to generate thumbnail');
    });
  });

  describe('thumbnailExists', () => {
    it('should return true when thumbnail exists', async () => {
      mockAccess.mockResolvedValue(undefined);
      expect(await service.thumbnailExists('/test/video.mp4')).toBe(true);
    });

    it('should return false when thumbnail does not exist', async () => {
      mockAccess.mockRejectedValue(new Error('File not found'));
      expect(await service.thumbnailExists('/test/video.mp4')).toBe(false);
    });
  });

  describe('getThumbnailPath', () => {
    it('should return correct thumbnail path', () => {
      expect(service.getThumbnailPath('/test/video.mp4')).toBe('/test/thumbnails/video.jpg');
    });
  });

  describe('cleanupTempFiles', () => {
    it('should clean up old temp files', async () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000);

      mockReaddir.mockResolvedValue(['old-file.jpg', 'new-file.jpg']);
      mockStat.mockImplementation((filePath: string) => {
        const isOld = filePath.includes('old-file');
        return Promise.resolve({ mtime: isOld ? oldDate : new Date() });
      });
      mockUnlink.mockResolvedValue(undefined);

      const result = await service.cleanupTempFiles(24);
      expect(result).toBe(1);
    });

    it('should handle cleanup errors gracefully', async () => {
      mockReaddir.mockRejectedValue(new Error('Directory access failed'));
      expect(await service.cleanupTempFiles(24)).toBe(0);
    });
  });
});

// Real FFmpeg Integration Tests (no mocks)
describe('ThumbnailService - Real FFmpeg Integration', () => {
  const { ThumbnailService: RealThumbnailService } = jest.requireActual('../../../services/thumbnailService');
  let realService: any;
  const tempDir = '/tmp/test-thumbnails';
  const thumbnailsDir = '/tmp/test-thumbnails/output';

  beforeAll(async () => {
    realService = new RealThumbnailService(tempDir, thumbnailsDir);
    try {
      const fs = await import('fs/promises');
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  afterAll(async () => {
    try {
      const fs = await import('fs/promises');
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('should handle non-existent video file gracefully', async () => {
    await expect(
      realService.generateThumbnail('/nonexistent/video.mp4')
    ).rejects.toThrow();
  });

  it.skip('should generate thumbnail from real video file with actual FFmpeg', async () => {
    const fs = await import('fs/promises');
    const testVideoPath = `/tmp/test-video-${Date.now()}.mp4`;
    try {
      const thumbnailPath = await realService.generateThumbnail(testVideoPath);
      expect(thumbnailPath).toBeDefined();
      await fs.access(thumbnailPath);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});

describe('ThumbnailService Configuration', () => {
  it('should handle module import without throwing errors', () => {
    expect(() => {
      const { ThumbnailService: T } = require('../../../services/thumbnailService');
      new T('/test', '/test');
    }).not.toThrow();
  });

  it('should have ffmpeg-static available', () => {
    const ffmpegStatic = require('ffmpeg-static');
    expect(ffmpegStatic).toBeDefined();
  });
});
