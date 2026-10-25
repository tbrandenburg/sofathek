'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');

async function availablePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

async function smoke() {
  const port = await availablePort();
  const frontend = await availablePort();
  const full = process.argv.includes('--full');
  const project = `sofathek-smoke-${process.pid}`;
  const environment = { ...process.env, SOFATHEK_BACKEND_PORT: String(port), SOFATHEK_FRONTEND_PORT: String(frontend) };
  const compose = (...args) => {
    const result = spawnSync('docker', ['compose', '-p', project, ...args], {
      cwd: path.resolve(__dirname, '..'), env: environment, stdio: 'inherit', timeout: 900000
    });
    if (result.error) throw result.error;
    assert.equal(result.status, 0, `docker compose ${args.join(' ')} failed`);
  };
  try {
    compose('up', '--build', '--wait', '--wait-timeout', '90', ...(full ? [] : ['backend']));
    compose('exec', '-T', 'backend', 'node', '-e', `
      const assert = require('node:assert/strict');
      const { spawnSync } = require('node:child_process');
      assert.equal(process.getuid(), 1001);
      for (const binary of ['python', 'python3']) {
        assert.equal(spawnSync(binary, ['--version']).error?.code, 'ENOENT');
      }
      assert.throws(() => require.resolve('typescript'), { code: 'MODULE_NOT_FOUND' });
      const runtime = require('./dist/features/youtube/ytDlpRuntime');
      runtime.verifyYtDlpRuntime().then(async () => {
        const result = await runtime.spawnYtDlp('https://www.youtube.com/watch?v=offline-smoke', { listExtractors: true }).done;
        assert.match(result.stdout, /youtube/i);
        const ffmpeg = require('ffmpeg-static');
        assert.equal(spawnSync(ffmpeg, ['-version']).status, 0);
        console.log('Non-root compiled backend, production dependencies, ffmpeg and pinned yt-dlp verified without system Python');
      }).catch(error => { console.error(error); process.exitCode = 1; });
    `);
    const response = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(10000) });
    assert.equal(response.status, 200);
    console.log(`Compose backend health: HTTP ${response.status}`);
    if (full) {
      const deadline = Date.now() + 300000;
      while (true) {
        try {
          const page = await fetch(`http://127.0.0.1:${frontend}/`, { signal: AbortSignal.timeout(5000) });
          assert.equal(page.status, 200);
          console.log(`Compose frontend: HTTP ${page.status}`);
          break;
        } catch (error) {
          if (Date.now() >= deadline) throw error;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
  } finally {
    try {
      compose('logs', '--no-color', '--tail=30');
    } finally {
      compose('down', '--volumes', '--remove-orphans');
    }
  }
}

smoke().catch(error => { console.error(error); process.exitCode = 1; });
