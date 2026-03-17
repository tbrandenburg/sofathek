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

/**
 * Validates that a target path is within an allowed directory.
 * Internally normalizes the targetPath using path.resolve() for consistent behavior.
 * 
 * @param targetPath - The file path to validate (will be normalized internally)
 * @param allowedDir - The allowed directory path (should be pre-resolved)
 */
export function validatePathInDirectory(targetPath: string, allowedDir: string): void {
  const resolvedPath = path.resolve(targetPath);
  const resolvedDir = path.resolve(allowedDir);
  
  if (!resolvedPath.startsWith(resolvedDir + path.sep) && resolvedPath !== resolvedDir) {
    throw new AppError('Invalid path', 403);
  }
}