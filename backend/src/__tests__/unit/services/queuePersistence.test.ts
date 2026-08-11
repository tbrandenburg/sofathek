import { saveQueue } from '../../../services/queuePersistence';
import { QueueItem } from '../../../types/youtube';

const mockMkdir = jest.fn();
const mockWriteFile = jest.fn();
const mockRename = jest.fn();
const mockUnlink = jest.fn();

jest.mock('fs/promises', () => ({
  mkdir: (...args: any[]) => mockMkdir(...args),
  writeFile: (...args: any[]) => mockWriteFile(...args),
  rename: (...args: any[]) => mockRename(...args),
  unlink: (...args: any[]) => mockUnlink(...args)
}));

function makeQueueItem(id: string): QueueItem {
  return {
    id,
    request: { url: `https://youtu.be/${id}`, requestId: id, requestedAt: new Date() },
    status: 'pending',
    progress: 0,
    currentStep: 'Queued',
    queuedAt: new Date()
  } as QueueItem;
}

describe('saveQueue serialization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockRename.mockResolvedValue(undefined);
    mockUnlink.mockResolvedValue(undefined);
  });

  it('should serialize concurrent saves: second write starts only after first completes', async () => {
    let releaseFirstWrite!: () => void;
    const firstWrite = new Promise<void>(resolve => {
      releaseFirstWrite = resolve;
    });
    mockWriteFile.mockImplementationOnce(() => firstWrite);

    const first = saveQueue('/tmp/q.json', [makeQueueItem('a')]);
    const second = saveQueue('/tmp/q.json', [makeQueueItem('b')]);

    await new Promise(resolve => setImmediate(resolve));

    expect(mockWriteFile).toHaveBeenCalledTimes(1);

    releaseFirstWrite();
    await Promise.all([first, second]);
    await new Promise(resolve => setImmediate(resolve));

    expect(mockWriteFile).toHaveBeenCalledTimes(2);
    expect(mockRename).toHaveBeenCalledTimes(2);
  });

  it('should use a unique temp filename per write', async () => {
    await Promise.all([saveQueue('/tmp/q.json', [makeQueueItem('a')]), saveQueue('/tmp/q.json', [makeQueueItem('b')])]);
    const tempArgs = mockWriteFile.mock.calls.map((call: any[]) => call[0] as string);
    const tempFiles = tempArgs.filter(p => p.includes('.tmp'));
    expect(new Set(tempFiles).size).toBe(2);
  });

  it('should continue persisting after a failed save (chain recovers)', async () => {
    mockWriteFile.mockRejectedValueOnce(new Error('disk full'));

    await expect(saveQueue('/tmp/q.json', [makeQueueItem('a')])).rejects.toThrow('Failed to save download queue');

    await expect(saveQueue('/tmp/q.json', [makeQueueItem('b')])).resolves.toBeUndefined();
    expect(mockRename).toHaveBeenCalledTimes(1);
  });

  it('should clean up the orphaned temp file when write/rename fails', async () => {
    mockRename.mockRejectedValueOnce(new Error('ENOENT'));

    await expect(saveQueue('/tmp/q.json', [makeQueueItem('a')])).rejects.toThrow('Failed to save download queue');

    expect(mockUnlink).toHaveBeenCalledWith(expect.stringContaining('.tmp'));
  });
});
