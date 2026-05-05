import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

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

function transcribeWithWhisper(videoPath, srtPath) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '..', 'transcribe.py');
    if (!fs.existsSync(scriptPath)) {
      return reject(new Error('transcribe.py not found in backend root.'));
    }
    const py = process.platform === 'win32' ? 'python' : 'python3';
    console.log('[Whisper] Starting transcription...');
    const proc = spawn(py, [scriptPath, videoPath, srtPath, 'base'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stdout.on('data', d => console.log('[Whisper]', d.toString().trim()));
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', code => {
      if (code === 0 && fs.existsSync(srtPath)) resolve(srtPath);
      else reject(new Error(`Whisper failed: ${stderr.slice(0, 200)}`));
    });
    proc.on('error', err => reject(new Error(`Python not found: ${err.message}`)));
  });
}

export async function processVideo({ videoPath, musicPath, addSubtitles, logoPath }) {
  const tmpDir = os.tmpdir();
  const timestamp = Date.now();
  const outputPath = path.join(tmpDir, `processed_${timestamp}.mp4`);
  const srtPath = path.join(tmpDir, `subs_${timestamp}.srt`);
  const resolvedLogo = logoPath || path.join(ASSETS_DIR, 'logo.png');

  if (!fs.existsSync(resolvedLogo)) {
    throw new Error(`Logo not found: ${resolvedLogo}`);
  }

  // Step 1: Whisper transcription if needed
  let hasSubs = false;
  if (addSubtitles) {
    try {
      await transcribeWithWhisper(videoPath, srtPath);
      hasSubs = fs.existsSync(srtPath) && fs.statSync(srtPath).size > 0;
    } catch (e) {
      console.warn('[Whisper] Subtitle generation failed (continuing without subs)');
      console.warn('[Whisper] Error:', e.message);
    }
  }

  const escapedSrt = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');
  const escapedFontsDir = ASSETS_DIR.replace(/\\/g, '/').replace(/:/g, '\\:');

  return new Promise((resolve, reject) => {
    let cmd = ffmpeg(videoPath).input(resolvedLogo);

    // Add music as third input if provided
    if (musicPath && fs.existsSync(musicPath)) {
      cmd = cmd.input(musicPath);
    }

    // Build filter graph
    const filters = [];
    let videoOut = '[0:v]';

    // Scale + overlay logo
    filters.push('[1:v]scale=80:-1[logo]');
    filters.push(`${videoOut}[logo]overlay=W-w-15:H-h-15[withlogo]`);
    videoOut = '[withlogo]';

    // Burn subtitles if available
    if (hasSubs) {
      filters.push(
        `${videoOut}subtitles='${escapedSrt}':fontsdir='${escapedFontsDir}':force_style='FontName=Bangers,FontSize=16,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1,Bold=0,Alignment=2,MarginV=25'[out]`
      );
      videoOut = '[out]';
    } else {
      filters.push(`${videoOut}null[out]`);
    }

    cmd.complexFilter(filters);

    // Audio: mix video audio with background music at 25% volume
    const outputOpts = ['-map [out]'];
    if (musicPath && fs.existsSync(musicPath)) {
      // Mix original audio (if any) with music at 25% volume
      outputOpts.push('-filter_complex_additional');
      cmd.complexFilter([
        ...filters,
        // video audio at 100%, music at 25%
        '[0:a]volume=1.0[va]',
        '[2:a]volume=0.25[ma]',
        '[va][ma]amix=inputs=2:duration=first[aout]',
      ]);
      outputOpts.push('-map [aout]');
    } else {
      outputOpts.push('-map 0:a?');
    }

    cmd
      .outputOptions([
        '-map [out]',
        musicPath && fs.existsSync(musicPath) ? '-map [aout]' : '-map 0:a?',
        '-c:v libx264',
        '-c:a aac',
        '-preset fast',
        '-crf 22',
        '-movflags +faststart',
      ])
      .output(outputPath)
      .on('start', () => console.log('[FFmpeg] Processing started'))
      .on('progress', p => {
        if (p.percent) process.stdout.write(`\r[FFmpeg] ${Math.round(p.percent)}%`);
      })
      .on('end', () => {
        process.stdout.write('\n');
        try { if (hasSubs) fs.unlinkSync(srtPath); } catch {}
        resolve(outputPath);
      })
      .on('error', err => {
        try { if (hasSubs) fs.unlinkSync(srtPath); } catch {}
        reject(new Error(`FFmpeg error: ${err.message}`));
      })
      .run();
  });
}
