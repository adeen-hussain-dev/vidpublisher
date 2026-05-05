#!/usr/bin/env python3
"""
transcribe.py — Uses local Whisper to transcribe video audio and output an SRT file.
Called automatically by Node.js videoProcessor.js

Usage: python transcribe.py <video_path> <output_srt_path> [model_size]
Model sizes: tiny, base, small, medium, large (default: base)
- tiny:   fastest, least accurate (~1GB RAM)
-   :   good balance (~1GB RAM)  ← recommended
- small:  better accuracy (~2GB RAM)
- medium: high accuracy (~5GB RAM)
"""

import sys
import os
from faster_whisper import WhisperModel
import warnings
warnings.filterwarnings("ignore")

def format_timestamp(seconds):
    """Convert seconds to SRT timestamp format: HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

def words_to_chunks(words, words_per_chunk=3):
    """Group word-level timestamps into chunks of N words"""
    chunks = []
    i = 0
    while i < len(words):
        chunk_words = words[i:i + words_per_chunk]
        text = ' '.join(w['word'].strip() for w in chunk_words).upper()
        start = chunk_words[0]['start']
        end = chunk_words[-1]['end']
        chunks.append({'text': text, 'start': start, 'end': end})
        i += words_per_chunk
    return chunks

def segments_to_chunks(segments, words_per_chunk=3):
    """Fallback: split segments into word chunks with estimated timing"""
    chunks = []
    for seg in segments:
        words = seg['text'].strip().split()
        duration = seg['end'] - seg['start']
        time_per_word = duration / max(len(words), 1)

        i = 0
        while i < len(words):
            chunk_words = words[i:i + words_per_chunk]
            text = ' '.join(chunk_words).upper()
            start = seg['start'] + (i * time_per_word)
            end = start + (len(chunk_words) * time_per_word)
            end = min(end, seg['end'])
            chunks.append({'text': text, 'start': start, 'end': end})
            i += words_per_chunk
    return chunks

def transcribe(video_path, output_srt_path, model_size='base'):
    print(f"[Whisper] Loading model: {model_size}", flush=True)
    model = WhisperModel(model_size, device='cpu', compute_type='int8')

    print(f"[Whisper] Transcribing: {video_path}", flush=True)
    segments_iter, info = model.transcribe(
        video_path,
        word_timestamps=True,
        vad_filter=True,
    )
    segments = list(segments_iter)

    print(f"[Whisper] Detected language: {getattr(info, 'language', 'unknown')}", flush=True)

    # Try to use word-level timestamps first (most accurate)
    all_words = []
    for segment in segments:
        if getattr(segment, 'words', None):
            for w in segment.words:
                all_words.append({
                    'word': (w.word or '').strip(),
                    'start': float(w.start),
                    'end': float(w.end),
                })

    if all_words:
        print(f"[Whisper] Using word-level timestamps ({len(all_words)} words)", flush=True)
        chunks = words_to_chunks(all_words, words_per_chunk=3)
    else:
        print(f"[Whisper] Falling back to segment-level timestamps", flush=True)
        seg_dicts = [{
            'text': (s.text or '').strip(),
            'start': float(s.start),
            'end': float(s.end),
        } for s in segments]
        chunks = segments_to_chunks(seg_dicts, words_per_chunk=3)

    # Write SRT file
    srt_content = ''
    for i, chunk in enumerate(chunks):
        start_ts = format_timestamp(chunk['start'])
        # Small gap before next subtitle for clean flash effect
        end_ts = format_timestamp(max(chunk['start'] + 0.1, chunk['end'] - 0.05))
        srt_content += f"{i + 1}\n{start_ts} --> {end_ts}\n{chunk['text']}\n\n"

    with open(output_srt_path, 'w', encoding='utf-8') as f:
        f.write(srt_content)

    print(f"[Whisper] SRT saved: {output_srt_path}", flush=True)
    print(f"[Whisper] Total subtitle chunks: {len(chunks)}", flush=True)

    # Output full transcript for logging
    full_text = ' '.join((s.text or '').strip() for s in segments).strip()
    print(f"[Whisper] Transcript: {full_text[:100]}...", flush=True)

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python transcribe.py <video_path> <output_srt_path> [model_size]")
        sys.exit(1)

    video_path = sys.argv[1]
    output_srt_path = sys.argv[2]
    model_size = sys.argv[3] if len(sys.argv) > 3 else 'base'

    if not os.path.exists(video_path):
        print(f"Error: Video file not found: {video_path}")
        sys.exit(1)

    transcribe(video_path, output_srt_path, model_size)
