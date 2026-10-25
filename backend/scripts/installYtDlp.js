'use strict';

const { createHash } = require('node:crypto');
const { chmod, mkdir, rename, rm, writeFile } = require('node:fs/promises');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { getAssetName, getExecutableName } = require('./ytDlpPlatform');

async function fetchBuffer(url) {
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`Download failed (${response.status}) for ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

function expectedChecksum(checksumFile, filename) {
  const line = checksumFile
    .split(/\r?\n/)
    .find((entry) => entry.trim().endsWith(` ${filename}`) || entry.trim().endsWith(` *${filename}`));
  const digest = line?.trim().split(/\s+/)[0];
  if (!digest || !/^[a-f0-9]{64}$/i.test(digest)) {
    throw new Error(`Official SHA-256 checksum for ${filename} was not found.`);
  }
  return digest.toLowerCase();
}

function verifyExecutable(candidatePath, version, platform, arch) {
  // The official macOS one-file build can take tens of seconds on its first
  // launch while its embedded Python runtime initializes.
  const result = spawnSync(candidatePath, ['--version'], { encoding: 'utf8', timeout: 120000, windowsHide: true });
  const detectedVersion = result.stdout?.trim();
  if (result.error || result.status !== 0 || detectedVersion !== version) {
    throw new Error(
      `The installed yt-dlp executable could not be verified for ${platform}/${arch}` +
      (result.error ? `: ${result.error.message}` : ` (reported version: ${detectedVersion || 'unknown'})`)
    );
  }
}

async function install({ backendRoot = path.resolve(__dirname, '..'), platform = process.platform, arch = process.arch } = {}) {
  const { config = {} } = require(path.join(backendRoot, 'package.json'));
  const version = process.env.SOFATHEK_YTDLP_VERSION || config.ytDlpVersion;
  if (!version || !/^\d{4}\.\d{2}\.\d{2}$/.test(version)) {
    throw new Error('Set backend package config ytDlpVersion or SOFATHEK_YTDLP_VERSION to a pinned stable yt-dlp release.');
  }
  const assetName = getAssetName(platform, arch);
  const installDirectory = path.join(backendRoot, '.runtime', 'yt-dlp', version);
  const executablePath = path.join(installDirectory, getExecutableName(platform));
  const releaseBaseUrl = `https://github.com/yt-dlp/yt-dlp/releases/download/${version}`;
  await mkdir(installDirectory, { recursive: true });

  try {
    verifyExecutable(executablePath, version, platform, arch);
    console.log(`[yt-dlp] ${version} is already installed for ${platform}/${arch}`);
    return;
  } catch {
    // Replace a missing, stale, or incompatible file from the pinned release.
  }

  const [binary, checksumFile] = await Promise.all([
    fetchBuffer(`${releaseBaseUrl}/${assetName}`),
    fetchBuffer(`${releaseBaseUrl}/SHA2-256SUMS`).then((buffer) => buffer.toString('utf8'))
  ]);

  const expected = expectedChecksum(checksumFile, assetName);
  const actual = createHash('sha256').update(binary).digest('hex');
  if (actual !== expected) {
    throw new Error(`SHA-256 verification failed for the official yt-dlp ${assetName} release asset.`);
  }

  // Keep the native extension while verifying, then rename within the same directory.
  const temporaryPath = `${executablePath}.${process.pid}.tmp${platform === 'win32' ? '.exe' : ''}`;
  try {
    await writeFile(temporaryPath, binary, { mode: 0o755 });
    if (platform !== 'win32') await chmod(temporaryPath, 0o755);
    verifyExecutable(temporaryPath, version, platform, arch);
    await rename(temporaryPath, executablePath);
    console.log(`[yt-dlp] Installed verified ${version} for ${platform}/${arch}`);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}

module.exports = { install };

if (require.main === module) {
  install().catch((error) => {
    console.error(`[yt-dlp] Installation failed: ${error.message}`);
    console.error('[yt-dlp] Check network access and platform support, then rerun npm install in backend.');
    process.exitCode = 1;
  });
}
