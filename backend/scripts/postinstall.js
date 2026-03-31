'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function isExecutable(filePath) {
  try {
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

// yt-dlp from youtube-dl-exec
const ytDlp = path.join(ROOT, 'node_modules/youtube-dl-exec/bin/yt-dlp');
ensureSymlink(ytDlp, '/usr/local/bin/yt-dlp');

// ffmpeg from ffmpeg-static (optional — package may not resolve a path)
try {
  const ffmpegStatic = require('ffmpeg-static');
  if (ffmpegStatic) {
    ensureSymlink(ffmpegStatic, '/usr/bin/ffmpeg');
  }
} catch {
  // ffmpeg-static not installed or path unavailable — skip silently
}
