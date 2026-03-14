jest.mock('dotenv/config', () => ({}));
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
    it('uses fallback directories when variables are missing in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.VIDEOS_DIR;
      delete process.env.VIDEOS_PATH;
      delete process.env.TEMP_DIR;

      let loadedConfig: any;
      jest.isolateModules(() => {
        loadedConfig = require('../../config').config;
      });

      expect(loadedConfig.nodeEnv).toBe('production');
      expect(loadedConfig.videosDir).toBe(path.join(process.cwd(), 'data', 'videos'));
      expect(loadedConfig.tempDir).toBe(path.join(process.cwd(), 'data', 'temp'));
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

      expect(loadedConfig.nodeEnv).toBe('development');
      expect(loadedConfig.videosDir).toBe(path.join(process.cwd(), 'data', 'videos'));
      expect(loadedConfig.tempDir).toBe(path.join(process.cwd(), 'data', 'temp'));
    });
  });
});
