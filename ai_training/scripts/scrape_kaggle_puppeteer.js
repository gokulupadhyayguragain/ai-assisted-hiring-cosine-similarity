#!/usr/bin/env node
/*
Puppeteer Kaggle dataset scraper
- Headful by default so you can log in interactively
- Searches Kaggle datasets for `--query` and extracts owner/dataset-slug
- Writes entries to dataset.txt in the kagglehub format you supplied

Usage:
  npm install puppeteer
  node backend/tools/scrape_kaggle_puppeteer.js --query resume --limit 200 --out dataset.txt

Options:
  --headless         Run headless (no interactive login) [default: false]
  --wait-login       If headful, wait for you to press Enter after manual login [default: true]
  --query            Search term [default: resume]
  --limit            Max datasets to collect [default: 200]
  --out              Output file [default: dataset.txt]

Notes:
- Run locally where you have a browser; headful mode lets you log in to Kaggle manually.
- Scraping Kaggle via browser automation is more fragile than the official API and should be used responsibly.
*/

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

function parseArgs() {
  const args = require('minimist')(process.argv.slice(2), {
    string: ['query', 'out'],
    boolean: ['headless', 'wait-login'],
    default: { query: 'resume', limit: 200, out: 'dataset.txt', headless: false, 'wait-login': true }
  });
  return args;
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let total = 0;
      const distance = 1000;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        total += distance;
        if (total > document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 300);
    });
  });
}

function formatEntry(ref) {
  return `import kagglehub\n\n# Download latest version\npath = kagglehub.dataset_download("${ref}")\n\nprint("Path to dataset files:", path)\n---\n`;
}

(async () => {
  const argv = parseArgs();
  const query = argv.query;
  const limit = parseInt(argv.limit || 200, 10);
  const out = argv.out;
  const headless = !!argv.headless;
  const waitLogin = !!argv['wait-login'];

  const browser = await puppeteer.launch({ headless: headless, defaultViewport: null, args: ['--start-maximized'] });
  const page = await browser.newPage();

  try {
    const searchUrl = `https://www.kaggle.com/datasets?search=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });

    if (!headless && waitLogin) {
      console.log('Running headful. If you are not logged in, please log in to Kaggle in the opened browser window.');
      console.log('When logged in and the datasets page is visible, press Enter here to continue...');
      await new Promise((res) => process.stdin.once('data', res));
    }

    let refs = new Set();
    let lastCount = 0;
    // collect until we have enough or can't find more
    while (refs.size < limit) {
      // ensure content loaded and scroll to load lazy items
      await autoScroll(page);
      // collect dataset links
      const newRefs = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href*="/datasets/"]'));
        const out = [];
        for (const a of anchors) {
          try {
            const href = a.getAttribute('href');
            // normalize and attempt to extract owner/dataset
            const m = href.match(/\/datasets\/([^\/#?]+\/[^\/#?]+)/);
            if (m) out.push(m[1]);
          } catch (e) {}
        }
        return Array.from(new Set(out));
      });

      for (const r of newRefs) refs.add(r);

      if (refs.size === lastCount) {
        // try clicking 'Load more' if available
        const loadMore = await page.$('button[class*="sc-"], button[aria-label*="Load"], button:contains("Load")');
        if (loadMore) {
          try { await loadMore.click(); await page.waitForTimeout(1000); } catch(e) {}
        } else {
          break;
        }
      }
      lastCount = refs.size;
      console.log(`Collected ${refs.size} dataset refs so far...`);
      if (refs.size >= limit) break;
      // try to navigate to next page if present
      const next = await page.$('a[rel="next"]');
      if (next) {
        try { await Promise.all([page.click('a[rel="next"]'), page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 })]); } catch(e) {}
      } else {
        // if no next, attempt to scroll more and wait
        await page.waitForTimeout(1200);
      }
    }

    const list = Array.from(refs).slice(0, limit);
    if (list.length === 0) {
      console.error('No dataset refs found. Make sure the page is loaded and the search returned results.');
    }

    // write entries
    const lines = list.map(formatEntry).join('\n');
    fs.appendFileSync(path.resolve(out), lines, { encoding: 'utf8' });
    console.log(`Wrote ${list.length} entries to ${out}`);
  } catch (err) {
    console.error('Error during scrape:', err);
  } finally {
    await browser.close();
  }
})();
