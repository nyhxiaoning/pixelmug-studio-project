# Docker Deployment Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a three-step Studio deployment workspace that validates the selected agent, manages project-local Docker files, and downloads a safe `.tar.gz` context for a single-container Bot plus WebApp deployment.

**Architecture:** Deployment logic lives under `src/deployment/` and is exposed through the existing authenticated Workbench HTTP server. The exporter builds WebApp production assets in a temporary directory, copies an allowlisted Bot tree, installs dependencies during Docker image construction, and packages a managed Dockerfile plus a Node launcher that maps `PUBLIC_WEBAPP_URL` to `STUDIO_WEBAPP_URL` before starting the Bot.

**Tech Stack:** Node.js ESM, Node `http`, Vue 3, Vite, CodeMirror 6, `node:test`, `tar` 7, Electron-compatible filesystem APIs.

**Spec:** `docs/plans/2026-10-14-docker-deployment-design.md`

## Global Constraints

- Support Node.js `>=20.6` on macOS and Windows Studio hosts.
- Generate a `.tar.gz` only; do not invoke Docker, push an image, or contact a cloud deployment API.
- Persist managed files only under the selected project's `deploy/` directory.
- Keep archives, WebApp build output, and staging data outside the selected project.
- Never include `.env*`, `.npmrc`, `node_modules/`, `.git/`, `debug/`, `mpy/`, caches, logs, or credentials.
- Reject symbolic links and paths outside the selected project.
- Install Bot production dependencies during `docker build`, before Bot startup.
- Require `BOT_TOKEN` at container runtime; keep `BOT_API_BASE_URL` optional.
- Require and validate `PUBLIC_WEBAPP_URL` only for projects with `webapp/`; assign it to `STUDIO_WEBAPP_URL` before importing the Bot.
- Preserve the existing local debugging behavior and test suite.
- Add Chinese UI copy and matching English entries in `ui/en.js`.

---

## File map

**Create:**

- `src/deployment/constants.mjs` — limits, exclusions, filenames, and SDK version lookup.
- `src/deployment/inspect.mjs` — project scan, production manifest generation, revision calculation, and structured validation.
- `src/deployment/templates.mjs` — Dockerfile, `.dockerignore`, launcher, and deployment guide templates.
- `src/deployment/webapp.mjs` — production WebApp build wrapper.
- `src/deployment/archive.mjs` — safe Bot copy and cross-platform tar/gzip creation.
- `src/deployment/package.mjs` — per-Workbench package lifecycle and one-time downloads.
- `src/deployment/routes.mjs` — deployment API request handling.
- `test/deployment-inspect.test.mjs`
- `test/deployment-templates.test.mjs`
- `test/deployment-package.test.mjs`
- `test/deployment-api.test.mjs`
- `test/deployment-docker.test.mjs`
- `ui/components/DeployWorkspace.vue`
- `ui/components/DeployCheckPanel.vue`
- `ui/components/DockerfilePanel.vue`
- `ui/components/DeployPackagePanel.vue`

**Modify:**

- `src/webapp-build.mjs` — distinguish Studio-debug and production build modes.
- `src/workbench.mjs` — create/close the deployment service and delegate deployment routes.
- `test/webapp-build.test.mjs` — verify production output has no Studio injection.
- `test/workbench.test.mjs` — retain lifecycle regression coverage where needed.
- `ui/App.vue` — mount the deployment workspace.
- `ui/components/StageNavigation.vue` — add the Deploy navigation entry.
- `ui/en.js` — add English translations.
- `ui/styles.css` — add the Deploy icon and shared responsive layout rules.
- `test/i18n.test.mjs` — cover new translation keys.
- `README.md` — document generation and generated-container usage.
- `package.json`, `package-lock.json` — add direct `tar` dependency and optional Docker smoke-test script.

---

### Task 1: Split Studio and production WebApp builds

**Files:**

- Modify: `src/webapp-build.mjs`
- Create: `src/deployment/webapp.mjs`
- Modify: `test/webapp-build.test.mjs`

**Interfaces:**

- Produces: `buildWebApp(source, output, { studioDebug = true } = {}) -> Promise<string>`
- Produces: `buildDeploymentWebApp(projectRoot, output) -> Promise<string | null>`
- Preserves: existing callers receive Studio debug injection by default.

- [ ] **Step 1: Write the failing production-build test**

