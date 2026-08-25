import AdmZip from 'adm-zip';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';

const PAGES_DIR = path.join(config.paths.templates, 'pages');

function slugify(name) {
  return (
    String(name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'page'
  );
}

function uniquePageId(base) {
  let id = base;
  let n = 2;
  while (fs.existsSync(path.join(PAGES_DIR, id))) {
    id = `${base}-${n++}`;
  }
  return id;
}

function saveDataUriAsset(dataUri, assetsDir, baseName) {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUri || '');
  if (!match) return null;
  const [, mime, b64] = match;
  const ext = mime.split('/')[1]?.split('+')[0] || 'png';
  const filename = `${baseName}.${ext}`;
  fs.writeFileSync(path.join(assetsDir, filename), Buffer.from(b64, 'base64'));
  return filename;
}

function assetUrl(pageId, filename) {
  return `/template-assets/pages/${pageId}/assets/${filename}`;
}

/**
 * Find the .dc.html entry and any .image-slots.state.json entry inside the
 * uploaded zip (a Claude Design canvas export).
 */
function readZipEntries(zipBuffer) {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();
  const dcEntry = entries.find((e) => /\.dc\.html$/i.test(e.entryName));
  if (!dcEntry) {
    throw new Error('This zip doesn\'t contain a .dc.html file (a Claude Design canvas export). Nothing else is currently supported.');
  }
  const stateEntry = entries.find((e) => /(^|\/)\.image-slots\.state\.json$/i.test(e.entryName));
  const slotState = stateEntry ? JSON.parse(stateEntry.getData().toString('utf-8')) : {};
  return { dcHtml: dcEntry.getData().toString('utf-8'), dcName: path.basename(dcEntry.entryName), slotState };
}

// A text label that sits next to an icon (an <svg>, in the same small row)
// is chrome, not content — the "Swipe for more" cue and an @handle lockup
// both follow this pattern. Locking these out means they never move or get
// edited by accident.
function isLockedChrome($, el) {
  return $(el).parent().children('svg').length > 0;
}

function isTextLeaf($, el) {
  const $el = $(el);
  if ($el.children().length > 0) return false;
  if (!$el.text().trim()) return false;
  if ($el.hasClass('image-slot-label') || $el.hasClass('video-slot-label')) return false;
  if ($el.parents('[data-edit="text"]').length > 0) return false;
  if (isLockedChrome($, el)) return false;
  return true;
}

function convertVideoWrapper($, wrapperEl, slotState, pageId, assetsDir, keyCounter) {
  const $wrapper = $(wrapperEl);
  const slot = $wrapper.children('image-slot').first();
  const slotId = slot.attr('id');
  const placeholder = slot.attr('placeholder') || 'Click to add a looping video';

  let bgDecl = '';
  let hasAsset = false;
  if (slotId && slotState[slotId]?.u) {
    const filename = saveDataUriAsset(slotState[slotId].u, assetsDir, slotId);
    if (filename) {
      bgDecl = `background-image: url('${assetUrl(pageId, filename)}');`;
      hasAsset = true;
    }
  }

  $wrapper.empty();
  $wrapper.attr('data-edit', 'video');
  $wrapper.attr('data-key', 'bgVideo');
  $wrapper.addClass('video-slot');
  $wrapper.attr('style', `${$wrapper.attr('style') || ''}; ${bgDecl}`);
  $wrapper.append('<video class="bg-video" autoplay muted loop playsinline></video>');
  if (!hasAsset) {
    $wrapper.append($('<span class="video-slot-label"></span>').text(placeholder));
  }
  keyCounter.video += 1;
}

function convertImageSlot($, el, slotState, pageId, assetsDir, keyCounter) {
  const $el = $(el);
  const id = $el.attr('id') || `image-${++keyCounter.image}`;
  const shape = $el.attr('shape') || 'rect';
  const fit = $el.attr('fit') || 'cover';
  const radius = $el.attr('radius');
  const placeholder = $el.attr('placeholder') || 'Click to add image';
  const ownStyle = $el.attr('style') || '';
  const needsFill = !/\b(width|height)\s*:/i.test(ownStyle);

  let decls = [];
  if (needsFill) decls.push('position: absolute', 'inset: 0');
  if (shape === 'circle') decls.push('border-radius: 50%');
  else if (shape === 'rounded' && radius) decls.push(`border-radius: ${radius}px`);
  if (fit === 'contain') decls.push('background-size: contain');

  let bgDecl = '';
  let hasAsset = false;
  if (slotState[id]?.u) {
    const filename = saveDataUriAsset(slotState[id].u, assetsDir, id);
    if (filename) {
      bgDecl = `background-image: url('${assetUrl(pageId, filename)}');`;
      hasAsset = true;
    }
  }

  const $replacement = $(`<div class="image-slot-imported" data-edit="image" data-key="${id}"></div>`);
  $replacement.attr('style', `${ownStyle}; ${decls.join('; ')}; ${bgDecl}`);
  if (!hasAsset) {
    $replacement.append($('<span class="image-slot-label"></span>').text(placeholder));
  }
  $el.replaceWith($replacement);
}

