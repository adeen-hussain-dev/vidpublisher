import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { generateSRT } from './transcriber.js';

ffmpeg.setFfmpegPath(ffmpegStatic);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, '..', 'assets');

function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, meta) => {
      if (err) return reject(err);
      resolve(meta.format.duration);
    });
  });
}

export async function processVideo({ videoPath, musicPath, addSubtitles, logoPath }) {
  const tmpDir = os.tmpdir();
  const timestamp = Date.now();
  const outputPath = path.join(tmpDir, `processed_${timestamp}.mp4`);
  const resolvedLogo = logoPath || path.join(ASSETS_DIR, 'logo.png');

  if (!fs.existsSync(resolvedLogo)) {
    throw new Error(`Logo not found: ${resolvedLogo}`);
  }

  // Step 1: AssemblyAI transcription if needed
  let srtPath = null;
  let hasSubs = false;

  if (addSubtitles) {
    try {
      srtPath = await generateSRT(videoPath);
      hasSubs = srtPath && fs.existsSync(srtPath) && fs.statSync(srtPath).size > 0;
      console.log('[Subtitles] Generated successfully');
    } catch (e) {
      console.warn('[Subtitles] Failed, skipping:', e.message);
    }
  }

  const escapedFontsDir = ASSETS_DIR.replace(/\\/g, '/').replace(/:/g, '\\:');

  return new Promise((resolve, reject) => {
    let cmd = ffmpeg(videoPath).input(resolvedLogo);

    const hasMusic = musicPath && fs.existsSync(musicPath);
    if (hasMusic) cmd = cmd.input(musicPath);

    const filters = [];
    filters.push('[1:v]scale=80:-1[logo]');
    filters.push('[0:v][logo]overlay=W-w-15:H-h-15[withlogo]');

    if (hasSubs) {
      const escapedSrt = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');
      filters.push(
        `[withlogo]subtitles='${escapedSrt}':fontsdir='${escapedFontsDir}':force_style='FontName=Bangers,FontSize=16,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1,Bold=0,Alignment=2,MarginV=25'[out]`
      );
    } else {
      filters.push('[withlogo]null[out]');
    }

    if (hasMusic) {
      filters.push('[0:a]volume=1.0[va]');
      filters.push('[2:a]volume=0.25[ma]');
      filters.push('[va][ma]amix=inputs=2:duration=first[aout]');
    }

    cmd
      .complexFilter(filters)
      .outputOptions([
        '-map [out]',
        hasMusic ? '-map [aout]' : '-map 0:a?',
        '-c:v libx264',
        '-c:a aac',
        '-preset fast',
        '-crf 18',
        '-movflags +faststart',
      ])
      .output(outputPath)
      .on('start', () => console.log('[FFmpeg] Processing started'))
      .on('progress', p => {
        if (p.percent) process.stdout.write(`\r[FFmpeg] ${Math.round(p.percent)}%`);
      })
      .on('end', () => {
        process.stdout.write('\n');
        try { if (srtPath) fs.unlinkSync(srtPath); } catch {}
        resolve(outputPath);
      })
      .on('error', err => {
        try { if (srtPath) fs.unlinkSync(srtPath); } catch {}
        reject(new Error(`FFmpeg error: ${err.message}`));
      })
      .run();
  });
}