Append a test that builds the same WebApp in production mode and asserts that SDK code is bundled while debug bootstrap references are absent:

```js
test('production WebApp build bundles SDK without Studio debug injection', async t => {
  const project = await mkdtemp(join(tmpdir(), 'studio-production-webapp-'));
  const output = join(project, 'output');
  t.after(() => rm(project, { recursive: true, force: true }));
  await mkdir(join(project, 'webapp'));
  await writeFile(join(project, 'webapp/index.html'), '<script type="module" src="./main.js"></script>');
  await writeFile(join(project, 'webapp/main.js'), "import { BubbleWebApp } from '@jeejio-bubble/bot/sdk/WebApp.js'; globalThis.webapp = new BubbleWebApp({ ble:false });");

  await buildWebApp(join(project, 'webapp'), output, { studioDebug: false });
  const files = await readdir(join(output, 'assets'));
  const code = await readFile(join(output, 'assets', files.find(name => name.endsWith('.js'))), 'utf8');
  const html = await readFile(join(output, 'index.html'), 'utf8');
  assert.doesNotMatch(html + code, /studio-debug-config|@studio-bootstrap|StudioDebugWeb/);
  assert.match(code, /BubbleWebApp|web_app_data/);
});
```

- [ ] **Step 2: Run the focused test and confirm the options argument is unsupported**

Run: `node --test --test-name-pattern="production WebApp" test/webapp-build.test.mjs`

Expected: FAIL because `buildWebApp` still injects the Studio bootstrap.

- [ ] **Step 3: Gate both HTML injection and runtime resolution behind `studioDebug`**

Change the function signature and plugin hooks:

```js
export async function buildWebApp(source, output, { studioDebug = true } = {}) {
  // existing input discovery remains unchanged
}
```

In `transformIndexHtml`, return no tags when `studioDebug` is false. In `resolveId` and `load`, expose `/@studio-bootstrap` and `/studio-runtime/` only when `studioDebug` is true. Keep package resolution for `@jeejio-bubble/bot` and other npm imports in both modes. Keep `base: './'` so exported assets work under URL path prefixes.

- [ ] **Step 4: Add the deployment wrapper**

Implement `src/deployment/webapp.mjs`:

```js
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { buildWebApp } from '../webapp-build.mjs';

export async function buildDeploymentWebApp(projectRoot, output) {
  const source = join(projectRoot, 'webapp');
  try { await access(source); } catch { return null; }
  return buildWebApp(source, output, { studioDebug: false });
}
```

- [ ] **Step 5: Run WebApp tests**

Run: `node --test test/webapp-build.test.mjs`

Expected: PASS, including the existing Studio-injection assertion and the new production exclusion assertion.

- [ ] **Step 6: Commit**

```bash
git add src/webapp-build.mjs src/deployment/webapp.mjs test/webapp-build.test.mjs
git commit -m "feat: add production WebApp build mode"
```

---

### Task 2: Validate deployment inputs and generate the production manifest

**Files:**

- Create: `src/deployment/constants.mjs`
- Create: `src/deployment/inspect.mjs`
- Create: `test/deployment-inspect.test.mjs`

**Interfaces:**

- Produces: `inspectDeployment(project, { botEntry, sdkVersion, limits } = {}) -> Promise<DeploymentInspection>`
- Produces: `createProductionManifest(sourceManifest, sdkVersion) -> object`
- Produces: `DeploymentInspection = { ok, revision, projectName, projectRoot, botEntry, hasWebApp, manifest, includeLockfile, files, totalBytes, errors, warnings }`
- Error entries use `{ code, path?, message }`; warnings use the same shape.

- [ ] **Step 1: Write failing tests for valid, invalid, and secret-bearing projects**

Create fixtures that prove the inspector:

