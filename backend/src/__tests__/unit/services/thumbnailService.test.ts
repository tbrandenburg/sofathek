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
  });
});