import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readdir, readFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, basename, join } from 'node:path';
import { extract as tarExtract, list as tarList } from 'tar';
import { inspectDeployment } from '../src/deployment/inspect.mjs';
import { copyDeploymentBot } from '../src/deployment/archive.mjs';
import { DeploymentPackages } from '../src/deployment/package.mjs';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function projectFixture(t, { webapp = false, files = [] } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'studio-package-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'bot'), { recursive: true });
  await writeFile(join(root, 'bot', 'index.js'), 'setInterval(() => {}, 1000);\n');
  if (webapp) {
    await mkdir(join(root, 'webapp'), { recursive: true });
    await writeFile(join(root, 'webapp', 'index.html'), '<script type="module" src="./main.js"></script>');
    await writeFile(join(root, 'webapp', 'main.js'), 'globalThis.webappReady = true;\n');
  }
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'demo', private: true, type: 'module', dependencies: {} }));
  for (const [path, content] of files) {
    await mkdir(join(root, dirname(path)), { recursive: true });
    await writeFile(join(root, path), content);
  }
  return root;
}

async function archiveEntries(archivePath) {
  const entries = [];
  await tarList({ file: archivePath, onentry: entry => entries.push(entry.path) });
  return entries;
}

test('generate assembles a Docker context and excludes secrets and caches', async t => {
  const root = await projectFixture(t, { webapp: true, files: [['.env', 'BOT_TOKEN=secret']] });
  await mkdir(join(root, 'node_modules'), { recursive: true });
  await writeFile(join(root, 'node_modules', 'leftpad.js'), 'module.exports = 1;');
  const packages = new DeploymentPackages();
  t.after(() => packages.close());
  const result = await packages.generate(root, { botEntry: 'bot/index.js' });
  assert.equal(result.inspectionRevision.length, 64);
  const rootName = `${basename(root)}-deploy`;
  assert.equal(result.rootName, rootName);
  assert.match(result.filename, new RegExp(`^${rootName}-\\d+\\.tar\\.gz$`));
  const download = packages.consume(result.id);
  assert.equal(download.filename, result.filename);
  assert.ok(download.size > 0);
  const entries = await archiveEntries(download.path);
  assert.ok(entries.includes(`${rootName}/Dockerfile`));
  assert.ok(entries.includes(`${rootName}/.dockerignore`));
  assert.ok(entries.includes(`${rootName}/package.json`));
  assert.ok(entries.includes(`${rootName}/deploy/start.mjs`));
  assert.ok(entries.includes(`${rootName}/DEPLOY.md`));
  assert.ok(entries.includes(`${rootName}/bot/index.js`));
  assert.ok(entries.includes(`${rootName}/webapp-dist/index.html`));
  assert.ok(entries.some(path => path.startsWith(`${rootName}/webapp-dist/assets/`)));
  assert.ok(entries.every(path => !path.includes('.env') && !path.includes('node_modules')));
  download.dispose();
});

test('generate respects a user-managed Dockerfile', async t => {
  const root = await projectFixture(t, { files: [['deploy/Dockerfile', 'FROM scratch\n# managed-by-user\n']] });
  const packages = new DeploymentPackages();
  t.after(() => packages.close());
  const result = await packages.generate(root, { botEntry: 'bot/index.js' });
  const download = packages.consume(result.id);
  const out = await mkdtemp(join(tmpdir(), 'studio-extract-'));
  t.after(() => rm(out, { recursive: true, force: true }));
  await tarExtract({ file: download.path, cwd: out });
  const dockerfile = await readFile(join(out, result.rootName, 'Dockerfile'), 'utf8');
  assert.match(dockerfile, /managed-by-user/);
  download.dispose();
});

test('a download is consumed exactly once', async t => {
  const root = await projectFixture(t);
  const packages = new DeploymentPackages();
  t.after(() => packages.close());
  const result = await packages.generate(root, { botEntry: 'bot/index.js' });
  const first = packages.consume(result.id);
  assert.equal(first.filename, result.filename);
  assert.throws(() => packages.consume(result.id), /部署包已下载或已过期/);
  first.dispose();
});

test('an expired download is rejected', async t => {
  const root = await projectFixture(t);
  const packages = new DeploymentPackages({ ttlMs: 1 });
  t.after(() => packages.close());
  const result = await packages.generate(root, { botEntry: 'bot/index.js' });
  await sleep(10);
  assert.throws(() => packages.consume(result.id), /部署包已下载或已过期/);
});

test('only one generation runs at a time', async t => {
  const root = await projectFixture(t);
  const packages = new DeploymentPackages();
  t.after(() => packages.close());
  const first = packages.generate(root, { botEntry: 'bot/index.js' });
  await assert.rejects(packages.generate(root, { botEntry: 'bot/index.js' }), /正在生成/);
  await first;
});

test('a failed generation cleans up its staging data', async t => {
  const root = await projectFixture(t);
  const packages = new DeploymentPackages();
  t.after(() => packages.close());
  await assert.rejects(packages.generate(root, { botEntry: 'bot/index.js', limits: { archiveBytes: 1 } }), /大小上限/);
  assert.equal(packages.packages.size, 0);
});

test('close() removes the staging root', async t => {
  const root = await projectFixture(t);
  const packages = new DeploymentPackages();
  await packages.generate(root, { botEntry: 'bot/index.js' });
  const stagingRoot = packages.root;
  assert.ok(stagingRoot);
  await packages.close();
  await assert.rejects(readdir(stagingRoot), /ENOENT/);
});

test('copyDeploymentBot rejects a file replaced by a symlink after inspection', async t => {
  const root = await projectFixture(t);
  const inspection = await inspectDeployment(root, { botEntry: 'bot/index.js' });
  const dest = await mkdtemp(join(tmpdir(), 'studio-copy-'));
  t.after(() => rm(dest, { recursive: true, force: true }));
  await rm(join(root, 'bot', 'index.js'));
  await symlink(join(root, 'bot', 'other.js'), join(root, 'bot', 'index.js'));
  await assert.rejects(copyDeploymentBot(inspection, dest), /符号链接/);
});

test('copyDeploymentBot rejects a bot file changed after inspection', async t => {
  const root = await projectFixture(t);
  const inspection = await inspectDeployment(root, { botEntry: 'bot/index.js' });
  const dest = await mkdtemp(join(tmpdir(), 'studio-copy-'));
  t.after(() => rm(dest, { recursive: true, force: true }));
  await writeFile(join(root, 'bot', 'index.js'), 'changed content!\n');
  await assert.rejects(copyDeploymentBot(inspection, dest), /发生变化/);
});
