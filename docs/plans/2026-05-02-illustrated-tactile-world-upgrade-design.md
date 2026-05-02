# Illustrated + Tactile World — Visual & IA Upgrade

**Date:** 2026-05-02
**Status:** Approved (brainstorm)
**Inspiration:** [bedriyan/medkit-app](https://github.com/bedriyan/medkit-app) — voice-first OSCE simulator. Specifically the doorway-brief framing, hand-built single-world reuse, procedural character SVGs, and "plush" reusable primitive.
**Relationship to prior work:** This is an **upgrade** to the World Engine shipped in March 2026 (designs `2026-03-07-immersive-3d-worlds-design.md`, `2026-03-10-world-engine-redesign.md`; code in `WorldRenderer.jsx`, `CampHub.jsx`, `WorldChat.jsx`, `lib/worldEngine.js`). The engine — AI Blueprint generation, Mentor / Challenger / Campfire characters, Hero's Journey beat mapping, in-world chat — **stays.** The visual treatment, hub, and interaction model are what we're replacing.

---

## Why this exists

The shipped World Engine renders each project as a CSS gradient + animated particle system + chat panels. Per project, an AI blueprint produces a setting name, mentor persona, palette, and a particle preset (bubbles, leaves, embers, snow). The atmosphere is mood; the work happens in chat panels overlaid on the mood.

That's not what medkit does. In medkit, the learner is *placed in a hand-built room* with discrete objects, where the work happens *as exploration of those objects* — sitting at the desk, taking the patient's history across the desk, examining the printout in your hand. The room is the same for every case; what varies is the patient inside, the conversation, the artifacts. **The world is the floor; the content is the furniture.**

We want that placed-in-a-place feeling for Diagonally learners. The shipped system has the right *engine* but the wrong *visual surface*. This design replaces the visual surface.

---

## What we keep, replace, and add

### Keep (no code changes required)

| Existing piece | Why we keep it |
|---|---|
| `lib/worldEngine.js` — AI Blueprint generator with mentor/challenger/setting/beats | The narrative engine works. Output schema needs one new field (`biome_id`); rest unchanged. |
| `WorldChat.jsx` — Mentor + Challenger + submission chat | All the conversational AI logic. We re-render it inside hotspots instead of as full-screen panels, but the component stays. |
| `CampfireChat.jsx` — metacognitive reflection | Stays. Renders inside the Reflection Journal hotspot. |
| `useAmbientSound.js` — ambient audio per blueprint preset | Stays. Already maps preset → sound; we just bind to biome instead of per-project preset. |
| `xp` system, `ExplorerRankBadge`, `XPToast` | Stay. Surfaced more subtly in Field Station, not on every screen. |
| `HERO_JOURNEY_BEATS`, `mapStagesToBeats` | Stay. Beat label appears on the active stage's hotspot in-world. |
| Supabase data model for quests, stages, submissions, feedback, mastery, parent access | Almost no changes — see migrations below. |
| Guide side: `Dashboard.jsx`, `QuestBuilder.jsx`, `StudentsPage.jsx`, etc. | Untouched except for one new step in QuestBuilder Step 5 (biome picker) and a publish-time art-gen modal in Step 6. |

### Replace

| Replacing | With | Why |
|---|---|---|
| **Particle systems** in `WorldRenderer.jsx` (bubbles, leaves, embers, snow, etc.) | Hand-illustrated SVG parallax layers per biome + curated ambient motion (lantern flicker, paper curl, moth flutter) | Particles read as "mood overlay." Illustration reads as "real place." |
| **Per-project AI-generated palette + setting** (`AMBIENT_PRESETS`, `blueprintToCSSVars`) | A small library of hand-illustrated **biomes** (campsite, lab, workshop to start), guide picks one. Blueprint still chooses a *suggested* biome but content authors and learners experience a consistent rendered place. | Brand consistency. Illustrator can do 3 biomes well; cannot do 1000 generated palettes well. |
| **Full-bleed atmospheric chat panels** in `WorldRenderer.jsx` | In-world **hotspots** at fixed positions (the firepit, the bulletin board, the journal on the log). Tap → camera dollies → content renders *as* an in-scene object (note nailed to tent wall, journal page, letter unfolds). | Placed-in-a-place vs. mood-and-chat. |
| **`CampHub.jsx`** (the existing hub: ember particles, Journey Wall, ranking, copy-pin, AI-blueprint preview) | **Field Station** — illustrated study/wagon/treehouse hub with desk, wall map (project pins), specimen cabinet (artifacts), bulletin board (incoming), door (continue), window (ambient). | Same role; visual treatment matches biomes. |
| **Routing fork** (`/world/:id` for blueprinted, `/q/:id` for legacy) | Single `/q/:id` route. Biome view is default; `?view=list` is the linear text fallback. `/station` replaces `/student-home` for the hub. | Simpler IA. List view is for accessibility/perf, not legacy. |

### Add (new)

| New piece | What it does |
|---|---|
| `<Specimen>` primitive | Diagonally's analog of medkit's `.plush` — one component used for every card / label / portrait / pin in the world. Deckled paper edge, soft drop shadow, optional pin/tape, 1° seeded jitter. |
| `<ParallaxScene>` | Three-layer (back/mid/fore) SVG renderer with optional mouse/tilt-driven depth. Drives all biomes and the Field Station. |
| `<Hotspot>` | Positioned, keyboard-focusable button bound to a biome-config role + state (`future`/`active`/`completed`). |
| `<TactileProp>` | Portal that mounts a `react-three-fiber` `<Canvas>` with a single GLB model when a hotspot is zoomed. The Room–style tactile moments (lantern dial, journal flip, specimen rotation). At most one alive at a time. |
| `<FieldFigure>` | Procedural pencil-and-wash SVG character with parametric `skin/hair/outfit/mood/holding`. Fallback when AI-gen portraits fail. |
| Image-gen pipeline (`ai.generateProjectArt`) | Calls fal.ai (or equivalent) with a versioned `STYLE_PREFIX_V1` to produce per-project character portraits + decorative items (notes, posters, labels). Runs once at QuestBuilder publish time; cached. |
| Biome library (`src/biomes/<id>/`) | Per biome: `back.svg` + `mid.svg` + `fore.svg` + `index.ts` (hotspot manifest). Three biomes for v1: `campsite`, `lab`, `workshop`. |

---

## Section 1 — Overview, goal, non-goals

### Mental model

A learner logs in and lands in their **Field Station** — a persistent illustrated home base (study, wagon, or treehouse, TBD with illustrator). On the wall is a map. Each pin is a project. Tapping a pin "travels" them to that project's **biome** — campsite, lab, or workshop — where the work happens *as exploration of the place*. Lanterns light up as stages unlock. A friend by the fire is the AI Mentor (the existing `WorldChat` mentor, re-rendered as an in-world character). Pinning a deliverable to the bulletin board is how submissions work. A folded letter from the mailbox is how AI feedback arrives.

Each biome is a hand-illustrated 2D parallax scene. Key tactile props (the journal that opens, the lantern you twist, the specimen jar you rotate) are real `react-three-fiber` 3D objects layered into the scene. AI generates the *contents* of the world — character portraits, decorative items — not the world itself.

### Success looks like

- A 12-year-old on her third project doesn't think she's "doing schoolwork" — she's continuing a story in a place she recognizes.
- A guide creating a project picks a biome the way she picks a folder. The world assembles itself around her existing quest content + AI-generated character + decor. No new authoring burden.
- Past projects leave visible artifacts in the Field Station (specimens collected, badges earned, postcards from places), so the learner sees their own track record physically.
- Tapping the lantern, opening the journal, or rotating a specimen *feels* mechanical — not animated, mechanical.

### Non-goals

- **Not a game.** No score, no XP gating, no win/lose. (Existing XP system stays as a quiet rank, not gamification.)
- **Not full 3D walkable worlds.** No `react-three-fiber` polyclinic-scale builds. 3D is reserved for *interactive props inside an otherwise 2D scene.*
- **Not AI-generated biomes.** Biomes are hand-illustrated, once. AI generates content *inside* them.
- **Not a full rebrand.** Guide-side stays parchment / Instrument Serif / specimen-card. Contrast with the alive learner world is intentional.
- **Not the only view.** A list-view fallback (`?view=list`) exists for accessibility, slow connections, and learners who prefer linear text.

### The bet

Medkit's hackathon win came from one insight — *role-cast the learner into a real situation and the work transforms.* Plush sticker style was the wrapper, not the magic. Our shipped World Engine has the right narrative pieces (mentor, challenger, beats) but renders them as mood-lit chat. We're betting that **placing those same pieces in a hand-illustrated location with tactile props delivers what the engine alone can't.**

---

## Section 2 — Information architecture

### Routes

| Today | Tomorrow |
|---|---|
| `/student-home` | `/station` |
| `/q/:questId` (no blueprint) | `/q/:questId` (biome view, default) |
| `/world/:questId` (with blueprint) | (gone — folded into `/q/:questId`) |
| (none) | `/q/:questId?view=list` (linear/accessibility view) |
| (none) | `/q/:questId/stage/:stageId` (deep-link to stage location inside biome) |

### Field Station (hub) — structure

A single screen. Three parallax SVG layers + ambient motion. Hotspots:

- **Wall map** → opens a "travel" overlay listing active project pins. Selecting a pin → scene transition → biome.
- **Project journal on desk** → list view of active projects (also the accessibility fallback).
- **Specimen cabinet** → skill mastery + badges. Mirrors current `MyProgressPage` and `CollectionPage` data, rendered as objects inside cabinet glass. Optionally one 3D specimen visible inside the cabinet — the "current artifact" — as a single shared 3D moment.
- **Bulletin board** → unread items: AI feedback letters, guide messages, parent notes, teammate updates.
- **Door** → returns to the biome of the most recently active project ("continue where you left off").
- **Window** → ambient only; time-of-day tint matches local clock. Decorative.

A thin always-on top bar (out of world): Diagonally wordmark, "Learner View" pill, sign-out, view-toggle, calm-mode toggle. The diegesis breaks here on purpose so power-users / parents / accessibility can navigate.

### A biome (project) — general shape

Every biome shares the same hotspot *roles*; objects fulfilling them differ. This is the medkit-polyclinic discipline: one structure, many cases.

| Role | Campsite | Lab | Workshop |
|---|---|---|---|
| **Driving question sign** | Note on trailhead post | Whiteboard at entrance | Chalkboard above the bench |
| **Stage path** | Lanterns along trail | Lab benches in sequence | Tool stations along workbench |
| **Active stage location** | Tent / log / stream | Microscope / fume hood / aquarium | Bandsaw / lathe / paint booth |
| **AI Mentor (Field Guide)** | Friend at firepit | Lab partner at next bench | Mentor on a stool |
| **Submission** | Pin specimen to bulletin between trees | Slide tray on the rack | Hang piece on the pegboard |
| **Feedback letter** | Mailbox by the trail | In-tray on the desk | Note tucked into the toolbox |
| **Devil's Advocate (Challenger)** | Stranger walks into camp | Visiting researcher knocks | Inspector arrives with clipboard |
| **Reflection journal (Campfire)** | Notebook on log | Lab notebook on bench | Builder's journal on workbench |
| **Stretch challenge** | Side trail into woods | Backroom door | Loft ladder upstairs |
| **Group teammates** | Other tents | Other lab stations | Other workbenches |
| **Parent outcomes letter** | Tucked in your tent | Tucked in your locker | Tucked in your apron pocket |

The same `<BiomeScene>` component renders all three. Difference is data: a `biome.config.ts` per biome declaring SVG layers, hotspot positions (`%` coordinates), and which role each plays.

### Stage progression model

Stages have three visual states: **future** (hotspot dim, can preview but not act), **active** (hotspot glowing, full interaction), **completed** (hotspot lit but soft, returnable for review). The world *progresses* — when you complete stage 1, the lantern at stage 2 ignites with a 600ms animation, and a fresh detail (a moth, a curl of smoke, an arriving friend) appears in the scene to mark the transition. Visual progression = motivation, no XP needed.

### Where 3D lives

- **Wide biome view** (the campsite from a distance) → 100% 2D parallax SVG. No 3D. Performance-cheap, accessible-friendly, fast first paint.
- **Inside a hotspot** (you've zoomed/dollied into the tent, lantern, journal, specimen jar) → 3D prop is mounted via `react-three-fiber`. Backing out unmounts the canvas.
- **Field Station (hub)** → 100% 2D parallax. Optionally a single 3D specimen visible inside the cabinet glass — the "current artifact."

---

## Section 3 — Visual + interaction language

### Single primitive: `<Specimen>`

Medkit had `.plush` reused across every screen — one ~30-line CSS class that gave the whole app its DNA. Our equivalent is `<Specimen>`: a React component that renders any "thing" in the world (a card, a label, a portrait, a hotspot frame) with consistent field-journal treatment — deckled paper edge, faint paper-grain texture, soft drop shadow, optional pin/tape/clip detail, slight rotation jitter (~1°). Three sizes, four pin styles. **Everything visible to the learner — except the parallax scenery itself — is a `<Specimen>`.**

### Parallax depth — three layers per biome

`back/`, `mid/`, `fore/` SVGs. CSS `transform: translate3d(...)` keyed off mouse position (desktop) or device tilt (mobile, optional). Movement is subtle — 6–12px max — so it reads as depth, not parallax-vertigo. `<ParallaxScene>` wraps three absolutely-positioned layers; Framer Motion drives the transforms.

### Ambient motion — every biome has 4–6 always-running animations

Field-journal register, not plush:

| Plush register (medkit) | Field-journal register (Diagonally) |
|---|---|
| Eyes blink | Lantern flame flickers |
| Cards wobble | Paper corner curls in breeze |
| Buttons breathe | Ink-stipple shimmers (very subtle) |
| Doodles drift | Moth flutters across the scene |
| Sparkles | Pressed-leaf falls past, slow |

All <500ms staggered loops. CSS keyframes where possible; Framer Motion for the more complex ones (moth path).

### Tactile hotspot — the Room moment

Tap an active hotspot → camera zooms (CSS scale + translate, 600ms ease-out). The 2D background blurs slightly. A `<TactileProp>` mounts: a `react-three-fiber` `<Canvas>` with one model loaded. Press-and-drag rotates it; specific gestures (twist the lantern, pinch the journal corner) trigger state changes. Backing out unmounts the canvas. **We never run more than one 3D canvas at a time** — guaranteed by route/state machine.

### Procedural `<FieldFigure>` — the character generator

Medkit's `<CuteFace>` is ~100 lines of parameterized SVG. Our `<FieldFigure>` does the same in field-naturalist register: pencil-and-wash style, hatched shading, optional gear (botanist's vest, lab coat, mechanic's apron, beekeeper's hood). Knobs: `skinTone`, `hairTone`, `outfit`, `mood`, `holding`. Used as fallback when AI-gen portraits fail, and for the learner's own avatar.

### AI-generated character portraits — separate path

When a project needs a *bespoke* character (the friend at the firepit, the Devil's Advocate stranger), we call an image-gen provider with a fixed style prompt — *"vintage natural-history color plate, sepia + parchment background, ink-line + watercolor wash, headshot framed in oval"* — and cache the result keyed on `(quest_id, role)`. Generation happens **once per project at QuestBuilder publish time**, not per render. Fallback: deterministic `<FieldFigure>`.

### AI-generated decorative content — same pipeline, smaller scope

The notes on the cork board, posters on the lab wall, labels on jars are generated as small images at QuestBuilder save time and stored alongside the quest. Same fixed style prompt. Same fallback to a generic illustrated stand-in.

### Color + typography

Reuse what's there. Palette in `src/index.css`: `--ink`, `--paper`, `--parchment`, `--graphite`, `--specimen-red`, `--field-green`, `--compass-gold`, `--lab-blue`. Typography: Instrument Serif for headlines / signs / pinned notes, DM Sans for chat / body, IBM Plex Mono for journal entries. **No new colors. No new fonts.**

### Hand-placed jitter — the medkit lesson

Every `<Specimen>` gets `--jitter: ${seededRotate(id)}deg` from a deterministic hash of its ID, so it's slightly rotated but doesn't change between renders. ~1° max either direction. Pinned notes are 2°. Single cheapest move; biggest perceptual win.

---

## Section 4 — Tech architecture

### Component tree

```
<App>
  <ProtectedRoute>
    <Station/>                    ← /station (replaces StudentHome route)
      <ParallaxScene biome="station"/>
        <Hotspot role="map" />
        <Hotspot role="journal" />
        <Hotspot role="cabinet" />
        <Hotspot role="bulletin" />
        <Hotspot role="door" />
      <TopBar slim/>              ← out-of-world

    <Biome/>                      ← /q/:questId (replaces both /q and /world routes)
      <ParallaxScene biome="campsite|lab|workshop"/>
        <Hotspot role="trailheadSign" stageId={null}/>
        <Hotspot role="stage" stageId="..." n=1.../>
        <Hotspot role="guide"/>           ← renders <WorldChat mode="mentor"/>
        <Hotspot role="bulletinSubmit"/>  ← renders submission flow
        <Hotspot role="mailbox"/>         ← renders feedback letter
        <Hotspot role="challenger"/>      ← renders <WorldChat mode="challenger"/>
        <Hotspot role="reflection"/>      ← renders <CampfireChat/>
        ...
      <ZoomedView/>               ← portal, mounts on hotspot tap
        <TactileProp model="lantern.glb|journal.glb|specimenJar.glb"/>
        <SceneOverlay/>           ← AI-rendered notes, in-world chat
      <TopBar slim/>
```

### Biome config — `src/biomes/<id>/index.ts`

```ts
export const campsite: BiomeConfig = {
  id: 'campsite',
  layers: { back: 'back.svg', mid: 'mid.svg', fore: 'fore.svg' },
  ambient: ['lanternFlicker', 'mothFlutter', 'leafFall', 'paperCurl'],
  hotspots: [
    { role: 'trailheadSign',  x: '12%', y: '62%', tactile: 'note.glb' },
    { role: 'stage',          x: '34%', y: '58%', stageIndex: 0, tactile: 'lantern.glb' },
    { role: 'stage',          x: '52%', y: '54%', stageIndex: 1, tactile: 'tent.glb' },
    { role: 'stage',          x: '68%', y: '50%', stageIndex: 2, tactile: 'journal.glb' },
    { role: 'guide',          x: '46%', y: '72%', tactile: null },
    { role: 'bulletinSubmit', x: '78%', y: '46%', tactile: null },
    { role: 'mailbox',        x: '88%', y: '64%', tactile: 'mailbox.glb' },
    { role: 'reflection',     x: '40%', y: '76%', tactile: 'journal.glb' },
    { role: 'challenger',     x: '20%', y: '70%', tactile: null },
    ...
  ],
};
```

A biome is just an SVG asset trio + a hotspot manifest. **Adding a biome later = three SVGs + one config file.** No code changes to the renderer.

### Data flow — what comes from where

| Surface | Source | Notes |
|---|---|---|
| Active project list, pin map | existing `quests` table (Supabase), filtered by student_id | No schema change |
| Stage lanterns, lit/active/dim states | existing `quest_stages` + `quest_progress` | No schema change |
| Mentor character + Hero's Journey beats | existing `lib/worldEngine.js` blueprint output | No change to engine |
| Biome choice for a quest | **new column** `quests.biome_id` (`'campsite'\|'lab'\|'workshop'`) | Migration 056 |
| AI-gen character portrait | **new column** `quests.character_image_url` | Cached blob URL in Supabase Storage |
| AI-gen decorative content (notes, posters, labels) | **new table** `quest_decor` (project_id, slot, image_url, prompt) | Migration 057 |
| Specimen-cabinet artifacts in Field Station | derived from `student_skills` + `submissions` | No schema change; mapping is client-side |
| AI Mentor chat (firepit hotspot) | existing `ai.questHelp()` + `guide_messages` + `WorldChat.jsx` | Same backend; new front-end mounting point |
| Submission flow at bulletin board | existing `submissions` + signed-upload helper | Reuse |
| AI feedback letter from mailbox | existing `submission_feedback` | New rendering, same data |

### 3D asset pipeline

GLB files in `public/3d/<prop>.glb`. Loaded via `useGLTF()` from `@react-three/drei` only after a hotspot tap. No GLBs in initial bundle. Curated set for MVP: `lantern.glb`, `journal.glb`, `specimenJar.glb`, `mailbox.glb`, `tent.glb`. Models hand-built in Blender or sourced from Quaternius/Kenney and re-styled to match field-journal register. Optional v2: AI-gen specimen meshes via Meshy webhook → GLB → cached in Storage.

### AI image-gen pipeline

Provider: `fal.ai` (cheap, fast, model-agnostic) wrapped behind one helper:

```ts
ai.generateProjectArt(quest_id, slot, prompt, style_prefix=STYLE_PREFIX_V1)
  → uploads to Supabase Storage → returns URL → caches in DB
```

Triggered **once at QuestBuilder publish time**, with a deterministic seed per `(quest_id, slot)`. Fallback: `<FieldFigure>` for characters, generic stand-in `<Specimen>` for decor. The `style_prefix` is the single source of brand consistency — versioned constant, never user-editable. Bumping version = backfill regenerate.

```ts
const STYLE_PREFIX_V1 =
  "vintage natural-history color plate, sepia + cream parchment background, " +
  "ink-line + watercolor wash, hand-drawn naturalist register, soft edges, " +
  "no modern UI elements, no text overlays, gentle muted palette";
```

### State management

Reuse existing `AuthContext`. Add one new context: `<WorldStateProvider>` — holds camera state (wide vs zoomed-into-hotspot), active hotspot, ambient-motion run flags, and `prefers-reduced-motion` preference. ~80 lines. No Redux/Zustand.

### Performance budget

| Surface | First-paint target | Notes |
|---|---|---|
| Field Station | < 1.2s on Chromebook | Three SVG layers <200kb total; no 3D until tap |
| Biome wide view | < 1.5s | Same approach; ambient motion lazy-starts after paint |
| Hotspot zoom + 3D mount | < 600ms perceived | `<TactileProp>` lazy-loaded chunk; one GLB at a time |
| Reduced-motion mode | Disables ambient + parallax + camera zoom (instant cuts) | Detected via `prefers-reduced-motion` and a user toggle |

### New dependencies

- `@react-three/fiber` + `@react-three/drei` (3D props)
- `framer-motion` (parallax + camera zoom)
- One image-gen client (e.g., `@fal-ai/serverless-client`)
- *No* game engine, *no* state library, *no* canvas/Pixi.

### Migrations

- `056_biome_assignment.sql` — adds `quests.biome_id`, `quests.character_image_url`
- `057_quest_decor.sql` — new table for decorative AI-gen images per quest

### Existing file impact

| File | Impact |
|---|---|
| `pages/student/WorldRenderer.jsx` (889 lines) | **Replaced** by `<Biome>` — but `WorldChat` mounting points and blueprint binding are preserved |
| `pages/student/CampHub.jsx` (922 lines) | **Replaced** by `<Station>` — same data, different rendering |
| `pages/student/StudentHome.jsx` | **Removed** (route absorbed by `/station`) |
| `pages/student/StudentQuestPage.jsx` | **Replaced** by `<Biome>` — list-view content lives in `?view=list` mode |
| `components/world/WorldChat.jsx` (1,293 lines) | **Kept**, mounted at hotspot positions instead of full-screen |
| `components/social/CampfireChat.jsx` (132 lines) | **Kept**, mounts inside Reflection Journal hotspot |
| `lib/worldEngine.js` (72 lines) | **Kept**, output schema gains `biome_id` field; setter logic in QuestBuilder |
| `hooks/useAmbientSound.js` (80 lines) | **Kept**, bound to biome-level preset instead of per-blueprint |
| `pages/student/CollectionPage.jsx`, `MyProgressPage.jsx`, `ExploreSkillPage.jsx`, `ShopPage.jsx` | **Kept** as `?view=list` deep-link destinations + cabinet/bulletin renderings; not removed |
| `pages/student/StudentLogin.jsx`, `LearnerIntakeForm.jsx`, `StudentProjectBuilder.jsx` | **Untouched** |
| Guide-side files (Dashboard, QuestBuilder, etc.) | **Untouched** except QuestBuilder Step 5 (biome picker) and Step 6 (publish-time art-gen modal) |

---

## Section 5 — Content authoring (guide side)

### Guiding principle: zero new burden

Today's QuestBuilder is a 6-step wizard. We add one tiny step and one optional moment, no new content fields.

| Step | Today | Tomorrow |
|---|---|---|
| 1. Learners + context | unchanged | unchanged |
| 2. Topic + driving question | unchanged | unchanged |
| 3. Skills + career pathway | unchanged | unchanged |
| 4. AI generation | unchanged | unchanged |
| **5. Review** | Read stages, edit | **+ "Choose the world for this quest"** — three illustrated thumbnails (Campsite / Lab / Workshop). Default suggested by AI based on topic; one click to override. |
| **6. Publish** | Save + share | **+ "Generating your world…"** — runs `ai.generateProjectArt()` for character portrait + ~6 decor slots, in parallel, with a progress bar (~15–30s). Failures fall back silently to defaults. Guide can publish immediately and let gen finish in background; learner gets stand-ins until art lands (Supabase realtime swap). |

### Biome auto-suggest

```ts
function suggestBiome({ topic, skills, careerPathway, blueprint }) {
  // Prefer existing blueprint setting if present
  if (blueprint?.suggestedBiome) return blueprint.suggestedBiome;
  const text = [topic, ...skills, careerPathway].join(' ').toLowerCase();
  if (/eco|nature|outdoor|environ|river|forest|wildlife/.test(text)) return 'campsite';
  if (/lab|chem|bio|micro|exper|data|research/.test(text)) return 'lab';
  if (/build|design|engineer|maker|craft|robot|art/.test(text)) return 'workshop';
  return 'campsite';
}
```

Suggestion only — guide always confirms.

### Cost discipline

~7 images per quest at publish × ~$0.01–0.02 each = under $0.15 per quest. Cap with per-school monthly limit (server-side enforced); surface usage in guide settings. Never auto-regenerate; only on explicit user action.

### Style consistency

All gen calls go through helper with versioned `STYLE_PREFIX_V1`. Stored as versioned constant. Guides cannot override. Refresh look = bump version + run backfill.

### Authoring artifacts the guide does NOT touch

- Hotspot positions (locked by biome config)
- 3D prop library (curated)
- Style prefix (versioned constant)
- Ambient motion patterns

Reduces decision fatigue + protects look across thousands of quests.

### Guide preview

From QuestBuilder Step 6, "Preview as learner" button opens biome in a new tab — full diegetic view, all stages forced "active" so the guide can click around. Read-only; no submissions persist.

---

## Section 6 — Accessibility + fallback list-view

### Three principles, in priority order

1. **Every interaction available without the world.** No work — submitting, reading prompts, chatting with Mentor, viewing feedback — should require navigating a 2D scene or a 3D prop.
2. **Reduced-motion is a real mode.** When `prefers-reduced-motion` is set (or user toggles it), parallax, ambient animations, camera zoom, and 3D prop spin all turn into instant cuts and static images. The world doesn't disappear; it stops moving.
3. **The list view is the system of record.** A learner who only ever uses `?view=list` should be able to complete projects, see feedback, chat, reflect — the diegetic view is a *renderer* on top of the same data, not a different feature.

### Reduced-motion mode (auto + manual)

| Effect | Default | Reduced-motion |
|---|---|---|
| Parallax depth | mouse/tilt-tracking | layers static |
| Ambient motion (lantern, moth, leaves) | always running | disabled |
| Camera zoom on hotspot tap | 600ms ease | instant |
| 3D prop rotation | drag-to-rotate | static front view |
| Stage-unlock animation | lantern ignites + moth flies in | new lantern simply lit |
| Page transitions | crossfade | instant |

Detected via `prefers-reduced-motion: reduce`. Override toggle in TopBar settings dropdown ("Calm mode"). Persists in `profiles.preferences`.

### List-view fallback (`?view=list`)

A linear, screen-reader-first rendering of the same project. No biome assumptions. Mirrors current `StudentQuestPage` structure but with the new content model. Toggle prominently in the slim top bar. Choice persists per-learner.

### Hotspot semantics

Every hotspot is a real `<button>` with:
- Focusable, `Tab` order matches reading order
- `aria-label` describing role in plain language: *"Lantern — Stage 2: Map your watershed (active)"*
- `aria-disabled="true"` for `future` stages with screen-reader explanation: *"Locked. Complete previous stage to unlock."*
- Keyboard activation = same as tap. Focus ring visible.

### 3D prop accessibility

When `<TactileProp>` mounts, canvas is wrapped with:
- `role="img"` + descriptive `aria-label` ("A lantern with a brass dial. Currently dim. Press Space to twist on.")
- Alternative non-3D control surface: keyboard shortcuts for the same gesture (Space to toggle, arrows to rotate). Drag-to-rotate on touch is supplementary, not exclusive.
- If WebGL fails or unavailable, fall back to static SVG illustration of the prop with simple toggle button — feature parity, lower fidelity.

### Asset-failure resilience

- AI character portrait fails → deterministic `<FieldFigure>`. Learner never sees broken-image icon.
- AI decorative content fails → generic illustrated `<Specimen>` stand-in.
- Biome SVG layer fails → degrade to paper-textured background with hotspots positioned by `(x%, y%)`. Functional, less rich.
- 3D model fails → single-frame illustration of the prop, retains hotspot interaction.

**Graceful degradation in layers. No single asset failure breaks the experience.**

### Low-bandwidth mode

Detected via Network Information API (`navigator.connection.saveData` or `effectiveType === '2g'`). Or manual toggle. Disables: 3D mounts entirely, AI-gen decorative content, parallax tracking. Keeps: SVG biome layers, AI character portrait if cached, all functional interactions.

### Color contrast

Text on parchment background — already validated to WCAG AA in current Diagonally palette. Re-check `<Specimen>` text on illustrated layers. If needed, add translucent off-white scrim behind text on illustrated backgrounds.

### Screen-reader narrative

Hidden `<h1>` + `<nav>` + structural landmarks so SR users get coherent linear traversal: *"Field Station. Active projects: 3. Project map: 3 pins. River Ecology — Campsite biome — Stage 2 of 4 active."* The diegetic surface is for sighted users; the semantic surface is the source of truth.

---

## Section 7 — MVP scope + phasing

### The brutal MVP (Phase 1)

*One biome, no 3D, no hub change yet, no AI-gen.* Learner clicks an existing project link → lands in a hand-illustrated parallax campsite → completes the entire project inside it. Today's `CampHub` stays as the hub for now. AI character/decor falls back to `<FieldFigure>` + generic stand-ins. List-view fallback ships with v1.

The bet: if this single thing doesn't make a 12-year-old say *"oh"* on first open, the rest is wrong. We learn that cheaply before investing in 3D or AI gen.

### Phasing

| Phase | Scope | Time (focused solo) | Ship gate |
|---|---|---|---|
| **0. Foundation** | `<Specimen>`, `<ParallaxScene>`, `<Hotspot>` primitives. `BiomeConfig` schema. Migrations 056 + 057. Reduced-motion mode. List-view fallback wired (`?view=list`). Style-prefix constant. | 1–2 wk | Renders empty biome with hotspots in placeholder positions; list view at parity with current `StudentQuestPage`. |
| **1. Campsite end-to-end** | Campsite SVG layers. All ~11 hotspot roles wired to existing data + existing `WorldChat` + existing `CampfireChat`. Stage progression animations. Ambient motion. `<FieldFigure>` for the friend. No 3D. No AI gen. | 3–4 wk | A real learner completes a real project inside the campsite. |
| **2. AI content gen** | `ai.generateProjectArt()` helper. Provider integration (fal.ai). QuestBuilder Step 6 publish-time gen. Per-image regenerate. Cost cap. Fallbacks. | 1–2 wk | New quests publish with bespoke character portrait + decor. Old quests still work. |
| **3. Tactile 3D props** | `<TactileProp>` portal. `react-three-fiber` integration. 5 GLB props (lantern, journal, specimenJar, mailbox, tent). Keyboard-accessible alternates. Single-canvas guarantee. | 2–3 wk | Tapping the lantern actually feels like turning a dial. |
| **4. Field Station hub** | New `/station` route. Hub parallax scene (own SVG trio). Wall map → biome travel. Specimen cabinet wired to skills. Bulletin board wired to incoming items. Replace `CampHub` as default. | 2 wk | Learner logs in, lands in their Station, travels to projects from there. Past projects leave artifacts. |
| **5. Lab + Workshop biomes** | Two more SVG trios + biome configs. No new code. Auto-suggest covers all three. | 2 wk | Three biomes covering ecology / science / making. |
| **6. Polish + parent flow** | Parent dashboard gets peek-into-the-world view. Group teammates render as other tents/stations/benches. Optional: AI-gen 3D specimen meshes via Meshy. | 2 wk + | Quality pass and selective ambition. |

**Total to full vision:** ~12 weeks of focused work.
**Total to first ship-able demo:** ~5 weeks (Phases 0 + 1).

### Explicitly deferred to "Phase 6 or later, maybe never"

- AI-generated 3D specimen meshes. Fragile, expensive. Only if Phase 1–5 land and there's appetite.
- Voice TTS for the friend at the firepit (medkit-style live voice). `useSpeech` hook is reusable; defer.
- Multiplayer synchronicity (seeing teammate move in the campsite in real time).
- Procedural biome variants (campsite-by-the-river vs campsite-in-the-mountains).
- More biomes beyond the initial three. Wait for guide demand signals.

### Risks worth naming

1. **Illustration quality.** The whole thing rests on three hand-illustrated SVG trios looking *good*. If we can't get them right, no amount of code saves it. Mitigation: commission a single illustrator for all three, lock style early, share with one real guide for gut-check before Phase 1 ships.
2. **AI-gen drift.** Even with a fixed style prefix, providers update models and outputs change. Mitigation: cache + version + bump-and-backfill. Never regenerate silently.
3. **Performance on Chromebooks.** 3D + AI-loaded images + ambient motion on a $300 Chromebook is non-trivial. Mitigation: hard performance budgets, automatic low-bandwidth mode, list-view always present.
4. **Pedagogical regression.** A diegetic UI might *hide* important affordances (driving question, rubric) that today's text-first UI puts front and center. Mitigation: usability test Phase 1 with two real learners + one guide before locking the pattern. If the world makes the work harder to find, we're worse off.
5. **Authoring fatigue.** Even one extra step in QuestBuilder might erode adoption. Mitigation: auto-suggest is high-quality, picker is one click, no other new fields.
6. **Scope creep into shipped engine.** It's tempting to also rewrite `WorldChat`, the blueprint generator, the XP system. We're not. Visual + IA upgrade only.

---

## Open questions for implementation kickoff

These are explicit `?`s the writing-plans phase should resolve before Phase 0 starts:

1. **Illustrator vs. AI-gen for biome layers themselves.** Plan assumes hand-illustrated. If illustrator capacity is the blocker, is one round of fal.ai with manual cleanup in Figma acceptable for the v1 biomes? (Brand risk; resolve with sample.)
2. **Field Station archetype.** Study? Wagon? Treehouse? Tent? Choose before Phase 4 starts. Should match learner age band — leans toward *study/cabin* for 9-12, *treehouse/tent* for 6-8.
3. **Existing XP, rank, shop, collection surfaces.** Stay in list view? Surface as cabinet objects in Field Station? Hide entirely behind `?view=list`?
4. **Existing `useAmbientSound` presets.** Keep mapping to biome (one ambient sound per biome) or per-blueprint as today?
5. **Parent Dashboard "peek-into-the-world."** Out of MVP scope; capture as Phase 6 ticket.
6. **Migration timing for legacy `/world/:id` URLs.** Redirect to `/q/:id` permanently from day one of Phase 1, or maintain both for 30 days?

---

## Out of scope for this design (intentional)

- Guide-side redesign
- Onboarding flow changes
- Auth / login
- Skill mastery algorithm changes
- AI Mentor / Challenger conversational behavior changes (the engine works)
- Backend service architecture
- Mobile-native packaging

These are the boundaries. Anything outside is a separate design doc.
