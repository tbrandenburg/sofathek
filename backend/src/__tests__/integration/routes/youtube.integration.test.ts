import request from 'supertest';
import express from 'express';
import * as fs from 'node:fs/promises';
import * as os from 'os';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { getYtDlpBinaryPath } from '../../../features/youtube/ytDlpRuntime';
import { VIDEO_DOWNLOAD_FORMAT } from '../../../features/youtube/youTubeFileDownloader';

const execFileAsync = promisify(execFile);
const previousDirectories = { videos: process.env.VIDEOS_DIR, temp: process.env.TEMP_DIR };

function restoreDirectories(): void {
  if (previousDirectories.videos === undefined) delete process.env.VIDEOS_DIR;
  else process.env.VIDEOS_DIR = previousDirectories.videos;
  if (previousDirectories.temp === undefined) delete process.env.TEMP_DIR;
  else process.env.TEMP_DIR = previousDirectories.temp;
}

const TEST_CONFIG = {
  TEST_VIDEO_URL: process.env.TEST_YOUTUBE_URL || 'https://www.youtube.com/watch?v=m3fqyXZ4k4I',
  INVALID_URL: 'https://example.com/not-youtube',
  POLL_INTERVAL_MS: 5000,
  DOWNLOAD_TIMEOUT_MS: 180000,
  MAX_RETRIES: 3,
};

type AppModules = {
  app: express.Application;
  videosDir: string;
};

async function isYtDlpAvailable(): Promise<boolean> {
  try {
    await execFileAsync(getYtDlpBinaryPath(), ['--version']);
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
  jest.unmock('../../../features/youtube/ytDlpRuntime');
  jest.unmock('ffmpeggy');

  const { default: youtubeRouter } = await import('../../../features/youtube/routes');
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
  const shouldRunRealDownloadTests = process.env.RUN_REAL_DOWNLOAD_TESTS === 'true';
  const suite = shouldRunRealDownloadTests ? describe : describe.skip;

  suite('real API and download workflow', () => {
    let app: express.Application;
    let videosDir: string;

    beforeAll(async () => {
      if (!(await isYtDlpAvailable())) {
        throw new Error('Managed yt-dlp is not available. Run npm install in backend, then set RUN_REAL_DOWNLOAD_TESTS=true.');
      }
      await execFileAsync(process.env.FFPROBE_PATH || 'ffprobe', ['-version'], { timeout: 10000 });

      const modules = await createIsolatedApp();
      app = modules.app;
      videosDir = modules.videosDir;
    });

    afterAll(async () => {
      if (videosDir) {
        const testRoot = path.dirname(videosDir);
        await fs.rm(testRoot, { recursive: true, force: true });
      }

      restoreDirectories();
    });

    it('downloads a real YouTube video and writes an mp4 file', async () => {
      const realFs = jest.requireActual<typeof import('node:fs/promises')>('node:fs/promises');
      const initialFiles = await realFs.readdir(videosDir);
      const selection = await execFileAsync(getYtDlpBinaryPath(), [
        TEST_CONFIG.TEST_VIDEO_URL, '--dump-single-json', '--skip-download', '--no-playlist',
        '--js-runtimes', 'node', '--format', VIDEO_DOWNLOAD_FORMAT
      ], { timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
      type Format = { format_id: string; vcodec: string; acodec: string; width?: number; height?: number };
      const source = JSON.parse(selection.stdout) as Format & { formats: Format[]; requested_formats?: Format[] };
      const selected = source.requested_formats || [source];
      const expectedVideo = selected.find(format => format.vcodec && format.vcodec !== 'none');
      const expectedAudio = selected.find(format => format.acodec && format.acodec !== 'none');
      expect(expectedVideo).toBeDefined();
      expect(source.formats.some(format => format.format_id === expectedVideo?.format_id)).toBe(true);

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

      const finalFiles = await realFs.readdir(videosDir);
      const initialMp4 = initialFiles.filter((file) => file.endsWith('.mp4'));
      const finalMp4 = finalFiles.filter((file) => file.endsWith('.mp4'));

      expect(finalMp4.length).toBeGreaterThan(initialMp4.length);
      const downloaded = finalMp4.filter(file => !initialMp4.includes(file));
      expect(downloaded).toHaveLength(1);
      const probe = await execFileAsync(process.env.FFPROBE_PATH || 'ffprobe', [
        '-v', 'error', '-show_streams', '-show_format', '-of', 'json', path.join(videosDir, downloaded[0]!)
      ], { timeout: 30000 });
      const media = JSON.parse(probe.stdout) as {
        streams: Array<{ codec_type: string; codec_name: string; width?: number; height?: number }>;
        format: { duration: string; format_name: string };
      };
      const video = media.streams.find(stream => stream.codec_type === 'video');
      const audio = media.streams.find(stream => stream.codec_type === 'audio');
      const codecName = (codec: string): string => {
        const names: Record<string, string> = { avc1: 'h264', av01: 'av1', vp09: 'vp9', mp4a: 'aac', hev1: 'hevc', hvc1: 'hevc' };
        const prefix = codec.split('.')[0]!;
        return names[prefix] || prefix;
      };
      expect(video).toBeDefined();
      expect(video?.width).toBeGreaterThan(0);
      expect(video?.height).toBeGreaterThan(0);
      expect(video?.codec_name).toBe(codecName(expectedVideo!.vcodec));
      expect(video?.width).toBe(expectedVideo!.width);
      expect(video?.height).toBe(expectedVideo!.height);
      expect(Number(media.format.duration)).toBeGreaterThan(0);
      expect(media.format.format_name.split(',')).toContain('mp4');
      if (expectedAudio) {
        expect(audio).toBeDefined();
        expect(audio?.codec_name).toBe(codecName(expectedAudio.acodec));
      }
      process.stdout.write(`Verified downloaded media: ${JSON.stringify({
        videoCodec: video?.codec_name, audioCodec: audio?.codec_name,
        width: video?.width, height: video?.height,
        selectedFormats: selected.map(format => format.format_id), duration: media.format.duration
      })}\n`);
    }, 240000);

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

describe('managed runtime preflight (no external network)', () => {
  let modules: AppModules;
  const override = process.env.SOFATHEK_YTDLP_VERSION;

  beforeAll(async () => {
    modules = await createIsolatedApp();
  });

  afterAll(async () => {
    await fs.rm(path.dirname(modules.videosDir), { recursive: true, force: true });
    restoreDirectories();
    if (override === undefined) delete process.env.SOFATHEK_YTDLP_VERSION;
    else process.env.SOFATHEK_YTDLP_VERSION = override;
  });

  it.each(['1900.00.00', '../latest'])('rejects missing or invalid pin %s without queueing', async (version) => {
    process.env.SOFATHEK_YTDLP_VERSION = version;
    const response = await request(modules.app).post('/api/youtube/download')
      .send({ url: TEST_CONFIG.TEST_VIDEO_URL });
    expect(response.status).toBe(500);
    expect(response.body.code).toBe('YTDLP_RUNTIME_UNAVAILABLE');
    expect(response.body.message).toMatch(/npm install|pinned stable/);
    const queue = await request(modules.app).get('/api/youtube/queue');
    expect(queue.status).toBe(200);
    expect(queue.body.data.totalItems).toBe(0);
    expect(queue.body.data.items).toEqual([]);
  });
});
