import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { config } from './config.js';

function run(bin, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args);
    let stderr = '';
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('error', (err) => reject(new Error(`Failed to launch ffmpeg (${bin}): ${err.message}`)));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}\n${stderr.slice(-2000)}`));
    });
  });
}

/**
 * Composite a looping background video with a transparent text/graphics
 * overlay PNG into a single MP4, cropped/scaled to fill the canvas.
 */
export async function composeVideoSlide({ backgroundVideoPath, overlayPngBuffer, canvas, outputPath }) {
  const tmpOverlay = path.join(os.tmpdir(), `overlay-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);
  fs.writeFileSync(tmpOverlay, overlayPngBuffer);

  const { width, height } = canvas;
  const duration = config.video.loopSeconds;
  const filter =
    `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,` +
    `crop=${width}:${height}[bg];[bg][1:v]overlay=0:0[out]`;

  const args = [
    '-y',
    '-stream_loop', '-1',
    '-i', backgroundVideoPath,
    '-loop', '1',
    '-i', tmpOverlay,
    '-filter_complex', filter,
    '-map', '[out]',
    '-t', String(duration),
    '-c:v', 'libx264',
    '-preset', config.video.preset,
    '-crf', String(config.video.crf),
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    outputPath,
  ];

  try {
    await run(config.video.ffmpegPath, args);
  } finally {
    fs.unlinkSync(tmpOverlay);
  }
}
