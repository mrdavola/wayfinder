# Phase 3 — Tactile 3D Props

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** When a learner taps a hotspot in the biome world, a small interactive 3D prop appears at the top of the overlay sheet — tapping and dragging it rotates it like turning a dial. Five props cover the five hotspot roles that have physical objects. A CSS-3D fallback serves learners without WebGL.

**Architecture:** A `<TactilePropViewer>` component wraps a React Three Fiber `<Canvas>` inside the `HotspotOverlay` sheet. A `<RotatingProp>` R3F group reads drag state from a ref and animates via `useFrame`. An `ErrorBoundary` around the canvas catches WebGL failures and renders `<TactilePropFallback>` instead — a CSS `perspective`-tilt SVG operable by arrow keys. Prop metadata and role→prop mapping live in `src/lib/tactileProps.js`. Geometry for each prop lives in `src/components/world/PropMesh.jsx` (placeholder Three.js geometry; replace with `useGLTF()` when real GLBs arrive). The single-canvas guarantee is structural: `HotspotOverlay` mounts at most one at a time.

**Tech Stack:** React 19 + Vite, `@react-three/fiber` + `three` (already installed), `vitest` + `@testing-library/react` (already installed). R3F mocked in tests; no WebGL in jsdom.

---

## File map

```
New files:
  src/lib/tactileProps.js                      — prop registry + getPropForRole()
  src/lib/tactileProps.test.js                 — TDD: 13 tests
  src/components/world/PropMesh.jsx            — R3F geometry for 5 props (visual, no tests)
  src/components/world/TactilePropViewer.jsx   — R3F Canvas + ErrorBoundary + CSS fallback
  src/components/world/TactilePropViewer.test.jsx — 14 smoke tests (R3F mocked)
  src/components/world/TactilePropViewer.css   — viewer + fallback styles
  docs/plans/2026-05-02-phase3-tactile-props.md — this file

Modified files:
  src/components/world/HotspotOverlay.jsx      — PropHeader added to 5 panel types
  src/hooks/useBiomeQuest.js                   — bugfix: clear error at load() start
```

---

## Task 1: `src/lib/tactileProps.js` + tests (TDD)

**Acceptance:** 13 tests pass. Registry contains `lantern`, `journal`, `specimenJar`, `mailbox`, `tent`. `getPropForRole('guide')` → `'lantern'`. `getPropForRole('bulletinSubmit')` → `null`.

---

## Task 2: `src/components/world/PropMesh.jsx` — 5 R3F geometries

**Acceptance:** Builds without error. Five sub-components (`LanternMesh`, `JournalMesh`, `SpecimenJarMesh`, `MailboxMesh`, `TentMesh`) exported via `default PropMesh`. All use R3F intrinsic JSX (`<mesh>`, `<cylinderGeometry>`, `<meshStandardMaterial>`, etc.). No imported Three.js beyond builtins (no `import ... from 'three'`).

**Note:** Replace with `useGLTF('/props/<id>.glb')` when real GLB assets are commissioned.

---

## Task 3: `<TactilePropViewer>` + CSS + tests

**Acceptance:** 14 tests pass. Mock `@react-three/fiber` with `vi.mock`. `<TactilePropViewer propId="lantern" />` renders `data-testid="tactile-prop-viewer"` with `data-prop="lantern"`, `role="img"`, `tabIndex="0"`. `<TactilePropFallback propId="journal" />` responds to `ArrowRight` keydown with `rotateY(25deg)` CSS transform.

---

## Task 4: Wire into `HotspotOverlay.jsx`

**Acceptance:** `<PropHeader role="guide" />` renders a `<TactilePropViewer propId="lantern" />` at the top of the guide panel. PropHeader returns `null` for roles without a prop (`challenger`, `bulletinSubmit`).

Five roles that show a prop:
| Role            | Prop        |
|-----------------|-------------|
| `trailheadSign` | `tent`      |
| `stage`         | `specimenJar` |
| `guide`         | `lantern`   |
| `mailbox`       | `mailbox`   |
| `reflection`    | `journal`   |

---

## Phase 3 acceptance gate

- [x] `npm run test:run` — 120 tests, 0 failed
- [x] `npm run build` — builds clean (R3F chunk size warning is expected)
- [x] `useBiomeQuest` pre-existing error-clear bug fixed (clear `error` at start of `load()`)
- [ ] **Manual:** open `/q/<id>/world` (or the preview route), tap the `guide` hotspot — lantern appears at the top of the overlay, spinning idly, drag-to-rotate responsive
- [ ] **Manual:** Tab to the prop viewer, press ← → — prop rotates
- [ ] **Manual:** On a device/browser without WebGL (or with `canvas` mocked), overlay still shows the SVG fallback and CSS tilt works

---

## Phases 4–6 — outline (re-plan when ready)

### Phase 4 — Field Station hub (2 wk)
New `/station` route. Hub parallax scene. Wall map → biome travel. Specimen cabinet → skills. Replaces `CampHub` as default.

### Phase 5 — Lab + Workshop biomes (2 wk)
Two more biome SVG trios + configs. No new code framework needed.

### Phase 6 — Polish + parent flow (2 wk+)
Parent dashboard world peek. Group teammates as other tents/benches/stations. Optional AI-gen 3D meshes.
