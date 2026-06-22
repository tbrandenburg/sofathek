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
    for (const value of ['invalid', '1abc', '0', '-1']) {
      jest.resetModules();
      process.env = { ...originalEnv, VIDEO_MAX_AGE_DAYS: value };

      jest.isolateModules(() => {
        const { config } = require('../../config');
        expect(config.videoMaxAgeDays).toBe(30);
      });
    }
  });

  it('should parse DOWNLOAD_MAX_SIZE_BYTES as a positive integer', () => {
    process.env.DOWNLOAD_MAX_SIZE_BYTES = '1073741824'; // 1GB

    jest.isolateModules(() => {
      const { config } = require('../../config');
      expect(config.downloadMaxSizeBytes).toBe(1073741824);
    });
  });

  it('should use default DOWNLOAD_MAX_SIZE_BYTES when invalid or destructive', () => {
    for (const value of ['invalid', '1abc', '0', '-1']) {
      jest.resetModules();
      process.env = { ...originalEnv, DOWNLOAD_MAX_SIZE_BYTES: value };

      jest.isolateModules(() => {
        const { config } = require('../../config');
        expect(config.downloadMaxSizeBytes).toBe(5 * 1024 * 1024 * 1024);
      });
    }
  });

  it('should use default DOWNLOAD_MAX_SIZE_BYTES when not set', () => {
    delete process.env.DOWNLOAD_MAX_SIZE_BYTES;

    jest.isolateModules(() => {
      const { config } = require('../../config');
      expect(config.downloadMaxSizeBytes).toBe(5 * 1024 * 1024 * 1024);
    });
  });
});
