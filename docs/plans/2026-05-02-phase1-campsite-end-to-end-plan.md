# Phase 1 — Campsite End-to-End Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `_BiomePreview.jsx` placeholder with a real `<BiomePage>` at `/q/:questId` where a learner can enter the campsite biome, navigate stages, chat with the AI mentor, submit work, and receive feedback — all inside the illustrated world.

**Architecture:** `<BiomePage>` uses `useViewMode()` to dispatch between the new biome world (default) and the existing `StudentQuestPage` (`?view=list`). The biome world is built from Phase 0 primitives: `<ParallaxScene>` renders three SVG layers, `<Hotspot>` buttons sit at biome-config coordinates, and a new `<HotspotOverlay>` slides up from the bottom when a hotspot is tapped to show stage content, `WorldChat`, `CampfireChat`, or feedback letters. Stage states (future/active/completed) are read directly from `quest_stages.status` in Supabase. No new AI calls, no new DB tables — Phase 1 is pure wiring.

**Tech Stack:** React 19 + Vite 7, plain JSX with JSDoc types, Supabase (existing client), Framer Motion (already installed), Vitest + Testing Library (already installed). All CSS via custom properties in `src/index.css`.

**Migrations needed:** None — 056 and 057 are already applied.

---

## File map

```
New files:
  src/hooks/useBiomeQuest.js               — fetch quest + stages → biome state
  src/hooks/useBiomeQuest.test.js
  src/components/world/AmbientLayer.jsx    — CSS-animated ambient elements
  src/components/world/AmbientLayer.css
  src/components/world/AmbientLayer.test.jsx
  src/components/world/FieldFigure.jsx     — procedural SVG character (fallback portrait)
  src/components/world/FieldFigure.test.jsx
  src/components/world/HotspotOverlay.jsx  — bottom-sheet panel, routes by hotspot role
  src/components/world/HotspotOverlay.css
  src/components/world/HotspotOverlay.test.jsx
  src/components/world/BiomeScene.jsx      — main world renderer, wires everything
  src/components/world/BiomeScene.css
  src/components/world/BiomeScene.test.jsx
  src/pages/student/BiomePage.jsx          — router entry, world vs list dispatch

Modified files:
  public/biomes/campsite/back.svg          — richer illustrated placeholder
  public/biomes/campsite/mid.svg
  public/biomes/campsite/fore.svg
  src/App.jsx                              — /q/:id → BiomePage, remove world-preview route
```

---

## Task 1: Richer campsite SVG layers

**Files:**
- Modify: `public/biomes/campsite/back.svg`
- Modify: `public/biomes/campsite/mid.svg`
- Modify: `public/biomes/campsite/fore.svg`

No tests for SVG assets. Manual verification in dev server.

- [ ] **Step 1: Replace back.svg** with a parchment-sky scene — gradient sky, distant hill line, tree silhouettes.

Replace the full contents of `public/biomes/campsite/back.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#d6c9a8"/>
      <stop offset="60%" stop-color="#e8d9b8"/>
      <stop offset="100%" stop-color="#c9b890"/>
    </linearGradient>
    <linearGradient id="hills" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7a6a4a"/>
      <stop offset="100%" stop-color="#5a4a30"/>
    </linearGradient>
  </defs>
  <!-- Sky -->
  <rect width="1600" height="900" fill="url(#sky)"/>
  <!-- Distant hills -->
  <path d="M0,560 Q200,480 400,520 Q600,560 800,500 Q1000,440 1200,490 Q1400,540 1600,510 L1600,900 L0,900 Z"
        fill="url(#hills)" opacity="0.55"/>
  <!-- Far tree line (silhouette) -->
  <g fill="#6b5a3a" opacity="0.45">
    <path d="M80,520 L90,480 L100,520 Z"/>
    <path d="M90,525 L100,475 L110,525 Z"/>
    <path d="M105,522 L115,468 L125,522 Z"/>
    <path d="M250,510 L260,462 L270,510 Z"/>
    <path d="M260,515 L272,458 L284,515 Z"/>
    <path d="M470,505 L482,455 L494,505 Z"/>
    <path d="M700,518 L712,465 L724,518 Z"/>
    <path d="M712,514 L725,460 L738,514 Z"/>
    <path d="M950,508 L963,454 L976,508 Z"/>
    <path d="M963,512 L977,458 L991,512 Z"/>
    <path d="M1180,515 L1193,458 L1206,515 Z"/>
    <path d="M1400,512 L1413,460 L1426,512 Z"/>
    <path d="M1412,508 L1426,454 L1440,508 Z"/>
    <path d="M1500,520 L1512,470 L1524,520 Z"/>
  </g>
  <!-- Ground base -->
  <path d="M0,600 Q400,570 800,585 Q1200,600 1600,580 L1600,900 L0,900 Z"
        fill="#a8956a" opacity="0.4"/>
  <!-- Label (dev only) -->
  <text x="800" y="50" font-family="Georgia,serif" font-size="22" text-anchor="middle"
        fill="#6b5a3a" opacity="0.35" font-style="italic">campsite — back layer</text>
</svg>
```

- [ ] **Step 2: Replace mid.svg** with mid-ground trees, campfire smoke, and trail.

Replace the full contents of `public/biomes/campsite/mid.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="trunk" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#6b4e2a"/>
      <stop offset="100%" stop-color="#4a3420"/>
    </linearGradient>
    <linearGradient id="canopy" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#5a7a3a"/>
      <stop offset="100%" stop-color="#3d5a28"/>
    </linearGradient>
    <linearGradient id="smoke" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#b8a890" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#d8cbb0" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <!-- Ground mid-plane -->
  <path d="M0,680 Q400,650 800,665 Q1200,680 1600,660 L1600,900 L0,900 Z"
        fill="#b8a070" opacity="0.5"/>
  <!-- Trail path -->
  <path d="M680,900 Q720,820 740,760 Q760,700 750,660"
        stroke="#c4a870" stroke-width="28" fill="none" opacity="0.6" stroke-linecap="round"/>
  <!-- Left cluster of trees -->
  <g>
    <rect x="115" y="520" width="18" height="180" fill="url(#trunk)"/>
    <ellipse cx="124" cy="510" rx="55" ry="70" fill="url(#canopy)" opacity="0.9"/>
    <rect x="175" y="540" width="14" height="160" fill="url(#trunk)"/>
    <ellipse cx="182" cy="530" rx="42" ry="58" fill="url(#canopy)" opacity="0.85"/>
  </g>
  <!-- Right cluster -->
  <g>
    <rect x="1420" y="510" width="20" height="190" fill="url(#trunk)"/>
    <ellipse cx="1430" cy="498" rx="60" ry="75" fill="url(#canopy)" opacity="0.9"/>
    <rect x="1472" y="530" width="16" height="170" fill="url(#trunk)"/>
    <ellipse cx="1480" cy="520" rx="48" ry="62" fill="url(#canopy)" opacity="0.85"/>
  </g>
  <!-- Campfire stones -->
  <ellipse cx="750" cy="700" rx="30" ry="12" fill="#8a7660" opacity="0.8"/>
  <!-- Campfire logs -->
  <line x1="726" y1="700" x2="774" y2="696" stroke="#5a3a20" stroke-width="6" stroke-linecap="round"/>
  <line x1="730" y1="704" x2="770" y2="698" stroke="#4a3018" stroke-width="5" stroke-linecap="round"/>
  <!-- Campfire flames (static — animated version in AmbientLayer) -->
  <path d="M744,692 Q748,678 750,670 Q752,678 756,692 Q753,686 750,690 Q747,686 744,692 Z"
        fill="#e8a840" opacity="0.7"/>
  <!-- Smoke plume -->
  <path d="M750,668 Q748,640 752,610 Q755,580 750,548"
        stroke="url(#smoke)" stroke-width="12" fill="none" stroke-linecap="round"/>
  <!-- Label -->
  <text x="800" y="50" font-family="Georgia,serif" font-size="22" text-anchor="middle"
        fill="#6b5a3a" opacity="0.35" font-style="italic">campsite — mid layer</text>
</svg>
```

- [ ] **Step 3: Replace fore.svg** with foreground foliage, a log seat, and rocks.

