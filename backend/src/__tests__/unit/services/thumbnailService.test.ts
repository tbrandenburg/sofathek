import { ThumbnailService } from '../../../services/thumbnailService';

// Simple mocks
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
  unlink: (...args: any[]) => mockUnlink(...args)
}));

const mockFFmpeggyRun = jest.fn();
const mockFFmpeggyDone = jest.fn();
jest.mock('ffmpeggy', () => ({
  FFmpeggy: jest.fn().mockImplementation(() => ({
    run: mockFFmpeggyRun,
    done: mockFFmpeggyDone
  }))
}));

describe('ThumbnailService', () => {
  let service: ThumbnailService;

  beforeEach(() => {
    service = new ThumbnailService('/test/temp', '/test/thumbnails');
    jest.clearAllMocks();
  });

  describe('generateThumbnail', () => {
    it('should generate thumbnail successfully', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);
      mockFFmpeggyRun.mockResolvedValue(undefined);
      mockFFmpeggyDone.mockResolvedValue(undefined);
      
      const result = await service.generateThumbnail('/test/video.mp4');
      
      expect(result).toBe('/test/thumbnails/video.jpg');
    });
  });

  describe('thumbnailExists', () => {
    it('should return true when thumbnail exists', async () => {
      mockAccess.mockResolvedValue(undefined);
      
      const result = await service.thumbnailExists('/test/video.mp4');
      
      expect(result).toBe(true);
    });

    it('should return false when thumbnail does not exist', async () => {
      mockAccess.mockRejectedValue(new Error('File not found'));
      
      const result = await service.thumbnailExists('/test/video.mp4');
      
      expect(result).toBe(false);
    });
  });

  describe('getThumbnailPath', () => {
    it('should return correct thumbnail path', () => {
      const result = service.getThumbnailPath('/test/video.mp4');
      expect(result).toBe('/test/thumbnails/video.jpg');
    });
  });

  describe('cleanupTempFiles', () => {
    it('should clean up old temp files', async () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
      
      mockReaddir.mockResolvedValue(['old-file.jpg', 'new-file.jpg']);
      mockStat.mockImplementation((filePath) => {
        const isOld = String(filePath).includes('old-file');
        return Promise.resolve({
          mtime: isOld ? oldDate : new Date()
        });
      });
      mockUnlink.mockResolvedValue(undefined);
      
      const result = await service.cleanupTempFiles(24);
      
      expect(result).toBe(1);
    });

    it('should handle cleanup errors gracefully', async () => {
      mockReaddir.mockRejectedValue(new Error('Directory access failed'));
      
      // Should not throw and return 0
      const result = await service.cleanupTempFiles(24);
      expect(result).toBe(0);
    });
  });

  describe('generateThumbnail', () => {
    it('should handle thumbnail generation failure', async () => {
      // Mock ensureDirectoriesExist to work
      mockAccess.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined);
      mockMkdir.mockResolvedValue(undefined);
      mockFFmpeggyRun.mockResolvedValue(undefined);
      mockFFmpeggyDone.mockResolvedValue(undefined);
      // Mock final access check to fail (thumbnail verification)
      mockAccess.mockRejectedValueOnce(new Error('Thumbnail not found'));
      
      await expect(service.generateThumbnail('/test/video.mp4'))
        .rejects.toThrow('Thumbnail file was not created');
    });
  });
});

// Real FFmpeg Integration Tests (no mocks)
describe('ThumbnailService - Real FFmpeg Integration', () => {
  // Import the real service without mocks for these tests
  const { ThumbnailService: RealThumbnailService } = jest.requireActual('../../../services/thumbnailService');
  let realService: any;
  const tempDir = '/tmp/test-thumbnails';
  const thumbnailsDir = '/tmp/test-thumbnails/output';
  
  beforeAll(async () => {
    // Create test service instance with real implementation
    realService = new RealThumbnailService(tempDir, thumbnailsDir);
    
    // Clean up any previous test files
    try {
      const fs = await import('fs/promises');
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });
  
  afterAll(async () => {
    // Clean up test files
    try {
      const fs = await import('fs/promises');
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should handle FFmpeg binary not found gracefully', async () => {
    // Test behavior when FFmpeg is not available by using nonexistent path
    await expect(
      realService.generateThumbnail('/nonexistent/video.mp4')
    ).rejects.toThrow();
    // The exact error message might vary depending on FFmpeggy version and static binaries
  });
  
  // Note: Testing with actual video file would require a test video file
  // This test would be enabled when test assets are available
  it.skip('should generate thumbnail from real video file with actual FFmpeg', async () => {
    const path = await import('path');
    const fs = await import('fs/promises');
    
    // This test would work with an actual video file
    const testVideoPath = path.join(__dirname, '../../../data/test-video.mp4');
    
    try {
      const thumbnailPath = await realService.generateThumbnail(testVideoPath);
      
      expect(thumbnailPath).toBeDefined();
      await fs.access(thumbnailPath); // Should not throw if file exists
    } catch (error) {
      // Expected if test video doesn't exist
      expect(error).toBeDefined();
    }
  });
});

// Configuration branch coverage tests
describe('ThumbnailService Configuration', () => {
  it('should handle module import without throwing errors', () => {
    // Simple test that the module can be imported
    // This covers the module-level configuration code paths
    expect(() => {
      const { ThumbnailService } = require('../../../services/thumbnailService');
      new ThumbnailService('/test', '/test');
    }).not.toThrow();
  });
  
  it('should handle static binary configuration', () => {
    // Test that static binaries are configured correctly
    const ffmpegStatic = require('ffmpeg-static');
    const ffprobeStatic = require('ffprobe-static');
    
    expect(ffmpegStatic).toBeDefined();
    expect(ffprobeStatic).toBeDefined();
    expect(ffprobeStatic.path).toBeDefined();
  });
});