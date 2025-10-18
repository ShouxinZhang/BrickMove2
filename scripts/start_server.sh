#!/bin/bash
# Quick start script for the documentation server

cd "$(dirname "$0")/.."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    
    echo "🔧 Installing dependencies..."
    ./venv/bin/pip install -r requirements.txt
fi

echo ""
echo "🚀 Starting server..."
./venv/bin/python backend/server.py
