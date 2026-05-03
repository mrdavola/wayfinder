// Capture the list-view of the demo across biome+phase combinations.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const OUT_DIR = resolve(process.cwd(), 'screenshots/listview');
mkdirSync(OUT_DIR, { recursive: true });

const SHOTS = [
  { name: 'campsite-fresh',     params: 'view=list&biome=campsite&phase=fresh' },
  { name: 'campsite-midway',    params: 'view=list&biome=campsite&phase=midway' },
  { name: 'campsite-done',      params: 'view=list&biome=campsite&phase=done' },
  { name: 'lab-almost-done',    params: 'view=list&biome=lab&phase=almost-done' },
  { name: 'workshop-midway',    params: 'view=list&biome=workshop&phase=midway' },
  { name: 'cabin',              params: 'view=list&biome=cabin' },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
try {
  for (const s of SHOTS) {
    const page = await ctx.newPage();
    const url = `${BASE}/demo?${s.params}`;
    console.log(`→ ${s.name} | ${url}`);
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT_DIR}/${s.name}.png`, fullPage: false });
    await page.close();
  }
} finally {
  await ctx.close();
  await browser.close();
}
console.log('Done.');
