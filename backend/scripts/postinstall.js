'use strict';

const fs = require('fs');
const path = require('path');

function isExecutable(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function ensureSymlink(target, linkPath, fallback) {
  if (isExecutable(linkPath)) {
    console.log(`[postinstall] ${path.basename(linkPath)} already exists and is executable`);
    return;
  }

  console.log(`[postinstall] ${path.basename(linkPath)} not found or not executable, creating symlink...`);
  try {
    fs.mkdirSync(path.dirname(linkPath), { recursive: true });
    // Remove stale non-executable file before symlinking
    try { fs.unlinkSync(linkPath); } catch { /* not present */ }
    fs.symlinkSync(fallback, linkPath);
    console.log(`[postinstall] Symlink created: ${linkPath} -> ${fallback}`);
  } catch (err) {
    console.warn(`[postinstall] WARNING: Failed to create symlink for ${path.basename(linkPath)}: ${err.message}`);
  }
}

// yt-dlp from youtube-dl-exec
const ytDlp = path.join(__dirname, '../node_modules/youtube-dl-exec/bin/yt-dlp');
ensureSymlink('/usr/local/bin/yt-dlp', ytDlp, '/usr/local/bin/yt-dlp');

// ffmpeg from ffmpeg-static (optional — package may not resolve a path)
try {
  const ffmpegStatic = require('ffmpeg-static');
  if (ffmpegStatic) {
    ensureSymlink('/usr/bin/ffmpeg', ffmpegStatic, '/usr/bin/ffmpeg');
  }
} catch {
  // ffmpeg-static not installed or path unavailable — skip silently
}
