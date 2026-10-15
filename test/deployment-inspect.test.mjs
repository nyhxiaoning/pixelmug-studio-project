import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { inspectDeployment, createProductionManifest } from '../src/deployment/inspect.mjs';

async function projectFixture(t, { packageJson = { name: 'demo', private: true, type: 'module', dependencies: {} }, files = [], webapp = false } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'studio-inspect-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'bot'), { recursive: true });
  await writeFile(join(root, 'bot', 'index.js'), 'setInterval(() => {}, 1000);\n');
  if (webapp) { await mkdir(join(root, 'webapp'), { recursive: true }); await writeFile(join(root, 'webapp', 'index.html'), '<title>x</title>'); }
  await writeFile(join(root, 'package.json'), JSON.stringify(packageJson));
  for (const [path, content] of files) {
    await mkdir(join(root, dirname(path)), { recursive: true });
    await writeFile(join(root, path), content);
  }
  return root;
}

test('deployment inspection creates a production manifest and excludes local content', async t => {
  const root = await projectFixture(t, {
    packageJson: { name: 'demo', private: true, type: 'module', dependencies: { leftpad: '1.3.0' }, devDependencies: { vite: '6.4.3' } },
  });
  await writeFile(join(root, '.env'), 'BOT_TOKEN=secret');
  await mkdir(join(root, 'debug'));
  const report = await inspectDeployment(root, { botEntry: 'bot/index.js', sdkVersion: '0.1.7' });
  assert.equal(report.ok, true);
  assert.deepEqual(report.manifest.dependencies, { '@jeejio-bubble/bot': '0.1.7', leftpad: '1.3.0' });
  assert.equal(report.manifest.devDependencies, undefined);
  assert.equal(report.manifest.private, true);
  assert.ok(report.files.every(file => !file.path.startsWith('.env') && !file.path.startsWith('debug/')));
});

test('deployment inspection rejects symlinks and an entry outside bot', async t => {
  const root = await projectFixture(t);
  await symlink(join(root, 'bot/index.js'), join(root, 'bot/link.js'));
  const report = await inspectDeployment(root, { botEntry: 'webapp/main.js', sdkVersion: '0.1.7' });
  assert.equal(report.ok, false);
  assert.ok(report.errors.some(error => error.code === 'BOT_ENTRY_INVALID'));
  assert.ok(report.errors.some(error => error.code === 'SYMLINK_NOT_ALLOWED'));
});

test('deployment inspection reports invalid package.json', async t => {
  const root = await projectFixture(t);
  await writeFile(join(root, 'package.json'), '{not json');
  const report = await inspectDeployment(root, { botEntry: 'bot/index.js' });
  assert.equal(report.ok, false);
  assert.ok(report.errors.some(error => error.code === 'PACKAGE_JSON_INVALID'));
});

test('deployment inspection rejects malformed dependency maps', async t => {
  const root = await projectFixture(t, { packageJson: { name: 'demo', dependencies: { leftpad: 123 } } });
  const report = await inspectDeployment(root, { botEntry: 'bot/index.js' });
  assert.equal(report.ok, false);
  assert.ok(report.errors.some(error => error.code === 'DEPENDENCY_INVALID'));
});

test('deployment inspection enforces the file-count limit', async t => {
  const root = await projectFixture(t, { files: [['bot/a.js', 'a'], ['bot/b.js', 'b']] });
  const report = await inspectDeployment(root, { botEntry: 'bot/index.js', limits: { files: 2 } });
  assert.equal(report.ok, false);
  assert.ok(report.errors.some(error => error.code === 'TOO_MANY_FILES'));
});

test('deployment inspection enforces the per-file size limit', async t => {
  const root = await projectFixture(t, { files: [['bot/big.js', 'x'.repeat(2048)]] });
  const report = await inspectDeployment(root, { botEntry: 'bot/index.js', limits: { fileBytes: 1024 } });
  assert.equal(report.ok, false);
  assert.ok(report.errors.some(error => error.code === 'FILE_TOO_LARGE'));
});

test('deployment inspection enforces the total size limit', async t => {
  const root = await projectFixture(t, { files: [['bot/a.js', 'x'.repeat(1000)], ['bot/b.js', 'x'.repeat(1000)]] });
  const report = await inspectDeployment(root, { botEntry: 'bot/index.js', limits: { totalBytes: 1500 } });
  assert.equal(report.ok, false);
  assert.ok(report.errors.some(error => error.code === 'TOTAL_SIZE_EXCEEDED'));
});

test('deployment inspection includes a lockfile that exactly matches the manifest', async t => {
  const root = await projectFixture(t, {
    packageJson: { name: 'demo', private: true, type: 'module', dependencies: { '@jeejio-bubble/bot': '0.1.7' } },
  });
  await writeFile(join(root, 'package-lock.json'), JSON.stringify({
    name: 'demo', lockfileVersion: 3,
    packages: {
      '': { name: 'demo', dependencies: { '@jeejio-bubble/bot': '0.1.7' } },
      'node_modules/@jeejio-bubble/bot': { version: '0.1.7' },
    },
  }));
  const report = await inspectDeployment(root, { botEntry: 'bot/index.js', sdkVersion: '0.1.7' });
  assert.equal(report.ok, true);
  assert.equal(report.includeLockfile, true);
});

test('deployment inspection omits a lockfile invalidated by adding the SDK', async t => {
  const root = await projectFixture(t, {
    packageJson: { name: 'demo', private: true, type: 'module', dependencies: { leftpad: '1.3.0' } },
  });
  await writeFile(join(root, 'package-lock.json'), JSON.stringify({
    name: 'demo', lockfileVersion: 3,
    packages: {
      '': { name: 'demo', dependencies: { leftpad: '1.3.0' } },
      'node_modules/leftpad': { version: '1.3.0' },
    },
  }));
  const report = await inspectDeployment(root, { botEntry: 'bot/index.js', sdkVersion: '0.1.7' });
  assert.equal(report.ok, true);
  assert.equal(report.includeLockfile, false);
  assert.ok(report.warnings.some(warning => warning.code === 'LOCKFILE_REGENERATED_BY_DOCKER'));
});

test('createProductionManifest keeps runtime fields and pins the SDK', () => {
  const manifest = createProductionManifest({
    name: 'agent', version: '2.0.0', type: 'module', scripts: { start: 'node x' },
    dependencies: { leftpad: '1.3.0' }, devDependencies: { vite: '6.4.3' },
    optionalDependencies: { sharp: '0.33.0' },
  }, '0.1.7');
  assert.equal(manifest.name, 'agent');
  assert.equal(manifest.version, '2.0.0');
  assert.equal(manifest.private, true);
  assert.equal(manifest.scripts, undefined);
  assert.equal(manifest.devDependencies, undefined);
  assert.deepEqual(manifest.dependencies, { leftpad: '1.3.0', '@jeejio-bubble/bot': '0.1.7' });
  assert.deepEqual(manifest.optionalDependencies, { sharp: '0.33.0' });
});
