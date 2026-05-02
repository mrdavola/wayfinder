# Phase 2 — AI Image-Gen for Characters + Decor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a guide publishes a quest, a bespoke AI-generated character portrait is generated via fal.ai, cached on the quest row, and shown at the guide hotspot in the biome world — with `<FieldFigure>` as the fallback for quests without a portrait.

**Architecture:** A new `src/lib/artGen.js` module wraps the `@fal-ai/client` package. The QuestBuilder Step 4 gains a biome picker; portrait generation fires in parallel with quest generation during Step 5. Step 6 Review shows a "Your World" preview section with the portrait and a regenerate button. `saveQuest` stores `biome_id` + `character_image_url` in the `quests` row. `BiomeScene` is updated to render a new `<CharacterPortrait>` component (img when URL present, FieldFigure otherwise) at the guide hotspot. Decor slot images are generated at publish time as fire-and-forget and cached in the `quest_decor` table.

**Tech Stack:** React 19 + Vite, `@fal-ai/client` (new), fal-ai/nano-banana-2 model, Supabase (existing), `VITE_FAL_KEY` env var (same pattern as `VITE_ANTHROPIC_API_KEY`). Migrations 056 + 057 are already applied (`quests.biome_id`, `quests.character_image_url`, `quest_decor` table).

---

## File map

```
New files:
  src/lib/artGen.js                          — fal.ai wrapper: generatePortrait(), generateDecorSlot()
  src/lib/artGen.test.js                     — mock @fal-ai/client, test prompt building + response parsing
  src/components/world/CharacterPortrait.jsx — <img> or <FieldFigure> switcher at guide hotspot
  src/components/world/CharacterPortrait.test.jsx

Modified files:
  package.json                               — add @fal-ai/client
  .env.local                                 — add VITE_FAL_KEY (manual step — never committed)
  src/biomes/campsite/index.js               — add decor[] array with slot configs
  src/pages/QuestBuilder.jsx                 — biome state in root; biome picker in Step4; portrait gen
                                               in runGeneration(); world preview in Step6Review;
                                               biome_id + character_image_url in saveQuest;
                                               fire-and-forget decor generation after save
  src/components/world/BiomeScene.jsx        — replace FieldFigure with CharacterPortrait
```

---

## Task 1: Install @fal-ai/client + add env var

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `.env.local` (manual — doc only)

- [ ] **Step 1: Install the package.**

```bash
cd "/Users/md/Quest Lab/quest-lab-world-upgrade"
npm install @fal-ai/client
```

Expected output: `added 1 package` (or similar). No errors.

- [ ] **Step 2: Verify the package is listed in package.json.**

```bash
grep '@fal-ai/client' package.json
```

Expected: `"@fal-ai/client": "^x.x.x"` appears in dependencies.

- [ ] **Step 3: Document the required env var.**

Add `VITE_FAL_KEY=your_fal_key_here` to `.env.local` (never committed).
Get a key at https://fal.ai.

- [ ] **Step 4: Commit.**

```bash
cd "/Users/md/Quest Lab/quest-lab-world-upgrade"
git add package.json package-lock.json
git commit -m "build: add @fal-ai/client for AI portrait generation"
```

---

## Task 2: `artGen.js` + tests (TDD)

**Files:**
- Create: `src/lib/artGen.js`
- Create: `src/lib/artGen.test.js`

- [ ] **Step 1: Write failing tests.**

Create `src/lib/artGen.test.js`:

