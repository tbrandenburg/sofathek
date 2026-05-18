import { VideoCleanupService } from '../../../services/cleanupService';

const mockReaddir = jest.fn();
const mockReadFile = jest.fn();
const mockUnlink = jest.fn();
const mockStat = jest.fn();

jest.mock('fs/promises', () => ({
  readdir: (...args: unknown[]) => mockReaddir(...args),
  readFile: (...args: unknown[]) => mockReadFile(...args),
  unlink: (...args: unknown[]) => mockUnlink(...args),
  stat: (...args: unknown[]) => mockStat(...args),
}));

describe('VideoCleanupService', () => {
  let service: VideoCleanupService;

  beforeEach(() => {
    service = new VideoCleanupService('/test/videos', 30);
    jest.clearAllMocks();
  });

  it('should remove expired video groups based on .info.json downloadedAt', async () => {
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    mockReaddir.mockResolvedValue([
      'My_Video-dQw4w9WgXcQ.mp4',
      'My_Video-dQw4w9WgXcQ.jpg',
      'My_Video-dQw4w9WgXcQ.info.json',
    ]);
    mockReadFile.mockResolvedValue(JSON.stringify({
      id: 'dQw4w9WgXcQ',
      title: 'My Video',
      downloadedAt: oldDate,
    }));
    mockUnlink.mockResolvedValue(undefined);

    const removed = await service.cleanupOldResources();

    expect(removed).toBe(3);
    expect(mockUnlink).toHaveBeenCalledTimes(3);
  });

  it('should not remove recent video groups', async () => {
    const recentDate = new Date().toISOString();
    mockReaddir.mockResolvedValue([
      'New_Video-abc123.mp4',
      'New_Video-abc123.info.json',
    ]);
    mockReadFile.mockResolvedValue(JSON.stringify({
      id: 'abc123',
      title: 'New Video',
      downloadedAt: recentDate,
    }));

    const removed = await service.cleanupOldResources();

    expect(removed).toBe(0);
    expect(mockUnlink).not.toHaveBeenCalled();
  });

  it('should fall back to mtime when .info.json is missing', async () => {
    const oldMtime = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    mockReaddir.mockResolvedValue(['Old_Video-xyz789.mp4']);
    mockStat.mockResolvedValue({ mtimeMs: oldMtime.getTime() });
    mockUnlink.mockResolvedValue(undefined);

    const removed = await service.cleanupOldResources();

    expect(removed).toBe(1);
    expect(mockUnlink).toHaveBeenCalledTimes(1);
  });

  it('should group language subtitle companions with their video resources', async () => {
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    mockReaddir.mockResolvedValue([
      'Video-one.mp4',
      'Video-one.en.srt',
      'Video-one.de.srt',
      'Video-one.info.json',
    ]);
    mockReadFile.mockResolvedValue(JSON.stringify({ downloadedAt: oldDate }));
    mockUnlink.mockResolvedValue(undefined);

    const removed = await service.cleanupOldResources();

    expect(removed).toBe(4);
    expect(mockUnlink).toHaveBeenCalledTimes(4);
  });

  it('should handle empty directory gracefully', async () => {
    mockReaddir.mockResolvedValue([]);

    const removed = await service.cleanupOldResources();

    expect(removed).toBe(0);
    expect(mockUnlink).not.toHaveBeenCalled();
  });

  it('should handle readdir errors gracefully', async () => {
    mockReaddir.mockRejectedValue(new Error('ENOENT'));

    const removed = await service.cleanupOldResources();

    expect(removed).toBe(0);
    expect(mockUnlink).not.toHaveBeenCalled();
  });

  it('should handle partial unlink failures without aborting', async () => {
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    mockReaddir.mockResolvedValue([
      'Video-one.mp4',
      'Video-one.jpg',
      'Video-one.info.json',
    ]);
    mockReadFile.mockResolvedValue(JSON.stringify({
      id: 'one',
      title: 'Video one',
      downloadedAt: oldDate,
    }));
    mockUnlink
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Permission denied'))
      .mockResolvedValueOnce(undefined);

    const removed = await service.cleanupOldResources();

    expect(removed).toBe(2);
    expect(mockUnlink).toHaveBeenCalledTimes(3);
  });
});
