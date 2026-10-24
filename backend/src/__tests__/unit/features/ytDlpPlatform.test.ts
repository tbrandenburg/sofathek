const { getAssetName, getExecutableName } = require('../../../../scripts/ytDlpPlatform');

describe('yt-dlp standalone platform assets', () => {
  it.each([
    ['darwin', 'arm64', 'yt-dlp_macos'],
    ['darwin', 'x64', 'yt-dlp_macos'],
    ['win32', 'x64', 'yt-dlp.exe'],
    ['win32', 'arm64', 'yt-dlp.exe'],
    ['linux', 'x64', 'yt-dlp_linux'],
    ['linux', 'arm64', 'yt-dlp_linux_aarch64'],
    ['linux', 'arm', 'yt-dlp_linux_armv7l']
  ])('maps %s/%s to the official asset %s', (platform, arch, assetName) => {
    expect(getAssetName(platform, arch)).toBe(assetName);
  });

  it('rejects unsupported platform and architecture combinations explicitly', () => {
    expect(() => getAssetName('freebsd', 'x64')).toThrow('No official yt-dlp standalone build is available');
    expect(getExecutableName('win32')).toBe('yt-dlp.exe');
    expect(getExecutableName('linux')).toBe('yt-dlp');
  });
});
