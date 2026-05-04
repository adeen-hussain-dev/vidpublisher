# VidPublisher

Post videos to multiple Facebook pages and YouTube channels from a mobile-friendly UI.

## Project Structure

```
vidpublisher/
├── frontend/          ← Next.js app → deploy on Vercel (free)
│   ├── app/
│   │   ├── layout.js
│   │   ├── page.js
│   │   └── globals.css
│   ├── next.config.mjs
│   └── package.json
│
└── backend/           ← Express API → deploy on Railway (free)
    ├── src/
    │   ├── server.js        ← main Express server
    │   ├── pages.js         ← your FB/YT pages config
    │   ├── videoProcessor.js
    │   ├── poster.js
    │   └── metadata.js
    ├── transcribe.py        ← Whisper transcription
    ├── assets/
    │   └── logo.png         ← PUT YOUR LOGO HERE
    ├── music/               ← uploaded music stored here
    ├── uploads/             ← temp video uploads
    ├── .env.example
    └── package.json
```

---

## Backend Setup (Railway)

### 1. Install dependencies locally first
```bash
cd backend
npm install
pip install openai-whisper
```

### 2. Add your pages in src/pages.js
Edit the PAGES array with your actual FB page IDs and YT credentials.

### 3. Create .env file
```bash
cp .env.example .env
# Fill in all your API keys
```

### 4. Place your logo
Put `logo.png` in the `assets/` folder.

### 5. Deploy to Railway
- Go to railway.app → New Project → Deploy from GitHub
- Connect your repo
- Set environment variables (copy from .env)
- Railway auto-detects Node.js and runs `npm start`
- Copy your Railway URL (e.g. https://vidpublisher-backend.railway.app)

---

## Frontend Setup (Vercel)

### 1. Deploy to Vercel
- Go to vercel.com → New Project → Import from GitHub
- Set root directory to `frontend/`
- Add environment variable:
  ```
  NEXT_PUBLIC_API_URL = https://your-railway-url.railway.app
  ```
- Deploy

### 2. Access from mobile
- Use your Vercel URL on any device — it's fully mobile responsive

---

## Adding More Pages/Channels

Edit `backend/src/pages.js` and add a new entry:

```javascript
{
  id: 'mypage_fb',          // unique ID
  name: 'My Page Name',     // shown in UI
  platform: 'facebook',     // or 'youtube'
  icon: '🎯',               // emoji shown in UI
  pageId: process.env.MYPAGE_FB_PAGE_ID,
  token: process.env.MYPAGE_FB_TOKEN,
},
```

Then add the env vars to your Railway dashboard.

---

## Music

Upload music via the UI. Files are stored in `backend/music/` and persist on Railway.
Free royalty-free sources:
- pixabay.com/music
- mixkit.co/free-music  
- freemusicarchive.org

---

## How Publishing Works

1. You upload video + fill description + select pages + choose subtitles/music
2. Frontend sends everything to Railway backend API
3. Backend: generates title/hashtags → Whisper transcribes (if enabled) → FFmpeg adds logo + subs + music → posts to all selected pages
4. Results shown on screen
