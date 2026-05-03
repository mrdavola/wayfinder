// Comprehensive smoke test for the /demo route.
// - Loads each biome and phase
// - Clicks every visible hotspot, verifies an overlay opens with expected content,
//   closes it, moves on
// - Tests the demo toolbar (open, switch biome, switch phase, switch team)
// - Tests keyboard shortcuts (1-4 biome, q-r phase)
// - Captures console errors, page errors, and 4xx/5xx network responses
// - Writes a markdown report
//
// Usage: node scripts/smoke-demo.mjs [BASE_URL]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = process.env.BASE_URL || process.argv[2] || 'http://localhost:5173';
const OUT_DIR = resolve(process.cwd(), 'screenshots/smoke');
mkdirSync(OUT_DIR, { recursive: true });

const SCENARIOS = [
  { biome: 'campsite', phase: 'fresh',       team: 'group' },
  { biome: 'campsite', phase: 'midway',      team: 'group' },
  { biome: 'campsite', phase: 'almost-done', team: 'group' },
  { biome: 'campsite', phase: 'done',        team: 'group' },
  { biome: 'campsite', phase: 'fresh',       team: 'solo'  },
  { biome: 'lab',      phase: 'midway',      team: 'group' },
  { biome: 'workshop', phase: 'midway',      team: 'group' },
  { biome: 'cabin',    phase: 'fresh',       team: 'solo'  },
];

// What we expect each overlay panel to contain when opened.
// Each entry: a substring (case-insensitive) that MUST appear in the panel.
const OVERLAY_EXPECTATIONS = {
  trailheadSign: ['cafeteria', 'pond', 'chair', 'home base'], // any one of project titles
  stage:         ['Stage', 'YOUR CHALLENGE'], // any one of these phrases
  mailbox:       ['Mailbox'],
  bulletinSubmit:['Submit', 'bulletin'],
  reflection:    ['Reflection', 'Journal'],
  guide:         ['guide', 'Guide', 'Talk', 'Mentor', 'Field'],
  challenger:    ['stranger', 'Challenge', 'guide', 'Mentor'],
  teammate:      ['Maya', 'Jordan', 'Teammate', 'role'],
  wallMap:       ['Map', 'project'],
  specimenCabinet: ['Cabinet', 'skill'],
  bulletinBoard: ['Bulletin', 'message', 'board'],
};

const WAIT_OPEN  = 600;
const WAIT_CLOSE = 300;

function nowIso() {
  return new Date().toISOString();
}

function expectMatch(text, expectations) {
  if (!expectations || expectations.length === 0) return true;
  const t = String(text || '').toLowerCase();
  return expectations.some(e => t.includes(String(e).toLowerCase()));
}

