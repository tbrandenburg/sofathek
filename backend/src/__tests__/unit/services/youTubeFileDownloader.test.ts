import { YouTubeFileDownloader } from '../../../services/youTubeFileDownloader';

// Mock fs/promises
const mockReaddir = jest.fn();
jest.mock('fs/promises', () => ({
  readdir: (...args: any[]) => mockReaddir(...args)
}));

// Mock youtube-dl-exec
const mockExec = jest.fn();
jest.mock('youtube-dl-exec', () => ({
  exec: (...args: any[]) => mockExec(...args)
}));

describe('YouTubeFileDownloader', () => {
  let downloader: YouTubeFileDownloader;

  beforeEach(() => {
    downloader = new YouTubeFileDownloader('/test/temp');
    jest.clearAllMocks();
  });

  describe('download', () => {
    it('should download video file successfully', async () => {
      const metadata = {
        id: 'test123',
        title: 'Test Video'
      };

      const mockSubprocess = Promise.resolve();
      (mockSubprocess as any).stdout = { on: jest.fn() };
      mockExec.mockReturnValue(mockSubprocess);
      
      mockReaddir.mockResolvedValue(['Test_Video-test123.mp4', 'other-file.txt']);

      const result = await downloader.download('https://www.youtube.com/watch?v=test123', metadata);

      expect(result).toBe('/test/temp/Test_Video-test123.mp4');
      expect(mockExec).toHaveBeenCalledWith(
        'https://www.youtube.com/watch?v=test123',
        expect.objectContaining({
          output: expect.stringContaining('Test_Video-test123'),
          format: 'best[ext=mp4]/best',
          noPlaylist: true,
          restrictFilenames: true,
          noWarnings: true
        })
      );
    });

    it('should handle download failures', async () => {
      const metadata = {
        id: 'test123',
        title: 'Test Video'
      };

      const mockSubprocess = Promise.reject(new Error('Download failed'));
      (mockSubprocess as any).stdout = { on: jest.fn() };
      mockExec.mockReturnValue(mockSubprocess);

      await expect(downloader.download('https://www.youtube.com/watch?v=test123', metadata))
        .rejects.toThrow('Failed to download video file');
    });

    it('should handle missing downloaded file', async () => {
      const metadata = {
        id: 'test123',
        title: 'Test Video'
      };

      const mockSubprocess = Promise.resolve();
      (mockSubprocess as any).stdout = { on: jest.fn() };
      mockExec.mockReturnValue(mockSubprocess);
      
      mockReaddir.mockResolvedValue(['other-file.txt']); // No matching file

      await expect(downloader.download('https://www.youtube.com/watch?v=test123', metadata))
        .rejects.toThrow('Downloaded video file not found');
    });

    it('should create safe filenames', async () => {
      const metadata = {
        id: 'test123',
        title: 'Test Video: "Special" Characters/And\\More!'
      };

      const mockSubprocess = Promise.resolve();
      (mockSubprocess as any).stdout = { on: jest.fn() };
      mockExec.mockReturnValue(mockSubprocess);
      
      // Based on the actual filename sanitization logic: removes <>"/:*?|\ chars, converts spaces to _
      mockReaddir.mockResolvedValue(['Test_Video_Special_CharactersAndMore!-test123.mp4']);

      await downloader.download('https://www.youtube.com/watch?v=test123', metadata);

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          output: expect.stringContaining('Test_Video_Special_CharactersAndMore!-test123')
        })
      );
    });
  });
});