import express from 'express';
import { listPages, listThemes } from '../lib/templateStore.js';
import { getPagePalette } from '../lib/colors.js';

export const pagesRouter = express.Router();

pagesRouter.get('/pages', (req, res) => {
  res.json(listPages());
});

pagesRouter.get('/pages/:pageId/colors', (req, res) => {
  try {
    res.json({ colors: getPagePalette(req.params.pageId) });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

pagesRouter.get('/pages/:pageId', (req, res) => {
  try {
    const page = listPages().find((p) => p.id === req.params.pageId);
    if (!page) return res.status(404).json({ error: 'Page not found' });
    res.json(page);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

pagesRouter.get('/themes', (req, res) => {
  res.json(listThemes());
});
