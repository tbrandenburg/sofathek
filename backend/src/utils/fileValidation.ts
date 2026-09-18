// New file - file validation utilities
import path from 'path';
import { AppError } from '../middleware/errorHandler';

export const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.m4v'];
export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const DOWNLOADABLE_EXTENSIONS = [...VIDEO_EXTENSIONS, '.mp3', '.m4a', '.srt'];

export const MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv',
  '.mkv': 'video/x-matroska',
  '.m4v': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.srt': 'application/x-subrip',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
};

export function getMimeType(extension: string, fallback: string): string {
  const normalized = extension.toLowerCase();
  return MIME_TYPES[normalized] || fallback;
}

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

export function validateDownloadableFilename(filename: string): void {
  validateFilename(filename, DOWNLOADABLE_EXTENSIONS);
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
