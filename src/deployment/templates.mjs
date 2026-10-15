// Managed deployment templates: a multi-stage Dockerfile, a runtime launcher,
// a build-context ignore file, and a generated deployment guide. The launcher
// implements the runtime contract (environment validation, static serving,
// /healthz, Bot import, and signal handling) and must stay read-only to users.

const quoteEnv = value => JSON.stringify(value);

function dockerfileTemplate({ botEntry, hasWebApp }) {
  const lines = [
    'FROM node:20-bookworm-slim AS deps',
    'WORKDIR /app',
    'ENV NODE_ENV=production',
    'COPY package.json ./',
    'COPY package-lock.json* ./',
    'RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi',
    '',
    'FROM node:20-bookworm-slim AS runtime',
    'WORKDIR /app',
    'ENV NODE_ENV=production',
    'ENV PORT=8080',
    `ENV BOT_ENTRY=${quoteEnv(botEntry)}`,
    `ENV HAS_WEBAPP="${hasWebApp ? '1' : '0'}"`,
    'COPY --from=deps /app/node_modules ./node_modules',
    'COPY --from=deps /app/package.json ./package.json',
    'COPY --from=deps /app/package-lock.json* ./',
    'COPY bot ./bot',
  ];
  if (hasWebApp) lines.push('COPY webapp-dist ./webapp-dist');
  lines.push('COPY deploy ./deploy');
  lines.push('USER node');
  lines.push('EXPOSE 8080');
  lines.push('CMD ["node", "deploy/start.mjs"]');
  return lines.join('\n') + '\n';
}

function launcherTemplate({ appRoot = '/app' }) {
  return `import { createServer } from 'node:http';
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

const APP_ROOT = ${JSON.stringify(appRoot)};
const BOT_ROOT = join(APP_ROOT, 'bot');
const WEBAPP_ROOT = join(APP_ROOT, 'webapp-dist');
const PORT = Number(process.env.PORT || 8080);
const HAS_WEBAPP = process.env.HAS_WEBAPP === '1';
const BOT_ENTRY = String(process.env.BOT_ENTRY || '');
const BOT_TOKEN = process.env.BOT_TOKEN || '';

function fatal(message) {
  console.error('[deploy] ' + message);
  process.exit(1);
}

if (!BOT_TOKEN) fatal('缺少 BOT_TOKEN：请在容器运行时提供 BOT_TOKEN 环境变量。');
if (!BOT_ENTRY) fatal('缺少 BOT_ENTRY：部署包应提供 Bot 入口。');

const botParts = BOT_ENTRY.split('/').filter(Boolean);
const botEntryPath = join(APP_ROOT, ...botParts);
const botRel = relative(BOT_ROOT, botEntryPath);
if (botRel === '' || botRel.startsWith('..') || isAbsolute(botRel)) {
  fatal('BOT_ENTRY 越界：必须位于 bot/ 目录内。');
}

let publicPathname = '/';
if (HAS_WEBAPP) {
  if (!process.env.PUBLIC_WEBAPP_URL) fatal('缺少 PUBLIC_WEBAPP_URL：包含 webapp 的项目必须提供公开访问地址。');
  let parsed;
  try { parsed = new URL(process.env.PUBLIC_WEBAPP_URL); }
  catch { fatal('PUBLIC_WEBAPP_URL 不是合法的绝对 URL。'); }
  if (!['http:', 'https:'].includes(parsed.protocol)) fatal('PUBLIC_WEBAPP_URL 必须是 http:// 或 https:// 地址。');
  if (parsed.username || parsed.password) fatal('PUBLIC_WEBAPP_URL 不能包含用户名或密码。');
  if (parsed.hash) fatal('PUBLIC_WEBAPP_URL 不能包含片段。');
  if (!parsed.pathname.endsWith('/')) parsed.pathname += '/';
  process.env.STUDIO_WEBAPP_URL = parsed.href;
  publicPathname = parsed.pathname;
}

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.map': 'application/json; charset=utf-8',
};

function typeFor(path) {
  const dot = path.lastIndexOf('.');
  if (dot < 0) return 'application/octet-stream';
  return mime[path.slice(dot).toLowerCase()] || 'application/octet-stream';
}

async function serveWebapp(req, res, pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); }
  catch { res.writeHead(400, { 'Content-Type': 'text/plain' }); res.end('Bad request'); return; }
  let rel = decoded;
  if (rel === publicPathname) rel = '';
  else if (rel.startsWith(publicPathname)) rel = rel.slice(publicPathname.length);
  rel = rel.replace(/^\\/+/, '');
  const target = join(WEBAPP_ROOT, rel);
  const check = relative(WEBAPP_ROOT, target);
  if (check.startsWith('..') || isAbsolute(check)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' }); res.end('Forbidden'); return;
  }
  let file = target;
  if (!rel || rel.endsWith('/')) file = join(target, 'index.html');
  let info;
  try { info = await stat(file); } catch { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }
  if (!info.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': typeFor(file), 'Cache-Control': 'no-cache' });
  createReadStream(file).on('error', () => res.destroy()).pipe(res);
}

let botLoaded = false;
let listening = false;
let closing = false;

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/healthz') {
      const body = JSON.stringify({ ok: botLoaded, bot: botLoaded, webapp: HAS_WEBAPP });
      res.writeHead(botLoaded ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(body);
      return;
    }
    if (HAS_WEBAPP && req.method === 'GET') return serveWebapp(req, res, url.pathname);
    res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found');
  } catch {
    if (!res.headersSent) { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('Server error'); }
    else res.destroy();
  }
});

function shutdown() {
  if (closing) return;
  closing = true;
  const code = process.exitCode || 0;
  if (listening) server.close(() => process.exit(code));
  else process.exit(code);
  setTimeout(() => process.exit(code), 3000).unref();
}

server.listen(PORT, '0.0.0.0', () => {
  listening = true;
  console.log('[deploy] listening on port ' + PORT);
});

const botUrl = pathToFileURL(botEntryPath);
import(botUrl.href).then(() => {
  botLoaded = true;
  console.log('[deploy] bot started');
}).catch(error => {
  console.error('[deploy] Bot 启动失败：' + String((error && error.message) || error));
  process.exitCode = 1;
  shutdown();
});

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
`;
}

