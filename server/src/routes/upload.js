import express from 'express';
import multer from 'multer';
import path from 'path';
import { nanoid } from 'nanoid';
import { config } from '../lib/config.js';

const ALLOWED = /^(image\/(png|jpe?g|webp|gif)|video\/mp4|video\/quicktime|video\/webm)$/;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.paths.uploads),
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
  res.json({ url: `/uploads/${req.file.filename}` });
});
