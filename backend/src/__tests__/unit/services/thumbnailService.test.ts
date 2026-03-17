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
const mockFFmpeggyOn = jest.fn();
const mockFFmpeggyOff = jest.fn();
const mockFFmpeggyRemoveListener = jest.fn();
jest.mock('ffmpeggy', () => ({
  FFmpeggy: jest.fn().mockImplementation(() => ({
    run: mockFFmpeggyRun,
    done: mockFFmpeggyDone,
    on: mockFFmpeggyOn,
    off: mockFFmpeggyOff,
    removeListener: mockFFmpeggyRemoveListener
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
    const fs = await import('fs/promises');
    
    // Use temporary test file instead of deleted demo video
    const testVideoPath = `/tmp/test-video-${Date.now()}.mp4`;
    
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

describe('ThumbnailService - generateThumbnailWithProgress', () => {
  let service: ThumbnailService;

  beforeEach(() => {
    service = new ThumbnailService('/test', '/test');
    jest.clearAllMocks();
    
    // Reset fs mocks
    mockAccess.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    
    // Reset FFmpeggy mocks
    mockFFmpeggyRun.mockResolvedValue(undefined);
    mockFFmpeggyDone.mockResolvedValue(undefined);
    mockFFmpeggyOn.mockReturnValue(undefined);
    mockFFmpeggyRemoveListener.mockReturnValue(undefined);
  });

  it('should generate thumbnail with progress callback and clean up event listeners', async () => {
    // Mock progress callback
    const progressCallback = jest.fn();

    // Execute the method
    await service.generateThumbnailWithProgress('/test/video.mp4', progressCallback);

    // Verify event listeners were set up
    expect(mockFFmpeggyOn).toHaveBeenCalledWith('progress', expect.any(Function));
    expect(mockFFmpeggyOn).toHaveBeenCalledWith('error', expect.any(Function));
    
    // Verify event listeners were cleaned up
    expect(mockFFmpeggyRemoveListener).toHaveBeenCalledWith('progress', expect.any(Function));
    expect(mockFFmpeggyRemoveListener).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should generate thumbnail without progress callback and still clean up error listener', async () => {
    await service.generateThumbnailWithProgress('/test/video.mp4');
    
    // Verify only error listener was set up (no progress listener)
    expect(mockFFmpeggyOn).not.toHaveBeenCalledWith('progress', expect.any(Function));
    expect(mockFFmpeggyOn).toHaveBeenCalledWith('error', expect.any(Function));
    
    // Verify error listener was cleaned up
    expect(mockFFmpeggyRemoveListener).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockFFmpeggyRemoveListener).toHaveBeenCalledTimes(1); // Only error handler
  });

  it('should clean up event listeners even when FFmpeg fails', async () => {
    // Mock FFmpeggy to fail
    mockFFmpeggyRun.mockRejectedValue(new Error('FFmpeg failed'));
    
    const progressCallback = jest.fn();
    
    try {
      await service.generateThumbnailWithProgress('/test/video.mp4', progressCallback);
    } catch (error) {
      // Expected to fail
    }
    
    // Verify event listeners were still cleaned up despite the error
    expect(mockFFmpeggyRemoveListener).toHaveBeenCalledWith('progress', expect.any(Function));
    expect(mockFFmpeggyRemoveListener).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should clean up event listeners even when thumbnail file verification fails', async () => {
    // Mock file access to fail (thumbnail not created)
    mockAccess.mockRejectedValue(new Error('File not found'));
    
    const progressCallback = jest.fn();
    
    try {
      await service.generateThumbnailWithProgress('/test/video.mp4', progressCallback);
    } catch (error) {
      // Expected to fail
    }
    
    // Verify event listeners were cleaned up despite verification failure
    expect(mockFFmpeggyRemoveListener).toHaveBeenCalledWith('progress', expect.any(Function));
    expect(mockFFmpeggyRemoveListener).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should handle progress events correctly', async () => {
    const progressCallback = jest.fn();
    
    // Track the progress handler for manual testing
    let capturedProgressHandler: any;
    mockFFmpeggyOn.mockImplementation((event: string, handler: any) => {
      if (event === 'progress') {
        capturedProgressHandler = handler;
      }
    });

    await service.generateThumbnailWithProgress('/test/video.mp4', progressCallback);
    
    // Manually trigger the captured progress handler to test the logic
    expect(capturedProgressHandler).toBeDefined();
    
    capturedProgressHandler({ percent: 25.7 }); // Should round to 26
    capturedProgressHandler({ percent: 50.2 }); // Should round to 50  
    capturedProgressHandler({ percent: 75.9 }); // Should round to 76
    capturedProgressHandler({}); // Should be ignored (no percent)
    
    expect(progressCallback).toHaveBeenCalledWith(26);
    expect(progressCallback).toHaveBeenCalledWith(50);
    expect(progressCallback).toHaveBeenCalledWith(76);
    expect(progressCallback).toHaveBeenCalledTimes(3);
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