```js
// src/lib/artGen.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@fal-ai/client', () => ({
  fal: {
    config: vi.fn(),
    subscribe: vi.fn(),
  },
}));

import { generatePortrait, generateDecorSlot } from './artGen';
import { fal } from '@fal-ai/client';

beforeEach(() => vi.clearAllMocks());

describe('generatePortrait', () => {
  it('returns image URL from fal.ai', async () => {
    fal.subscribe.mockResolvedValue({ data: { images: [{ url: 'https://cdn.fal.ai/portrait.png' }] } });
    const url = await generatePortrait('campsite');
    expect(url).toBe('https://cdn.fal.ai/portrait.png');
  });

  it('throws when fal.ai returns no image', async () => {
    fal.subscribe.mockResolvedValue({ data: { images: [] } });
    await expect(generatePortrait('campsite')).rejects.toThrow('No image URL');
  });

  it('calls fal-ai/nano-banana-2 model', async () => {
    fal.subscribe.mockResolvedValue({ data: { images: [{ url: 'https://cdn.fal.ai/x.png' }] } });
    await generatePortrait('campsite');
    expect(fal.subscribe.mock.calls[0][0]).toBe('fal-ai/nano-banana-2');
  });

  it('includes the style prefix in the prompt', async () => {
    fal.subscribe.mockResolvedValue({ data: { images: [{ url: 'https://cdn.fal.ai/x.png' }] } });
    await generatePortrait('campsite');
    const { prompt } = fal.subscribe.mock.calls[0][1].input;
    expect(prompt).toContain('vintage natural-history');
  });

  it('uses lab-specific subject for biomeId=lab', async () => {
    fal.subscribe.mockResolvedValue({ data: { images: [{ url: 'https://cdn.fal.ai/x.png' }] } });
    await generatePortrait('lab');
    const { prompt } = fal.subscribe.mock.calls[0][1].input;
    expect(prompt).toContain('lab');
  });

  it('falls back to campsite subject for unknown biomeId', async () => {
    fal.subscribe.mockResolvedValue({ data: { images: [{ url: 'https://cdn.fal.ai/x.png' }] } });
    await generatePortrait('atlantis');
    const { prompt } = fal.subscribe.mock.calls[0][1].input;
    expect(prompt).toContain('field guide');
  });

  it('appends extraHint when provided', async () => {
    fal.subscribe.mockResolvedValue({ data: { images: [{ url: 'https://cdn.fal.ai/x.png' }] } });
    await generatePortrait('campsite', 'for a marine biology project');
    const { prompt } = fal.subscribe.mock.calls[0][1].input;
    expect(prompt).toContain('marine biology');
  });

  it('uses portrait_4_3 image size', async () => {
    fal.subscribe.mockResolvedValue({ data: { images: [{ url: 'https://cdn.fal.ai/x.png' }] } });
    await generatePortrait('campsite');
    const { image_size } = fal.subscribe.mock.calls[0][1].input;
    expect(image_size).toBe('portrait_4_3');
  });
});

describe('generateDecorSlot', () => {
  it('returns { url, prompt } from fal.ai', async () => {
    fal.subscribe.mockResolvedValue({ data: { images: [{ url: 'https://cdn.fal.ai/decor.png' }] } });
    const result = await generateDecorSlot('bulletin_note', 'campsite', 'Ocean Expedition');
    expect(result.url).toBe('https://cdn.fal.ai/decor.png');
    expect(typeof result.prompt).toBe('string');
    expect(result.prompt.length).toBeGreaterThan(10);
  });

  it('includes quest title in the prompt', async () => {
    fal.subscribe.mockResolvedValue({ data: { images: [{ url: 'https://cdn.fal.ai/decor.png' }] } });
    const { prompt } = await generateDecorSlot('bulletin_note', 'campsite', 'Ocean Expedition');
    expect(prompt).toContain('Ocean Expedition');
  });

  it('falls back to generic subject for unknown slot', async () => {
    fal.subscribe.mockResolvedValue({ data: { images: [{ url: 'https://cdn.fal.ai/decor.png' }] } });
    const { prompt } = await generateDecorSlot('unknown_slot', 'campsite', '');
    expect(prompt).toContain('campsite');
  });

  it('throws when fal.ai returns no image', async () => {
    fal.subscribe.mockResolvedValue({ data: { images: [] } });
    await expect(generateDecorSlot('bulletin_note', 'campsite', '')).rejects.toThrow('No image URL');
  });
});
```

- [ ] **Step 2: Run test — confirm all 12 fail.**

```bash
cd "/Users/md/Quest Lab/quest-lab-world-upgrade"
npx vitest run src/lib/artGen.test.js
```

Expected: 12 failed (module not found).

- [ ] **Step 3: Implement `artGen.js`.**

Create `src/lib/artGen.js`:

```js
// src/lib/artGen.js
import { fal } from '@fal-ai/client';
import { buildArtPrompt } from './styleGenAI';

fal.config({ credentials: import.meta.env.VITE_FAL_KEY || '' });

const GUIDE_SUBJECT = {
  campsite: 'a naturalist field guide character, warm smile, wearing a canvas field vest, holding a worn leather journal, soft forest clearing background',
  lab:      'a laboratory mentor character, friendly curious expression, wearing a crisp lab coat, holding a glass flask, bright clean laboratory background',
  workshop: 'a skilled workshop mentor character, warm expression, wearing a canvas workshop apron, hands on workbench surrounded by wooden tools, warm workshop background',
};

const DECOR_SUBJECT = {
  bulletin_note:    'a hand-lettered expedition notice board pinned with field notes and sketches',
  trailhead_banner: 'a weathered wooden trailhead sign with carved text and a small compass rose',
};

/**
 * @param {'campsite'|'lab'|'workshop'} biomeId
 * @param {string} [extraHint]  e.g. "for a marine biology project"
 * @returns {Promise<string>}  CDN URL of the generated portrait
 */
export async function generatePortrait(biomeId = 'campsite', extraHint = '') {
  const subject = GUIDE_SUBJECT[biomeId] ?? GUIDE_SUBJECT.campsite;
  const hint    = extraHint.trim();
  const prompt  = buildArtPrompt(hint ? `${subject}, ${hint}` : subject);

  const result = await fal.subscribe('fal-ai/nano-banana-2', {
    input: { prompt, image_size: 'portrait_4_3', num_images: 1 },
  });

  const url = result?.data?.images?.[0]?.url;
  if (!url) throw new Error('No image URL returned from fal.ai');
  return url;
}

/**
 * @param {string} slot        biome config slot key, e.g. 'bulletin_note'
 * @param {string} biomeId
 * @param {string} questTitle  used as context hint
 * @returns {Promise<{url: string, prompt: string}>}
 */
export async function generateDecorSlot(slot, biomeId = 'campsite', questTitle = '') {
  const subject = DECOR_SUBJECT[slot] ?? `a decorative element for a ${biomeId} biome`;
  const hint    = questTitle.trim();
  const prompt  = buildArtPrompt(hint ? `${subject}, related to "${hint}"` : subject);

  const result = await fal.subscribe('fal-ai/nano-banana-2', {
    input: { prompt, image_size: 'square', num_images: 1 },
  });

  const url = result?.data?.images?.[0]?.url;
  if (!url) throw new Error('No image URL returned from fal.ai');
  return { url, prompt };
}
```

