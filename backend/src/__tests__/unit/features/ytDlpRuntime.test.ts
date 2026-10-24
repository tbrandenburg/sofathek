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

  it('resolves the executable from the pinned app runtime directory', () => {
    const binaryPath = getYtDlpBinaryPath('darwin');
    expect(binaryPath).toMatch(/\.runtime[/\\]yt-dlp[/\\]2026\.10\.21[/\\]yt-dlp$/);
  });
});
