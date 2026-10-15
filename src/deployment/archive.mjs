import { chmod, copyFile, lstat, mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { c as tarCreate } from 'tar';
import { DEPLOY_LIMITS } from './constants.mjs';

// Copy each inspected Bot file into the staging context, re-checking the live
// filesystem so a file changed after inspection cannot silently enter the
// archive. Files are written read-only to avoid marking runtime scripts as
// executable inside the image.
export async function copyDeploymentBot(inspection, destination) {
  for (const file of inspection.files) {
    const source = join(inspection.projectRoot, ...file.path.split('/'));
    let info;
    try { info = await lstat(source); }
    catch { throw new Error(`Bot 文件已变化：${file.path}`); }
    if (info.isSymbolicLink()) throw new Error(`不支持符号链接：${file.path}`);
    if (!info.isFile()) throw new Error(`Bot 文件已变化：${file.path}`);
    if (info.size !== file.size || info.mtimeMs !== file.mtimeMs) {
      throw new Error(`Bot 文件在检查后发生变化：${file.path}`);
    }
    const target = join(destination, ...file.path.split('/'));
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
    await chmod(target, 0o644);
  }
}

// Create a portable gzip archive rooted at `rootName`, then reject a result
// larger than the configured compressed-size limit.
export async function createDeploymentArchive(contextDirectory, archivePath, rootName, { archiveBytes = DEPLOY_LIMITS.archiveBytes } = {}) {
  await tarCreate({ gzip: true, cwd: dirname(contextDirectory), file: archivePath, portable: true, noMtime: true }, [rootName]);
  const info = await stat(archivePath);
  if (info.size > archiveBytes) throw new Error('部署包超过大小上限');
}
