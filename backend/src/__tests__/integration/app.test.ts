import request from 'supertest';
import { cleanupAllRateLimiters } from '../../middleware/rateLimiter';

jest.mock('../../services/index', () => ({
  thumbnailService: {},
  downloadQueueService: {
    getQueueStatus: jest.fn(() => ({
      items: [],
      totalItems: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      lastUpdated: new Date('2026-01-01T00:00:00.000Z')
    }))
  },
  youTubeDownloadService: {}
}));

import app from '../../app';

describe('application route composition', () => {
  afterAll(() => {
    cleanupAllRateLimiters();
  });

  it('mounts the YouTube feature at /api/youtube', async () => {
    const response = await request(app).get('/api/youtube/queue').expect(200);

    expect(response.body.status).toBe('success');
    expect(response.body.data.totalItems).toBe(0);
  });
});
