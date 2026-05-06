#!/usr/bin/env python3
"""
transcribe.py - Uses AssemblyAI API for transcription
Free tier: 5 hours/month - no PyTorch needed
"""
import sys
import os
import json
import subprocess
import tempfile
import urllib.request
import urllib.error
import time

def format_timestamp(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def extract_audio(video_path, audio_path):
    cmd = ['ffmpeg', '-i', video_path, '-vn', '-ar', '16000',
           '-ac', '1', '-f', 'mp3', audio_path, '-y', '-loglevel', 'error']
    result = subprocess.run(cmd, capture_output=True)
    if result.returncode != 0:
        raise Exception(f"FFmpeg failed: {result.stderr.decode()}")

def upload_audio(audio_path, api_key):
    print('[AssemblyAI] Uploading audio...', flush=True)
    with open(audio_path, 'rb') as f:
        audio_data = f.read()
    req = urllib.request.Request(
        'https://api.assemblyai.com/v2/upload',
        data=audio_data,
        headers={
            'authorization': api_key,
            'content-type': 'application/octet-stream',
        }
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode())['upload_url']

def request_transcript(upload_url, api_key):
    print('[AssemblyAI] Requesting transcript...', flush=True)
    body = json.dumps({
        'audio_url': upload_url,
        'word_boost': [],
        'punctuate': True,
    }).encode()
    req = urllib.request.Request(
        'https://api.assemblyai.com/v2/transcript',
        data=body,
        headers={
            'authorization': api_key,
            'content-type': 'application/json',
        }
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode())['id']

def poll_transcript(transcript_id, api_key):
    print('[AssemblyAI] Waiting for transcript...', flush=True)
    url = f'https://api.assemblyai.com/v2/transcript/{transcript_id}'
    while True:
        req = urllib.request.Request(url, headers={'authorization': api_key})
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode())
        status = data['status']
        if status == 'completed':
            return data
        elif status == 'error':
            raise Exception(f"Transcription failed: {data.get('error')}")
        print(f'[AssemblyAI] Status: {status}...', flush=True)
        time.sleep(3)

def words_to_chunks(words, words_per_chunk=3):
    chunks = []
    i = 0
    while i < len(words):
        chunk = words[i:i + words_per_chunk]
        text = ' '.join(w.get('text', '').strip() for w in chunk).upper()
        start = chunk[0].get('start', 0) / 1000.0  # ms to seconds
        end = chunk[-1].get('end', start * 1000 + 500) / 1000.0
        chunks.append({'text': text, 'start': start, 'end': end})
        i += words_per_chunk
    return chunks

def transcribe(video_path, output_srt_path):
    api_key = os.environ.get('ASSEMBLYAI_API_KEY')
    if not api_key:
        raise Exception('ASSEMBLYAI_API_KEY not set')

    # Extract audio
    with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as tmp:
        audio_path = tmp.name

    try:
        print('[AssemblyAI] Extracting audio...', flush=True)
        extract_audio(video_path, audio_path)

        # Upload + transcribe
        upload_url = upload_audio(audio_path, api_key)
        transcript_id = request_transcript(upload_url, api_key)
        result = poll_transcript(transcript_id, api_key)

    finally:
        try:
            os.unlink(audio_path)
        except:
            pass

    # Build SRT from word-level timestamps
    words = result.get('words', [])
    if not words:
        raise Exception('No words returned from AssemblyAI')

    print(f'[AssemblyAI] Got {len(words)} words', flush=True)
    chunks = words_to_chunks(words, 3)

    srt = ''
    for i, chunk in enumerate(chunks):
        start = format_timestamp(chunk['start'])
        end = format_timestamp(max(chunk['start'] + 0.1, chunk['end'] - 0.05))
        srt += f"{i+1}\n{start} --> {end}\n{chunk['text']}\n\n"

    with open(output_srt_path, 'w', encoding='utf-8') as f:
        f.write(srt)

    print(f'[AssemblyAI] SRT saved with {len(chunks)} subtitle chunks', flush=True)

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('Usage: python transcribe.py <video> <output.srt>')
        sys.exit(1)
    transcribe(sys.argv[1], sys.argv[2])