import fs from 'fs';
import fetch from 'node-fetch';
import { execSync } from 'child_process';
import path from 'path';
import os from 'os';

function formatTimestamp(seconds) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  const ms = Math.round((seconds % 1) * 1000).toString().padStart(3, '0');
  return `${h}:${m}:${s},${ms}`;
}

function wordsToChunks(words, wordsPerChunk = 3) {
  const chunks = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    const chunk = words.slice(i, i + wordsPerChunk);
    const text = chunk.map(w => w.text.trim()).join(' ').toUpperCase();
    const start = chunk[0].start / 1000;
    const end = chunk[chunk.length - 1].end / 1000;
    chunks.push({ text, start, end });
  }
  return chunks;
}

function extractAudio(videoPath, audioPath) {
  execSync(
    `ffmpeg -i "${videoPath}" -vn -ar 16000 -ac 1 -f mp3 "${audioPath}" -y -loglevel error`,
    { timeout: 60000 }
  );
}

async function uploadAudio(audioPath, apiKey) {
  const audioData = fs.readFileSync(audioPath);
  const res = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: {
      authorization: apiKey,
      'content-type': 'application/octet-stream',
    },
    body: audioData,
  });
  const data = await res.json();
  if (!data.upload_url) throw new Error(`Upload failed: ${JSON.stringify(data)}`);
  return data.upload_url;
}

async function requestTranscript(uploadUrl, apiKey) {
  const res = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      authorization: apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ audio_url: uploadUrl }),
  });
  const data = await res.json();
  if (!data.id) throw new Error(`Transcript request failed: ${JSON.stringify(data)}`);
  return data.id;
}

async function pollTranscript(transcriptId, apiKey) {
  const url = `https://api.assemblyai.com/v2/transcript/${transcriptId}`;
  while (true) {
    const res = await fetch(url, { headers: { authorization: apiKey } });
    const data = await res.json();
    if (data.status === 'completed') return data;
    if (data.status === 'error') throw new Error(`Transcription error: ${data.error}`);
    console.log(`[AssemblyAI] Status: ${data.status}...`);
    await new Promise(r => setTimeout(r, 3000));
  }
}

export async function generateSRT(videoPath) {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) throw new Error('ASSEMBLYAI_API_KEY not set');

  const audioPath = path.join(os.tmpdir(), `audio_${Date.now()}.mp3`);
  const srtPath = path.join(os.tmpdir(), `subs_${Date.now()}.srt`);

  try {
    console.log('[AssemblyAI] Extracting audio...');
    extractAudio(videoPath, audioPath);

    console.log('[AssemblyAI] Uploading audio...');
    const uploadUrl = await uploadAudio(audioPath, apiKey);

    console.log('[AssemblyAI] Transcribing...');
    const transcriptId = await requestTranscript(uploadUrl, apiKey);
    const result = await pollTranscript(transcriptId, apiKey);

    const words = result.words || [];
    if (words.length === 0) throw new Error('No words returned');

    console.log(`[AssemblyAI] Got ${words.length} words`);
    const chunks = wordsToChunks(words, 3);

    let srt = '';
    chunks.forEach((chunk, i) => {
      const start = formatTimestamp(chunk.start);
      const end = formatTimestamp(Math.max(chunk.start + 0.1, chunk.end - 0.05));
      srt += `${i + 1}\n${start} --> ${end}\n${chunk.text}\n\n`;
    });

    fs.writeFileSync(srtPath, srt, 'utf-8');
    console.log(`[AssemblyAI] SRT saved: ${srtPath}`);
    return srtPath;

  } finally {
    try { fs.unlinkSync(audioPath); } catch {}
  }
}