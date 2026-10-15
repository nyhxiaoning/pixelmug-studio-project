import { randomBytes } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { copyDeploymentBot, createDeploymentArchive } from './archive.mjs';
import { DEPLOY_FILES } from './constants.mjs';
import { inspectDeployment } from './inspect.mjs';
import { deploymentTemplates } from './templates.mjs';
import { buildDeploymentWebApp } from './webapp.mjs';

const DEFAULT_TTL_MS = 10 * 60 * 1000;

// Owns the one-shot deployment package lifecycle for a Workbench session:
// a single active generation, random single-use download identifiers, a
// default 10-minute TTL, and cleanup of every staged archive on failure,
// download, expiry, or shutdown. Staging always lives under the OS temp
// directory, never inside the selected project.
export class DeploymentPackages {
  constructor({ ttlMs = DEFAULT_TTL_MS } = {}) {
    this.ttlMs = ttlMs;
    this.root = null;
    this.packages = new Map();
    this.generating = null;
    this.closed = false;
  }

  async ensureRoot() {
    if (!this.root) this.root = await mkdtemp(join(tmpdir(), 'pixelmug-deploy-'));
    return this.root;
  }

  inspect(project, options) {
    return inspectDeployment(project, options);
  }

  async generate(project, options = {}) {
    if (this.closed) throw new Error('部署服务已关闭');
    if (this.generating) throw new Error('正在生成部署包，请稍后重试');
    this.generating = (async () => {
      const inspection = await inspectDeployment(project, options);
      if (!inspection.ok) throw new Error(inspection.errors[0]?.message || '部署检查未通过');
      const root = await this.ensureRoot();
      const id = randomBytes(24).toString('hex');
      const rootName = `${inspection.projectName}-deploy`;
      const filename = `${rootName}-${Date.now()}.tar.gz`;
      const workDir = join(root, id);
      const contextRoot = join(workDir, rootName);
      const archivePath = join(workDir, filename);
      await mkdir(contextRoot, { recursive: true });
      try {
        const templates = deploymentTemplates({ botEntry: inspection.botEntry, hasWebApp: inspection.hasWebApp });
        const managedDockerfile = join(project, ...DEPLOY_FILES.dockerfile.split('/'));
        let dockerfile = templates.dockerfile;
        try { dockerfile = await readFile(managedDockerfile, 'utf8'); } catch {}
        await writeFile(join(contextRoot, 'Dockerfile'), dockerfile);
        await writeFile(join(contextRoot, '.dockerignore'), templates.dockerignore);
        await writeFile(join(contextRoot, 'DEPLOY.md'), templates.guide);
        await mkdir(join(contextRoot, 'deploy'), { recursive: true });
        await writeFile(join(contextRoot, 'deploy', 'start.mjs'), templates.launcher);
        await writeFile(join(contextRoot, 'package.json'), JSON.stringify(inspection.manifest, null, 2) + '\n');
        if (inspection.includeLockfile) await copyFile(join(project, 'package-lock.json'), join(contextRoot, 'package-lock.json'));
        await copyDeploymentBot(inspection, contextRoot);
        if (inspection.hasWebApp) await buildDeploymentWebApp(project, join(contextRoot, 'webapp-dist'));
        await createDeploymentArchive(contextRoot, archivePath, rootName, { archiveBytes: options.limits?.archiveBytes });
        const size = (await stat(archivePath)).size;
        const expiresAt = Date.now() + this.ttlMs;
        this.packages.set(id, { id, filename, size, expiresAt, inspectionRevision: inspection.revision, path: archivePath, rootName, workDir });
        return { id, filename, size, expiresAt, inspectionRevision: inspection.revision, rootName };
      } catch (error) {
        await rm(workDir, { recursive: true, force: true }).catch(() => {});
        throw error;
      }
    })();
    try {
      return await this.generating;
    } finally {
      this.generating = null;
    }
  }

  consume(id) {
    const record = this.packages.get(id);
    if (!record || record.expiresAt <= Date.now()) {
      if (record) { this.packages.delete(id); this.dispose(record); }
      throw new Error('部署包已下载或已过期');
    }
    this.packages.delete(id);
    const { path, filename, size, rootName } = record;
    return { path, filename, size, rootName, dispose: () => this.dispose(record) };
  }

  async dispose(record) {
    await rm(record.workDir, { recursive: true, force: true }).catch(() => {});
  }

  async close() {
    this.closed = true;
    if (this.generating) await this.generating.catch(() => {});
    const pending = [...this.packages.values()];
    this.packages.clear();
    await Promise.all(pending.map(record => this.dispose(record)));
    if (this.root) { await rm(this.root, { recursive: true, force: true }).catch(() => {}); this.root = null; }
  }
}