- [ ] **Step 4: Run test — confirm all 12 pass.**

```bash
npx vitest run src/lib/artGen.test.js
```

Expected: 12 passed.

- [ ] **Step 5: Commit.**

```bash
git add src/lib/artGen.js src/lib/artGen.test.js
git commit -m "feat(world): artGen module — generatePortrait + generateDecorSlot via fal.ai"
```

---

## Task 3: `<CharacterPortrait>` component (TDD)

**Files:**
- Create: `src/components/world/CharacterPortrait.jsx`
- Create: `src/components/world/CharacterPortrait.test.jsx`

- [ ] **Step 1: Write failing tests.**

Create `src/components/world/CharacterPortrait.test.jsx`:

```jsx
// src/components/world/CharacterPortrait.test.jsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import CharacterPortrait from './CharacterPortrait';

describe('<CharacterPortrait>', () => {
  it('renders an <img> when imageUrl is provided', () => {
    const { container } = render(
      <CharacterPortrait imageUrl="https://cdn.fal.ai/portrait.png" />
    );
    expect(container.querySelector('img')).toBeTruthy();
  });

  it('img src matches the provided imageUrl', () => {
    const { container } = render(
      <CharacterPortrait imageUrl="https://cdn.fal.ai/portrait.png" />
    );
    expect(container.querySelector('img').getAttribute('src')).toBe('https://cdn.fal.ai/portrait.png');
  });

  it('img has accessible alt text from the label prop', () => {
    const { container } = render(
      <CharacterPortrait imageUrl="https://cdn.fal.ai/portrait.png" label="Your field guide" />
    );
    expect(container.querySelector('img').alt).toBe('Your field guide');
  });

  it('renders <FieldFigure> SVG when imageUrl is null', () => {
    const { container } = render(<CharacterPortrait imageUrl={null} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders <FieldFigure> SVG when imageUrl is undefined', () => {
    const { container } = render(<CharacterPortrait />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('forwards outfit figureProps to FieldFigure', () => {
    const { container } = render(
      <CharacterPortrait imageUrl={null} figureProps={{ outfit: 'lab' }} />
    );
    // lab outfit body color = #e8e8e0
    const body = container.querySelector('[data-feature="body"]');
    expect(body?.getAttribute('fill')).toBe('#e8e8e0');
  });
});
```

- [ ] **Step 2: Run test — confirm all 6 fail.**

```bash
cd "/Users/md/Quest Lab/quest-lab-world-upgrade"
npx vitest run src/components/world/CharacterPortrait.test.jsx
```

Expected: 6 failed.

- [ ] **Step 3: Implement `CharacterPortrait.jsx`.**

Create `src/components/world/CharacterPortrait.jsx`:

```jsx
// src/components/world/CharacterPortrait.jsx
import FieldFigure from './FieldFigure';

/**
 * Shows an AI-generated portrait when available; falls back to <FieldFigure>.
 *
 * @param {object} props
 * @param {string|null|undefined} [props.imageUrl]   fal.ai CDN URL; falsy → FieldFigure
 * @param {number}  [props.size=80]     height in px (width = size × 0.65 to match FieldFigure)
 * @param {string}  [props.label]       aria alt-text / aria-label
 * @param {object}  [props.figureProps] extra props forwarded to FieldFigure (outfit, mood, etc.)
 */
export default function CharacterPortrait({ imageUrl, size = 80, label = 'Field guide', figureProps = {} }) {
  if (imageUrl) {
    const w = Math.round(size * 0.65);
    return (
      <img
        src={imageUrl}
        alt={label}
        width={w}
        height={size}
        style={{
          borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
          border: '2px solid rgba(90,70,40,0.18)',
          objectFit: 'cover',
          objectPosition: 'top center',
          display: 'block',
        }}
      />
    );
  }
  return <FieldFigure size={size} label={label} {...figureProps} />;
}
```

- [ ] **Step 4: Run test — confirm all 6 pass.**

```bash
npx vitest run src/components/world/CharacterPortrait.test.jsx
```

Expected: 6 passed.

- [ ] **Step 5: Commit.**

```bash
git add src/components/world/CharacterPortrait.jsx src/components/world/CharacterPortrait.test.jsx
git commit -m "feat(world): <CharacterPortrait> — AI portrait with FieldFigure fallback"
```

---

## Task 4: Add `decor[]` to campsite biome config

**Files:**
- Modify: `src/biomes/campsite/index.js`

No new tests — biome config is validated by `src/biomes/validate.test.js`. Run that suite after.

- [ ] **Step 1: Add `decor` array to the campsite config.**

Open `src/biomes/campsite/index.js`. Replace the full file contents:

```js
// src/biomes/campsite/index.js
/** @type {import('../types').BiomeConfig} */
export const campsite = {
  id: 'campsite',
  layers: {
    back: '/biomes/campsite/back.svg',
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
  decor: [
    {
      slot: 'bulletin_note',
      x: '77%',
      y: '43%',
      subject: 'a hand-lettered expedition notice board pinned with field notes and sketches',
    },
    {
      slot: 'trailhead_banner',
      x: '11%',
      y: '57%',
      subject: 'a weathered wooden trailhead sign with carved text and a small compass rose',
    },
  ],
};
```

