// Capture the public demo page across biomes & phases.
// Usage: node scripts/screenshot-demo.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const OUT_DIR = resolve(process.cwd(), 'screenshots/demo');
mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORT = { width: 1440, height: 900 };

const SHOTS = [
  { name: 'home',                params: 'biome=campsite&phase=fresh&team=group' },
  { name: 'campsite-midway',     params: 'biome=campsite&phase=midway&team=group' },
  { name: 'campsite-done',       params: 'biome=campsite&phase=done&team=group' },
  { name: 'lab-fresh',           params: 'biome=lab&phase=fresh&team=group' },
  { name: 'lab-almost-done',     params: 'biome=lab&phase=almost-done&team=group' },
  { name: 'workshop-fresh',      params: 'biome=workshop&phase=fresh&team=solo' },
  { name: 'workshop-midway',     params: 'biome=workshop&phase=midway&team=group' },
  { name: 'cabin',               params: 'biome=cabin' },
  { name: 'campsite-clean',      params: 'biome=campsite&phase=midway&team=group&ui=off' },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
try {
  for (const s of SHOTS) {
    const page = await ctx.newPage();
    const url = `${BASE}/demo?${s.params}`;
    console.log(`→ ${s.name} | ${url}`);
    page.on('pageerror', e => console.error(`PAGEERROR (${s.name}):`, e.message));
    page.on('console', m => {
      if (m.type() === 'error') console.error(`CONSOLE-ERR (${s.name}):`, m.text());
    });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    const out = `${OUT_DIR}/${s.name}.png`;
    await page.screenshot({ path: out, fullPage: false });
    console.log(`  saved ${out}`);
    await page.close();
  }
} finally {
  await ctx.close();
  await browser.close();
}
console.log('\nDone.');
