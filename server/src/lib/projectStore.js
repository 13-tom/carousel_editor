import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import { slugify } from './naming.js';

function projectPath(pageId, topicSlug) {
  const filename = topicSlug ? `${pageId}--${topicSlug}.json` : `${pageId}.json`;
  return path.join(config.paths.projects, filename);
}

function emptyProject(pageId, topic) {
  return { pageId, topic: topic || null, slides: {}, mediaLibrary: [] };
}

export function loadProject(pageId, topic) {
  const p = projectPath(pageId, topic && slugify(topic));
  if (!fs.existsSync(p)) return emptyProject(pageId, topic);
  const saved = JSON.parse(fs.readFileSync(p, 'utf-8'));
  return { ...emptyProject(pageId, topic), ...saved };
}

export function saveProject(pageId, project, topic) {
  const p = projectPath(pageId, topic && slugify(topic));
  fs.writeFileSync(p, JSON.stringify({ ...project, pageId, topic: topic || null }, null, 2));
  return loadProject(pageId, topic);
}

export function getSlideOverrides(pageId, slideId, topic) {
  const project = loadProject(pageId, topic);
  return project.slides?.[slideId] || {};
}

/** All saved topics for a page, newest first, plus whether an untitled
 * (no-topic) project exists from before topics existed. */
export function listTopics(pageId) {
  const prefix = `${pageId}--`;
  const files = fs.readdirSync(config.paths.projects).filter((f) => f.endsWith('.json'));

  const topics = files
    .filter((f) => f.startsWith(prefix))
    .map((f) => {
      const full = path.join(config.paths.projects, f);
      const stat = fs.statSync(full);
      const saved = JSON.parse(fs.readFileSync(full, 'utf-8'));
      const slug = f.slice(prefix.length, -'.json'.length);
      return { slug, name: saved.topic || slug, updatedAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const hasUntitled = files.includes(`${pageId}.json`);
  return { topics, hasUntitled };
}
