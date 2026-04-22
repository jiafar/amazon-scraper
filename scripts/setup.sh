#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Dockerfile.sh is the actual Dockerfile (renamed for clawhub bundling compatibility)
# clawhub only bundles files with known text extensions; Dockerfile has no extension
if [ ! -f "$SCRIPT_DIR/Dockerfile" ]; then
  cp "$SCRIPT_DIR/Dockerfile.sh" "$SCRIPT_DIR/Dockerfile"
fi

echo "🔧 Building Docker image 'amazon-scraper'..."
docker build -t amazon-scraper "$SCRIPT_DIR"

mkdir -p ~/scrapes
echo "✅ Done. Image 'amazon-scraper' is ready."
echo "   Scrape output directory: ~/scrapes"
echo ""
echo "Quick test (no proxy):"
echo "  docker run -t --rm amazon-scraper node assets/amazon_handler.js \"https://www.amazon.com/gp/bestsellers/electronics\""
echo ""
echo "With proxy (Oxylabs example):"
echo "  docker run -t --rm -e AMAZON_PROXY=\"http://customer-USER:***@pr.oxylabs.io:7777\" amazon-scraper node assets/amazon_handler.js \"https://www.amazon.com/gp/bestsellers/electronics\""
echo ""
echo "Save results to file (mapped to ~/scrapes):"
echo "  docker run -t --rm -v ~/scrapes:/data -e AMAZON_PROXY=\"...\" amazon-scraper node assets/amazon_handler.js \"URL\" --output result.json"
echo ""
echo "Multi-page search with output:"
echo "  docker run -t --rm -v ~/scrapes:/data -e AMAZON_PROXY=\"...\" amazon-scraper node assets/amazon_handler.js \"https://www.amazon.com/s?k=phone\" --pages 2 --output phone_search.json"
echo ""
echo "Rotate multiple proxies (round-robin + failover):"
echo "  docker run -t --rm -v ~/scrapes:/data \\"
echo "    -e AMAZON_PROXIES=\"http://user:***@host:8001,http://user:***@host:8002,http://user:***@host:8003\" \\"
echo "    amazon-scraper node assets/amazon_handler.js \"URL\" --pages 3 --output result.json"
echo ""
echo "Tips:"
echo "  - Use -cc-US suffix in username for US IPs: customer-USER-cc-US"
echo "  - Use -sessid-xxx suffix for sticky session: customer-USER-sessid-abc123"
echo "  - Proxy is required if your server IP is blocked by Amazon"
echo "  - BSR URLs use /gp/bestsellers/ (not /zgbs/) for correct page routing"
echo "  - Output path is relative to /data inside container; map -v ~/scrapes:/data to persist locally"
echo "  - AMAZON_PROXIES rotates per page; AMAZON_PROXY uses a single proxy"
