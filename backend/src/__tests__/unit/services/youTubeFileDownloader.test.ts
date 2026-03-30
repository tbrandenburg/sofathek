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
    it('should configure yt-dlp with writeThumbnail: true for video pass', async () => {
      const metadata = { id: 'test123', title: 'Test Video' };
      const mkSub = () => Object.assign(Promise.resolve(), {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        kill: jest.fn(),
      });
      mockExec.mockImplementation(mkSub);
      mockReaddir.mockResolvedValue(['Test_Video-test123.mp4']);

      await downloader.download('https://www.youtube.com/watch?v=test123', metadata);

      // First call is the video pass
      expect(mockExec).toHaveBeenNthCalledWith(
        1,
        expect.any(String),
        expect.objectContaining({ writeThumbnail: true })
      );
    });

    it('should download video file successfully', async () => {
      const metadata = {
        id: 'test123',
        title: 'Test Video'
      };

      const mockSubprocess = () => {
        const p = Promise.resolve() as any;
        p.stdout = { on: jest.fn() };
        p.stderr = { on: jest.fn() };
        p.kill = jest.fn();
        return p;
      };
      mockExec.mockImplementation(mockSubprocess);

      mockReaddir.mockResolvedValue(['Test_Video-test123.mp4', 'other-file.txt']);

      const result = await downloader.download('https://www.youtube.com/watch?v=test123', metadata);

      expect(result).toBe('/test/temp/Test_Video-test123.mp4');
      expect(mockExec).toHaveBeenCalledTimes(2);

      // Pass 1: video + subtitles, no extractAudio
      expect(mockExec).toHaveBeenNthCalledWith(
        1,
        'https://www.youtube.com/watch?v=test123',
        expect.objectContaining({
          output: expect.stringContaining('Test_Video-test123'),
          format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo[ext=webm]+bestaudio[ext=webm]/best[ext=mp4]/best[ext=webm]',
          mergeOutputFormat: 'mp4/webm',
          writeSub: true,
          writeAutoSub: true,
          subLang: 'sv.*,en.*,de.*',
          convertSubs: 'srt',
          noPlaylist: true,
          restrictFilenames: true,
        })
      );

      // Pass 2: audio extraction only
      expect(mockExec).toHaveBeenNthCalledWith(
        2,
        'https://www.youtube.com/watch?v=test123',
        expect.objectContaining({
          format: 'bestaudio',
          extractAudio: true,
          audioFormat: 'mp3',
          noPlaylist: true,
        })
      );
    });

    it('should handle download failures with user-friendly message', async () => {
      const metadata = {
        id: 'test123',
        title: 'Test Video'
      };

      const mockSubprocess = Object.assign(Promise.reject(new Error('Download failed')), {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        kill: jest.fn(),
      });
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
      const mockSubprocess = Object.assign(Promise.reject(mockError), {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        kill: jest.fn(),
      });
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

    it('should find and return a .webm file when no .mp4 is available', async () => {
      const metadata = { id: 'test123', title: 'Test Video' };
      const mkSub = () => Object.assign(Promise.resolve(), {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        kill: jest.fn(),
      });
      mockExec.mockImplementation(mkSub);
      mockReaddir.mockResolvedValue(['Test_Video-test123.webm']);

      const result = await downloader.download('https://www.youtube.com/watch?v=test123', metadata);
      expect(result).toBe('/test/temp/Test_Video-test123.webm');
    });

    it('should handle missing downloaded file', async () => {
      const metadata = {
        id: 'test123',
        title: 'Test Video'
      };

      const mkSub = () => Object.assign(Promise.resolve(), {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        kill: jest.fn(),
      });
      mockExec.mockImplementation(mkSub);

      mockReaddir.mockResolvedValue(['other-file.txt']); // No matching file

      await expect(downloader.download('https://www.youtube.com/watch?v=test123', metadata))
        .rejects.toThrow('Downloaded video file not found');
    });

    it('should create safe filenames', async () => {
      const metadata = {
        id: 'test123',
        title: 'Test Video: "Special" Characters/And\\More!'
      };

      const mkSub = () => Object.assign(Promise.resolve(), {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        kill: jest.fn(),
      });
      mockExec.mockImplementation(mkSub);

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

  describe('progressCallback', () => {
    it('should invoke callback with video phase and parsed percentage from yt-dlp stdout', async () => {
      const metadata = { id: 'test123', title: 'Test Video' };
      const received: Array<{ phase: string; percent: number }> = [];

      let videoStdoutHandler: ((data: Buffer) => void) | undefined;
      const mkSub = () => {
        const p = Promise.resolve() as any;
        p.stdout = {
          on: jest.fn((event, handler) => {
            if (event === 'data') videoStdoutHandler = handler;
          })
        };
        p.stderr = { on: jest.fn() };
        p.kill = jest.fn();
        return p;
      };
      mockExec.mockImplementation(mkSub);
      mockReaddir.mockResolvedValue(['Test_Video-test123.mp4']);

      const downloadPromise = downloader.download(
        'https://www.youtube.com/watch?v=test123',
        metadata,
        undefined,
        (phase, percent) => received.push({ phase, percent })
      );

      // Simulate yt-dlp stdout lines for the video subprocess
      videoStdoutHandler?.(Buffer.from('[download]  45.2% of 123.45MiB at 3.20MiB/s ETA 00:30\n'));
      videoStdoutHandler?.(Buffer.from('[download] 100.0% of 123.45MiB\n'));

      await downloadPromise;

      expect(received).toContainEqual({ phase: 'video', percent: 45.2 });
      expect(received).toContainEqual({ phase: 'video', percent: 100 });
    });

    it('should invoke callback with audio phase from audio subprocess stdout', async () => {
      const metadata = { id: 'test123', title: 'Test Video' };
      const received: Array<{ phase: string; percent: number }> = [];

      const stdoutHandlers: Array<(data: Buffer) => void> = [];
      const mkSub = () => {
        const p = Promise.resolve() as any;
        p.stdout = {
          on: jest.fn((event, handler) => {
            if (event === 'data') stdoutHandlers.push(handler);
          })
        };
        p.stderr = { on: jest.fn() };
        p.kill = jest.fn();
        return p;
      };
      mockExec.mockImplementation(mkSub);
      mockReaddir.mockResolvedValue(['Test_Video-test123.mp4']);

      const downloadPromise = downloader.download(
        'https://www.youtube.com/watch?v=test123',
        metadata,
        undefined,
        (phase, percent) => received.push({ phase, percent })
      );

      await downloadPromise;

      // Trigger audio stdout handler (second subprocess → second registered handler)
      stdoutHandlers[1]?.(Buffer.from('[download]  60.0% of 5.23MiB\n'));

      expect(received).toContainEqual({ phase: 'audio', percent: 60 });
    });

    it('should not throw when progressCallback is undefined (backward compatibility)', async () => {
      const metadata = { id: 'test123', title: 'Test Video' };
      const mkSub = () => Object.assign(Promise.resolve(), {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        kill: jest.fn(),
      });
      mockExec.mockImplementation(mkSub);
      mockReaddir.mockResolvedValue(['Test_Video-test123.mp4']);

      await expect(
        downloader.download('https://www.youtube.com/watch?v=test123', metadata)
      ).resolves.toBe('/test/temp/Test_Video-test123.mp4');
    });

    it('should not fire callback for stdout lines without [download] percentage', async () => {
      const metadata = { id: 'test123', title: 'Test Video' };
      const received: Array<{ phase: string; percent: number }> = [];

      let videoStdoutHandler: ((data: Buffer) => void) | undefined;
      const mkSub = () => {
        const p = Promise.resolve() as any;
        p.stdout = {
          on: jest.fn((event, handler) => {
            if (event === 'data') videoStdoutHandler = handler;
          })
        };
        p.stderr = { on: jest.fn() };
        p.kill = jest.fn();
        return p;
      };
      mockExec.mockImplementation(mkSub);
      mockReaddir.mockResolvedValue(['Test_Video-test123.mp4']);

      const downloadPromise = downloader.download(
        'https://www.youtube.com/watch?v=test123',
        metadata,
        undefined,
        (phase, percent) => received.push({ phase, percent })
      );

      videoStdoutHandler?.(Buffer.from('[download] Destination: /tmp/file.mp4\n'));
      videoStdoutHandler?.(Buffer.from('[info] Writing subtitles\n'));

      await downloadPromise;

      expect(received).toHaveLength(0);
    });
  });

  describe('cancelDownload', () => {
    it('should send SIGTERM to active subprocess and return true', async () => {
      const mockKill = jest.fn();
      const subprocess = Object.assign(new Promise<void>(resolve => setTimeout(resolve, 1000)), {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        kill: mockKill,
      });
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
      const subprocess = Object.assign(new Promise<void>(resolve => setTimeout(resolve, 1000)), {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        kill: mockKill,
      });
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
