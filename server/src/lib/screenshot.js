import { chromium } from 'playwright';
import { config } from './config.js';

let browserPromise = null;

function getBrowser() {
  if (!browserPromise) {
    const launchOptions = {};
    if (config.render?.chromiumExecutablePath) {
      launchOptions.executablePath = config.render.chromiumExecutablePath;
    }
    browserPromise = chromium.launch(launchOptions);
  }
  return browserPromise;
}

export async function closeBrowser() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}

/**
 * Screenshot a rendered slide.
 * @param {boolean} opts.transparentVideo - hide video layer + force transparent
 *   background, used to produce the text/graphics overlay burned onto a video export.
 */
export async function renderSlidePng(pageId, slideId, canvas, { transparentVideo = false, topic = '' } = {}) {
  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: { width: canvas.width, height: canvas.height } });
  try {
    const query = new URLSearchParams({ mode: 'export' });
    if (transparentVideo) query.set('transparentVideo', '1');
    if (topic) query.set('topic', topic);
    const url = `http://localhost:${config.server.port}/api/render/${pageId}/${slideId}?${query}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    return await page.screenshot({ type: 'png', omitBackground: transparentVideo });
  } finally {
    await page.close();
  }
}
