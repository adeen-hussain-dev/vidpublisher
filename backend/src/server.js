import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { PAGES, getPage } from './pages.js';
import { processVideo } from './videoProcessor.js';
import { postToFacebook, postToYouTube } from './poster.js';
import { generateMetadata } from './metadata.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const [k, ...v] = t.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  }
}

const app = express();
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';
const MUSIC_DIR = path.join(__dirname, '..', 'music');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const LOGOS_DIR = path.join(__dirname, '..', 'assets', 'logos');

[MUSIC_DIR, UPLOADS_DIR, LOGOS_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/music', express.static(MUSIC_DIR));

const videoUpload = multer({ dest: UPLOADS_DIR });
const musicUpload = multer({
  storage: multer.diskStorage({
    destination: MUSIC_DIR,
    filename: (req, file, cb) => cb(null, file.originalname),
  }),
});

// ─── GET /api/pages ──────────────────────────────────────────────────────────
app.get('/api/pages', (req, res) => {
  const pages = PAGES.map(p => ({
    id: p.id,
    name: p.name,
    platform: p.platform,
    icon: p.icon,
    configured: p.platform === 'facebook'
      ? !!(p.pageId && p.token)
      : fs.existsSync(p.tokenPath || ''),
  }));
  res.json(pages);
});

// ─── GET /api/music ──────────────────────────────────────────────────────────
app.get('/api/music', (req, res) => {
  const files = fs.readdirSync(MUSIC_DIR)
    .filter(f => /\.(mp3|wav|m4a|ogg|aac)$/i.test(f))
    .map(f => ({
      name: f.replace(/\.[^.]+$/, ''),
      filename: f,
      url: `/music/${encodeURIComponent(f)}`,
    }));
  res.json(files);
});

// ─── POST /api/music/upload ──────────────────────────────────────────────────
app.post('/api/music/upload', musicUpload.single('music'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({
    name: req.file.originalname.replace(/\.[^.]+$/, ''),
    filename: req.file.originalname,
    url: `/music/${encodeURIComponent(req.file.originalname)}`,
  });
});

// ─── DELETE /api/music/:filename ─────────────────────────────────────────────
app.delete('/api/music/:filename', (req, res) => {
  const filePath = path.join(MUSIC_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  fs.unlinkSync(filePath);
  res.json({ success: true });
});

// ─── POST /api/publish ───────────────────────────────────────────────────────
app.post('/api/publish', videoUpload.single('video'), async (req, res) => {
  const videoPath = req.file?.path;
  if (!videoPath) return res.status(400).json({ error: 'No video uploaded' });

  try {
    const { pageIds, script, addSubtitles, musicFilename } = req.body;
    const selectedPageIds = JSON.parse(pageIds || '[]');
    const useSubtitles = addSubtitles === 'true';
    const musicPath = musicFilename ? path.join(MUSIC_DIR, musicFilename) : null;

    console.log(`\n[Publish] Pages: ${selectedPageIds.join(', ')}`);
    console.log(`[Publish] Subtitles: ${useSubtitles} | Music: ${musicFilename || 'none'}`);

    // Step 1: Generate title + hashtags (no description)
    console.log('[Publish] Generating metadata...');
    const { title, hashtags } = await generateMetadata(script || 'viral video');
    console.log(`[Publish] Title: ${title}`);

    // Caption = title + hashtags only (no description)
    const caption = `${title}\n\n${hashtags.join(' ')}`;

    // Step 2: Group selected pages by logo to avoid duplicate processing
    // If FB + YT of same niche selected → process video ONCE, post to both
    const logoGroups = {};
    for (const pageId of selectedPageIds) {
      const page = getPage(pageId);
      if (!page) continue;
      const logoKey = page.logoPath || 'default';
      if (!logoGroups[logoKey]) logoGroups[logoKey] = [];
      logoGroups[logoKey].push(page);
    }

    const results = [];

    for (const [logoPath, pagesInGroup] of Object.entries(logoGroups)) {
      console.log(`\n[Publish] Processing for logo: ${path.basename(logoPath)}`);

      // Process video once per unique logo
      let processedPath;
      try {
        processedPath = await processVideo({
          videoPath,
          musicPath,
          addSubtitles: useSubtitles,
          logoPath,
        });
        console.log(`[Publish] Video processed: ${processedPath}`);
      } catch (err) {
        // If processing fails for this logo group, mark all pages as failed
        for (const page of pagesInGroup) {
          results.push({ pageId: page.id, status: 'error', error: `Processing failed: ${err.message}` });
        }
        continue;
      }

      // Post to each page in this logo group
      for (const page of pagesInGroup) {
        try {
          if (page.platform === 'facebook') {
            const id = await postToFacebook({
              videoPath: processedPath,
              caption,
              pageId: page.pageId,
              token: page.token,
            });
            results.push({ pageId: page.id, platform: 'facebook', name: page.name, status: 'success', id });
            console.log(`[Publish] ✅ Facebook (${page.name}): ${id}`);
          } else if (page.platform === 'youtube') {
            const id = await postToYouTube({
              videoPath: processedPath,
              title,
              description: hashtags.join(' '), // YT needs description field, use hashtags
              hashtags,
              page,
            });
            results.push({ pageId: page.id, platform: 'youtube', name: page.name, status: 'success', id });
            console.log(`[Publish] ✅ YouTube (${page.name}): ${id}`);
          }
        } catch (err) {
          results.push({ pageId: page.id, platform: page.platform, name: page.name, status: 'error', error: err.message });
          console.error(`[Publish] ❌ ${page.name} (${page.platform}):`, err.message);
        }
      }

      // Cleanup processed video for this logo group
      try { fs.unlinkSync(processedPath); } catch {}
    }

    // Cleanup original upload
    try { fs.unlinkSync(videoPath); } catch {}

    res.json({ success: true, title, hashtags, results });

  } catch (err) {
    try { if (videoPath) fs.unlinkSync(videoPath); } catch {}
    console.error('[Publish] Fatal:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`\n🚀 VidPublisher backend running on http://${HOST}:${PORT}`);
  console.log(`   Music:   ${MUSIC_DIR}`);
  console.log(`   Uploads: ${UPLOADS_DIR}`);
  console.log(`   Logos:   ${LOGOS_DIR}\n`);
});
