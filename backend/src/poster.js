import fs from 'fs';
import fetch from 'node-fetch';
import { google } from 'googleapis';

// ─── FACEBOOK ────────────────────────────────────────────────────────────────

export async function postToFacebook({ videoPath, caption, pageId, token }) {
  if (!pageId || !token) throw new Error('Missing FB_PAGE_ID or FB_TOKEN');

  // Step 1: Init reel upload
  const init = await fetch(`https://graph.facebook.com/v19.0/${pageId}/video_reels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ upload_phase: 'start', access_token: token }),
  });
  const initData = await init.json();
  if (!initData.video_id) throw new Error(`FB init failed: ${JSON.stringify(initData)}`);

  const { video_id, upload_url } = initData;

  // Step 2: Upload binary
  const videoBuffer = fs.readFileSync(videoPath);
  const uploadRes = await fetch(upload_url, {
    method: 'POST',
    headers: {
      Authorization: `OAuth ${token}`,
      offset: '0',
      file_size: String(fs.statSync(videoPath).size),
      'Content-Type': 'video/mp4',
    },
    body: videoBuffer,
  });
  if (!uploadRes.ok) throw new Error(`FB upload failed: ${await uploadRes.text()}`);

  // Step 3: Publish
  const pub = await fetch(`https://graph.facebook.com/v19.0/${pageId}/video_reels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      upload_phase: 'finish',
      video_id,
      access_token: token,
      description: caption,
      video_state: 'PUBLISHED',
    }),
  });
  const pubData = await pub.json();
  if (pubData.error) throw new Error(`FB publish failed: ${JSON.stringify(pubData.error)}`);
  return video_id;
}

// ─── YOUTUBE ─────────────────────────────────────────────────────────────────

function getYTAuth(page) {
  const auth = new google.auth.OAuth2(page.clientId, page.clientSecret, 'http://localhost:3000/oauth2callback');
  if (!fs.existsSync(page.tokenPath)) {
    throw new Error(`YouTube not authorized for ${page.name}. Run setup-youtube.js first.`);
  }
  const tokens = JSON.parse(fs.readFileSync(page.tokenPath, 'utf-8'));
  auth.setCredentials(tokens);
  auth.on('tokens', newTokens => {
    const merged = { ...tokens, ...newTokens };
    fs.writeFileSync(page.tokenPath, JSON.stringify(merged, null, 2));
  });
  return auth;
}

export async function postToYouTube({ videoPath, title, description, hashtags, page }) {
  const auth = getYTAuth(page);
  const youtube = google.youtube({ version: 'v3', auth });
  const fullDesc = `${description}\n\n${hashtags.join(' ')}`;

  const res = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: title.slice(0, 100),
        description: fullDesc,
        tags: hashtags.map(h => h.replace('#', '')),
        categoryId: '22',
        defaultLanguage: 'en',
      },
      status: { privacyStatus: 'public', madeForKids: false },
    },
    media: { mimeType: 'video/mp4', body: fs.createReadStream(videoPath) },
  });
  return res.data.id;
}
