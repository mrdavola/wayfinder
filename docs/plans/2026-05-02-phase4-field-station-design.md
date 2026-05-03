# Phase 4 — Field Station Hub (Cabin) Design

**Date:** 2026-05-02
**Status:** Approved — ready for implementation planning

---

## Goal

Replace `CampHub` (`/student`) with an illustrated, interactive **Field Station** at `/station`. The Station is the learner's permanent home base — they land here after login, travel to biome projects from here, and see evidence of past work accumulate over time.

**Acceptance gate:** A learner logs in → lands in their Station → sees three interactive zones → clicks the Wall Map → travels to an active project's biome world. Past completed projects show as artifact cards on the desk shelf.

---

## Archetype: Cabin Study

Warm wooden interior: plank floor, panelled walls, ceiling beams. Three wall zones filled with naturalist props. Window in the centre shows a hint of the outdoors (passive, atmospheric). The room feels like a place you return to and that slowly fills with evidence of your work.

**Art direction:** same vintage natural-history palette as the rest of the illustrated world — sepia + cream parchment, ink-line + watercolor wash, muted tones. The EPS reference asset (`2309-w026-n002-3792B-p1-3792.eps`) informs the illustration style.

**SVG layers (three, as with all biomes):**
- `public/biomes/cabin/back.svg` — far wall: wainscoting, ceiling beams, window
- `public/biomes/cabin/mid.svg` — mid room: wall map, specimen cabinet, window frame, trophy plaque
- `public/biomes/cabin/fore.svg` — foreground: desk surface, bulletin board above desk, chest prop

Phase 4 ships placeholder colour-rect SVGs (same pattern as Phase 0 for campsite). Commissioned illustrations land in a polish pass.

**Note on biome validator:** `src/biomes/validate.js` `VALID_ROLES` must be extended to include `'wallMap'`, `'specimenCabinet'`, and `'bulletinBoard'` before the cabin config can pass validation. This is a one-line change in the validator — part of Task 1 of the implementation plan.

---

## Architecture

`CabinScene` is a first-class sibling of `BiomeScene`. It reuses:
- `<ParallaxScene>` for three-layer rendering + mouse depth
- `<HotspotOverlay>` for the three interactive zones
- `<WorldStateProvider>` for zoom state
- `<AmbientLayer>` for hearth-flicker preset
- `<TactilePropViewer>` for trophy plaque and chest props

New biome config `src/biomes/cabin/index.js` registers a `'cabin'` id in the biome registry. The cabin config uses a distinct set of hotspot roles not shared with campsite/lab/workshop — it is a hub, not a quest biome.

### Route change

| Before | After |
|--------|-------|
| `/student` → `<CampHub>` | `/station` → `<CabinScene>` |
| — | `/student` → `<Navigate to="/station" replace>` |

`CampHub.jsx` is **not deleted** in Phase 4 — it stays as the fallback for `?view=list` and for any edge cases. The redirect handles normal traffic.

---

## Three Zones

### 1. Wall Map → Travel (`role: 'wallMap'`)

**Position:** Left wall panel, ~20% × 15% of scene.

**Data:** Fetches all projects assigned to the logged-in learner (`quest_id` rows from `quest_group_members` or direct assignment). Groups by `biome_id` (campsite / lab / workshop / null). Null-biome projects appear in an "Unassigned" row at the bottom of the panel list — plain card style, no map pin placement.

**Interaction:**
- Hotspot opens a `<WallMapPanel>` overlay (same overlay pattern as BiomeScene stage panels).
- Panel shows a stylised map with three biome territories. Each active project is a push-pin on its territory.
- Clicking a pin navigates to `/world/:questId` (if the quest has `biome_id` set) or `/q/:questId` (legacy).
- Completed projects leave greyed trail markers on the map. Their `Specimen` artifact cards appear on the desk shelf.

**No new data tables.** Uses existing `quests`, `quest_group_members`, `quest_stages` joins.

### 2. Specimen Cabinet → Skills (`role: 'specimenCabinet'`)

**Position:** Right wall panel, ~75% × 12% of scene.

**Data:** Reads `student_skills` join `skills` for the current learner. Three display tiers:
- **Earned** (mastery_level ≥ 3): coloured glass jars, full opacity
- **In Progress** (mastery_level 1–2): same jars, partially filled
- **Locked** (no row or mastery_level 0): greyed outline jars

**Interaction:**
- Hotspot opens `<SpecimenCabinetPanel>` — scrollable grid of all 25 skills with level indicator and the project(s) that contributed.
- No actions from this panel — read-only display.

