import fs from 'fs';
import { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import { logger } from './logger';

export interface RangeStreamOptions {
  mimeType: string;
  fileSize: number;
  extraHeaders?: Record<string, string>;
}

export function streamFileWithRangeSupport(
  req: Request,
  res: Response,
  filePath: string,
  options: RangeStreamOptions,
): void {
  const { mimeType, fileSize, extraHeaders } = options;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const startStr = parts[0];
    const endStr = parts[1];

    if (!startStr) {
      throw new AppError('Invalid range header format', 400);
    }

    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize) {
      throw new AppError('Range not satisfiable', 416);
    }

    const chunkSize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      ...extraHeaders,
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': mimeType,
    });

    logger.info(`Serving partial content: ${start}-${end}/${fileSize}`);
    file.pipe(res);
    return;
  }

  res.writeHead(200, {
    ...extraHeaders,
    'Content-Length': fileSize,
    'Accept-Ranges': 'bytes',
    'Content-Type': mimeType,
  });

  logger.info(`Serving full file: ${fileSize} bytes`);
  fs.createReadStream(filePath).pipe(res);
}