- [ ] **Step 2: Run biome validate tests.**

```bash
cd "/Users/md/Quest Lab/quest-lab-world-upgrade"
npx vitest run src/biomes/validate.test.js
```

Expected: all pass (the validator checks `id`, `layers`, `ambient`, `hotspots` — `decor` is an optional new field).

- [ ] **Step 3: Commit.**

```bash
git add src/biomes/campsite/index.js
git commit -m "feat(world): add decor slots to campsite biome config"
```

---

## Task 5: QuestBuilder — biome state + biome picker in Step 4

**Files:**
- Modify: `src/pages/QuestBuilder.jsx`
  - Add `biomeId` + `portraitUrl` + `portraitLoading` state (near line 3604)
  - Add `biomeId` to sessionStorage persist (near line 3734)
  - Add `biomeId`/`setBiomeId` props to `Step4AnythingElse` and render biome picker (near line 1750)
  - Pass new props where `<Step4AnythingElse>` is rendered (near line 4509)

No unit tests for UI sections in QuestBuilder (component is too large and untested at this level — verify manually in dev server).

- [ ] **Step 1: Add three new state variables near line 3604 (after the existing Step 4 state).**

Find this line (around 3605):
```js
  // Step 4 (Anything Else?)
  const [additionalContext, setAdditionalContext] = useState(() => saved.current?.additionalContext || '');
```

Add after it:
```js
  // Step 4 (biome selection — persists across refresh)
  const [biomeId, setBiomeId] = useState(() => saved.current?.biomeId || 'campsite');
  // Portrait generation results (set during Step 5, displayed in Step 6)
  const [portraitUrl, setPortraitUrl] = useState(() => saved.current?.portraitUrl || null);
  const [portraitLoading, setPortraitLoading] = useState(false);
```

- [ ] **Step 2: Include `biomeId` and `portraitUrl` in the sessionStorage persist effect.**

Find the sessionStorage persist effect (around line 3734). The `data` object currently looks like:
```js
    const data = {
      step, questType, selectedStudentId, selectedStudentIds,
      selectedInterests, selectedStandards, customTopic, additionalContext,
      selectedPathways, customCareer, generatedQuest,
      marbleStatus, marbleData,
    };
```

Add `biomeId` and `portraitUrl` to it:
```js
    const data = {
      step, questType, selectedStudentId, selectedStudentIds,
      selectedInterests, selectedStandards, customTopic, additionalContext,
      selectedPathways, customCareer, generatedQuest,
      marbleStatus, marbleData,
      biomeId, portraitUrl,
    };
```

Also add them to the dependency array of the useEffect:
```js
  }, [step, questType, selectedStudentId, selectedStudentIds, selectedInterests, selectedStandards, customTopic, additionalContext, selectedPathways, customCareer, generatedQuest, launchedQuestId, marbleStatus, marbleData, biomeId, portraitUrl]);
```

- [ ] **Step 3: Add `biomeId` and `setBiomeId` props to the `Step4AnythingElse` function signature.**

Find `function Step4AnythingElse(` (around line 1751). Add `biomeId` and `setBiomeId` to its destructured props:

```js
function Step4AnythingElse({ additionalContext, setAdditionalContext, useRealWorld, setUseRealWorld, projectMode, setProjectMode, isBranching, setIsBranching, biomeId, setBiomeId, onBack, onNext }) {
```

- [ ] **Step 4: Add the biome picker UI inside `Step4AnythingElse`, before the textarea.**

Find the textarea in Step4AnythingElse and insert the biome picker immediately before it. The textarea starts with:
```js
      <textarea
        value={additionalContext}
```

Insert before it:

```jsx
      {/* Biome Picker */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          World Environment
        </div>
        <p style={{ fontSize: 12, color: 'var(--graphite)', fontFamily: 'var(--font-body)', margin: '0 0 10px', lineHeight: 1.5 }}>
          Choose where learners will complete this project. Your AI guide character and decorations are styled to match.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { id: 'campsite', label: 'Field Campsite', desc: 'Outdoors, nature, exploration', icon: '🏕️', available: true },
            { id: 'lab',      label: 'Science Lab',    desc: 'Experiments, discovery',        icon: '🔬', available: false },
            { id: 'workshop', label: 'Workshop',        desc: 'Making, building, crafting',   icon: '🔧', available: false },
          ].map((b) => {
            const selected = biomeId === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={b.available ? () => setBiomeId(b.id) : undefined}
                style={{
                  padding: '10px 8px',
                  border: `1.5px solid ${selected ? 'var(--compass-gold)' : 'var(--pencil)'}`,
                  borderRadius: 10,
                  background: selected ? 'rgba(184,134,11,0.08)' : b.available ? 'var(--paper)' : 'var(--parchment)',
                  cursor: b.available ? 'pointer' : 'default',
                  opacity: b.available ? 1 : 0.55,
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 4 }}>{b.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: selected ? 'var(--ink)' : 'var(--graphite)', fontFamily: 'var(--font-body)' }}>{b.label}</div>
                <div style={{ fontSize: 10, color: 'var(--pencil)', fontFamily: 'var(--font-body)', marginTop: 2 }}>{b.available ? b.desc : 'Coming soon'}</div>
              </button>
            );
          })}
        </div>
      </div>
```

