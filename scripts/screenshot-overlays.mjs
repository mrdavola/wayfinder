// Open each kind of HotspotOverlay on the demo and screenshot it.
// Verifies the new ProjectBanner replaces the old 3D TactilePropViewer.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const OUT_DIR = resolve(process.cwd(), 'screenshots/overlays');
mkdirSync(OUT_DIR, { recursive: true });

const SHOTS = [
  { name: 'trailhead', selector: 'button.hotspot[data-role="trailheadSign"]' },
  { name: 'stage1',    selector: 'button.hotspot[data-role="stage"][data-state="active"]' },
  { name: 'mailbox',   selector: 'button.hotspot[data-role="mailbox"]' },
  { name: 'reflect',   selector: 'button.hotspot[data-role="reflection"]' },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
try {
  for (const s of SHOTS) {
    const page = await ctx.newPage();
    await page.goto(`${BASE}/demo?biome=campsite&phase=fresh&team=group&ui=off`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const btn = await page.$(s.selector);
    if (!btn) {
      console.log(`SKIP ${s.name}: no element matching ${s.selector}`);
      await page.close();
      continue;
    }
    await btn.click();
    await page.waitForTimeout(700); // sheet slide-up animation + banner mount
    const out = `${OUT_DIR}/${s.name}.png`;
    await page.screenshot({ path: out, fullPage: false });
    console.log(`saved ${out}`);
    await page.close();
  }
} finally {
  await ctx.close();
  await browser.close();
}
