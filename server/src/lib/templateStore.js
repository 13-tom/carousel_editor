import fs from 'fs';
import path from 'path';
import { config } from './config.js';

const THEMES_DIR = path.join(config.paths.templates, 'themes');
const PAGES_DIR = path.join(config.paths.templates, 'pages');

export function listThemes() {
  return fs.readdirSync(THEMES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const metaPath = path.join(THEMES_DIR, d.name, 'meta.json');
      const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf-8')) : {};
      return { id: d.name, name: meta.name || d.name };
    });
}

export function getThemeCss(themeId) {
  const cssPath = path.join(THEMES_DIR, themeId, 'theme.css');
  if (!fs.existsSync(cssPath)) throw new Error(`Unknown theme: ${themeId}`);
  return fs.readFileSync(cssPath, 'utf-8');
}

export function listPages() {
  return fs.readdirSync(PAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => getPage(d.name));
}

export function getPage(pageId) {
  const pageDir = path.join(PAGES_DIR, pageId);
  const pageJsonPath = path.join(pageDir, 'page.json');
  if (!fs.existsSync(pageJsonPath)) throw new Error(`Unknown page: ${pageId}`);
  const page = JSON.parse(fs.readFileSync(pageJsonPath, 'utf-8'));
  page.dir = pageDir;
  return page;
}

export function getLayoutCss(pageId) {
  const cssPath = path.join(PAGES_DIR, pageId, 'layout.css');
  return fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf-8') : '';
}

export function getSlideHtml(pageId, slideId) {
  const page = getPage(pageId);
  const slide = page.slides.find((s) => s.id === slideId);
  if (!slide) throw new Error(`Unknown slide: ${pageId}/${slideId}`);
  const filePath = path.join(page.dir, slide.file);
  return { slide, html: fs.readFileSync(filePath, 'utf-8') };
}
