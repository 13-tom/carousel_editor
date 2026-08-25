import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getPage } from '../lib/templateStore.js';
import { loadProject } from '../lib/projectStore.js';
import { renderSlidePng } from '../lib/screenshot.js';
import { composeVideoSlide } from '../lib/video.js';
import { exportFiles } from '../lib/dropboxExport.js';
import { config } from '../lib/config.js';

export const exportRouter = express.Router();

function uploadUrlToPath(url) {
  return path.join(config.paths.uploads, path.basename(url));
}

exportRouter.post('/export/:pageId', async (req, res) => {
  const { pageId } = req.params;
  const topic = req.query.topic || '';
  try {
    const page = getPage(pageId);
    const project = loadProject(pageId, topic);
    const files = [];

    for (const slide of page.slides) {
      const overrides = project.slides?.[slide.id] || {};
      const bgVideoUrl = overrides.videos?.bgVideo;

      if (slide.hasVideo && bgVideoUrl) {
        const overlayPngBuffer = await renderSlidePng(pageId, slide.id, page.canvas, { transparentVideo: true, topic });
        const outputPath = path.join(os.tmpdir(), `slide-${Date.now()}-${slide.id}.mp4`);
        await composeVideoSlide({
          backgroundVideoPath: uploadUrlToPath(bgVideoUrl),
          overlayPngBuffer,
          canvas: page.canvas,
          outputPath,
        });
        files.push({ filename: `${slide.id}.mp4`, buffer: fs.readFileSync(outputPath) });
        fs.unlinkSync(outputPath);
      } else {
        const buffer = await renderSlidePng(pageId, slide.id, page.canvas, { topic });
        files.push({ filename: `${slide.id}.png`, buffer });
      }
    }

    const result = await exportFiles(page.name, files, { topic, date: new Date() });
    res.json({ ok: true, slideCount: files.length, topic: topic || null, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});
