import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const studioPackage = JSON.parse(readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8'));
export const STUDIO_SDK = '@jeejio-bubble/bot';
export const STUDIO_SDK_VERSION = studioPackage.dependencies[STUDIO_SDK];

export const DEPLOY_LIMITS = Object.freeze({
  files: 5000,
  fileBytes: 10 * 1024 * 1024,
  totalBytes: 100 * 1024 * 1024,
  archiveBytes: 100 * 1024 * 1024,
});
export const EXCLUDED_NAMES = new Set(['.git', 'node_modules', 'debug', 'mpy', '.npmrc']);
// Hidden caches that never belong in a deployment context. Dotfiles are not
// broadly hidden because the exporter intentionally generates `.dockerignore`.
export const EXCLUDED_CACHES = new Set(['.cache', '.vite', '.eslintcache', '.parcel-cache', '.turbo', '.next', '.nuxt', '.DS_Store']);
export const EXCLUDED_SUFFIXES = ['.log', '.tmp', '.temp', '.bak', '.swp', '.swo', '.tar.gz'];
export const DEPLOY_FILES = Object.freeze({ dockerfile: 'deploy/Dockerfile', launcher: 'deploy/start.mjs' });
export const BOT_ENTRY_EXTENSIONS = new Set(['.js', '.mjs', '.cjs']);
