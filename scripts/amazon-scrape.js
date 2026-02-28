#!/usr/bin/env node
/**
 * Amazon Product Scraper
 * 
 * Usage:
 *   node amazon-scrape.js <keyword> [options]
 * 
 * Options:
 *   --pages <n>       Number of pages to scrape (default: 5)
 *   --output <path>   Output JSON file path (default: stdout)
 *   --delay <ms>      Base delay between pages in ms (default: 3000)
 *   --headless        Run headless (default: true), use --no-headless for headed
 * 
 * Examples:
 *   node amazon-scrape.js "over ear headphones" --pages 3
 *   node amazon-scrape.js "mechanical keyboard" --pages 10 --output results.json
 *   node amazon-scrape.js "wireless mouse" --pages 5 --delay 5000
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Parse CLI args
const args = process.argv.slice(2);
let keyword = '';
let pages = 5;
let outputPath = '';
let baseDelay = 3000;
let headless = true;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--pages' && args[i + 1]) { pages = parseInt(args[++i]); }
  else if (args[i] === '--output' && args[i + 1]) { outputPath = args[++i]; }
  else if (args[i] === '--delay' && args[i + 1]) { baseDelay = parseInt(args[++i]); }
  else if (args[i] === '--no-headless') { headless = false; }
  else if (!args[i].startsWith('--') && !keyword) { keyword = args[i]; }
}

if (!keyword) {
  console.error('Usage: node amazon-scrape.js <keyword> [--pages N] [--output path] [--delay ms]');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch({
    headless,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'en-US',
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    },
  });

  // Anti-detection
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {} };
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    const origQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (p) =>
      p.name === 'notifications' ? Promise.resolve({ state: Notification.permission }) : origQuery(p);
  });

  const page = await context.newPage();
  const allProducts = [];

  // Scroll page to trigger lazy loading
  async function scrollPage() {
    await page.evaluate(async () => {
      for (let i = 0; i < 8; i++) {
        window.scrollBy(0, window.innerHeight * 0.7);
        await new Promise(r => setTimeout(r, 300 + Math.random() * 400));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1500);
  }

  // Extract products from current page
  async function extractProducts(pageNum) {
    await scrollPage();
    return page.evaluate((pn) => {
      const items = [];
      document.querySelectorAll('[data-component-type="s-search-result"]').forEach(card => {
        const asin = card.dataset.asin;
        if (!asin) return;
        const titleEl = card.querySelector('h2 a span, h2 span');
        const title = titleEl?.textContent?.trim();
        if (!title || title.length < 5) return;

        const priceEl = card.querySelector('.a-price .a-offscreen');
        const ratingEl = card.querySelector('.a-icon-alt');
        const reviewEl = card.querySelector('.a-size-base.s-underline-text');
        const linkEl = card.querySelector('h2 a');
        const imgEl = card.querySelector('img.s-image');

        items.push({
          title,
          price: priceEl?.textContent?.trim() || 'N/A',
          rating: ratingEl?.textContent?.split(' ')?.[0] || 'N/A',
          reviews: reviewEl?.textContent?.trim() || 'N/A',
          asin,
          link: linkEl ? 'https://www.amazon.com' + linkEl.getAttribute('href')?.split('/ref=')?.[0] : '',
          image: imgEl?.src || '',
          page: pn,
        });
      });
      return items;
    }, pageNum);
  }

  // Handle error pages with retry
  async function handleErrorPage() {
    const title = await page.title();
    if (title.includes('Sorry') || title.includes('error')) {
      console.error('   ⚠️ Error page detected, retrying...');
      await page.waitForTimeout(5000);
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(4000);
      const retryTitle = await page.title();
      return !retryTitle.includes('Sorry');
    }
    return true;
  }

  // Page 1: direct navigation
  console.error(`🔍 Searching: "${keyword}" (${pages} pages)`);
  console.error(`📄 Page 1/${pages}`);
  await page.goto(`https://www.amazon.com/s?k=${encodeURIComponent(keyword)}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForTimeout(baseDelay + Math.random() * 2000);

  if (await handleErrorPage()) {
    const products = await extractProducts(1);
    console.error(`   ✅ ${products.length} products`);
    allProducts.push(...products);
  }

  // Pages 2+: click "Next" button for natural navigation
  for (let pg = 2; pg <= pages; pg++) {
    console.error(`📄 Page ${pg}/${pages}`);

    const nextBtn = await page.$('a.s-pagination-next:not(.s-pagination-disabled)');
    if (!nextBtn) {
      const pageLink = await page.$(`a.s-pagination-button[aria-label="Go to page ${pg}"]`);
      if (!pageLink) {
        console.error('   ❌ No more pages available');
        break;
      }
      await pageLink.click();
    } else {
      await nextBtn.click();
    }

    try {
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch { /* navigation may have already completed */ }

    await page.waitForTimeout(baseDelay + Math.random() * 3000);

    if (await handleErrorPage()) {
      const products = await extractProducts(pg);
      console.error(`   ✅ ${products.length} products`);
      allProducts.push(...products);
    } else {
      console.error('   ❌ Skipped (error page)');
    }

    if (pg < pages) {
      await page.waitForTimeout(1000 + Math.random() * 2000);
    }
  }

  const output = JSON.stringify(allProducts, null, 2);

  if (outputPath) {
    fs.writeFileSync(outputPath, output);
    console.error(`\n💾 Saved to ${outputPath}`);
  } else {
    console.log(output);
  }

  console.error(`\n🎉 Done! ${allProducts.length} products across ${pages} pages`);
  await browser.close();
})();
