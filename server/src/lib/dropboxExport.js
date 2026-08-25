import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import { safeSegment, todayFolder } from './naming.js';

function destSegments(pageName, topic, date) {
  const segments = [safeSegment(pageName), todayFolder(date)];
  if (topic) segments.push(safeSegment(topic));
  return segments;
}

/**
 * Writes exported files to disk under exports/<pageName>/<date>/<topic>/,
 * and — if export.mode is 'local-folder' and a dropboxPath is configured
 * and exists on disk (i.e. the Dropbox desktop app is installed and
 * syncing) — also copies them into <dropboxPath>/<pageName>/<date>/<topic>/
 * so the existing Dropbox client picks them up and syncs automatically.
 */
export async function exportLocalAndMaybeDropbox(pageName, files, { topic, date = new Date() } = {}) {
  const segments = destSegments(pageName, topic, date);
  const localDir = path.join(config.paths.exports, ...segments);
  fs.mkdirSync(localDir, { recursive: true });

  const written = [];
  for (const file of files) {
    const dest = path.join(localDir, file.filename);
    fs.writeFileSync(dest, file.buffer);
    written.push(dest);
  }

  let dropboxCopied = false;
  const dropboxRoot = config.export.localFolder.dropboxPath;
  if (dropboxRoot && fs.existsSync(dropboxRoot)) {
    const dropboxDir = path.join(dropboxRoot, ...segments);
    fs.mkdirSync(dropboxDir, { recursive: true });
    for (const file of files) {
      fs.copyFileSync(path.join(localDir, file.filename), path.join(dropboxDir, file.filename));
    }
    dropboxCopied = true;
  }

  return { localDir, dropboxCopied, files: written };
}

/**
 * Direct Dropbox API upload — for future use once this is hosted somewhere
 * without the Dropbox desktop client (e.g. a VPS). Requires the `dropbox`
 * package and a DROPBOX_ACCESS_TOKEN env var.
 */
export async function exportViaDropboxApi(pageName, files, { topic, date = new Date() } = {}) {
  if (!config.dropboxAccessToken) {
    throw new Error('DROPBOX_ACCESS_TOKEN is not set. Required for export.mode = "dropbox-api".');
  }
  const { Dropbox } = await import('dropbox');
  const dbx = new Dropbox({ accessToken: config.dropboxAccessToken, fetch });

  const segments = destSegments(pageName, topic, date);
  const root = config.export.dropboxApi.destinationRoot.replace(/\/+$/, '');
  const uploaded = [];

  for (const file of files) {
    const dropboxPath = `${root}/${segments.join('/')}/${file.filename}`;
    await dbx.filesUpload({ path: dropboxPath, contents: file.buffer, mode: { '.tag': 'overwrite' } });
    uploaded.push(dropboxPath);
  }

  return { uploaded };
}

export async function exportFiles(pageName, files, opts = {}) {
  if (config.export.mode === 'dropbox-api') {
    return { mode: 'dropbox-api', ...(await exportViaDropboxApi(pageName, files, opts)) };
  }
  return { mode: 'local-folder', ...(await exportLocalAndMaybeDropbox(pageName, files, opts)) };
}
