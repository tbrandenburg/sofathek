/**
 * E2E Integration Test: Auto-thumbnail-regeneration on library scan
 *
 * Tests the full chain:
 *   missing thumbnail → GET /api/videos scan → inline regeneration (real ffmpeg) → thumbnail present in response and on disk
 *
 * Uses real filesystem and real ffmpeg (no mocking).
 * Addresses issue #266 — explicit acceptance criterion for PR #265.
 */

import request from 'supertest';
import express from 'express';
import * as nodeFs from 'node:fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

// Source video fixture — 16 MB, no dependencies; small enough for CI
const SOURCE_VIDEO = path.resolve(__dirname, '../../../data/videos/Lavar.mp4');

const REGEN_TIMEOUT_MS = 30_000;

describe('Auto-thumbnail-regeneration integration', () => {
  let app: express.Application;
  let videosDir: string;
  let tempDir: string;
  let testVideoPath: string;

  beforeAll(async () => {
    // Create isolated temporary directories
    const tempRoot = await nodeFs.mkdtemp(path.join(os.tmpdir(), 'sofathek-thumb-regen-'));
    videosDir = path.join(tempRoot, 'videos');
    tempDir   = path.join(tempRoot, 'temp');
    await nodeFs.mkdir(videosDir, { recursive: true });
    await nodeFs.mkdir(tempDir, { recursive: true });

    // Copy fixture video into temp videos dir (no .jpg alongside it)
    testVideoPath = path.join(videosDir, 'Lavar.mp4');
    await nodeFs.copyFile(SOURCE_VIDEO, testVideoPath);

    // Wire env vars so config picks up our temp dirs
    process.env.VIDEOS_DIR = videosDir;
    process.env.TEMP_DIR   = tempDir;
    // Do NOT override FFMPEG_BIN — the integration test must use whatever binary
    // thumbnailService resolves at runtime (ffmpeg-static or system ffmpeg fallback).
    // This ensures we catch any binary resolution failure before users do.

    // Reset module registry and remove global mocks so real fs and real ffmpeg are used
    jest.resetModules();
    jest.unmock('fs/promises');
    jest.unmock('node:fs/promises');
    jest.unmock('ffmpeggy');

    // Dynamically import *after* unmocking so modules bind to real fs
    const { VideoService }     = await import('../../services/videoService');
    const { ThumbnailService } = await import('../../services/thumbnailService');
    const { globalErrorHandler } = await import('../../middleware/errorHandler');

    // Build a minimal Express app wired with real services
    const realThumbnailService = new ThumbnailService(tempDir);
    const realVideoService     = new VideoService(videosDir, realThumbnailService);

    const router = express.Router();
    router.get('/videos', async (_req, res) => {
      const result = await realVideoService.scanVideoDirectory();
      res.json({ status: 'success', data: result });
    });

    app = express();
    app.use('/api', router);
    app.use(globalErrorHandler);
  }, 15_000);

  afterAll(async () => {
    // Clean up — best effort
    if (videosDir) {
      const tempRoot = path.dirname(videosDir);
      await nodeFs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('first scan triggers inline thumbnail generation via real ffmpeg and returns thumbnail in response', async () => {
    // Before scan: no thumbnail on disk
    const expectedThumbnail = path.join(videosDir, 'Lavar.jpg');
    await expect(nodeFs.access(expectedThumbnail)).rejects.toThrow();

    // Scan: inline regeneration runs during scan (synchronous, not background)
    const res = await request(app).get('/api/videos').expect(200);

    expect(res.body.status).toBe('success');
    const videos = res.body.data.videos as Array<{ metadata: { thumbnail?: string } }>;
    expect(videos).toHaveLength(1);
    // Inline regeneration completes before scan returns, so thumbnail is present in response
    expect(videos[0]?.metadata.thumbnail).toBe('Lavar.jpg');
  }, REGEN_TIMEOUT_MS + 5_000);

  it('inline regeneration produces a real .jpg on disk via ffmpeg', async () => {
    const expectedThumbnail = path.join(videosDir, 'Lavar.jpg');
    // File must already exist after the first scan completed
    const stat = await nodeFs.stat(expectedThumbnail);
    expect(stat.size).toBeGreaterThan(0);
  });

  it('second scan returns video with thumbnail still present', async () => {
    const res = await request(app).get('/api/videos').expect(200);

    expect(res.body.status).toBe('success');
    const videos = res.body.data.videos as Array<{ metadata: { thumbnail?: string } }>;
    expect(videos).toHaveLength(1);
    expect(videos[0]?.metadata.thumbnail).toBe('Lavar.jpg');
  });
});