Replace the full contents of `public/biomes/campsite/fore.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7a8c4a"/>
      <stop offset="100%" stop-color="#5a6c32"/>
    </linearGradient>
    <linearGradient id="logGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7a5a30"/>
      <stop offset="100%" stop-color="#5a3a18"/>
    </linearGradient>
  </defs>
  <!-- Ground foreground -->
  <path d="M0,800 Q400,770 800,782 Q1200,795 1600,775 L1600,900 L0,900 Z"
        fill="url(#grass)"/>
  <!-- Log seat left of fire -->
  <ellipse cx="630" cy="788" rx="70" ry="18" fill="url(#logGrad)"/>
  <ellipse cx="630" cy="778" rx="70" ry="18" fill="#8a6a3a"/>
  <!-- Tree-ring detail on log end -->
  <ellipse cx="560" cy="783" rx="18" ry="18" fill="#7a5a2a"/>
  <ellipse cx="560" cy="783" rx="12" ry="12" fill="#8a6a3a"/>
  <ellipse cx="560" cy="783" rx="6" ry="6" fill="#7a5a2a"/>
  <!-- Rocks near fire -->
  <ellipse cx="720" cy="792" rx="20" ry="12" fill="#9a8a70"/>
  <ellipse cx="780" cy="795" rx="16" ry="10" fill="#8a7a60"/>
  <ellipse cx="700" cy="798" rx="14" ry="8" fill="#a09080"/>
  <!-- Foreground grass tufts left -->
  <g fill="#6a7a3a" opacity="0.8">
    <path d="M40,820 Q44,795 48,820 Q42,808 40,820 Z"/>
    <path d="M55,825 Q60,798 64,825 Q58,812 55,825 Z"/>
    <path d="M130,818 Q135,792 139,818 Q133,805 130,818 Z"/>
    <path d="M220,822 Q225,796 229,822 Q223,809 220,822 Z"/>
    <path d="M310,816 Q315,790 319,816 Q313,803 310,816 Z"/>
  </g>
  <!-- Foreground grass tufts right -->
  <g fill="#6a7a3a" opacity="0.8">
    <path d="M1300,820 Q1305,793 1309,820 Q1303,807 1300,820 Z"/>
    <path d="M1380,817 Q1385,791 1389,817 Q1383,804 1380,817 Z"/>
    <path d="M1450,823 Q1455,797 1459,823 Q1453,810 1450,823 Z"/>
    <path d="M1530,819 Q1535,793 1539,819 Q1533,806 1530,819 Z"/>
  </g>
  <!-- Wildflower dots -->
  <g fill="#c8a840" opacity="0.7">
    <circle cx="180" cy="810" r="4"/>
    <circle cx="290" cy="815" r="3"/>
    <circle cx="1340" cy="812" r="4"/>
    <circle cx="1490" cy="814" r="3"/>
  </g>
  <!-- Label -->
  <text x="800" y="50" font-family="Georgia,serif" font-size="22" text-anchor="middle"
        fill="#6b5a3a" opacity="0.35" font-style="italic">campsite — fore layer</text>
</svg>
```

- [ ] **Step 4: Verify in dev server.**

```bash
cd "/Users/md/Quest Lab/quest-lab-world-upgrade" && npm run dev
```

Navigate to `http://localhost:3001/q/anything/world-preview` (logged in). Expected: the three layers now show a campsite scene — parchment sky with hill silhouettes (back), trees + campfire + trail (mid), log seat + rocks + foreground grass (fore). Parallax movement on mouse.

- [ ] **Step 5: Commit.**

```bash
cd "/Users/md/Quest Lab/quest-lab-world-upgrade"
git add public/biomes/campsite/back.svg public/biomes/campsite/mid.svg public/biomes/campsite/fore.svg
git commit -m "feat(world): richer illustrated placeholder campsite SVG layers"
```

---

## Task 2: `useBiomeQuest` hook (TDD)

**Files:**
- Create: `src/hooks/useBiomeQuest.js`
- Create: `src/hooks/useBiomeQuest.test.js`

- [ ] **Step 1: Write failing test.**

```js
// src/hooks/useBiomeQuest.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBiomeQuest } from './useBiomeQuest';

const mockSingle = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mockSingle,
        }),
      }),
    }),
  },
}));

const makeQuest = (stages = []) => ({
  id: 'q1',
  title: 'Test Quest',
  description: 'desc',
  biome_id: 'campsite',
  character_image_url: null,
  quest_stages: stages,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useBiomeQuest', () => {
  it('starts in loading state', () => {
    mockSingle.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useBiomeQuest('q1'));
    expect(result.current.loading).toBe(true);
    expect(result.current.quest).toBeNull();
    expect(result.current.stages).toEqual([]);
  });

  it('returns quest and sorted stages on success', async () => {
    const stages = [
      { id: 's2', stage_number: 2, status: 'locked', title: 'Stage 2' },
      { id: 's1', stage_number: 1, status: 'active', title: 'Stage 1' },
    ];
    mockSingle.mockResolvedValue({ data: makeQuest(stages), error: null });
    const { result } = renderHook(() => useBiomeQuest('q1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.quest?.id).toBe('q1');
    expect(result.current.stages[0].stage_number).toBe(1);
    expect(result.current.stages[1].stage_number).toBe(2);
  });

  it('maps stage status to biomeState', async () => {
    const stages = [
      { id: 's1', stage_number: 1, status: 'completed', title: 'S1' },
      { id: 's2', stage_number: 2, status: 'active',    title: 'S2' },
      { id: 's3', stage_number: 3, status: 'locked',    title: 'S3' },
    ];
    mockSingle.mockResolvedValue({ data: makeQuest(stages), error: null });
    const { result } = renderHook(() => useBiomeQuest('q1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.stages[0].biomeState).toBe('completed');
    expect(result.current.stages[1].biomeState).toBe('active');
    expect(result.current.stages[2].biomeState).toBe('future');
  });

  it('sets error on failure', async () => {
    mockSingle.mockResolvedValue({ data: null, error: new Error('DB error') });
    const { result } = renderHook(() => useBiomeQuest('q1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.quest).toBeNull();
  });

  it('does nothing when questId is falsy', () => {
    const { result } = renderHook(() => useBiomeQuest(null));
    expect(result.current.loading).toBe(true); // stays loading, no fetch
    expect(mockSingle).not.toHaveBeenCalled();
  });

  it('refreshStages re-fetches data', async () => {
    mockSingle.mockResolvedValue({ data: makeQuest([]), error: null });
    const { result } = renderHook(() => useBiomeQuest('q1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    mockSingle.mockClear();
    await result.current.refreshStages();
    expect(mockSingle).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test — confirm all 6 fail.**

```bash
cd "/Users/md/Quest Lab/quest-lab-world-upgrade"
npx vitest run src/hooks/useBiomeQuest.test.js
```

Expected: 6 failed (module not found).

- [ ] **Step 3: Implement the hook.**

```js
// src/hooks/useBiomeQuest.js
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * @typedef {'future'|'active'|'completed'} BiomeState
 *
 * @typedef {Object} BiomeStage
 * @property {string} id
 * @property {number} stage_number
 * @property {string} status           — 'locked'|'active'|'completed' from DB
 * @property {BiomeState} biomeState   — derived display state
 * @property {string} title
 * @property {string} [description]
 * @property {string} [challenge]
 * @property {string} [deliverable_description]
 * @property {string} [guiding_questions]
 */

function toState(status) {
  if (status === 'completed') return 'completed';
  if (status === 'active')    return 'active';
  return 'future';
}

/**
 * @param {string|null} questId
 * @returns {{
 *   quest: object|null,
 *   stages: BiomeStage[],
 *   loading: boolean,
 *   error: Error|null,
 *   refreshStages: () => Promise<void>,
 * }}
 */
