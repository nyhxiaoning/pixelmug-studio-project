import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { get as httpGet } from 'node:http';
import { extract as tarExtract } from 'tar';
import { DeploymentPackages } from '../src/deployment/package.mjs';

// Opt-in smoke test that proves a generated Docker context actually builds and
// runs: `docker build`, `docker run`, a healthy /healthz, a served WebApp, and
// the normalized PUBLIC_WEBAPP_URL mapped to STUDIO_WEBAPP_URL for the Bot.
// It is skipped unless STUDIO_TEST_DOCKER=1 is set and `docker version` reports
// a reachable daemon, because it needs network access to Docker Hub and npm.

const dockerAvailable = process.env.STUDIO_TEST_DOCKER === '1' && (() => {
  try { return spawnSync('docker', ['version'], { stdio: 'ignore' }).status === 0; }
  catch { return false; }
})();

function run(command, args, { timeoutMs = 300000, cwd } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error(`${command} timed out`)); }, timeoutMs);
    const cap = buffer => buffer.length > 512 * 1024 ? buffer.slice(-512 * 1024) : buffer;
    child.stdout.on('data', chunk => { stdout = cap(stdout + chunk); });
    child.stderr.on('data', chunk => { stderr = cap(stderr + chunk); });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => { clearTimeout(timer); resolve({ code, stdout, stderr }); });
  });
}

function freePort() {
  return new Promise(resolve => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function get(url) {
  return new Promise((resolve, reject) => {
    httpGet(url, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    }).on('error', reject);
  });
}

async function waitFor(fn, { timeoutMs = 10000, intervalMs = 250 } = {}) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeoutMs) {
    try { return await fn(); } catch (error) { lastError = error; }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw lastError || new Error('waitFor timed out');
}

test('generated Docker context builds, serves the WebApp, and injects STUDIO_WEBAPP_URL', {
  skip: dockerAvailable ? false : 'requires Docker and STUDIO_TEST_DOCKER=1',
  timeout: 600000,
}, async t => {
  const parent = await mkdtemp(join(tmpdir(), 'studio-docker-'));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const root = join(parent, 'smoke-agent');
  await mkdir(join(root, 'bot'), { recursive: true });
  await mkdir(join(root, 'webapp'), { recursive: true });
  await writeFile(join(root, 'bot', 'index.js'),
    "console.log('[bot] STUDIO_WEBAPP_URL=' + (process.env.STUDIO_WEBAPP_URL || ''));\nsetInterval(() => {}, 1000);\n");
  await writeFile(join(root, 'webapp', 'index.html'), '<script type="module" src="./main.js"></script>');
  await writeFile(join(root, 'webapp', 'main.js'), 'globalThis.webappReady = true;\n');
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'smoke-agent', private: true, type: 'module', dependencies: {} }));

  const packages = new DeploymentPackages();
  t.after(() => packages.close());
  const result = await packages.generate(root, { botEntry: 'bot/index.js' });
  const download = packages.consume(result.id);
  const out = await mkdtemp(join(tmpdir(), 'studio-docker-extract-'));
  t.after(() => rm(out, { recursive: true, force: true }));
  await tarExtract({ file: download.path, cwd: out });
  download.dispose();

  const tag = `pixelmug-deploy-smoke:${Date.now()}`;
  const name = `pixelmug-deploy-smoke-${Date.now()}`;
  const context = join(out, download.rootName);

  const build = await run('docker', ['build', '-t', tag, context], { timeoutMs: 600000 });
  assert.equal(build.code, 0, `docker build failed:\n${build.stdout}\n${build.stderr}`);

  const hostPort = await freePort();
  const started = await run('docker', ['run', '-d', '--name', name,
    '-e', 'BOT_TOKEN=test-token',
    '-e', `PUBLIC_WEBAPP_URL=http://127.0.0.1:${hostPort}/agent/`,
    '-e', 'PORT=8080',
    '-p', `${hostPort}:8080`,
    tag], { timeoutMs: 30000 });
  assert.equal(started.code, 0, `docker run failed:\n${started.stderr}`);
  const containerId = started.stdout.trim();
  t.after(async () => {
    await run('docker', ['rm', '-f', name], { timeoutMs: 30000 }).catch(() => {});
    await run('docker', ['rmi', '-f', tag], { timeoutMs: 30000 }).catch(() => {});
  });

  const baseUrl = `http://127.0.0.1:${hostPort}`;
  const health = await waitFor(async () => {
    const res = await get(`${baseUrl}/healthz`);
    if (res.status !== 200) throw new Error(`healthz ${res.status}`);
    return JSON.parse(res.body);
  }, { timeoutMs: 120000, intervalMs: 1000 });
  assert.equal(health.ok, true);
  assert.equal(health.bot, true);
  assert.equal(health.webapp, true);

  const page = await get(`${baseUrl}/agent/`);
  assert.equal(page.status, 200);
  assert.match(page.headers['content-type'] || '', /text\/html/);

  const logs = await run('docker', ['logs', containerId], { timeoutMs: 30000 });
  assert.match(logs.stdout, new RegExp(`STUDIO_WEBAPP_URL=http://127\\.0\\.0\\.1:${hostPort}/agent/`));
});
