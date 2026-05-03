// Overlap auditor — visits the demo at multiple viewport widths, inspects every
// interactive element's bounding box, and reports collisions with other elements
// and with chrome (header, toolbar). Writes a markdown summary plus annotated
// PNGs that draw red rectangles around offending overlaps.
//
// Usage: node scripts/overlap-audit.mjs
//
// Exit code is 0 even when overlaps are found; the report is the deliverable.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const OUT_DIR = resolve(process.cwd(), 'screenshots/audit');
mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORTS = [
  { name: '4k',         width: 2560, height: 1080 },
  { name: 'desktop',    width: 1440, height: 900  },
  { name: 'laptop',     width: 1280, height: 800  },
  { name: 'tablet',     width: 820,  height: 1180 },
  { name: 'mobile',     width: 390,  height: 844  },
];

const SCENARIOS = [
  { name: 'campsite-fresh',   url: '/demo?biome=campsite&phase=fresh&team=group' },
  { name: 'campsite-midway',  url: '/demo?biome=campsite&phase=midway&team=group' },
  { name: 'campsite-done',    url: '/demo?biome=campsite&phase=done&team=group' },
  { name: 'lab-midway',       url: '/demo?biome=lab&phase=midway&team=group' },
  { name: 'workshop-midway',  url: '/demo?biome=workshop&phase=midway&team=group' },
  { name: 'cabin',            url: '/demo?biome=cabin' },
];

// CSS selectors of the interactive things we care about not overlapping.
// Each entry has a label (used in the report) and the selector.
const SELECTORS = [
  { kind: 'hotspot',  sel: 'button.hotspot' },
  { kind: 'figure',   sel: '.scene-figure' },
  { kind: 'header',   sel: '.scene-header__inner' },
  { kind: 'toolbar',  sel: '.demo-toolbar' },
];

function rectsOverlap(a, b, slack = 0) {
  return !(
    a.right - slack <= b.left ||
    b.right - slack <= a.left ||
    a.bottom - slack <= b.top ||
    b.bottom - slack <= a.top
  );
}

function intersectionArea(a, b) {
  const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return x * y;
}

async function inspectScene(page) {
  return page.evaluate((SELECTORS) => {
    const out = [];
    for (const { kind, sel } of SELECTORS) {
      const els = document.querySelectorAll(sel);
      els.forEach((el, idx) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        // For hotspots/figures, prefer the visible BUTTON box (not just a tag inside);
        // measure the visible bounds including the tag using a wrapping range.
        const role  = el.getAttribute('data-role') || el.getAttribute('data-id') || el.className;
        const tag   = el.querySelector('.hotspot__tag, .scene-figure__tag');
        const tagText = tag ? tag.textContent.trim() : null;
        out.push({
          kind,
          role,
          tagText,
          left:   r.left,   top: r.top,
          right:  r.right,  bottom: r.bottom,
          width:  r.width,  height: r.height,
        });
      });
    }
    return out;
  }, SELECTORS);
}

function findOverlaps(boxes, viewportWidth) {
  // Skip overlaps when one box COMPLETELY contains another that shares its kind,
  // since hotspot prop+tag are nested and that's by design. We only flag visible
  // collisions between SIBLING interactive elements.
  const overlaps = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      // Tolerate 4px adjacency
      if (!rectsOverlap(a, b, 4)) continue;
      // The header sits at the top of the screen; it's allowed to overlap with
      // backgrounds but nothing interactive in the scene proper.
      const area = intersectionArea(a, b);
      // Ignore tiny overlaps under 12sq px
      if (area < 12) continue;
      overlaps.push({
        a: `${a.kind}:${a.role}${a.tagText ? ` "${a.tagText}"` : ''}`,
        b: `${b.kind}:${b.role}${b.tagText ? ` "${b.tagText}"` : ''}`,
        area: Math.round(area),
        box: {
          left:   Math.max(a.left, b.left),
          top:    Math.max(a.top, b.top),
          right:  Math.min(a.right, b.right),
          bottom: Math.min(a.bottom, b.bottom),
        },
      });
    }
  }
  return overlaps;
}

async function annotateScreenshot(page, overlaps) {
  // Inject red overlay rectangles into the DOM so the next screenshot shows them.
  await page.evaluate((overlaps) => {
    const layer = document.createElement('div');
    layer.id = '__audit_overlay';
    layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999;';
    overlaps.forEach((o, i) => {
      const r = document.createElement('div');
      const w = o.box.right - o.box.left;
      const h = o.box.bottom - o.box.top;
      r.style.cssText = `position:absolute;left:${o.box.left}px;top:${o.box.top}px;width:${w}px;height:${h}px;outline:2px solid #d63a2a;background:rgba(214,58,42,0.18);box-sizing:border-box;`;
      const lbl = document.createElement('div');
      lbl.textContent = `#${i + 1}`;
      lbl.style.cssText = 'position:absolute;top:-18px;left:0;background:#d63a2a;color:white;font:700 11px monospace;padding:1px 5px;border-radius:3px;';
      r.appendChild(lbl);
      layer.appendChild(r);
    });
    document.body.appendChild(layer);
  }, overlaps);
}

const browser = await chromium.launch();
const report = [];
report.push('# Biome Overlap Audit');
report.push(`_Generated: ${new Date().toISOString()}_\n`);

let totalOverlaps = 0;

try {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
    report.push(`\n## ${vp.name} (${vp.width}×${vp.height})`);
    for (const scn of SCENARIOS) {
      const page = await ctx.newPage();
      const url = `${BASE}${scn.url}`;
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(500);
      } catch (e) {
        report.push(`\n### ${scn.name} — LOAD FAILED: ${e.message}`);
        await page.close();
        continue;
      }
      const boxes = await inspectScene(page);
      const overlaps = findOverlaps(boxes, vp.width);
      totalOverlaps += overlaps.length;

      // Plain screenshot
      const baseShot = `${OUT_DIR}/${vp.name}-${scn.name}.png`;
      await page.screenshot({ path: baseShot, fullPage: false });

      // Annotated screenshot (only if overlaps exist)
      if (overlaps.length > 0) {
        await annotateScreenshot(page, overlaps);
        const annotShot = `${OUT_DIR}/${vp.name}-${scn.name}-overlaps.png`;
        await page.screenshot({ path: annotShot, fullPage: false });
      }

      report.push(`\n### ${scn.name} — ${overlaps.length} overlap${overlaps.length === 1 ? '' : 's'}`);
      if (overlaps.length === 0) {
        report.push(`  ✓ clean`);
      } else {
        overlaps.forEach((o, i) => {
          report.push(`  ${i + 1}. **${o.a}** ↔ **${o.b}** _(area=${o.area}px²)_`);
        });
        report.push(`  - screenshot: \`${vp.name}-${scn.name}-overlaps.png\``);
      }
      await page.close();
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}

report.push(`\n---\n**Total overlaps across all viewports/scenarios: ${totalOverlaps}**`);
const reportPath = `${OUT_DIR}/REPORT.md`;
writeFileSync(reportPath, report.join('\n'));
console.log(report.join('\n'));
console.log(`\nReport written to ${reportPath}`);
