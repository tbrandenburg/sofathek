// New file - file validation utilities
import path from 'path';
import { AppError } from '../middleware/errorHandler';

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.m4v'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export function validateFilename(filename: string, allowedExtensions: string[]): void {
  if (!filename) {
    throw new AppError('Filename parameter is required', 400);
  }
  if (filename.includes('..') || path.isAbsolute(filename)) {
    throw new AppError('Invalid filename', 400);
  }
  const ext = path.extname(filename).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    throw new AppError('Invalid file type', 400);
  }
}

export function validateVideoFilename(filename: string): void {
  validateFilename(filename, VIDEO_EXTENSIONS);
}

export function validateImageFilename(filename: string): void {
  validateFilename(filename, IMAGE_EXTENSIONS);
}

export function validatePathInDirectory(resolvedPath: string, allowedDir: string): void {
  if (!resolvedPath.startsWith(allowedDir + path.sep) && resolvedPath !== allowedDir) {
    throw new AppError('Invalid path', 403);
  }
}