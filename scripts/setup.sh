#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Dockerfile.sh is the actual Dockerfile (renamed for clawhub bundling compatibility)
# clawhub only bundles files with known text extensions; Dockerfile has no extension
if [ ! -f "$SCRIPT_DIR/Dockerfile" ]; then
  cp "$SCRIPT_DIR/Dockerfile.sh" "$SCRIPT_DIR/Dockerfile"
fi

echo "🔧 Building Docker image 'clawd-crawlee'..."
docker build -t clawd-crawlee "$SCRIPT_DIR"

mkdir -p ~/scrapes
echo "✅ Done. Image 'clawd-crawlee' is ready."
echo "   Scrape output directory: ~/scrapes"
echo ""
echo "Quick test:"
echo "  docker run -t --rm clawd-crawlee node assets/amazon_handler.js \"https://www.amazon.com/zgbs/electronics\""
