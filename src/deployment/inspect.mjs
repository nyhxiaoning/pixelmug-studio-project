import { readFile, readdir, lstat, realpath, stat } from 'node:fs/promises';
import { basename, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import {
  BOT_ENTRY_EXTENSIONS,
  DEPLOY_LIMITS,
  EXCLUDED_CACHES,
  EXCLUDED_NAMES,
  EXCLUDED_SUFFIXES,
  STUDIO_SDK,
  STUDIO_SDK_VERSION,
} from './constants.mjs';

const isPlainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isStringMap = value => isPlainObject(value) && Object.values(value).every(item => typeof item === 'string');

function excludedName(name) {
  const lower = name.toLowerCase();
  if (EXCLUDED_NAMES.has(lower)) return true;
  if (EXCLUDED_CACHES.has(name)) return true;
  if (lower === '.env' || lower.startsWith('.env.')) return true;
  return EXCLUDED_SUFFIXES.some(suffix => lower.endsWith(suffix));
}

function shallowEqual(a, b) {
  if (!isPlainObject(a) || !isPlainObject(b)) return false;
  const keysA = Object.keys(a).sort(), keysB = Object.keys(b).sort();
  if (keysA.join('\0') !== keysB.join('\0')) return false;
  return keysA.every(key => a[key] === b[key]);
}

// Keep only the runtime-relevant fields, force privacy, and pin the Studio SDK
// version when the project does not already declare it.
export function createProductionManifest(sourceManifest, sdkVersion = STUDIO_SDK_VERSION) {
  const manifest = {};
  for (const field of ['name', 'version', 'type', 'engines']) {
    if (sourceManifest?.[field] !== undefined) manifest[field] = sourceManifest[field];
  }
  const dependencies = isStringMap(sourceManifest?.dependencies) ? { ...sourceManifest.dependencies } : {};
  if (!Object.hasOwn(dependencies, STUDIO_SDK)) dependencies[STUDIO_SDK] = sdkVersion;
  manifest.dependencies = dependencies;
  if (isStringMap(sourceManifest?.optionalDependencies)) manifest.optionalDependencies = { ...sourceManifest.optionalDependencies };
  if (isPlainObject(sourceManifest?.overrides)) manifest.overrides = sourceManifest.overrides;
  manifest.private = true;
  return manifest;
}

function validateDependencyMaps(sourceManifest) {
  const errors = [];
  for (const field of ['dependencies', 'optionalDependencies']) {
    if (sourceManifest[field] !== undefined && !isStringMap(sourceManifest[field])) {
      errors.push({ code: 'DEPENDENCY_INVALID', path: 'package.json', message: `package.json 的 ${field} 必须是仅含字符串版本的依赖映射` });
    }
  }
  if (sourceManifest.overrides !== undefined && !isPlainObject(sourceManifest.overrides)) {
    errors.push({ code: 'DEPENDENCY_INVALID', path: 'package.json', message: 'package.json 的 overrides 必须是对象' });
  }
  return errors;
}

async function validateBotEntry(projectRoot, botEntry) {
  const entry = String(botEntry || '').trim().replaceAll('\\', '/');
  if (!entry) return { entry, errors: [{ code: 'BOT_ENTRY_INVALID', message: '请指定 bot/ 目录中的 Bot 入口文件' }] };
  const target = join(projectRoot, ...entry.split('/'));
  const botRoot = join(projectRoot, 'bot');
  const rel = relative(botRoot, target);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
    return { entry, errors: [{ code: 'BOT_ENTRY_INVALID', path: entry, message: 'Bot 入口必须是 bot/ 目录中的文件' }] };
  }
  let info;
  try { info = await lstat(target); }
  catch { return { entry, errors: [{ code: 'BOT_ENTRY_INVALID', path: entry, message: '指定的 Bot 入口文件不存在' }] }; }
  if (info.isSymbolicLink()) return { entry, errors: [{ code: 'BOT_ENTRY_INVALID', path: entry, message: 'Bot 入口不能是符号链接' }] };
  if (!info.isFile()) return { entry, errors: [{ code: 'BOT_ENTRY_INVALID', path: entry, message: 'Bot 入口必须是文件' }] };
  if (!BOT_ENTRY_EXTENSIONS.has(extname(entry).toLowerCase())) {
    return { entry, errors: [{ code: 'BOT_ENTRY_INVALID', path: entry, message: 'Bot 入口必须是 .js、.mjs 或 .cjs 文件' }] };
  }
  return { entry, errors: [] };
}

