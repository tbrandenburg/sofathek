import { getYtDlpBinaryPath, toCliArguments } from '../../../features/youtube/ytDlpRuntime';

describe('yt-dlp runtime', () => {
  it('converts downloader options to safe CLI arguments without a shell', () => {
    expect(toCliArguments({
      dumpSingleJson: true,
      noWarnings: true,
      jsRuntimes: 'node',
      output: '/tmp/a video.mp4',
      noPlaylist: true,
      optional: undefined
    })).toEqual([
      '--dump-single-json',
      '--no-warnings',
      '--js-runtimes', 'node',
      '--output', '/tmp/a video.mp4',
      '--no-playlist'
    ]);
  });

  it('uses the installer version override when resolving the executable', () => {
    const configuredVersion = process.env.SOFATHEK_YTDLP_VERSION;
    process.env.SOFATHEK_YTDLP_VERSION = '2026.10.22';

    try {
      expect(() => getYtDlpBinaryPath('win32')).toThrow('yt-dlp 2026.10.22 executable is missing');
    } finally {
      if (configuredVersion === undefined) delete process.env.SOFATHEK_YTDLP_VERSION;
      else process.env.SOFATHEK_YTDLP_VERSION = configuredVersion;
    }
  });
});
