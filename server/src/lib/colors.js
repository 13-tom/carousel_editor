import fs from 'fs';
import path from 'path';
import { getPage, getThemeCss, getLayoutCss } from './templateStore.js';

const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\([^)]+\)/g;

// Colors so close to plain black/white they're really just "ink" or
// "paper", not a deliberate brand choice — not worth a swatch of their own.
const BORING = new Set(['#000', '#000000', '#fff', '#ffffff']);

// A translucent color (low alpha) is almost always a decorative overlay,
// gradient tint, or shadow rather than a real brand/text color — not
// something worth offering as a "pick this for your text" swatch.
function isTranslucent(value) {
  const m = /rgba?\([^)]*,\s*([\d.]+)\s*\)$/.exec(value) || /hsla?\([^)]*,\s*([\d.]+)\s*\)$/.exec(value);
  return m ? parseFloat(m[1]) < 0.9 : false;
}

function extractFrom(text, counts) {
  const matches = text.match(COLOR_RE) || [];
  for (const raw of matches) {
    const key = raw.toLowerCase().replace(/\s+/g, '');
    if (BORING.has(key) || isTranslucent(key)) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
}

/**
 * Every color actually used by a page's theme/layout/slides, ranked by how
 * often it appears (a page's real accent/background colors naturally rise
 * to the top over one-off decorative ones), capped to a sane swatch count.
 */
export function getPagePalette(pageId, { limit = 16 } = {}) {
  const page = getPage(pageId);
  const counts = new Map();

  extractFrom(getThemeCss(page.theme), counts);
  extractFrom(getLayoutCss(pageId), counts);
  for (const slide of page.slides) {
    const html = fs.readFileSync(path.join(page.dir, slide.file), 'utf-8');
    extractFrom(html, counts);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([color]) => color);
}
