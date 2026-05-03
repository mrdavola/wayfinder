// Screenshot all four biomes via the /dev/biome dev preview route.
// Usage: node scripts/screenshot-biomes.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const OUT_DIR = resolve(process.cwd(), 'screenshots');
mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile',  width: 390,  height: 844 },
];

const BIOMES = ['campsite', 'lab', 'workshop', 'cabin'];

const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 });
    for (const biome of BIOMES) {
      const page = await ctx.newPage();
      const url = `${BASE}/dev/biome/${biome}`;
      console.log(`→ ${vp.name} | ${biome} | ${url}`);
      page.on('pageerror', e => console.error(`PAGEERROR (${biome}):`, e.message));
      page.on('console', m => {
        if (m.type() === 'error') console.error(`CONSOLE-ERR (${biome}):`, m.text());
      });
      await page.goto(url, { waitUntil: 'networkidle' });
      // Give parallax & SVGs a beat to settle
      await page.waitForTimeout(800);
      const out = `${OUT_DIR}/${biome}-${vp.name}.png`;
      await page.screenshot({ path: out, fullPage: false });
      console.log(`  saved ${out}`);
      await page.close();
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log('\nDone. See screenshots/ directory.');
