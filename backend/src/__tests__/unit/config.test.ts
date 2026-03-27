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
});
