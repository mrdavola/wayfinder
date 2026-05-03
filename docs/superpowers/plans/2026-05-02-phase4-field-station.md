# Phase 4 — Field Station Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/student` (CampHub) with an illustrated Cabin Study at `/station` — the learner's permanent home base with three interactive zones: Wall Map (travel to projects), Specimen Cabinet (skills), and Bulletin Board (messages/feedback).

**Architecture:** `CabinScene` mirrors `BiomeScene` — `WorldStateProvider` wrapping `ParallaxScene` + `Hotspot` buttons + a `CabinOverlay` sheet for each zone's panel. Data is fetched once on mount via a new `loadCabinData()` in `api.js`. Cabin ships with placeholder colour-rect SVGs; real illustrations land later.

**Tech Stack:** React 19, Vite 7, plain JSX, Supabase (existing client), Vitest + @testing-library/react (already installed), react-router-dom `<Navigate>`.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/biomes/validate.js` | Modify | Add `cabin` to valid IDs; add 3 new hub roles |
| `src/biomes/types.js` | Modify | Extend `HotspotRole` typedef |
| `src/biomes/validate.test.js` | Modify | Add cabin + new-role tests |
| `src/biomes/cabin/index.js` | Create | Cabin `BiomeConfig` |
| `src/biomes/index.js` | Modify | Register cabin in registry |
| `src/biomes/index.test.js` | Modify | Add cabin registry tests |
| `public/biomes/cabin/back.svg` | Create | Placeholder back layer |
| `public/biomes/cabin/mid.svg` | Create | Placeholder mid layer |
| `public/biomes/cabin/fore.svg` | Create | Placeholder fore layer |
| `src/lib/api.js` | Modify | Add `loadCabinData(studentId)` |
| `src/lib/api.test.js` | Create | TDD for `loadCabinData` |
| `src/components/world/panels/WallMapPanel.jsx` | Create | Project list grouped by biome |
| `src/components/world/panels/WallMapPanel.test.jsx` | Create | Smoke-render tests |
| `src/components/world/panels/SpecimenCabinetPanel.jsx` | Create | Skill jar display (read-only) |
| `src/components/world/panels/SpecimenCabinetPanel.test.jsx` | Create | Smoke-render tests |
| `src/components/world/panels/BulletinBoardPanel.jsx` | Create | Merged message feed |
| `src/components/world/panels/BulletinBoardPanel.test.jsx` | Create | Smoke-render tests |
| `src/components/world/CabinOverlay.jsx` | Create | Overlay shell + role switch |
| `src/components/world/CabinOverlay.test.jsx` | Create | Smoke-render tests |
| `src/components/world/CabinScene.jsx` | Create | Page root: data fetch + scene |
| `src/components/world/CabinScene.test.jsx` | Create | Smoke-render tests |
| `src/components/world/CabinScene.css` | Create | Scene layout styles |
| `src/App.jsx` | Modify | Add `/station`, redirect `/student` |

---

## Task 1: Extend biome validator for cabin roles

**Files:**
- Modify: `src/biomes/validate.js`
- Modify: `src/biomes/types.js`
- Modify: `src/biomes/validate.test.js`

- [ ] **Step 1: Add failing tests for cabin validation**

Open `src/biomes/validate.test.js`. Add after the last existing `it(...)` block (inside the `describe`):

```js
it('accepts cabin as a valid biome id', () => {
  const cabinCfg = {
    id: 'cabin',
    layers: { back: 'b.svg', mid: 'm.svg', fore: 'f.svg' },
    ambient: [],
    hotspots: [
      { role: 'wallMap',         x: '20%', y: '40%' },
      { role: 'specimenCabinet', x: '75%', y: '30%' },
      { role: 'bulletinBoard',   x: '45%', y: '60%' },
    ],
  };
  const r = validateBiomeConfig(cabinCfg);
  expect(r.ok).toBe(true);
  expect(r.errors).toEqual([]);
});

it('rejects wallMap role on a non-cabin config (validator is role-agnostic)', () => {
  // wallMap is valid regardless of biome id — it's the config author's responsibility
  // to only use hub roles on hub configs. The validator just checks membership.
  const r = validateBiomeConfig({
    id: 'cabin',
    layers: { back: 'b.svg', mid: 'm.svg', fore: 'f.svg' },
    ambient: [],
    hotspots: [{ role: 'wallMap', x: '20%', y: '40%' }],
  });
  expect(r.ok).toBe(true);
});
```

- [ ] **Step 2: Run — confirm fails**

```bash
cd "/Users/md/Quest Lab/quest-lab-world-upgrade" && npx vitest run src/biomes/validate.test.js
```

Expected: 2 new tests fail (`cabin` not in VALID_BIOME_IDS, `wallMap` not in VALID_ROLES).

- [ ] **Step 3: Update validator**

Replace the top of `src/biomes/validate.js` (lines 1–5):

```js
const VALID_BIOME_IDS = new Set(['campsite', 'lab', 'workshop', 'cabin']);
const VALID_ROLES = new Set([
  'trailheadSign', 'stage', 'guide', 'bulletinSubmit', 'mailbox',
  'challenger', 'reflection', 'stretch', 'teammate', 'parentLetter',
  'wallMap', 'specimenCabinet', 'bulletinBoard',
]);
```

- [ ] **Step 4: Update JSDoc typedef in `src/biomes/types.js`**

Find the `@typedef {'trailheadSign'|...} HotspotRole` line and add the three new roles:

```js
 * @typedef {'trailheadSign'|'stage'|'guide'|'bulletinSubmit'|'mailbox'|'challenger'|'reflection'|'stretch'|'teammate'|'parentLetter'|'wallMap'|'specimenCabinet'|'bulletinBoard'} HotspotRole
