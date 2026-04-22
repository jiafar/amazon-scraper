#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DOCKERFILE="$SCRIPT_DIR/Dockerfile"

# Generate Dockerfile if not present (clawhub only bundles files with extensions)
if [ ! -f "$DOCKERFILE" ]; then
  echo "📝 Generating Dockerfile..."
  cat > "$DOCKERFILE" << 'EOF'
FROM mcr.microsoft.com/playwright:v1.59.1-noble

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY assets/ ./assets/

CMD ["node", "assets/amazon_handler.js"]
EOF
fi

echo "🔧 Building Docker image 'clawd-crawlee'..."
docker build -t clawd-crawlee "$SCRIPT_DIR"

mkdir -p ~/scrapes
echo "✅ Done. Image 'clawd-crawlee' is ready."
echo "   Scrape output directory: ~/scrapes"
echo ""
echo "Quick test:"
echo "  docker run -t --rm clawd-crawlee node assets/amazon_handler.js \"https://www.amazon.com/zgbs/electronics\""
