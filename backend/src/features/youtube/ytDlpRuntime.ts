import { spawn, ChildProcessByStdio } from 'node:child_process';
import { Readable } from 'node:stream';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { AppError } from '../../middleware/errorHandler';

type YtDlpOptionValue = string | number | boolean | Array<string | number> | undefined;
export type YtDlpOptions = Record<string, YtDlpOptionValue>;

export interface YtDlpResult {
  stdout: string;
  stderr: string;
}

export interface YtDlpProcess {
  process: ChildProcessByStdio<null, Readable, Readable>;
  done: Promise<YtDlpResult>;
}

const backendPackage = require('../../../package.json') as { config?: { ytDlpVersion?: string } };
const configuredYtDlpVersion = backendPackage.config?.ytDlpVersion;

function executableName(platform: NodeJS.Platform): string {
  return platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
}

export function getYtDlpBinaryPath(
  platform: NodeJS.Platform = process.platform,
  version = process.env.SOFATHEK_YTDLP_VERSION || configuredYtDlpVersion
): string {
  if (!version || !/^\d{4}\.\d{2}\.\d{2}$/.test(version)) {
    throw new AppError('The pinned yt-dlp version is not configured in backend/package.json.', 500, true, 'YTDLP_RUNTIME_UNAVAILABLE');
  }

  const binaryPath = path.resolve(__dirname, '../../../.runtime/yt-dlp', version, executableName(platform));
  try {
    fs.accessSync(binaryPath, platform === 'win32' ? fs.constants.F_OK : fs.constants.X_OK);
  } catch {
    throw new AppError(
      `The pinned yt-dlp ${version} executable is missing. Run npm install in the backend to install it for ${platform}/${process.arch}.`,
      500,
      true,
      'YTDLP_RUNTIME_UNAVAILABLE'
    );
  }
  return binaryPath;
}

export function toCliArguments(options: YtDlpOptions): string[] {
  const args: string[] = [];
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || value === false) continue;
    const flag = `--${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
    if (value === true) {
      args.push(flag);
    } else if (Array.isArray(value)) {
      for (const item of value) args.push(flag, String(item));
    } else {
      args.push(flag, String(value));
    }
  }
  return args;
}

export function spawnYtDlp(url: string, options: YtDlpOptions = {}): YtDlpProcess {
  const binaryPath = getYtDlpBinaryPath();
  const child = spawn(binaryPath, [url, ...toCliArguments(options)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });

  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  child.stdout.on('data', (chunk: Buffer | string) => stdout.push(Buffer.from(chunk)));
  child.stderr.on('data', (chunk: Buffer | string) => stderr.push(Buffer.from(chunk)));

  const done = new Promise<YtDlpResult>((resolve, reject) => {
    child.once('error', (error) => {
      reject(new AppError(
        `The installed yt-dlp executable could not start on ${process.platform}/${process.arch}: ${error.message}. Run npm install in the backend to reinstall it.`,
        500,
        true,
        'YTDLP_RUNTIME_UNAVAILABLE'
      ));
    });
    child.once('close', (code, signal) => {
      const result = { stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8') };
      if (code === 0) {
        resolve(result);
        return;
      }
      reject(Object.assign(new Error(result.stderr || `yt-dlp exited with status ${code ?? signal ?? 'unknown'}`), result, { exitCode: code }));
    });
  });

  return { process: child, done };
}
