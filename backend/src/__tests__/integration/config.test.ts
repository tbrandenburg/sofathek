jest.mock('dotenv/config', () => ({}));
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('defaults and environment handling', () => {
    let fakeHome: string;
    let homedirSpy: jest.SpyInstance;

    beforeEach(() => {
      // Isolate os.homedir() to a throwaway temp dir so these tests never
      // create real directories under the developer's/CI's actual home dir.
      fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'sofathek-config-home-'));
      homedirSpy = jest.spyOn(os, 'homedir').mockReturnValue(fakeHome);
    });

    afterEach(() => {
      homedirSpy.mockRestore();
      fs.rmSync(fakeHome, { recursive: true, force: true });
    });

    it('uses fallback directories when variables are missing in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.VIDEOS_DIR;
      delete process.env.VIDEOS_PATH;
      delete process.env.TEMP_DIR;

      let loadedConfig: any;
      jest.isolateModules(() => {
        loadedConfig = require('../../config').config;
      });

      const expectedDataDir = path.join(fakeHome, '.local', 'share', 'sofathek', 'data');
      expect(loadedConfig.nodeEnv).toBe('production');
      expect(loadedConfig.videosDir).toBe(path.join(expectedDataDir, 'videos'));
      expect(loadedConfig.tempDir).toBe(path.join(expectedDataDir, 'temp'));
    });

    it('uses fallback directories in development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.VIDEOS_DIR;
      delete process.env.VIDEOS_PATH;
      delete process.env.TEMP_DIR;

      let loadedConfig: any;
      jest.isolateModules(() => {
        loadedConfig = require('../../config').config;
      });

      const expectedDataDir = path.join(fakeHome, '.local', 'share', 'sofathek', 'data');
      expect(loadedConfig.nodeEnv).toBe('development');
      expect(loadedConfig.videosDir).toBe(path.join(expectedDataDir, 'videos'));
      expect(loadedConfig.tempDir).toBe(path.join(expectedDataDir, 'temp'));
    });
  });

  describe('directory validation with real filesystem', () => {
    let tmpRoot: string;

    beforeEach(() => {
      tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sofathek-config-test-'));
    });

    afterEach(() => {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    });

    it('prefers VIDEOS_DIR/TEMP_DIR env vars over the default', () => {
      const videos = path.join(tmpRoot, 'custom-videos');
      const temp = path.join(tmpRoot, 'custom-temp');
      process.env.VIDEOS_DIR = videos;
      process.env.TEMP_DIR = temp;

      let loadedConfig: any;
      jest.isolateModules(() => {
        loadedConfig = require('../../config').config;
      });

      expect(loadedConfig.videosDir).toBe(videos);
      expect(loadedConfig.tempDir).toBe(temp);
    });

    it('succeeds when the configured dir is a valid symlink pointing to a real directory', () => {
      const realDir = path.join(tmpRoot, 'real-videos');
      const linkDir = path.join(tmpRoot, 'linked-videos');
      fs.mkdirSync(realDir, { recursive: true });
      fs.symlinkSync(realDir, linkDir);

      process.env.VIDEOS_DIR = linkDir;
      process.env.TEMP_DIR = path.join(tmpRoot, 'temp');

      let loadedConfig: any;
      expect(() => {
        jest.isolateModules(() => {
          loadedConfig = require('../../config').config;
        });
      }).not.toThrow();

      expect(loadedConfig.videosDir).toBe(linkDir);
    });

    it('throws a clear error when the configured dir is a broken symlink', () => {
      const missingTarget = path.join(tmpRoot, 'does-not-exist');
      const linkDir = path.join(tmpRoot, 'broken-link');
      fs.symlinkSync(missingTarget, linkDir);

      process.env.VIDEOS_DIR = linkDir;
      process.env.TEMP_DIR = path.join(tmpRoot, 'temp');

      expect(() => {
        jest.isolateModules(() => {
          require('../../config');
        });
      }).toThrow(/broken symlink/i);
    });

    it('succeeds (no throw) when the configured dir exists but is empty', () => {
      const emptyDir = path.join(tmpRoot, 'empty-videos');
      fs.mkdirSync(emptyDir, { recursive: true });

      process.env.VIDEOS_DIR = emptyDir;
      process.env.TEMP_DIR = path.join(tmpRoot, 'temp');

      expect(() => {
        jest.isolateModules(() => {
          require('../../config');
        });
      }).not.toThrow();
    });
  });
});
