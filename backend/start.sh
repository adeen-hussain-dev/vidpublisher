#!/bin/bash
echo "=== Installing Python dependencies ==="
pip install openai-whisper --quiet --no-cache-dir 2>/dev/null || \
pip3 install openai-whisper --quiet --no-cache-dir 2>/dev/null || \
echo "Whisper install failed - subtitles will be skipped"

echo "=== Starting Node.js server ==="
cd /app
npm start