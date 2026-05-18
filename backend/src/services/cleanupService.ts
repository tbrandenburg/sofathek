import * as path from 'path';
import * as fs from 'fs/promises';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/error';

export class VideoCleanupService {
  constructor(
    private readonly videosDir: string,
    private readonly maxAgeDays: number,
  ) {}

  async cleanupOldResources(): Promise<number> {
    try {
      const cutoffMs = Date.now() - this.maxAgeDays * 24 * 60 * 60 * 1000;
      const files = await fs.readdir(this.videosDir);
      const grouped = this.groupByPrefix(files);
      let removedCount = 0;

      for (const [prefix, groupFiles] of grouped) {
        if (await this.isGroupExpired(groupFiles, cutoffMs)) {
          for (const file of groupFiles) {
            try {
              await fs.unlink(path.join(this.videosDir, file));
              removedCount++;
            } catch (error) {
              logger.warn('Failed to remove expired resource', {
                file,
                error: getErrorMessage(error),
              });
            }
          }
          logger.info('Removed expired video resources', { prefix, fileCount: groupFiles.length });
        }
      }

      if (removedCount > 0) {
        logger.info('Video resource cleanup completed', { removedCount });
      }

      return removedCount;
    } catch (error) {
      logger.error('Failed to cleanup old video resources', {
        error: getErrorMessage(error),
      });
      return 0;
    }
  }

  private groupByPrefix(files: string[]): Map<string, string[]> {
    const groups = new Map<string, string[]>();

    for (const file of files) {
      const prefix = this.getResourcePrefix(file);
      const group = groups.get(prefix);

      if (group) {
        group.push(file);
        continue;
      }

      groups.set(prefix, [file]);
    }

    return groups;
  }

  private getResourcePrefix(file: string): string {
    if (file.endsWith('.info.json')) {
      return file.slice(0, -'.info.json'.length);
    }

    const subtitleMatch = file.match(/^(.*)\.[^.]+\.(srt|vtt)$/i);
    if (subtitleMatch?.[1]) {
      return subtitleMatch[1];
    }

    const ext = path.extname(file);
    return ext ? file.slice(0, -ext.length) : file;
  }

  private async isGroupExpired(files: string[], cutoffMs: number): Promise<boolean> {
    const infoJson = files.find((file) => file.endsWith('.info.json'));

    if (infoJson) {
      try {
        const content = await fs.readFile(path.join(this.videosDir, infoJson), 'utf-8');
        const data = JSON.parse(content) as { downloadedAt?: unknown };

        if (typeof data.downloadedAt === 'string') {
          const timestamp = new Date(data.downloadedAt).getTime();
          if (!Number.isNaN(timestamp)) {
            return timestamp < cutoffMs;
          }
        }
      } catch {
        // Fall back to filesystem mtime when sidecar metadata is unreadable.
      }
    }

    const targetFile = files.find((file) => !file.endsWith('.info.json')) || files[0];
    if (!targetFile) {
      return false;
    }

    try {
      const stat = await fs.stat(path.join(this.videosDir, targetFile));
      return stat.mtimeMs < cutoffMs;
    } catch {
      return false;
    }
  }
}