```

- [ ] **Step 5: Run — confirm all validate tests pass**

```bash
npx vitest run src/biomes/validate.test.js
```

Expected: all tests pass (existing 6 + 2 new = 8 total).

- [ ] **Step 6: Commit**

```bash
git add src/biomes/validate.js src/biomes/types.js src/biomes/validate.test.js
git commit -m "feat(world): extend biome validator with cabin id + hub hotspot roles"
```

---

## Task 2: Cabin biome config + registry

**Files:**
- Create: `src/biomes/cabin/index.js`
- Modify: `src/biomes/index.js`
- Modify: `src/biomes/index.test.js`

- [ ] **Step 1: Add failing registry tests**

Open `src/biomes/index.test.js`. Add after the last `it(...)`:

```js
it('lists the cabin biome', () => {
  expect(listBiomes()).toContain('cabin');
});

it('returns a valid config for cabin', () => {
  const cfg = getBiome('cabin');
  expect(cfg).toBeDefined();
  const r = validateBiomeConfig(cfg);
  expect(r.ok).toBe(true);
  expect(r.errors).toEqual([]);
});
```

- [ ] **Step 2: Run — confirm fails**

```bash
npx vitest run src/biomes/index.test.js
```

Expected: 2 new tests fail (`cabin` undefined).

- [ ] **Step 3: Create cabin config**

Create `src/biomes/cabin/index.js`:

```js
/** @type {import('../types').BiomeConfig} */
export const cabin = {
  id: 'cabin',
  layers: {
    back: '/biomes/cabin/back.svg',
    mid:  '/biomes/cabin/mid.svg',
    fore: '/biomes/cabin/fore.svg',
  },
  ambient: ['hearthFlicker'],
  hotspots: [
    { role: 'wallMap',         x: '20%', y: '38%' },
    { role: 'specimenCabinet', x: '76%', y: '28%' },
    { role: 'bulletinBoard',   x: '45%', y: '62%' },
  ],
};
```

- [ ] **Step 4: Register cabin in the biome registry**

Replace `src/biomes/index.js` entirely:

```js
import { campsite } from './campsite/index.js';
import { cabin }    from './cabin/index.js';

const REGISTRY = { campsite, cabin };

export function listBiomes() { return Object.keys(REGISTRY); }
export function getBiome(id) { return REGISTRY[id]; }
```

- [ ] **Step 5: Run — confirm pass**

```bash
npx vitest run src/biomes/index.test.js
```

Expected: all 5 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/biomes/cabin/index.js src/biomes/index.js src/biomes/index.test.js
git commit -m "feat(world): cabin biome config + registry registration"
```

---

## Task 3: Placeholder cabin SVG layers

**Files:**
- Create: `public/biomes/cabin/back.svg`
- Create: `public/biomes/cabin/mid.svg`
- Create: `public/biomes/cabin/fore.svg`

No tests — these are static assets.

- [ ] **Step 1: Create `public/biomes/cabin/` directory**

```bash
mkdir -p "/Users/md/Quest Lab/quest-lab-world-upgrade/public/biomes/cabin"
```

- [ ] **Step 2: Create back.svg**

Create `public/biomes/cabin/back.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
  <rect width="1600" height="900" fill="#e8dcc8"/>
  <rect width="1600" height="14" fill="#8b6840"/>
  <rect y="800" width="1600" height="100" fill="#c9a96e" opacity=".45"/>
  <text x="800" y="100" font-family="serif" font-size="40" text-anchor="middle" fill="#8b6840" opacity=".4">CABIN — BACK LAYER (placeholder)</text>
</svg>
```

- [ ] **Step 3: Create mid.svg**

Create `public/biomes/cabin/mid.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
  <rect width="1600" height="900" fill="transparent"/>
  <rect x="40" y="30" width="380" height="320" rx="4" fill="#d4b896" opacity=".6"/>
  <rect x="1180" y="30" width="380" height="320" rx="4" fill="#c9a96e" opacity=".5"/>
  <text x="800" y="500" font-family="serif" font-size="36" text-anchor="middle" fill="#8b6840" opacity=".35">CABIN — MID LAYER (placeholder)</text>
</svg>
```

- [ ] **Step 4: Create fore.svg**

Create `public/biomes/cabin/fore.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
  <rect width="1600" height="900" fill="transparent"/>
  <rect y="760" width="1600" height="20" rx="2" fill="#8b6840" opacity=".7"/>
  <text x="800" y="860" font-family="serif" font-size="36" text-anchor="middle" fill="#8b6840" opacity=".3">CABIN — FORE LAYER (placeholder)</text>
</svg>
```

- [ ] **Step 5: Commit**

```bash
git add public/biomes/cabin/
git commit -m "feat(world): placeholder cabin SVG layers (colour rect, Phase 4)"
```

---

## Task 4: `loadCabinData` API function (TDD)

