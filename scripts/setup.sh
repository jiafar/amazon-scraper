#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "🔧 Building Docker image 'clawd-crawlee'..."
docker build -t clawd-crawlee "$SCRIPT_DIR"

mkdir -p ~/scrapes
echo "✅ Done. Image 'clawd-crawlee' is ready."
echo "   Scrape output directory: ~/scrapes"
echo ""
echo "Quick test:"
echo "  docker run -t --rm clawd-crawlee node assets/amazon_handler.js \"https://www.amazon.com/zgbs/electronics\""
