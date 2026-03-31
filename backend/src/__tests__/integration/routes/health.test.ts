import request from 'supertest';
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('Health Route', () => {
  let app: express.Application;
  let testRootDir: string;
  const originalEnv = process.env;

  beforeEach(() => {
    testRootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sofathek-health-'));
    const videosDir = path.join(testRootDir, 'videos');
    const tempDir = path.join(testRootDir, 'temp');
    fs.mkdirSync(videosDir, { recursive: true });
    fs.mkdirSync(tempDir, { recursive: true });

    process.env = {
      ...originalEnv,
      VIDEOS_DIR: videosDir,
      TEMP_DIR: tempDir
    };

    jest.resetModules();
    const healthRouter = require('../../../routes/health').default;

    app = express();
    app.use('/', healthRouter);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = originalEnv;
    fs.rmSync(testRootDir, { recursive: true, force: true });
  });

  describe('GET /', () => {
    it('should return health check response', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body.status).toBeDefined();
      expect(response.body.service).toBe('sofathek-backend');
    });

    it('should not trigger thumbnail generation during health check', async () => {
      // Place a video file with no matching thumbnail so VideoService would call
      // generateThumbnail if a ThumbnailService were injected — making the assertion
      // genuinely load-bearing rather than vacuously true on an empty directory.
      fs.writeFileSync(path.join(testRootDir, 'videos', 'test.mp4'), '');

      // The require hits the module already loaded by beforeEach (same registry — no
      // jest.resetModules() between beforeEach and here), so the spy lands on the
      // prototype used by the running healthRouter.
      const spy = jest.spyOn(
        require('../../../services/thumbnailService').ThumbnailService.prototype,
        'generateThumbnail'
      );

      await request(app).get('/').expect(200);

      expect(spy).not.toHaveBeenCalled();
    });
  });
});