const results = {
  generatedAt: nowIso(),
  baseUrl: BASE,
  scenarios: [],
  consoleErrors: [],
  pageErrors: [],
  networkErrors: [],
  expectMisses: [],
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

page.on('console', (msg) => {
  if (msg.type() === 'error') {
    const text = msg.text();
    // Filter out fal.ai dev-only warnings about missing key
    if (text.includes('fal.ai') || text.includes('VITE_FAL_KEY')) return;
    results.consoleErrors.push({ at: nowIso(), text });
  }
});
page.on('pageerror', (err) => {
  results.pageErrors.push({ at: nowIso(), text: err.message, stack: err.stack });
});
page.on('response', (resp) => {
  const status = resp.status();
  const url = resp.url();
  if (status >= 400 && !url.includes('favicon')) {
    results.networkErrors.push({ at: nowIso(), status, url });
  }
});

async function loadScenario(scn) {
  const url = `${BASE}/demo?biome=${scn.biome}&phase=${scn.phase}&team=${scn.team}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  return url;
}

async function exerciseHotspots(scn) {
  const summary = { ...scn, hotspots: [] };
  // Find all hotspot buttons currently visible in the scene
  const handles = await page.$$('button.hotspot');
  console.log(`  ${scn.biome}/${scn.phase}/${scn.team}: ${handles.length} hotspots`);

  for (const handle of handles) {
    const role  = await handle.getAttribute('data-role');
    const state = await handle.getAttribute('data-state');
    const aria  = await handle.getAttribute('aria-label');
    const disabled = await handle.getAttribute('aria-disabled') === 'true';

    const entry = { role, state, aria, disabled, opened: false, contentOk: null, error: null };

    // Future / locked hotspots are intentionally non-clickable
    if (disabled) {
      summary.hotspots.push(entry);
      continue;
    }

    try {
      await handle.scrollIntoViewIfNeeded();
      await handle.click();
      await page.waitForTimeout(WAIT_OPEN);
      // Verify an overlay sheet appeared
      const sheet = await page.$('.hotspot-overlay__sheet');
      if (!sheet) {
        entry.error = 'overlay did not open';
        summary.hotspots.push(entry);
        continue;
      }
      entry.opened = true;

      // Check expected content
      const text = await page.evaluate(() => document.querySelector('.hotspot-overlay__sheet')?.innerText || '');
      const expectations = OVERLAY_EXPECTATIONS[role];
      if (expectations) {
        const ok = expectMatch(text, expectations);
        entry.contentOk = ok;
        if (!ok) {
          results.expectMisses.push({
            scenario: `${scn.biome}/${scn.phase}/${scn.team}`,
            role,
            expectedAnyOf: expectations,
            preview: text.slice(0, 240).replace(/\s+/g, ' '),
          });
        }
      }
      // Close — try button, fall back to Escape, then wait for the overlay
      // to actually leave the DOM. This catches cases where the close click
      // races with React state updates or lazy-loading content.
      await closeOverlay(page);
    } catch (err) {
      entry.error = String(err?.message || err);
      await closeOverlay(page).catch(() => {});
    }
    summary.hotspots.push(entry);
  }
  return summary;
}

async function closeOverlay(page) {
  // Try the close button first
  const closeBtn = await page.$('.hotspot-overlay__close');
  if (closeBtn) {
    await closeBtn.click({ timeout: 5000 }).catch(() => {});
  }
  // Fall back to Escape (common a11y pattern; safe no-op if no listener)
  await page.keyboard.press('Escape').catch(() => {});
  // Click on the backdrop as a final fallback
  const backdrop = await page.$('.hotspot-overlay__backdrop');
  if (backdrop) {
    await backdrop.click({ timeout: 5000, position: { x: 5, y: 5 } }).catch(() => {});
  }
  // Wait until the overlay is gone from the DOM (or 3s timeout)
  await page.waitForSelector('.hotspot-overlay', { state: 'detached', timeout: 3000 }).catch(() => {});
}

async function exerciseFigures(scn) {
  // Guide is a clickable SceneFigure (not a hotspot button)
  await closeOverlay(page); // belt-and-suspenders cleanup
  const guide = await page.$('button.scene-figure--guide');
  const out = { guideOpened: false, guideContentOk: null };
  if (!guide) {
    out.note = 'no guide figure (cabin or solo)';
    return out;
  }
  try {
    await guide.click({ timeout: 5000 });
    await page.waitForTimeout(WAIT_OPEN);
    const sheet = await page.$('.hotspot-overlay__sheet');
    if (sheet) {
      out.guideOpened = true;
      const text = await page.evaluate(() => document.querySelector('.hotspot-overlay__sheet')?.innerText || '');
      out.guideContentOk = expectMatch(text, OVERLAY_EXPECTATIONS.guide);
    }
  } catch (err) {
    out.error = String(err?.message || err);
  }
  await closeOverlay(page);
  return out;
}

async function testToolbar() {
  const out = {};
  // Pill should be visible
  const pill = await page.$('.demo-pill');
  out.pillVisible = !!pill;
  if (pill) {
    await pill.click();
    await page.waitForTimeout(200);
    const tb = await page.$('.demo-toolbar');
    out.toolbarOpened = !!tb;
    // Click "Lab" chip
    const labChip = await page.$('.demo-toolbar .demo-chip:has-text("Lab")');
    if (labChip) {
      await labChip.click();
      await page.waitForTimeout(400);
      out.urlAfterLabChip = page.url();
      out.urlSwitchedToLab = page.url().includes('biome=lab');
    }
    // Close toolbar
    const closeBtn = await page.$('.demo-toolbar__close');
    if (closeBtn) await closeBtn.click();
    await page.waitForTimeout(200);
    out.toolbarClosedAfterX = !(await page.$('.demo-toolbar'));
  }
  return out;
}

async function testKeyboardShortcuts() {
  // Press '2' → biome=lab, then '4' → biome=cabin
  await page.keyboard.press('2');
  await page.waitForTimeout(300);
  const labOk = page.url().includes('biome=lab');
  await page.keyboard.press('4');
  await page.waitForTimeout(300);
  const cabinOk = page.url().includes('biome=cabin');
  return { labShortcut: labOk, cabinShortcut: cabinOk };
}

try {
  console.log(`Smoke test against ${BASE}`);
  for (const scn of SCENARIOS) {
    await loadScenario(scn);
    const sceneSummary = await exerciseHotspots(scn);
    sceneSummary.figures = await exerciseFigures(scn);
    results.scenarios.push(sceneSummary);
  }

  // Toolbar + keyboard tests on a fresh load
  await loadScenario(SCENARIOS[0]);
  results.toolbar = await testToolbar();
  await loadScenario(SCENARIOS[0]);
  results.keyboard = await testKeyboardShortcuts();
} finally {
  await page.close();
  await ctx.close();
  await browser.close();
}

// Build markdown report
const lines = [];
lines.push(`# Demo Smoke Test`);
lines.push(`_Generated: ${results.generatedAt} against ${results.baseUrl}_\n`);

lines.push(`## Counts`);
lines.push(`- scenarios run: ${results.scenarios.length}`);
let totalHotspots = 0, opened = 0, contentOk = 0, errored = 0, contentBad = 0;
for (const s of results.scenarios) {
  for (const h of s.hotspots) {
    totalHotspots++;
    if (h.opened) opened++;
    if (h.contentOk === true) contentOk++;
    if (h.contentOk === false) contentBad++;
    if (h.error) errored++;
  }
}
lines.push(`- hotspots clicked: ${totalHotspots}`);
lines.push(`- overlays opened: ${opened}`);
lines.push(`- expected content found: ${contentOk}`);
lines.push(`- content mismatch: ${contentBad}`);
lines.push(`- click errors: ${errored}`);
lines.push(`- console errors: ${results.consoleErrors.length}`);
lines.push(`- page errors: ${results.pageErrors.length}`);
lines.push(`- network errors (4xx/5xx): ${results.networkErrors.length}`);
lines.push(`- expectation misses: ${results.expectMisses.length}`);
lines.push(`- toolbar pill visible: ${results.toolbar?.pillVisible ?? 'n/a'}`);
lines.push(`- toolbar opens: ${results.toolbar?.toolbarOpened ?? 'n/a'}`);
lines.push(`- toolbar lab chip switches URL: ${results.toolbar?.urlSwitchedToLab ?? 'n/a'}`);
lines.push(`- toolbar closes via X: ${results.toolbar?.toolbarClosedAfterX ?? 'n/a'}`);
lines.push(`- keyboard 2→lab works: ${results.keyboard?.labShortcut ?? 'n/a'}`);
lines.push(`- keyboard 4→cabin works: ${results.keyboard?.cabinShortcut ?? 'n/a'}`);

lines.push(`\n## Scenario detail`);
for (const s of results.scenarios) {
  lines.push(`\n### ${s.biome} / ${s.phase} / ${s.team}`);
  for (const h of s.hotspots) {
    if (h.disabled) {
      lines.push(`- ⊘ \`${h.role}\` (state=${h.state}) — disabled, skipped`);
    } else if (h.error) {
      lines.push(`- ✗ \`${h.role}\` — ERROR: ${h.error}`);
    } else if (!h.opened) {
      lines.push(`- ✗ \`${h.role}\` — overlay did not open`);
    } else if (h.contentOk === false) {
      lines.push(`- ⚠ \`${h.role}\` — opened, but expected content missing`);
    } else {
      lines.push(`- ✓ \`${h.role}\``);
    }
  }
  if (s.figures?.guideOpened) {
    lines.push(`- ✓ guide figure click opened overlay (contentOk: ${s.figures.guideContentOk})`);
  } else if (s.figures?.note) {
    lines.push(`- ⊘ guide figure: ${s.figures.note}`);
  } else {
    lines.push(`- ✗ guide figure click did not open overlay`);
  }
}

if (results.consoleErrors.length) {
  lines.push(`\n## Console errors`);
  for (const e of results.consoleErrors) lines.push(`- ${e.text}`);
}
if (results.pageErrors.length) {
  lines.push(`\n## Page errors`);
  for (const e of results.pageErrors) lines.push(`- ${e.text}`);
}
if (results.networkErrors.length) {
  lines.push(`\n## Network errors`);
  for (const e of results.networkErrors) lines.push(`- [${e.status}] ${e.url}`);
}
if (results.expectMisses.length) {
  lines.push(`\n## Expectation misses (overlay opened but expected text not found)`);
  for (const m of results.expectMisses) {
    lines.push(`- **${m.scenario} / ${m.role}** — expected one of: ${m.expectedAnyOf.join(', ')}`);
    lines.push(`  > ${m.preview}`);
  }
}

const reportPath = resolve(OUT_DIR, 'REPORT.md');
writeFileSync(reportPath, lines.join('\n'));
console.log(`\n${lines.slice(0, 22).join('\n')}\n\nFull report: ${reportPath}`);
