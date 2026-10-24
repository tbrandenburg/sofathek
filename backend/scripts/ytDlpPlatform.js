'use strict';

function getAssetName(platform = process.platform, arch = process.arch) {
  if (platform === 'darwin') return 'yt-dlp_macos';
  if (platform === 'win32' && (arch === 'x64' || arch === 'arm64')) return 'yt-dlp.exe';
  if (platform === 'linux' && arch === 'x64') return 'yt-dlp_linux';
  if (platform === 'linux' && arch === 'arm64') return 'yt-dlp_linux_aarch64';
  if (platform === 'linux' && arch === 'arm') return 'yt-dlp_linux_armv7l';

  throw new Error(`No official yt-dlp standalone build is available for ${platform}/${arch}`);
}

function getExecutableName(platform = process.platform) {
  return platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
}

module.exports = { getAssetName, getExecutableName };