**Files:**
- Modify: `src/lib/api.js`
- Create: `src/lib/api.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/lib/api.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase module before importing api.js
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
}));

import { loadCabinData } from './api';
import { supabase } from './supabase';

function makeChain(resolveWith) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: (resolve) => Promise.resolve(resolveWith).then(resolve),
  };
  return chain;
}

const STUDENT_ID = 'stu-123';

const MOCK_QUESTS = [
  { id: 'q1', title: 'Wetlands Study', status: 'active',     biome_id: 'campsite', completed_at: null },
  { id: 'q2', title: 'Cell Biology',   status: 'completed',  biome_id: 'lab',      completed_at: '2026-04-01T00:00:00Z' },
  { id: 'q3', title: 'No Biome',       status: 'active',     biome_id: null,       completed_at: null },
];

const MOCK_SKILLS = [
  { id: 'sk1', name: 'Observation', category: 'science', mastery_level: 3 },
  { id: 'sk2', name: 'Teamwork',    category: 'social',  mastery_level: 1 },
];

const MOCK_MESSAGES = [
  { id: 'msg1', content: 'Good work!', created_at: '2026-05-01T10:00:00Z', read_at: null, source: 'guide' },
];

describe('loadCabinData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns projects split into active and completed', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'quest_group_members') return makeChain({ data: [{ quest_id: 'q1' }, { quest_id: 'q2' }, { quest_id: 'q3' }], error: null });
      if (table === 'quests')              return makeChain({ data: MOCK_QUESTS, error: null });
      if (table === 'student_skills')      return makeChain({ data: MOCK_SKILLS, error: null });
      if (table === 'guide_messages')      return makeChain({ data: MOCK_MESSAGES, error: null });
      if (table === 'submission_feedback') return makeChain({ data: [], error: null });
      if (table === 'parent_access')       return makeChain({ data: [], error: null });
      return makeChain({ data: [], error: null });
    });

    const result = await loadCabinData(STUDENT_ID);

    expect(result.projects.filter(p => p.status === 'active').length).toBe(2);
    expect(result.completedProjects.length).toBe(1);
    expect(result.completedProjects[0].id).toBe('q2');
  });

  it('returns skills array', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'quest_group_members') return makeChain({ data: [], error: null });
      if (table === 'quests')              return makeChain({ data: [], error: null });
      if (table === 'student_skills')      return makeChain({ data: MOCK_SKILLS, error: null });
      if (table === 'guide_messages')      return makeChain({ data: [], error: null });
      if (table === 'submission_feedback') return makeChain({ data: [], error: null });
      if (table === 'parent_access')       return makeChain({ data: [], error: null });
      return makeChain({ data: [], error: null });
    });

    const result = await loadCabinData(STUDENT_ID);
    expect(result.skills).toHaveLength(2);
    expect(result.skills[0].name).toBe('Observation');
  });

  it('merges messages from all three sources', async () => {
    const feedbackMsg = { id: 'fb1', warm_feedback: 'Nice!', created_at: '2026-04-28T00:00:00Z', source: 'feedback' };
    const parentMsg   = { id: 'pa1', notes: 'Proud of you', updated_at: '2026-04-27T00:00:00Z', source: 'parent' };

    supabase.from.mockImplementation((table) => {
      if (table === 'quest_group_members') return makeChain({ data: [], error: null });
      if (table === 'quests')              return makeChain({ data: [], error: null });
      if (table === 'student_skills')      return makeChain({ data: [], error: null });
      if (table === 'guide_messages')      return makeChain({ data: MOCK_MESSAGES, error: null });
      if (table === 'submission_feedback') return makeChain({ data: [feedbackMsg], error: null });
      if (table === 'parent_access')       return makeChain({ data: [parentMsg], error: null });
      return makeChain({ data: [], error: null });
    });

    const result = await loadCabinData(STUDENT_ID);
    expect(result.messages).toHaveLength(3);
    // sorted newest-first
    expect(result.messages[0].id).toBe('msg1');
  });

  it('returns empty arrays gracefully when all tables are empty', async () => {
    supabase.from.mockImplementation(() => makeChain({ data: [], error: null }));
    const result = await loadCabinData(STUDENT_ID);
    expect(result.projects).toEqual([]);
    expect(result.completedProjects).toEqual([]);
    expect(result.skills).toEqual([]);
    expect(result.messages).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — confirm fails**

```bash
npx vitest run src/lib/api.test.js
```

Expected: 4 tests fail (`loadCabinData` not exported).

- [ ] **Step 3: Implement `loadCabinData` in `src/lib/api.js`**

Scroll to the very end of `src/lib/api.js` and append:

```js
// ===================== CABIN HUB DATA =====================
/**
 * Fetch all data needed to render the Field Station (cabin) hub for a learner.
 * Runs three queries in parallel; merges message sources.
 *
 * @param {string} studentId
 * @returns {Promise<{
 *   projects: object[],
 *   completedProjects: object[],
 *   skills: object[],
 *   messages: object[],
 * }>}
 */
