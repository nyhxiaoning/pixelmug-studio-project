# PixelMug Studio

PixelMug Studio is a local development, run, and debugging environment for Bubble applications that work with PixelMug devices. An application contains a Bot and can optionally include a WebApp and on-device MicroPython code.

## Requirements

- Node.js 20.6 or later
- A Bubble account and Bot token
- A PixelMug connected to the same local network as the computer and Bubble App

## Quick start

```sh
npm ci
npm run build
npm start
```

Open the Studio URL printed in the terminal. The management service listens only on the local computer. The WebApp gateway is available on the local network at `pixelmug-studio.local:7979`, so the computer, Bubble App, and PixelMug must be able to reach one another.

## Typical application layout

```text
my-application/
├── bot/                 # Required
│   └── index.js         # Select this as the Bot entry in Studio
├── webapp/              # Optional; contains index.html
└── mpy/                 # Optional on-device MicroPython application
    ├── __main__.py
    └── mps.json
```

Studio supports Bot-only applications as well as applications that combine a Bot with a WebApp, MicroPython code, or both.

## Workflow

1. Sign in with your Bubble account.
2. Select a local application and configure its Bot entry.
3. Set the Bot token in **My Bubble**.
4. Start the application and test the Bot or WebApp in the Bubble App.
5. For MicroPython applications, deploy code to supported devices or enable automatic deployment on start.
6. Inspect Bot, WebApp, deployment, and device logs in **Run & debug**.

Runtime logs are written to `debug/<runId>/` in the selected application directory. These generated directories are ignored by Git.

## Deployment

The **Deploy** workspace turns a selected application into a portable Docker
deployment package. It is a three-step flow:

1. **Deployment check** — validates the project and the Bot entry, and reports
   any errors (such as symbolic links or oversized files) that must be fixed
   first.
2. **Dockerfile** — generates and edits a project-local `deploy/Dockerfile`,
   alongside a Studio-managed read-only `deploy/start.mjs` launcher.
3. **Deployment package** — generates a one-time-download `.tar.gz` Docker
   build context containing the Bot, a production WebApp build (when present),
   and the container runtime files.

Studio never invokes Docker, pushes an image, or contacts a cloud deployment
API. It only produces the build context for you to build and run yourself:

```sh
tar -xzf my-agent-deploy-<timestamp>.tar.gz
cd my-agent-deploy-<timestamp>
docker build -t my-agent .
docker run --rm -p 8080:8080 \
  -e BOT_TOKEN='<token>' \
  -e PUBLIC_WEBAPP_URL='https://agent.example.com/' \
  my-agent
```

Runtime environment variables:

- `BOT_TOKEN` — required. The Bot's authentication token.
- `BOT_API_BASE_URL` — optional. Override the Bot API base URL.
- `PUBLIC_WEBAPP_URL` — required only for applications that include a WebApp.
  An absolute `http://` or `https://` URL that the public gateway routes to the
  container's exposed port (default `8080`); it is normalized and exposed to the
  Bot as `STUDIO_WEBAPP_URL`.
- `PORT` — optional, defaults to `8080`.

Secrets must be supplied by your platform's secret manager and are never baked
into the image. The public URL must route to the exposed container port.

To verify a generated package end-to-end where Docker is available, run the
gated smoke test:

```sh
npm run test:docker-deploy
```

On Windows PowerShell, use
`$env:STUDIO_TEST_DOCKER='1'; node --test test/deployment-docker.test.mjs`
instead.

## Documentation

Read the developer documentation at [PixelMug Docs](https://bubble-pixelmug.github.io/pixelmug-docs/en/).

## Development

```sh
npm run dev       # Start the Vite development server
npm run build     # Build the Studio UI into ui-dist/
npm test          # Build the UI and run the test suite
npm start         # Start the Studio server
```

### Project layout

```text
src/               Node.js server, runtime adapters, deployment, and gateway code
ui/                Vue user interface source
ui-dist/           Generated UI build output
getting-started/   Progressive runnable projects
examples/          Focused runnable examples
test/              Automated tests
```


## Windows package

Build an unsigned Windows x64 NSIS installer with:

```sh
npm run package:win
```

The installer is written to `release/`. To test the unpacked application without creating an installer, run `npm run package:win:dir`.

## macOS packages

Build unsigned DMG installers for Apple silicon and Intel Macs with:

```sh
npm run package:mac
```

To build just one architecture, run `npm run package:mac:arm64` (Apple silicon) or `npm run package:mac:x64` (Intel). The DMG files are written separately to `release/mac/arm64/` and `release/mac/x64/`.
## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development and pull request guidelines.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting guidance.

## License

This project is licensed under the [MIT License](LICENSE).
