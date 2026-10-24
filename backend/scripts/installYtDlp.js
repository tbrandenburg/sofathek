'use strict';

const { createHash } = require('node:crypto');
const { chmod, mkdir, rename, rm, writeFile } = require('node:fs/promises');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { getAssetName, getExecutableName } = require('./ytDlpPlatform');

const backendRoot = path.resolve(__dirname, '..');
const { config = {} } = require(path.join(backendRoot, 'package.json'));
const version = process.env.SOFATHEK_YTDLP_VERSION || config.ytDlpVersion;

if (!version || !/^\d{4}\.\d{2}\.\d{2}$/.test(version)) {
  throw new Error('Set backend package config ytDlpVersion to a pinned stable yt-dlp release.');
}

const assetName = getAssetName();
const executableName = getExecutableName();
const installDirectory = path.join(backendRoot, '.runtime', 'yt-dlp', version);
const executablePath = path.join(installDirectory, executableName);
const releaseBaseUrl = `https://github.com/yt-dlp/yt-dlp/releases/download/${version}`;

async function fetchBuffer(url) {
  const response = await fetch(url, { redirect: 'follow' });
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

function verifyExecutable(candidatePath) {
  // The official macOS one-file build can take tens of seconds on its first
  // launch while its embedded Python runtime initializes.
  const result = spawnSync(candidatePath, ['--version'], { encoding: 'utf8', timeout: 120000 });
  const detectedVersion = result.stdout?.trim();
  if (result.error || result.status !== 0 || detectedVersion !== version) {
    throw new Error(
      `The installed yt-dlp executable could not be verified for ${process.platform}/${process.arch}` +
      (result.error ? `: ${result.error.message}` : ` (reported version: ${detectedVersion || 'unknown'})`)
    );
  }
}

async function install() {
  await mkdir(installDirectory, { recursive: true });

  try {
    verifyExecutable(executablePath);
    console.log(`[yt-dlp] ${version} is already installed for ${process.platform}/${process.arch}`);
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

  const temporaryPath = `${executablePath}.${process.pid}.tmp`;
  try {
    await writeFile(temporaryPath, binary, { mode: 0o755 });
    if (process.platform !== 'win32') await chmod(temporaryPath, 0o755);
    verifyExecutable(temporaryPath);
    await rename(temporaryPath, executablePath);
    console.log(`[yt-dlp] Installed verified ${version} for ${process.platform}/${process.arch}`);
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => {});
    throw error;
  }
}

install().catch((error) => {
  console.error(`[yt-dlp] Installation failed: ${error.message}`);
  console.error('[yt-dlp] Check network access and platform support, then rerun npm install in backend.');
  process.exitCode = 1;
});
