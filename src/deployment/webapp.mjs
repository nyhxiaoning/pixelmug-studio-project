import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { buildWebApp } from '../webapp-build.mjs';

export async function buildDeploymentWebApp(projectRoot, output) {
  const source = join(projectRoot, 'webapp');
  try { await access(source); } catch { return null; }
  return buildWebApp(source, output, { studioDebug: false });
}
