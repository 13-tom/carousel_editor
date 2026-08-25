import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './lib/config.js';
import { pagesRouter } from './routes/pages.js';
import { projectsRouter } from './routes/projects.js';
import { renderRouter } from './routes/render.js';
import { uploadRouter } from './routes/upload.js';
import { exportRouter } from './routes/export.js';
import { templatesRouter } from './routes/templates.js';
import { closeBrowser } from './lib/screenshot.js';
import { basicAuth } from './lib/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.join(config.paths.root, 'web/dist');

const app = express();
app.use(cors());
app.use(basicAuth);
app.use(express.json({ limit: '10mb' }));

app.use('/uploads', express.static(config.paths.uploads));
app.use('/template-assets', express.static(config.paths.templates));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(webDist));

app.use('/api', pagesRouter);
app.use('/api', projectsRouter);
app.use('/api', renderRouter);
app.use('/api', uploadRouter);
app.use('/api', exportRouter);
app.use('/api', templatesRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

const server = app.listen(config.server.port, () => {
  console.log(`Carousel editor server running at http://localhost:${config.server.port}`);
});

async function shutdown() {
  await closeBrowser();
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
