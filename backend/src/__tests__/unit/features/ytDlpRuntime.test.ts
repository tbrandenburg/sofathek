import { getYtDlpBinaryPath, toCliArguments, verifyYtDlpRuntime } from '../../../features/youtube/ytDlpRuntime';

describe('yt-dlp runtime', () => {
  it('verifies the actual managed executable against the configured pin', async () => {
    await expect(verifyYtDlpRuntime()).resolves.toBeUndefined();
    expect(getYtDlpBinaryPath()).toContain('.runtime');
  });

  it.each([process.execPath, '/nonexistent/sofathek-yt-dlp'])('rejects an incompatible or missing executable: %s', async (candidate) => {
    await expect(verifyYtDlpRuntime(candidate)).rejects.toMatchObject({ code: 'YTDLP_RUNTIME_UNAVAILABLE' });
    await expect(verifyYtDlpRuntime(candidate)).rejects.toThrow('Run npm install');
  });

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
