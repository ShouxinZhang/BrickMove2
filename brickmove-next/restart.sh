#!/bin/bash

# Get the directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "Stopping any running Next.js processes on port 3000..."
# Kill process on port 3000 if it exists
fuser -k 3000/tcp 2>/dev/null

echo "Installing dependencies..."
npm install

echo "Starting Next.js development server..."
# Start in background and redirect output to a log file if desired, 
# or just run it directly. Usually restart scripts for dev are run manually.
npm run dev
