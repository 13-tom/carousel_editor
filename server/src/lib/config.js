import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '../../../');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function loadRaw() {
  const base = readJson(path.join(ROOT, 'config/config.json'));
  const localPath = path.join(ROOT, 'config/config.local.json');
  if (fs.existsSync(localPath)) {
    const local = readJson(localPath);
    return deepMerge(base, local);
  }
  return base;
}

function deepMerge(a, b) {
  const out = { ...a };
  for (const key of Object.keys(b)) {
    if (b[key] && typeof b[key] === 'object' && !Array.isArray(b[key]) && a[key]) {
      out[key] = deepMerge(a[key], b[key]);
    } else {
      out[key] = b[key];
    }
  }
  return out;
}

const raw = loadRaw();

export const config = {
  ...raw,
  paths: {
    root: ROOT,
    templates: path.join(ROOT, 'templates'),
    uploads: path.join(ROOT, 'uploads'),
    exports: path.resolve(ROOT, raw.export.localFolder.exportsDir),
    projects: path.join(ROOT, 'data/projects'),
  },
  dropboxAccessToken: process.env.DROPBOX_ACCESS_TOKEN || '',
};

for (const dir of [config.paths.uploads, config.paths.exports, config.paths.projects]) {
  fs.mkdirSync(dir, { recursive: true });
}
