'use strict';

const fs = require('fs');
const path = require('path');

function isExecutable(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return false;
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure linkFile is an executable binary or symlink pointing to symlinkTarget.
 * If linkFile is absent or not executable, recreate it as a symlink to symlinkTarget.
 */
function ensureSymlink(linkFile, symlinkTarget) {
  if (isExecutable(linkFile)) {
    console.log(`[postinstall] ${path.basename(linkFile)} already exists and is executable`);
    return;
  }

  console.log(`[postinstall] ${path.basename(linkFile)} not found or not executable, creating symlink...`);
  try {
    fs.mkdirSync(path.dirname(linkFile), { recursive: true });
    // Remove stale non-executable file before symlinking
    try { fs.unlinkSync(linkFile); } catch { /* not present */ }
    fs.symlinkSync(symlinkTarget, linkFile);
    console.log(`[postinstall] Symlink created: ${linkFile} -> ${symlinkTarget}`);
  } catch (err) {
    console.warn(`[postinstall] WARNING: Failed to create symlink for ${path.basename(linkFile)}: ${err.message}`);
  }
}

/**
 * Resolve the actual on-disk directory of an installed npm package,
 * regardless of whether npm workspaces hoisted it to the repo root or
 * kept it local to this workspace's node_modules. Hardcoding a path
 * relative to this script (e.g. `<ROOT>/node_modules/<pkg>`) breaks
 * silently whenever hoisting changes where the package actually lands,
 * leaving a dead symlink stub that Node never resolves to.
 */
function resolvePackageDir(packageName) {
  try {
    const pkgJsonPath = require.resolve(`${packageName}/package.json`);
    return path.dirname(pkgJsonPath);
  } catch (err) {
    console.warn(`[postinstall] WARNING: Could not resolve package '${packageName}': ${err.message}`);
    return null;
  }
}

// yt-dlp from youtube-dl-exec — resolve wherever npm actually installed it
// instead of assuming it lives under this workspace's own node_modules.
const youtubeDlExecDir = resolvePackageDir('youtube-dl-exec');
if (youtubeDlExecDir) {
  const ytDlp = path.join(youtubeDlExecDir, 'bin', 'yt-dlp');
  ensureSymlink(ytDlp, '/usr/local/bin/yt-dlp');
}

// ffmpeg from ffmpeg-static (optional — package may not resolve a path)
try {
  const ffmpegStatic = require('ffmpeg-static');
  if (ffmpegStatic) {
    ensureSymlink(ffmpegStatic, '/usr/bin/ffmpeg');
  }
} catch {
  // ffmpeg-static not installed or path unavailable — skip silently
}
