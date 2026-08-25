import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { config } from '../lib/config.js';
import { safeSegment, todayFolder } from '../lib/naming.js';

const ALLOWED = /^(image\/(png|jpe?g|webp|gif)|video\/mp4|video\/quicktime|video\/webm)$/;

// If the request names a page (and optionally a topic), files land under
// uploads/<PageName>/<date>/<topic>/ instead of the flat uploads folder —
// the same page/date/topic hierarchy exports use. The frontend must send
// pageName (and topic, if any) as form fields BEFORE the file field, since
// multer/busboy only has them in req.body by the time this callback runs
// if they appeared earlier in the multipart stream.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { pageName, topic } = req.body;
    const dir = pageName
      ? path.join(config.paths.uploads, safeSegment(pageName), todayFolder(), ...(topic ? [safeSegment(topic)] : []))
      : config.paths.uploads;
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${nanoid(10)}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, ALLOWED.test(file.mimetype)),
});

export const uploadRouter = express.Router();

uploadRouter.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded, or file type not allowed' });
  const relPath = path.relative(config.paths.uploads, req.file.path).split(path.sep).join('/');
  res.json({ url: `/uploads/${relPath}` });
});