export function useBiomeQuest(questId) {
  const [quest,   setQuest]   = useState(null);
  const [stages,  setStages]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    if (!questId) return;
    setLoading(true);
    const { data, error: err } = await supabase
      .from('quests')
      .select('*, quest_stages(*)')
      .eq('id', questId)
      .single();

    if (err) {
      setError(err);
      setLoading(false);
      return;
    }

    const sorted = [...(data.quest_stages || [])].sort(
      (a, b) => a.stage_number - b.stage_number
    );
    const mapped = sorted.map(s => ({ ...s, biomeState: toState(s.status) }));

    setQuest(data);
    setStages(mapped);
    setLoading(false);
  }, [questId]);

  useEffect(() => { load(); }, [load]);

  return { quest, stages, loading, error, refreshStages: load };
}
```

- [ ] **Step 4: Run test — confirm all 6 pass.**

```bash
npx vitest run src/hooks/useBiomeQuest.test.js
```

Expected: 6 passed.

- [ ] **Step 5: Commit.**

```bash
git add src/hooks/useBiomeQuest.js src/hooks/useBiomeQuest.test.js
git commit -m "feat(world): useBiomeQuest hook — fetch quest+stages, derive biomeState"
```

---

## Task 3: `<AmbientLayer>` component

**Files:**
- Create: `src/components/world/AmbientLayer.jsx`
- Create: `src/components/world/AmbientLayer.css`
- Create: `src/components/world/AmbientLayer.test.jsx`

- [ ] **Step 1: Write failing smoke test.**

```jsx
// src/components/world/AmbientLayer.test.jsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import AmbientLayer from './AmbientLayer';

