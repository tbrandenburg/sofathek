import { VideoFileManager } from '../../../services/videoFileManager';

// Mock fs/promises
const mockMkdir = jest.fn();
const mockRename = jest.fn();
const mockAccess = jest.fn();
const mockReaddir = jest.fn();
const mockUnlink = jest.fn();

jest.mock('fs/promises', () => ({
  mkdir: (...args: any[]) => mockMkdir(...args),
  rename: (...args: any[]) => mockRename(...args),
  access: (...args: any[]) => mockAccess(...args),
  readdir: (...args: any[]) => mockReaddir(...args),
  unlink: (...args: any[]) => mockUnlink(...args)
}));

describe('VideoFileManager', () => {
  let manager: VideoFileManager;

  beforeEach(() => {
    manager = new VideoFileManager('/test/videos', '/test/temp');
    jest.clearAllMocks();
  });

  describe('moveToLibrary', () => {
    it('should move video to library successfully', async () => {
      const metadata = {
        id: 'test123',
        title: 'Test Video'
      };

      mockMkdir.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue(['Test_Video-test123.mp4', 'Test_Video-test123.mp3', 'other-file.mp4']);
      mockRename.mockResolvedValue(undefined);

      const result = await manager.moveToLibrary('/test/temp/Test_Video-test123.mp4', metadata);

      expect(result).toBe('/test/videos/Test_Video-test123.mp4');
      expect(mockMkdir).toHaveBeenCalledWith('/test/videos', { recursive: true });
      expect(mockReaddir).toHaveBeenCalledWith('/test/temp');
      // Moves all files with the prefix (video + companions)
      expect(mockRename).toHaveBeenCalledWith('/test/temp/Test_Video-test123.mp4', '/test/videos/Test_Video-test123.mp4');
      expect(mockRename).toHaveBeenCalledWith('/test/temp/Test_Video-test123.mp3', '/test/videos/Test_Video-test123.mp3');
      // Non-matching file is NOT moved
      expect(mockRename).not.toHaveBeenCalledWith('/test/temp/other-file.mp4', expect.anything());
    });

    it('should handle move failures', async () => {
      const metadata = {
        id: 'test123',
        title: 'Test Video'
      };

      mockMkdir.mockResolvedValue(undefined);
      mockReaddir.mockRejectedValue(new Error('Permission denied'));

      await expect(manager.moveToLibrary('/test/temp/Test_Video-test123.mp4', metadata))
        .rejects.toThrow('Failed to move video to library');
    });

    it('should create safe filenames', async () => {
      const metadata = {
        id: 'test123',
        title: 'Test Video: "Special" Characters/And\\More!'
      };

      mockMkdir.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue(['Test_Video_Special_CharactersAndMore!-test123.mp4']);
      mockRename.mockResolvedValue(undefined);

      const result = await manager.moveToLibrary('/test/temp/file.mp4', metadata);

      // The exclamation mark is kept, other special chars are removed: : " / \ are removed
      expect(result).toBe('/test/videos/Test_Video_Special_CharactersAndMore!-test123.mp4');
    });
  });

  describe('ensureDirectoriesExist', () => {
    it('should create directories if they do not exist', async () => {
      mockAccess.mockRejectedValue(new Error('Directory does not exist'));
      mockMkdir.mockResolvedValue(undefined);

      await manager.ensureDirectoriesExist();

      expect(mockAccess).toHaveBeenCalledWith('/test/videos');
      expect(mockAccess).toHaveBeenCalledWith('/test/temp');
      expect(mockMkdir).toHaveBeenCalledWith('/test/videos', { recursive: true });
      expect(mockMkdir).toHaveBeenCalledWith('/test/temp', { recursive: true });
    });

    it('should not create directories if they already exist', async () => {
      mockAccess.mockResolvedValue(undefined);

      await manager.ensureDirectoriesExist();

      expect(mockMkdir).not.toHaveBeenCalled();
    });
  });

  describe('cleanupFailedDownload', () => {
    it('should cleanup files matching video ID', async () => {
      mockReaddir.mockResolvedValue(['test123-file1.mp4', 'test123-file2.part', 'other-file.txt']);
      mockUnlink.mockResolvedValue(undefined);

      await manager.cleanupFailedDownload('test123');

      expect(mockUnlink).toHaveBeenCalledWith('/test/temp/test123-file1.mp4');
      expect(mockUnlink).toHaveBeenCalledWith('/test/temp/test123-file2.part');
      expect(mockUnlink).not.toHaveBeenCalledWith('/test/temp/other-file.txt');
    });

    it('should handle cleanup errors gracefully', async () => {
      mockReaddir.mockRejectedValue(new Error('Permission denied'));

      // Should not throw - just log the warning
      await expect(manager.cleanupFailedDownload('test123')).resolves.toBeUndefined();
    });

    it('should handle file deletion errors gracefully', async () => {
      mockReaddir.mockResolvedValue(['test123-file1.mp4']);
      mockUnlink.mockRejectedValue(new Error('File locked'));

      // Should not throw - just log the warning
      await expect(manager.cleanupFailedDownload('test123')).resolves.toBeUndefined();
    });
  });
});