- [ ] **Step 5: Pass `biomeId` and `setBiomeId` where `<Step4AnythingElse>` is rendered.**

Find the JSX block around line 4508:
```jsx
            {step === 4 && (
              <Step4AnythingElse
                additionalContext={additionalContext}
```

Add the new props to it:
```jsx
            {step === 4 && (
              <Step4AnythingElse
                additionalContext={additionalContext}
                setAdditionalContext={setAdditionalContext}
                useRealWorld={useRealWorld}
                setUseRealWorld={setUseRealWorld}
                projectMode={projectMode}
                setProjectMode={setProjectMode}
                isBranching={isBranching}
                setIsBranching={setIsBranching}
                biomeId={biomeId}
                setBiomeId={setBiomeId}
                onBack={() => setStep(3)}
                onNext={() => setStep(5)}
              />
            )}
```

- [ ] **Step 6: Verify in dev server.**

```bash
cd "/Users/md/Quest Lab/quest-lab-world-upgrade"
npm run dev
```

Navigate to `/quest/new`, advance to Step 4. Expected: biome picker appears above the context textarea showing three cards — Campsite (active/selectable), Lab (grayed "Coming soon"), Workshop (grayed "Coming soon"). Selecting Campsite highlights it with the gold border.

- [ ] **Step 7: Commit.**

```bash
git add src/pages/QuestBuilder.jsx
git commit -m "feat(world): QuestBuilder biome picker in Step 4 + biomeId/portraitUrl state"
```

---

## Task 6: Portrait generation in `runGeneration()`

**Files:**
- Modify: `src/pages/QuestBuilder.jsx`
  - Add `generatePortrait` import at top of file
  - Launch portrait gen in parallel inside `runGeneration` (around line 3828)

- [ ] **Step 1: Add the import for `generatePortrait`.**

Find the imports near the top of `QuestBuilder.jsx` (around line 33 where `ai` is imported from `../lib/api`):
```js
import { ai, questGroups as questGroupsApi, ... } from '../lib/api';
```

Add after it:
```js
import { generatePortrait, generateDecorSlot } from '../lib/artGen';
import { getBiome } from '../biomes';
```

- [ ] **Step 2: Add portrait generation inside `runGeneration()`.**

In `runGeneration()`, find the block where `pathwayLabels` is assembled (around line 3869):
```js
      const pathwayLabels = selectedPathways
        .map((id) => CAREER_PATHWAYS.find((p) => p.id === id)?.label)
        .filter(Boolean);
      if (customCareer.trim()) pathwayLabels.push(customCareer.trim());
```

Immediately after that block, add:
```js
      // Portrait generation fires in parallel — never blocks quest gen.
      // If it fails (key missing, quota, etc.) portraitUrl stays null and
      // BiomeScene falls back to <FieldFigure>.
      setPortraitLoading(true);
      const portraitHint = [
        pathwayLabels[0] ? `for a ${pathwayLabels[0].toLowerCase()} project` : '',
        selectedInterests.slice(0, 2).join(' and '),
      ].filter(Boolean).join(', ');
      generatePortrait(biomeId, portraitHint)
        .then((url) => setPortraitUrl(url))
        .catch(() => {})
        .finally(() => setPortraitLoading(false));
```

Note: `biomeId` and `setPortraitUrl`/`setPortraitLoading` are in the `runGeneration` closure because they're in outer scope. Add `biomeId` to `runGeneration`'s `useCallback` dependency array:

```js
  }, [selectedInterests, selectedStudents, selectedStandards, selectedPathways, customCareer, questType, biomeId]);
```

(The existing dep array ends with `questType` — add `, biomeId` before the `]);`.)

- [ ] **Step 3: Verify timing in dev server.**

Navigate to `/quest/new`, complete Steps 1–4, hit Step 5. Expected: the compass spinner starts, the progress bar advances, and in ~10–30s the portrait is being generated in the background (check network tab for a fal.ai POST request). No UI change in Step 5 — the portrait result is only shown in Step 6.

If `VITE_FAL_KEY` is not set, `generatePortrait` silently fails and `portraitUrl` stays null — the console will show nothing (failure is swallowed).

- [ ] **Step 4: Commit.**

```bash
git add src/pages/QuestBuilder.jsx
git commit -m "feat(world): trigger portrait generation in parallel during Step 5"
```

---

## Task 7: "Your World" preview section in Step 6 Review

**Files:**
- Modify: `src/pages/QuestBuilder.jsx` — Step6Review component

- [ ] **Step 1: Add new props to the `Step6Review` function signature.**

Find `function Step6Review({` (around line 2141). Add `biomeId`, `portraitUrl`, `portraitLoading`, `onRegeneratePortrait` to the destructured props:

```js
function Step6Review({
  generatedQuest,
  setGeneratedQuest,
  selectedStandards,
  selectedPathways,
  questType,
  selectedStudents,
  allStudents,
  selectedStudentId,
  setSelectedStudentId,
  selectedStudentIds,
  setSelectedStudentIds,
  setQuestType,
  onLaunch,
  onDraft,
  onRegenerate,
  onAddToLibrary,
  launching,
  saveError,
  marbleStatus,
  marbleData,
  biomeId,
  portraitUrl,
  portraitLoading,
  onRegeneratePortrait,
}) {
```

