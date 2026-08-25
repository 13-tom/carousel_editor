import express from 'express';
import { loadProject, saveProject } from '../lib/projectStore.js';

export const projectsRouter = express.Router();

projectsRouter.get('/projects/:pageId', (req, res) => {
  res.json(loadProject(req.params.pageId));
});

projectsRouter.put('/projects/:pageId', (req, res) => {
  const saved = saveProject(req.params.pageId, req.body);
  res.json(saved);
});
