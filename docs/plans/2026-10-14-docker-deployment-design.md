# Docker Deployment Export Design

## Status

Approved on 2026-10-14.

## Goal

Add a deployment workspace that turns the currently selected, locally debugged agent project into a portable `.tar.gz` Docker build context. The artifact must contain the Bot, a production WebApp build, managed Docker files, and enough runtime support to serve the WebApp and start the Bot in one container.

The feature ends at artifact generation and download. It does not invoke Docker, build or push an image, upload to a cloud provider, or manage a remote deployment.

## Product workflow

The Studio sidebar gains a top-level **Deploy** section with three ordered steps:

1. **Deployment check** validates the current project, Bot entry, dependency metadata, optional WebApp, deployment files, exclusions, symlinks, and size limits.
2. **Dockerfile management** generates, previews, edits, saves, and restores `deploy/Dockerfile`. The generated `deploy/start.mjs` is visible but read-only because it implements the runtime contract.
3. **Generate deployment package** rebuilds the WebApp for production, assembles an isolated Docker context, creates a `.tar.gz`, and returns a protected one-time download.

The managed Dockerfile and deployment configuration are persisted under the selected project's `deploy/` directory so they can be reviewed and versioned. Build output, archives, and temporary files are never written into the project.

## Chosen architecture

Use one Node.js container rather than Nginx plus Node or a multi-container Compose deployment.

The generated Dockerfile uses multiple stages:

- A dependency stage installs the Bot's production npm dependencies before the Bot can start.
- A runtime stage receives only production dependencies, Bot sources, production WebApp assets, and the generated runtime launcher.

The runtime launcher:

1. validates required environment variables;
2. normalizes `PUBLIC_WEBAPP_URL` when a WebApp exists;
3. assigns the normalized value to `process.env.STUDIO_WEBAPP_URL`;
4. starts the static WebApp server and `/healthz` endpoint;
5. starts the configured Bot entry as a child process;
6. propagates Bot failures through health status and container exit state; and
7. handles `SIGTERM` and `SIGINT` by stopping both the HTTP server and Bot.

Bot-only projects remain supported. They expose `/healthz` but do not require `PUBLIC_WEBAPP_URL`.

## Runtime configuration

Secrets and environment-specific addresses are not written into the archive or image.

Runtime inputs are:

- `BOT_TOKEN`: required.
- `BOT_API_BASE_URL`: optional.
- `PUBLIC_WEBAPP_URL`: required only when the project contains `webapp/`.
- `PORT`: optional; defaults to `8080`.

`PUBLIC_WEBAPP_URL` must be an absolute HTTP or HTTPS URL without credentials or a fragment. Root URLs and path-prefixed URLs are accepted. The normalized public address is assigned to `STUDIO_WEBAPP_URL` before the Bot process starts, closing the loop between Bot-generated WebApp links and the publicly served static resources.

## Deployment artifact

The archive contains one ready-to-build context:

```text
<project>-deploy-<timestamp>.tar.gz
└── <project>-deploy/
    ├── Dockerfile
    ├── .dockerignore
    ├── package.json
    ├── package-lock.json       # only when compatible with package.json
    ├── bot/
    │   └── ...
    ├── webapp-dist/            # omitted for Bot-only projects
    ├── deploy/
    │   └── start.mjs
    └── DEPLOY.md
```

The Dockerfile copies files from this extracted context. It never refers to absolute paths on the Studio machine and does not copy the `.tar.gz` into the image.

## Dependency installation

The exporter reads the selected project's root `package.json` and preserves production-relevant dependency declarations and Node module settings. Development-only dependencies are excluded from the runtime install.

If `@jeejio-bubble/bot` is absent, the generated deployment manifest adds the exact version used by Studio. This replaces the local debugging behavior where Studio forces its own SDK instance through its loader.

The generated Dockerfile installs dependencies during image construction:

- use `npm ci --omit=dev` only when the exported lockfile exactly matches the exported manifest;
- otherwise use `npm install --omit=dev` and do not include a misleading incompatible lockfile.

Dependency installation never runs on every container start. A failed install therefore fails the image build rather than producing a container that repeatedly fails at runtime.

## Production WebApp build

The production build reuses the dependency-resolution behavior of the existing Vite WebApp builder but does not inject:

- Studio debug configuration;
- local gateway credentials;
- `/studio-runtime/` debugging adapters; or
- local run URLs.

