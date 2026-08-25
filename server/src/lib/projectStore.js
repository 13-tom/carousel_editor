import fs from 'fs';
import path from 'path';
import { config } from './config.js';

function projectPath(pageId) {
  return path.join(config.paths.projects, `${pageId}.json`);
}

export function loadProject(pageId) {
  const p = projectPath(pageId);
  if (!fs.existsSync(p)) return { pageId, slides: {} };
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

export function saveProject(pageId, project) {
  const p = projectPath(pageId);
  fs.writeFileSync(p, JSON.stringify({ ...project, pageId }, null, 2));
  return loadProject(pageId);
}

export function getSlideOverrides(pageId, slideId) {
  const project = loadProject(pageId);
  return project.slides?.[slideId] || {};
}