- [ ] **Step 2: Add `CharacterPortrait` import at the top of `QuestBuilder.jsx`.**

Find the imports near the top. After the existing component imports (lucide-react, TrustBadge, etc.), add:

```js
import CharacterPortrait from '../components/world/CharacterPortrait';
```

- [ ] **Step 3: Add the BIOME_META constant near the top of the file (after the `T` design tokens, around line 70).**

```js
const BIOME_META = {
  campsite: { label: 'Field Campsite', desc: 'Learners explore as naturalists in the field', icon: '🏕️' },
  lab:      { label: 'Science Lab',    desc: 'Learners work as scientists in a lab',          icon: '🔬' },
  workshop: { label: 'Workshop',        desc: 'Learners build and make in a workshop',         icon: '🔧' },
};
```

- [ ] **Step 4: Insert the "Your World" section inside `Step6Review`, after the "Sharing with" section.**

In `Step6Review`, find the section that ends after the student chips (the "Sharing with" `<div>` block ends around line 2278). Insert the "Your World" section after it:

```jsx
      {/* Your World: biome + portrait preview */}
      {(() => {
        const meta = BIOME_META[biomeId] ?? BIOME_META.campsite;
        return (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            marginBottom: 24, padding: '14px 16px',
            background: 'rgba(184,134,11,0.05)', borderRadius: 12,
            border: '1.5px solid rgba(184,134,11,0.25)',
          }}>
            {/* Portrait */}
            <div style={{ flexShrink: 0, width: 60, height: 92, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {portraitLoading ? (
                <div style={{
                  width: 40, height: 40, border: '3px solid var(--pencil)',
                  borderTopColor: 'var(--compass-gold)',
                  borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                }} />
              ) : (
                <CharacterPortrait
                  imageUrl={portraitUrl}
                  size={80}
                  label={`${meta.label} guide character`}
                  figureProps={{ outfit: biomeId === 'lab' ? 'lab' : biomeId === 'workshop' ? 'workshop' : 'field' }}
                />
              )}
            </div>

            {/* Biome info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 16 }}>{meta.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.ink, fontFamily: 'var(--font-body)' }}>
                  {meta.label}
                </span>
              </div>
              <p style={{ fontSize: 12, color: T.graphite, fontFamily: 'var(--font-body)', margin: '0 0 8px', lineHeight: 1.4 }}>
                {meta.desc}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={onRegenerate}
                  disabled={portraitLoading}
                  style={{
                    fontSize: 11, fontWeight: 600, color: T.labBlue,
                    background: 'none', border: `1px solid ${T.labBlue}`,
                    borderRadius: 6, padding: '3px 10px', cursor: 'pointer',
                    fontFamily: 'var(--font-body)', opacity: portraitLoading ? 0.5 : 1,
                  }}
                >
                  Change biome
                </button>
                {onRegeneratePortrait && (
                  <button
                    onClick={onRegeneratePortrait}
                    disabled={portraitLoading}
                    style={{
                      fontSize: 11, fontWeight: 600, color: T.graphite,
                      background: 'none', border: `1px solid ${T.pencil}`,
                      borderRadius: 6, padding: '3px 10px', cursor: 'pointer',
                      fontFamily: 'var(--font-body)', opacity: portraitLoading ? 0.5 : 1,
                    }}
                  >
                    {portraitLoading ? 'Generating…' : 'New portrait'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
```

- [ ] **Step 5: Add `onRegeneratePortrait` handler and pass all new props where `<Step6Review>` is rendered.**

First add the handler in the QuestBuilder root (around line 4356, near `handleRegenerate`):
```js
  const handleRegeneratePortrait = () => {
    if (portraitLoading) return;
    setPortraitUrl(null);
    setPortraitLoading(true);
    const pathwayLabels = selectedPathways
      .map((id) => CAREER_PATHWAYS.find((p) => p.id === id)?.label)
      .filter(Boolean);
    const portraitHint = pathwayLabels[0] ? `for a ${pathwayLabels[0].toLowerCase()} project` : '';
    generatePortrait(biomeId, portraitHint)
      .then((url) => setPortraitUrl(url))
      .catch(() => {})
      .finally(() => setPortraitLoading(false));
  };
```

Then find the `<Step6Review` JSX (around line 4533) and add the new props:
```jsx
                {step === 6 && generatedQuest && (
                  <Step6Review
                    generatedQuest={generatedQuest}
                    setGeneratedQuest={setGeneratedQuest}
                    selectedStandards={selectedStandards}
                    selectedPathways={selectedPathways}
                    questType={questType}
                    selectedStudents={selectedStudents}
                    allStudents={students}
                    selectedStudentId={selectedStudentId}
                    setSelectedStudentId={setSelectedStudentId}
                    selectedStudentIds={selectedStudentIds}
                    setSelectedStudentIds={setSelectedStudentIds}
                    setQuestType={setQuestType}
                    onLaunch={handleLaunch}
                    onDraft={handleDraft}
                    onRegenerate={handleRegenerate}
                    onAddToLibrary={handleAddToLibrary}
                    launching={launching}
                    saveError={saveError}
                    marbleStatus={marbleStatus}
                    marbleData={marbleData}
                    biomeId={biomeId}
                    portraitUrl={portraitUrl}
                    portraitLoading={portraitLoading}
                    onRegeneratePortrait={handleRegeneratePortrait}
                  />
                )}
```

