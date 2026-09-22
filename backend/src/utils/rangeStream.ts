import fs from 'fs';
import { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import { logger } from './logger';

export interface RangeStreamOptions {
  mimeType: string;
  fileSize: number;
  extraHeaders?: Record<string, string>;
}

function pipeFileToResponse(filePath: string, res: Response, file: fs.ReadStream): void {
  file.on('error', (error: Error) => {
    logger.error('Failed to stream file', {
      error: error.message,
      path: filePath,
    });

    if (!res.destroyed) {
      res.destroy();
    }
  });

  file.pipe(res);
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
    const match = /^bytes=(\d+)-(\d*)$/.exec(range);

    if (!match) {
      throw new AppError('Invalid range header format', 400);
    }

    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : fileSize - 1;

    if (start >= fileSize || end >= fileSize || start > end) {
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
    pipeFileToResponse(filePath, res, file);
    return;
  }

  res.writeHead(200, {
    ...extraHeaders,
    'Content-Length': fileSize,
    'Accept-Ranges': 'bytes',
    'Content-Type': mimeType,
  });

  logger.info(`Serving full file: ${fileSize} bytes`);
  pipeFileToResponse(filePath, res, fs.createReadStream(filePath));
}
