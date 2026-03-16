#!/bin/bash
# One-command Rizz Master setup
set -e

echo ""
echo "🔥 Rizz Master — Smoothly"
echo ""

# Install deps if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install --silent
fi

# Kill any existing server on port 3069
lsof -ti:3069 | xargs kill -9 2>/dev/null || true

# Start dev server in background
echo "Starting server..."
npx next dev --port 3069 &
SERVER_PID=$!
sleep 3

# Open browser
echo "Opening browser..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  open http://localhost:3069
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  xdg-open http://localhost:3069 2>/dev/null || echo "Open http://localhost:3069 in your browser"
else
  echo "Open http://localhost:3069 in your browser"
fi

echo ""
echo "✓ App running at http://localhost:3069"
echo "  Press Ctrl+C to stop"
echo ""

# Wait for server
wait $SERVER_PID
