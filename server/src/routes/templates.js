import express from 'express';
import multer from 'multer';
import { importDeckZip } from '../lib/templateImport.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 300 * 1024 * 1024 } });

export const templatesRouter = express.Router();

templatesRouter.post('/templates/import', upload.single('zip'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No zip file uploaded' });
  try {
    const result = await importDeckZip(req.file.buffer, { pageName: req.body.pageName });
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    res.status(400).json({ ok: false, error: err.message });
  }
});