```js
test('deployment inspection creates a production manifest and excludes local content', async t => {
  const root = await projectFixture(t, {
    packageJson: { name:'demo', private:true, type:'module', dependencies:{ leftpad:'1.3.0' }, devDependencies:{ vite:'6.4.3' } },
  });
  await writeFile(join(root, '.env'), 'BOT_TOKEN=secret');
  await mkdir(join(root, 'debug'));
  const report = await inspectDeployment(root, { botEntry:'bot/index.js', sdkVersion:'0.1.7' });
  assert.equal(report.ok, true);
  assert.deepEqual(report.manifest.dependencies, { '@jeejio-bubble/bot':'0.1.7', leftpad:'1.3.0' });
  assert.equal(report.manifest.devDependencies, undefined);
  assert.ok(report.files.every(file => !file.path.startsWith('.env') && !file.path.startsWith('debug/')));
});

test('deployment inspection rejects symlinks and an entry outside bot', async t => {
  const root = await projectFixture(t);
  await symlink(join(root, 'bot/index.js'), join(root, 'bot/link.js'));
  const report = await inspectDeployment(root, { botEntry:'webapp/main.js', sdkVersion:'0.1.7' });
  assert.equal(report.ok, false);
  assert.ok(report.errors.some(error => error.code === 'BOT_ENTRY_INVALID'));
  assert.ok(report.errors.some(error => error.code === 'SYMLINK_NOT_ALLOWED'));
});
```

Also cover invalid JSON, malformed dependency maps, file-count limit, per-file limit, total-size limit, a matching lockfile, and a lockfile invalidated by adding the SDK.

- [ ] **Step 2: Run the new test**

Run: `node --test test/deployment-inspect.test.mjs`

Expected: FAIL with module-not-found for `src/deployment/inspect.mjs`.

- [ ] **Step 3: Define constants and exclusions**

Export frozen values from `constants.mjs`:

```js
export const DEPLOY_LIMITS = Object.freeze({ files: 5000, fileBytes: 10 * 1024 * 1024, totalBytes: 100 * 1024 * 1024 });
export const EXCLUDED_NAMES = new Set(['.git', 'node_modules', 'debug', 'mpy', '.npmrc']);
export const EXCLUDED_SUFFIXES = ['.log', '.tmp', '.temp', '.bak', '.swp', '.swo', '.tar.gz'];
export const DEPLOY_FILES = Object.freeze({ dockerfile:'deploy/Dockerfile', launcher:'deploy/start.mjs' });
```

Treat any basename equal to `.env` or beginning with `.env.` as excluded. Exclude hidden caches but do not broadly hide all dotfiles because `.dockerignore` is generated intentionally.

- [ ] **Step 4: Implement production manifest generation**

Keep only `name`, `version`, `private`, `type`, `engines`, `dependencies`, `optionalDependencies`, and `overrides`. Force `private: true`. Validate every dependency collection as a plain object of string values. Insert `@jeejio-bubble/bot` with the exact Studio version when absent; report a warning when an existing version is not exact or differs from Studio.

- [ ] **Step 5: Implement the safe recursive scan and revision**

Use `lstat` for every Bot entry, reject symbolic links, count bytes before reading content, sort relative POSIX paths, and hash `path + NUL + size + NUL + mtimeMs` plus the generated manifest and Bot entry. Do not follow directory junctions on Windows.

- [ ] **Step 6: Determine lockfile compatibility**

Set `includeLockfile` only when `package-lock.json` parses, uses a supported lockfile version, and its root dependency maps exactly match the generated production manifest. Otherwise emit `LOCKFILE_REGENERATED_BY_DOCKER` as a warning and omit it from the artifact.

- [ ] **Step 7: Run inspection tests**

Run: `node --test test/deployment-inspect.test.mjs`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/deployment/constants.mjs src/deployment/inspect.mjs test/deployment-inspect.test.mjs
git commit -m "feat: validate deployment inputs"
```

---

### Task 3: Generate Docker and runtime templates

**Files:**

- Create: `src/deployment/templates.mjs`
- Create: `test/deployment-templates.test.mjs`

**Interfaces:**

- Produces: `deploymentTemplates({ botEntry, hasWebApp }) -> { dockerfile, launcher, dockerignore, guide }`
- The launcher reads `BOT_ENTRY`, `HAS_WEBAPP`, `BOT_TOKEN`, `BOT_API_BASE_URL`, `PUBLIC_WEBAPP_URL`, and `PORT`.

- [ ] **Step 1: Write template contract tests**

```js
test('Dockerfile installs dependencies before defining the runtime command', () => {
  const { dockerfile } = deploymentTemplates({ botEntry:'bot/index.js', hasWebApp:true });
  assert.match(dockerfile, /npm ci --omit=dev/);
  assert.match(dockerfile, /npm install --omit=dev/);
  assert.ok(dockerfile.indexOf('npm ci') < dockerfile.indexOf('CMD ["node", "deploy\/start.mjs"]'));
  assert.match(dockerfile, /ENV BOT_ENTRY="bot\/index.js"/);
  assert.match(dockerfile, /ENV HAS_WEBAPP="1"/);
});

