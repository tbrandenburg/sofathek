import { validateFilename, validateVideoFilename, validateImageFilename, validatePathInDirectory } from '../../../utils/fileValidation';
import { AppError } from '../../../middleware/errorHandler';
import path from 'path';
import os from 'os';

describe('fileValidation utilities', () => {
  const tempDir = os.tmpdir();

  describe('validateFilename', () => {
    it('should accept valid video filename', () => {
      expect(() => validateFilename('video.mp4', ['.mp4', '.webm'])).not.toThrow();
    });

    it('should accept valid image filename', () => {
      expect(() => validateFilename('image.jpg', ['.jpg', '.png'])).not.toThrow();
    });

    it('should throw on empty filename', () => {
      expect(() => validateFilename('', ['.mp4'])).toThrow(AppError);
      expect(() => validateFilename('', ['.mp4'])).toThrow('Filename parameter is required');
    });

    it('should throw on path traversal attempt', () => {
      expect(() => validateFilename('../etc/passwd', ['.mp4'])).toThrow(AppError);
      expect(() => validateFilename('../etc/passwd', ['.mp4'])).toThrow('Invalid filename');
    });

    it('should throw on absolute path', () => {
      expect(() => validateFilename('/etc/passwd', ['.mp4'])).toThrow(AppError);
      expect(() => validateFilename('/etc/passwd', ['.mp4'])).toThrow('Invalid filename');
    });

    it('should throw on invalid extension', () => {
      expect(() => validateFilename('file.exe', ['.mp4', '.webm'])).toThrow(AppError);
      expect(() => validateFilename('file.exe', ['.mp4', '.webm'])).toThrow('Invalid file type');
    });

    it('should be case insensitive for extensions', () => {
      expect(() => validateFilename('video.MP4', ['.mp4'])).not.toThrow();
    });
  });

  describe('validateVideoFilename', () => {
    it('should accept valid video extensions', () => {
      const validExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.m4v'];
      validExtensions.forEach(ext => {
        expect(() => validateVideoFilename(`video${ext}`)).not.toThrow();
      });
    });

    it('should reject image extension', () => {
      expect(() => validateVideoFilename('image.jpg')).toThrow(AppError);
      expect(() => validateVideoFilename('image.jpg')).toThrow('Invalid file type');
    });
  });

  describe('validateImageFilename', () => {
    it('should accept valid image extensions', () => {
      expect(() => validateImageFilename('image.jpg')).not.toThrow();
      expect(() => validateImageFilename('image.jpeg')).not.toThrow();
      expect(() => validateImageFilename('image.png')).not.toThrow();
      expect(() => validateImageFilename('image.webp')).not.toThrow();
    });

    it('should reject video extension', () => {
      expect(() => validateImageFilename('video.mp4')).toThrow(AppError);
      expect(() => validateImageFilename('video.mp4')).toThrow('Invalid file type');
    });
  });

  describe('validatePathInDirectory', () => {
    it('should accept path inside allowed directory', () => {
      const allowedDir = tempDir;
      const validPath = path.join(allowedDir, 'subfolder', 'file.mp4');
      expect(() => validatePathInDirectory(validPath, allowedDir)).not.toThrow();
    });

    it('should accept path equal to allowed directory', () => {
      expect(() => validatePathInDirectory(tempDir, tempDir)).not.toThrow();
    });

    it('should reject path outside allowed directory', () => {
      const allowedDir = tempDir;
      const invalidPath = '/etc/passwd';
      expect(() => validatePathInDirectory(invalidPath, allowedDir)).toThrow(AppError);
      expect(() => validatePathInDirectory(invalidPath, allowedDir)).toThrow('Invalid path');
    });

    it('should reject path with path traversal', () => {
      const allowedDir = tempDir;
      const invalidPath = path.join(tempDir, '..', '..', 'etc', 'passwd');
      expect(() => validatePathInDirectory(invalidPath, allowedDir)).toThrow(AppError);
    });

    it('should normalize paths before validation', () => {
      const allowedDir = '/allowed/dir';
      expect(() => validatePathInDirectory('/allowed/dir/./subdir/../file.txt', allowedDir)).not.toThrow();
    });

    it('should handle relative paths by resolving them', () => {
      // When we pass a relative path, it gets resolved relative to cwd
      // This test ensures the function handles this gracefully
      const relativePath = 'subdir/file.txt';
      const workingDir = process.cwd();
      expect(() => validatePathInDirectory(relativePath, workingDir)).not.toThrow();
    });
  });
});