- [ ] **Step 6: Verify in dev server.**

Run through the full QuestBuilder flow (Steps 1–6). Expected in Step 6:
- A "Your World" card appears below the "Sharing with" section
- While portrait is generating: spinner in the portrait slot
- When portrait arrives: `<img>` shows the AI-generated portrait (or `<FieldFigure>` if no fal.ai key)
- "Change biome" click navigates back to Step 4
- "New portrait" triggers a fresh portrait generation

- [ ] **Step 7: Commit.**

```bash
git add src/pages/QuestBuilder.jsx
git commit -m "feat(world): Step 6 'Your World' preview — portrait + biome card with regenerate"
```

---

## Task 8: `saveQuest` — persist `biome_id` + `character_image_url` + fire-and-forget decor

**Files:**
- Modify: `src/pages/QuestBuilder.jsx` — `saveQuest` function

- [ ] **Step 1: Add `biome_id` and `character_image_url` to the quest insert.**

In `saveQuest` (around line 3998), find the `supabase.from('quests').insert({` block. Add the two new fields:

```js
      const { data: quest, error: questError } = await supabase
        .from('quests')
        .insert({
          guide_id: user.id,
          title: generatedQuest.quest_title,
          subtitle: generatedQuest.quest_subtitle,
          narrative_hook: generatedQuest.narrative_hook,
          career_pathway: selectedPathways[0] || null,
          quest_type: questType,
          status,
          total_duration_days: generatedQuest.total_duration,
          academic_standards: selectedStandards.map((s) => s.id),
          reflection_prompts: generatedQuest.reflection_prompts,
          parent_summary: generatedQuest.parent_summary,
          project_mode: projectMode,
          biome_id: biomeId || 'campsite',
          character_image_url: portraitUrl || null,
        })
        .select()
        .single();
```

- [ ] **Step 2: Add fire-and-forget decor generation after stages are saved.**

Find the block in `saveQuest` where landmarks are generated (the `.then(landmarkData => ...)` block, around line 4100). After that block's closing `});`, add:

```js
        // Decor slots — fire-and-forget, non-blocking (same pattern as landmarks)
        const biomeCfg = getBiome(biomeId || 'campsite');
        const decorSlots = biomeCfg?.decor || [];
        if (decorSlots.length > 0 && createdQuestId) {
          const questTitle = generatedQuest.quest_title || '';
          Promise.allSettled(
            decorSlots.map(async (d) => {
              const { url, prompt } = await generateDecorSlot(d.slot, biomeId, questTitle);
              await supabase.from('quest_decor').upsert(
                {
                  quest_id: createdQuestId,
                  slot:     d.slot,
                  image_url: url,
                  prompt,
                  style_prefix_version: 'v1',
                },
                { onConflict: 'quest_id,slot' }
              );
            })
          );
        }
```

- [ ] **Step 3: Verify a quest saves with the new fields.**

In dev server, complete a full QuestBuilder run and launch or save as draft. In Supabase Studio, check the `quests` table — the new row should have `biome_id = 'campsite'` and `character_image_url` set (or null if no fal.ai key). If a fal.ai key is present, also check the `quest_decor` table for rows for this quest_id.

- [ ] **Step 4: Commit.**

```bash
git add src/pages/QuestBuilder.jsx
git commit -m "feat(world): saveQuest persists biome_id, character_image_url, and decor slots"
```

---

## Task 9: Update `BiomeScene` to render `CharacterPortrait`

**Files:**
- Modify: `src/components/world/BiomeScene.jsx`
- Modify: `src/components/world/BiomeScene.test.jsx` (update test fixture to test portrait path)

- [ ] **Step 1: Replace the `FieldFigure` import with `CharacterPortrait` in `BiomeScene.jsx`.**

Find the import near the top of `src/components/world/BiomeScene.jsx`:
```js
import FieldFigure from './FieldFigure';
```

Replace with:
```js
import CharacterPortrait from './CharacterPortrait';
```

- [ ] **Step 2: Replace the `<FieldFigure>` render with `<CharacterPortrait>` in `SceneInner`.**

Find the FieldFigure render block inside `SceneInner` (inside the `{guideHotspot && ...}` check):

```jsx
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
```

Replace with:
```jsx
        {guideHotspot && (
          <div
            className="biome-scene__figure"
            style={{ left: guideHotspot.x, top: guideHotspot.y }}
            aria-hidden="true"
          >
            <CharacterPortrait
              imageUrl={quest?.character_image_url || null}
              size={72}
              label="Your field guide"
              figureProps={{ skinTone: 'medium', hairTone: 'dark', outfit: 'field', mood: 'happy' }}
            />
          </div>
        )}
```

- [ ] **Step 3: Add a CharacterPortrait render test to `BiomeScene.test.jsx`.**

Open `src/components/world/BiomeScene.test.jsx`. After the last existing test, add:

