// setup-yt.js — Run ONCE per YouTube channel to generate token
// Usage: node setup-yt.js restoar
//        node setup-yt.js antbattle
//        node setup-yt.js quotes

import { google } from 'googleapis';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env manually
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const [k, ...v] = t.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  }
}

const channel = process.argv[2]?.toLowerCase();
if (!channel) {
  console.error('\n❌ Usage: node setup-yt.js <channel_id>');
  console.error('   Example: node setup-yt.js restoar');
  console.error('   Example: node setup-yt.js antbattle\n');
  process.exit(1);
}

const prefix = channel.toUpperCase();
const clientId = process.env[`${prefix}_YT_CLIENT_ID`];
const clientSecret = process.env[`${prefix}_YT_CLIENT_SECRET`];

if (!clientId || !clientSecret) {
  console.error(`\n❌ Missing in .env:`);
  console.error(`   ${prefix}_YT_CLIENT_ID`);
  console.error(`   ${prefix}_YT_CLIENT_SECRET\n`);
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3000/oauth2callback';
const auth = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

const authUrl = auth.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/youtube.upload'],
  prompt: 'consent', // force refresh_token to be returned
});

console.log(`\n🔗 Authorizing YouTube channel: ${channel}`);
console.log('\n⚠️  IMPORTANT: Make sure you are logged into the CORRECT');
console.log(`   Google account for "${channel}" before opening the URL.\n`);
console.log('Open this URL in your browser:\n');
console.log(authUrl);
console.log('\n⏳ Waiting for authorization...\n');

const code = await new Promise((resolve, reject) => {
  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url, 'http://localhost:3000');
    const code = reqUrl.searchParams.get('code');
    if (code) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<h2 style="font-family:sans-serif;color:green">✅ ${channel} authorized! You can close this tab.</h2>`);
      server.close();
      resolve(code);
    } else {
      res.end('No code found.');
      reject(new Error('No code in callback'));
    }
  });
  server.listen(3000, () => console.log('   Local server listening on http://localhost:3000'));
  server.on('error', err => reject(new Error(`Port 3000 busy: ${err.message}`)));
});

const { tokens } = await auth.getToken(code);

// Save token to tokens/ folder
const tokensDir = path.join(__dirname, 'tokens');
if (!fs.existsSync(tokensDir)) fs.mkdirSync(tokensDir, { recursive: true });

const tokenPath = path.join(tokensDir, `${channel}_yt_token.json`);
fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));

console.log(`\n✅ Token saved: tokens/${channel}_yt_token.json`);
console.log(`   Access token expires: ${new Date(tokens.expiry_date).toLocaleString()}`);
console.log(`   Refresh token: ${tokens.refresh_token ? '✅ present (auto-refreshes)' : '❌ missing — re-run this script'}\n`);
