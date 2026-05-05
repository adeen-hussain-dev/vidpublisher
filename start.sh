#!/bin/sh
set -e

cd backend

# Install Python dependencies if pip is available
if command -v pip3 &> /dev/null; then
  echo "Installing Python dependencies..."
  pip3 install -r requirements.txt
elif command -v pip &> /dev/null; then
  echo "Installing Python dependencies..."
  pip install -r requirements.txt
fi

npm ci
npm start
