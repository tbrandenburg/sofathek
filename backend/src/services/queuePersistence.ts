import * as fs from 'fs/promises';
import { getErrorMessage } from '../utils/error';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { AppError } from '../middleware/errorHandler';
import { QueueItem } from '../types/youtube';
import { logger } from '../utils/logger';

interface PersistedQueueItem extends Omit<QueueItem, 'queuedAt' | 'startedAt' | 'completedAt' | 'request'> {
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  request: QueueItem['request'] & { requestedAt: string };
}

export async function loadQueue(queueFilePath: string): Promise<QueueItem[]> {
  try {
    const queueData = await fs.readFile(queueFilePath, 'utf-8');
    const parsedQueue = JSON.parse(queueData) as PersistedQueueItem[];

    const queue = parsedQueue.map(item => {
      const { startedAt, completedAt, ...rest } = item;
      const parsedItem: QueueItem = {
        ...rest,
        queuedAt: new Date(item.queuedAt),
        request: {
          ...item.request,
          requestedAt: new Date(item.request.requestedAt)
        }
      };

      if (startedAt) {
        parsedItem.startedAt = new Date(startedAt);
      }

      if (completedAt) {
        parsedItem.completedAt = new Date(completedAt);
      }

      return parsedItem;
    });

    logger.info('Queue loaded from storage', {
      queueSize: queue.length,
      filePath: queueFilePath
    });

    return queue;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

// Module-level async mutex chain; always kept resolved so the lock can never stay held.
let queueSaveChain: Promise<void> = Promise.resolve();

async function persistQueue(queueFilePath: string, queue: QueueItem[]): Promise<void> {
  try {
    const queueDir = path.dirname(queueFilePath);
    await fs.mkdir(queueDir, { recursive: true });

    // Unique temp file per write: concurrent writers (even from a second backend
    // process sharing data/temp) never share a path, so a rename can't hit ENOENT.
    const tempFilePath = `${queueFilePath}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(tempFilePath, JSON.stringify(queue, null, 2), 'utf-8');
      await fs.rename(tempFilePath, queueFilePath);
    } catch (error) {
      // Best-effort cleanup of the orphaned temp file; never mask the original error.
      await fs.unlink(tempFilePath).catch(() => {});
      throw error;
    }

    logger.debug('Queue saved to storage', {
      queueSize: queue.length,
      filePath: queueFilePath
    });
  } catch (error) {
    logger.error('Failed to save queue', {
      error: getErrorMessage(error),
      filePath: queueFilePath
    });
    throw new AppError('Failed to save download queue', 500);
  }
}

export function saveQueue(queueFilePath: string, queue: QueueItem[]): Promise<void> {
  const result = queueSaveChain.then(() => persistQueue(queueFilePath, queue));
  queueSaveChain = result.catch(() => {});
  return result;
}