### 3. Bulletin Board → Messages (`role: 'bulletinBoard'`)

**Position:** Centre, above desk, ~44% × 52% of scene.

**Data:** Three sources merged into a single feed, sorted newest-first:
1. `guide_messages` where `student_id = me` and `read_at IS NULL`
2. `submission_feedback` where `student_id = me` (recent, ≤ 30 days)
3. `parent_access` letters where `student_id = me` and parent has posted

**Interaction:**
- Hotspot opens `<BulletinBoardPanel>` — pinned note cards, each clickable.
- Clicking a note marks `guide_messages.read_at`, scrolls to the relevant quest if applicable.
- Unread count badge on the hotspot pulse ring (red circle with number).

---

## Props

| Prop | TactileProp role | Position | Links to |
|------|-----------------|----------|----------|
| XP Trophy Plaque | `trophy` | Left wall, between map and window | Read-only rank display |
| Open Journal | `journal` | Desk surface, centre | Navigates to most recently active project |
| Treasure Chest | `chest` | Desk, far right | Navigates to `/shop` |

Trophy and Chest use existing `TactilePropViewer` — new GLB meshes are out of scope for Phase 4 (they use CSS/SVG fallbacks like all other props at this stage).

---

## Artifact Cards (past projects)

Completed projects (`status = 'completed'`) are rendered as small `<Specimen>` cards on the desk shelf foreground layer. Each card shows project title, biome icon, and completion date. They are purely visual — not interactive in Phase 4. Clicking is a Phase 6 enhancement.

Cards are ordered by `completed_at` desc, capped at 8 visible (oldest truncated off-screen left). The `seededJitterDeg` rotation applies per card for the hand-placed feel.

---

## Data Loading

`CabinScene` fetches on mount via a single `loadCabinData(studentId)` function in `src/lib/api.js`:

```
loadCabinData(studentId) {
  parallel:
    - quests + group membership (for wall map)
    - student_skills + skills (for cabinet)
    - guide_messages (unread) + submission_feedback (≤30d) + parent_access letters (for bulletin)
  return { projects, skills, messages, completedProjects }
}
```

Loading state: existing `<BiomeScene>` loading pattern (fade-in on ready).
Error state: falls back to `?view=list` with a toast.

---

## Component Breakdown

```
src/
  biomes/
    cabin/
      index.js               ← BiomeConfig (hotspot roles: wallMap, specimenCabinet, bulletinBoard)
  components/world/
    CabinScene.jsx            ← page root: WorldStateProvider + data fetch + ParallaxScene
    CabinScene.test.jsx
    CabinScene.css
    panels/
      WallMapPanel.jsx        ← project list grouped by biome, navigate on pin click
      WallMapPanel.test.jsx
      SpecimenCabinetPanel.jsx ← skill jars, read-only
      SpecimenCabinetPanel.test.jsx
      BulletinBoardPanel.jsx  ← merged message feed, mark-read
      BulletinBoardPanel.test.jsx
  lib/
    api.js                   ← add loadCabinData()
public/
  biomes/
    cabin/
      back.svg               ← placeholder (sepia #e8dcc8)
      mid.svg                ← placeholder (mid #d4b896)
      fore.svg               ← placeholder (fore #c4a060)
src/
  App.jsx                    ← add /station route, redirect /student → /station
  biomes/index.js            ← register cabin biome
```

---

## Tests

Same TDD policy as Phase 0:
- **Strict TDD** for `loadCabinData` (mock Supabase client, test data mapping)
- **Smoke-render TDD** for `CabinScene`, all three panels
- **Biome config validation** test for cabin config (existing validator)

---

## Out of Scope (Phase 4)

- Commissioned SVG illustrations (colour-rect placeholders ship first)
- Artifact card click-through to past project detail (Phase 6)
- Animated hearth fire on the back wall (Phase 6 polish)
- Multiplayer: seeing teammate Stations (Phase 6)
- New GLB meshes for trophy/chest props (Phase 6)
- Mobile bottom-sheet layout refinements (Phase 5 polish pass)

---

## Open Questions (resolved)

| # | Question | Decision |
|---|----------|----------|
| 2 | Field Station archetype | **Cabin Study** |
| 3 | XP/rank/shop surfaces | **Surface as cabin props** (trophy plaque, chest, bookshelf) |

---

## Phases Before / After

- **Requires:** Phase 0 (primitives), Phase 1 (campsite end-to-end, hotspot patterns), Phase 3 (TactilePropViewer)
- **Enables:** Phase 5 (lab + workshop biomes slot straight into the wall map), Phase 6 (artifact card interaction, multiplayer stations)
