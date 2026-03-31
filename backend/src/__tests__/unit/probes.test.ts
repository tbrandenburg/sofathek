import fs from 'fs';
import os from 'os';
import path from 'path';

// Mock logger to avoid fs issues during winston initialization
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock config to avoid environment issues
jest.mock('../../config', () => ({
  config: {
    videosDir: '/tmp/test-videos',
    tempDir: '/tmp/test-temp'
  }
}));

import { getDiskSpaceInfo } from '../../routes/health/probes';

describe('probes', () => {
  describe('getDiskSpaceInfo', () => {
    it('should return actual disk space for a valid directory', async () => {
      const result = await getDiskSpaceInfo('/');

      expect(result).toBeDefined();
      expect(result!.total).toBeGreaterThan(0);
      expect(result!.free).toBeGreaterThanOrEqual(0);
      expect(result!.used).toBeGreaterThanOrEqual(0);
      expect(result!.usagePercent).toBeGreaterThanOrEqual(0);
      expect(result!.usagePercent).toBeLessThanOrEqual(100);
    });

    it('should return correct usagePercent calculation', async () => {
      const result = await getDiskSpaceInfo('/tmp');

      expect(result).toBeDefined();
      expect(result!.usagePercent).toBe(Math.round((result!.used / result!.total) * 100));
    });

    it('should return status based on thresholds', async () => {
      const result = await getDiskSpaceInfo('/');

      expect(['ok', 'warning', 'critical']).toContain(result!.status);
    });

    it('should return undefined for non-existent path', async () => {
      const result = await getDiskSpaceInfo('/nonexistent/path/that/does/not/exist');

      expect(result).toBeUndefined();
    });

    it('should use the dirPath parameter to query correct filesystem', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-disk-space-'));

      try {
        const result = await getDiskSpaceInfo(tempDir);

        expect(result).toBeDefined();
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should not return memory metrics (total should differ from os.totalmem)', async () => {
      const result = await getDiskSpaceInfo('/');

      // Memory multiplied by 10 was the old bug — disk space should not equal memory*10
      expect(result!.total).not.toBe(os.totalmem() * 10);
    });
  });
});
