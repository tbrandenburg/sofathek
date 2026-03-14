jest.mock('dotenv/config', () => ({}));

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('production validation', () => {
    it('throws when required directories are missing in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.VIDEOS_DIR;
      delete process.env.TEMP_DIR;

      expect(() => {
        jest.isolateModules(() => {
          require('../../config');
        });
      }).toThrow('Missing required environment variables');
    });

    it('allows missing directories in development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.VIDEOS_DIR;
      delete process.env.TEMP_DIR;

      let loadedConfig: any;
      jest.isolateModules(() => {
        loadedConfig = require('../../config').config;
      });

      expect(loadedConfig.nodeEnv).toBe('development');
      expect(loadedConfig.videosDir).toBe('/path/to/videos');
      expect(loadedConfig.tempDir).toBe('/path/to/temp');
    });
  });
});
