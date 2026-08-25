import express from 'express';
import { renderSlideDocument } from '../lib/renderEngine.js';
import { getSlideOverrides } from '../lib/projectStore.js';

export const renderRouter = express.Router();

renderRouter.get('/render/:pageId/:slideId', (req, res) => {
  try {
    const overrides = getSlideOverrides(req.params.pageId, req.params.slideId);
    const mode = req.query.mode === 'export' ? 'export' : 'editor';
    let html = renderSlideDocument(req.params.pageId, req.params.slideId, { overrides, mode });
    if (req.query.transparentVideo === '1') {
      html = html.replace(
        '</style>',
        `html, body, .slide, .video-slot, .video-slot * { background: transparent !important; } .video-slot video { opacity: 0; }</style>`
      );
    }
    res.set('Content-Type', 'text/html').send(html);
  } catch (err) {
    res.status(404).send(`<pre>${err.message}</pre>`);
  }
});
