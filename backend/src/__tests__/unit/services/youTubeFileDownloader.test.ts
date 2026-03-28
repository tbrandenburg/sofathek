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
          format: 'bestvideo+bestaudio',
          mergeOutputFormat: 'mp4',
          extractAudio: true,
          audioFormat: 'mp3',
          writeSub: true,
          writeAutoSub: true,
          subLang: 'sv.*,en.*,de.*',
          convertSubs: 'srt',
          noPlaylist: true,
          restrictFilenames: true,
          noWarnings: true
        })
      );
    });

    it('should handle download failures with user-friendly message', async () => {
      const metadata = {
        id: 'test123',
        title: 'Test Video'
      };

      const mockSubprocess = Promise.reject(new Error('Download failed'));
      (mockSubprocess as any).stdout = { on: jest.fn() };
      mockExec.mockReturnValue(mockSubprocess);

      // Should throw a user-friendly error (not the raw internal message)
      await expect(downloader.download('https://www.youtube.com/watch?v=test123', metadata))
        .rejects.toThrow();
    });

    it('should not expose internal paths or CLI arguments in error', async () => {
      const metadata = {
        id: 'test123',
        title: 'Test Video'
      };

      const internalPath = '/home/app/node_modules/yt-dlp/yt_dlp/__main__.py';
      const mockError = new Error(`yt-dlp failed: ${internalPath} --no-warnings`);
      const mockSubprocess = Promise.reject(mockError);
      (mockSubprocess as any).stdout = { on: jest.fn() };
      mockExec.mockReturnValue(mockSubprocess);

      try {
        await downloader.download('https://www.youtube.com/watch?v=test123', metadata);
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.message).not.toContain('/home/app');
        expect(error.message).not.toContain('node_modules');
        expect(error.message).not.toContain('yt-dlp');
      }
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

  describe('cancelDownload', () => {
    it('should send SIGTERM to active subprocess and return true', async () => {
      const mockKill = jest.fn();
      const subprocess = new Promise<void>(resolve => setTimeout(resolve, 1000)) as any;
      subprocess.stdout = { on: jest.fn() };
      subprocess.kill = mockKill;
      mockExec.mockReturnValue(subprocess);
      mockReaddir.mockResolvedValue(['Test_Video-test123.mp4']);

      // Start the download without awaiting so it stays active
      const downloadPromise = downloader.download(
        'https://www.youtube.com/watch?v=test123',
        { id: 'test123', title: 'Test Video' },
        'my-cancel-key'
      );

      const cancelled = await downloader.cancelDownload('my-cancel-key');

      expect(cancelled).toBe(true);
      expect(mockKill).toHaveBeenCalledWith('SIGTERM');

      // Clean up the hanging promise
      await downloadPromise.catch(() => {});
    });

    it('should return false for unknown downloadId', async () => {
      const cancelled = await downloader.cancelDownload('does-not-exist');
      expect(cancelled).toBe(false);
    });

    it('should return false when called twice for same downloadId', async () => {
      const mockKill = jest.fn();
      const subprocess = new Promise<void>(resolve => setTimeout(resolve, 1000)) as any;
      subprocess.stdout = { on: jest.fn() };
      subprocess.kill = mockKill;
      mockExec.mockReturnValue(subprocess);
      mockReaddir.mockResolvedValue(['Test_Video-test123.mp4']);

      const downloadPromise = downloader.download(
        'https://www.youtube.com/watch?v=test123',
        { id: 'test123', title: 'Test Video' },
        'cancel-once-key'
      );

      await downloader.cancelDownload('cancel-once-key');
      const second = await downloader.cancelDownload('cancel-once-key');

      expect(second).toBe(false);
      expect(mockKill).toHaveBeenCalledTimes(1);

      await downloadPromise.catch(() => {});
    });
  });
});