```jsx
  it('renders an <img> at the guide hotspot when quest.character_image_url is set', () => {
    const questWithPortrait = { ...quest, character_image_url: 'https://cdn.fal.ai/portrait.png' };
    render(<BiomeScene quest={questWithPortrait} stages={stages} studentSession={session} />);
    const img = document.querySelector('.biome-scene__figure img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://cdn.fal.ai/portrait.png');
  });

  it('renders FieldFigure SVG at the guide hotspot when character_image_url is null', () => {
    render(<BiomeScene quest={quest} stages={stages} studentSession={session} />);
    const svg = document.querySelector('.biome-scene__figure svg');
    expect(svg).toBeTruthy();
  });
```

- [ ] **Step 4: Run the BiomeScene tests.**

```bash
cd "/Users/md/Quest Lab/quest-lab-world-upgrade"
npx vitest run src/components/world/BiomeScene.test.jsx
```

Expected: all 6 pass (4 original + 2 new).

- [ ] **Step 5: Run the full test suite.**

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 6: Commit.**

```bash
git add src/components/world/BiomeScene.jsx src/components/world/BiomeScene.test.jsx
git commit -m "feat(world): BiomeScene shows CharacterPortrait — AI img or FieldFigure fallback"
```

---

## Task 10: Phase 2 acceptance gate

- [ ] **Step 1: Run full test suite.**

```bash
cd "/Users/md/Quest Lab/quest-lab-world-upgrade"
npm run test:run
```

Expected: **all tests pass** (72 Phase-0/1 tests + ~20 new = ~92 total).

- [ ] **Step 2: Build check.**

```bash
npm run build 2>&1 | tail -20
```

Expected: clean build, no errors.

- [ ] **Step 3: Manual end-to-end gate (requires VITE_FAL_KEY in .env.local).**

Start dev server: `npm run dev`

**QuestBuilder flow:**
- [ ] Navigate to `/quest/new`, complete Steps 1–3
- [ ] Step 4 shows three biome cards — Campsite selected, Lab/Workshop grayed with "Coming soon"
- [ ] Advance to Step 5 — quest generation starts; portrait generation fires in background (check network tab: POST to fal.ai)
- [ ] Step 6 shows "Your World" card below "Sharing with" section
- [ ] If portrait generation has finished: `<img>` appears in the portrait slot
- [ ] If still generating: spinner appears, then portrait appears when ready
- [ ] "Change biome" returns to Step 4 with campsite still selected
- [ ] "New portrait" triggers a fresh fal.ai call and spinner
- [ ] Launch or Save as Draft completes without error

**Supabase verification:**
- [ ] In `quests` table: new row has `biome_id = 'campsite'`, `character_image_url` = URL (not null)
- [ ] In `quest_decor` table: two rows exist for the quest (slots `bulletin_note` and `trailhead_banner`)

**Biome world view (student):**
- [ ] Navigate to `/q/<quest-id>` — campsite biome loads
- [ ] At the guide hotspot (`46%, 72%`) the AI portrait `<img>` is rendered, styled with oval crop
- [ ] Navigate to `/q/<old-quest-id>` (one without `character_image_url`) — `<FieldFigure>` renders at the guide hotspot instead

**Fallback test (remove or clear VITE_FAL_KEY):**
- [ ] Complete a QuestBuilder run without a fal.ai key — no errors thrown, no spinner hangs, portrait slot shows `<FieldFigure>` in Step 6, quest saves with `character_image_url = null`
- [ ] Student visiting that quest's biome world sees `<FieldFigure>` at guide hotspot

- [ ] **Step 4: Commit acceptance gate notes.**

```bash
git commit --allow-empty -m "chore: Phase 2 acceptance gate passed — AI portraits live, fallbacks clean"
```

- [ ] **Step 5: Push branch.**

```bash
git push origin feature/illustrated-world
```

---

## Phase 2 acceptance summary

Phase 2 is complete when:
1. All ~92 tests pass
2. Build is clean
3. Quests published via QuestBuilder have `biome_id` and `character_image_url` set in Supabase
4. The biome world renders the AI portrait at the guide hotspot for quests that have one
5. Old quests (no `character_image_url`) render `<FieldFigure>` — no regressions
6. Removing `VITE_FAL_KEY` causes graceful silent fallback throughout, no errors

---

## Phases 3–6 outline (re-plan before starting)

### Phase 3 — Tactile 3D props
`<TactileProp>` portal mounting `react-three-fiber` `<Canvas>` on hotspot zoom. Five GLB props: lantern, journal, specimenJar, mailbox, tent. Single-canvas guarantee. **Gate:** tapping the stage-1 lantern shows a rotatable 3D lantern model.

### Phase 4 — Field Station hub (`/station`)
New `/station` route replacing `/student`. Hub parallax scene with wall map, specimen cabinet, bulletin board, door, window. Biome travel from the map. **Gate:** learner logs in, lands in Station, travels to campsite from map.

### Phase 5 — Lab + Workshop biomes
Two more SVG trios + biome configs. No new renderer code. Auto-suggest covers all three biomes. **Gate:** three biomes render and hotspot configs validate cleanly.

### Phase 6 — Polish + parent peek-in
Parent dashboard view-into-biome. Group teammates as additional tent hotspots. Accessibility audit. Performance budget verification.
