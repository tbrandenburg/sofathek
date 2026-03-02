import request from 'supertest';
import express from 'express';
import healthRouter from '../../../routes/health';

describe('Health Route', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use('/', healthRouter);
    jest.clearAllMocks();
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