function markEditableText($, section) {
  let counter = 0;
  section.find('h1, h2, h3, h4, p').each((_, el) => {
    $(el).attr('data-edit', 'text').attr('data-key', `text-${++counter}`);
  });
  section
    .find('span, div')
    .filter((_, el) => isTextLeaf($, el))
    .each((_, el) => {
      $(el).attr('data-edit', 'text').attr('data-key', `text-${++counter}`);
    });
}

export async function importDeckZip(zipBuffer, { pageName: requestedName } = {}) {
  const { dcHtml, dcName, slotState } = readZipEntries(zipBuffer);

  const pageName = (requestedName || dcName.replace(/\.dc\.html$/i, '')).trim() || 'Imported Page';
  const pageId = uniquePageId(slugify(pageName));
  const pageDir = path.join(PAGES_DIR, pageId);
  const slidesDir = path.join(pageDir, 'slides');
  const assetsDir = path.join(pageDir, 'assets');
  fs.mkdirSync(slidesDir, { recursive: true });
  fs.mkdirSync(assetsDir, { recursive: true });

  const $ = cheerio.load(dcHtml);
  const xImport = $('x-import').first();
  if (xImport.length === 0) {
    throw new Error('Could not find the deck canvas (<x-import>) in this .dc.html file.');
  }
  const canvas = {
    width: parseInt(xImport.attr('width'), 10) || 1080,
    height: parseInt(xImport.attr('height'), 10) || 1350,
  };
  const fonts = $('helmet link[rel="stylesheet"][href*="fonts.googleapis"]')
    .map((_, el) => $(el).attr('href'))
    .get();

  const sections = xImport.find('> section').toArray();
  if (sections.length === 0) {
    throw new Error('No slides (<section> elements) found inside the deck canvas.');
  }

  const slides = [];
  const keyCounter = { image: 0, video: 0 };

  sections.forEach((sectionEl, i) => {
    const $section = $(sectionEl);
    const slideId = `slide-${i + 1}`;
    const rawLabel = $section.attr('data-label') || `Slide ${i + 1}`;
    const label = rawLabel.replace(/^\d+\s*/, '').trim() || rawLabel;
    const hasVideo = $section.find('video').length > 0;

    // Video-capable regions: a div directly wrapping an <image-slot> that
    // also contains a <video> somewhere inside it (the deck's choose/playing
    // toggle markup, which we replace wholesale with our own video slot).
    $section
      .find('div')
      .filter((_, d) => $(d).children('image-slot').length > 0 && $(d).find('video').length > 0)
      .each((_, wrapperEl) => convertVideoWrapper($, wrapperEl, slotState, pageId, assetsDir, keyCounter));

    // Remaining plain image slots.
    $section.find('image-slot').each((_, el) => convertImageSlot($, el, slotState, pageId, assetsDir, keyCounter));

    markEditableText($, $section);

    // Decorative wrappers in the source deck often set pointer-events:none
    // (fine for Claude Design's own edit UI, which doesn't rely on clicking
    // the canvas) — but it's an inherited CSS property, so any real content
    // nested inside one would silently stop receiving our click-to-edit
    // clicks. Force every editable element back to clickable regardless of
    // ancestors.
    $section.find('[data-edit]').each((_, el) => {
      $(el).attr('style', `${$(el).attr('style') || ''}; pointer-events: auto;`);
    });

    $section.addClass('slide');
    $section.attr(
      'style',
      `${$section.attr('style') || ''}; width: ${canvas.width}px; height: ${canvas.height}px; position: relative;`
    );

    fs.writeFileSync(path.join(slidesDir, `${slideId}.html`), $.html($section));
    slides.push({ id: slideId, file: `slides/${slideId}.html`, label, ...(hasVideo ? { hasVideo: true } : {}) });
  });

  fs.writeFileSync(
    path.join(pageDir, 'layout.css'),
    '/* Imported deck: every slide carries its own inline styling, so no shared layout rules are needed here. */\n'
  );

  const pageJson = { id: pageId, name: pageName, theme: 'blank', canvas, fonts, slides };
  fs.writeFileSync(path.join(pageDir, 'page.json'), JSON.stringify(pageJson, null, 2));

  return { pageId, pageName, slideCount: slides.length };
}
