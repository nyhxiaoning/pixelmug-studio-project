import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { ProjectFiles } from '../project-files.mjs';
import { DEPLOY_FILES } from './constants.mjs';
import { deploymentTemplates } from './templates.mjs';

const revision = data => createHash('sha256').update(data).digest('hex');

async function hasWebApp(projectRoot) {
  try { return (await stat(join(projectRoot, 'webapp'))).isDirectory(); } catch { return false; }
}

async function readManaged(files, path) {
  try { return await files.read(path); } catch { return null; }
}

async function writeNewManaged(projectRoot, path, content) {
  const target = join(projectRoot, ...path.split('/'));
  await writeFile(target, content, { flag: 'wx' });
  return { path, content, revision: revision(Buffer.from(content)) };
}

async function generateManagedFiles(projectRoot, botEntry, { force = false } = {}) {
  const files = new ProjectFiles(projectRoot);
  const templates = deploymentTemplates({ botEntry, hasWebApp: await hasWebApp(projectRoot) });
  await mkdir(join(projectRoot, 'deploy'), { recursive: true });

  const existingDockerfile = await readManaged(files, DEPLOY_FILES.dockerfile);
  if (existingDockerfile && existingDockerfile.content !== templates.dockerfile && !force) {
    throw new Error('Dockerfile 已修改，请确认后强制覆盖');
  }
  const dockerfile = existingDockerfile
    ? await files.save(DEPLOY_FILES.dockerfile, templates.dockerfile, existingDockerfile.revision)
    : await writeNewManaged(projectRoot, DEPLOY_FILES.dockerfile, templates.dockerfile);

  const existingLauncher = await readManaged(files, DEPLOY_FILES.launcher);
  const launcher = existingLauncher
    ? await files.save(DEPLOY_FILES.launcher, templates.launcher, existingLauncher.revision)
    : await writeNewManaged(projectRoot, DEPLOY_FILES.launcher, templates.launcher);

  return { dockerfile, launcher };
}

export function createDeploymentRoutes({ packages, getProject, getBotEntry, bodyOf, reply }) {
  return {
    async handle(req, res, url) {
      const pathname = url.pathname;
      if (!pathname.startsWith('/api/deploy/')) return false;
      const project = getProject();
      if (!project) { reply(res, 400, { error: '请先打开项目目录' }); return true; }

      if (req.method === 'GET' && pathname === '/api/deploy/inspect') {
        reply(res, 200, await packages.inspect(project.path, { botEntry: getBotEntry() }));
        return true;
      }

      if (req.method === 'POST' && pathname === '/api/deploy/files/generate') {
        const body = await bodyOf(req);
        reply(res, 200, await generateManagedFiles(project.path, getBotEntry(), { force: body?.force === true }));
        return true;
      }

      if (req.method === 'GET' && pathname === '/api/deploy/files/read') {
        const files = new ProjectFiles(project.path);
        reply(res, 200, {
          dockerfile: await readManaged(files, DEPLOY_FILES.dockerfile),
          launcher: await readManaged(files, DEPLOY_FILES.launcher),
        });
        return true;
      }

      if (req.method === 'POST' && pathname === '/api/deploy/files/save') {
        const body = await bodyOf(req, 7 * 1024 * 1024);
        const files = new ProjectFiles(project.path);
        reply(res, 200, await files.save(DEPLOY_FILES.dockerfile, body.content, body.revision));
        return true;
      }

      if (req.method === 'POST' && pathname === '/api/deploy/package') {
        await bodyOf(req);
        reply(res, 200, await packages.generate(project.path, { botEntry: getBotEntry() }));
        return true;
      }

      const match = pathname.match(/^\/api\/deploy\/package\/([a-f0-9]{48})$/);
      if (req.method === 'GET' && match) {
        let download;
        try { download = packages.consume(match[1]); }
        catch (error) { reply(res, 404, { error: error.message }); return true; }
        res.writeHead(200, {
          'Content-Type': 'application/gzip',
          'Content-Length': String(download.size),
          'Content-Disposition': `attachment; filename="${download.filename}"`,
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        });
        await new Promise(resolve => {
          let done = false;
          const finish = () => { if (done) return; done = true; download.dispose(); resolve(); };
          const stream = createReadStream(download.path);
          stream.on('error', () => { res.destroy(); finish(); });
          res.on('finish', finish);
          res.on('close', finish);
          stream.pipe(res);
        });
        return true;
      }

      return false;
    },
  };
}