async function scanBot(projectRoot, limits) {
  const files = [], errors = [];
  let totalBytes = 0, tooManyReported = false, tooLargeReported = false;
  const botRoot = join(projectRoot, 'bot');
  async function walk(dir) {
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); }
    catch { return; }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const dirent of entries) {
      if (excludedName(dirent.name)) continue;
      const full = join(dir, dirent.name);
      const rel = relative(projectRoot, full).replaceAll('\\', '/');
      let info;
      try { info = await lstat(full); } catch { continue; }
      if (info.isSymbolicLink()) {
        errors.push({ code: 'SYMLINK_NOT_ALLOWED', path: rel, message: `不支持符号链接：${rel}` });
        continue;
      }
      if (info.isDirectory()) { await walk(full); continue; }
      if (!info.isFile()) continue;
      if (files.length >= limits.files) {
        if (!tooManyReported) { errors.push({ code: 'TOO_MANY_FILES', message: `Bot 文件数量超过上限 ${limits.files}` }); tooManyReported = true; }
        continue;
      }
      if (info.size > limits.fileBytes) {
        errors.push({ code: 'FILE_TOO_LARGE', path: rel, message: `文件超过大小上限：${rel}` });
        continue;
      }
      totalBytes += info.size;
      if (totalBytes > limits.totalBytes && !tooLargeReported) {
        errors.push({ code: 'TOTAL_SIZE_EXCEEDED', message: 'Bot 文件总大小超过上限' });
        tooLargeReported = true;
      }
      files.push({ path: rel, size: info.size, mtimeMs: info.mtimeMs });
    }
  }
  await walk(botRoot);
  files.sort((a, b) => a.path.localeCompare(b.path));
  return { files, totalBytes, errors };
}

async function checkLockfile(projectRoot, manifest) {
  const lockPath = join(projectRoot, 'package-lock.json');
  try {
    const lock = JSON.parse(await readFile(lockPath, 'utf8'));
    const version = lock?.lockfileVersion;
    if (typeof version !== 'number' || version < 2) {
      return { include: false, warnings: [{ code: 'LOCKFILE_REGENERATED_BY_DOCKER', path: 'package-lock.json', message: 'package-lock.json 版本过旧，容器构建时将改用 npm install' }] };
    }
    const root = isPlainObject(lock.packages) ? lock.packages[''] : null;
    if (manifest && root && shallowEqual(root.dependencies || {}, manifest.dependencies || {}) &&
        shallowEqual(root.optionalDependencies || {}, manifest.optionalDependencies || {}) &&
        Object.keys(root.devDependencies || {}).length === 0) {
      return { include: true, warnings: [] };
    }
    return { include: false, warnings: [{ code: 'LOCKFILE_REGENERATED_BY_DOCKER', path: 'package-lock.json', message: 'package-lock.json 与生成的部署清单不一致，容器构建时将改用 npm install' }] };
  } catch {
    return { include: false, warnings: [] };
  }
}

function computeRevision({ files, manifest, botEntry }) {
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file.path); hash.update('\0');
    hash.update(String(file.size)); hash.update('\0');
    hash.update(String(file.mtimeMs)); hash.update('\0');
  }
  hash.update(JSON.stringify(manifest || {})); hash.update('\0');
  hash.update(String(botEntry || '')); hash.update('\0');
  return hash.digest('hex');
}

export async function inspectDeployment(project, { botEntry, sdkVersion = STUDIO_SDK_VERSION, limits = {} } = {}) {
  const effectiveLimits = { ...DEPLOY_LIMITS, ...limits };
  const errors = [], warnings = [];
  const projectRoot = await realpath(resolve(project));
  const projectName = basename(projectRoot);

  let sourceManifest = null;
  try {
    const raw = await readFile(join(projectRoot, 'package.json'), 'utf8');
    try { sourceManifest = JSON.parse(raw); }
    catch { errors.push({ code: 'PACKAGE_JSON_INVALID', path: 'package.json', message: 'package.json 不是合法的 JSON' }); }
  } catch {
    errors.push({ code: 'PACKAGE_JSON_MISSING', path: 'package.json', message: '项目缺少 package.json' });
  }

  if (sourceManifest !== null && !isPlainObject(sourceManifest)) {
    errors.push({ code: 'PACKAGE_JSON_INVALID', path: 'package.json', message: 'package.json 必须是 JSON 对象' });
    sourceManifest = null;
  }
  if (sourceManifest) {
    errors.push(...validateDependencyMaps(sourceManifest));
    if (isStringMap(sourceManifest.dependencies) && sourceManifest.dependencies[STUDIO_SDK] !== undefined &&
        sourceManifest.dependencies[STUDIO_SDK] !== sdkVersion) {
      warnings.push({ code: 'SDK_VERSION_MISMATCH', path: 'package.json', message: `项目声明的 ${STUDIO_SDK} 版本与 Studio 不同，将保留项目声明的版本` });
    }
  }
  const manifest = sourceManifest ? createProductionManifest(sourceManifest, sdkVersion) : null;

  const bot = await validateBotEntry(projectRoot, botEntry);
  errors.push(...bot.errors);

  let hasWebApp = false;
  try { hasWebApp = (await stat(join(projectRoot, 'webapp'))).isDirectory(); } catch {}

  const scan = await scanBot(projectRoot, effectiveLimits);
  errors.push(...scan.errors);

  const lockfile = manifest ? await checkLockfile(projectRoot, manifest) : { include: false, warnings: [] };
  warnings.push(...lockfile.warnings);

  const revision = computeRevision({ files: scan.files, manifest, botEntry: bot.entry });
  return {
    ok: errors.length === 0,
    revision,
    projectName,
    projectRoot,
    botEntry: bot.entry,
    hasWebApp,
    manifest,
    includeLockfile: lockfile.include,
    files: scan.files,
    totalBytes: scan.totalBytes,
    errors,
    warnings,
  };
}