const DOCKERIGNORE = `.git
.gitignore
node_modules
debug
mpy
.env
.env.*
.npmrc
npm-debug.log*
*.log
*.tmp
*.temp
*.tar.gz
Dockerfile
.dockerignore
`;

const GUIDE = `# Deployment package

This folder is a self-contained Docker build context generated by PixelMug Studio.
It contains a managed Dockerfile, a runtime launcher, the Bot sources, and (when
present) a production WebApp build. Build the image and run it in a single
container:

\`\`\`sh
tar -xzf <project>-deploy-<timestamp>.tar.gz
cd <project>-deploy
docker build -t my-agent .
docker run --rm -p 8080:8080 \\
  -e BOT_TOKEN='<token>' \\
  -e PUBLIC_WEBAPP_URL='https://agent.example.com/' \\
  my-agent
\`\`\`

## Runtime environment variables

- \`BOT_TOKEN\` — required. The Bot's authentication token.
- \`BOT_API_BASE_URL\` — optional. Override the Bot API base URL.
- \`PUBLIC_WEBAPP_URL\` — required only when this package contains a WebApp. An
  absolute \`http://\` or \`https://\` URL that the public gateway routes to this
  container's port (default \`8080\`). It is normalized and exposed to the Bot as
  \`STUDIO_WEBAPP_URL\`.
- \`PORT\` — optional, defaults to \`8080\`.

Secrets must be supplied by your platform's secret manager and must never be
baked into the image. The public URL must route to the exposed container port.
`;

export function deploymentTemplates({ botEntry, hasWebApp, appRoot = '/app' } = {}) {
  return {
    dockerfile: dockerfileTemplate({ botEntry, hasWebApp }),
    launcher: launcherTemplate({ appRoot }),
    dockerignore: DOCKERIGNORE,
    guide: GUIDE,
  };
}
