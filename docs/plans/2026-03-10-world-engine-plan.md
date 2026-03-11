# World Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the student experience from a stage-card dashboard app into a fully immersive Hero's Journey world engine with atmospheric rendering, in-character AI interactions, chat-based submissions, and a Camp hub between worlds.

**Architecture:** The World Engine adds a generation layer (AI creates World Blueprints with setting, characters, palette, audio mapped to Hero's Journey beats), a rendering layer (WorldRenderer replaces StudentQuestPage with immersive atmosphere + location + character panels), and a hub layer (CampHub replaces StudentHome with Journey Wall, Horizon, and Campfire reflection). Guide-side gets location-aware cards and skill progress bars. Student onboarding is cut to 2 screens.

**Tech Stack:** React 19 + Vite, Supabase (PostgreSQL + Storage), @anthropic-ai/sdk (Claude), CSS custom properties for dynamic theming, Web Speech API for TTS, existing hooks (useSpeech, useAmbientSound). No new dependencies.

**Design Doc:** `docs/plans/2026-03-10-world-engine-redesign.md`

---

## Phase 1: World Blueprint — Data Model + AI Generation

### Task 1: Create world_blueprints database migration

**Files:**
- Create: `supabase/migrations/042_world_blueprints.sql`

**Step 1: Write the migration**

```sql
-- 042_world_blueprints.sql
-- Add world blueprint JSONB to quests table + hero journey beat mapping to stages

-- World blueprint stored on the quest itself (1:1 relationship)
ALTER TABLE quests ADD COLUMN IF NOT EXISTS world_blueprint JSONB;

-- Add hero_journey_beat to stages (which beat this stage maps to)
ALTER TABLE quest_stages ADD COLUMN IF NOT EXISTS hero_journey_beat TEXT;
ALTER TABLE quest_stages ADD COLUMN IF NOT EXISTS location_name TEXT;
ALTER TABLE quest_stages ADD COLUMN IF NOT EXISTS location_narrative TEXT;

-- Index for querying quests with blueprints
CREATE INDEX IF NOT EXISTS idx_quests_world_blueprint ON quests USING GIN (world_blueprint);

-- RLS: guides can update their own quest blueprints
-- (Already covered by existing quest update policies)

COMMENT ON COLUMN quests.world_blueprint IS 'AI-generated world blueprint: {setting, atmosphere, palette, ambientAudio, mentor, challenger, tone}';
COMMENT ON COLUMN quest_stages.hero_journey_beat IS 'Hero Journey beat: call_to_adventure, crossing_threshold, tests_allies, the_ordeal, the_reward, the_return';
COMMENT ON COLUMN quest_stages.location_name IS 'In-world location name for this stage, e.g. "The Deep Wall"';
COMMENT ON COLUMN quest_stages.location_narrative IS 'Narrative text when student arrives at this location';
```

**Step 2: Verify migration file exists**

Run: `cat supabase/migrations/042_world_blueprints.sql | head -5`
Expected: Shows the migration header comments.

**Step 3: Commit**

```bash
git add supabase/migrations/042_world_blueprints.sql
git commit -m "feat: add world_blueprint JSONB to quests + hero journey fields to stages"
```

---

### Task 2: Add World Blueprint constants and types

**Files:**
- Create: `src/lib/worldEngine.js`

**Step 1: Create the world engine constants and helpers**

```javascript
// src/lib/worldEngine.js
// World Engine — constants, blueprint schema, and helpers

export const HERO_JOURNEY_BEATS = [
  { id: 'ordinary_world', label: 'Ordinary World', description: 'Where the hero starts — their comfort zone' },
  { id: 'call_to_adventure', label: 'Call to Adventure', description: 'The challenge is presented' },
  { id: 'crossing_threshold', label: 'Crossing the Threshold', description: 'Committing to the journey' },
  { id: 'tests_allies', label: 'Tests & Allies', description: 'Facing challenges, finding help' },
  { id: 'the_ordeal', label: 'The Ordeal', description: 'The biggest challenge' },
  { id: 'the_reward', label: 'The Reward', description: 'Mastery achieved, knowledge gained' },
  { id: 'the_return', label: 'The Return', description: 'Bringing knowledge back, reflection' },
];

// Maps stage count to which beats to use (not all projects have 7 stages)
export function mapStagesToBeats(stageCount) {
  const allBeats = HERO_JOURNEY_BEATS.map(b => b.id);
  if (stageCount >= 7) return allBeats;
  if (stageCount === 6) return ['call_to_adventure', 'crossing_threshold', 'tests_allies', 'the_ordeal', 'the_reward', 'the_return'];
  if (stageCount === 5) return ['call_to_adventure', 'crossing_threshold', 'tests_allies', 'the_ordeal', 'the_reward'];
  if (stageCount === 4) return ['call_to_adventure', 'crossing_threshold', 'the_ordeal', 'the_reward'];
  if (stageCount === 3) return ['call_to_adventure', 'the_ordeal', 'the_reward'];
  return ['call_to_adventure', 'the_reward'];
}

// Ambient audio presets (CSS-only, no audio files needed initially)
export const AMBIENT_PRESETS = {
  'underwater-deep': { particle: 'bubble', bgGradient: 'linear-gradient(180deg, #0a1628 0%, #0d2847 40%, #1a4a6e 100%)' },
  'forest-canopy': { particle: 'leaf', bgGradient: 'linear-gradient(180deg, #1a2f1a 0%, #2d5a2d 40%, #3d7a3d 100%)' },
  'mountain-summit': { particle: 'snow', bgGradient: 'linear-gradient(180deg, #2c3e50 0%, #546a7b 40%, #8fa4b0 100%)' },
  'space-station': { particle: 'star', bgGradient: 'linear-gradient(180deg, #0a0a1a 0%, #1a1a3a 40%, #2a2a5a 100%)' },
  'desert-ruins': { particle: 'dust', bgGradient: 'linear-gradient(180deg, #3d2b1f 0%, #6b4423 40%, #c4a265 100%)' },
  'urban-night': { particle: 'rain', bgGradient: 'linear-gradient(180deg, #1a1a2e 0%, #2d2d4e 40%, #3d3d5e 100%)' },
  'volcanic-cave': { particle: 'ember', bgGradient: 'linear-gradient(180deg, #1a0a0a 0%, #3d1a0a 40%, #6b2d0a 100%)' },
  'arctic-ice': { particle: 'frost', bgGradient: 'linear-gradient(180deg, #e8f0f8 0%, #b8d4e8 40%, #8ab4d4 100%)' },
  'jungle-river': { particle: 'firefly', bgGradient: 'linear-gradient(180deg, #0a1f0a 0%, #1a3f1a 40%, #2d6b2d 100%)' },
  'storm-coast': { particle: 'spray', bgGradient: 'linear-gradient(180deg, #2c3e50 0%, #34495e 40%, #5d7b93 100%)' },
};

// Grade band tone descriptors (used in AI prompt)
export const GRADE_TONE = {
  'K-2': 'warm, magical, wonder-filled. Simple vocabulary. Characters can be fantastical (talking animals, friendly spirits). Stakes feel safe but exciting.',
  '3-5': 'adventurous, imaginative but grounded. Rich vocabulary with context clues. Characters blend real and fantastical. Stakes feel meaningful.',
  '6-8': 'grounded, real-world stakes, emotionally resonant. Sophisticated vocabulary. Characters are realistic professionals or complex figures. No hand-holding — students confront real data and hard questions.',
  '9-12': 'mature, nuanced, professionally grounded. Academic vocabulary expected. Characters are domain experts with flaws. Stakes are systemic and complex.',
};

// Extract CSS variables from a blueprint palette
export function blueprintToCSSVars(palette) {
  if (!palette) return {};
  return {
    '--world-bg': palette.bg || '#1a1a2e',
    '--world-bg-mid': palette.bgMid || palette.bg || '#2d2d4e',
    '--world-accent': palette.accent || '#4ecdc4',
    '--world-text': palette.text || '#f0f0f0',
    '--world-text-muted': palette.textMuted || 'rgba(240,240,240,0.6)',
    '--world-surface': palette.surface || 'rgba(255,255,255,0.08)',
    '--world-surface-hover': palette.surfaceHover || 'rgba(255,255,255,0.12)',
    '--world-border': palette.border || 'rgba(255,255,255,0.1)',
  };
}

// Particle CSS keyframe generator (returns style string for injection)
export function getParticleCSS(particleType) {
  const configs = {
    bubble: { char: '○', count: 15, direction: 'up', speed: '8s', sway: true },
    leaf: { char: '🍃', count: 10, direction: 'down', speed: '12s', sway: true },
    snow: { char: '·', count: 25, direction: 'down', speed: '10s', sway: true },
    star: { char: '✦', count: 20, direction: 'none', speed: '3s', sway: false },
    dust: { char: '·', count: 15, direction: 'right', speed: '15s', sway: true },
    rain: { char: '│', count: 20, direction: 'down', speed: '1s', sway: false },
    ember: { char: '●', count: 12, direction: 'up', speed: '6s', sway: true },
    frost: { char: '❋', count: 10, direction: 'down', speed: '14s', sway: true },
    firefly: { char: '·', count: 12, direction: 'none', speed: '4s', sway: false },
    spray: { char: '~', count: 15, direction: 'up', speed: '3s', sway: true },
  };
  return configs[particleType] || configs.dust;
}
```

**Step 2: Verify the file**

Run: `node -e "const w = require('./src/lib/worldEngine.js'); console.log(Object.keys(w));"` (or check import in dev server)
Expected: Exports are accessible.

**Step 3: Commit**

```bash
git add src/lib/worldEngine.js
git commit -m "feat: add world engine constants — hero journey beats, ambient presets, palette helpers"
```

---

### Task 3: Add AI world blueprint generation

**Files:**
- Modify: `src/lib/api.js` — add `ai.generateWorldBlueprint()` function

**Step 1: Add the generateWorldBlueprint function to api.js**

Find the `ai` object in api.js (around where other ai functions are defined) and add this new function. Place it after `ai.generateQuest`:

```javascript
// Add to the ai object in api.js

generateWorldBlueprint: async ({ quest, stages, students, gradeBand }) => {
  const { GRADE_TONE } = await import('./worldEngine.js');
  const tone = GRADE_TONE[gradeBand] || GRADE_TONE['6-8'];

  const studentContext = students.map(s =>
    `${s.name} (age ${s.age || 'unknown'}): interests=${(s.interests || []).join(', ')}, passions=${s.passions || 'not specified'}`
  ).join('\n');

  const stageList = stages.map((s, i) =>
    `Stage ${i + 1}: "${s.title}" — ${s.description?.slice(0, 100)}...`
  ).join('\n');

  const prompt = `You are a world-builder for Wayfinder, an immersive learning platform. Generate a World Blueprint that transforms this educational project into an immersive Hero's Journey experience.

PROJECT:
Title: ${quest.title}
Subtitle: ${quest.subtitle || ''}
Narrative Hook: ${quest.narrative_hook || ''}
Career Pathway: ${quest.career_pathway || ''}

STAGES:
${stageList}

STUDENTS:
${studentContext}

GRADE BAND: ${gradeBand}
TONE GUIDANCE: ${tone}

Generate a World Blueprint as JSON with this exact structure:
{
  "setting": "A vivid, specific place name and description (e.g., 'The Dying Reef — a once-vibrant coral ecosystem now fading to white')",
  "atmosphere": "2-3 word mood description (e.g., 'bioluminescent deep ocean')",
  "palette": {
    "bg": "#hex dark background",
    "bgMid": "#hex mid-tone",
    "accent": "#hex vivid accent color",
    "text": "#hex light readable text",
    "textMuted": "rgba for secondary text",
    "surface": "rgba for card backgrounds",
    "surfaceHover": "rgba for card hover",
    "border": "rgba for borders"
  },
  "ambientAudio": "one of: underwater-deep, forest-canopy, mountain-summit, space-station, desert-ruins, urban-night, volcanic-cave, arctic-ice, jungle-river, storm-coast",
  "mentor": {
    "name": "A specific character name (not generic)",
    "role": "Their role/title in the world",
    "personality": "1-2 sentences describing how they speak and interact"
  },
  "challenger": {
    "name": "A specific name or title for the antagonist/challenger force",
    "personality": "1-2 sentences describing their challenge style"
  },
  "stages": [
    ${stages.map((s, i) => `{
      "stageId": "${s.id || `stage_${i}`}",
      "location": "A vivid location name within the world",
      "beat": "hero journey beat (call_to_adventure, crossing_threshold, tests_allies, the_ordeal, the_reward, the_return, ordinary_world)",
      "arrivalNarrative": "2-3 sentences of immersive narrative when the student arrives at this location. Written in second person present tense ('You step into...'). Reference the specific work they'll do here.",
      "transitionNarrative": "1 sentence bridging from the previous location to this one"
    }`).join(',\n    ')}
  ],
  "tone": "Brief tone descriptor — must NOT be generic/cheesy/baby-ish. Age-appropriate but never condescending."
}

CRITICAL RULES:
- The setting MUST relate to the actual project topic. A reef biology project = ocean world, a coding project = digital/cyber world, etc.
- Characters must feel REAL for the grade band. No talking animals for 6-8. No dry academics for 3-5.
- Arrival narratives must reference the ACTUAL work of that stage (the guiding questions, the deliverable).
- The palette must be dark/immersive (this is a full-screen experience, not a white dashboard).
- The tone must match the grade band guidance exactly.
- Return ONLY valid JSON, no markdown fences.`;

  const result = await callAI(prompt);
  return parseAIJSON(result);
},
```

**Step 2: Verify it integrates with existing ai object**

Check that `callAI` and `parseAIJSON` are already available in the same scope. They should be — they're used by other ai functions.

**Step 3: Commit**

```bash
git add src/lib/api.js
git commit -m "feat: add ai.generateWorldBlueprint() — AI generates immersive world themes from projects"
```

---

### Task 4: Wire blueprint generation into quest creation flow

**Files:**
- Modify: `src/lib/api.js` — add `worldBlueprints` API object for CRUD
- Modify: `src/pages/QuestBuilder.jsx` — call blueprint generation after quest creation in Step 4

**Step 1: Add worldBlueprints CRUD to api.js**

Add near the other API objects (after `quests` or `templates`):

```javascript
export const worldBlueprints = {
  get: async (questId) => {
    const { data, error } = await supabase
      .from('quests')
      .select('world_blueprint')
      .eq('id', questId)
      .single();
    if (error) throw error;
    return data?.world_blueprint;
  },

  save: async (questId, blueprint) => {
    const { error } = await supabase
      .from('quests')
      .update({ world_blueprint: blueprint })
      .eq('id', questId);
    if (error) throw error;
  },

  saveStageLocations: async (stages, blueprintStages) => {
    // Update each stage with its hero journey beat and location
    for (const bs of blueprintStages) {
      const stage = stages.find(s => s.id === bs.stageId) || stages[blueprintStages.indexOf(bs)];
      if (!stage) continue;
      await supabase
        .from('quest_stages')
        .update({
          hero_journey_beat: bs.beat,
          location_name: bs.location,
          location_narrative: bs.arrivalNarrative,
        })
        .eq('id', stage.id);
    }
  },
};
```

**Step 2: In QuestBuilder.jsx, after quest + stages are saved (Step 4 AI generation), trigger blueprint generation**

Find where the quest and stages are saved after AI generation (the Step 4 completion handler). After stages are inserted, add:

```javascript
// After stages are saved to DB, generate world blueprint in background
try {
  const blueprint = await ai.generateWorldBlueprint({
    quest: savedQuest,
    stages: savedStages,
    students: selectedStudents,
    gradeBand: selectedStudents[0]?.grade_band || '6-8',
  });
  if (blueprint) {
    await worldBlueprints.save(savedQuest.id, blueprint);
    if (blueprint.stages) {
      await worldBlueprints.saveStageLocations(savedStages, blueprint.stages);
    }
  }
} catch (err) {
  console.warn('World blueprint generation failed (non-blocking):', err);
  // Blueprint is optional — quest works without it, just won't be immersive
}
```

Add the import at top of QuestBuilder.jsx:
```javascript
import { worldBlueprints } from '../lib/api';
```

**Step 3: Verify by creating a test quest in dev**

Run dev server, create a quest through QuestBuilder, check Supabase that `world_blueprint` is populated on the quest row.

**Step 4: Commit**

```bash
git add src/lib/api.js src/pages/QuestBuilder.jsx
git commit -m "feat: auto-generate world blueprint when quest is created"
```

---

## Phase 2: World Renderer — Core Immersive UI

### Task 5: Create WorldRenderer page shell

**Files:**
- Create: `src/pages/student/WorldRenderer.jsx`
- Modify: `src/App.jsx` — add route

**Step 1: Create the WorldRenderer skeleton**

This is the full-screen immersive page that replaces the stage-card view. Start with the 3-layer architecture (atmosphere + location + characters) and loading state.

```javascript
// src/pages/student/WorldRenderer.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { worldBlueprints } from '../../lib/api';
import { blueprintToCSSVars, AMBIENT_PRESETS, getParticleCSS } from '../../lib/worldEngine';
import { getStudentSession } from '../../lib/studentSession';
import { Compass, LogOut } from 'lucide-react';

export default function WorldRenderer() {
  const { id: questId } = useParams();
  const navigate = useNavigate();

  // Core state
  const [quest, setQuest] = useState(null);
  const [stages, setStages] = useState([]);
  const [blueprint, setBlueprint] = useState(null);
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Student
  const [studentSession, setStudentSession] = useState(null);

  // UI state
  const [showChat, setShowChat] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const containerRef = useRef(null);

  // Load quest + blueprint + stages
  useEffect(() => {
    async function load() {
      try {
        const session = getStudentSession(questId);
        setStudentSession(session);

        const { data: questData, error: questError } = await supabase
          .from('quests')
          .select('*, quest_stages(*)')
          .eq('id', questId)
          .single();

        if (questError) throw questError;

        setQuest(questData);
        const sortedStages = (questData.quest_stages || [])
          .sort((a, b) => a.stage_number - b.stage_number);
        setStages(sortedStages);
        setBlueprint(questData.world_blueprint);

        // Set active stage to first non-completed stage
        const firstActive = sortedStages.findIndex(s => s.status !== 'completed');
        setActiveStageIndex(firstActive >= 0 ? firstActive : 0);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [questId]);

  // Apply world CSS vars
  const worldStyle = blueprint ? blueprintToCSSVars(blueprint.palette) : {};
  const ambient = blueprint?.ambientAudio ? AMBIENT_PRESETS[blueprint.ambientAudio] : null;
  const currentStage = stages[activeStageIndex];
  const blueprintStage = blueprint?.stages?.[activeStageIndex];

  if (loading) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: '#1a1a2e',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#f0f0f0', fontFamily: 'var(--font-display)',
        fontSize: '1.5rem',
      }}>
        Building your world...
      </div>
    );
  }

  if (error || !quest) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Could not load world: {error || 'Quest not found'}</p>
        <button onClick={() => navigate('/student')} className="btn btn-primary">Return to Camp</button>
      </div>
    );
  }

  // Fallback if no blueprint (render basic view)
  if (!blueprint) {
    navigate(`/q/${questId}`);
    return null;
  }

  return (
    <div
      ref={containerRef}
      style={{
        ...worldStyle,
        position: 'fixed',
        inset: 0,
        background: ambient?.bgGradient || worldStyle['--world-bg'] || '#1a1a2e',
        color: worldStyle['--world-text'] || '#f0f0f0',
        fontFamily: 'var(--font-body)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Layer 1: Atmosphere — particles + ambient */}
      <AtmosphereLayer
        particleType={ambient?.particle}
        palette={blueprint.palette}
      />

      {/* Top bar: minimal — journey line + exit */}
      <WorldTopBar
        quest={quest}
        stages={stages}
        activeStageIndex={activeStageIndex}
        onStageClick={(i) => {
          if (stages[i].status !== 'locked') {
            setTransitioning(true);
            setTimeout(() => {
              setActiveStageIndex(i);
              setTransitioning(false);
            }, 600);
          }
        }}
        onExit={() => navigate('/student')}
        blueprint={blueprint}
        studentSession={studentSession}
      />

      {/* Layer 2: Location content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 1.5rem 1.5rem',
        opacity: transitioning ? 0 : 1,
        transform: transitioning ? 'translateY(20px)' : 'translateY(0)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        position: 'relative',
        zIndex: 2,
        overflowY: 'auto',
      }}>
        <LocationView
          stage={currentStage}
          blueprintStage={blueprintStage}
          blueprint={blueprint}
          questId={questId}
          studentSession={studentSession}
          onStageComplete={() => {
            // Advance to next stage
            if (activeStageIndex < stages.length - 1) {
              setTransitioning(true);
              setTimeout(() => {
                setActiveStageIndex(activeStageIndex + 1);
                setTransitioning(false);
              }, 800);
            }
          }}
          onOpenChat={() => setShowChat(true)}
        />
      </div>

      {/* Layer 3: Character chat panel */}
      {showChat && (
        <WorldChat
          quest={quest}
          stage={currentStage}
          blueprint={blueprint}
          studentSession={studentSession}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}

// --- Sub-components (stubs to be built out in subsequent tasks) ---

function AtmosphereLayer({ particleType, palette }) {
  // Particle effects rendered as CSS-animated elements
  return <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }} />;
}

function WorldTopBar({ quest, stages, activeStageIndex, onStageClick, onExit, blueprint, studentSession }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '0.75rem 1.5rem',
      position: 'relative',
      zIndex: 10,
      gap: '1rem',
    }}>
      {/* Exit button */}
      <button
        onClick={onExit}
        style={{
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '8px',
          padding: '0.4rem 0.75rem',
          color: 'inherit',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.8rem',
        }}
      >
        <Compass size={14} /> Camp
      </button>

      {/* Journey line */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
        {stages.map((stage, i) => (
          <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => onStageClick(i)}
              title={stage.location_name || stage.title}
              style={{
                width: i === activeStageIndex ? 28 : 12,
                height: 12,
                borderRadius: 6,
                border: 'none',
                cursor: stage.status !== 'locked' ? 'pointer' : 'default',
                opacity: stage.status === 'locked' ? 0.3 : 1,
                background: stage.status === 'completed'
                  ? 'var(--field-green, #2D6A4F)'
                  : i === activeStageIndex
                    ? (blueprint?.palette?.accent || '#4ecdc4')
                    : 'rgba(255,255,255,0.3)',
                transition: 'all 0.3s ease',
              }}
            />
            {i < stages.length - 1 && (
              <div style={{
                width: 16,
                height: 2,
                background: stage.status === 'completed' ? 'var(--field-green, #2D6A4F)' : 'rgba(255,255,255,0.15)',
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Student name + XP (placeholder) */}
      <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
        {studentSession?.studentName || 'Explorer'}
      </div>
    </div>
  );
}

function LocationView({ stage, blueprintStage, blueprint, questId, studentSession, onStageComplete, onOpenChat }) {
  if (!stage) return null;

  return (
    <div style={{ maxWidth: 680, width: '100%', textAlign: 'center' }}>
      {/* Location name */}
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.8rem',
        marginBottom: '0.5rem',
        color: blueprint?.palette?.accent || '#4ecdc4',
      }}>
        {blueprintStage?.location || stage.location_name || stage.title}
      </h2>

      {/* Narrative */}
      <p style={{
        fontSize: '1rem',
        lineHeight: 1.7,
        opacity: 0.85,
        marginBottom: '2rem',
        fontStyle: 'italic',
      }}>
        {blueprintStage?.arrivalNarrative || stage.location_narrative || stage.description}
      </p>

      {/* Work area — guiding questions + deliverable */}
      <div style={{
        background: 'var(--world-surface, rgba(255,255,255,0.08))',
        borderRadius: 16,
        padding: '1.5rem',
        textAlign: 'left',
        border: '1px solid var(--world-border, rgba(255,255,255,0.1))',
      }}>
        {stage.guiding_questions?.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6, marginBottom: '0.5rem' }}>Consider</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {stage.guiding_questions.map((q, i) => (
                <li key={i} style={{ padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.95rem' }}>
                  {q}
                </li>
              ))}
            </ul>
          </div>
        )}

        {stage.deliverable && (
          <div>
            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6, marginBottom: '0.5rem' }}>Your Challenge</h4>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>{stage.deliverable}</p>
          </div>
        )}

        {/* Action: talk to mentor (opens chat) */}
        {stage.status !== 'completed' && (
          <button
            onClick={onOpenChat}
            style={{
              marginTop: '1.5rem',
              width: '100%',
              padding: '0.75rem',
              background: blueprint?.palette?.accent || '#4ecdc4',
              color: '#1a1a2e',
              border: 'none',
              borderRadius: 12,
              fontFamily: 'var(--font-body)',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Talk to {blueprint?.mentor?.name || 'your Mentor'}
          </button>
        )}

        {stage.status === 'completed' && (
          <div style={{
            marginTop: '1rem',
            textAlign: 'center',
            opacity: 0.6,
            fontSize: '0.9rem',
          }}>
            Location conquered
          </div>
        )}
      </div>
    </div>
  );
}

function WorldChat({ quest, stage, blueprint, studentSession, onClose }) {
  // Placeholder — built out in Phase 3
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      right: 0,
      width: 380,
      height: '70vh',
      background: 'rgba(20,20,40,0.95)',
      borderTopLeftRadius: 20,
      border: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 20,
    }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 600 }}>{blueprint?.mentor?.name || 'Mentor'}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>x</button>
      </div>
      <div style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
        <p style={{ opacity: 0.7, fontStyle: 'italic' }}>Chat coming soon...</p>
      </div>
    </div>
  );
}
```

**Step 2: Add route to App.jsx**

Add the import and route:
```javascript
import WorldRenderer from './pages/student/WorldRenderer';

// In the routes, add before the /q/:id route:
<Route path="/world/:id" element={<WorldRenderer />} />
```

**Step 3: Verify**

Run dev server, navigate to `/world/<any-quest-id-with-blueprint>`. Should see the loading screen then the immersive world layout (or fallback redirect if no blueprint).

**Step 4: Commit**

```bash
git add src/pages/student/WorldRenderer.jsx src/App.jsx
git commit -m "feat: WorldRenderer page shell — 3-layer immersive architecture with journey line"
```

---

### Task 6: Build atmosphere layer with particles

**Files:**
- Modify: `src/pages/student/WorldRenderer.jsx` — flesh out `AtmosphereLayer` component

**Step 1: Replace the stub AtmosphereLayer with working particle system**

Replace the `AtmosphereLayer` function in WorldRenderer.jsx with a full CSS particle implementation. Particles are absolutely-positioned `<span>` elements animated with CSS keyframes. Inject a `<style>` tag for the animations.

Key behaviors:
- 15-25 particles randomly positioned
- Animated based on particle type (up for bubbles/embers, down for snow/leaves/rain, drift for stars/fireflies)
- Low opacity, non-interactive (`pointer-events: none`)
- Subtle color from the world palette accent
- Uses `getParticleCSS()` from worldEngine.js for config

The component should:
1. On mount, generate random positions/sizes/delays for particles
2. Inject a `<style>` tag with `@keyframes world-particle-float` (direction-aware)
3. Render `<span>` elements with the particle character and animation
4. Clean up style tag on unmount

**Step 2: Verify**

Load a world page — should see subtle floating particles over the gradient background.

**Step 3: Commit**

```bash
git add src/pages/student/WorldRenderer.jsx
git commit -m "feat: atmosphere layer — CSS particle system for immersive world backgrounds"
```

---

### Task 7: Add ambient audio integration

**Files:**
- Modify: `src/pages/student/WorldRenderer.jsx` — add ambient audio toggle using existing `useAmbientSound` hook

**Step 1: Wire useAmbientSound**

Import the existing `useAmbientSound` hook. Map the blueprint's `ambientAudio` preset to an audio source. Add a small toggle button to the WorldTopBar (speaker icon).

Note: The existing hook at `src/hooks/useAmbientSound.js` handles audio playback. If it expects a URL, we may need to use free ambient audio URLs or generate them. For MVP, use the hook's existing functionality or add a simple Audio API wrapper.

**Step 2: Verify**

Toggle the audio button — should play/pause ambient sound matching the world theme.

**Step 3: Commit**

```bash
git add src/pages/student/WorldRenderer.jsx
git commit -m "feat: ambient audio toggle in world renderer"
```

---

### Task 8: Add stage transition animations

**Files:**
- Modify: `src/pages/student/WorldRenderer.jsx` — add transition narrative between stages

**Step 1: Add transition overlay**

When a student navigates between stages, show a brief narrative transition:
1. Current location fades out (opacity 0, translateY 20px) — 400ms
2. Transition text appears center-screen (the `transitionNarrative` from blueprint) — hold 1.5s
3. New location fades in

This uses the existing `transitioning` state + `blueprintStage.transitionNarrative`.

**Step 2: Verify**

Click between unlocked stages — should see smooth narrative transition.

**Step 3: Commit**

```bash
git add src/pages/student/WorldRenderer.jsx
git commit -m "feat: narrative stage transitions in world renderer"
```

---

## Phase 3: Character System — WorldChat

### Task 9: Build WorldChat with Mentor character

**Files:**
- Create: `src/components/world/WorldChat.jsx`
- Modify: `src/pages/student/WorldRenderer.jsx` — import new WorldChat

**Step 1: Create WorldChat component**

This replaces both the AISidebar (Field Guide) and the submission flow. It's a chat panel where the student talks to the Mentor character.

Key design:
- Panel slides in from right (desktop: 380px) or bottom (mobile: 70vh)
- Mentor avatar + name at top (from blueprint.mentor)
- Messages: mentor messages left-aligned (styled with world accent), student messages right-aligned
- Input area: text field + send + record button (voice) + attach button (file upload)
- On mount, Mentor greets with an in-character message about the current stage
- Uses `ai.questHelp()` under the hood but wraps the system prompt with character personality

Character system prompt template:
```
You are ${mentor.name}, ${mentor.role}. ${mentor.personality}

You are guiding a student through "${stage.title}" in the world of "${blueprint.setting}".

STAY IN CHARACTER. Refer to the world, the locations, the journey. Never break the fourth wall.
Never give direct answers — use Socratic questioning. Be warm but push for depth.

[Existing questHelp prompt for stage context, deliverable, guiding questions...]
```

Messages are persisted to `guide_messages` table (existing).

**Step 2: Replace the stub WorldChat in WorldRenderer.jsx**

```javascript
import WorldChat from '../../components/world/WorldChat';
```

**Step 3: Verify**

Open a world, click "Talk to [Mentor]" — chat panel opens, mentor greets in character, student can send messages and get in-character responses.

**Step 4: Commit**

```bash
git add src/components/world/WorldChat.jsx src/pages/student/WorldRenderer.jsx
git commit -m "feat: WorldChat with in-character Mentor — Socratic AI guide in hero's journey"
```

---

### Task 10: Add Challenger character to WorldChat

**Files:**
- Modify: `src/components/world/WorldChat.jsx` — add Challenger mode

**Step 1: Add Challenger encounter system**

The Challenger appears at specific hero journey beats (after submissions, at `the_ordeal` beat, after short responses). When triggered:
1. Chat panel visual shifts — accent color changes, border pulses
2. Challenger character name + personality replaces Mentor header
3. One challenging message appears
4. Student responds
5. AI evaluates response (existing `ai.devilsAdvocate()` wrapped with character persona)
6. On response, Mentor returns

The Challenger uses the blueprint's `challenger.name` and `challenger.personality` in its system prompt.

Trigger conditions:
- Student submits work with < 100 characters
- Stage's hero_journey_beat is `the_ordeal`
- After every 3rd Mentor exchange (keeps students on their toes)

**Step 2: Verify**

Progress to a mid-project stage, submit a short response — Challenger should appear in the chat.

**Step 3: Commit**

```bash
git add src/components/world/WorldChat.jsx
git commit -m "feat: Challenger character in WorldChat — appears at key beats and thin submissions"
```

---

### Task 11: Add chat-based submissions

**Files:**
- Modify: `src/components/world/WorldChat.jsx` — add submission mode

**Step 1: Implement "present your work" submission flow**

When the student is ready to submit, they don't switch to a form. Instead:
1. They tell the Mentor: "I'm ready to present" or click a "Present your work" button in the chat
2. The Mentor responds in character: "Show me what you've found at [location]."
3. Student submits via:
   - Text in the chat input
   - File attachment (click paperclip → file picker → uploads to Supabase Storage)
   - Voice recording (click mic → record → sends audio)
4. Behind the scenes: `ai.reviewSubmission()` runs, generates score
5. Mentor responds with feedback **in character** (not a ScoreCard):
   - If mastery (score >= 35): "Impressive work. The path ahead is clear now..." + stage unlocks
   - If not: "You're getting there, but I need you to dig deeper into [specific aspect]..."
6. Submission saved to `stage_submissions` table (existing)
7. Feedback saved to `submission_feedback` table (existing)
8. XP awarded if mastery (existing xp.award() system)

**Step 2: Verify**

In a world, open chat, submit text work to Mentor — should get in-character feedback and stage progression.

**Step 3: Commit**

```bash
git add src/components/world/WorldChat.jsx
git commit -m "feat: chat-based submissions — present work to Mentor, get in-character AI feedback"
```

---

### Task 12: Add XP toast and rank display in world

**Files:**
- Modify: `src/pages/student/WorldRenderer.jsx` — integrate XPToast and rank badge

**Step 1: Add XP system integration**

Import existing components:
- `XPToast` from `src/components/xp/XPToast.jsx`
- `ExplorerRankBadge` from `src/components/xp/ExplorerRankBadge.jsx`
- `XPBar` from `src/components/xp/XPBar.jsx`

Add to WorldTopBar: small rank badge + XP display (right side, subtle, matches world palette).

When XP is awarded (stage completion, challenger response), show XPToast overlay. The toast should use the world's accent color rather than the default styling.

**Step 2: Verify**

Complete a stage in a world — XP toast should appear with correct points.

**Step 3: Commit**

```bash
git add src/pages/student/WorldRenderer.jsx
git commit -m "feat: XP and rank display in world renderer"
```

---

## Phase 4: Camp Hub

### Task 13: Create CampHub page

**Files:**
- Create: `src/pages/student/CampHub.jsx`
- Modify: `src/App.jsx` — update `/student` route

**Step 1: Build CampHub**

CampHub replaces StudentHome. It has 3 sections on a warm, ambient campfire background:

**Visual design:**
- Warm dark background (deep amber/brown gradient, not the cold dark of worlds)
- Subtle ember particles floating up
- Centered layout, max-width 640px

**Section 1: Journey Wall**
- Horizontal scrollable row of completed project "artifacts"
- Each artifact: a small visual card (colored by the world's palette) with project title + a symbolic icon
- Clicking opens a modal or navigates to the world in read-only mode
- Empty state: "Your journey is just beginning..."

**Section 2: The Horizon**
- If guide-assigned project waiting: a card with world teaser text + "Enter World" button
- If no project waiting: "What are you curious about?" input (same as onboarding screen 2's curiosity question)
- "Chart your own course" always available below assigned projects

**Section 3: Active Worlds**
- Any in-progress projects shown as "Return to [World Name]" cards with progress indicator
- Clicking navigates to `/world/:id`

**Top bar:** Simple — Camp icon, student name, rank badge, XP bar, PIN display, sign out

**Step 2: Update route in App.jsx**

Change the `/student` route to render `CampHub` instead of `StudentHome`:
```javascript
import CampHub from './pages/student/CampHub';
// Replace: <Route path="/student" element={<StudentHome />} />
// With: <Route path="/student" element={<CampHub />} />
```

Keep `StudentHome` importable (don't delete yet — it's the fallback).

**Step 3: Verify**

Navigate to `/student` — should see the Camp layout with journey wall and horizon.

**Step 4: Commit**

```bash
git add src/pages/student/CampHub.jsx src/App.jsx
git commit -m "feat: CampHub — warm between-worlds hub with journey wall and horizon"
```

---

### Task 14: Build Campfire reflection system

**Files:**
- Modify: `src/pages/student/CampHub.jsx` — add Campfire section
- Modify: `src/lib/api.js` — add `ai.generateCampfireReflection()`

**Step 1: Add AI reflection generation**

Add to the `ai` object in api.js:

```javascript
generateCampfireReflection: async ({ quest, stages, submissions, studentProfile }) => {
  const prompt = `You are a campfire — a warm, reflective space where a student has just returned from a learning journey.

The student just completed: "${quest.title}"
They went through these locations: ${stages.map(s => s.location_name || s.title).join(' → ')}

Their key submissions included:
${submissions.map(s => `- Stage "${s.stage_title}": ${(s.content || '').slice(0, 200)}`).join('\n')}

Student: ${studentProfile?.name || 'Explorer'}, age ${studentProfile?.age || 'unknown'}, interests: ${(studentProfile?.interests || []).join(', ')}

Generate 3 metacognitive reflection questions. These should be:
- Specific to THIS project and what THIS student actually did
- Focused on HOW they think and solve problems (not what they learned)
- Phrased as genuine curiosity, not teacher-voice
- Examples of good framing: "How did you figure out where to start?", "What would you do differently?", "What surprised you most?"

Return JSON array: ["question1", "question2", "question3"]
Do NOT use generic questions. Reference their actual work.`;

  const result = await callAI(prompt);
  return parseAIJSON(result);
},
```

**Step 2: Add Campfire UI to CampHub**

After a quest is completed and the student returns to camp, the campfire section glows:
- "The campfire crackles. Time to reflect on your journey."
- Shows 3 reflection questions (generated from their actual work)
- Each has a textarea for response
- Responses saved to `reflection_entries` table
- After all answered, campfire settles and becomes part of the journey wall artifact

**Step 3: Verify**

Complete a quest, return to Camp — campfire section should show with relevant reflection questions.

**Step 4: Commit**

```bash
git add src/pages/student/CampHub.jsx src/lib/api.js
git commit -m "feat: Campfire metacognitive reflection — AI-generated questions based on actual student work"
```

---

## Phase 5: Simplified Onboarding

### Task 15: Rebuild LearnerIntakeForm as 2 screens

**Files:**
- Modify: `src/pages/student/LearnerIntakeForm.jsx` — simplify from 5 steps to 2

**Step 1: Simplify the intake form**

Keep the existing file but dramatically simplify it. The new flow:

**Screen 1: "Who are you?"**
- First name (required)
- Emoji avatar picker (keep existing AVATAR_EMOJIS, show as grid)
- Grade band is pre-set from invite (don't show it)

**Screen 2: "What lights you up?"**
- 10-12 interest bubbles (consolidate existing INTEREST_GROUPS into flat list of ~12 top interests)
- Minimum 2 required
- Big text box: "What's something you're curious about right now?"
- Submit button: "Let's go"

**After submit:**
- Call `invites.submitIntake()` with just name, avatar, interests, curiosity answer (passions field)
- Skip skill self-assessment entirely (don't send skills)
- Show brief "Building your world..." atmospheric loading (not a success screen)
- Generate world blueprint from their curiosity + interests
- Navigate directly to `/world/:questId` if guide has assigned a project, or `/student` (Camp) if not

Remove: Steps 3 (skills), 4 (confirmation), 5 (PIN display — PIN shown at Camp instead). Remove age, email, grade band inputs (grade band from invite, rest collected later if needed).

**Step 2: Verify**

Navigate to `/join/:code` — should see a clean 2-screen flow that takes under 90 seconds.

**Step 3: Commit**

```bash
git add src/pages/student/LearnerIntakeForm.jsx
git commit -m "feat: simplified onboarding — 2 screens, interests + curiosity, straight into world"
```

---

### Task 16: Show PIN at Camp instead of onboarding

**Files:**
- Modify: `src/pages/student/CampHub.jsx` — add first-visit PIN reveal

**Step 1: Add PIN display for first visit**

When a student arrives at Camp for the first time (check localStorage flag `wayfinder_seen_pin_${studentId}`):
- Show a brief overlay/modal: "Welcome to Camp, [name]. Your explorer key is: [PIN]. Remember it — it's how you return."
- Copy button
- "Got it" dismisses and sets the localStorage flag

This replaces the onboarding Step 5 PIN screen.

**Step 2: Verify**

Complete onboarding → arrive at Camp → should see PIN overlay once.

**Step 3: Commit**

```bash
git add src/pages/student/CampHub.jsx
git commit -m "feat: PIN reveal at Camp on first visit (moved from onboarding)"
```

---

## Phase 6: Guide-Side Updates

### Task 17: Add location-aware project cards on Dashboard

**Files:**
- Modify: `src/pages/Dashboard.jsx` — update QuestCard to show student locations

**Step 1: Update project cards**

In the Dashboard's quest card rendering, if the quest has a `world_blueprint`:
- Instead of just "3/7 stages, 42%", show: "Jordan is at The Deep Wall (Stage 4)"
- Use `quest_stages` with their `location_name` and `status` to determine where each student currently is
- Show the world's accent color as a subtle left border on the card

This is a visual enhancement only — no new data fetching needed (stages already loaded with quests).

**Step 2: Verify**

Dashboard should show location names for quests that have world blueprints.

**Step 3: Commit**

```bash
git add src/pages/Dashboard.jsx
git commit -m "feat: location-aware project cards — show student's journey position on dashboard"
```

---

### Task 18: Replace radar chart with horizontal skill bars

**Files:**
- Modify: `src/pages/StudentProfilePage.jsx` — replace ProgressRadar with simple bar chart

**Step 1: Create SkillProgressBars component inline**

Replace the ProgressRadar (Recharts radar) with simple horizontal bars:
- Each skill domain: label left, horizontal bar right, percentage
- Bar color from proficiency level (emerging=amber, developing=blue, proficient=green, advanced=purple)
- Below each bar: "Evidence from N submissions" (count from skill_assessments)
- Sortable by proficiency level
- No external chart library needed — pure CSS

Remove the Recharts radar import and ProgressRadar component.

**Step 2: Verify**

Navigate to `/students/:id` — should see clean horizontal bars instead of radar chart.

**Step 3: Commit**

```bash
git add src/pages/StudentProfilePage.jsx
git commit -m "feat: replace radar chart with horizontal skill progress bars + evidence counts"
```

---

## Phase 7: Routing + Cleanup

### Task 19: Update App.jsx routes and navigation links

**Files:**
- Modify: `src/App.jsx` — ensure all student routes point to new pages
- Modify: `src/pages/student/CampHub.jsx` — ensure navigation goes to `/world/:id` not `/q/:id`

**Step 1: Route updates**

```javascript
// New routes:
<Route path="/world/:id" element={<WorldRenderer />} />
<Route path="/student" element={<CampHub />} />

// Keep existing /q/:id route as fallback (for quests without blueprints)
// Keep existing /join/:code route (updated LearnerIntakeForm)
```

**Step 2: Update navigation throughout**

In CampHub, quest cards should link to `/world/:id` if the quest has a `world_blueprint`, or `/q/:id` as fallback.

In Dashboard, the "Share" link for students should still use `/q/:id` (public URL — WorldRenderer requires student session).

**Step 3: Verify**

Full flow: `/join/:code` → onboard → Camp → click project → enters world → complete stage → back to Camp.

**Step 4: Commit**

```bash
git add src/App.jsx src/pages/student/CampHub.jsx
git commit -m "feat: route updates — student flow goes through CampHub and WorldRenderer"
```

---

### Task 20: Remove deprecated components

**Files:**
- Modify: `src/pages/student/StudentHome.jsx` — keep file but add deprecation comment at top
- Modify: `src/pages/student/WorldRenderer.jsx` — remove any remaining stub references

**Step 1: Mark deprecated components**

Don't delete yet (in case of rollback), but add to top of files:
- `StudentHome.jsx`: `// DEPRECATED: Replaced by CampHub.jsx — keeping for rollback`
- `SkillEditorModal` (inside StudentHome): no longer rendered from CampHub

**Step 2: Remove unused imports from CampHub**

Ensure CampHub does NOT import: SkillEditorModal, ExploreModal, TreasureMap, BranchingMap, ScoreCard (student-visible), Leaderboard.

**Step 3: Commit**

```bash
git add src/pages/student/StudentHome.jsx src/pages/student/WorldRenderer.jsx src/pages/student/CampHub.jsx
git commit -m "chore: mark deprecated components, clean up imports"
```

---

## Phase 8: Integration Testing & Polish

### Task 21: End-to-end flow verification

**Files:** None (testing only)

**Step 1: Test full student flow**

Run dev server and test the complete journey:
1. Guide creates a new quest via QuestBuilder → verify `world_blueprint` is saved
2. Student opens `/join/:code` → 2-screen onboarding → lands at Camp or in world
3. Student enters world → sees atmosphere, location, narrative
4. Student opens chat → talks to Mentor (in character)
5. Student submits work via chat → gets in-character feedback
6. On mastery → stage unlocks, XP toast, transition to next location
7. Challenger appears at the_ordeal beat or short submission
8. After all stages complete → return to Camp
9. Campfire reflection questions appear (specific to their work)
10. Journey Wall shows completed project as artifact
11. Guide sees student location on Dashboard card
12. Guide sees horizontal skill bars on StudentProfilePage

**Step 2: Fix any issues found**

Document and fix any issues in the flow.

**Step 3: Commit all fixes**

```bash
git add -A
git commit -m "fix: integration test fixes for world engine flow"
```

---

### Task 22: Mobile responsiveness pass

**Files:**
- Modify: `src/pages/student/WorldRenderer.jsx`
- Modify: `src/components/world/WorldChat.jsx`
- Modify: `src/pages/student/CampHub.jsx`

**Step 1: Mobile layout adjustments**

- WorldRenderer: Stack layout vertically on < 768px. Journey line becomes horizontal scrollable pills.
- WorldChat: Full-screen bottom sheet on mobile (100vh - 60px) with handle, instead of 380px side panel.
- CampHub: Single column, journey wall scrolls horizontally.
- Touch targets: All buttons minimum 44px height.

**Step 2: Verify on mobile viewport**

Use browser dev tools at 375px width. All three pages should be usable.

**Step 3: Commit**

```bash
git add src/pages/student/WorldRenderer.jsx src/components/world/WorldChat.jsx src/pages/student/CampHub.jsx
git commit -m "feat: mobile responsive layouts for world renderer, chat, and camp"
```

---

## Execution Notes

### Dependencies between tasks:
- Tasks 1-4 (Phase 1) are sequential — each builds on the previous
- Tasks 5-8 (Phase 2) are sequential — building up the renderer
- Tasks 9-12 (Phase 3) are sequential — building up the chat system
- Tasks 13-14 (Phase 4) can run in parallel with Phase 3
- Task 15-16 (Phase 5) can run after Phase 1 (needs blueprint generation)
- Tasks 17-18 (Phase 6) are independent — can run in parallel with anything after Phase 1
- Tasks 19-22 (Phase 7-8) must run last

### Parallel execution opportunities:
- Phase 4 (Camp) + Phase 3 (WorldChat) can be built simultaneously
- Phase 6 (Guide updates) can be built simultaneously with Phase 3-5
- Phase 5 (Onboarding) can start after Phase 1 completes

### Key files that will be touched by multiple tasks:
- `src/lib/api.js` — Tasks 3, 4, 14
- `src/pages/student/WorldRenderer.jsx` — Tasks 5, 6, 7, 8, 12, 22
- `src/components/world/WorldChat.jsx` — Tasks 9, 10, 11, 22
- `src/App.jsx` — Tasks 5, 13, 19

### Migration reminder:
After Task 1, run `042_world_blueprints.sql` in the Supabase dashboard before testing Tasks 3-4.
