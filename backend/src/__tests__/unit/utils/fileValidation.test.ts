import { validatePathInDirectory } from '../../../utils/fileValidation';

describe('fileValidation', () => {
  describe('validatePathInDirectory', () => {
    const allowedDir = '/allowed/dir';

    it('should allow path within allowed directory', () => {
      expect(() => validatePathInDirectory('/allowed/dir/file.txt', allowedDir)).not.toThrow();
    });

    it('should allow exact allowed directory', () => {
      expect(() => validatePathInDirectory(allowedDir, allowedDir)).not.toThrow();
    });

    it('should reject path outside allowed directory', () => {
      expect(() => validatePathInDirectory('/other/dir/file.txt', allowedDir)).toThrow('Invalid path');
    });

    it('should reject path with directory traversal', () => {
      expect(() => validatePathInDirectory('/allowed/dir/../../../etc/passwd', allowedDir)).toThrow('Invalid path');
    });

    it('should normalize paths before validation', () => {
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