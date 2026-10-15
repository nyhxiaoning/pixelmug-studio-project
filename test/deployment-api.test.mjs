import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { startWorkbench } from '../src/workbench.mjs';

const login = { baseUrl: 'https://creator.example.test', accountType: 'EMAIL', account: 'dev@example.test', code: '123456' };

function upstream() {
  const state = { devices: [{ id: 'cup-one', name: '测试杯', sn: 'S001', online: 'ONLINE' }], bots: [{ id: 'bot-one', name: 'Test Bot' }] };
  const fetchImpl = async (url, options) => {
    if (url.endsWith('/login')) return Response.json({ code: 200, result: { id: 'user-one', name: '测试开发者', token: 'private-creator-token' } });
    if (url.endsWith('/creator/bots')) return Response.json({ code: 200, result: state.bots });
    if (url.endsWith('/devices')) return Response.json({ code: 200, result: state.devices });
    return Response.json({ code: 200 });
  };
  return { fetchImpl, state };
}

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'studio-deploy-api-'));
  await mkdir(join(root, 'bot'), { recursive: true });
  await mkdir(join(root, 'webapp'), { recursive: true });
  await writeFile(join(root, 'bot', 'index.js'), 'setInterval(() => {}, 1000);\n');
  await writeFile(join(root, 'webapp', 'index.html'), '<script type="module" src="./main.js"></script>');
  await writeFile(join(root, 'webapp', 'main.js'), 'globalThis.ready = true;\n');
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'demo', private: true, type: 'module', dependencies: {} }));
  const mock = upstream();
  const app = await startWorkbench({ port: 0, initialDirectory: root, fetchImpl: mock.fetchImpl, webAppHostname: '127.0.0.1', mdns: false });
  const url = new URL(app.studioUrl), token = new URLSearchParams(url.hash.slice(1)).get('studioToken');
  async function api(path, body, credential = token, extras = {}) {
    const response = await fetch(url.origin + '/api/' + path, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: 'Bearer ' + credential, 'Content-Type': 'application/json', ...extras }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, headers: response.headers, data: await response.json() };
  }
  t.after(async () => { await app.close(); await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); });
  return { root, app, api, mock, token, origin: url.origin };
}

test('deployment endpoints manage files, package, and a one-time download', async t => {
  const f = await fixture(t);
  await f.api('project/open', { path: f.root });

  const inspection = await f.api('deploy/inspect');
  assert.equal(inspection.status, 200);
  assert.equal(inspection.data.botEntry, 'bot/index.js');
  assert.equal(inspection.data.ok, true);
  assert.equal(inspection.data.hasWebApp, true);

  const generated = await f.api('deploy/files/generate', {});
  assert.equal(generated.status, 200);
  assert.match(await readFile(join(f.root, 'deploy', 'Dockerfile'), 'utf8'), /npm ci --omit=dev/);
  assert.match(await readFile(join(f.root, 'deploy', 'start.mjs'), 'utf8'), /\/healthz/);

  const read = await f.api('deploy/files/read');
  assert.equal(read.status, 200);
  assert.match(read.data.dockerfile.content, /npm ci/);
  assert.match(read.data.launcher.content, /STUDIO_WEBAPP_URL/);

  const stale = await f.api('deploy/files/save', { content: '# changed\n', revision: '0'.repeat(64) });
  assert.equal(stale.status, 400);

  const saved = await f.api('deploy/files/save', { content: '# custom dockerfile\n', revision: read.data.dockerfile.revision });
  assert.equal(saved.status, 200);
  assert.equal(saved.data.revision.length, 64);

  const refused = await f.api('deploy/files/generate', {});
  assert.equal(refused.status, 400);
  assert.match(JSON.stringify(refused.data), /Dockerfile/);

  const forced = await f.api('deploy/files/generate', { force: true });
  assert.equal(forced.status, 200);
  assert.doesNotMatch(await readFile(join(f.root, 'deploy', 'Dockerfile'), 'utf8'), /custom dockerfile/);

  const packaged = await f.api('deploy/package', {});
  assert.equal(packaged.status, 200);
  assert.equal(packaged.data.inspectionRevision.length, 64);
  const rootName = `${basename(f.root)}-deploy`;
  assert.equal(packaged.data.rootName, rootName);

  const first = await fetch(f.origin + '/api/deploy/package/' + packaged.data.id, { headers: { Authorization: 'Bearer ' + f.token } });
  assert.equal(first.status, 200);
  assert.equal(first.headers.get('content-type'), 'application/gzip');
  assert.match(first.headers.get('content-disposition'), new RegExp(`attachment; filename="${rootName}-\\d+\\.tar\\.gz"`));
  const bytes = new Uint8Array(await first.arrayBuffer());
  assert.equal(bytes[0], 0x1f);
  assert.equal(bytes[1], 0x8b);
  assert.equal(Number(first.headers.get('content-length')), packaged.data.size);

  const second = await fetch(f.origin + '/api/deploy/package/' + packaged.data.id, { headers: { Authorization: 'Bearer ' + f.token } });
  assert.equal(second.status, 404);
});

test('deployment endpoints reject unauthenticated and foreign-origin access', async t => {
  const f = await fixture(t);
  await f.api('project/open', { path: f.root });
  assert.equal((await f.api('deploy/inspect', undefined, 'bad')).status, 401);
  assert.equal((await f.api('deploy/inspect', undefined, f.token, { Origin: 'https://evil.example' })).status, 403);
});
