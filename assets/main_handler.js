const { PlaywrightCrawler } = require('crawlee');

/**
 * Amazon-Scraper: main_handler.js
 * Generic dynamic page scraper for non-Amazon URLs.
 * Optimized for containerized execution in OpenClaw.
 *
 * Usage: node assets/main_handler.js [TARGET_URL]
 */

const targetUrl = process.argv[2];

if (!targetUrl) {
    console.error('Error: No target URL provided.');
    process.exit(1);
}

const crawler = new PlaywrightCrawler({
    launchContext: {
        launchOptions: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'], // Required for Docker
        },
    },
    maxRequestRetries: 1,
    requestHandlerTimeoutSecs: 300,
    async requestHandler({ page, log }) {
        log.info(`Amazon-Scraper (generic mode) starting for: ${targetUrl}`);

        // Clear context to ensure a fresh session (avoid cache leakage)
        const context = page.context();
        await context.clearCookies();

        // Generic dynamic page scraping
        await page.goto(targetUrl, { waitUntil: 'networkidle' });
        const title = await page.title();
        const content = await page.evaluate(() => document.body.innerText);
        console.log(JSON.stringify({
            status: 'SUCCESS',
            type: 'GENERIC',
            title,
            data: content.substring(0, 10000)
        }));
    },
});

crawler.run([targetUrl]);
