import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { deploymentTemplates } from '../src/deployment/templates.mjs';

const sleep = ms => new Promise(r => setTimeout(r, ms));

const botSource = `import { writeFileSync } from 'node:fs';
const file = process.env.SEEN_URL_FILE;
if (file) writeFileSync(file, process.env.STUDIO_WEBAPP_URL || '');
setInterval(() => {}, 1000);
`;

function runLauncher(root, env) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, [join(root, 'start.mjs')], { env: { ...process.env, ...env }, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('exit', code => resolve({ code, stderr }));
  });
}

test('Dockerfile installs dependencies before defining the runtime command', () => {
  const { dockerfile } = deploymentTemplates({ botEntry: 'bot/index.js', hasWebApp: true });
  assert.match(dockerfile, /npm ci --omit=dev/);
  assert.match(dockerfile, /npm install --omit=dev/);
  assert.ok(dockerfile.indexOf('npm ci') < dockerfile.indexOf('CMD ["node", "deploy/start.mjs"]'));
  assert.match(dockerfile, /ENV BOT_ENTRY="bot\/index.js"/);
  assert.match(dockerfile, /ENV HAS_WEBAPP="1"/);
});

test('launcher maps a validated public URL before importing the bot', () => {
  const { launcher } = deploymentTemplates({ botEntry: 'bot/index.js', hasWebApp: true });
  assert.ok(launcher.indexOf('process.env.STUDIO_WEBAPP_URL') < launcher.indexOf('import(botUrl.href)'));
  assert.match(launcher, /\/healthz/);
  assert.match(launcher, /SIGTERM/);
  assert.match(launcher, /process\.env\.PORT \|\| 8080/);
});

test('bot-only Dockerfile omits the webapp copy and defaults HAS_WEBAPP off', () => {
  const { dockerfile } = deploymentTemplates({ botEntry: 'bot/index.js', hasWebApp: false });
  assert.match(dockerfile, /ENV HAS_WEBAPP="0"/);
  assert.doesNotMatch(dockerfile, /COPY webapp-dist/);
});

test('templates include a dockerignore and a deployment guide', () => {
  const { dockerignore, guide } = deploymentTemplates({ botEntry: 'bot/index.js', hasWebApp: true });
  assert.match(dockerignore, /^\.env/m);
  assert.match(dockerignore, /node_modules/);
  assert.match(guide, /docker build/);
  assert.match(guide, /PUBLIC_WEBAPP_URL/);
});

test('generated launcher serves health, static files and the normalized public URL', async t => {
  const root = await mkdtemp(join(tmpdir(), 'studio-launcher-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'bot'), { recursive: true });
  await mkdir(join(root, 'webapp-dist'), { recursive: true });
  await writeFile(join(root, 'bot', 'index.js'), botSource);
  await writeFile(join(root, 'webapp-dist', 'index.html'), '<!doctype html><title>served-ok</title>');
  const { launcher } = deploymentTemplates({ botEntry: 'bot/index.js', hasWebApp: true, appRoot: root });
  await writeFile(join(root, 'start.mjs'), launcher);

  const port = 18000 + Math.floor(Math.random() * 1000);
  const child = spawn(process.execPath, [join(root, 'start.mjs')], {
    env: { ...process.env, BOT_TOKEN: 'test-token', BOT_ENTRY: 'bot/index.js', HAS_WEBAPP: '1', PUBLIC_WEBAPP_URL: 'https://example.test/team/agent', PORT: String(port), SEEN_URL_FILE: join(root, 'seen-url.txt') },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  t.after(() => child.kill());

  let health;
  for (let i = 0; i < 100; i++) {
    try { const res = await fetch('http://127.0.0.1:' + port + '/healthz'); health = await res.json(); if (health.ok) break; } catch {}
    await sleep(50);
  }
  assert.equal(health?.ok, true);
  assert.equal(health?.webapp, true);
  const page = await fetch('http://127.0.0.1:' + port + '/team/agent/');
  assert.equal(page.status, 200);
  assert.match(await page.text(), /served-ok/);
  assert.equal(await readFile(join(root, 'seen-url.txt'), 'utf8'), 'https://example.test/team/agent/');
  child.kill();
});

test('generated launcher rejects a missing token and unsafe public URLs', async t => {
  const root = await mkdtemp(join(tmpdir(), 'studio-launcher-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'bot'), { recursive: true });
  await writeFile(join(root, 'bot', 'index.js'), 'setInterval(() => {}, 1000);');
  const { launcher } = deploymentTemplates({ botEntry: 'bot/index.js', hasWebApp: true, appRoot: root });
  await writeFile(join(root, 'start.mjs'), launcher);

  const missing = await runLauncher(root, { HAS_WEBAPP: '1', PUBLIC_WEBAPP_URL: 'https://example.test/' });
  assert.notEqual(missing.code, 0);
  assert.match(missing.stderr, /BOT_TOKEN/);

  const javascriptUrl = await runLauncher(root, { BOT_TOKEN: 'x', BOT_ENTRY: 'bot/index.js', HAS_WEBAPP: '1', PUBLIC_WEBAPP_URL: 'javascript:alert(1)' });
  assert.notEqual(javascriptUrl.code, 0);
  assert.match(javascriptUrl.stderr, /http/);
  assert.doesNotMatch(javascriptUrl.stderr, /javascript:/);

  const traversal = await runLauncher(root, { BOT_TOKEN: 'x', HAS_WEBAPP: '0', BOT_ENTRY: '../../etc/passwd' });
  assert.notEqual(traversal.code, 0);
  assert.match(traversal.stderr, /越界/);
});