test('launcher maps a validated public URL before importing the bot', async () => {
  const { launcher } = deploymentTemplates({ botEntry:'bot/index.js', hasWebApp:true });
  assert.ok(launcher.indexOf('process.env.STUDIO_WEBAPP_URL') < launcher.indexOf('import(botUrl.href)'));
  assert.match(launcher, /\/healthz/);
  assert.match(launcher, /SIGTERM/);
});
```

Add cases for Bot-only templates, URL credentials, fragments, non-HTTP protocols, path prefixes, missing `BOT_TOKEN`, default `PORT=8080`, and traversal attempts in `BOT_ENTRY`.

- [ ] **Step 2: Run the template test**

Run: `node --test test/deployment-templates.test.mjs`

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement the multi-stage Dockerfile template**

Generate a shell-free Dockerfile contract with a dependency stage and runtime stage. The install command must branch on lockfile presence:

```dockerfile
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi
```

Use `node:20-bookworm-slim`, a non-root `node` user, `NODE_ENV=production`, `PORT=8080`, `EXPOSE 8080`, and `CMD ["node", "deploy/start.mjs"]`.

- [ ] **Step 4: Implement the launcher template**

The generated launcher must:

- resolve `BOT_ENTRY` beneath `/app/bot` without path traversal;
- reject an empty `BOT_TOKEN`;
- validate and normalize `PUBLIC_WEBAPP_URL` for WebApp projects;
- set `process.env.STUDIO_WEBAPP_URL` before dynamic Bot import;
- serve only real files beneath `/app/webapp-dist` using decoded safe paths;
- map the public URL pathname to the WebApp root and fall back to `index.html` only for directory requests;
- return JSON from `/healthz` with `ok`, `bot`, and `webapp` fields;
- mark health unhealthy and exit when Bot import rejects or the Bot process terminates the event loop;
- close the HTTP server on `SIGINT` and `SIGTERM`.

- [ ] **Step 5: Add executable launcher tests**

Write the generated launcher and a fixture Bot into a temporary `/app`-like directory, replace template roots through exported template options used only by tests, spawn Node, and assert:

```js
assert.equal(health.ok, true);
assert.equal(await readFile(join(root, 'seen-url.txt'), 'utf8'), 'https://example.test/team/agent/');
```

Then spawn without `BOT_TOKEN` and with `PUBLIC_WEBAPP_URL=javascript:alert(1)` and assert non-zero exits with redacted, actionable messages.

- [ ] **Step 6: Run template tests**

Run: `node --test test/deployment-templates.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/deployment/templates.mjs test/deployment-templates.test.mjs
git commit -m "feat: generate Docker deployment runtime"
```

---

### Task 4: Assemble and archive a safe Docker context

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/deployment/archive.mjs`
- Create: `src/deployment/package.mjs`
- Create: `test/deployment-package.test.mjs`

**Interfaces:**

- Produces: `copyDeploymentBot(inspection, destination) -> Promise<void>`
- Produces: `createDeploymentArchive(contextDirectory, archivePath, rootName) -> Promise<void>`
- Produces: `class DeploymentPackages { inspect(project); generate(project, options); consume(id); close(); }`
- `generate` returns `{ id, filename, size, expiresAt, inspectionRevision }`.
- `consume` atomically returns `{ path, filename, size, dispose }` once; a second call throws `部署包已下载或已过期`.

- [ ] **Step 1: Add the direct archive dependency**

Run: `npm install tar@7.5.22 --save`

Expected: `package.json` and `package-lock.json` record `tar` as a direct production dependency.

- [ ] **Step 2: Write failing archive and lifecycle tests**

Cover exact archive entries, excluded secrets, symlink rejection after inspection, stale revision rejection, WebApp production output, a single active generation, one-time consumption, expiry, failure cleanup, and `close()` cleanup.

Use `tar.t` to inspect without shelling out:

```js
const entries = [];
await tar.t({ file: result.path, onentry: entry => entries.push(entry.path) });
assert.ok(entries.includes(`${result.rootName}/Dockerfile`));
assert.ok(entries.includes(`${result.rootName}/bot/index.js`));
assert.ok(entries.includes(`${result.rootName}/webapp-dist/index.html`));
assert.ok(entries.every(path => !path.includes('.env') && !path.includes('node_modules')));
```