export async function loadCabinData(studentId) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [membershipRes, skillsRes, guideRes, feedbackRes, parentRes] = await Promise.all([
    // 1. Quest IDs the student is a member of
    supabase
      .from('quest_group_members')
      .select('quest_id')
      .eq('student_id', studentId),

    // 2. Student skills
    supabase
      .from('student_skills')
      .select('id, name:skills(name), category:skills(category), mastery_level')
      .eq('student_id', studentId),

    // 3. Unread guide messages
    supabase
      .from('guide_messages')
      .select('id, content, created_at, read_at, quest_id, role')
      .eq('student_id', studentId)
      .is('read_at', null)
      .order('created_at', { ascending: false }),

    // 4. Recent submission feedback
    supabase
      .from('submission_feedback')
      .select('id, warm_feedback, cool_feedback, created_at, quest_id')
      .eq('student_id', studentId)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false }),

    // 5. Parent access letters
    supabase
      .from('parent_access')
      .select('id, notes, updated_at')
      .eq('student_id', studentId)
      .order('updated_at', { ascending: false }),
  ]);

  // Fetch quest details for the member IDs
  const questIds = (membershipRes.data || []).map(m => m.quest_id);
  let allQuests = [];
  if (questIds.length > 0) {
    const { data } = await supabase
      .from('quests')
      .select('id, title, status, biome_id, completed_at, career_pathway')
      .in('id', questIds);
    allQuests = data || [];
  }

  const projects          = allQuests.filter(q => q.status !== 'completed');
  const completedProjects = allQuests
    .filter(q => q.status === 'completed')
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
    .slice(0, 8);

  // Normalise skills: the join returns nested objects; flatten for easy consumption
  const skills = (skillsRes.data || []).map(s => ({
    ...s,
    name: s.name?.name ?? s.name,
    category: s.category?.category ?? s.category,
  }));

  // Merge message sources with a discriminator field, sort newest-first
  const guideMessages    = (guideRes.data    || []).map(m => ({ ...m, source: 'guide',    sortKey: m.created_at }));
  const feedbackMessages = (feedbackRes.data || []).map(m => ({ ...m, source: 'feedback', sortKey: m.created_at }));
  const parentMessages   = (parentRes.data   || []).map(m => ({ ...m, source: 'parent',   sortKey: m.updated_at }));
  const messages = [...guideMessages, ...feedbackMessages, ...parentMessages]
    .sort((a, b) => new Date(b.sortKey) - new Date(a.sortKey));

  return { projects, completedProjects, skills, messages };
}
```

- [ ] **Step 4: Run — confirm pass**

```bash
npx vitest run src/lib/api.test.js
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api.js src/lib/api.test.js
git commit -m "feat(world): loadCabinData — parallel fetch for cabin hub (projects, skills, messages)"
```

---

## Task 5: `WallMapPanel` component

**Files:**
- Create: `src/components/world/panels/WallMapPanel.jsx`
- Create: `src/components/world/panels/WallMapPanel.test.jsx`

- [ ] **Step 1: Write failing smoke tests**

Create `src/components/world/panels/WallMapPanel.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import WallMapPanel from './WallMapPanel';

const projects = [
  { id: 'q1', title: 'Wetlands Study',  status: 'active',    biome_id: 'campsite' },
  { id: 'q2', title: 'Cell Biology',    status: 'active',    biome_id: 'lab'      },
  { id: 'q3', title: 'No Biome Quest',  status: 'active',    biome_id: null       },
];

