# Immersive 3D Worlds — Design Document

> **System:** Wayfinder Education Platform (React + Vite + Supabase)

## Vision

Every quest generates an AI-powered panoramic scene themed to the student's interests. Students can "Enter Their World" — a 360° Three.js environment where stage challenges appear as glowing hotspots at locations in the scene. A skateboarding physics quest puts you in a skatepark. A marine biology quest puts you in an ocean research station.

The existing TreasureMap (horizontal trail) remains the default navigation. The immersive world is a premium layer accessed via a prominent "Enter World" button.

## Architecture

```
Quest Generation (Step 4)
    |
    ├── AI generates quest JSON (existing flow)
    |
    └── ai.generateWorldScene() [NEW, runs in parallel]
            |
            ├── Step 1: callAI() generates scene description + hotspot map
            ├── Step 2: Gemini Image API generates 21:9 panoramic image
            └── Step 3: Upload to Supabase Storage → save URL + hotspots to quests table
    |
Guide reviews in Step 5 (sees world preview, can regenerate)
    |
Student opens /q/:id → normal page + "Enter World" button
    |
Click → Full-screen ImmersiveWorldView (Three.js 360° sphere)
    |
Hotspots at stage locations → click → stage panel slides in
```

## Tech Stack Additions

- `three` — WebGL 3D engine
- `@react-three/fiber` — React renderer for Three.js
- `@react-three/drei` — Helpers (OrbitControls, Billboard, useTexture, Html)
- Gemini Image API (`gemini-3.1-flash-image-preview`) — same `@google/generative-ai` SDK, image model
- Supabase Storage — `world-scenes` bucket for panoramic images

## Database Changes

```sql
ALTER TABLE quests ADD COLUMN world_scene_url TEXT;
ALTER TABLE quests ADD COLUMN world_hotspots JSONB DEFAULT '[]';
ALTER TABLE quests ADD COLUMN world_scene_prompt TEXT;
```

## AI Scene Generation

New function: `ai.generateWorldScene({ questTitle, stages, studentInterests, careerPathway, gradeBand })`

### Step 1: Generate scene description + hotspot placement (text AI call)

System prompt instructs AI to:
- Design a panoramic scene matching the quest theme and student interests
- Place distinct visual zones for each stage (e.g., workshop area, presentation booth, lab)
- Return a detailed image prompt + hotspot coordinates (yaw/pitch on a 360° sphere)
- Keep the scene grounded in reality (real locations, not fantasy)

Example output:
```json
{
  "image_prompt": "Ultra-wide panoramic photograph of a professional outdoor skatepark...",
  "hotspots": [
    { "stage_number": 1, "label": "Research Wall", "position": { "yaw": -60, "pitch": 0 }, "icon": "search" },
    { "stage_number": 2, "label": "Workshop Bench", "position": { "yaw": 30, "pitch": -5 }, "icon": "wrench" }
  ],
  "scene_description": "A sunny professional skatepark with distinct zones..."
}
```

### Step 2: Generate panoramic image

- Model: `gemini-3.1-flash-image-preview` (Nano Banana 2)
- Aspect ratio: `21:9` ultra-wide
- Resolution: `2K`
- The prompt from Step 1 is used directly

### Step 3: Upload to Supabase Storage

- Bucket: `world-scenes` (public, created manually)
- Path: `{quest_id}/scene.png`
- Returns public URL

## Student Experience

### Default View (TreasureMap stays)
- Normal quest page loads as-is
- Horizontal trail map, stage cards, AI sidebar — unchanged

### "Enter World" Button
- Full-width card above the trail map
- Scene image as blurred/darkened background with "Enter Your World" text
- Pulsing glow animation
- Only renders when `world_scene_url` exists on the quest

### Immersive View (ImmersiveWorldView)
- Full-viewport Three.js canvas
- Panoramic image mapped onto inside of a sphere
- Camera at center, user looks around:
  - Desktop: mouse drag (OrbitControls, limited to rotation only)
  - Mobile: gyroscope/accelerometer (DeviceOrientationControls) with touch-drag fallback
- Stage hotspots: Billboard sprites at yaw/pitch positions
  - Active stage: glowing pulse, bright color
  - Completed: checkmark badge, green tint
  - Locked: dimmed, semi-transparent, fog effect
- Click/tap hotspot → stage panel slides in from right (desktop) or bottom (mobile)
- Stage panel reuses existing StageCard component
- "Exit World" button (top-left) returns to normal quest page
- Challenger boss encounter: modal overlay on top of 3D view (existing component)

### HUD (HTML overlay on canvas)
- Top-left: Exit button
- Top-right: EP/XP bar
- Bottom-center: Mini trail map (tiny TreasureMap showing current position)

## Component Architecture

```
ImmersiveWorldView (full-screen container, code-split via lazy import)
├── R3F Canvas
│   ├── PanoramaSphere (inverted sphere with scene texture)
│   ├── CameraController (OrbitControls desktop / DeviceOrientation mobile)
│   ├── StageHotspot × N (Billboard sprites at yaw/pitch positions)
│   │   ├── Icon sprite (stage type icon)
│   │   ├── Label (stage title)
│   │   └── Status ring (locked/active/completed)
│   └── AmbientParticles (subtle floating dust motes)
├── StagePanel (HTML overlay)
│   └── Existing StageCard + submission form
├── WorldHUD (HTML overlay)
│   ├── ExitButton
│   ├── XPBar
│   └── MiniTrailMap
└── GyroPermissionPrompt (mobile, asks for DeviceOrientation permission)
```

## Regeneration Triggers

1. **Quest generation (Step 4)** — scene created alongside quest
2. **Guide "Regenerate World" in Step 5** — guide doesn't like the scene, regenerates
3. **Student "Suggest a change"** — after stage edit is accepted, "Update World" option appears (manual, not automatic)

## Fallback Behavior

- If `world_scene_url` is null → no "Enter World" button, TreasureMap is the only navigation
- If Three.js fails to load → error caught, stays on TreasureMap
- If gyroscope permission denied → falls back to touch-drag
- Old quests without scenes → unaffected, everything works as before
- Code-split: Three.js bundle only loads when "Enter World" is clicked

## Performance Considerations

- Single 2K texture (~500KB-1MB) — lightweight for WebGL
- No complex geometry (inverted sphere + sprite hotspots)
- Target: 60fps on mid-range phones
- Three.js tree-shaken via @react-three/fiber
- Lazy import: `const ImmersiveWorldView = lazy(() => import(...))`

## QuestBuilder Integration

### Step 4 (Generation)
- Scene generation runs in parallel with quest generation
- Both use the same loading screen (Step 4 progress)
- If scene generation fails, quest still succeeds (scene is optional)

### Step 5 (Review)
- New "World Preview" section shows the panoramic image
- "Regenerate World" button below the preview
- Hotspot positions shown as numbered markers on a flat projection of the image
- Guide can see which stage maps to which location

### Step 6 (Launch)
- `world_scene_url` and `world_hotspots` saved to quests table alongside quest data