- [ ] **Step 3: Run the package test**

Run: `node --test test/deployment-package.test.mjs`

Expected: FAIL with missing deployment package modules.

- [ ] **Step 4: Implement safe copy and tar creation**

Re-`lstat` every source immediately before copying, compare it to inspection metadata, create destination files with mode `0o644`, and create the archive with:

```js
await tar.c({ gzip:true, cwd:contextDirectory, file:archivePath, portable:true, noMtime:true }, [rootName]);
```

After creation, reject an archive above the configured compressed-size limit.

- [ ] **Step 5: Implement `DeploymentPackages`**

Use `mkdtemp(join(tmpdir(), 'pixelmug-deploy-'))`, random 24-byte download IDs, a 10-minute default TTL, an in-memory map, and `finally` cleanup. Build the WebApp into the context, write `package.json`, conditionally copy the compatible lockfile, copy the inspected Bot files, and write templates. Never stage under the selected project.

- [ ] **Step 6: Run package tests**

Run: `node --test test/deployment-package.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/deployment/archive.mjs src/deployment/package.mjs test/deployment-package.test.mjs
git commit -m "feat: package Docker deployment contexts"
```

---

### Task 5: Add managed deployment files and authenticated APIs

**Files:**

- Create: `src/deployment/routes.mjs`
- Modify: `src/workbench.mjs`
- Create: `test/deployment-api.test.mjs`

**Interfaces:**

- Produces: `createDeploymentRoutes({ packages, getProject, getBotEntry, bodyOf, reply })`
- Produces: `handle(req, res, url) -> Promise<boolean>`; `true` means the deployment router completed the response.
- Produces API responses exactly matching the endpoint list in the design spec.

- [ ] **Step 1: Write API tests using a Workbench fixture**

Authenticate through the existing Studio bearer token, open a fixture project, and assert:

```js
const inspection = await api('deploy/inspect');
assert.equal(inspection.status, 200);
assert.equal(inspection.data.botEntry, 'bot/index.js');

const generated = await api('deploy/files/generate', { project:root });
assert.equal(generated.status, 200);
assert.match(await readFile(join(root, 'deploy/Dockerfile'), 'utf8'), /npm ci --omit=dev/);
```

Read the Dockerfile, save a changed revision, assert stale-save rejection, generate a package, download it with the same bearer token, assert `Content-Disposition` and gzip bytes, then assert the second download is rejected. Also assert unauthenticated and foreign-Origin access fail before the route handler.

- [ ] **Step 2: Run the API test**

Run: `node --test test/deployment-api.test.mjs`

Expected: FAIL with 404 for deployment endpoints.

- [ ] **Step 3: Implement managed-file endpoints**

Use `ProjectFiles` for `deploy/Dockerfile` revision-safe reads and saves. `files/generate` creates `deploy/` when absent, refuses to overwrite a changed Dockerfile unless `{ force:true }`, and always refreshes canonical `deploy/start.mjs`. Return both file revisions.

- [ ] **Step 4: Implement package and download endpoints**

For JSON endpoints, use the existing `reply`. For the download response, set:

```js
res.writeHead(200, {
  'Content-Type':'application/gzip',
  'Content-Length':String(download.size),
  'Content-Disposition':`attachment; filename="${download.filename}"`,
  'Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff',
});
```

Pipe with `createReadStream`; call `dispose()` on completion, abort, or stream error.

- [ ] **Step 5: Integrate the router into Workbench lifecycle**

Create one `DeploymentPackages` instance inside `startWorkbench`. Delegate `/api/deploy/*` only after current Host, Origin, and bearer authentication succeeds. Pass the currently selected project and `project.bot`. Call `packages.close()` before closing the Workbench server.

- [ ] **Step 6: Run focused API and Workbench tests**

Run: `node --test test/deployment-api.test.mjs test/workbench.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/deployment/routes.mjs src/workbench.mjs test/deployment-api.test.mjs test/workbench.test.mjs
git commit -m "feat: expose deployment export APIs"
```

---

### Task 6: Build the three-step deployment UI

**Files:**

- Create: `ui/components/DeployWorkspace.vue`
- Create: `ui/components/DeployCheckPanel.vue`
- Create: `ui/components/DockerfilePanel.vue`
- Create: `ui/components/DeployPackagePanel.vue`
- Modify: `ui/App.vue`
- Modify: `ui/components/StageNavigation.vue`
- Modify: `ui/styles.css`
- Modify: `ui/en.js`
- Modify: `test/i18n.test.mjs`
- Modify: `test/workbench.test.mjs`

