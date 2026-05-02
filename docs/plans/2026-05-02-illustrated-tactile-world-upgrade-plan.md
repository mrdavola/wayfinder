# Illustrated + Tactile World — Phase 0 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Design doc:** [`docs/plans/2026-05-02-illustrated-tactile-world-upgrade-design.md`](./2026-05-02-illustrated-tactile-world-upgrade-design.md)

**Goal (this plan):** Lay the foundation for the illustrated/tactile learner world — primitives, schema, migrations, accessibility flags — so Phase 1 (Campsite end-to-end) can be implemented without architectural rework.

**Architecture:** Add three React primitives (`<Specimen>`, `<ParallaxScene>`, `<Hotspot>`), a `BiomeConfig` data shape, a `<WorldStateProvider>` context, two Supabase migrations, a `?view=list` query-flag fallback, and a `STYLE_PREFIX_V1` constant. No biome SVGs, no 3D, no AI image-gen — those land in Phases 1–3. By the end of Phase 0, a placeholder biome with three solid-color rectangles and three hotspots renders end-to-end and the list-view fallback is at parity with today's `StudentQuestPage`.

**Tech Stack:** React 19, Vite 7, plain JSX (no TypeScript — JSDoc for types), Supabase, Framer Motion (new), Vitest + @testing-library/react (new — installed in Task 1).

**Out of scope (this plan):** Biome SVGs, 3D props, AI image-gen, Field Station hub, replacing `WorldRenderer`/`CampHub`. Those land in Phases 1–6 — re-plan when ready.

**Total estimate:** ~1–2 weeks of focused work, ~30 commits.

---

## Pre-flight notes

**No test framework installed today.** The existing project has no Vitest/Jest/Playwright setup. Task 1 installs Vitest + @testing-library/react + jsdom and writes a smoke test. **All subsequent tasks assume Vitest is available.**

**Pragmatic TDD policy for this plan:**
- **Strict TDD** (write failing test → implement → green) for: logic modules (`jitter.js`, biome config validator, query-flag router, reduced-motion detection).
- **Smoke-render TDD** (`render(...)` doesn't throw, key DOM landmarks exist) for: the three React primitives. Pixel-perfect visual tests are out of scope; manual browser verification covers the look.
- **Acceptance gates** (manual + automated) for: migrations, route changes, list-view parity. Documented per task.

**Repo conventions to respect (don't fight):**
- JSX, not TSX. Plain JS modules with JSDoc.
- CSS variables in `src/index.css`, no Tailwind, no CSS-in-JS library.
- Migrations in `supabase/migrations/NNN_short_name.sql`, BEGIN/COMMIT block, `-- ===` header.
- Imports use `@/` path? Check `vite.config.js` — currently no alias; use relative imports.
- `lucide-react` for icons (already used everywhere).

**Worktree decision:** The brainstorming skill recommended a dedicated worktree. The user opted to plan without one. **Recommendation: create a worktree before Task 1** so 12 weeks of foundation work doesn't pollute `main` mid-flight. See Task 0.

**Auth/route protection:** Existing `<ProtectedRoute>` wraps everything in `App.jsx`. Don't break it.

---

## Task 0: Create worktree (optional but recommended)

**Files:** none (git operation)

**Step 1: Create worktree on a new branch.**

```bash
cd "/Users/md/Quest Lab/quest-lab"
git worktree add ../quest-lab-world-upgrade -b feature/illustrated-world
```

**Step 2: Switch into it for the rest of Phase 0.**

```bash
cd "../quest-lab-world-upgrade"
```

**Step 3: Confirm clean state.**

Run: `git status`
Expected: `On branch feature/illustrated-world` and `nothing to commit, working tree clean`.

**Step 4: Verify dev server still runs.**

Run: `npm install && npm run dev`
Expected: Vite serves on a port (3001 default per CLAUDE.md). Open browser, verify Diagonally landing page loads.

(No commit yet — Task 1 makes the first.)

---

## Task 1: Install + configure Vitest

**Files:**
- Create: `vitest.config.js`
- Create: `src/test/setup.js`
- Create: `src/test/smoke.test.js`
- Modify: `package.json` (add `test` script + dev deps)

**Step 1: Install test deps.**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Expected: 5 packages added to `devDependencies`.

**Step 2: Add `test` script to `package.json`.**

Find `"scripts"` block, add:
```json
"test": "vitest",
"test:run": "vitest run"
```

**Step 3: Create `vitest.config.js`.**

```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  },
});
```

**Step 4: Create `src/test/setup.js`.**

```js
import '@testing-library/jest-dom/vitest';
```

**Step 5: Write smoke test at `src/test/smoke.test.js`.**

```js
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('vitest smoke', () => {
  it('renders a div', () => {
    render(<div data-testid="hi">hello</div>);
    expect(screen.getByTestId('hi')).toHaveTextContent('hello');
  });
});
```

**Step 6: Run smoke test.**

Run: `npm run test:run`
Expected: 1 passed, 0 failed. If JSX in `.test.js` fails, rename to `.test.jsx` and update; modern Vite/Vitest with the React plugin supports either.

**Step 7: Commit.**

```bash
git add vitest.config.js src/test/setup.js src/test/smoke.test.js package.json package-lock.json
git commit -m "chore(test): add Vitest + Testing Library + jsdom smoke test"
```

---

## Task 2: Install Framer Motion

**Files:**
- Modify: `package.json`

**Step 1: Install.**

```bash
npm install framer-motion
```

**Step 2: Verify import works.**

Add a temporary line at top of `src/App.jsx`:
```js
import { motion as _smokeMotion } from 'framer-motion';
console.log('framer-motion loaded:', typeof _smokeMotion);
```

Run: `npm run dev`, open browser console.
Expected: `framer-motion loaded: object`.

**Step 3: Remove the smoke import.**

**Step 4: Commit.**

```bash
git add package.json package-lock.json
git commit -m "chore: add framer-motion for parallax + camera animations"
```

---

## Task 3: Migration 056 — biome assignment columns

**Files:**
- Create: `supabase/migrations/056_biome_assignment.sql`

**Step 1: Write the migration.**

```sql
-- ============================================================
-- 056: add biome_id + character_image_url to quests
-- ============================================================
-- The illustrated/tactile world upgrade renders each quest inside a
-- biome (campsite | lab | workshop) chosen at QuestBuilder publish
-- time, and shows a per-project AI-generated character portrait at
-- the firepit/lab-partner/mentor hotspot.
--
-- Both columns are nullable on existing rows. Quests without a
-- biome_id fall back to the suggester at render time. Quests
-- without a character_image_url fall back to <FieldFigure>.

BEGIN;

ALTER TABLE quests
  ADD COLUMN IF NOT EXISTS biome_id TEXT
    CHECK (biome_id IS NULL OR biome_id IN ('campsite', 'lab', 'workshop')),
  ADD COLUMN IF NOT EXISTS character_image_url TEXT;

COMMENT ON COLUMN quests.biome_id IS
  'Hand-illustrated world the learner enters for this quest. Null = suggest at render time.';
COMMENT ON COLUMN quests.character_image_url IS
  'AI-generated character portrait (firepit friend / lab partner / workshop mentor). Null = fall back to procedural FieldFigure.';

COMMIT;
```

**Step 2: Apply locally (if Supabase CLI is set up) OR record for manual run.**

If the project uses `supabase db push`:
```bash
supabase db push
```
Otherwise: paste into the Supabase dashboard SQL editor and run. Document the date and environment in the project notes.

**Step 3: Verify schema.**

Run a quick query (Supabase SQL editor):
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'quests'
  AND column_name IN ('biome_id', 'character_image_url');
```
Expected: 2 rows, both `is_nullable = YES`.

**Step 4: Commit.**

```bash
git add supabase/migrations/056_biome_assignment.sql
git commit -m "feat(db): migration 056 — add biome_id + character_image_url to quests"
```

---

## Task 4: Migration 057 — quest_decor table

**Files:**
- Create: `supabase/migrations/057_quest_decor.sql`

**Step 1: Write the migration.**

```sql
-- ============================================================
-- 057: quest_decor — AI-generated decorative content per quest
-- ============================================================
-- Each quest has up to ~6 decorative slots (notes pinned to the
-- bulletin, posters on the lab wall, labels on jars). Slots are
-- generated at QuestBuilder publish time using a versioned style
-- prefix; results are cached here so we don't pay generation cost
-- per render or per learner view.
--
-- One row per (quest_id, slot). slot is a free-form short string
-- defined by the biome config (e.g. 'bulletin_note_1', 'wall_poster').

BEGIN;

CREATE TABLE IF NOT EXISTS quest_decor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  slot TEXT NOT NULL,
  image_url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  style_prefix_version TEXT NOT NULL DEFAULT 'v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (quest_id, slot)
);

CREATE INDEX IF NOT EXISTS idx_quest_decor_quest_id ON quest_decor (quest_id);

ALTER TABLE quest_decor ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated users can read decor for any quest they can
-- already see (we rely on the existing quests RLS to gate visibility).
CREATE POLICY quest_decor_read
  ON quest_decor FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quests q
      WHERE q.id = quest_decor.quest_id
    )
  );

