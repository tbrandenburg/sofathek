describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should use VIDEOS_DIR when set', () => {
    process.env.VIDEOS_DIR = '/custom/videos';

    jest.isolateModules(() => {
      const { config } = require('../../config');
      expect(config.videosDir).toBe('/custom/videos');
    });
  });

  it('should fallback to VIDEOS_PATH when VIDEOS_DIR is not set', () => {
    delete process.env.VIDEOS_DIR;
    process.env.VIDEOS_PATH = '/fallback/videos';

    jest.isolateModules(() => {
      const { config } = require('../../config');
      expect(config.videosDir).toBe('/fallback/videos');
    });
  });

  it('should parse PORT as integer', () => {
    process.env.SOFATHEK_BACKEND_PORT = '4000';

    jest.isolateModules(() => {
      const { config } = require('../../config');
      expect(config.port).toBe(4000);
    });
  });

  it('should use default PORT when invalid', () => {
    process.env.SOFATHEK_BACKEND_PORT = 'invalid';

    jest.isolateModules(() => {
      const { config } = require('../../config');
      expect(config.port).toBe(3010);
    });
  });

  it('should parse VIDEO_MAX_AGE_DAYS as a positive integer', () => {
    process.env.VIDEO_MAX_AGE_DAYS = '14';

    jest.isolateModules(() => {
      const { config } = require('../../config');
      expect(config.videoMaxAgeDays).toBe(14);
    });
  });

  it('should use default VIDEO_MAX_AGE_DAYS when invalid or destructive', () => {
    for (const value of ['invalid', '0', '-1']) {
      jest.resetModules();
      process.env = { ...originalEnv, VIDEO_MAX_AGE_DAYS: value };

      jest.isolateModules(() => {
        const { config } = require('../../config');
        expect(config.videoMaxAgeDays).toBe(30);
      });
    }
  });
});