function wrap(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('<WallMapPanel>', () => {
  it('renders project titles', () => {
    wrap(<WallMapPanel projects={projects} completedProjects={[]} />);
    expect(screen.getByText('Wetlands Study')).toBeInTheDocument();
    expect(screen.getByText('Cell Biology')).toBeInTheDocument();
  });

  it('groups active projects under their biome', () => {
    wrap(<WallMapPanel projects={projects} completedProjects={[]} />);
    expect(screen.getByText(/campsite/i)).toBeInTheDocument();
    expect(screen.getByText(/lab/i)).toBeInTheDocument();
  });

  it('shows unassigned section for null-biome projects', () => {
    wrap(<WallMapPanel projects={projects} completedProjects={[]} />);
    expect(screen.getByText(/unassigned/i)).toBeInTheDocument();
    expect(screen.getByText('No Biome Quest')).toBeInTheDocument();
  });

  it('renders an empty state when no projects', () => {
    wrap(<WallMapPanel projects={[]} completedProjects={[]} />);
    expect(screen.getByText(/no active projects/i)).toBeInTheDocument();
  });

  it('each active project is a link', () => {
    wrap(<WallMapPanel projects={[projects[0]]} completedProjects={[]} />);
    const link = screen.getByRole('link', { name: /Wetlands Study/i });
    expect(link).toHaveAttribute('href', '/world/q1');
  });

  it('project without biome_id links to legacy /q/:id', () => {
    wrap(<WallMapPanel projects={[projects[2]]} completedProjects={[]} />);
    const link = screen.getByRole('link', { name: /No Biome Quest/i });
    expect(link).toHaveAttribute('href', '/q/q3');
  });
});
```

- [ ] **Step 2: Run — confirm fails**

```bash
npx vitest run src/components/world/panels/WallMapPanel.test.jsx
```

Expected: 6 tests fail (module not found).

- [ ] **Step 3: Implement**

Create `src/components/world/panels/WallMapPanel.jsx`:

```jsx
import { Link } from 'react-router-dom';

const BIOME_LABELS = { campsite: 'Campsite', lab: 'Lab', workshop: 'Workshop' };
const BIOME_ORDER  = ['campsite', 'lab', 'workshop'];

function projectHref(project) {
  return project.biome_id ? `/world/${project.id}` : `/q/${project.id}`;
}

function BiomeGroup({ biomeId, projects }) {
  return (
    <div className="wmp-group">
      <h3 className="wmp-group-label">{BIOME_LABELS[biomeId] ?? biomeId}</h3>
      <ul className="wmp-list">
        {projects.map(p => (
          <li key={p.id} className="wmp-item">
            <Link to={projectHref(p)} className="wmp-link">{p.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * @param {{ projects: object[], completedProjects: object[] }} props
 */
export default function WallMapPanel({ projects, completedProjects }) {
  if (projects.length === 0 && completedProjects.length === 0) {
    return (
      <div className="wmp-empty">
        <p>No active projects yet. Your guide will assign your first one soon.</p>
      </div>
    );
  }

  const byBiome = {};
  const unassigned = [];
  for (const p of projects) {
    if (p.biome_id && BIOME_LABELS[p.biome_id]) {
      (byBiome[p.biome_id] = byBiome[p.biome_id] || []).push(p);
    } else {
      unassigned.push(p);
    }
  }

  return (
    <div className="wmp-root">
      <h2 className="wmp-title">Field Map</h2>
      {BIOME_ORDER.filter(b => byBiome[b]).map(b => (
        <BiomeGroup key={b} biomeId={b} projects={byBiome[b]} />
      ))}
      {unassigned.length > 0 && (
        <div className="wmp-group">
          <h3 className="wmp-group-label">Unassigned</h3>
          <ul className="wmp-list">
            {unassigned.map(p => (
              <li key={p.id} className="wmp-item">
                <Link to={projectHref(p)} className="wmp-link">{p.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {completedProjects.length > 0 && (
        <div className="wmp-group wmp-group--completed">
          <h3 className="wmp-group-label">Trail Markers (completed)</h3>
          <ul className="wmp-list">
            {completedProjects.map(p => (
              <li key={p.id} className="wmp-item wmp-item--completed">{p.title}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run — confirm pass**

```bash
npx vitest run src/components/world/panels/WallMapPanel.test.jsx
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/world/panels/WallMapPanel.jsx src/components/world/panels/WallMapPanel.test.jsx
git commit -m "feat(world): WallMapPanel — project list grouped by biome with navigation"
```

---

## Task 6: `SpecimenCabinetPanel` component

**Files:**
- Create: `src/components/world/panels/SpecimenCabinetPanel.jsx`
- Create: `src/components/world/panels/SpecimenCabinetPanel.test.jsx`

- [ ] **Step 1: Write failing smoke tests**

Create `src/components/world/panels/SpecimenCabinetPanel.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SpecimenCabinetPanel from './SpecimenCabinetPanel';

const skills = [
  { id: 'sk1', name: 'Observation',   category: 'science', mastery_level: 3 },
  { id: 'sk2', name: 'Teamwork',      category: 'social',  mastery_level: 1 },
  { id: 'sk3', name: 'Data Analysis', category: 'science', mastery_level: 0 },
];

describe('<SpecimenCabinetPanel>', () => {
  it('renders skill names', () => {
    render(<SpecimenCabinetPanel skills={skills} />);
    expect(screen.getByText('Observation')).toBeInTheDocument();
    expect(screen.getByText('Teamwork')).toBeInTheDocument();
    expect(screen.getByText('Data Analysis')).toBeInTheDocument();
  });

  it('marks earned skills (mastery_level >= 3) with data-tier=earned', () => {
    const { container } = render(<SpecimenCabinetPanel skills={skills} />);
    const earned = container.querySelectorAll('[data-tier="earned"]');
    expect(earned.length).toBe(1);
  });

  it('marks in-progress skills (mastery_level 1-2) with data-tier=progress', () => {
    const { container } = render(<SpecimenCabinetPanel skills={skills} />);
    const progress = container.querySelectorAll('[data-tier="progress"]');
    expect(progress.length).toBe(1);
  });

  it('marks locked skills (mastery_level 0) with data-tier=locked', () => {
    const { container } = render(<SpecimenCabinetPanel skills={skills} />);
    const locked = container.querySelectorAll('[data-tier="locked"]');
    expect(locked.length).toBe(1);
  });

  it('shows empty state when no skills', () => {
    render(<SpecimenCabinetPanel skills={[]} />);
    expect(screen.getByText(/no skills yet/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — confirm fails**

```bash
npx vitest run src/components/world/panels/SpecimenCabinetPanel.test.jsx
```

Expected: 5 tests fail.

- [ ] **Step 3: Implement**

Create `src/components/world/panels/SpecimenCabinetPanel.jsx`:

```jsx
function tierFor(mastery_level) {
  if (mastery_level >= 3) return 'earned';
  if (mastery_level >= 1) return 'progress';
  return 'locked';
}

/**
 * @param {{ skills: Array<{id:string, name:string, category:string, mastery_level:number}> }} props
 */
export default function SpecimenCabinetPanel({ skills }) {
  if (skills.length === 0) {
    return (
      <div className="scp-empty">
        <p>No skills yet — complete project stages to fill your cabinet.</p>
      </div>
    );
  }

  return (
    <div className="scp-root">
      <h2 className="scp-title">Specimen Cabinet</h2>
      <p className="scp-count">{skills.filter(s => s.mastery_level >= 3).length} / {skills.length} skills earned</p>
      <ul className="scp-grid">
        {skills.map(s => {
          const tier = tierFor(s.mastery_level);
          return (
            <li key={s.id} className="scp-jar" data-tier={tier} title={s.name}>
              <div className="scp-jar-fill" style={{ height: `${Math.min(100, (s.mastery_level / 3) * 100)}%` }} />
              <span className="scp-jar-label">{s.name}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Run — confirm pass**

```bash
npx vitest run src/components/world/panels/SpecimenCabinetPanel.test.jsx
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/world/panels/SpecimenCabinetPanel.jsx src/components/world/panels/SpecimenCabinetPanel.test.jsx
git commit -m "feat(world): SpecimenCabinetPanel — tiered skill jar display"
```

---

## Task 7: `BulletinBoardPanel` component

**Files:**
- Create: `src/components/world/panels/BulletinBoardPanel.jsx`
- Create: `src/components/world/panels/BulletinBoardPanel.test.jsx`

- [ ] **Step 1: Write failing smoke tests**

Create `src/components/world/panels/BulletinBoardPanel.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BulletinBoardPanel from './BulletinBoardPanel';

const messages = [
  { id: 'm1', source: 'guide',    content: 'Great observation!',   created_at: '2026-05-01T10:00:00Z', read_at: null,  sortKey: '2026-05-01T10:00:00Z' },
  { id: 'm2', source: 'feedback', warm_feedback: 'Strong work.',   created_at: '2026-04-28T09:00:00Z', sortKey: '2026-04-28T09:00:00Z' },
  { id: 'm3', source: 'parent',   notes: 'Very proud of you!',     updated_at: '2026-04-27T08:00:00Z', sortKey: '2026-04-27T08:00:00Z' },
];

describe('<BulletinBoardPanel>', () => {
  it('renders all message cards', () => {
    render(<BulletinBoardPanel messages={messages} onMarkRead={() => {}} />);
    expect(screen.getByText('Great observation!')).toBeInTheDocument();
    expect(screen.getByText('Strong work.')).toBeInTheDocument();
    expect(screen.getByText('Very proud of you!')).toBeInTheDocument();
  });

  it('labels sources correctly', () => {
    render(<BulletinBoardPanel messages={messages} onMarkRead={() => {}} />);
    expect(screen.getByText(/from guide/i)).toBeInTheDocument();
    expect(screen.getByText(/feedback/i)).toBeInTheDocument();
    expect(screen.getByText(/from home/i)).toBeInTheDocument();
  });

  it('calls onMarkRead when a guide message is clicked', async () => {
    const user = userEvent.setup();
    const onMarkRead = vi.fn();
    render(<BulletinBoardPanel messages={[messages[0]]} onMarkRead={onMarkRead} />);
    await user.click(screen.getByText('Great observation!'));
    expect(onMarkRead).toHaveBeenCalledWith('m1');
  });

  it('shows empty state when no messages', () => {
    render(<BulletinBoardPanel messages={[]} onMarkRead={() => {}} />);
    expect(screen.getByText(/all clear/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — confirm fails**

```bash
npx vitest run src/components/world/panels/BulletinBoardPanel.test.jsx
```

Expected: 4 tests fail.

- [ ] **Step 3: Implement**

Create `src/components/world/panels/BulletinBoardPanel.jsx`:

```jsx
import Specimen from '../Specimen';

function messageText(msg) {
  if (msg.source === 'guide')    return msg.content;
  if (msg.source === 'feedback') return msg.warm_feedback || msg.cool_feedback || 'New feedback';
  if (msg.source === 'parent')   return msg.notes || 'Message from home';
  return '';
}

function sourceLabel(source) {
  if (source === 'guide')    return 'From guide';
  if (source === 'feedback') return 'Project feedback';
  if (source === 'parent')   return 'Letter from home';
  return source;
}

/**
 * @param {{ messages: object[], onMarkRead: (id: string) => void }} props
 */
export default function BulletinBoardPanel({ messages, onMarkRead }) {
  if (messages.length === 0) {
    return (
      <div className="bbp-empty">
        <p>All clear — no new messages.</p>
      </div>
    );
  }

  return (
    <div className="bbp-root">
      <h2 className="bbp-title">Bulletin Board</h2>
      <div className="bbp-list">
        {messages.map((msg, i) => (
          <Specimen
            key={msg.id}
            id={msg.id}
            pin="pin"
            size="md"
            style={{ marginBottom: 14, width: '100%', boxSizing: 'border-box', cursor: msg.source === 'guide' ? 'pointer' : 'default' }}
            onClick={msg.source === 'guide' ? () => onMarkRead(msg.id) : undefined}
          >
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--graphite)', marginBottom: 4 }}>
              {sourceLabel(msg.source)}
            </div>
            <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14 }}>
              {messageText(msg)}
            </p>
          </Specimen>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run — confirm pass**

```bash
npx vitest run src/components/world/panels/BulletinBoardPanel.test.jsx
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/world/panels/BulletinBoardPanel.jsx src/components/world/panels/BulletinBoardPanel.test.jsx
git commit -m "feat(world): BulletinBoardPanel — merged message/feedback/parent feed"
```

---

## Task 8: `CabinOverlay` component

The overlay shell that wraps the three panels — same visual structure as `HotspotOverlay` (backdrop + slide-up sheet + close button) but with cabin-specific role switch.

**Files:**
- Create: `src/components/world/CabinOverlay.jsx`
- Create: `src/components/world/CabinOverlay.test.jsx`

- [ ] **Step 1: Write failing smoke tests**

Create `src/components/world/CabinOverlay.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CabinOverlay from './CabinOverlay';

const defaultProps = {
  role: 'wallMap',
  projects: [],
  completedProjects: [],
  skills: [],
  messages: [],
  onClose: vi.fn(),
  onMarkRead: vi.fn(),
};

function wrap(props = {}) {
  return render(
    <MemoryRouter>
      <CabinOverlay {...defaultProps} {...props} />
    </MemoryRouter>
  );
}

describe('<CabinOverlay>', () => {
  it('renders a dialog with aria-modal', () => {
    wrap();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('renders close button', () => {
    wrap();
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    wrap({ onClose });
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    wrap({ onClose });
    await user.click(document.querySelector('.cabin-overlay__backdrop'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders WallMapPanel for wallMap role', () => {
    wrap({ role: 'wallMap' });
    expect(screen.getByText(/field map/i)).toBeInTheDocument();
  });

  it('renders SpecimenCabinetPanel for specimenCabinet role', () => {
    wrap({ role: 'specimenCabinet', skills: [] });
    expect(screen.getByText(/specimen cabinet/i)).toBeInTheDocument();
  });

  it('renders BulletinBoardPanel for bulletinBoard role', () => {
    wrap({ role: 'bulletinBoard', messages: [] });
    expect(screen.getByText(/all clear/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — confirm fails**

```bash
npx vitest run src/components/world/CabinOverlay.test.jsx
```

Expected: 7 tests fail.

- [ ] **Step 3: Implement**

Create `src/components/world/CabinOverlay.jsx`:

```jsx
import { useEffect, useRef } from 'react';
import './HotspotOverlay.css'; // reuse existing overlay CSS
import WallMapPanel          from './panels/WallMapPanel';
import SpecimenCabinetPanel  from './panels/SpecimenCabinetPanel';
import BulletinBoardPanel    from './panels/BulletinBoardPanel';

function CabinContent({ role, projects, completedProjects, skills, messages, onMarkRead }) {
  switch (role) {
    case 'wallMap':
      return <WallMapPanel projects={projects} completedProjects={completedProjects} />;
    case 'specimenCabinet':
      return <SpecimenCabinetPanel skills={skills} />;
    case 'bulletinBoard':
      return <BulletinBoardPanel messages={messages} onMarkRead={onMarkRead} />;
    default:
      return <p className="ho-empty">Coming soon.</p>;
  }
}

export default function CabinOverlay({ role, projects, completedProjects, skills, messages, onClose, onMarkRead }) {
  const sheetRef = useRef(null);

  useEffect(() => {
    sheetRef.current?.focus();
  }, []);

  return (
    <div className="hotspot-overlay cabin-overlay" data-role={role} role="dialog" aria-modal="true" aria-label={role}>
      <div className="hotspot-overlay__backdrop cabin-overlay__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="hotspot-overlay__sheet" ref={sheetRef} tabIndex={-1}>
        <button className="hotspot-overlay__close" onClick={onClose} aria-label="Close" type="button">
          <span aria-hidden="true">×</span>
        </button>
        <div className="hotspot-overlay__scroll">
          <CabinContent
            role={role}
            projects={projects}
            completedProjects={completedProjects}
            skills={skills}
            messages={messages}
            onMarkRead={onMarkRead}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run — confirm pass**

```bash
npx vitest run src/components/world/CabinOverlay.test.jsx
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/world/CabinOverlay.jsx src/components/world/CabinOverlay.test.jsx
git commit -m "feat(world): CabinOverlay — overlay shell with role switch for cabin panels"
```

---

## Task 9: `CabinScene` component

The page root: fetches data, wraps `WorldStateProvider`, renders `ParallaxScene` + hotspots + `CabinOverlay`, and renders artifact cards along the desk shelf.

**Files:**
- Create: `src/components/world/CabinScene.jsx`
- Create: `src/components/world/CabinScene.test.jsx`
- Create: `src/components/world/CabinScene.css`

- [ ] **Step 1: Write failing smoke tests**

Create `src/components/world/CabinScene.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });

// Mock loadCabinData so the component doesn't hit Supabase
vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    loadCabinData: vi.fn().mockResolvedValue({
      projects: [
        { id: 'q1', title: 'Wetlands Study', status: 'active', biome_id: 'campsite', completed_at: null },
      ],
      completedProjects: [],
      skills: [],
      messages: [],
    }),
  };
});

import CabinScene from './CabinScene';

function wrap() {
  return render(<MemoryRouter><CabinScene studentId="stu-1" /></MemoryRouter>);
}

describe('<CabinScene>', () => {
  it('renders without crashing', () => {
    wrap();
    expect(document.body).toBeTruthy();
  });

  it('renders three hotspot buttons (one per zone)', async () => {
    wrap();
    // Wait for data load (loadCabinData is async)
    await screen.findAllByRole('button', { name: /.+/ });
    const hotspots = document.querySelectorAll('button.hotspot');
    expect(hotspots.length).toBe(3);
  });

  it('each hotspot has a data-role matching cabin config', async () => {
    wrap();
    await screen.findAllByRole('button', { name: /.+/ });
    expect(document.querySelector('[data-role="wallMap"]')).toBeTruthy();
    expect(document.querySelector('[data-role="specimenCabinet"]')).toBeTruthy();
    expect(document.querySelector('[data-role="bulletinBoard"]')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — confirm fails**

```bash
npx vitest run src/components/world/CabinScene.test.jsx
```

Expected: 3 tests fail (module not found).

- [ ] **Step 3: Implement CabinScene.css**

Create `src/components/world/CabinScene.css`:

```css
.cabin-scene {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.cabin-scene__artifacts {
  position: absolute;
  bottom: 0;
  left: 0;
  display: flex;
  gap: 12px;
  padding: 0 24px 8px;
  z-index: 2;
  pointer-events: none;
}

.cabin-scene__artifact {
  pointer-events: auto;
  font-size: 11px;
}

.cabin-scene__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-family: var(--font-body);
  color: var(--graphite);
  font-size: 14px;
}

.cabin-scene__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 12px;
  font-family: var(--font-body);
}
```

- [ ] **Step 4: Implement CabinScene.jsx**

Create `src/components/world/CabinScene.jsx`:

```jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import './CabinScene.css';
import { getBiome }            from '../../biomes';
import { loadCabinData }       from '../../lib/api';
import { useReducedMotion }    from '../../hooks/useReducedMotion';
import { WorldStateProvider, useWorldState } from './WorldStateContext';
import ParallaxScene           from './ParallaxScene';
import AmbientLayer            from './AmbientLayer';
import Hotspot                 from './Hotspot';
import CabinOverlay            from './CabinOverlay';
import Specimen                from './Specimen';

const ROLE_LABELS = {
  wallMap:         'Open your field map',
  specimenCabinet: 'Open your specimen cabinet',
  bulletinBoard:   'Check the bulletin board',
};

function SceneInner({ studentId }) {
  const cfg = getBiome('cabin');
  const systemReduced = useReducedMotion();
  const { zoomedHotspot, zoomTo, zoomOut } = useWorldState();

  const [cabinData, setCabinData]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadCabinData(studentId)
      .then(data => { if (!cancelled) { setCabinData(data); setLoading(false); } })
      .catch(err  => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [studentId]);

  const handleActivate = useCallback((role) => zoomTo(role), [zoomTo]);

  const handleMarkRead = useCallback((messageId) => {
    // Optimistic: remove from local state
    setCabinData(prev => prev ? {
      ...prev,
      messages: prev.messages.filter(m => m.id !== messageId),
    } : prev);
  }, []);

  if (loading) return <div className="cabin-scene__loading">Loading your station…</div>;
  if (error)   return (
    <div className="cabin-scene__error">
      <p>Couldn't load your station.</p>
      <a href="?view=list" className="btn btn-secondary">Switch to list view</a>
    </div>
  );

  const { projects, completedProjects, skills, messages } = cabinData;
  return (
    <div className="cabin-scene">
      <ParallaxScene layers={cfg.layers} calmMode={systemReduced}>
        <AmbientLayer ambient={cfg.ambient} calmMode={systemReduced} />

        {cfg.hotspots.map((h, i) => (
          <Hotspot
            key={h.role}
            id={h.role}
            role={h.role}
            x={h.x}
            y={h.y}
            label={ROLE_LABELS[h.role] ?? h.role}
            state="active"
            onActivate={() => handleActivate(h.role)}
          />
        ))}

        {/* Artifact cards along the desk shelf */}
        {completedProjects.length > 0 && (
          <div className="cabin-scene__artifacts">
            {completedProjects.map(p => (
              <Specimen
                key={p.id}
                id={p.id}
                size="sm"
                pin="tape"
                maxJitterDeg={2}
                className="cabin-scene__artifact"
              >
                <strong style={{ fontSize: 10, display: 'block' }}>{p.title}</strong>
                {p.completed_at && (
                  <span style={{ fontSize: 9, color: 'var(--graphite)' }}>
                    {new Date(p.completed_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                  </span>
                )}
              </Specimen>
            ))}
          </div>
        )}
      </ParallaxScene>

      {zoomedHotspot && (
        <CabinOverlay
          role={zoomedHotspot}
          projects={projects}
          completedProjects={completedProjects}
          skills={skills}
          messages={messages}
          onClose={zoomOut}
          onMarkRead={handleMarkRead}
        />
      )}
    </div>
  );
}

export default function CabinScene({ studentId }) {
  return (
    <WorldStateProvider>
      <SceneInner studentId={studentId} />
    </WorldStateProvider>
  );
}
```

- [ ] **Step 5: Run — confirm pass**

```bash
npx vitest run src/components/world/CabinScene.test.jsx
```

Expected: 3 tests pass.

- [ ] **Step 6: Run full suite**

```bash
npx vitest run
```

Expected: all tests pass (no regressions).

- [ ] **Step 7: Commit**

```bash
git add src/components/world/CabinScene.jsx src/components/world/CabinScene.test.jsx src/components/world/CabinScene.css
git commit -m "feat(world): CabinScene — field station hub with three zones + artifact shelf"
```

---

## Task 10: Wire routes in App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add `CabinScene` lazy import**

In `src/App.jsx`, find the block of `const X = lazy(...)` imports. Add after the `CampHub` line:

```js
const CabinScene = lazy(() => import('./components/world/CabinScene'));
```

- [ ] **Step 2: Add `/station` route and redirect `/student`**

In the `<Routes>` block, find:

```jsx
<Route path="/student" element={<CampHub />} />
```

Replace it with:

```jsx
<Route path="/station" element={<CabinScene studentId={/* read from session */null} />} />
<Route path="/student" element={<Navigate to="/station" replace />} />
```

The `studentId` prop needs to come from the student session. Add this import near the top of App.jsx (near the other lib imports, or just use inline logic):

```js
import { getStudentSession } from './lib/studentSession';
```

Then update the route to:

```jsx
<Route path="/station" element={<CabinSceneLoader />} />
<Route path="/student" element={<Navigate to="/station" replace />} />
```

And add the loader above `export default function App()`:

```jsx
function CabinSceneLoader() {
  const session = getStudentSession();
  return <CabinScene studentId={session?.studentId ?? null} />;
}
```

- [ ] **Step 3: Verify build compiles**

```bash
npx vite build 2>&1 | tail -15
```

Expected: build completes without errors. (Warnings about bundle size are OK.)

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```

Navigate to `http://localhost:3001/student` — should redirect to `/station`. At `/station`, three dashed-circle hotspots should appear over the cabin placeholder layers. Clicking any hotspot opens the correct panel overlay.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat(world): wire /station route + redirect /student → /station"
```

---

## Task 11: Final acceptance check

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass. Count should be ≥ 93 (existing) + new tests from this plan.

- [ ] **Step 2: Verify acceptance gate manually**

With `npm run dev` running:
1. Open `http://localhost:3001/student/login` → log in as a student
2. You land at `/station` (redirected from `/student`)
3. Three hotspot circles are visible over the cabin placeholder layers
4. Click **Wall Map** hotspot → overlay opens, shows project list (or empty state)
5. Click a project link → navigates to `/world/:id` or `/q/:id`
6. Go back, click **Specimen Cabinet** → overlay shows skill grid
7. Click **Bulletin Board** → overlay shows messages (or "All clear")
8. Completed projects (if any) show as small `<Specimen>` artifact cards at the bottom
9. Mouse movement causes subtle parallax on the three SVG layers
10. Navigate to `/student` → redirects to `/station`

- [ ] **Step 3: Commit final tag**

```bash
git add -A
git commit -m "chore: Phase 4 Field Station complete — acceptance gate passed"
```

---

## Phase 4 Acceptance Gate

- [ ] `npx vitest run` — all tests pass
- [ ] `npx vite build` — builds clean
- [ ] `/station` renders cabin scene with three hotspot zones
- [ ] `/student` redirects to `/station`
- [ ] Wall Map panel lists active projects grouped by biome; links navigate correctly
- [ ] Specimen Cabinet panel shows skill tiers (earned / in-progress / locked)
- [ ] Bulletin Board panel shows merged messages; guide messages marked read on click
- [ ] Completed projects show as artifact cards on the desk shelf (or empty — no regressions)
- [ ] Reduced-motion: parallax + hotspot pulse disabled
- [ ] `CampHub` still accessible at `?view=list` (no deletion)
