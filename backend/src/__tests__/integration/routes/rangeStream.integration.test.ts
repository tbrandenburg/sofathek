import request from 'supertest';
import express from 'express';
import * as nodeFs from 'node:fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

describe('Range streaming integration (real files)', () => {
  let app: express.Application;
  let tempRoot: string;

  const cases: Array<[string, string, number]> = [
    ['/api/stream/sample.mp4', 'video/mp4', 1024],
    ['/api/thumbnails/thumb.jpg', 'image/jpeg', 2048],
  ];

  beforeAll(async () => {
    tempRoot = await nodeFs.mkdtemp(path.join(os.tmpdir(), 'sofathek-range-'));
    const videosDir = path.join(tempRoot, 'videos');
    const tempDir = path.join(tempRoot, 'temp');
    await nodeFs.mkdir(videosDir, { recursive: true });
    await nodeFs.mkdir(tempDir, { recursive: true });
    await nodeFs.writeFile(path.join(videosDir, 'sample.mp4'), Buffer.alloc(1024, 0x4d));
    await nodeFs.writeFile(path.join(videosDir, 'thumb.jpg'), Buffer.alloc(2048, 0x42));

    process.env.VIDEOS_DIR = videosDir;
    process.env.TEMP_DIR = tempDir;
    process.env.THUMBNAIL_CACHE_DURATION = '86400';

    jest.resetModules();
    jest.unmock('fs');
    jest.unmock('fs/promises');
    jest.unmock('node:fs/promises');

    const { apiRouter } = await import('../../../features/video-library/routes');
    const { globalErrorHandler } = await import('../../../middleware/errorHandler');

    app = express();
    app.use('/api', apiRouter);
    app.use(globalErrorHandler);
  });

  afterAll(async () => {
    await nodeFs.rm(tempRoot, { recursive: true, force: true });
  });

  it.each(cases)(
    'GET %s returns the complete file with 200',
    async (endpoint, contentType, fileSize) => {
      const response = await request(app).get(endpoint).expect(200);

      expect(response.headers['content-type']).toBe(contentType);
      expect(response.headers['accept-ranges']).toBe('bytes');
      expect(response.headers['content-length']).toBe(String(fileSize));
      expect(response.headers['cache-control']).toBe('public, max-age=86400');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.body).toHaveLength(fileSize);
    },
  );

  it.each(cases)(
    'GET %s returns a 206 response for a valid range',
    async (endpoint, contentType, fileSize) => {
      const start = 0;
      const end = 127;
      const response = await request(app)
        .get(endpoint)
        .set('Range', `bytes=${start}-${end}`)
        .expect(206);

      expect(response.headers['content-type']).toBe(contentType);
      expect(response.headers['content-range']).toBe(`bytes ${start}-${end}/${fileSize}`);
      expect(response.headers['content-length']).toBe(String(end - start + 1));
      expect(response.headers['accept-ranges']).toBe('bytes');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.body).toHaveLength(end - start + 1);
    },
  );

  it.each(cases)('GET %s returns 416 for a range beyond the file', async (endpoint) => {
    const response = await request(app)
      .get(endpoint)
      .set('Range', 'bytes=999999-1000000')
      .expect(416);

    expect(response.body).toBeDefined();
  });

  it.each(cases)('GET %s returns 400 for a malformed range', async (endpoint) => {
    const response = await request(app)
      .get(endpoint)
      .set('Range', 'bytes=-')
      .expect(400);

    expect(response.body.message).toBe('Invalid range header format');
  });

  it.each(cases)('GET %s returns 400 for a non-byte or nonnumeric range', async (endpoint) => {
    const response = await request(app)
      .get(endpoint)
      .set('Range', 'items=abc-def')
      .expect(400);

    expect(response.body.message).toBe('Invalid range header format');
  });

  it.each(cases)('GET %s returns 416 for a reversed range', async (endpoint) => {
    const response = await request(app)
      .get(endpoint)
      .set('Range', 'bytes=127-0')
      .expect(416);

    expect(response.body.message).toBe('Range not satisfiable');
  });
});