**Interfaces:**

- `DeployWorkspace` props: `{ project:String, botEntry:String, api:Function, styleNonce:String }`
- `DeployWorkspace` exposes `canLeave() -> boolean` so project switching and logout honor unsaved Dockerfile edits.
- Child panels communicate with typed event payload shapes documented in their `defineEmits` calls.

- [ ] **Step 1: Add a failing browser-flow assertion**

Extend the existing optional real-browser Workbench test to click the new Deploy navigation button and assert the step headings:

```js
await Runtime.evaluate({ expression:`document.querySelector('[data-section="deploy"]').click()` });
await waitFor('document.querySelector("#deploy-workspace")');
assert.equal(await text('#deploy-step-check'), '部署检查');
assert.equal(await text('#deploy-step-dockerfile'), 'Dockerfile 管理');
assert.equal(await text('#deploy-step-package'), '生成部署包');
```

Add non-browser translation assertions for each visible key so the default test suite still validates the UI copy.

- [ ] **Step 2: Run the translation test**

Run: `node --test test/i18n.test.mjs`

Expected: FAIL for missing English deployment translations.

- [ ] **Step 3: Add navigation and workspace mounting**

Add `{ id:'deploy', label:'部署', description:'Docker 部署包', icon:'deploy-box' }` to `StageNavigation.vue`, including `:data-section="tab.id"` on navigation buttons. Lazy-load `DeployWorkspace` in `App.vue` and render it only when the selected project exists and `activeSection === 'deploy'`.

- [ ] **Step 4: Implement deployment check panel**

On activation and explicit refresh, call `deploy/inspect`. Render errors and warnings with stable `code` keys, show Bot entry, WebApp presence, dependency count, included file count, total bytes, and revision. Disable later steps while `inspection.ok` is false.

- [ ] **Step 5: Implement Dockerfile management panel**

Use CodeMirror JavaScript/plain-text support with the Workbench CSP nonce. Provide Generate, Restore Default, Save, and Reload buttons. Track server revision and dirty state exactly like `FileWorkspace`; expose dirty state to `DeployWorkspace.canLeave()`. Render `deploy/start.mjs` in a separate read-only details panel.

- [ ] **Step 6: Implement package generation and download**

POST the current `project` and latest inspection revision to `deploy/package`. Download with authenticated `fetch`, convert the response to a Blob, create a temporary object URL, click a generated `<a download>`, and always revoke the URL. Display filename, byte size, expiration, and generation errors. Disable duplicate generation while a request is active.

- [ ] **Step 7: Add responsive styles and translations**

Add a three-column step header that collapses to one column below 900px, status colors that reuse existing CSS variables, a `deploy-box` navigation icon, and English mappings for every new Chinese key. Do not embed deployment state styles in `App.vue`.

- [ ] **Step 8: Protect unsaved edits during logout/project changes**

Add `deployWorkspace` beside `fileWorkspace` in `App.vue` and use a shared guard:

```js
const canLeaveProject = () => fileWorkspace.value?.canLeave() !== false && deployWorkspace.value?.canLeave() !== false;
```

Use it in `logout()` and `chooseDirectory()`.

- [ ] **Step 9: Run UI-related tests and build**

Run: `node --test test/i18n.test.mjs test/i18n-browser.test.mjs test/workbench.test.mjs`

Run: `npm run build`

Expected: all non-environment-gated tests PASS and Vite builds without warnings caused by the new components.

- [ ] **Step 10: Commit**

```bash
git add ui/App.vue ui/components/StageNavigation.vue ui/components/DeployWorkspace.vue ui/components/DeployCheckPanel.vue ui/components/DockerfilePanel.vue ui/components/DeployPackagePanel.vue ui/styles.css ui/en.js test/i18n.test.mjs test/workbench.test.mjs
git commit -m "feat: add deployment export workspace"
```

---

### Task 7: Add generated-artifact documentation and Docker smoke coverage

**Files:**

- Create: `test/deployment-docker.test.mjs`
- Modify: `README.md`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**

- Produces script: `npm run test:docker-deploy`
- The smoke test skips unless `STUDIO_TEST_DOCKER=1` and `docker version` succeeds.

