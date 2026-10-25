import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import childProcess from 'node:child_process';
import { createHash } from 'node:crypto';

jest.unmock('node:fs/promises');

describe('managed yt-dlp installer', () => {
  let root: string;
  let install: (options: { backendRoot: string; platform: string; arch: string }) => Promise<void>;
  const version = '2026.10.21';
  const binary = Buffer.from('downloaded executable');
  const digest = createHash('sha256').update(binary).digest('hex');
  let spawn: jest.SpyInstance;
  let download: jest.SpyInstance;
  const override = process.env.SOFATHEK_YTDLP_VERSION;

  beforeEach(async () => {
    delete process.env.SOFATHEK_YTDLP_VERSION;
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'sofathek-installer-'));
    await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({ config: { ytDlpVersion: version } }));
    spawn = jest.spyOn(childProcess, 'spawnSync').mockImplementation(() => ({
      pid: 1, output: [], stdout: version, stderr: '', status: 0, signal: null
    }));
    download = jest.spyOn(global, 'fetch').mockImplementation(async (url) => new Response(
      String(url).endsWith('SHA2-256SUMS')
        ? `${digest}  yt-dlp.exe\n${digest}  yt-dlp_linux\n${digest}  yt-dlp_macos\n`
        : binary
    ));
    jest.isolateModules(() => {
      install = (require('../../../../scripts/installYtDlp') as { install: typeof install }).install;
    });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.rm(root, { recursive: true, force: true });
    if (override === undefined) delete process.env.SOFATHEK_YTDLP_VERSION;
    else process.env.SOFATHEK_YTDLP_VERSION = override;
  });

  it.each([
    ['win32', 'yt-dlp.exe', '.tmp.exe'],
    ['linux', 'yt-dlp', '.tmp'],
    ['darwin', 'yt-dlp', '.tmp']
  ])('verifies a native temporary executable before atomic installation on %s', async (platform, name, suffix) => {
    const destination = path.join(root, '.runtime', 'yt-dlp', version, name);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, 'old executable');
    spawn.mockImplementation((candidate: string, args: string[]) => {
      expect(args).toEqual(['--version']);
      const current = require('node:fs') as typeof import('node:fs');
      if (candidate === destination) return { status: 1, stdout: '' };
      expect(candidate.endsWith(suffix)).toBe(true);
      expect(path.dirname(candidate)).toBe(path.dirname(destination));
      expect(current.readFileSync(destination, 'utf8')).toBe('old executable');
      expect(current.readFileSync(candidate)).toEqual(binary);
      return { status: 0, stdout: version };
    });

    await install({ backendRoot: root, platform, arch: 'x64' });

    expect(await fs.readFile(destination)).toEqual(binary);
    expect(await fs.readdir(path.dirname(destination))).toEqual([name]);
    expect(spawn).toHaveBeenCalledTimes(2);
    expect(download).toHaveBeenCalledTimes(2);
  });

  it.each(['checksum', 'missing checksum', 'version', 'launch', 'network', 'http'])('preserves the previous executable on %s failure', async (failure) => {
    const destination = path.join(root, '.runtime', 'yt-dlp', version, 'yt-dlp.exe');
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, 'old executable');
    spawn.mockReturnValue({ status: 1, stdout: '' });
    if (failure === 'checksum') download.mockImplementation(async (url) => new Response(
      String(url).endsWith('SHA2-256SUMS') ? `${'0'.repeat(64)}  yt-dlp.exe` : binary
    ));
    if (failure === 'missing checksum') download.mockImplementation(async () => new Response(''));
    if (failure === 'version') spawn.mockReturnValue({ status: 0, stdout: '2020.01.01' });
    if (failure === 'launch') spawn.mockReturnValue({ error: new Error('incompatible executable') });
    if (failure === 'network') download.mockRejectedValue(new Error('network unavailable'));
    if (failure === 'http') download.mockResolvedValue(new Response('', { status: 503 }));
    const errors: Record<string, string> = {
      checksum: 'SHA-256 verification failed',
      'missing checksum': 'checksum for yt-dlp.exe was not found',
      version: 'reported version: 2020.01.01',
      launch: 'incompatible executable',
      network: 'network unavailable',
      http: 'Download failed (503)'
    };

    await expect(install({ backendRoot: root, platform: 'win32', arch: 'x64' })).rejects.toThrow(errors[failure]);

    expect(await fs.readFile(destination, 'utf8')).toBe('old executable');
    expect(await fs.readdir(path.dirname(destination))).toEqual(['yt-dlp.exe']);
    if (['checksum', 'missing checksum', 'network', 'http'].includes(failure)) expect(spawn).toHaveBeenCalledTimes(1);
  });

  it('reuses a verified installation without downloading', async () => {
    await install({ backendRoot: root, platform: 'linux', arch: 'x64' });
    expect(download).not.toHaveBeenCalled();
    expect(spawn).toHaveBeenCalledWith(expect.stringContaining(version), ['--version'], expect.objectContaining({ timeout: 120000 }));
  });

  it('uses the pinned environment override for downloads and installation', async () => {
    process.env.SOFATHEK_YTDLP_VERSION = '2026.10.22';
    spawn.mockReturnValueOnce({ status: 1 }).mockReturnValue({ status: 0, stdout: '2026.10.22' });
    await install({ backendRoot: root, platform: 'linux', arch: 'x64' });
    expect(download).toHaveBeenCalledWith(expect.stringContaining('/2026.10.22/yt-dlp_linux'), expect.any(Object));
    expect(await fs.readFile(path.join(root, '.runtime/yt-dlp/2026.10.22/yt-dlp'))).toEqual(binary);
  });

  it('rejects an unpinned override before fetching or executing', async () => {
    process.env.SOFATHEK_YTDLP_VERSION = '../latest';
    await expect(install({ backendRoot: root, platform: 'linux', arch: 'x64' })).rejects.toThrow('pinned stable');
    expect(download).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });
});
