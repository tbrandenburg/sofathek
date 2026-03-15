import * as fs from 'fs/promises';
import * as path from 'path';
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

export async function saveQueue(queueFilePath: string, queue: QueueItem[]): Promise<void> {
  try {
    const queueDir = path.dirname(queueFilePath);
    await fs.mkdir(queueDir, { recursive: true });

    const tempFilePath = `${queueFilePath}.tmp`;
    await fs.writeFile(tempFilePath, JSON.stringify(queue, null, 2), 'utf-8');
    await fs.rename(tempFilePath, queueFilePath);

    logger.debug('Queue saved to storage', {
      queueSize: queue.length,
      filePath: queueFilePath
    });
  } catch (error) {
    logger.error('Failed to save queue', {
      error: error instanceof Error ? error.message : String(error),
      filePath: queueFilePath
    });
    throw new AppError('Failed to save download queue', 500);
  }
}