- [ ] **Step 1: Write the gated Docker smoke test**

Generate a fixture package, extract it with `tar.x`, run `docker build` with a unique local tag, then run the image with:

```js
[
  '-e', 'BOT_TOKEN=test-token',
  '-e', 'PUBLIC_WEBAPP_URL=http://127.0.0.1:' + hostPort + '/agent/',
  '-e', 'PORT=8080',
  '-p', `${hostPort}:8080`,
]
```

Poll `/healthz`, request `/agent/`, and make the fixture Bot write or log `process.env.STUDIO_WEBAPP_URL`; assert the normalized URL is visible in container logs. In `t.after`, stop/remove the container and remove the image by their exact generated names.

- [ ] **Step 2: Add the explicit script**

Add:

```json
"test:docker-deploy": "STUDIO_TEST_DOCKER=1 node --test test/deployment-docker.test.mjs"
```

Document the PowerShell equivalent as `$env:STUDIO_TEST_DOCKER='1'; node --test test/deployment-docker.test.mjs` because inline POSIX environment syntax is not portable to Windows npm shells.

- [ ] **Step 3: Document deployment export usage**

Add a README section covering the three Studio steps and generated artifact commands:

```sh
tar -xzf my-agent-deploy-<timestamp>.tar.gz
cd my-agent-deploy-<timestamp>
docker build -t my-agent .
docker run --rm -p 8080:8080 \
  -e BOT_TOKEN='<token>' \
  -e PUBLIC_WEBAPP_URL='https://agent.example.com/' \
  my-agent
```

State that `BOT_API_BASE_URL` is optional, secrets must be supplied by the platform secret manager, and the public URL must route to the exposed container port.

- [ ] **Step 4: Run the smoke test in skip mode and documentation checks**

Run: `node --test test/deployment-docker.test.mjs`

Expected: SKIP when `STUDIO_TEST_DOCKER` is unset.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 5: Run the real Docker smoke test where Docker is available**

Run: `npm run test:docker-deploy`

Expected: PASS with image build, healthy container, served WebApp, and correct public URL injection. If Docker is unavailable, record the environment limitation in the change handoff; do not weaken the test.

- [ ] **Step 6: Commit**

```bash
git add test/deployment-docker.test.mjs README.md package.json package-lock.json
git commit -m "test: verify generated Docker deployments"
```

---

### Task 8: Run the complete regression and inspect the artifact boundary

**Files:**

- Modify only files required by failures found in this task.

**Interfaces:**

- Consumes all interfaces from Tasks 1–7.
- Produces a release-ready deployment export feature with no known regression in local debugging.

- [ ] **Step 1: Run formatting-independent source checks**

Run: `git diff --check d4ee7b1..HEAD`

Expected: no whitespace errors.

- [ ] **Step 2: Run the complete default suite**

Run: `npm test`

Expected: the UI builds and every `test/*.test.mjs` test passes; environment-gated browser and Docker cases may report SKIP only for their documented variables.

- [ ] **Step 3: Manually inspect one generated archive without building it**

Use the package service from a temporary Node script or the Workbench UI, then list it through the `tar` package. Confirm it contains only the documented root, Docker files, manifest, Bot files, and optional `webapp-dist/`. Search extracted content for the fixture token and assert there is no match.

- [ ] **Step 4: Verify tracked and untracked output**

Run: `git status --short`

Expected: no `ui-dist/`, deployment archive, temporary directory, credential file, or fixture output is tracked or left in the worktree.

- [ ] **Step 5: Commit any regression-only corrections**

If Step 2 or Step 3 required source corrections, commit only those corrections:

```bash
git add src/deployment src/webapp-build.mjs src/workbench.mjs ui/App.vue ui/components/DeployWorkspace.vue ui/components/DeployCheckPanel.vue ui/components/DockerfilePanel.vue ui/components/DeployPackagePanel.vue ui/components/StageNavigation.vue ui/en.js ui/styles.css test/deployment-inspect.test.mjs test/deployment-templates.test.mjs test/deployment-package.test.mjs test/deployment-api.test.mjs test/deployment-docker.test.mjs test/webapp-build.test.mjs test/workbench.test.mjs test/i18n.test.mjs README.md package.json package-lock.json
git diff --cached --quiet || git commit -m "fix: harden Docker deployment export"
```

If no corrections were required, do not create an empty commit.