describe('<AmbientLayer>', () => {
  it('renders without crashing with campsite ambient array', () => {
    const { container } = render(
      <AmbientLayer ambient={['lanternFlicker', 'mothFlutter', 'leafFall', 'paperCurl']} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders nothing when ambient is empty', () => {
    const { container } = render(<AmbientLayer ambient={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('adds data-calm attribute when calmMode is true', () => {
    const { container } = render(
      <AmbientLayer ambient={['lanternFlicker']} calmMode />
    );
    expect(container.firstChild).toHaveAttribute('data-calm', 'true');
  });

  it('renders a lanternFlicker element for campsite', () => {
    const { container } = render(<AmbientLayer ambient={['lanternFlicker']} />);
    expect(container.querySelector('[data-ambient="lanternFlicker"]')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test — confirm 4 fail.**

```bash
npx vitest run src/components/world/AmbientLayer.test.jsx
```

Expected: 4 failed.

- [ ] **Step 3: Implement `AmbientLayer.jsx`.**

```jsx
// src/components/world/AmbientLayer.jsx
import './AmbientLayer.css';

const ELEMENTS = {
  lanternFlicker: () => (
    <div data-ambient="lanternFlicker" className="ambient-lantern-wrap" aria-hidden="true">
      <svg viewBox="0 0 40 60" width="40" height="60" className="ambient-lantern">
        <rect x="10" y="12" width="20" height="28" rx="4" fill="#e8c870" opacity="0.6"/>
        <ellipse cx="20" cy="30" rx="8" ry="12" fill="#f5d080" className="ambient-lantern-flame" opacity="0.9"/>
        <rect x="16" y="4"  width="8" height="10" rx="2" fill="#8a6a40" opacity="0.8"/>
        <line x1="20" y1="0" x2="20" y2="4" stroke="#8a6a40" strokeWidth="2"/>
      </svg>
    </div>
  ),
  leafFall: () => (
    <div data-ambient="leafFall" className="ambient-leaves-wrap" aria-hidden="true">
      {[0, 1, 2, 3].map(i => (
        <svg
          key={i}
          className="ambient-leaf"
          style={{ '--leaf-delay': `${i * 1.8}s`, '--leaf-x': `${15 + i * 22}%` }}
          viewBox="0 0 16 20" width="14" height="18"
          aria-hidden="true"
        >
          <path d="M8,0 Q16,6 12,14 Q8,20 4,14 Q0,6 8,0 Z" fill="#6a8a3a" opacity="0.75"/>
          <line x1="8" y1="4" x2="8" y2="18" stroke="#4a6a24" strokeWidth="1" opacity="0.5"/>
        </svg>
      ))}
    </div>
  ),
  paperCurl: () => (
    <div data-ambient="paperCurl" className="ambient-paper-wrap" aria-hidden="true">
      <div className="ambient-paper-curl" />
    </div>
  ),
  mothFlutter: () => (
    <div data-ambient="mothFlutter" className="ambient-moth-wrap" aria-hidden="true">
      <svg className="ambient-moth" viewBox="0 0 28 16" width="28" height="16" aria-hidden="true">
        <path d="M14,8 Q6,0 2,4 Q6,12 14,8 Z" fill="#c8b890" opacity="0.65"/>
        <path d="M14,8 Q22,0 26,4 Q22,12 14,8 Z" fill="#c8b890" opacity="0.65"/>
        <line x1="12" y1="6" x2="8" y2="2" stroke="#a09070" strokeWidth="0.8"/>
        <line x1="16" y1="6" x2="20" y2="2" stroke="#a09070" strokeWidth="0.8"/>
      </svg>
    </div>
  ),
};

/**
 * @param {object} props
 * @param {string[]} props.ambient     list of preset ids from biome config
 * @param {boolean}  [props.calmMode]  disables all animations
 */
export default function AmbientLayer({ ambient = [], calmMode = false }) {
  const active = ambient.filter(id => ELEMENTS[id]);
  if (active.length === 0) return null;
  return (
    <div
      className="ambient-layer"
      data-calm={calmMode ? 'true' : undefined}
      aria-hidden="true"
    >
      {active.map(id => {
        const El = ELEMENTS[id];
        return <El key={id} />;
      })}
    </div>
  );
}
```

- [ ] **Step 4: Implement `AmbientLayer.css`.**

```css
/* src/components/world/AmbientLayer.css */
.ambient-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

/* ---- Lantern flicker ---- */
.ambient-lantern-wrap {
  position: absolute;
  left: 44%;
  top: 58%;
  transform: translateX(-50%);
}
.ambient-lantern-flame {
  transform-origin: center bottom;
  animation: ambient-flicker 2.2s ease-in-out infinite;
}
@keyframes ambient-flicker {
  0%,100% { transform: scaleX(1)   scaleY(1);   opacity: 0.9; }
  25%      { transform: scaleX(0.9) scaleY(1.08); opacity: 1;   }
  50%      { transform: scaleX(1.1) scaleY(0.92); opacity: 0.85;}
  75%      { transform: scaleX(0.95) scaleY(1.04);opacity: 0.95;}
}

/* ---- Leaf fall ---- */
.ambient-leaves-wrap {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.ambient-leaf {
  position: absolute;
  top: -20px;
  left: var(--leaf-x, 10%);
  animation:
    ambient-leaf-fall 7s ease-in var(--leaf-delay, 0s) infinite,
    ambient-leaf-sway 3s ease-in-out var(--leaf-delay, 0s) infinite;
}
@keyframes ambient-leaf-fall {
  0%   { top: -20px; opacity: 0; }
  10%  { opacity: 0.75; }
  90%  { opacity: 0.6; }
  100% { top: 100%; opacity: 0; }
}
@keyframes ambient-leaf-sway {
  0%,100% { transform: translateX(0)    rotate(0deg);  }
  33%     { transform: translateX(18px) rotate(12deg); }
  66%     { transform: translateX(-12px) rotate(-8deg); }
}

/* ---- Paper curl ---- */
.ambient-paper-wrap {
  position: absolute;
  bottom: 28%;
  right: 18%;
}
.ambient-paper-curl {
  width: 48px;
  height: 36px;
  border: 1px solid rgba(90,70,40,0.25);
  background: rgba(250,245,220,0.4);
  border-radius: 2px;
  transform-origin: top left;
  animation: ambient-curl 8s ease-in-out 1.5s infinite;
}
@keyframes ambient-curl {
  0%,75%,100% { transform: rotate(0deg); }
  40%         { transform: rotate(1.5deg) translateY(-2px); }
}

/* ---- Moth flutter ---- */
.ambient-moth-wrap {
  position: absolute;
  animation: ambient-moth-drift 14s ease-in-out 3s infinite;
}
.ambient-moth {
  animation: ambient-moth-wings 0.4s ease-in-out infinite alternate;
}
@keyframes ambient-moth-drift {
  0%   { top: 35%; left: 30%; opacity: 0; }
  8%   { opacity: 0.7; }
  45%  { top: 28%; left: 55%; opacity: 0.65; }
  80%  { top: 40%; left: 48%; opacity: 0.55; }
  95%  { opacity: 0; }
  100% { top: 35%; left: 30%; opacity: 0; }
}
@keyframes ambient-moth-wings {
  0%   { transform: scaleY(1);    }
  100% { transform: scaleY(0.55); }
}

/* Calm mode — disable everything */
.ambient-layer[data-calm='true'] * {
  animation: none !important;
  transition: none !important;
}

@media (prefers-reduced-motion: reduce) {
  .ambient-layer * {
    animation: none !important;
    transition: none !important;
  }
}
```

- [ ] **Step 5: Run test — confirm 4 pass.**

```bash
npx vitest run src/components/world/AmbientLayer.test.jsx
```

Expected: 4 passed.

- [ ] **Step 6: Commit.**

```bash
git add src/components/world/AmbientLayer.jsx src/components/world/AmbientLayer.css src/components/world/AmbientLayer.test.jsx
git commit -m "feat(world): <AmbientLayer> — lanternFlicker, leafFall, paperCurl, mothFlutter"
```

---

## Task 4: `<FieldFigure>` procedural character (TDD)

**Files:**
- Create: `src/components/world/FieldFigure.jsx`
- Create: `src/components/world/FieldFigure.test.jsx`

- [ ] **Step 1: Write failing test.**

```jsx
// src/components/world/FieldFigure.test.jsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import FieldFigure from './FieldFigure';

describe('<FieldFigure>', () => {
  it('renders an SVG element', () => {
    const { container } = render(<FieldFigure />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('has an accessible label', () => {
    const { container } = render(<FieldFigure label="Your field guide" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-label', 'Your field guide');
  });

  it('uses provided size', () => {
    const { container } = render(<FieldFigure size={120} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('height', '120');
  });

  it('mood=happy renders a smile arc', () => {
    const { container } = render(<FieldFigure mood="happy" />);
    const smile = container.querySelector('[data-feature="mouth-happy"]');
    expect(smile).toBeTruthy();
  });

  it('mood=neutral renders a straight mouth', () => {
    const { container } = render(<FieldFigure mood="neutral" />);
    const mouth = container.querySelector('[data-feature="mouth-neutral"]');
    expect(mouth).toBeTruthy();
  });

  it('outfit=lab renders lab-coat color body', () => {
    const { container } = render(<FieldFigure outfit="lab" />);
    const body = container.querySelector('[data-feature="body"]');
    expect(body).toHaveAttribute('fill', '#e8e8e0');
  });

  it('outfit=field renders field-vest color body', () => {
    const { container } = render(<FieldFigure outfit="field" />);
    const body = container.querySelector('[data-feature="body"]');
    expect(body).toHaveAttribute('fill', '#8a7050');
  });
});
```

- [ ] **Step 2: Run test — confirm 7 fail.**

```bash
npx vitest run src/components/world/FieldFigure.test.jsx
```

Expected: 7 failed.

- [ ] **Step 3: Implement `FieldFigure.jsx`.**

```jsx
// src/components/world/FieldFigure.jsx
// Procedural pencil-and-wash SVG character — fallback when AI portraits aren't available.

const OUTFIT_COLORS = {
  field:    '#8a7050',   // field vest — brown/tan
  lab:      '#e8e8e0',   // lab coat — off-white
  workshop: '#5a4a3a',   // workshop apron — dark brown
};

const SKIN_TONES = {
  light:   '#f0d8b8',
  medium:  '#d4a878',
  dark:    '#8a5a30',
};

const HAIR_TONES = {
  light:  '#c8a850',
  dark:   '#3a2a18',
  grey:   '#9a9a90',
  auburn: '#8a4020',
};

/**
 * @param {object} props
 * @param {'light'|'medium'|'dark'}    [props.skinTone='medium']
 * @param {'light'|'dark'|'grey'|'auburn'} [props.hairTone='dark']
 * @param {'field'|'lab'|'workshop'}   [props.outfit='field']
 * @param {'neutral'|'happy'|'curious'} [props.mood='happy']
 * @param {number}  [props.size=80]    height in px; width scales proportionally
 * @param {string}  [props.label]      accessible aria-label
 * @param {string}  [props.className]
 */
export default function FieldFigure({
  skinTone = 'medium',
  hairTone = 'dark',
  outfit   = 'field',
  mood     = 'happy',
  size     = 80,
  label    = 'Field guide character',
  className = '',
}) {
  const skin  = SKIN_TONES[skinTone]  ?? SKIN_TONES.medium;
  const hair  = HAIR_TONES[hairTone]  ?? HAIR_TONES.dark;
  const body  = OUTFIT_COLORS[outfit] ?? OUTFIT_COLORS.field;
  const w     = Math.round(size * 0.65);

  return (
    <svg
      viewBox="0 0 52 80"
      width={w}
      height={size}
      aria-label={label}
      role="img"
      className={`field-figure ${className}`}
      style={{ overflow: 'visible' }}
    >
      {/* Hair */}
      <ellipse cx="26" cy="16" rx="13" ry="14" fill={hair} opacity="0.95"/>

      {/* Head */}
      <ellipse cx="26" cy="19" rx="11" ry="12" fill={skin}/>

      {/* Eyes */}
      <circle cx="22" cy="18" r="1.4" fill="#3a2a18"/>
      <circle cx="30" cy="18" r="1.4" fill="#3a2a18"/>
      {/* Eye shine */}
      <circle cx="22.7" cy="17.4" r="0.5" fill="white" opacity="0.8"/>
      <circle cx="30.7" cy="17.4" r="0.5" fill="white" opacity="0.8"/>

      {/* Mouth */}
      {mood === 'happy' && (
        <path
          data-feature="mouth-happy"
          d="M22,23 Q26,27 30,23"
          stroke="#5a3a20"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />
      )}
      {mood === 'neutral' && (
        <line
          data-feature="mouth-neutral"
          x1="22" y1="23.5" x2="30" y2="23.5"
          stroke="#5a3a20"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      )}
      {mood === 'curious' && (
        <path
          data-feature="mouth-curious"
          d="M22,24 Q24,22 26,23.5 Q28,25 30,23"
          stroke="#5a3a20"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />
      )}

      {/* Neck */}
      <rect x="23" y="29" width="6" height="5" rx="1" fill={skin}/>

      {/* Body / outfit */}
      <rect data-feature="body" x="14" y="34" width="24" height="26" rx="5" fill={body}/>

      {/* Outfit detail lines */}
      <line x1="26" y1="34" x2="26" y2="60" stroke="rgba(0,0,0,0.1)" strokeWidth="0.8"/>
      {outfit === 'lab' && (
        <rect x="21" y="36" width="10" height="6" rx="1" fill="#d0d0c8" opacity="0.7"/>
      )}
      {outfit === 'field' && (
        <>
          <rect x="18" y="37" width="6" height="4" rx="1" fill="#6a5238" opacity="0.6"/>
          <rect x="28" y="37" width="6" height="4" rx="1" fill="#6a5238" opacity="0.6"/>
        </>
      )}
      {outfit === 'workshop' && (
        <rect x="20" y="35" width="12" height="20" rx="2" fill="#3a2a18" opacity="0.3"/>
      )}

      {/* Arms */}
      <rect x="6"  y="34" width="10" height="5" rx="3" fill={body} transform="rotate(-15 11 36.5)"/>
      <rect x="36" y="34" width="10" height="5" rx="3" fill={body} transform="rotate(15 41 36.5)"/>

      {/* Hands */}
      <circle cx="8"  cy="44" r="4" fill={skin}/>
      <circle cx="44" cy="44" r="4" fill={skin}/>

      {/* Legs */}
      <rect x="17" y="58" width="8" height="16" rx="4" fill={body} opacity="0.85"/>
      <rect x="27" y="58" width="8" height="16" rx="4" fill={body} opacity="0.85"/>

      {/* Boots */}
      <ellipse cx="21" cy="74" rx="6" ry="4" fill="#5a4030"/>
      <ellipse cx="31" cy="74" rx="6" ry="4" fill="#5a4030"/>

      {/* Ink outline (very subtle) */}
      <ellipse cx="26" cy="19" rx="11" ry="12" fill="none" stroke="#4a3020" strokeWidth="0.4" opacity="0.4"/>
    </svg>
  );
}
```

- [ ] **Step 4: Run test — confirm 7 pass.**

```bash
npx vitest run src/components/world/FieldFigure.test.jsx
```

Expected: 7 passed.

- [ ] **Step 5: Commit.**

```bash
git add src/components/world/FieldFigure.jsx src/components/world/FieldFigure.test.jsx
git commit -m "feat(world): <FieldFigure> procedural SVG character with mood, outfit, skin"
```

---

## Task 5: `<HotspotOverlay>` — bottom-sheet content panel

**Files:**
- Create: `src/components/world/HotspotOverlay.jsx`
- Create: `src/components/world/HotspotOverlay.css`
- Create: `src/components/world/HotspotOverlay.test.jsx`

The overlay slides up from the bottom of the screen. The content area is scrollable. For Phase 1, the guide/challenger roles embed `WorldChat`; the reflection role embeds `CampfireChat`; stage/trailheadSign/mailbox/bulletinSubmit render inline panels. These inline panels are simple placeholders that show the real data — they don't replicate the full submission UX (that's in `StudentQuestPage` behind `?view=list`).

- [ ] **Step 1: Write failing smoke tests.**

```jsx
// src/components/world/HotspotOverlay.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HotspotOverlay from './HotspotOverlay';

const baseProps = {
  role: 'trailheadSign',
  quest: { id: 'q1', title: 'Intro to Ecology', description: 'Explore local ecosystems.' },
  stage: null,
  studentSession: { studentName: 'Alex', studentId: 'sid1' },
  onClose: vi.fn(),
};

describe('<HotspotOverlay>', () => {
  it('renders without crashing', () => {
    render(<HotspotOverlay {...baseProps} />);
    expect(document.body).toBeTruthy();
  });

  it('shows quest title for trailheadSign role', () => {
    render(<HotspotOverlay {...baseProps} />);
    expect(screen.getByText('Intro to Ecology')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<HotspotOverlay {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders stage title for stage role', () => {
    render(
      <HotspotOverlay
        {...baseProps}
        role="stage"
        stage={{ id: 's1', title: 'Observe the Forest', description: 'Go outside.', challenge: 'What do you notice?', stage_number: 1 }}
      />
    );
    expect(screen.getByText('Observe the Forest')).toBeInTheDocument();
  });

  it('renders mailbox heading for mailbox role', () => {
    render(<HotspotOverlay {...baseProps} role="mailbox" submissions={[]} feedback={[]} />);
    expect(screen.getByText(/mailbox/i)).toBeInTheDocument();
  });

  it('adds data-role attribute for styling', () => {
    const { container } = render(<HotspotOverlay {...baseProps} role="guide" />);
    expect(container.querySelector('[data-role="guide"]')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test — confirm 6 fail.**

```bash
npx vitest run src/components/world/HotspotOverlay.test.jsx
```

Expected: 6 failed.

- [ ] **Step 3: Implement `HotspotOverlay.jsx`.**

Note: `WorldChat` requires `quest`, `stage`, `blueprint`, `studentSession` (as object with `.studentName`, `.studentId`, `.pin`), and callbacks. For Phase 1 we pass a minimal blueprint (null is fine — WorldChat handles it).

```jsx
// src/components/world/HotspotOverlay.jsx
import { lazy, Suspense } from 'react';
import './HotspotOverlay.css';
import Specimen from './Specimen';
import CampfireChat from '../social/CampfireChat';

// WorldChat is large — lazy-load only when guide/challenger hotspot opens
const WorldChat = lazy(() => import('./WorldChat'));

// ---- Inline panel components ----

function TrailheadPanel({ quest }) {
  return (
    <div className="ho-panel">
      <h2 className="ho-title">{quest?.title}</h2>
      <p className="ho-body">{quest?.description}</p>
    </div>
  );
}

function StagePanel({ stage, onOpenChat, studentSession }) {
  if (!stage) return <p className="ho-empty">No stage data.</p>;
  return (
    <div className="ho-panel">
      <div className="ho-stage-badge">Stage {stage.stage_number}</div>
      <h2 className="ho-title">{stage.title}</h2>
      {stage.description && <p className="ho-body">{stage.description}</p>}
      {stage.challenge && (
        <Specimen id={stage.id} pin="pin" size="md" style={{ margin: '12px 0', width: '100%', boxSizing: 'border-box' }}>
          <strong style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--graphite)' }}>YOUR CHALLENGE</strong>
          <p style={{ margin: '6px 0 0', fontFamily: 'var(--font-body)' }}>{stage.challenge}</p>
        </Specimen>
      )}
      {stage.deliverable_description && (
        <p className="ho-body" style={{ fontSize: 13, color: 'var(--graphite)' }}>
          <strong>Deliverable:</strong> {stage.deliverable_description}
        </p>
      )}
      <button className="btn btn-primary ho-cta" onClick={onOpenChat}>
        Talk to your guide →
      </button>
      <p className="ho-hint">For full submission tools, use the list view (↗ top-right).</p>
    </div>
  );
}

function MailboxPanel({ feedback = [] }) {
  return (
    <div className="ho-panel">
      <h2 className="ho-title">Mailbox</h2>
      {feedback.length === 0 ? (
        <p className="ho-empty">No feedback letters yet. Submit work to get a response.</p>
      ) : (
        <div className="ho-feedback-list">
          {feedback.map(fb => (
            <Specimen key={fb.id} id={fb.id} pin="tape" size="md"
              style={{ marginBottom: 12, width: '100%', boxSizing: 'border-box' }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--graphite)', marginBottom: 6 }}>
                Stage {fb.stage_number || '?'} feedback
              </div>
              {fb.warm_feedback && <p style={{ margin: '0 0 6px', fontFamily: 'var(--font-body)', fontSize: 14 }}>{fb.warm_feedback}</p>}
              {fb.cool_feedback && <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--graphite)' }}>{fb.cool_feedback}</p>}
            </Specimen>
          ))}
        </div>
      )}
    </div>
  );
}

function BulletinPanel() {
  return (
    <div className="ho-panel">
      <h2 className="ho-title">Submit Work</h2>
      <p className="ho-body">
        Pin your work to the bulletin board. Use the <strong>list view</strong> (↗ top-right) for the full submission uploader.
      </p>
    </div>
  );
}

function ReflectionPanel({ quest, stage, studentSession }) {
  return (
    <div className="ho-panel">
      <h2 className="ho-title">Reflection Journal</h2>
      <CampfireChat
        questId={quest?.id}
        stageId={stage?.id || null}
        studentName={studentSession?.studentName}
        studentId={studentSession?.studentId}
      />
    </div>
  );
}

function ChatPanel({ quest, stage, blueprint, studentSession, onClose, onStageComplete, mode }) {
  const session = {
    studentName: studentSession?.studentName,
    studentId:   studentSession?.studentId,
    pin:         studentSession?.pin || '',
  };
  return (
    <div className="ho-panel ho-panel--chat">
      <Suspense fallback={<p className="ho-empty">Loading guide...</p>}>
        <WorldChat
          quest={quest}
          stage={stage}
          blueprint={blueprint || null}
          studentSession={session}
          onClose={onClose}
          onStageComplete={onStageComplete}
        />
      </Suspense>
    </div>
  );
}

// ---- Role → content router ----

function OverlayContent({ role, quest, stage, studentSession, feedback, onClose, onStageComplete, onOpenChat }) {
  switch (role) {
    case 'trailheadSign':
      return <TrailheadPanel quest={quest} />;
    case 'stage':
      return <StagePanel stage={stage} onOpenChat={onOpenChat} studentSession={studentSession} />;
    case 'guide':
      return <ChatPanel quest={quest} stage={stage} studentSession={studentSession} onClose={onClose} onStageComplete={onStageComplete} mode="mentor" />;
    case 'challenger':
      return <ChatPanel quest={quest} stage={stage} studentSession={studentSession} onClose={onClose} onStageComplete={onStageComplete} mode="challenger" />;
    case 'reflection':
      return <ReflectionPanel quest={quest} stage={stage} studentSession={studentSession} />;
    case 'mailbox':
      return <MailboxPanel feedback={feedback} />;
    case 'bulletinSubmit':
      return <BulletinPanel />;
    default:
      return <p className="ho-empty">Coming soon.</p>;
  }
}

/**
 * @param {object} props
 * @param {string}  props.role             HotspotRole
 * @param {object}  props.quest
 * @param {object}  [props.stage]          active stage (for stage/guide/challenger/reflection)
 * @param {object}  props.studentSession   { studentName, studentId, pin }
 * @param {Array}   [props.feedback]       feedback rows for mailbox
 * @param {() => void} props.onClose
 * @param {() => void} [props.onStageComplete]
 */
export default function HotspotOverlay({ role, quest, stage, studentSession, feedback = [], onClose, onStageComplete }) {
  // "Talk to guide" CTA from StagePanel opens guide overlay inline (swap role)
  // We achieve this by rendering ChatPanel directly when stageOpenChat is true
  const handleOpenChat = () => {
    // Replace stage panel with guide chat in parent — parent passes role="guide"
    // For simplicity in Phase 1 we just alert; BiomeScene will handle this routing.
    // This noop keeps the overlay open; BiomeScene upgrades role on CTA.
  };

  return (
    <div className="hotspot-overlay" data-role={role} role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="hotspot-overlay__backdrop" onClick={onClose} aria-hidden="true" />

      {/* Sheet */}
      <div className="hotspot-overlay__sheet">
        <button
          className="hotspot-overlay__close"
          onClick={onClose}
          aria-label="Close"
          type="button"
        >
          ×
        </button>
        <div className="hotspot-overlay__scroll">
          <OverlayContent
            role={role}
            quest={quest}
            stage={stage}
            studentSession={studentSession}
            feedback={feedback}
            onClose={onClose}
            onStageComplete={onStageComplete}
            onOpenChat={handleOpenChat}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement `HotspotOverlay.css`.**

```css
/* src/components/world/HotspotOverlay.css */
.hotspot-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: flex-end;
}

.hotspot-overlay__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(30, 22, 12, 0.45);
  backdrop-filter: blur(2px);
}

.hotspot-overlay__sheet {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
  background: var(--paper, #fbf6e7);
  border-radius: 18px 18px 0 0;
  border-top: 2px solid var(--parchment, #e8d8b0);
  box-shadow: 0 -8px 40px rgba(30, 22, 12, 0.18);
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  animation: ho-slide-up 280ms cubic-bezier(0.34, 1.46, 0.64, 1) both;
}

@keyframes ho-slide-up {
  from { transform: translateY(100%); opacity: 0.6; }
  to   { transform: translateY(0);    opacity: 1;   }
}

.hotspot-overlay__close {
  position: absolute;
  top: 12px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: 1px solid var(--pencil, #888);
  border-radius: 50%;
  background: var(--paper);
  color: var(--graphite, #4a3f33);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  z-index: 2;
}
.hotspot-overlay__close:hover { background: var(--parchment); }
.hotspot-overlay__close:focus-visible {
  outline: 2px solid var(--compass-gold, #d6a64d);
  outline-offset: 2px;
}

.hotspot-overlay__scroll {
  overflow-y: auto;
  flex: 1;
  padding: 16px 20px 32px;
}

/* Drag handle decoration */
.hotspot-overlay__sheet::before {
  content: '';
  display: block;
  width: 40px;
  height: 4px;
  background: var(--pencil, #888);
  border-radius: 2px;
  margin: 10px auto 4px;
  opacity: 0.4;
  flex-shrink: 0;
}

/* Panel shared styles */
.ho-panel { padding: 8px 0; }
.ho-title { font-family: var(--font-display, 'Instrument Serif', serif); font-size: 22px; color: var(--ink); margin: 0 0 10px; padding-right: 36px; }
.ho-body  { font-family: var(--font-body, 'DM Sans', sans-serif); font-size: 15px; color: var(--graphite); line-height: 1.6; margin: 0 0 12px; }
.ho-empty { font-family: var(--font-body); font-size: 14px; color: var(--pencil); text-align: center; padding: 32px 0; }
.ho-hint  { font-family: var(--font-mono); font-size: 11px; color: var(--pencil); margin: 8px 0 0; }
.ho-stage-badge {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--chalk, #fff);
  background: var(--field-green, #3d7a3d);
  border-radius: 4px;
  padding: 2px 8px;
  margin-bottom: 8px;
}
.ho-cta { width: 100%; margin-top: 16px; }
.ho-feedback-list { display: flex; flex-direction: column; }
.ho-panel--chat { padding: 0; }

@media (prefers-reduced-motion: reduce) {
  .hotspot-overlay__sheet { animation: none; }
}
```

- [ ] **Step 5: Run test — confirm 6 pass.**

```bash
npx vitest run src/components/world/HotspotOverlay.test.jsx
```

Expected: 6 passed.

- [ ] **Step 6: Commit.**

```bash
git add src/components/world/HotspotOverlay.jsx src/components/world/HotspotOverlay.css src/components/world/HotspotOverlay.test.jsx
git commit -m "feat(world): <HotspotOverlay> bottom-sheet with stage/guide/mailbox/reflection panels"
```

---

## Task 6: `<BiomeScene>` — main world renderer

**Files:**
- Create: `src/components/world/BiomeScene.jsx`
- Create: `src/components/world/BiomeScene.css`
- Create: `src/components/world/BiomeScene.test.jsx`

`BiomeScene` wires everything: `ParallaxScene` + `Hotspot` array + `AmbientLayer` + `FieldFigure` at the guide position + `HotspotOverlay` when a hotspot is active. It reads the biome config from the registry, matches stage hotspots to stage data, and computes each hotspot's state.

- [ ] **Step 1: Write failing smoke test.**

```jsx
// src/components/world/BiomeScene.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BiomeScene from './BiomeScene';

// Suppress fetch errors from ParallaxScene img elements
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });

const quest = {
  id: 'q1',
  title: 'Intro to Ecology',
  description: 'Explore ecosystems.',
  biome_id: 'campsite',
  character_image_url: null,
};

const stages = [
  { id: 's1', stage_number: 1, title: 'Observe', status: 'active',    biomeState: 'active' },
  { id: 's2', stage_number: 2, title: 'Analyze', status: 'locked',   biomeState: 'future' },
  { id: 's3', stage_number: 3, title: 'Reflect',  status: 'locked',   biomeState: 'future' },
];

const session = { studentName: 'Alex', studentId: 'sid1', pin: '' };

describe('<BiomeScene>', () => {
  it('renders without crashing', () => {
    render(<BiomeScene quest={quest} stages={stages} studentSession={session} />);
    expect(document.body).toBeTruthy();
  });

  it('renders hotspot buttons (at least one per campsite config)', () => {
    render(<BiomeScene quest={quest} stages={stages} studentSession={session} />);
    const buttons = document.querySelectorAll('button.hotspot');
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it('first stage hotspot has data-state=active', () => {
    render(<BiomeScene quest={quest} stages={stages} studentSession={session} />);
    const active = document.querySelector('button.hotspot[data-role="stage"][data-state="active"]');
    expect(active).toBeTruthy();
  });

  it('later stage hotspots have data-state=future', () => {
    render(<BiomeScene quest={quest} stages={stages} studentSession={session} />);
    const future = document.querySelectorAll('button.hotspot[data-state="future"]');
    expect(future.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test — confirm 4 fail.**

```bash
npx vitest run src/components/world/BiomeScene.test.jsx
```

Expected: 4 failed.

- [ ] **Step 3: Implement `BiomeScene.jsx`.**

```jsx
// src/components/world/BiomeScene.jsx
import { useState, useCallback } from 'react';
import './BiomeScene.css';
import { getBiome } from '../../biomes';
import ParallaxScene from './ParallaxScene';
import Hotspot from './Hotspot';
import AmbientLayer from './AmbientLayer';
import FieldFigure from './FieldFigure';
import HotspotOverlay from './HotspotOverlay';
import { WorldStateProvider, useWorldState } from './WorldStateContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const ROLE_LABELS = {
  trailheadSign:  'Driving question — tap to read',
  stage:          'Stage',
  guide:          'Talk to your field guide',
  bulletinSubmit: 'Submit your work here',
  mailbox:        'Check your mailbox',
  challenger:     'A stranger approaches',
  reflection:     'Open your reflection journal',
  stretch:        'Side trail — stretch challenge',
  teammate:       'Teammate',
  parentLetter:   'Letter from home',
};

/**
 * Map biome config hotspots + stage data to rendered Hotspot state.
 * @param {object[]} configHotspots  — from biome config
 * @param {object[]} stages          — from useBiomeQuest (with biomeState)
 */
function resolveHotspots(configHotspots, stages) {
  return configHotspots.map((h, i) => {
    let state = 'active';
    let stageData = null;
    if (h.role === 'stage') {
      stageData = stages[h.stageIndex] ?? null;
      state = stageData ? stageData.biomeState : 'future';
    }
    return { ...h, configIndex: i, state, stageData };
  });
}

function SceneInner({ quest, stages, studentSession, onStageComplete, feedback }) {
  const cfg = getBiome(quest?.biome_id || 'campsite') ?? getBiome('campsite');
  const systemReduced = useReducedMotion();
  const { zoomedHotspot, zoomTo, zoomOut } = useWorldState();
  const [igniting, setIgniting] = useState(null);  // hotspot configIndex currently igniting

  const resolved = resolveHotspots(cfg.hotspots, stages);

  // Find which resolved hotspot is zoomed
  const activeHotspot = resolved.find(h => zoomedHotspot === `${h.role}-${h.configIndex}`);

  // Find guide hotspot position for FieldFigure placement
  const guideHotspot = cfg.hotspots.find(h => h.role === 'guide');

  const handleActivate = useCallback((h) => {
    zoomTo(`${h.role}-${h.configIndex}`);
  }, [zoomTo]);

  const handleStageComplete = useCallback((stageId) => {
    // Find the next locked stage hotspot and trigger ignite animation
    const completedIdx = resolved.findIndex(h => h.role === 'stage' && h.stageData?.id === stageId);
    if (completedIdx >= 0) {
      const nextStageH = resolved.find((h, i) => i > completedIdx && h.role === 'stage' && h.state === 'future');
      if (nextStageH) {
        setIgniting(nextStageH.configIndex);
        setTimeout(() => setIgniting(null), 800);
      }
    }
    onStageComplete?.(stageId);
    zoomOut();
  }, [resolved, onStageComplete, zoomOut]);

  return (
    <div className="biome-scene">
      <ParallaxScene layers={cfg.layers} calmMode={systemReduced}>
        <AmbientLayer ambient={cfg.ambient} calmMode={systemReduced} />

        {/* FieldFigure at guide hotspot position */}
        {guideHotspot && (
          <div
            className="biome-scene__figure"
            style={{ left: guideHotspot.x, top: guideHotspot.y }}
            aria-hidden="true"
          >
            <FieldFigure
              skinTone="medium"
              hairTone="dark"
              outfit="field"
              mood="happy"
              size={72}
              label="Your field guide"
            />
          </div>
        )}

        {/* Hotspots */}
        {resolved.map((h) => (
          <Hotspot
            key={`${h.role}-${h.configIndex}`}
            id={`${h.role}-${h.configIndex}`}
            role={h.role}
            x={h.x}
            y={h.y}
            label={h.role === 'stage' && h.stageData ? h.stageData.title : ROLE_LABELS[h.role] ?? h.role}
            state={h.state}
            igniting={igniting === h.configIndex}
            onActivate={() => handleActivate(h)}
          />
        ))}
      </ParallaxScene>

      {/* Overlay */}
      {activeHotspot && (
        <HotspotOverlay
          role={activeHotspot.role}
          quest={quest}
          stage={activeHotspot.stageData}
          studentSession={studentSession}
          feedback={feedback}
          onClose={zoomOut}
          onStageComplete={handleStageComplete}
        />
      )}
    </div>
  );
}

/**
 * @param {object} props
 * @param {object}   props.quest
 * @param {object[]} props.stages          from useBiomeQuest
 * @param {object}   props.studentSession  { studentName, studentId, pin }
 * @param {object[]} [props.feedback]      feedback letters for mailbox
 * @param {() => void} [props.onStageComplete]
 */
export default function BiomeScene({ quest, stages, studentSession, feedback = [], onStageComplete }) {
  return (
    <WorldStateProvider>
      <SceneInner
        quest={quest}
        stages={stages}
        studentSession={studentSession}
        feedback={feedback}
        onStageComplete={onStageComplete}
      />
    </WorldStateProvider>
  );
}
```

- [ ] **Step 4: Implement `BiomeScene.css`.**

```css
/* src/components/world/BiomeScene.css */
.biome-scene {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

/* FieldFigure positioned at guide hotspot */
.biome-scene__figure {
  position: absolute;
  transform: translate(-50%, -100%);
  pointer-events: none;
  z-index: 2;
}
```

- [ ] **Step 5: Add `igniting` prop to `<Hotspot>`.**

Open `src/components/world/Hotspot.jsx`. Add the `igniting` prop and a CSS animation class:

```jsx
// src/components/world/Hotspot.jsx — updated signature:
export default function Hotspot({ id, role, x, y, label, state = 'active', onActivate, igniting = false }) {
  const disabled = state === 'future';
  return (
    <button
      type="button"
      className={`hotspot${igniting ? ' hotspot--igniting' : ''}`}
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

Add to `src/components/world/Hotspot.css`:

```css
/* Append to existing Hotspot.css */
.hotspot--igniting {
  animation: hotspot-ignite 800ms ease-out forwards;
}
@keyframes hotspot-ignite {
  0%   { box-shadow: 0 0 0 0   rgba(214,166,77,0.9);  border-color: var(--compass-gold, #d6a64d); }
  30%  { box-shadow: 0 0 0 24px rgba(214,166,77,0.5); border-color: var(--compass-gold, #d6a64d); }
  100% { box-shadow: 0 0 0 0   rgba(214,166,77,0);    border-color: var(--graphite, #4a3f33); }
}
```

- [ ] **Step 6: Run test — confirm 4 pass.**

```bash
npx vitest run src/components/world/BiomeScene.test.jsx
```

Expected: 4 passed.

- [ ] **Step 7: Run full test suite.**

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 8: Commit.**

```bash
git add src/components/world/BiomeScene.jsx src/components/world/BiomeScene.css src/components/world/BiomeScene.test.jsx src/components/world/Hotspot.jsx src/components/world/Hotspot.css
git commit -m "feat(world): <BiomeScene> wires all Phase-0 primitives to real quest data"
```

---

## Task 7: `<BiomePage>` — router entry with view mode dispatch

**Files:**
- Create: `src/pages/student/BiomePage.jsx`

- [ ] **Step 1: Implement `BiomePage.jsx`.**

No unit test for the page itself — integration verified manually in Task 8 (after routing is wired). The component is thin: it reads params, fetches data, and delegates to `BiomeScene` or `StudentQuestPage`.

```jsx
// src/pages/student/BiomePage.jsx
import { lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useViewMode } from '../../hooks/useViewMode';
import { useBiomeQuest } from '../../hooks/useBiomeQuest';
import { getStudentSession } from '../../lib/studentSession';
import BiomeScene from '../../components/world/BiomeScene';

// List view is the full existing page — only loaded when explicitly requested
const StudentQuestPage = lazy(() => import('./StudentQuestPage'));

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--paper, #fbf6e7)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 32, height: 32, border: '3px solid var(--pencil)', borderTopColor: 'var(--compass-gold)',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
        }}/>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--graphite)', fontSize: 14 }}>
          Entering the world…
        </p>
      </div>
    </div>
  );
}

function ErrorScreen({ message }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--paper)' }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--graphite)' }}>
          {message || 'Could not load this project.'}
        </p>
        <a href="?view=list" style={{ color: 'var(--lab-blue)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          Switch to list view →
        </a>
      </div>
    </div>
  );
}

export default function BiomePage() {
  const { id } = useParams();
  const { isWorld } = useViewMode();

  // List view — render the existing full page instead
  if (!isWorld) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <StudentQuestPage />
      </Suspense>
    );
  }

  return <BiomePageWorld questId={id} />;
}

function BiomePageWorld({ questId }) {
  const { quest, stages, loading, error, refreshStages } = useBiomeQuest(questId);
  const studentSession = getStudentSession() || {};

  if (loading) return <LoadingScreen />;
  if (error || !quest) return <ErrorScreen message={error?.message} />;

  return (
    <BiomeScene
      quest={quest}
      stages={stages}
      studentSession={studentSession}
      onStageComplete={refreshStages}
    />
  );
}
```

- [ ] **Step 2: Commit.**

```bash
git add src/pages/student/BiomePage.jsx
git commit -m "feat(world): <BiomePage> router entry — world view default, list view fallback"
```

---

## Task 8: Wire App.jsx routing

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add `BiomePage` import and update the `/q/:id` route.**

In `src/App.jsx`:

1. Add the lazy import (after line 22, near other student imports):
```jsx
const BiomePage = lazy(() => import('./pages/student/BiomePage.jsx'));
```

2. Change the `/q/:id` route (currently line 70):
```jsx
// Before:
<Route path="/q/:id" element={<StudentQuestPage />} />

// After:
<Route path="/q/:id" element={<BiomePage />} />
```

3. Remove the `/q/:questId/world-preview` route (line 71) — it's superseded by the real route:
```jsx
// Remove this line:
<Route path="/q/:questId/world-preview" element={<BiomePreview />} />
```

4. Also remove the `BiomePreview` import (line 41):
```jsx
// Remove this line:
const BiomePreview = lazy(() => import('./pages/student/_BiomePreview.jsx'));
```

- [ ] **Step 2: Verify the build.**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds with no errors. (Warnings about unused imports are fine.)

- [ ] **Step 3: Verify in dev server.**

```bash
npm run dev
```

Open `http://localhost:3001/q/<a-real-quest-id>` as a student. Expected:
- Default: campsite biome loads with the new illustrated SVG layers, hotspots, FieldFigure, and ambient motion.
- Add `?view=list` to the URL: the existing `StudentQuestPage` loads instead.
- Tab key: cycles through hotspots.
- Click an active hotspot: overlay slides up with appropriate content.
- Click `×` or backdrop: overlay closes.

- [ ] **Step 4: Run full test suite.**

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 5: Commit.**

```bash
git add src/App.jsx
git commit -m "feat(world): wire /q/:id to BiomePage — biome world default, ?view=list fallback"
```

---

## Task 9: Feedback letters in mailbox

**Files:**
- Modify: `src/pages/student/BiomePage.jsx`
- Modify: `src/components/world/BiomeScene.jsx`

The mailbox hotspot needs the learner's feedback letters. We fetch them inside `BiomePageWorld` and pass them through `BiomeScene` to `HotspotOverlay`.

- [ ] **Step 1: Add feedback fetch to `BiomePageWorld`.**

In `src/pages/student/BiomePage.jsx`, update the imports and `BiomePageWorld`:

```jsx
// Add to imports at the top of the file:
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
```

Replace `BiomePageWorld` with:

```jsx
function BiomePageWorld({ questId }) {
  const { quest, stages, loading, error, refreshStages } = useBiomeQuest(questId);
  const studentSession = getStudentSession() || {};
  const [feedback, setFeedback] = useState([]);

  useEffect(() => {
    if (!questId) return;
    const studentId = studentSession.studentId || null;
    const name      = studentSession.studentName || null;
    let q = supabase
      .from('submission_feedback')
      .select('*')
      .eq('quest_id', questId)
      .order('created_at', { ascending: false });
    if (studentId) q = q.eq('student_id', studentId);
    else if (name)  q = q.eq('student_name', name);
    q.then(({ data }) => setFeedback(data || []));
  }, [questId, studentSession.studentId, studentSession.studentName]);

  if (loading) return <LoadingScreen />;
  if (error || !quest) return <ErrorScreen message={error?.message} />;

  return (
    <BiomeScene
      quest={quest}
      stages={stages}
      studentSession={studentSession}
      feedback={feedback}
      onStageComplete={refreshStages}
    />
  );
}
```

- [ ] **Step 2: Verify mailbox shows feedback.**

In dev server, navigate to a quest that has submission feedback. Open the mailbox hotspot (right side of scene). Expected: feedback letters render as `<Specimen>` cards with warm/cool text.

- [ ] **Step 3: Commit.**

```bash
git add src/pages/student/BiomePage.jsx
git commit -m "feat(world): fetch feedback letters and display in mailbox overlay"
```

---

## Task 10: Phase 1 acceptance gate

Manual verification + gate checklist before declaring Phase 1 done.

- [ ] **Step 1: Run full test suite.**

```bash
cd "/Users/md/Quest Lab/quest-lab-world-upgrade"
npm run test:run
```

Expected: **all 53+ tests pass** (42 from Phase 0 + ~11 new).

- [ ] **Step 2: Build check.**

```bash
npm run build 2>&1 | tail -30
```

Expected: clean build, no errors.

- [ ] **Step 3: Manual end-to-end gate.**

Start dev server: `npm run dev`

Run through this checklist as a student (use a real quest in dev/staging Supabase):

- [ ] Navigate to `/q/<quest-id>` — campsite biome loads with illustrated SVG layers (not the old solid-color rectangles)
- [ ] Three parallax layers shift subtly on mouse movement
- [ ] Campfire flame flickers; moth drifts across scene; leaves occasionally fall
- [ ] FieldFigure character appears near the guide hotspot position
- [ ] Stage 1 hotspot has pulsing red dot (active state); later stages are dimmer (future state)
- [ ] Tab key cycles through all hotspot buttons; Enter activates the focused one
- [ ] Tap trailhead sign → overlay slides up showing quest title + description
- [ ] Tap stage 1 hotspot → overlay shows stage title, challenge text, "Talk to your guide" button
- [ ] Tap guide hotspot → overlay shows WorldChat (loads lazy, shows loading state briefly)
- [ ] Send a message to the guide → AI responds in WorldChat
- [ ] Tap mailbox → feedback letters appear if any exist; "no feedback yet" message if not
- [ ] Tap reflection journal → CampfireChat renders
- [ ] Tap × or backdrop → overlay closes and returns to full biome view
- [ ] Append `?view=list` → full `StudentQuestPage` renders with all existing functionality
- [ ] Enable system reduced-motion → parallax stops, pulse animation stops, ambient animations stop

- [ ] **Step 4: Commit acceptance gate notes (optional).**

```bash
git commit --allow-empty -m "chore: Phase 1 acceptance gate passed — campsite end-to-end verified"
```

- [ ] **Step 5: Push branch.**

```bash
git push origin feature/illustrated-world
```

---

## Phase 1 acceptance summary

Phase 1 is complete when:
1. All tests pass
2. Build is clean
3. Manual gate checklist is fully checked
4. A real learner can: land in the campsite, read their driving question, enter a stage, chat with the AI guide, check the mailbox for feedback, and open the reflection journal — entirely within the illustrated world
5. `?view=list` provides full parity with the existing `StudentQuestPage`

---

## Phases 2–6 outline (re-plan before starting)

These are **acceptance gates only**. Write a new detailed plan for each phase before starting it.

### Phase 2 — AI image-gen for characters + decor
`ai.generateProjectArt()` helper calling fal.ai. QuestBuilder Step 5 biome picker + Step 6 publish-time generation modal. Cache results in `quests.character_image_url` and `quest_decor` table. Fallback: `<FieldFigure>`. **Gate:** new quests publish with bespoke AI-generated character portrait; old quests fall back cleanly.

### Phase 3 — Tactile 3D props
`<TactileProp>` portal mounting `react-three-fiber` `<Canvas>` on hotspot zoom. Five GLB props: lantern, journal, specimenJar, mailbox, tent. Single-canvas guarantee. **Gate:** tapping the stage-1 lantern shows a rotatable 3D lantern model.

### Phase 4 — Field Station hub (`/station`)
New `/station` route replacing `/student`. Hub parallax scene with wall map, specimen cabinet, bulletin board, door, window. Biome travel from the map. **Gate:** learner logs in, lands in Station, travels to campsite from map.

### Phase 5 — Lab + Workshop biomes
Two more SVG trios + biome configs. No new renderer code. Auto-suggest covers all three biomes. **Gate:** three biomes render and hotspot configs validate cleanly.

### Phase 6 — Polish + parent peek-in
Parent dashboard view-into-biome. Group teammates as additional tent hotspots. Accessibility audit. Performance budget verification.
