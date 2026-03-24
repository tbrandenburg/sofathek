import request from 'supertest';
import express from 'express';
import * as fs from 'node:fs/promises';
import * as os from 'os';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

const execFileAsync = promisify(execFile);

const TEST_CONFIG = {
  TEST_VIDEO_URL: process.env.TEST_YOUTUBE_URL || 'https://www.youtube.com/watch?v=m3fqyXZ4k4I',
  INVALID_URL: 'https://example.com/not-youtube',
  POLL_INTERVAL_MS: 5000,
  DOWNLOAD_TIMEOUT_MS: 90000,
  MAX_RETRIES: 3,
};

type AppModules = {
  app: express.Application;
  videosDir: string;
};

async function isYtDlpAvailable(): Promise<boolean> {
  try {
    await execFileAsync('yt-dlp', ['--version']);
    return true;
  } catch {
    return false;
  }
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = TEST_CONFIG.MAX_RETRIES,
  baseDelay: number = 5000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`Attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, baseDelay * attempt));
      }
    }
  }
  
  throw lastError;
}

async function createIsolatedApp(): Promise<AppModules> {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sofathek-youtube-integration-'));
  const videosDir = path.join(tempRoot, 'videos');
  const tempDir = path.join(tempRoot, 'temp');

  await fs.mkdir(videosDir, { recursive: true });
  await fs.mkdir(tempDir, { recursive: true });

  process.env.VIDEOS_DIR = videosDir;
  process.env.TEMP_DIR = tempDir;

  jest.resetModules();
  jest.unmock('fs/promises');
  jest.unmock('node:fs/promises');
  jest.unmock('youtube-dl-exec');
  jest.unmock('ffmpeggy');

  const { default: youtubeRouter } = await import('../../../routes/youtube');
  const { globalErrorHandler } = await import('../../../middleware/errorHandler');

  const app = express();
  app.use(express.json());
  app.use('/api/youtube', youtubeRouter);
  app.use(globalErrorHandler);

  return {
    app,
    videosDir,
  };
}

async function waitForDownloadCompletion(
  app: express.Application,
  queueItemId: string
): Promise<request.Response> {
  const start = Date.now();

  while (Date.now() - start < TEST_CONFIG.DOWNLOAD_TIMEOUT_MS) {
    await new Promise((resolve) => setTimeout(resolve, TEST_CONFIG.POLL_INTERVAL_MS));

    const statusResponse = await request(app).get(`/api/youtube/download/${queueItemId}/status`);
    const status = statusResponse.body?.data?.status as string | undefined;

    if (status === 'completed') {
      return statusResponse;
    }

    if (status === 'failed') {
      const error = statusResponse.body?.data?.error || 'Unknown download error';
      throw new Error(`Download failed for queue item ${queueItemId}: ${String(error)}`);
    }
  }

  throw new Error(`Timed out waiting for queue item ${queueItemId} to complete`);
}

describe('Video Download Integration (Real)', () => {
  const suite = describe;  // Always run - tests are now valid for any HTTP/HTTPS URL

  suite('real API and download workflow', () => {
    let app: express.Application;
    let videosDir: string;

    beforeAll(async () => {
      if (!(await isYtDlpAvailable())) {
        throw new Error('yt-dlp is not available in PATH. Install yt-dlp or set RUN_REAL_DOWNLOAD_TESTS=false (or omit the flag).');
      }

      const modules = await createIsolatedApp();
      app = modules.app;
      videosDir = modules.videosDir;
    });

    afterAll(async () => {
      if (videosDir) {
        const testRoot = path.dirname(videosDir);
        await fs.rm(testRoot, { recursive: true, force: true });
      }

      delete process.env.VIDEOS_DIR;
      delete process.env.TEMP_DIR;
    });

    it('downloads a real YouTube video and writes an mp4 file', async () => {
      await retryWithBackoff(async () => {
        const initialFiles = await fs.readdir(videosDir);

        const response = await request(app)
          .post('/api/youtube/download')
          .send({ url: TEST_CONFIG.TEST_VIDEO_URL })
          .timeout(TEST_CONFIG.DOWNLOAD_TIMEOUT_MS);

        expect(response.status).toBe(201);
        expect(response.body.status).toBe('success');

        const queueItemId = response.body.data?.queueItem?.id as string | undefined;
        expect(queueItemId).toBeDefined();

        const statusResponse = await waitForDownloadCompletion(app, queueItemId as string);
        expect(statusResponse.status).toBe(200);
        expect(statusResponse.body.data.status).toBe('completed');

        const finalFiles = await fs.readdir(videosDir);
        const initialMp4 = initialFiles.filter((file) => file.endsWith('.mp4'));
        const finalMp4 = finalFiles.filter((file) => file.endsWith('.mp4'));

        expect(finalMp4.length).toBeGreaterThan(initialMp4.length);
      });
    }, TEST_CONFIG.DOWNLOAD_TIMEOUT_MS + 30000);

    it('accepts any valid HTTP/HTTPS URL', async () => {
      const response = await request(app)
        .post('/api/youtube/download')
        .send({ url: TEST_CONFIG.INVALID_URL })
        .timeout(TEST_CONFIG.DOWNLOAD_TIMEOUT_MS);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
    });

    it('exposes metadata on completed download status', async () => {
      await retryWithBackoff(async () => {
        const response = await request(app)
          .post('/api/youtube/download')
          .send({ url: TEST_CONFIG.TEST_VIDEO_URL })
          .timeout(TEST_CONFIG.DOWNLOAD_TIMEOUT_MS);

        expect(response.status).toBe(201);

        const queueItemId = response.body.data?.queueItem?.id as string | undefined;
        expect(queueItemId).toBeDefined();

        const statusResponse = await waitForDownloadCompletion(app, queueItemId as string);
        const metadata = statusResponse.body.data?.result?.metadata;

        expect(metadata).toBeDefined();
        expect(typeof metadata.id).toBe('string');
        expect(typeof metadata.title).toBe('string');
        expect(metadata.title.length).toBeGreaterThan(0);
      });
    }, TEST_CONFIG.DOWNLOAD_TIMEOUT_MS + 30000);

    it('returns live queue status fields', async () => {
      const response = await request(app).get('/api/youtube/queue');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('totalItems');
      expect(response.body.data).toHaveProperty('processing');
      expect(response.body.data).toHaveProperty('completed');
    });
  });
});
