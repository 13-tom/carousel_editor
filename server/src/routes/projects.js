import express from 'express';
import { loadProject, saveProject, listTopics } from '../lib/projectStore.js';

export const projectsRouter = express.Router();

projectsRouter.get('/projects/:pageId/topics', (req, res) => {
  res.json(listTopics(req.params.pageId));
});

projectsRouter.get('/projects/:pageId', (req, res) => {
  res.json(loadProject(req.params.pageId, req.query.topic));
});

projectsRouter.put('/projects/:pageId', (req, res) => {
  const saved = saveProject(req.params.pageId, req.body, req.query.topic);
  res.json(saved);
});
