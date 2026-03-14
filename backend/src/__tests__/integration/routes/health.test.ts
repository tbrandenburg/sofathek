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
  });
});