-- Inserts go through service role (server-side at QuestBuilder publish).
-- No INSERT/UPDATE/DELETE policy for authenticated => locked down.

COMMENT ON TABLE quest_decor IS
  'AI-generated decorative images per quest, cached at publish time. One row per (quest_id, slot).';

COMMIT;
```

**Step 2: Apply + verify.**

Apply (same method as Task 3). Verify:
```sql
SELECT COUNT(*) FROM quest_decor;     -- 0
SELECT relrowsecurity FROM pg_class WHERE relname = 'quest_decor';  -- t
```

**Step 3: Commit.**

```bash
git add supabase/migrations/057_quest_decor.sql
git commit -m "feat(db): migration 057 — quest_decor table for AI-gen decorative images"
```

---

## Task 5: Seeded-jitter helper (TDD)

**Files:**
- Create: `src/lib/jitter.js`
- Create: `src/lib/jitter.test.js`

**Step 1: Write failing test.**

```js
// src/lib/jitter.test.js
import { describe, it, expect } from 'vitest';
import { seededJitterDeg } from './jitter';

describe('seededJitterDeg', () => {
  it('returns a number between -maxDeg and +maxDeg', () => {
    for (let i = 0; i < 50; i++) {
      const v = seededJitterDeg(`id-${i}`, 1);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic for the same input', () => {
    expect(seededJitterDeg('abc', 1)).toBe(seededJitterDeg('abc', 1));
  });

  it('returns different values for different ids', () => {
    const a = seededJitterDeg('id-a', 1);
    const b = seededJitterDeg('id-b', 1);
    expect(a).not.toBe(b);
  });

  it('respects maxDeg', () => {
    expect(Math.abs(seededJitterDeg('x', 0.5))).toBeLessThanOrEqual(0.5);
    expect(Math.abs(seededJitterDeg('x', 2))).toBeLessThanOrEqual(2);
  });

  it('returns 0 for empty id', () => {
    expect(seededJitterDeg('', 1)).toBe(0);
  });
});
```

**Step 2: Run test — confirm it fails.**

Run: `npx vitest run src/lib/jitter.test.js`
Expected: 5 failed (module not found / function undefined).

**Step 3: Implement.**

```js
// src/lib/jitter.js
// Deterministic per-id jitter rotation (degrees) for hand-placed-on-paper feel.
// Uses a small FNV-1a hash on the id and maps to [-maxDeg, +maxDeg].

/**
 * @param {string} id stable identifier (e.g. specimen id, hotspot id)
 * @param {number} maxDeg maximum absolute degrees of rotation
 * @returns {number} degrees in [-maxDeg, +maxDeg]
 */
export function seededJitterDeg(id, maxDeg = 1) {
  if (!id) return 0;
  // FNV-1a 32-bit
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // Normalise to [0, 1)
  const norm = ((hash >>> 0) % 10000) / 10000;
  // Map to [-maxDeg, +maxDeg]
  return (norm * 2 - 1) * maxDeg;
}
```

**Step 4: Run test — confirm pass.**

Run: `npx vitest run src/lib/jitter.test.js`
Expected: 5 passed.

**Step 5: Commit.**

```bash
git add src/lib/jitter.js src/lib/jitter.test.js
git commit -m "feat(world): seeded jitter helper with deterministic per-id rotation"
```

---

## Task 6: `<Specimen>` primitive (smoke-render TDD)

**Files:**
- Create: `src/components/world/Specimen.jsx`
- Create: `src/components/world/Specimen.test.jsx`
- Create: `src/components/world/Specimen.css`

**Step 1: Write smoke-render test.**

```jsx
// src/components/world/Specimen.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Specimen from './Specimen';

describe('<Specimen>', () => {
  it('renders children', () => {
    render(<Specimen id="t1">hello</Specimen>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('applies seeded jitter rotation as CSS variable', () => {
    const { container } = render(<Specimen id="t1">x</Specimen>);
    const root = container.firstChild;
    expect(root).toHaveAttribute('style', expect.stringMatching(/--specimen-jitter:\s*-?\d+(\.\d+)?deg/));
  });

  it('does not jitter when id is missing', () => {
    const { container } = render(<Specimen>x</Specimen>);
    const root = container.firstChild;
    expect(root.style.getPropertyValue('--specimen-jitter')).toBe('0deg');
  });

  it('exposes data-pin attribute when pin prop set', () => {
    const { container } = render(<Specimen id="t1" pin="tape">x</Specimen>);
    expect(container.firstChild).toHaveAttribute('data-pin', 'tape');
  });

  it('supports size variants', () => {
    const { container } = render(<Specimen id="t1" size="lg">x</Specimen>);
    expect(container.firstChild).toHaveAttribute('data-size', 'lg');
  });
});
```

**Step 2: Run — confirm fails.**

Run: `npx vitest run src/components/world/Specimen.test.jsx`
Expected: 5 failed (module not found).

**Step 3: Implement.**

```jsx
// src/components/world/Specimen.jsx
import './Specimen.css';
import { seededJitterDeg } from '../../lib/jitter';

/**
 * Field-journal "specimen" primitive — paper card with deckled edge, soft drop
 * shadow, optional pin/tape, deterministic 1° jitter from the id.
 *
 * @param {object} props
 * @param {string} [props.id]      stable id, drives jitter
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {'none'|'pin'|'tape'|'clip'} [props.pin='none']
 * @param {number} [props.maxJitterDeg=1]
 * @param {string} [props.className]
 * @param {React.CSSProperties} [props.style]
 * @param {React.ReactNode} props.children
 */
export default function Specimen({
  id,
  size = 'md',
  pin = 'none',
  maxJitterDeg = 1,
  className = '',
  style,
  children,
  ...rest
}) {
  const jitter = id ? seededJitterDeg(id, maxJitterDeg) : 0;
  return (
    <div
      className={`specimen ${className}`}
      data-size={size}
      data-pin={pin === 'none' ? undefined : pin}
      style={{
        '--specimen-jitter': `${jitter}deg`,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
```

**Step 4: Implement CSS.**

```css
/* src/components/world/Specimen.css */
.specimen {
  --specimen-jitter: 0deg;
  position: relative;
  display: inline-block;
  background: var(--paper, #fbf6e7);
  border: 1px solid var(--graphite, #4a3f33);
  border-radius: 2px;
  padding: 14px 16px;
  box-shadow:
    0 1px 0 rgba(0, 0, 0, 0.06),
    0 6px 14px rgba(43, 30, 22, 0.10);
  transform: rotate(var(--specimen-jitter));
  transition: transform 200ms ease-out;
}

.specimen[data-size='sm'] { padding: 8px 10px; font-size: 13px; }
.specimen[data-size='md'] { padding: 14px 16px; font-size: 15px; }
.specimen[data-size='lg'] { padding: 22px 26px; font-size: 17px; }

/* Pin / tape / clip motifs as ::before pseudo-elements, sized by data-pin. */
.specimen[data-pin='pin']::before  { content: ''; position: absolute; top: -6px; left: 50%; width: 10px; height: 10px; border-radius: 50%; background: var(--specimen-red, #b8443a); transform: translateX(-50%); box-shadow: 0 1px 2px rgba(0,0,0,.3); }
.specimen[data-pin='tape']::before { content: ''; position: absolute; top: -10px; left: 50%; width: 60px; height: 18px; background: rgba(255, 240, 180, .55); transform: translateX(-50%) rotate(-2deg); box-shadow: 0 1px 1px rgba(0,0,0,.05); }
.specimen[data-pin='clip']::before { content: ''; position: absolute; top: -14px; left: 50%; width: 32px; height: 22px; border: 2px solid var(--graphite, #4a3f33); border-radius: 4px 4px 0 0; transform: translateX(-50%); }

@media (prefers-reduced-motion: reduce) {
  .specimen { transform: none; transition: none; }
}
```

**Step 5: Run — confirm pass.**

Run: `npx vitest run src/components/world/Specimen.test.jsx`
Expected: 5 passed.

**Step 6: Manual verify in dev server.**

Add temporary import in `src/App.jsx`:
```jsx
import Specimen from './components/world/Specimen';
// inside the JSX of LandingPage or any visible page, briefly:
<Specimen id="demo" pin="pin">Hello, world.</Specimen>
```
Run: `npm run dev`. Open browser. Verify card renders with subtle jitter and red pin. Then remove the temp code.

**Step 7: Commit.**

```bash
git add src/components/world/Specimen.jsx src/components/world/Specimen.css src/components/world/Specimen.test.jsx
git commit -m "feat(world): <Specimen> primitive — paper card, jitter, pin/tape/clip"
```

---

## Task 7: BiomeConfig schema + validator (TDD)

**Files:**
- Create: `src/biomes/types.js` (JSDoc typedefs only)
- Create: `src/biomes/validate.js`
- Create: `src/biomes/validate.test.js`

**Step 1: Write failing test.**

```js
// src/biomes/validate.test.js
import { describe, it, expect } from 'vitest';
import { validateBiomeConfig } from './validate';

const valid = {
  id: 'campsite',
  layers: { back: 'back.svg', mid: 'mid.svg', fore: 'fore.svg' },
  ambient: ['lanternFlicker'],
  hotspots: [
    { role: 'guide', x: '50%', y: '70%' },
    { role: 'stage', x: '34%', y: '58%', stageIndex: 0 },
  ],
};

describe('validateBiomeConfig', () => {
  it('accepts a valid config', () => {
    const r = validateBiomeConfig(valid);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('rejects missing id', () => {
    const r = validateBiomeConfig({ ...valid, id: undefined });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/id/);
  });

  it('rejects missing layer', () => {
    const r = validateBiomeConfig({ ...valid, layers: { back: 'b.svg', mid: 'm.svg' } });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/fore/);
  });

  it('rejects hotspot without role', () => {
    const r = validateBiomeConfig({
      ...valid,
      hotspots: [{ x: '50%', y: '70%' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/role/);
  });

  it('rejects stage hotspot without stageIndex', () => {
    const r = validateBiomeConfig({
      ...valid,
      hotspots: [{ role: 'stage', x: '50%', y: '70%' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/stageIndex/);
  });

  it('rejects invalid x/y format', () => {
    const r = validateBiomeConfig({
      ...valid,
      hotspots: [{ role: 'guide', x: 50, y: '70%' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/x/);
  });
});
```

**Step 2: Run — confirm fails.**

Run: `npx vitest run src/biomes/validate.test.js`
Expected: 6 failed.

**Step 3: Implement types (JSDoc only — no runtime).**

```js
// src/biomes/types.js
/**
 * @typedef {'campsite'|'lab'|'workshop'} BiomeId
 *
 * @typedef {Object} BiomeLayers
 * @property {string} back
 * @property {string} mid
 * @property {string} fore
 *
 * @typedef {'trailheadSign'|'stage'|'guide'|'bulletinSubmit'|'mailbox'|'challenger'|'reflection'|'stretch'|'teammate'|'parentLetter'} HotspotRole
 *
 * @typedef {Object} HotspotConfig
 * @property {HotspotRole} role
 * @property {string} x  CSS percentage e.g. '50%'
 * @property {string} y
 * @property {number} [stageIndex]      required when role === 'stage'
 * @property {string} [tactile]         GLB filename (Phase 3)
 *
 * @typedef {Object} BiomeConfig
 * @property {BiomeId} id
 * @property {BiomeLayers} layers
 * @property {string[]} ambient         ambient-motion preset ids
 * @property {HotspotConfig[]} hotspots
 */
export {};
```

**Step 4: Implement validator.**

```js
// src/biomes/validate.js
const VALID_BIOME_IDS = new Set(['campsite', 'lab', 'workshop']);
const VALID_ROLES = new Set([
  'trailheadSign', 'stage', 'guide', 'bulletinSubmit', 'mailbox',
  'challenger', 'reflection', 'stretch', 'teammate', 'parentLetter',
]);
const PCT = /^\d+(\.\d+)?%$/;

export function validateBiomeConfig(cfg) {
  const errors = [];
  if (!cfg || typeof cfg !== 'object') {
    return { ok: false, errors: ['config must be an object'] };
  }
  if (!cfg.id || !VALID_BIOME_IDS.has(cfg.id)) {
    errors.push(`id must be one of ${[...VALID_BIOME_IDS].join(',')}`);
  }
  if (!cfg.layers || !cfg.layers.back || !cfg.layers.mid || !cfg.layers.fore) {
    errors.push('layers.back, layers.mid, layers.fore are all required');
  }
  if (!Array.isArray(cfg.ambient)) {
    errors.push('ambient must be an array of preset ids');
  }
  if (!Array.isArray(cfg.hotspots) || cfg.hotspots.length === 0) {
    errors.push('hotspots must be a non-empty array');
  } else {
    cfg.hotspots.forEach((h, i) => {
      if (!h.role || !VALID_ROLES.has(h.role)) errors.push(`hotspots[${i}].role invalid`);
      if (typeof h.x !== 'string' || !PCT.test(h.x)) errors.push(`hotspots[${i}].x must be a percentage string`);
      if (typeof h.y !== 'string' || !PCT.test(h.y)) errors.push(`hotspots[${i}].y must be a percentage string`);
      if (h.role === 'stage' && typeof h.stageIndex !== 'number') {
        errors.push(`hotspots[${i}].stageIndex required when role='stage'`);
      }
    });
  }
  return { ok: errors.length === 0, errors };
}
```

**Step 5: Run — confirm pass.**

Run: `npx vitest run src/biomes/validate.test.js`
Expected: 6 passed.

**Step 6: Commit.**

```bash
git add src/biomes/types.js src/biomes/validate.js src/biomes/validate.test.js
git commit -m "feat(world): BiomeConfig schema + runtime validator with JSDoc types"
```

---

## Task 8: Placeholder campsite biome config

**Files:**
- Create: `src/biomes/campsite/index.js`
- Create: `src/biomes/index.js`
- Create: `src/biomes/index.test.js`

**Step 1: Write failing test for the registry.**

```js
// src/biomes/index.test.js
import { describe, it, expect } from 'vitest';
import { getBiome, listBiomes } from './index';
import { validateBiomeConfig } from './validate';

describe('biomes registry', () => {
  it('lists at least the campsite biome', () => {
    const ids = listBiomes();
    expect(ids).toContain('campsite');
  });

  it('returns a valid config for campsite', () => {
    const cfg = getBiome('campsite');
    expect(cfg).toBeDefined();
    const r = validateBiomeConfig(cfg);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('returns undefined for unknown biome', () => {
    expect(getBiome('mars')).toBeUndefined();
  });
});
```

**Step 2: Run — confirm fails.**

Run: `npx vitest run src/biomes/index.test.js`
Expected: 3 failed.

**Step 3: Implement minimal placeholder campsite config (no SVGs yet — paths are placeholders).**

```js
// src/biomes/campsite/index.js
/** @type {import('../types').BiomeConfig} */
export const campsite = {
  id: 'campsite',
  layers: {
    back: '/biomes/campsite/back.svg',  // not yet created — Phase 1 deliverable
    mid:  '/biomes/campsite/mid.svg',
    fore: '/biomes/campsite/fore.svg',
  },
  ambient: ['lanternFlicker', 'mothFlutter'],
  hotspots: [
    { role: 'trailheadSign',  x: '12%', y: '62%' },
    { role: 'stage',          x: '34%', y: '58%', stageIndex: 0 },
    { role: 'stage',          x: '52%', y: '54%', stageIndex: 1 },
    { role: 'stage',          x: '68%', y: '50%', stageIndex: 2 },
    { role: 'guide',          x: '46%', y: '72%' },
    { role: 'bulletinSubmit', x: '78%', y: '46%' },
    { role: 'mailbox',        x: '88%', y: '64%' },
    { role: 'reflection',     x: '40%', y: '76%' },
    { role: 'challenger',     x: '20%', y: '70%' },
  ],
};
```

**Step 4: Implement registry.**

```js
// src/biomes/index.js
import { campsite } from './campsite/index.js';

const REGISTRY = { campsite };

export function listBiomes() { return Object.keys(REGISTRY); }
export function getBiome(id) { return REGISTRY[id]; }
```

**Step 5: Run — confirm pass.**

Run: `npx vitest run src/biomes/index.test.js`
Expected: 3 passed.

**Step 6: Commit.**

```bash
git add src/biomes/campsite/index.js src/biomes/index.js src/biomes/index.test.js
git commit -m "feat(world): placeholder campsite biome config + registry"
```

---

## Task 9: `<WorldStateProvider>` context

**Files:**
- Create: `src/components/world/WorldStateContext.jsx`
- Create: `src/components/world/WorldStateContext.test.jsx`

**Step 1: Write failing test.**

```jsx
// src/components/world/WorldStateContext.test.jsx
import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import { WorldStateProvider, useWorldState } from './WorldStateContext';

function Probe({ onState }) {
  const s = useWorldState();
  onState(s);
  return null;
}

describe('<WorldStateProvider>', () => {
  it('provides default world state', () => {
    let captured;
    render(
      <WorldStateProvider>
        <Probe onState={(s) => (captured = s)} />
      </WorldStateProvider>
    );
    expect(captured.zoomedHotspot).toBeNull();
    expect(captured.calmMode).toBe(false);
  });

  it('zoomTo / zoomOut updates active hotspot', () => {
    let captured;
    render(
      <WorldStateProvider>
        <Probe onState={(s) => (captured = s)} />
      </WorldStateProvider>
    );
    act(() => captured.zoomTo('hotspot-1'));
    expect(captured.zoomedHotspot).toBe('hotspot-1');
    act(() => captured.zoomOut());
    expect(captured.zoomedHotspot).toBeNull();
  });

  it('toggleCalmMode flips calmMode', () => {
    let captured;
    render(
      <WorldStateProvider>
        <Probe onState={(s) => (captured = s)} />
      </WorldStateProvider>
    );
    act(() => captured.toggleCalmMode());
    expect(captured.calmMode).toBe(true);
  });
});
```

**Step 2: Run — confirm fails.**

Run: `npx vitest run src/components/world/WorldStateContext.test.jsx`
Expected: 3 failed.

**Step 3: Implement.**

```jsx
// src/components/world/WorldStateContext.jsx
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const WorldStateCtx = createContext(null);

/** @returns {{
 *   zoomedHotspot: string | null,
 *   zoomTo: (id: string) => void,
 *   zoomOut: () => void,
 *   calmMode: boolean,
 *   toggleCalmMode: () => void,
 * }} */
export function useWorldState() {
  const ctx = useContext(WorldStateCtx);
  if (!ctx) throw new Error('useWorldState must be used inside <WorldStateProvider>');
  return ctx;
}

export function WorldStateProvider({ children, initialCalmMode = false }) {
  const [zoomedHotspot, setZoomed] = useState(null);
  const [calmMode, setCalmMode] = useState(initialCalmMode);

  const zoomTo = useCallback((id) => setZoomed(id), []);
  const zoomOut = useCallback(() => setZoomed(null), []);
  const toggleCalmMode = useCallback(() => setCalmMode(v => !v), []);

  const value = useMemo(
    () => ({ zoomedHotspot, zoomTo, zoomOut, calmMode, toggleCalmMode }),
    [zoomedHotspot, zoomTo, zoomOut, calmMode, toggleCalmMode],
  );

  return <WorldStateCtx.Provider value={value}>{children}</WorldStateCtx.Provider>;
}
```

**Step 4: Run — confirm pass.**

Run: `npx vitest run src/components/world/WorldStateContext.test.jsx`
Expected: 3 passed.

**Step 5: Commit.**

```bash
git add src/components/world/WorldStateContext.jsx src/components/world/WorldStateContext.test.jsx
git commit -m "feat(world): <WorldStateProvider> context with zoom + calm-mode state"
```

---

## Task 10: Reduced-motion detection hook (TDD)

**Files:**
- Create: `src/hooks/useReducedMotion.js`
- Create: `src/hooks/useReducedMotion.test.jsx`

**Step 1: Write failing test.**

```jsx
// src/hooks/useReducedMotion.test.jsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { useReducedMotion } from './useReducedMotion';

function mockMatchMedia(matches) {
  const listeners = new Set();
  const mql = {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: vi.fn((_, cb) => listeners.add(cb)),
    removeEventListener: vi.fn((_, cb) => listeners.delete(cb)),
  };
  window.matchMedia = vi.fn(() => mql);
  return { mql, listeners };
}

function Probe({ onValue }) { onValue(useReducedMotion()); return null; }

afterEach(() => { delete window.matchMedia; });

describe('useReducedMotion', () => {
  it('returns true when system prefers reduced motion', () => {
    mockMatchMedia(true);
    let captured;
    render(<Probe onValue={(v) => (captured = v)} />);
    expect(captured).toBe(true);
  });

  it('returns false when system does not prefer reduced motion', () => {
    mockMatchMedia(false);
    let captured;
    render(<Probe onValue={(v) => (captured = v)} />);
    expect(captured).toBe(false);
  });

  it('returns false when matchMedia is unavailable', () => {
    let captured;
    render(<Probe onValue={(v) => (captured = v)} />);
    expect(captured).toBe(false);
  });
});
```

**Step 2: Run — confirm fails.**

Run: `npx vitest run src/hooks/useReducedMotion.test.jsx`
Expected: 3 failed.

**Step 3: Implement.**

```js
// src/hooks/useReducedMotion.js
import { useEffect, useState } from 'react';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mql.matches);
    const onChange = (e) => setReduced(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
```

**Step 4: Run — confirm pass.**

Run: `npx vitest run src/hooks/useReducedMotion.test.jsx`
Expected: 3 passed.

**Step 5: Commit.**

```bash
git add src/hooks/useReducedMotion.js src/hooks/useReducedMotion.test.jsx
git commit -m "feat(world): useReducedMotion hook with matchMedia + cleanup"
```

---

## Task 11: `<Hotspot>` primitive (smoke-render TDD)

**Files:**
- Create: `src/components/world/Hotspot.jsx`
- Create: `src/components/world/Hotspot.test.jsx`
- Create: `src/components/world/Hotspot.css`

**Step 1: Write smoke-render test.**

```jsx
// src/components/world/Hotspot.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Hotspot from './Hotspot';

describe('<Hotspot>', () => {
  it('renders a button with role-derived aria-label', () => {
    render(<Hotspot id="h1" role="guide" x="50%" y="70%" label="Talk to your guide" />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAccessibleName('Talk to your guide');
  });

  it('positions absolutely using x/y percentages', () => {
    const { container } = render(<Hotspot id="h1" role="guide" x="50%" y="70%" label="x" />);
    const btn = container.querySelector('button');
    expect(btn).toHaveStyle({ left: '50%', top: '70%' });
  });

  it('marks aria-disabled when state is future', () => {
    render(<Hotspot id="h1" role="stage" x="0%" y="0%" label="x" state="future" />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
  });

  it('fires onActivate on click and keyboard Enter', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(<Hotspot id="h1" role="guide" x="0%" y="0%" label="x" onActivate={onActivate} />);
    const btn = screen.getByRole('button');
    await user.click(btn);
    btn.focus();
    await user.keyboard('{Enter}');
    expect(onActivate).toHaveBeenCalledTimes(2);
  });

  it('does not fire onActivate when state is future', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(<Hotspot id="h1" role="guide" x="0%" y="0%" label="x" state="future" onActivate={onActivate} />);
    await user.click(screen.getByRole('button'));
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('exposes data-state and data-role for styling', () => {
    const { container } = render(<Hotspot id="h1" role="stage" x="0%" y="0%" label="x" state="active" />);
    expect(container.querySelector('button')).toHaveAttribute('data-role', 'stage');
    expect(container.querySelector('button')).toHaveAttribute('data-state', 'active');
  });
});
```

**Step 2: Run — confirm fails.**

Run: `npx vitest run src/components/world/Hotspot.test.jsx`
Expected: 6 failed.

**Step 3: Implement.**

```jsx
// src/components/world/Hotspot.jsx
import './Hotspot.css';

/**
 * @param {object} props
 * @param {string} props.id
 * @param {string} props.role            HotspotRole from biome config
 * @param {string} props.x               '50%'
 * @param {string} props.y               '70%'
 * @param {string} props.label           plain-language aria-label
 * @param {'future'|'active'|'completed'} [props.state='active']
 * @param {() => void} [props.onActivate]
 */
export default function Hotspot({ id, role, x, y, label, state = 'active', onActivate }) {
  const disabled = state === 'future';
  return (
    <button
      type="button"
      className="hotspot"
      data-role={role}
      data-state={state}
      data-id={id}
      aria-label={label}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onActivate}
      style={{ left: x, top: y }}
    >
      <span className="hotspot__pulse" aria-hidden="true" />
    </button>
  );
}
```

```css
/* src/components/world/Hotspot.css */
.hotspot {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 56px;
  height: 56px;
  border: 2px dashed var(--graphite, #4a3f33);
  border-radius: 50%;
  background: rgba(255, 246, 220, 0.45);
  cursor: pointer;
  padding: 0;
  display: grid;
  place-items: center;
}
.hotspot:focus-visible {
  outline: 3px solid var(--compass-gold, #d6a64d);
  outline-offset: 2px;
}
.hotspot[data-state='future'] {
  opacity: 0.45;
  cursor: not-allowed;
  border-style: dotted;
}
.hotspot[data-state='completed'] {
  opacity: 0.7;
}
.hotspot__pulse {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--specimen-red, #b8443a);
  box-shadow: 0 0 0 0 rgba(184, 68, 58, 0.6);
  animation: hotspot-pulse 2.4s ease-in-out infinite;
}
.hotspot[data-state='future'] .hotspot__pulse,
.hotspot[data-state='completed'] .hotspot__pulse { animation: none; }

@keyframes hotspot-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(184,68,58,0.6); }
  50%      { box-shadow: 0 0 0 12px rgba(184,68,58,0);   }
}

@media (prefers-reduced-motion: reduce) {
  .hotspot__pulse { animation: none; }
}
```

**Step 4: Run — confirm pass.**

Run: `npx vitest run src/components/world/Hotspot.test.jsx`
Expected: 6 passed.

**Step 5: Commit.**

```bash
git add src/components/world/Hotspot.jsx src/components/world/Hotspot.css src/components/world/Hotspot.test.jsx
git commit -m "feat(world): <Hotspot> primitive — positioned a11y button with state"
```

---

## Task 12: `<ParallaxScene>` primitive (smoke-render)

**Files:**
- Create: `src/components/world/ParallaxScene.jsx`
- Create: `src/components/world/ParallaxScene.test.jsx`
- Create: `src/components/world/ParallaxScene.css`

**Step 1: Write smoke-render test.**

```jsx
// src/components/world/ParallaxScene.test.jsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ParallaxScene from './ParallaxScene';

const layers = { back: '/back.svg', mid: '/mid.svg', fore: '/fore.svg' };

describe('<ParallaxScene>', () => {
  it('renders three positioned layer elements', () => {
    const { container } = render(<ParallaxScene layers={layers} />);
    expect(container.querySelectorAll('[data-layer="back"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-layer="mid"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-layer="fore"]')).toHaveLength(1);
  });

  it('renders children above the foreground layer', () => {
    const { container } = render(
      <ParallaxScene layers={layers}>
        <div data-testid="child" />
      </ParallaxScene>
    );
    expect(container.querySelector('[data-testid="child"]')).toBeInTheDocument();
  });

  it('exposes data-reduced-motion when calmMode is true', () => {
    const { container } = render(<ParallaxScene layers={layers} calmMode />);
    expect(container.firstChild).toHaveAttribute('data-reduced-motion', 'true');
  });
});
```

**Step 2: Run — confirm fails.**

Run: `npx vitest run src/components/world/ParallaxScene.test.jsx`
Expected: 3 failed.

**Step 3: Implement.**

```jsx
// src/components/world/ParallaxScene.jsx
import { useEffect, useRef } from 'react';
import './ParallaxScene.css';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const DEPTHS = { back: 4, mid: 8, fore: 12 };  // px max travel per layer

/**
 * Three-layer parallax SVG scene. Mouse position drives sub-pixel depth.
 * Disabled under reduced-motion / calmMode.
 *
 * @param {object} props
 * @param {{back: string, mid: string, fore: string}} props.layers
 * @param {boolean} [props.calmMode]
 * @param {React.ReactNode} [props.children]
 */
export default function ParallaxScene({ layers, calmMode = false, children }) {
  const ref = useRef(null);
  const systemReduced = useReducedMotion();
  const reduced = calmMode || systemReduced;

  useEffect(() => {
    if (reduced || !ref.current) return;
    const root = ref.current;
    const onMove = (e) => {
      const rect = root.getBoundingClientRect();
      const cx = (e.clientX - rect.left) / rect.width  - 0.5;  // -0.5 .. +0.5
      const cy = (e.clientY - rect.top)  / rect.height - 0.5;
      Object.entries(DEPTHS).forEach(([name, max]) => {
        const el = root.querySelector(`[data-layer="${name}"]`);
        if (!el) return;
        el.style.transform = `translate3d(${(-cx * max).toFixed(2)}px, ${(-cy * max).toFixed(2)}px, 0)`;
      });
    };
    root.addEventListener('pointermove', onMove);
    return () => root.removeEventListener('pointermove', onMove);
  }, [reduced]);

  return (
    <div
      ref={ref}
      className="parallax-scene"
      data-reduced-motion={reduced ? 'true' : undefined}
    >
      <img data-layer="back" src={layers.back} alt="" aria-hidden="true" draggable={false} />
      <img data-layer="mid"  src={layers.mid}  alt="" aria-hidden="true" draggable={false} />
      <img data-layer="fore" src={layers.fore} alt="" aria-hidden="true" draggable={false} />
      <div className="parallax-scene__overlay">{children}</div>
    </div>
  );
}
```

```css
/* src/components/world/ParallaxScene.css */
.parallax-scene {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: var(--paper, #fbf6e7);
  user-select: none;
}
.parallax-scene img[data-layer] {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  transition: transform 200ms ease-out;
  will-change: transform;
}
.parallax-scene[data-reduced-motion='true'] img[data-layer] {
  transform: none !important;
  transition: none !important;
}
.parallax-scene__overlay {
  position: absolute;
  inset: 0;
  /* hotspots use position:absolute with x/y % */
}
```

**Step 4: Run — confirm pass.**

Run: `npx vitest run src/components/world/ParallaxScene.test.jsx`
Expected: 3 passed.

**Step 5: Commit.**

```bash
git add src/components/world/ParallaxScene.jsx src/components/world/ParallaxScene.css src/components/world/ParallaxScene.test.jsx
git commit -m "feat(world): <ParallaxScene> three-layer renderer with reduced-motion"
```

---

## Task 13: `STYLE_PREFIX_V1` constant module

**Files:**
- Create: `src/lib/styleGenAI.js`
- Create: `src/lib/styleGenAI.test.js`

**Step 1: Write failing test.**

```js
// src/lib/styleGenAI.test.js
import { describe, it, expect } from 'vitest';
import { STYLE_PREFIX_V1, STYLE_PREFIX_VERSION, buildArtPrompt } from './styleGenAI';

describe('styleGenAI', () => {
  it('exposes a non-empty style prefix', () => {
    expect(STYLE_PREFIX_V1.length).toBeGreaterThan(50);
  });
  it('declares a version', () => {
    expect(STYLE_PREFIX_VERSION).toBe('v1');
  });
  it('buildArtPrompt prepends prefix and joins user prompt', () => {
    const p = buildArtPrompt('a botanist with field journal, smiling');
    expect(p.startsWith(STYLE_PREFIX_V1)).toBe(true);
    expect(p).toContain('botanist');
  });
  it('buildArtPrompt collapses whitespace', () => {
    const p = buildArtPrompt('  a  scientist  ');
    expect(p).toContain('a scientist');
    expect(p).not.toMatch(/  /);
  });
});
```

**Step 2: Run — confirm fails.**

Run: `npx vitest run src/lib/styleGenAI.test.js`
Expected: 4 failed.

**Step 3: Implement.**

```js
// src/lib/styleGenAI.js
// Versioned style prefix for AI-generated learner-world art (character
// portraits and decorative items). Brand-protection seam: bumping
// STYLE_PREFIX_VERSION + backfilling regenerates everything.

export const STYLE_PREFIX_VERSION = 'v1';

export const STYLE_PREFIX_V1 =
  'vintage natural-history color plate, sepia + cream parchment background, ' +
  'ink-line + watercolor wash, hand-drawn naturalist register, soft edges, ' +
  'no modern UI elements, no text overlays, gentle muted palette, ' +
  'subject:';

/**
 * @param {string} subjectPrompt user-controlled subject description (e.g. "a botanist holding a fern")
 * @returns {string} full prompt to send to the image-gen provider
 */
export function buildArtPrompt(subjectPrompt) {
  const cleaned = String(subjectPrompt || '').replace(/\s+/g, ' ').trim();
  return `${STYLE_PREFIX_V1} ${cleaned}`;
}
```

**Step 4: Run — confirm pass.**

Run: `npx vitest run src/lib/styleGenAI.test.js`
Expected: 4 passed.

**Step 5: Commit.**

```bash
git add src/lib/styleGenAI.js src/lib/styleGenAI.test.js
git commit -m "feat(world): STYLE_PREFIX_V1 constant + buildArtPrompt helper"
```

---

## Task 14: `?view=list` query-flag router

**Goal:** Establish the contract that any future `Biome` page accepts `?view=list` to render the existing list view instead of the world. For Phase 0 we ship the *plumbing* — a `useViewMode()` hook + a wrapper that reads the query param and exposes the choice.

**Files:**
- Create: `src/hooks/useViewMode.js`
- Create: `src/hooks/useViewMode.test.jsx`

**Step 1: Write failing test.**

```jsx
// src/hooks/useViewMode.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useViewMode } from './useViewMode';

function Probe() {
  const { mode, isList, isWorld } = useViewMode();
  return <div data-testid="mode">{mode}|{String(isList)}|{String(isWorld)}</div>;
}

function renderAt(url) {
  return render(<MemoryRouter initialEntries={[url]}><Probe/></MemoryRouter>);
}

describe('useViewMode', () => {
  it('defaults to world when no query param', () => {
    renderAt('/q/abc');
    expect(screen.getByTestId('mode')).toHaveTextContent('world|false|true');
  });

  it('returns list when view=list', () => {
    renderAt('/q/abc?view=list');
    expect(screen.getByTestId('mode')).toHaveTextContent('list|true|false');
  });

  it('falls back to world for unknown values', () => {
    renderAt('/q/abc?view=zebra');
    expect(screen.getByTestId('mode')).toHaveTextContent('world|false|true');
  });
});
```

**Step 2: Run — confirm fails.**

Run: `npx vitest run src/hooks/useViewMode.test.jsx`
Expected: 3 failed.

**Step 3: Implement.**

```js
// src/hooks/useViewMode.js
import { useSearchParams } from 'react-router-dom';

const VALID = new Set(['world', 'list']);

export function useViewMode() {
  const [params] = useSearchParams();
  const raw = params.get('view');
  const mode = VALID.has(raw) ? raw : 'world';
  return { mode, isList: mode === 'list', isWorld: mode === 'world' };
}
```

**Step 4: Run — confirm pass.**

Run: `npx vitest run src/hooks/useViewMode.test.jsx`
Expected: 3 passed.

**Step 5: Commit.**

```bash
git add src/hooks/useViewMode.js src/hooks/useViewMode.test.jsx
git commit -m "feat(world): useViewMode hook for ?view=list query-param routing"
```

---

## Task 15: Placeholder `<Biome>` page (manual integration)

**Goal:** Wire all primitives together behind `/q/:questId/world-preview` (a temporary route, removed in Phase 1) so the foundation is visibly working. Renders three solid-color rectangles as placeholder layers + the campsite hotspots. Tapping a hotspot logs to console + flips `<WorldStateProvider>` zoom state.

**Files:**
- Create: `public/biomes/campsite/back.svg` (solid color, 1600×900, sepia)
- Create: `public/biomes/campsite/mid.svg` (solid color, slightly darker)
- Create: `public/biomes/campsite/fore.svg` (solid color, lightest)
- Create: `src/pages/student/_BiomePreview.jsx`
- Modify: `src/App.jsx` — add temporary route `/q/:questId/world-preview` behind `<ProtectedRoute>`

**Step 1: Create the three placeholder SVGs.**

Each is a 1600×900 single-color rect, just to verify layer mounting. Example for `back.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
  <rect width="1600" height="900" fill="#e7d8b8"/>
  <text x="800" y="100" font-family="serif" font-size="40" text-anchor="middle" fill="#5a4a30">CAMPSITE — BACK LAYER (placeholder)</text>
</svg>
```

Use `#e7d8b8` (back), `#d4c094` (mid), `#bfa974` (fore). Update the text label per layer.

**Step 2: Build the preview page.**

```jsx
// src/pages/student/_BiomePreview.jsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { getBiome } from '../../biomes';
import ParallaxScene from '../../components/world/ParallaxScene';
import Hotspot from '../../components/world/Hotspot';
import Specimen from '../../components/world/Specimen';
import { WorldStateProvider, useWorldState } from '../../components/world/WorldStateContext';

const ROLE_LABELS = {
  trailheadSign: 'Trailhead — driving question',
  stage:         'Stage location',
  guide:         'Talk to your guide',
  bulletinSubmit:'Pin a deliverable',
  mailbox:       'Read your mail',
  challenger:    'Stranger by the path',
  reflection:    'Open your journal',
  stretch:       'Side trail',
  teammate:      'Teammate camp',
  parentLetter:  'Letter from home',
};

function PreviewInner() {
  const { questId } = useParams();
  const { zoomedHotspot, zoomTo, zoomOut } = useWorldState();
  const cfg = getBiome('campsite');
  return (
    <ParallaxScene layers={cfg.layers}>
      {cfg.hotspots.map((h, i) => (
        <Hotspot
          key={i}
          id={`${h.role}-${i}`}
          role={h.role}
          x={h.x}
          y={h.y}
          label={ROLE_LABELS[h.role] || h.role}
          state={h.role === 'stage' && h.stageIndex > 0 ? 'future' : 'active'}
          onActivate={() => zoomTo(`${h.role}-${i}`)}
        />
      ))}
      {zoomedHotspot && (
        <div style={{ position: 'absolute', top: 24, left: 24, zIndex: 10 }}>
          <Specimen id={zoomedHotspot} pin="pin">
            <strong>Zoomed:</strong> {zoomedHotspot}
            <button onClick={zoomOut} style={{ marginLeft: 12 }}>back</button>
          </Specimen>
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 16, right: 16, color: '#5a4a30' }}>
        Quest preview: {questId}
      </div>
    </ParallaxScene>
  );
}

export default function BiomePreview() {
  return (
    <WorldStateProvider>
      <PreviewInner />
    </WorldStateProvider>
  );
}
```

**Step 3: Add the temporary route to `App.jsx`.**

Find the `<Routes>` block. Add inside the `<ProtectedRoute>` group:

```jsx
<Route path="/q/:questId/world-preview" element={<BiomePreview />} />
```

Add the import at top:
```jsx
import BiomePreview from './pages/student/_BiomePreview.jsx';
```

**Step 4: Manual smoke test.**

```bash
npm run dev
```

Open `http://localhost:3001/q/anything/world-preview` (logged in). Expected:
- Three colored layer rects render full-screen
- 9 dashed-circle hotspots in expected positions
- Stage 1 hotspots after the first show as `future` (lower opacity, dotted)
- Mouse movement causes subtle <12px parallax shift on layers
- Tab key cycles through hotspots; Enter activates
- Tapping/Enter on an active hotspot shows a "Zoomed: ..." `<Specimen>` in top-left with "back" button
- macOS/iOS reduced-motion: layers stop tracking, hotspot pulse disabled

**Step 5: Run all tests one more time.**

```bash
npm run test:run
```

Expected: All tests pass (Tasks 1–14's tests).

**Step 6: Commit.**

```bash
git add public/biomes src/pages/student/_BiomePreview.jsx src/App.jsx
git commit -m "feat(world): wire all Phase-0 primitives behind /q/:id/world-preview"
```

---

## Phase 0 acceptance gate

Before declaring Phase 0 complete and moving to Phase 1, verify all of:

- [ ] `npm run test:run` — all tests pass
- [ ] `npm run lint` — no new warnings
- [ ] `npm run build` — builds clean
- [ ] Migrations 056 + 057 applied to dev Supabase, verified with `information_schema` queries
- [ ] `/q/<any-id>/world-preview` shows the placeholder biome with hotspots, parallax, zoom, and Specimen overlay
- [ ] Reduced-motion mode (system or future toggle) disables parallax + pulse + transitions
- [ ] List-view fallback hook returns `world` by default and `list` for `?view=list`
- [ ] `STYLE_PREFIX_V1` is a versioned constant; `buildArtPrompt` is the only entry point
- [ ] No changes to `WorldRenderer.jsx`, `CampHub.jsx`, or `WorldChat.jsx` — Phase 0 strictly additive
- [ ] No new dependencies beyond Vitest + Testing Library + jsdom + framer-motion
- [ ] All commits pushed to `feature/illustrated-world` (or wherever the worktree branch lives)

---

## Phases 1–6 — outline only, re-plan when ready

These are **acceptance gates**, not bite-sized tasks. Re-run the writing-plans skill (or a human-led plan) per phase before starting it.

### Phase 1 — Campsite end-to-end (3–4 wk)
Replace the temp `_BiomePreview.jsx` with the real `<Biome>` page at `/q/:questId`. Hand-illustrated campsite SVGs (commission). All 9 hotspots wired to existing data + `WorldChat` + `CampfireChat`. Stage progression animations. Ambient motion. `<FieldFigure>` for the firepit friend. **Gate:** a real learner completes a real project inside the campsite end-to-end.

### Phase 2 — AI content gen (1–2 wk)
`ai.generateProjectArt()` helper. Provider integration (fal.ai). QuestBuilder Step 5 biome picker + Step 6 publish-time gen modal. Per-image regenerate. Cost cap. Fallbacks. **Gate:** new quests publish with bespoke character portrait + decor; old quests still work.

### Phase 3 — Tactile 3D props (2–3 wk)
`<TactileProp>` portal. Five GLB props (lantern, journal, specimenJar, mailbox, tent). Keyboard-accessible alternates. Single-canvas guarantee. **Gate:** tapping the lantern feels like turning a dial.

### Phase 4 — Field Station hub (2 wk)
New `/station` route. Hub parallax scene (own SVG trio). Wall map → biome travel. Specimen cabinet → skills. Bulletin board → incoming items. Replace `CampHub` as default. **Gate:** learner logs in, lands in their Station, travels to projects from there. Past projects leave artifacts.

### Phase 5 — Lab + Workshop biomes (2 wk)
Two more SVG trios + biome configs. No new code (framework already exists from Phase 1). Auto-suggest covers all three. **Gate:** three biomes covering ecology / science / making.

### Phase 6 — Polish + parent flow (2 wk +)
Parent dashboard peek-into-the-world. Group teammates render as other tents/stations/benches. Optional: AI-gen 3D specimen meshes via Meshy.

### Deferred (maybe never)
- AI-gen 3D specimen meshes
- Voice TTS for firepit friend (medkit-style live voice)
- Multiplayer synchronicity
- Procedural biome variants
- Biomes beyond initial three

---

## Open questions surfaced from the design doc

These are explicit `?`s the implementer should resolve at phase boundaries:

1. **Illustrator vs. AI-gen for biome layers themselves** (Phase 1). Plan assumes hand-illustrated. If illustrator capacity is the blocker, is one round of fal.ai with manual cleanup in Figma acceptable for v1 biomes? Resolve with a single sample before committing.
2. **Field Station archetype** (Phase 4). Study? Wagon? Treehouse? Tent? Should match age band — leans study/cabin for 9–12, treehouse/tent for 6–8.
3. **Existing XP, rank, shop, collection surfaces.** Stay in list view? Surface as cabinet objects in Field Station? Hide entirely behind `?view=list`? Decide at start of Phase 4.
4. **Existing `useAmbientSound` presets.** Keep mapping to biome (one ambient sound per biome) or per-blueprint as today? Decide at start of Phase 1.
5. **Parent Dashboard "peek-into-the-world."** Out of MVP. Capture as Phase 6 ticket.
6. **Migration timing for legacy `/world/:id` URLs.** Redirect to `/q/:id` permanently from day one of Phase 1, or maintain both for 30 days? Decide at start of Phase 1.

---

## When to run this plan

Phase 0 is purely additive — no existing surface breaks. Safe to run on `main` if a worktree feels excessive, **but** the design doc is conservative for a reason: a 12-week build deserves its own branch. Recommend the worktree path at Task 0.
