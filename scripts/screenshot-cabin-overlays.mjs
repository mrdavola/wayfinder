// Capture each cabin hub overlay panel for visual review.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const OUT_DIR = resolve(process.cwd(), 'screenshots/overlays');
mkdirSync(OUT_DIR, { recursive: true });

const SHOTS = [
  { name: 'cabin-wallMap',         selector: 'button.hotspot[data-role="wallMap"]' },
  { name: 'cabin-specimenCabinet', selector: 'button.hotspot[data-role="specimenCabinet"]' },
  { name: 'cabin-bulletinBoard',   selector: 'button.hotspot[data-role="bulletinBoard"]' },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
try {
  for (const s of SHOTS) {
    const page = await ctx.newPage();
    await page.goto(`${BASE}/demo?biome=cabin&ui=off`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const btn = await page.$(s.selector);
    if (!btn) {
      console.log(`SKIP ${s.name}`);
      await page.close();
      continue;
    }
    await btn.click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT_DIR}/${s.name}.png` });
    console.log(`saved ${OUT_DIR}/${s.name}.png`);
    await page.close();
  }
} finally {
  await ctx.close();
  await browser.close();
}