The output uses relative asset URLs so it can be served at the root or under the pathname of `PUBLIC_WEBAPP_URL`. Only `webapp-dist/` enters the archive; original WebApp source is not required by the runtime image.

## Backend components

Deployment logic is kept out of the already large `src/workbench.mjs` wherever practical:

- `src/deployment/inspect.mjs`: project validation, dependency inspection, exclusions, limits, and immutable inspection metadata.
- `src/deployment/templates.mjs`: default Dockerfile, launcher, `.dockerignore`, and deployment instructions.
- `src/deployment/webapp.mjs`: production-only WebApp build.
- `src/deployment/archive.mjs`: safe, cross-platform tar/gzip creation.
- `src/deployment/package.mjs`: temporary context assembly and package lifecycle.
- `src/deployment/routes.mjs`: authenticated Workbench deployment endpoints.

Proposed endpoints:

- `GET /api/deploy/inspect`
- `POST /api/deploy/files/generate`
- `GET /api/deploy/files/read`
- `POST /api/deploy/files/save`
- `POST /api/deploy/package`
- `GET /api/deploy/package/<download-id>`

All endpoints retain the Workbench's existing loopback, Host, Origin, and bearer-token protections.

## Frontend components

- `ui/components/DeployWorkspace.vue`: owns the three-step deployment workflow.
- `ui/components/DeployCheckPanel.vue`: presents validation and artifact inclusion results.
- `ui/components/DockerfilePanel.vue`: manages the editable Dockerfile and read-only launcher.
- `ui/components/DeployPackagePanel.vue`: starts generation, displays progress/results, and downloads the artifact.

`StageNavigation.vue` adds the Deploy entry. `App.vue` mounts the workspace and passes the existing authenticated API wrapper rather than absorbing deployment state itself. All new user-visible Chinese strings receive English mappings in `ui/en.js`.

## Archive safety

The packager uses an explicit allowlist rather than archiving the project root.

It includes Bot files, generated production assets, the production manifest, and managed deployment files. It excludes at least `.git/`, `node_modules/`, `debug/`, `mpy/`, `.env*`, `.npmrc`, logs, temporary editor files, prior deployment archives, and build caches.

Additional controls:

- reject symbolic links in collected project content;
- reject paths escaping the selected project;
- enforce file-count, per-file-size, uncompressed-size, and archive-size limits;
- allow only one packaging job per Workbench session;
- create staging data under an operating-system temporary directory;
- clean staging data after download, expiry, failure, or Workbench shutdown; and
- protect random, short-lived, single-use download identifiers with the Studio credential.

Dockerfile editing is intentionally powerful: users can change image build behavior. Studio protects host-side file access and packaging boundaries, but it does not claim that an arbitrary user-edited Dockerfile is safe to build.

## Errors and stale state

The deployment check returns structured blocking errors and non-blocking warnings. Packaging reruns all blocking checks and compares project/deployment revisions so files changed after inspection cannot silently produce a different artifact.

Blocking failures include:

- missing or invalid Bot entry;
- invalid `package.json` or dependency declarations;
- incompatible dependency metadata;
- missing or unsaved Dockerfile;
- production WebApp build failure;
- symbolic links, forbidden files, or size-limit violations;
- changed project state;
- temporary storage or compression failure; and
- expired or already-consumed download identifiers.

Failures are shown in the relevant UI step and temporary resources are removed in `finally` cleanup paths.

## Testing

1. Unit tests cover inspection, manifest generation, template output, public URL validation, exclusions, limits, revision calculation, archive content, and cleanup.
2. API integration tests cover Dockerfile generation/read/save/restore, packaging, concurrent-job rejection, protected one-time downloads, expiry, and Workbench shutdown cleanup.
3. WebApp build tests prove production assets omit Studio debug injection and still bundle supported SDK imports.
4. UI tests cover navigation, step gating, validation errors, Dockerfile edits, generation status, and archive download.
5. Existing tests protect the local debugging workflow from regression.
6. An optional `STUDIO_TEST_DOCKER=1` smoke test builds the generated context, starts the image, checks `/healthz` and static files, and verifies that the Bot receives the normalized `STUDIO_WEBAPP_URL`.

## Out of scope

- Building Docker images from Studio.
- Pushing images to a registry.
- Uploading to or configuring a cloud provider.
- TLS certificate management or DNS provisioning.
- Deploying `mpy/` code to cloud infrastructure.
- Persisting Bot tokens or other deployment secrets.
- Multi-container or Kubernetes manifest generation in the first version.
