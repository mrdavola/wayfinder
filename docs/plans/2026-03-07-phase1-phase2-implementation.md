# Wayfinder Phase 1 & 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the Partials (terminology sweep + master AI prompt) and the full Layer 1 Treasure Map Journey System (XP/progression, visual redesign, interactive stage types, narrative/atmosphere, social/team elements).

**Architecture:** Phase 1 is cleanup — grep-and-replace terminology, consolidate AI prompts into a shared base. Phase 2 builds the treasure map system bottom-up: database tables first, then data layer (api.js), then reusable components, then page integration. SVG-based rendering throughout, no Canvas/WebGL.

**Tech Stack:** React + Vite, Supabase (PostgreSQL), @anthropic-ai/sdk + Google Gemini dual provider, CSS custom properties, SVG for map rendering, Web Audio API for optional sound.

---

## Phase 1: Partials

### Task 1: Terminology Sweep — Fix "curriculum" instances

**Files:**
- Modify: `src/pages/auth/LoginPage.jsx:21`
- Modify: `src/pages/auth/SignupPage.jsx:39`
- Modify: `src/pages/auth/OnboardingPage.jsx:397`
- Modify: `src/pages/LandingPage.jsx:586,919,994`

**Step 1: Fix LoginPage**

In `src/pages/auth/LoginPage.jsx`, line 21, change:
```javascript
'AI-powered curriculum generation in minutes',
```
to:
```javascript
'AI-powered project generation in minutes',
```

**Step 2: Fix SignupPage**

In `src/pages/auth/SignupPage.jsx`, line 39, change:
```javascript
'AI-powered curriculum generation in minutes',
```
to:
```javascript
'AI-powered project generation in minutes',
```

**Step 3: Fix OnboardingPage**

In `src/pages/auth/OnboardingPage.jsx`, line 397, change:
```
"We'll use this to tailor curriculum suggestions and project templates."
```
to:
```
"We'll use this to tailor project suggestions and templates."
```

**Step 4: Fix LandingPage "curriculum" references**

In `src/pages/LandingPage.jsx`:
- Line 586: Change `"...career-connected curriculum for every learner."` to `"...career-connected projects for every learner."`
- Line 919: Change `"...design curriculum that honors..."` to `"...design projects that honor..."`
- Line 994: Change `'Dedicated onboarding and curriculum mapping support'` to `'Dedicated onboarding and project mapping support'`

**Step 5: Commit**
```bash
git add src/pages/auth/LoginPage.jsx src/pages/auth/SignupPage.jsx src/pages/auth/OnboardingPage.jsx src/pages/LandingPage.jsx
git commit -m "fix: replace 'curriculum' with 'project' in all user-facing text"
```

---

### Task 2: Terminology Sweep — Fix "quest" in user-facing text

**Files:**
- Modify: `src/pages/LandingPage.jsx:173`
- Modify: `src/pages/AdminDashboard.jsx:244,268,269,270`
- Modify: `src/pages/ParentDashboard.jsx:400`
- Modify: `src/pages/Settings.jsx:901`

**Step 1: Fix LandingPage SVG**

In `src/pages/LandingPage.jsx`, line 173, change:
```jsx
<text x="10" y="14" ...>QUEST TYPE</text>
```
to:
```jsx
<text x="10" y="14" ...>PROJECT TYPE</text>
```

**Step 2: Fix AdminDashboard**

In `src/pages/AdminDashboard.jsx`:
- Line 244: `label="Quests"` → `label="Projects"`
- Line 268: `label="Total Quests"` → `label="Total Projects"`
- Line 269: `label="Active Quests"` → `label="Active Projects"`
- Line 270: `sub="quests finished"` → `sub="projects finished"`

**Step 3: Fix ParentDashboard**

In `src/pages/ParentDashboard.jsx`, line 400:
```
"Active Quests"
```
to:
```
"Active Projects"
```

**Step 4: Fix Settings**

In `src/pages/Settings.jsx`, line 901:
```
"Schools · Users · Quests · Analytics"
```
to:
```
"Schools · Users · Projects · Analytics"
```

**Step 5: Commit**
```bash
git add src/pages/LandingPage.jsx src/pages/AdminDashboard.jsx src/pages/ParentDashboard.jsx src/pages/Settings.jsx
git commit -m "fix: replace 'quest' with 'project' in remaining user-facing text"
```

---

### Task 3: Master AI Prompt — Create WAYFINDER_SYSTEM_PROMPT

**Files:**
- Modify: `src/lib/api.js`

**Step 1: Read the current SAFETY_PREAMBLE and callAI function**

Read `src/lib/api.js` lines 360-380 to confirm exact location.

**Step 2: Create the WAYFINDER_SYSTEM_PROMPT constant**

Add after the existing SAFETY_PREAMBLE constant (around line 365):

```javascript
const WAYFINDER_SYSTEM_PROMPT = `${SAFETY_PREAMBLE}

WAYFINDER AI IDENTITY:
You are a Wayfinder AI — part of an educational platform for learner-driven schools serving ages 8-14.

CORE BEHAVIOR:
- Use Socratic questioning by default. Ask questions that help learners think deeper — never give direct answers unless explicitly instructed otherwise.
- Tone: Warm, adventurous, encouraging. Think Zelda: Wind Waker — approachable but not patronizing. Never condescending. Never "teacher voice."
- Keep responses concise. 1-3 sentences for chat, structured JSON when required.
- Reference the learner's interests, passions, and identity whenever relevant. Make connections personal.

GROUP PROJECT RULES (when multiple learners):
- Each learner has an assigned role (e.g., Lead Researcher, Data Analyst, Creative Director).
- Address learners by name. Tailor guidance to their specific role and strengths.
- Encourage collaboration but ensure each learner does meaningful individual work.

TRUTH & ACCURACY:
- Never present unverified facts as truth. If you cannot cite a source, frame it as a question or hypothesis.
- When making factual claims, note the source or say "Based on what I know" to signal it's AI-generated.
- If you're unsure about something, say so. "I'm not sure about that — let's explore it together" is always acceptable.
- Prefer real-world examples from credible sources (.gov, .edu, established news) when available.

NEVER:
- Use grades, scores, or percentages when talking to learners. Frame everything as growth and progress.
- Sound like a traditional school teacher. This is an expedition, not a classroom.
- Break character or reference being an AI unless directly asked.
`;
```

**Step 3: Update callAI to use the new base prompt**

Replace the existing callAI function:

```javascript
async function callAI(params) {
  const safeParams = {
    ...params,
    systemPrompt: params.systemPrompt
      ? WAYFINDER_SYSTEM_PROMPT + '\n' + params.systemPrompt
      : WAYFINDER_SYSTEM_PROMPT,
  };
  return getPreferredProvider() === 'anthropic'
    ? callAnthropic(safeParams)
    : callGemini(safeParams);
}
```

Note: This replaces the previous `SAFETY_PREAMBLE`-only prepend with the full `WAYFINDER_SYSTEM_PROMPT` which already includes the safety preamble.

**Step 4: Verify no double-prepending**

Search api.js for any functions that manually prepend SAFETY_PREAMBLE. The callAI function already handles it — no individual AI function should prepend it again. If any do, remove the redundant prepend.

**Step 5: Commit**
```bash
git add src/lib/api.js
git commit -m "feat: consolidate AI prompts into unified WAYFINDER_SYSTEM_PROMPT"
```

---

## Phase 2: Treasure Map Journey System

### Task 4: Database — Create XP & Badge Tables

**Files:**
- Create: `supabase/migrations/023_xp_badges.sql`

**Step 1: Write the migration**

```sql
-- 023_xp_badges.sql
-- Explorer Points (XP) and Badge system for gamification

-- ============================================================
-- XP EVENTS — tracks every EP-earning action
-- ============================================================
CREATE TABLE IF NOT EXISTS xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'stage_complete', 'quality_bonus', 'challenger_response',
    'reflection', 'peer_help', 'project_complete', 'streak_bonus'
  )),
  points INTEGER NOT NULL DEFAULT 0,
  quest_id UUID REFERENCES quests(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES quest_stages(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_xp_events_student ON xp_events(student_id);
CREATE INDEX idx_xp_events_student_created ON xp_events(student_id, created_at);

-- ============================================================
-- STUDENT XP SUMMARY — cached totals for fast reads
-- ============================================================
CREATE TABLE IF NOT EXISTS student_xp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE UNIQUE,
  total_points INTEGER DEFAULT 0,
  current_rank TEXT DEFAULT 'apprentice' CHECK (current_rank IN (
    'apprentice', 'scout', 'pathfinder', 'trailblazer', 'navigator', 'expedition_leader'
  )),
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_date DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_student_xp_student ON student_xp(student_id);

-- ============================================================
-- BADGE DEFINITIONS — master catalog
-- ============================================================
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT DEFAULT '',
  category TEXT DEFAULT 'achievement' CHECK (category IN ('achievement', 'milestone', 'streak', 'social')),
  criteria JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed badges
INSERT INTO badges (slug, name, description, icon, category, criteria, sort_order) VALUES
  ('first_expedition', 'First Expedition', 'Complete your first project', 'compass', 'milestone', '{"type": "project_complete", "count": 1}', 1),
  ('deep_diver', 'Deep Diver', 'Write 5 or more reflections', 'anchor', 'achievement', '{"type": "reflection_count", "count": 5}', 2),
  ('devils_advocate', 'Devil''s Advocate', 'Respond to 10 challenges', 'flame', 'achievement', '{"type": "challenger_response", "count": 10}', 3),
  ('cartographer', 'Cartographer', 'Help map a peer''s journey', 'map', 'social', '{"type": "peer_help", "count": 1}', 4),
  ('streak_explorer', 'Streak Explorer', 'Maintain a 7-day activity streak', 'zap', 'streak', '{"type": "streak", "days": 7}', 5),
  ('trailblazer', 'Trailblazer', 'Reach the Trailblazer rank', 'mountain', 'milestone', '{"type": "rank_reached", "rank": "trailblazer"}', 6),
  ('navigator', 'Navigator', 'Reach the Navigator rank', 'telescope', 'milestone', '{"type": "rank_reached", "rank": "navigator"}', 7),
  ('stage_master', 'Stage Master', 'Complete 25 stages across all projects', 'flag', 'achievement', '{"type": "stage_complete", "count": 25}', 8),
  ('wordsmith', 'Wordsmith', 'Submit 10 written works', 'pen-tool', 'achievement', '{"type": "text_submission", "count": 10}', 9),
  ('expedition_leader', 'Expedition Leader', 'Reach the highest rank', 'crown', 'milestone', '{"type": "rank_reached", "rank": "expedition_leader"}', 10);

-- ============================================================
-- STUDENT BADGES — earned badges per student
-- ============================================================
CREATE TABLE IF NOT EXISTS student_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, badge_id)
);

CREATE INDEX idx_student_badges_student ON student_badges(student_id);

-- ============================================================
-- MAP LANDMARKS — AI-generated landmarks per quest stage
-- ============================================================
CREATE TABLE IF NOT EXISTS stage_landmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES quest_stages(id) ON DELETE CASCADE UNIQUE,
  landmark_type TEXT NOT NULL CHECK (landmark_type IN (
    'cave', 'lighthouse', 'bridge', 'volcano', 'camp', 'observatory',
    'waterfall', 'ruins', 'tower', 'harbor', 'forest', 'mountain_peak'
  )),
  landmark_name TEXT NOT NULL,
  narrative_hook TEXT,
  ambient_sound TEXT CHECK (ambient_sound IN (
    'campfire', 'ocean', 'wind', 'rain', 'birds', 'cave_drip', 'river', NULL
  )),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- STAGE TYPE EXTENSION — support new interactive types
-- ============================================================
ALTER TABLE quest_stages
  DROP CONSTRAINT IF EXISTS quest_stages_stage_type_check;

ALTER TABLE quest_stages
  ADD CONSTRAINT quest_stages_stage_type_check
  CHECK (stage_type IN (
    'research', 'build', 'experiment', 'simulate', 'reflect', 'present',
    'puzzle_gate', 'choice_fork', 'evidence_board'
  ));

-- ============================================================
-- PUZZLE DATA — stores puzzle/evidence/choice data per stage
-- ============================================================
CREATE TABLE IF NOT EXISTS stage_interactive_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES quest_stages(id) ON DELETE CASCADE UNIQUE,
  interactive_type TEXT NOT NULL CHECK (interactive_type IN ('puzzle_gate', 'choice_fork', 'evidence_board')),
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Puzzle Gate config example:
-- { "puzzle_type": "sort", "categories": ["Renewable", "Non-Renewable"], "items": [{"text": "Solar", "correct_category": "Renewable"}, ...] }

-- Choice Fork config example:
-- { "prompt": "Which path do you choose?", "choices": [{"label": "Investigate the river", "next_stage_number": 4}, {"label": "Climb the mountain", "next_stage_number": 5}] }

-- Evidence Board config example:
-- { "prompt": "Build your case: Why should the city invest in green roofs?", "clue_cards": [{"id": "c1", "type": "fact", "text": "Green roofs reduce stormwater runoff by 50-90%", "source": "EPA.gov"}, ...], "board_zones": ["Environmental Impact", "Economic Benefits", "Community Health"] }

-- ============================================================
-- CAMPFIRE CHAT — group chat per stage
-- ============================================================
-- Reuse guide_messages table with a new message_type

ALTER TABLE guide_messages
  DROP CONSTRAINT IF EXISTS guide_messages_message_type_check;

ALTER TABLE guide_messages
  ADD CONSTRAINT guide_messages_message_type_check
  CHECK (message_type IN ('field_guide', 'devil_advocate', 'ai_feedback', 'campfire_chat'));

-- ============================================================
-- EXPLORER LOG — public activity feed
-- ============================================================
CREATE TABLE IF NOT EXISTS explorer_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'project_complete', 'rank_up', 'badge_earned', 'stage_complete'
  )),
  message TEXT NOT NULL,
  public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_explorer_log_school ON explorer_log(student_id, created_at);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- xp_events: guides read for their students, anon insert
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY xp_events_guide_read ON xp_events FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM students WHERE guide_id = auth.uid()));
CREATE POLICY xp_events_anon_insert ON xp_events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY xp_events_anon_read ON xp_events FOR SELECT TO anon USING (true);

-- student_xp: same pattern
ALTER TABLE student_xp ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_xp_read ON student_xp FOR SELECT TO anon USING (true);
CREATE POLICY student_xp_guide_read ON student_xp FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM students WHERE guide_id = auth.uid()));
CREATE POLICY student_xp_anon_upsert ON student_xp FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY student_xp_anon_update ON student_xp FOR UPDATE TO anon USING (true);

-- badges: public read
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY badges_read ON badges FOR SELECT USING (true);

-- student_badges: same as xp
ALTER TABLE student_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_badges_read ON student_badges FOR SELECT USING (true);
CREATE POLICY student_badges_insert ON student_badges FOR INSERT TO anon WITH CHECK (true);

-- stage_landmarks: public read, auth insert
ALTER TABLE stage_landmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY stage_landmarks_read ON stage_landmarks FOR SELECT USING (true);
CREATE POLICY stage_landmarks_auth_insert ON stage_landmarks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY stage_landmarks_anon_insert ON stage_landmarks FOR INSERT TO anon WITH CHECK (true);

-- stage_interactive_data: public read, auth manage
ALTER TABLE stage_interactive_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY stage_interactive_data_read ON stage_interactive_data FOR SELECT USING (true);
CREATE POLICY stage_interactive_data_auth_manage ON stage_interactive_data FOR ALL TO authenticated USING (true);
CREATE POLICY stage_interactive_data_anon_insert ON stage_interactive_data FOR INSERT TO anon WITH CHECK (true);

-- explorer_log: public read where public=true, anon insert
ALTER TABLE explorer_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY explorer_log_public_read ON explorer_log FOR SELECT USING (public = true);
CREATE POLICY explorer_log_anon_insert ON explorer_log FOR INSERT TO anon WITH CHECK (true);

-- ============================================================
-- RPC: Award XP and check rank/badges
-- ============================================================
CREATE OR REPLACE FUNCTION award_xp(
  p_student_id UUID,
  p_event_type TEXT,
  p_points INTEGER,
  p_quest_id UUID DEFAULT NULL,
  p_stage_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
  v_total INTEGER;
  v_old_rank TEXT;
  v_new_rank TEXT;
  v_streak INTEGER;
  v_result JSONB;
BEGIN
  -- Insert XP event
  INSERT INTO xp_events (student_id, event_type, points, quest_id, stage_id, metadata)
  VALUES (p_student_id, p_event_type, p_points, p_quest_id, p_stage_id, p_metadata);

  -- Upsert student_xp summary
  INSERT INTO student_xp (student_id, total_points, last_active_date)
  VALUES (p_student_id, p_points, CURRENT_DATE)
  ON CONFLICT (student_id) DO UPDATE SET
    total_points = student_xp.total_points + p_points,
    last_active_date = CURRENT_DATE,
    updated_at = now();

  -- Get current total
  SELECT total_points, current_rank INTO v_total, v_old_rank
  FROM student_xp WHERE student_id = p_student_id;

  -- Calculate rank
  v_new_rank := CASE
    WHEN v_total >= 6000 THEN 'expedition_leader'
    WHEN v_total >= 3000 THEN 'navigator'
    WHEN v_total >= 1500 THEN 'trailblazer'
    WHEN v_total >= 600 THEN 'pathfinder'
    WHEN v_total >= 200 THEN 'scout'
    ELSE 'apprentice'
  END;

  -- Update rank if changed
  IF v_new_rank != v_old_rank THEN
    UPDATE student_xp SET current_rank = v_new_rank WHERE student_id = p_student_id;
  END IF;

  -- Update streak
  UPDATE student_xp SET
    current_streak = CASE
      WHEN last_active_date = CURRENT_DATE - INTERVAL '1 day' THEN current_streak + 1
      WHEN last_active_date = CURRENT_DATE THEN current_streak
      ELSE 1
    END,
    longest_streak = GREATEST(longest_streak, current_streak)
  WHERE student_id = p_student_id;

  SELECT current_streak INTO v_streak FROM student_xp WHERE student_id = p_student_id;

  v_result := jsonb_build_object(
    'total_points', v_total,
    'new_rank', v_new_rank,
    'rank_changed', v_new_rank != v_old_rank,
    'current_streak', v_streak
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Step 2: Commit**
```bash
git add supabase/migrations/023_xp_badges.sql
git commit -m "feat: add XP, badges, landmarks, and interactive stage tables (migration 023)"
```

---

### Task 5: API Layer — XP, Badges, Landmarks, Interactive Data

**Files:**
- Modify: `src/lib/api.js`

**Step 1: Read current api.js exports section**

Read the bottom of `src/lib/api.js` to find where exports are defined.

**Step 2: Add XP functions to api.js**

Add the following after the existing API sections:

```javascript
// ===================== XP & PROGRESSION =====================

const EP_VALUES = {
  stage_complete: 50,
  quality_bonus_min: 10,
  quality_bonus_max: 30,
  challenger_response: 25,
  reflection: 20,
  peer_help: 15,
  project_complete: 200,
  streak_bonus: 10,
};

const RANK_THRESHOLDS = [
  { rank: 'expedition_leader', min: 6000 },
  { rank: 'navigator', min: 3000 },
  { rank: 'trailblazer', min: 1500 },
  { rank: 'pathfinder', min: 600 },
  { rank: 'scout', min: 200 },
  { rank: 'apprentice', min: 0 },
];

export const xp = {
  EP_VALUES,
  RANK_THRESHOLDS,

  async award(studentId, eventType, questId = null, stageId = null, metadata = {}) {
    const points = EP_VALUES[eventType] || 0;
    if (!points) return null;
    const { data, error } = await supabase.rpc('award_xp', {
      p_student_id: studentId,
      p_event_type: eventType,
      p_points: points,
      p_quest_id: questId,
      p_stage_id: stageId,
      p_metadata: metadata,
    });
    if (error) { console.error('XP award error:', error); return null; }
    return data;
  },

  async awardQualityBonus(studentId, qualityScore, questId = null, stageId = null) {
    // qualityScore 0-1, maps to 10-30 bonus EP
    const points = Math.round(EP_VALUES.quality_bonus_min + qualityScore * (EP_VALUES.quality_bonus_max - EP_VALUES.quality_bonus_min));
    const { data, error } = await supabase.rpc('award_xp', {
      p_student_id: studentId,
      p_event_type: 'quality_bonus',
      p_points: points,
      p_quest_id: questId,
      p_stage_id: stageId,
      p_metadata: { quality_score: qualityScore },
    });
    if (error) { console.error('Quality bonus error:', error); return null; }
    return data;
  },

  async getStudentXP(studentId) {
    const { data, error } = await supabase
      .from('student_xp')
      .select('*')
      .eq('student_id', studentId)
      .single();
    if (error && error.code !== 'PGRST116') { console.error('Get XP error:', error); }
    return data || { total_points: 0, current_rank: 'apprentice', current_streak: 0, longest_streak: 0 };
  },

  async getRecentEvents(studentId, limit = 20) {
    const { data, error } = await supabase
      .from('xp_events')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) { console.error('Get events error:', error); return []; }
    return data || [];
  },

  getRankForPoints(points) {
    return RANK_THRESHOLDS.find(r => points >= r.min)?.rank || 'apprentice';
  },

  getNextRank(currentRank) {
    const idx = RANK_THRESHOLDS.findIndex(r => r.rank === currentRank);
    return idx > 0 ? RANK_THRESHOLDS[idx - 1] : null;
  },
};

// ===================== BADGES =====================

export const badgesApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('badges')
      .select('*')
      .order('sort_order');
    if (error) { console.error('Get badges error:', error); return []; }
    return data || [];
  },

  async getStudentBadges(studentId) {
    const { data, error } = await supabase
      .from('student_badges')
      .select('*, badges(*)')
      .eq('student_id', studentId)
      .order('earned_at', { ascending: false });
    if (error) { console.error('Get student badges error:', error); return []; }
    return data || [];
  },

  async award(studentId, badgeSlug) {
    // Look up badge by slug
    const { data: badge } = await supabase
      .from('badges')
      .select('id')
      .eq('slug', badgeSlug)
      .single();
    if (!badge) return null;

    const { data, error } = await supabase
      .from('student_badges')
      .upsert({ student_id: studentId, badge_id: badge.id }, { onConflict: 'student_id,badge_id' })
      .select('*, badges(*)')
      .single();
    if (error) { console.error('Award badge error:', error); return null; }
    return data;
  },

  async checkAndAward(studentId) {
    // Check all badge criteria and award any newly earned
    const [earned, allBadges, xpData, events] = await Promise.all([
      this.getStudentBadges(studentId),
      this.getAll(),
      xp.getStudentXP(studentId),
      xp.getRecentEvents(studentId, 1000),
    ]);

    const earnedSlugs = new Set(earned.map(b => b.badges?.slug));
    const newBadges = [];

    for (const badge of allBadges) {
      if (earnedSlugs.has(badge.slug)) continue;
      const c = badge.criteria;

      let qualifies = false;
      switch (c.type) {
        case 'project_complete':
          qualifies = events.filter(e => e.event_type === 'project_complete').length >= c.count;
          break;
        case 'reflection_count':
          qualifies = events.filter(e => e.event_type === 'reflection').length >= c.count;
          break;
        case 'challenger_response':
          qualifies = events.filter(e => e.event_type === 'challenger_response').length >= c.count;
          break;
        case 'peer_help':
          qualifies = events.filter(e => e.event_type === 'peer_help').length >= c.count;
          break;
        case 'streak':
          qualifies = xpData.longest_streak >= c.days;
          break;
        case 'rank_reached':
          qualifies = xpData.current_rank === c.rank ||
            RANK_THRESHOLDS.findIndex(r => r.rank === xpData.current_rank) <=
            RANK_THRESHOLDS.findIndex(r => r.rank === c.rank);
          break;
        case 'stage_complete':
          qualifies = events.filter(e => e.event_type === 'stage_complete').length >= c.count;
          break;
        case 'text_submission':
          qualifies = events.filter(e => e.event_type === 'stage_complete' && e.metadata?.submission_type === 'text').length >= c.count;
          break;
      }

      if (qualifies) {
        const awarded = await this.award(studentId, badge.slug);
        if (awarded) newBadges.push(awarded);
      }
    }

    return newBadges;
  },
};

// ===================== LANDMARKS =====================

export const landmarks = {
  async getForQuest(questId) {
    const { data, error } = await supabase
      .from('stage_landmarks')
      .select('*, quest_stages!inner(quest_id)')
      .eq('quest_stages.quest_id', questId);
    if (error) { console.error('Get landmarks error:', error); return []; }
    return data || [];
  },

  async upsert(stageId, landmarkData) {
    const { data, error } = await supabase
      .from('stage_landmarks')
      .upsert({ stage_id: stageId, ...landmarkData }, { onConflict: 'stage_id' })
      .select()
      .single();
    if (error) { console.error('Upsert landmark error:', error); }
    return data;
  },

  async bulkUpsert(landmarks) {
    const { data, error } = await supabase
      .from('stage_landmarks')
      .upsert(landmarks, { onConflict: 'stage_id' });
    if (error) { console.error('Bulk upsert landmarks error:', error); }
    return data;
  },
};

// ===================== INTERACTIVE STAGE DATA =====================

export const interactiveStages = {
  async get(stageId) {
    const { data, error } = await supabase
      .from('stage_interactive_data')
      .select('*')
      .eq('stage_id', stageId)
      .single();
    if (error && error.code !== 'PGRST116') { console.error('Get interactive data error:', error); }
    return data;
  },

  async upsert(stageId, interactiveType, config) {
    const { data, error } = await supabase
      .from('stage_interactive_data')
      .upsert({ stage_id: stageId, interactive_type: interactiveType, config }, { onConflict: 'stage_id' })
      .select()
      .single();
    if (error) { console.error('Upsert interactive error:', error); }
    return data;
  },
};

// ===================== EXPLORER LOG =====================

export const explorerLog = {
  async getForSchool(schoolId, limit = 50) {
    const { data, error } = await supabase
      .from('explorer_log')
      .select('*, students!inner(name, school_id, avatar_emoji)')
      .eq('students.school_id', schoolId)
      .eq('public', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) { console.error('Get explorer log error:', error); return []; }
    return data || [];
  },

  async add(studentId, eventType, message) {
    const { error } = await supabase
      .from('explorer_log')
      .insert({ student_id: studentId, event_type: eventType, message });
    if (error) { console.error('Add log error:', error); }
  },
};
```

**Step 3: Commit**
```bash
git add src/lib/api.js
git commit -m "feat: add XP, badges, landmarks, interactive stages, and explorer log API layer"
```

---

### Task 6: AI Generation — Landmarks & Interactive Data

**Files:**
- Modify: `src/lib/api.js`

**Step 1: Add ai.generateLandmarks function**

Add to the `ai` object in api.js:

```javascript
async generateLandmarks(stages) {
  const systemPrompt = `You assign treasure map landmarks to project stages. Each stage becomes a location on an illustrated map.

LANDMARK TYPES (pick the most thematically appropriate):
cave, lighthouse, bridge, volcano, camp, observatory, waterfall, ruins, tower, harbor, forest, mountain_peak

AMBIENT SOUNDS (optional, pick one or null):
campfire, ocean, wind, rain, birds, cave_drip, river

Return ONLY valid JSON array.`;

  const userMessage = `Assign landmarks to these stages:\n${stages.map(s =>
    `Stage ${s.stage_number}: "${s.title}" (${s.stage_type}) — ${s.description?.slice(0, 100)}`
  ).join('\n')}

Return JSON array:
[{"stage_number": 1, "landmark_type": "lighthouse", "landmark_name": "The Beacon of Discovery", "narrative_hook": "A warm light cuts through the fog...", "ambient_sound": "ocean"}]`;

  const raw = await callAI({ systemPrompt, userMessage });
  try {
    const parsed = JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
},

async generateInteractiveData(stage, interactiveType) {
  const systemPrompt = `You generate interactive puzzle/challenge data for educational project stages. The content must test understanding of the stage's learning goals while feeling like an adventure game element — NOT a school quiz.

For puzzle_gate: Create a sorting/matching/sequencing challenge.
For choice_fork: Create 2-3 meaningful choices that branch the adventure.
For evidence_board: Create detective-style clue cards and board zones.

Return ONLY valid JSON.`;

  const typeInstructions = {
    puzzle_gate: `Create a puzzle for stage "${stage.title}".
Return: {"puzzle_type": "sort|match|sequence", "instruction": "...", "categories": ["Cat A", "Cat B"], "items": [{"text": "item text", "correct_category": "Cat A"}]}
For sequence: {"puzzle_type": "sequence", "instruction": "...", "items": [{"text": "step text", "correct_position": 1}]}`,

    choice_fork: `Create a meaningful choice for stage "${stage.title}".
Return: {"prompt": "narrative choice text", "choices": [{"label": "Option text", "description": "What this path means", "difficulty": "standard|stretch"}]}`,

    evidence_board: `Create an evidence board for stage "${stage.title}".
Return: {"prompt": "The case to build", "clue_cards": [{"id": "c1", "type": "fact|quote|data|image_desc", "text": "clue content", "source": "source if applicable"}], "board_zones": ["Zone 1", "Zone 2", "Zone 3"]}`
  };

  const userMessage = `Stage: "${stage.title}" (${stage.stage_type})
Description: ${stage.description}
Deliverable: ${stage.deliverable}
Academic skills: ${stage.academic_skills?.join(', ') || 'general'}

${typeInstructions[interactiveType]}`;

  const raw = await callAI({ systemPrompt, userMessage });
  try {
    return JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
  } catch { return {}; }
},
```

**Step 2: Update ai.generateQuest to include landmark types and interactive stages**

Find the existing `generateQuest` function's return schema in the system prompt. Add to the stage object schema:

```
"landmark_type": "one of: cave, lighthouse, bridge, volcano, camp, observatory, waterfall, ruins, tower, harbor, forest, mountain_peak",
"landmark_name": "Creative name for this location on the treasure map",
"narrative_hook": "1-2 sentences setting the scene for this stage location",
"interactive_type": "null OR one of: puzzle_gate, choice_fork, evidence_board — use for at most 2-3 stages per project"
```

This allows landmarks and interactive types to be generated inline during quest creation, then saved to their respective tables.

**Step 3: Commit**
```bash
git add src/lib/api.js
git commit -m "feat: add AI landmark generation and interactive stage data generation"
```

---

### Task 7: Treasure Map SVG Components

**Files:**
- Create: `src/components/map/TreasureMap.jsx`
- Create: `src/components/map/MapLandmark.jsx`
- Create: `src/components/map/MapPath.jsx`
- Create: `src/components/map/ExplorerToken.jsx`
- Create: `src/components/map/FogOverlay.jsx`

**Step 1: Create the map directory**

```bash
mkdir -p src/components/map
```

**Step 2: Create MapLandmark.jsx**

```javascript
// src/components/map/MapLandmark.jsx
import { useState } from 'react';
import {
  Mountain, Waves, Wind, TreePine, Compass, Landmark as LandmarkIcon,
  FlameKindling, Eye, Castle, Anchor, CloudRain, MountainSnow
} from 'lucide-react';

const LANDMARK_ICONS = {
  cave: FlameKindling,
  lighthouse: Eye,
  bridge: LandmarkIcon,
  volcano: Mountain,
  camp: FlameKindling,
  observatory: Eye,
  waterfall: Waves,
  ruins: Castle,
  tower: Castle,
  harbor: Anchor,
  forest: TreePine,
  mountain_peak: MountainSnow,
};

const LANDMARK_COLORS = {
  completed: { fill: 'var(--field-green)', stroke: '#1B5E3B', icon: 'var(--chalk)' },
  active: { fill: 'var(--compass-gold)', stroke: '#8B6914', icon: 'var(--ink)' },
  locked: { fill: 'var(--parchment)', stroke: 'var(--pencil)', icon: 'var(--pencil)' },
};

export default function MapLandmark({ cx, cy, stage, landmark, isSelected, isActive, onClick }) {
  const [hovered, setHovered] = useState(false);
  const status = stage.status;
  const colors = LANDMARK_COLORS[status] || LANDMARK_COLORS.locked;
  const Icon = LANDMARK_ICONS[landmark?.landmark_type] || Compass;
  const r = 28;

  return (
    <g
      onClick={status !== 'locked' ? onClick : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: status !== 'locked' ? 'pointer' : 'default' }}
      role={status !== 'locked' ? 'button' : undefined}
      tabIndex={status !== 'locked' ? 0 : undefined}
      aria-label={`${landmark?.landmark_name || stage.title} — ${status}`}
      onKeyDown={(e) => {
        if (status !== 'locked' && (e.key === 'Enter' || e.key === ' ')) onClick?.();
      }}
    >
      {/* Pulse ring for active */}
      {status === 'active' && (
        <circle cx={cx} cy={cy} r={r + 10} fill="none"
          stroke="var(--compass-gold)" strokeWidth={1.5} opacity={0.4}>
          <animate attributeName="r" from={r + 6} to={r + 16} dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Selection ring */}
      {isSelected && (
        <circle cx={cx} cy={cy} r={r + 6} fill="none"
          stroke="var(--lab-blue)" strokeWidth={2.5} opacity={0.8} />
      )}

      {/* Main landmark shape — hexagonal for visual interest */}
      <circle cx={cx} cy={cy} r={r}
        fill={colors.fill} stroke={colors.stroke} strokeWidth={2}
        opacity={status === 'locked' ? 0.4 : 1}
        style={{ transition: 'all 300ms ease' }}
      />

      {/* Inner icon */}
      <foreignObject x={cx - 12} y={cy - 12} width={24} height={24}
        style={{ opacity: status === 'locked' ? 0.3 : 1 }}>
        <Icon size={24} color={colors.icon} />
      </foreignObject>

      {/* Landmark name label */}
      <text x={cx} y={cy + r + 16} textAnchor="middle"
        fontFamily="var(--font-mono)" fontSize={9}
        fill="var(--graphite)" opacity={status === 'locked' ? 0.3 : 0.8}>
        {(landmark?.landmark_name || `Stage ${stage.stage_number}`).slice(0, 20)}
      </text>

      {/* Hover tooltip */}
      {hovered && status !== 'locked' && (
        <foreignObject x={cx - 80} y={cy - r - 44} width={160} height={36}>
          <div style={{
            background: 'var(--ink)', color: 'var(--chalk)', padding: '4px 10px',
            borderRadius: 6, fontSize: 11, fontFamily: 'var(--font-body)',
            textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {landmark?.landmark_name || stage.title}
          </div>
        </foreignObject>
      )}

      {/* Completed checkmark overlay */}
      {status === 'completed' && (
        <g>
          <circle cx={cx + r - 4} cy={cy - r + 4} r={8} fill="var(--field-green)" stroke="var(--chalk)" strokeWidth={1.5} />
          <text x={cx + r - 4} y={cy - r + 8} textAnchor="middle" fontSize={10} fill="var(--chalk)">✓</text>
        </g>
      )}
    </g>
  );
}
```

**Step 3: Create MapPath.jsx**

```javascript
// src/components/map/MapPath.jsx
export default function MapPath({ x1, y1, x2, y2, status, animated }) {
  const isComplete = status === 'completed';
  const pathId = `path-${x1}-${y1}-${x2}-${y2}`;
  const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

  return (
    <g>
      {/* Background dashed path */}
      <line x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={isComplete ? 'var(--field-green)' : 'var(--pencil)'}
        strokeWidth={isComplete ? 2.5 : 1.5}
        strokeDasharray={isComplete ? 'none' : '8 6'}
        opacity={isComplete ? 0.6 : 0.3}
        strokeLinecap="round"
      />

      {/* Animated draw-in effect for newly completed */}
      {animated && isComplete && (
        <line x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="var(--field-green)" strokeWidth={3}
          strokeDasharray={length} strokeDashoffset={length}
          strokeLinecap="round" opacity={0.8}>
          <animate attributeName="stroke-dashoffset" from={length} to={0}
            dur="1.5s" fill="freeze" />
        </line>
      )}
    </g>
  );
}
```

**Step 4: Create ExplorerToken.jsx**

```javascript
// src/components/map/ExplorerToken.jsx
import { Compass } from 'lucide-react';

export default function ExplorerToken({ cx, cy, emoji, name, animate }) {
  return (
    <g style={animate ? {
      transition: 'transform 1s ease-in-out',
      transform: `translate(${cx}px, ${cy}px)`,
    } : undefined}>
      <g transform={animate ? undefined : `translate(${cx}, ${cy})`}>
        {/* Glow under token */}
        <circle cx={0} cy={0} r={16} fill="var(--compass-gold)" opacity={0.15} />

        {/* Token body */}
        <circle cx={0} cy={0} r={13} fill="var(--compass-gold)" stroke="var(--ink)" strokeWidth={1.5} />

        {/* Avatar or compass */}
        <foreignObject x={-9} y={-9} width={18} height={18}>
          {emoji ? (
            <span style={{ fontSize: 14, lineHeight: '18px', display: 'block', textAlign: 'center' }}>{emoji}</span>
          ) : (
            <Compass size={18} color="var(--ink)" />
          )}
        </foreignObject>

        {/* Name label */}
        {name && (
          <text x={0} y={22} textAnchor="middle"
            fontFamily="var(--font-mono)" fontSize={8}
            fill="var(--compass-gold)" fontWeight={600}>
            {name.split(' ')[0]}
          </text>
        )}
      </g>
    </g>
  );
}
```

**Step 5: Create FogOverlay.jsx**

```javascript
// src/components/map/FogOverlay.jsx
export default function FogOverlay({ cx, cy, radius, clearing }) {
  return (
    <g>
      <defs>
        <radialGradient id={`fog-${cx}-${cy}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--parchment)" stopOpacity={clearing ? 0 : 0.85} />
          <stop offset="70%" stopColor="var(--parchment)" stopOpacity={clearing ? 0 : 0.6} />
          <stop offset="100%" stopColor="var(--parchment)" stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={radius}
        fill={`url(#fog-${cx}-${cy})`}
        style={{ transition: 'opacity 1.5s ease', opacity: clearing ? 0 : 1 }}
        pointerEvents="none"
      />
    </g>
  );
}
```

**Step 6: Create TreasureMap.jsx — the main orchestrator**

```javascript
// src/components/map/TreasureMap.jsx
import { useMemo } from 'react';
import MapLandmark from './MapLandmark';
import MapPath from './MapPath';
import ExplorerToken from './ExplorerToken';
import FogOverlay from './FogOverlay';

const NODE_SPACING = 140;
const SVG_WIDTH = 400;
const SVG_CENTER_X = SVG_WIDTH / 2;
const OFFSETS = [-50, 50, 0, -50, 50];
const NODE_RADIUS = 28;

function getNodeX(i) { return SVG_CENTER_X + OFFSETS[i % OFFSETS.length]; }
function getNodeY(i) { return 70 + i * NODE_SPACING; }

export default function TreasureMap({
  stages = [],
  landmarks = [],
  activeCard,
  onNodeClick,
  studentName,
  studentEmoji,
  groupMembers = [],
  recentlyCompleted,
}) {
  const landmarkMap = useMemo(() => {
    const m = {};
    landmarks.forEach(l => { m[l.stage_id || l.stage_number] = l; });
    return m;
  }, [landmarks]);

  const svgHeight = stages.length * NODE_SPACING + 100;
  const activeStageIndex = stages.findIndex(s => s.status === 'active');

  return (
    <svg width={SVG_WIDTH} height={svgHeight} viewBox={`0 0 ${SVG_WIDTH} ${svgHeight}`}
      style={{ overflow: 'visible', maxWidth: '100%' }}>

      {/* Parchment background texture */}
      <defs>
        <filter id="paper-texture">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise" />
          <feDiffuseLighting in="noise" lightingColor="var(--parchment)" surfaceScale="1.5" result="light">
            <feDistantLight azimuth="45" elevation="55" />
          </feDiffuseLighting>
          <feComposite in="SourceGraphic" in2="light" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" />
        </filter>
      </defs>

      {/* Paths between nodes */}
      {stages.map((stage, i) => {
        if (i === 0) return null;
        const prev = stages[i - 1];
        return (
          <MapPath
            key={`path-${i}`}
            x1={getNodeX(i - 1)} y1={getNodeY(i - 1) + NODE_RADIUS}
            x2={getNodeX(i)} y2={getNodeY(i) - NODE_RADIUS}
            status={prev.status === 'completed' ? 'completed' : 'locked'}
            animated={recentlyCompleted === prev.id}
          />
        );
      })}

      {/* Fog overlays for locked stages */}
      {stages.map((stage, i) => (
        stage.status === 'locked' && (
          <FogOverlay
            key={`fog-${stage.id}`}
            cx={getNodeX(i)} cy={getNodeY(i)}
            radius={60}
            clearing={false}
          />
        )
      ))}

      {/* Landmark nodes */}
      {stages.map((stage, i) => (
        <MapLandmark
          key={stage.id}
          cx={getNodeX(i)} cy={getNodeY(i)}
          stage={stage}
          landmark={landmarkMap[stage.id] || landmarkMap[stage.stage_number]}
          isSelected={activeCard === stage.id}
          isActive={stage.status === 'active'}
          onClick={() => onNodeClick?.(stage.id)}
        />
      ))}

      {/* Explorer token on active stage */}
      {activeStageIndex >= 0 && (
        <ExplorerToken
          cx={getNodeX(activeStageIndex) + NODE_RADIUS + 20}
          cy={getNodeY(activeStageIndex)}
          emoji={studentEmoji}
          name={studentName}
        />
      )}

      {/* Group member tokens */}
      {groupMembers.map((member, idx) => {
        const memberStageIdx = stages.findIndex(s => s.id === member.current_stage_id) ?? activeStageIndex;
        if (memberStageIdx < 0) return null;
        return (
          <ExplorerToken
            key={member.student_id}
            cx={getNodeX(memberStageIdx) - NODE_RADIUS - 20 - (idx * 18)}
            cy={getNodeY(memberStageIdx) + 8}
            emoji={member.avatar_emoji}
            name={member.name}
          />
        );
      })}
    </svg>
  );
}
```

**Step 7: Commit**
```bash
git add src/components/map/
git commit -m "feat: create TreasureMap SVG components (landmarks, paths, explorer token, fog)"
```

---

### Task 8: Interactive Stage Components

**Files:**
- Create: `src/components/stages/PuzzleGate.jsx`
- Create: `src/components/stages/ChoiceFork.jsx`
- Create: `src/components/stages/EvidenceBoard.jsx`

**Step 1: Create stages directory**

```bash
mkdir -p src/components/stages
```

**Step 2: Create PuzzleGate.jsx**

```javascript
// src/components/stages/PuzzleGate.jsx
import { useState, useCallback } from 'react';
import { CheckCircle, XCircle, GripVertical, ArrowRight } from 'lucide-react';

export default function PuzzleGate({ config, onComplete }) {
  const { puzzle_type, instruction, categories, items } = config;
  const [placements, setPlacements] = useState({});
  const [dragItem, setDragItem] = useState(null);
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState(null);

  const unplaced = items.filter(item => !placements[item.text]);

  const handleDrop = useCallback((category) => {
    if (!dragItem) return;
    setPlacements(prev => ({ ...prev, [dragItem]: category }));
    setDragItem(null);
  }, [dragItem]);

  const handleCheck = () => {
    const res = items.map(item => ({
      text: item.text,
      placed: placements[item.text] || null,
      correct: puzzle_type === 'sequence'
        ? parseInt(placements[item.text]) === item.correct_position
        : placements[item.text] === item.correct_category,
    }));
    setResults(res);
    setChecked(true);

    const allCorrect = res.every(r => r.correct);
    if (allCorrect) {
      setTimeout(() => onComplete?.(true), 800);
    }
  };

  const handleReset = () => {
    setPlacements({});
    setChecked(false);
    setResults(null);
  };

  const allPlaced = unplaced.length === 0;
  const allCorrect = results?.every(r => r.correct);

  return (
    <div style={{ padding: 16 }}>
      <div style={{
        background: 'var(--parchment)', borderRadius: 12, padding: 20,
        border: '1px solid var(--pencil)',
      }}>
        {/* Instruction */}
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: 18,
          color: 'var(--ink)', marginBottom: 16,
        }}>
          {instruction || 'Sort the items into the correct categories.'}
        </p>

        {/* Unplaced items */}
        {unplaced.length > 0 && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20,
            padding: 12, background: 'var(--chalk)', borderRadius: 8,
            border: '1px dashed var(--pencil)',
          }}>
            {unplaced.map(item => (
              <div key={item.text}
                draggable
                onDragStart={() => setDragItem(item.text)}
                style={{
                  padding: '6px 12px', background: 'var(--lab-blue)', color: 'var(--chalk)',
                  borderRadius: 6, fontSize: 13, fontFamily: 'var(--font-body)',
                  cursor: 'grab', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                <GripVertical size={12} />
                {item.text}
              </div>
            ))}
          </div>
        )}

        {/* Category drop zones */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${categories?.length || 2}, 1fr)`, gap: 12 }}>
          {(categories || []).map(cat => {
            const catItems = items.filter(i => placements[i.text] === cat);
            return (
              <div key={cat}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(cat)}
                style={{
                  border: `2px dashed ${dragItem ? 'var(--compass-gold)' : 'var(--pencil)'}`,
                  borderRadius: 10, padding: 12, minHeight: 100,
                  background: dragItem ? 'rgba(184, 134, 11, 0.05)' : 'transparent',
                  transition: 'all 200ms',
                }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--graphite)',
                  marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1,
                }}>
                  {cat}
                </div>
                {catItems.map(item => {
                  const result = results?.find(r => r.text === item.text);
                  return (
                    <div key={item.text} style={{
                      padding: '5px 10px', marginBottom: 4, borderRadius: 5, fontSize: 13,
                      fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 6,
                      background: result ? (result.correct ? '#d4edda' : '#f8d7da') : 'var(--parchment)',
                      cursor: !checked ? 'grab' : 'default',
                    }}
                    draggable={!checked}
                    onDragStart={() => !checked && setDragItem(item.text)}>
                      {result && (result.correct
                        ? <CheckCircle size={14} color="var(--field-green)" />
                        : <XCircle size={14} color="var(--specimen-red)" />
                      )}
                      {item.text}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {checked && !allCorrect && (
            <button onClick={handleReset} className="btn btn-ghost" style={{ fontSize: 13 }}>
              Try Again
            </button>
          )}
          {!checked && allPlaced && (
            <button onClick={handleCheck} className="btn btn-primary" style={{ fontSize: 13 }}>
              Check <ArrowRight size={14} />
            </button>
          )}
          {checked && allCorrect && (
            <div style={{
              color: 'var(--field-green)', fontFamily: 'var(--font-display)',
              fontSize: 16, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <CheckCircle size={18} /> Puzzle solved!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Create ChoiceFork.jsx**

```javascript
// src/components/stages/ChoiceFork.jsx
import { useState } from 'react';
import { GitFork, ArrowRight, Sparkles } from 'lucide-react';

export default function ChoiceFork({ config, onChoose }) {
  const { prompt, choices } = config;
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    setConfirmed(true);
    setTimeout(() => onChoose?.(selected), 600);
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{
        background: 'linear-gradient(135deg, var(--parchment) 0%, #EDE8DC 100%)',
        borderRadius: 12, padding: 24, border: '1px solid var(--pencil)',
      }}>
        {/* Fork icon */}
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <GitFork size={28} color="var(--compass-gold)" />
        </div>

        {/* Prompt */}
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink)',
          textAlign: 'center', marginBottom: 24, lineHeight: 1.4,
        }}>
          {prompt}
        </p>

        {/* Choices */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(choices || []).map((choice, idx) => (
            <button key={idx}
              onClick={() => !confirmed && setSelected(idx)}
              disabled={confirmed}
              style={{
                padding: 16, borderRadius: 10, border: '2px solid',
                borderColor: selected === idx ? 'var(--compass-gold)' : 'var(--pencil)',
                background: selected === idx ? 'rgba(184, 134, 11, 0.08)' : 'var(--chalk)',
                textAlign: 'left', cursor: confirmed ? 'default' : 'pointer',
                transition: 'all 200ms', opacity: confirmed && selected !== idx ? 0.4 : 1,
              }}>
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--ink)',
                fontWeight: 600, marginBottom: 4,
              }}>
                {choice.label}
              </div>
              {choice.description && (
                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--graphite)',
                }}>
                  {choice.description}
                </div>
              )}
              {choice.difficulty === 'stretch' && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  marginTop: 6, fontSize: 10, fontFamily: 'var(--font-mono)',
                  color: 'var(--compass-gold)', textTransform: 'uppercase',
                }}>
                  <Sparkles size={10} /> Stretch path
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Confirm */}
        {selected !== null && !confirmed && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={handleConfirm} className="btn btn-primary" style={{ fontSize: 14 }}>
              Choose this path <ArrowRight size={14} />
            </button>
          </div>
        )}

        {confirmed && (
          <div style={{
            textAlign: 'center', marginTop: 16, color: 'var(--compass-gold)',
            fontFamily: 'var(--font-display)', fontSize: 16,
          }}>
            Path chosen. The adventure continues...
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 4: Create EvidenceBoard.jsx**

```javascript
// src/components/stages/EvidenceBoard.jsx
import { useState, useCallback } from 'react';
import { FileText, Quote, BarChart3, Image, GripVertical, Send } from 'lucide-react';

const CLUE_ICONS = {
  fact: FileText,
  quote: Quote,
  data: BarChart3,
  image_desc: Image,
};

export default function EvidenceBoard({ config, onComplete }) {
  const { prompt, clue_cards, board_zones } = config;
  const [placements, setPlacements] = useState({});
  const [dragClue, setDragClue] = useState(null);
  const [argument, setArgument] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const unplaced = (clue_cards || []).filter(c => !placements[c.id]);
  const allPlaced = unplaced.length === 0;

  const handleDrop = useCallback((zone) => {
    if (!dragClue) return;
    setPlacements(prev => ({ ...prev, [dragClue]: zone }));
    setDragClue(null);
  }, [dragClue]);

  const handleSubmit = () => {
    setSubmitted(true);
    onComplete?.({ placements, argument });
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{
        background: '#2C2C2C', borderRadius: 12, padding: 20,
        border: '1px solid #444', color: '#E8E8E8',
      }}>
        {/* Detective header */}
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: 18, color: '#F5E6C8',
          marginBottom: 4,
        }}>
          Evidence Board
        </p>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 14, color: '#B0B0B0',
          marginBottom: 20,
        }}>
          {prompt}
        </p>

        {/* Unplaced clue cards */}
        {unplaced.length > 0 && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20,
            padding: 12, background: '#1A1A1A', borderRadius: 8,
            border: '1px dashed #555',
          }}>
            <div style={{
              width: '100%', fontSize: 10, fontFamily: 'var(--font-mono)',
              color: '#888', textTransform: 'uppercase', marginBottom: 4,
            }}>
              Clues ({unplaced.length} remaining)
            </div>
            {unplaced.map(clue => {
              const Icon = CLUE_ICONS[clue.type] || FileText;
              return (
                <div key={clue.id}
                  draggable
                  onDragStart={() => setDragClue(clue.id)}
                  style={{
                    padding: '8px 12px', background: '#3A3A3A', borderRadius: 6,
                    border: '1px solid #555', cursor: 'grab', maxWidth: 200,
                  }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4,
                  }}>
                    <GripVertical size={10} color="#888" />
                    <Icon size={12} color="#F5E6C8" />
                    <span style={{ fontSize: 10, color: '#888', fontFamily: 'var(--font-mono)' }}>
                      {clue.type}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.4 }}>{clue.text}</div>
                  {clue.source && (
                    <div style={{ fontSize: 9, color: '#888', marginTop: 4, fontStyle: 'italic' }}>
                      Source: {clue.source}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Board zones */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${board_zones?.length || 3}, 1fr)`, gap: 10 }}>
          {(board_zones || []).map(zone => {
            const zoneClues = clue_cards.filter(c => placements[c.id] === zone);
            return (
              <div key={zone}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(zone)}
                style={{
                  border: `2px dashed ${dragClue ? '#F5E6C8' : '#555'}`,
                  borderRadius: 10, padding: 10, minHeight: 120,
                  background: dragClue ? 'rgba(245,230,200,0.05)' : 'transparent',
                  transition: 'all 200ms',
                }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, color: '#F5E6C8',
                  marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1,
                  borderBottom: '1px solid #444', paddingBottom: 4,
                }}>
                  {zone}
                </div>
                {zoneClues.map(clue => (
                  <div key={clue.id} style={{
                    padding: '6px 8px', marginBottom: 4, borderRadius: 4,
                    background: '#3A3A3A', fontSize: 11, lineHeight: 1.3,
                    border: '1px solid #555',
                  }}>
                    {clue.text}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Argument text area */}
        {allPlaced && !submitted && (
          <div style={{ marginTop: 16 }}>
            <label style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, color: '#F5E6C8',
              textTransform: 'uppercase', display: 'block', marginBottom: 6,
            }}>
              Make your case:
            </label>
            <textarea
              value={argument}
              onChange={(e) => setArgument(e.target.value)}
              placeholder="Using the evidence you've gathered, write your argument..."
              style={{
                width: '100%', minHeight: 80, padding: 12, borderRadius: 8,
                background: '#1A1A1A', border: '1px solid #555', color: '#E8E8E8',
                fontFamily: 'var(--font-body)', fontSize: 13, resize: 'vertical',
              }}
            />
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <button onClick={handleSubmit}
                disabled={!argument.trim()}
                className="btn btn-primary" style={{ fontSize: 13 }}>
                Submit Evidence <Send size={13} />
              </button>
            </div>
          </div>
        )}

        {submitted && (
          <div style={{
            textAlign: 'center', marginTop: 16, color: '#F5E6C8',
            fontFamily: 'var(--font-display)', fontSize: 16,
          }}>
            Case submitted. The evidence speaks for itself.
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 5: Commit**
```bash
git add src/components/stages/
git commit -m "feat: create interactive stage components (PuzzleGate, ChoiceFork, EvidenceBoard)"
```

---

### Task 9: XP Display Components

**Files:**
- Create: `src/components/xp/ExplorerRankBadge.jsx`
- Create: `src/components/xp/XPBar.jsx`
- Create: `src/components/xp/BadgeGrid.jsx`
- Create: `src/components/xp/XPToast.jsx`

**Step 1: Create xp directory**

```bash
mkdir -p src/components/xp
```

**Step 2: Create ExplorerRankBadge.jsx**

```javascript
// src/components/xp/ExplorerRankBadge.jsx
import { Compass, Binoculars, Map, Flame, Telescope, Crown } from 'lucide-react';

const RANK_CONFIG = {
  apprentice: { icon: Compass, label: 'Apprentice', color: 'var(--pencil)' },
  scout: { icon: Binoculars, label: 'Scout', color: 'var(--field-green)' },
  pathfinder: { icon: Map, label: 'Pathfinder', color: 'var(--lab-blue)' },
  trailblazer: { icon: Flame, label: 'Trailblazer', color: 'var(--compass-gold)' },
  navigator: { icon: Telescope, label: 'Navigator', color: 'var(--specimen-red)' },
  expedition_leader: { icon: Crown, label: 'Expedition Leader', color: '#7C3AED' },
};

export default function ExplorerRankBadge({ rank = 'apprentice', size = 'md', showLabel = true }) {
  const config = RANK_CONFIG[rank] || RANK_CONFIG.apprentice;
  const Icon = config.icon;
  const sizes = { sm: { icon: 14, font: 10, pad: '3px 8px' }, md: { icon: 18, font: 12, pad: '5px 12px' }, lg: { icon: 24, font: 14, pad: '8px 16px' } };
  const s = sizes[size] || sizes.md;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: s.pad, borderRadius: 20,
      background: `${config.color}15`, border: `1.5px solid ${config.color}40`,
      fontFamily: 'var(--font-mono)', fontSize: s.font, color: config.color,
      fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
    }}>
      <Icon size={s.icon} />
      {showLabel && config.label}
    </span>
  );
}

export { RANK_CONFIG };
```

**Step 3: Create XPBar.jsx**

```javascript
// src/components/xp/XPBar.jsx
import { RANK_CONFIG } from './ExplorerRankBadge';

const RANK_THRESHOLDS = [
  { rank: 'apprentice', min: 0 },
  { rank: 'scout', min: 200 },
  { rank: 'pathfinder', min: 600 },
  { rank: 'trailblazer', min: 1500 },
  { rank: 'navigator', min: 3000 },
  { rank: 'expedition_leader', min: 6000 },
];

export default function XPBar({ totalPoints = 0, currentRank = 'apprentice' }) {
  const currentIdx = RANK_THRESHOLDS.findIndex(r => r.rank === currentRank);
  const nextRank = currentIdx < RANK_THRESHOLDS.length - 1 ? RANK_THRESHOLDS[currentIdx + 1] : null;
  const currentMin = RANK_THRESHOLDS[currentIdx]?.min || 0;
  const nextMin = nextRank?.min || currentMin;
  const progress = nextRank ? ((totalPoints - currentMin) / (nextMin - currentMin)) * 100 : 100;
  const config = RANK_CONFIG[currentRank] || RANK_CONFIG.apprentice;

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 4,
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--graphite)',
        }}>
          {totalPoints} EP
        </span>
        {nextRank && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--pencil)',
          }}>
            {nextMin - totalPoints} to {RANK_CONFIG[nextRank.rank]?.label}
          </span>
        )}
      </div>
      <div style={{
        height: 6, borderRadius: 3, background: 'var(--parchment)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: 3,
          background: config.color,
          width: `${Math.min(100, Math.max(0, progress))}%`,
          transition: 'width 600ms ease',
        }} />
      </div>
    </div>
  );
}
```

**Step 4: Create BadgeGrid.jsx**

```javascript
// src/components/xp/BadgeGrid.jsx
import {
  Compass, Anchor, Flame, Map as MapIcon, Zap, Mountain,
  Telescope, Flag, PenTool, Crown
} from 'lucide-react';

const BADGE_ICONS = {
  compass: Compass, anchor: Anchor, flame: Flame, map: MapIcon,
  zap: Zap, mountain: Mountain, telescope: Telescope, flag: Flag,
  'pen-tool': PenTool, crown: Crown,
};

export default function BadgeGrid({ earnedBadges = [], allBadges = [] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {allBadges.map(badge => {
        const earned = earnedBadges.some(eb => (eb.badges?.slug || eb.badge_slug) === badge.slug);
        const Icon = BADGE_ICONS[badge.icon] || Compass;

        return (
          <div key={badge.slug} title={earned ? `${badge.name}: ${badge.description}` : badge.name}
            style={{
              width: 56, height: 56, borderRadius: 12,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: earned ? 'var(--compass-gold)10' : 'var(--parchment)',
              border: `1.5px solid ${earned ? 'var(--compass-gold)' : 'var(--pencil)40'}`,
              opacity: earned ? 1 : 0.35,
              transition: 'all 300ms',
            }}>
            <Icon size={20} color={earned ? 'var(--compass-gold)' : 'var(--pencil)'} />
            <span style={{
              fontSize: 7, fontFamily: 'var(--font-mono)', color: earned ? 'var(--ink)' : 'var(--pencil)',
              marginTop: 2, textAlign: 'center', lineHeight: 1.1, maxWidth: 50,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {badge.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

**Step 5: Create XPToast.jsx**

```javascript
// src/components/xp/XPToast.jsx
import { useState, useEffect } from 'react';
import { Star, TrendingUp } from 'lucide-react';
import ExplorerRankBadge from './ExplorerRankBadge';

export default function XPToast({ points, eventType, rankUp, newRank, badgeEarned, onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDone?.(), 300);
    }, rankUp ? 4000 : 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 9999,
      transform: visible ? 'translateX(0)' : 'translateX(120%)',
      opacity: visible ? 1 : 0,
      transition: 'all 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    }}>
      <div style={{
        background: 'var(--ink)', color: 'var(--chalk)', borderRadius: 12,
        padding: '12px 20px', minWidth: 200,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {/* XP earned line */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontFamily: 'var(--font-mono)', fontSize: 14,
        }}>
          <Star size={16} color="var(--compass-gold)" fill="var(--compass-gold)" />
          <span style={{ color: 'var(--compass-gold)', fontWeight: 700 }}>+{points} EP</span>
        </div>

        {/* Rank up */}
        {rankUp && newRank && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontFamily: 'var(--font-body)', fontSize: 13,
          }}>
            <TrendingUp size={14} color="var(--field-green)" />
            <span>Rank up!</span>
            <ExplorerRankBadge rank={newRank} size="sm" />
          </div>
        )}

        {/* Badge earned */}
        {badgeEarned && (
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--compass-gold)',
          }}>
            Badge earned: {badgeEarned}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 6: Commit**
```bash
git add src/components/xp/
git commit -m "feat: create XP display components (rank badge, XP bar, badge grid, toast)"
```

---

### Task 10: Wire XP into StudentQuestPage

**Files:**
- Modify: `src/pages/student/StudentQuestPage.jsx`

**Step 1: Read relevant sections of StudentQuestPage.jsx**

Read lines 2138-2180 (imports and top-level state) and lines 2395-2420 (completeStage callback).

**Step 2: Add imports**

At the top of the file, add:
```javascript
import { xp, badgesApi, landmarks as landmarksApi } from '../../lib/api';
import TreasureMap from '../../components/map/TreasureMap';
import XPToast from '../../components/xp/XPToast';
import XPBar from '../../components/xp/XPBar';
import ExplorerRankBadge from '../../components/xp/ExplorerRankBadge';
import PuzzleGate from '../../components/stages/PuzzleGate';
import ChoiceFork from '../../components/stages/ChoiceFork';
import EvidenceBoard from '../../components/stages/EvidenceBoard';
```

**Step 3: Add XP state variables**

In the main `StudentQuestPage` component, add after existing state declarations:
```javascript
// XP & Gamification state
const [xpData, setXpData] = useState({ total_points: 0, current_rank: 'apprentice', current_streak: 0 });
const [xpToast, setXpToast] = useState(null);
const [mapLandmarks, setMapLandmarks] = useState([]);
```

**Step 4: Load XP data on student identification**

Add a useEffect after the existing student profile loading effect:
```javascript
useEffect(() => {
  if (!studentProfile?.id) return;
  xp.getStudentXP(studentProfile.id).then(setXpData);
  // Load landmarks for this quest
  if (quest?.id) {
    landmarksApi.getForQuest(quest.id).then(setMapLandmarks);
  }
}, [studentProfile?.id, quest?.id]);
```

**Step 5: Award XP on stage completion**

In the `completeStage` callback (or `handleSubmitComplete`), add after the existing completion logic:
```javascript
// Award XP
if (studentProfile?.id) {
  const result = await xp.award(studentProfile.id, 'stage_complete', quest.id, stageId);
  if (result) {
    setXpData(prev => ({ ...prev, total_points: result.total_points, current_rank: result.new_rank, current_streak: result.current_streak }));
    setXpToast({ points: xp.EP_VALUES.stage_complete, rankUp: result.rank_changed, newRank: result.new_rank });

    // Check for new badges
    const newBadges = await badgesApi.checkAndAward(studentProfile.id);
    if (newBadges.length > 0) {
      setXpToast(prev => ({ ...prev, badgeEarned: newBadges[0].badges?.name }));
    }
  }
}
```

**Step 6: Award XP for challenger responses**

In the `onChallengerRespond` handler, add:
```javascript
if (studentProfile?.id) {
  const result = await xp.award(studentProfile.id, 'challenger_response', quest?.id, activeCard);
  if (result) {
    setXpData(prev => ({ ...prev, total_points: result.total_points, current_rank: result.new_rank }));
    setXpToast({ points: xp.EP_VALUES.challenger_response });
  }
}
```

**Step 7: Add XP bar + rank badge to the page header**

In the render, after the student name/view badge area, add:
```jsx
{xpData && (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
    <ExplorerRankBadge rank={xpData.current_rank} size="sm" />
    <div style={{ width: 120 }}>
      <XPBar totalPoints={xpData.total_points} currentRank={xpData.current_rank} />
    </div>
  </div>
)}
```

**Step 8: Add XP toast render**

At the bottom of the component return, before the closing `</div>`:
```jsx
{xpToast && (
  <XPToast
    points={xpToast.points}
    rankUp={xpToast.rankUp}
    newRank={xpToast.newRank}
    badgeEarned={xpToast.badgeEarned}
    onDone={() => setXpToast(null)}
  />
)}
```

**Step 9: Replace JourneyMap with TreasureMap**

Find the existing `<JourneyMap>` usage and replace with:
```jsx
<TreasureMap
  stages={stages}
  landmarks={mapLandmarks}
  activeCard={activeCard}
  onNodeClick={handleNodeClick}
  studentName={studentName}
  studentEmoji={studentProfile?.avatar_emoji}
  recentlyCompleted={confetti ? activeCard : null}
/>
```

**Step 10: Commit**
```bash
git add src/pages/student/StudentQuestPage.jsx
git commit -m "feat: wire XP system, treasure map, and interactive stages into StudentQuestPage"
```

---

### Task 11: Wire Interactive Stage Types into StageCard

**Files:**
- Modify: `src/pages/student/StudentQuestPage.jsx`

**Step 1: Read StageCard component**

Read lines 1325-1811 to understand the current render flow.

**Step 2: Add interactive stage rendering**

Inside StageCard, after the description/guiding questions section but before the SubmissionPanel, add conditional rendering for interactive types:

```jsx
{/* Interactive stage types */}
{stage.stage_type === 'puzzle_gate' && interactiveData && (
  <PuzzleGate
    config={interactiveData.config}
    onComplete={(success) => {
      if (success) {
        // Auto-submit a "puzzle completed" submission
        onComplete?.(stage.id);
      }
    }}
  />
)}

{stage.stage_type === 'choice_fork' && interactiveData && (
  <ChoiceFork
    config={interactiveData.config}
    onChoose={(choiceIdx) => {
      // Record the choice as a submission, handle branching
      onComplete?.(stage.id, { choice: choiceIdx });
    }}
  />
)}

{stage.stage_type === 'evidence_board' && interactiveData && (
  <EvidenceBoard
    config={interactiveData.config}
    onComplete={(result) => {
      // Submit the evidence board result
      onComplete?.(stage.id, { evidence: result });
    }}
  />
)}
```

**Step 3: Load interactive data for active stage**

Add a useEffect in the main component that loads interactive data when activeCard changes:

```javascript
const [interactiveData, setInteractiveData] = useState(null);

useEffect(() => {
  if (!activeCard) { setInteractiveData(null); return; }
  const activeStage = stages.find(s => s.id === activeCard);
  if (['puzzle_gate', 'choice_fork', 'evidence_board'].includes(activeStage?.stage_type)) {
    interactiveStages.get(activeCard).then(setInteractiveData);
  } else {
    setInteractiveData(null);
  }
}, [activeCard, stages]);
```

**Step 4: Pass interactiveData to StageCard**

Add `interactiveData={interactiveData}` to the StageCard props.

**Step 5: Commit**
```bash
git add src/pages/student/StudentQuestPage.jsx
git commit -m "feat: render interactive stage types (puzzle, choice fork, evidence board) in StageCard"
```

---

### Task 12: Narrative Hooks & Stage Narration

**Files:**
- Modify: `src/pages/student/StudentQuestPage.jsx` (StageCard component)

**Step 1: Add narrative hook display**

At the top of StageCard's active content section (after the header, before description), add:

```jsx
{/* Narrative hook from landmark */}
{landmark?.narrative_hook && stage.status !== 'locked' && (
  <div style={{
    padding: '12px 16px', marginBottom: 16, borderRadius: 8,
    background: 'linear-gradient(135deg, var(--parchment) 0%, #EDE8DC 100%)',
    borderLeft: '3px solid var(--compass-gold)',
    fontFamily: 'var(--font-display)', fontSize: 15, fontStyle: 'italic',
    color: 'var(--ink)', lineHeight: 1.5,
  }}>
    {landmark.narrative_hook}
  </div>
)}
```

**Step 2: Pass landmark to StageCard**

In the main component, find the landmark for the active stage and pass it:
```javascript
const activeLandmark = mapLandmarks.find(l => l.stage_id === activeCard);
```
Then: `<StageCard landmark={activeLandmark} ... />`

**Step 3: Commit**
```bash
git add src/pages/student/StudentQuestPage.jsx
git commit -m "feat: display narrative hooks from landmarks in stage cards"
```

---

### Task 13: Optional Sound System

**Files:**
- Create: `src/hooks/useAmbientSound.js`
- Modify: `src/pages/student/StudentQuestPage.jsx`

**Step 1: Create useAmbientSound hook**

```javascript
// src/hooks/useAmbientSound.js
import { useState, useEffect, useRef, useCallback } from 'react';

// Simple ambient sounds using Web Audio API oscillators and noise
const SOUND_CONFIGS = {
  campfire: { type: 'crackle', baseFreq: 200, volume: 0.08 },
  ocean: { type: 'wave', baseFreq: 100, volume: 0.06 },
  wind: { type: 'noise', baseFreq: 400, volume: 0.04 },
  rain: { type: 'noise', baseFreq: 800, volume: 0.05 },
  birds: { type: 'chirp', baseFreq: 2000, volume: 0.03 },
  cave_drip: { type: 'drip', baseFreq: 600, volume: 0.04 },
  river: { type: 'wave', baseFreq: 150, volume: 0.05 },
};

export default function useAmbientSound() {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem('wayfinder_ambient_sound') === 'true'; }
    catch { return false; }
  });
  const [currentSound, setCurrentSound] = useState(null);
  const ctxRef = useRef(null);
  const nodesRef = useRef([]);

  const stop = useCallback(() => {
    nodesRef.current.forEach(node => {
      try { node.disconnect(); } catch {}
    });
    nodesRef.current = [];
    setCurrentSound(null);
  }, []);

  const play = useCallback((soundType) => {
    if (!enabled || !soundType || !SOUND_CONFIGS[soundType]) return;
    stop();

    try {
      if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = ctxRef.current;
      const config = SOUND_CONFIGS[soundType];
      const gain = ctx.createGain();
      gain.gain.value = config.volume;
      gain.connect(ctx.destination);

      // Simple noise generator
      const bufferSize = 2 * ctx.sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      // Bandpass filter for character
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = config.baseFreq;
      filter.Q.value = 0.5;

      noise.connect(filter);
      filter.connect(gain);
      noise.start();

      nodesRef.current = [noise, filter, gain];
      setCurrentSound(soundType);
    } catch (e) {
      console.warn('Ambient sound error:', e);
    }
  }, [enabled, stop]);

  const toggle = useCallback(() => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem('wayfinder_ambient_sound', String(next));
    if (!next) stop();
  }, [enabled, stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { enabled, toggle, play, stop, currentSound };
}
```

**Step 2: Wire into StudentQuestPage**

Add to imports:
```javascript
import useAmbientSound from '../../hooks/useAmbientSound';
```

In the main component:
```javascript
const { enabled: soundEnabled, toggle: toggleSound, play: playSound, stop: stopSound } = useAmbientSound();
```

When active stage changes, play its ambient sound:
```javascript
useEffect(() => {
  if (!activeCard) { stopSound(); return; }
  const landmark = mapLandmarks.find(l => l.stage_id === activeCard);
  if (landmark?.ambient_sound) {
    playSound(landmark.ambient_sound);
  } else {
    stopSound();
  }
}, [activeCard, mapLandmarks, soundEnabled]);
```

Add sound toggle button to the page header:
```jsx
<button onClick={toggleSound} className="btn btn-ghost"
  style={{ fontSize: 11, padding: '4px 10px' }}
  title={soundEnabled ? 'Mute ambient sound' : 'Enable ambient sound'}>
  {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
</button>
```

**Step 3: Commit**
```bash
git add src/hooks/useAmbientSound.js src/pages/student/StudentQuestPage.jsx
git commit -m "feat: add optional ambient sound system for treasure map stages"
```

---

### Task 14: Explorer Log & Social Feed on StudentHome

**Files:**
- Modify: `src/pages/student/StudentHome.jsx`
- Modify: `src/pages/student/StudentQuestPage.jsx`

**Step 1: Add explorer log event on project completion**

In StudentQuestPage, in the quest completion handler (where status is set to 'completed'), add:
```javascript
if (studentProfile?.id) {
  explorerLog.add(studentProfile.id, 'project_complete',
    `${studentName} completed "${quest.title}" and earned the rank of ${xpData.current_rank}!`
  );
}
```

**Step 2: Add explorer log event on rank up**

In the XP award handler, when rankUp is true:
```javascript
if (result.rank_changed) {
  explorerLog.add(studentProfile.id, 'rank_up',
    `${studentName} reached the rank of ${result.new_rank.replace('_', ' ')}!`
  );
}
```

**Step 3: Display Explorer Log on StudentHome**

Read StudentHome.jsx, then add an "Explorer Log" section below the quest cards:

```jsx
{/* Explorer Log */}
{logEntries.length > 0 && (
  <div style={{ marginTop: 32 }}>
    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 12 }}>
      Explorer Log
    </h3>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {logEntries.slice(0, 10).map(entry => (
        <div key={entry.id} style={{
          padding: '8px 14px', borderRadius: 8, background: 'var(--parchment)',
          fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--graphite)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>{entry.students?.avatar_emoji || '🧭'}</span>
          <span>{entry.message}</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--pencil)' }}>
            {new Date(entry.created_at).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  </div>
)}
```

Add the data loading:
```javascript
const [logEntries, setLogEntries] = useState([]);

useEffect(() => {
  if (schoolId) {
    explorerLog.getForSchool(schoolId, 20).then(setLogEntries);
  }
}, [schoolId]);
```

**Step 4: Commit**
```bash
git add src/pages/student/StudentHome.jsx src/pages/student/StudentQuestPage.jsx
git commit -m "feat: add Explorer Log social feed to StudentHome with XP events"
```

---

### Task 15: Update QuestBuilder to Generate Landmarks & Interactive Data

**Files:**
- Modify: `src/pages/QuestBuilder.jsx`

**Step 1: Read the QuestBuilder Step 4 (AI generation) and Step 5 (review)**

Read the generation logic and the save/publish flow.

**Step 2: After quest generation, generate and save landmarks**

In the quest generation handler (Step 4 loading state), after the quest stages are generated and saved to Supabase, add:

```javascript
// Generate landmarks for the treasure map
try {
  const landmarkData = await ai.generateLandmarks(generatedStages);
  if (landmarkData.length > 0) {
    const landmarkRows = landmarkData.map(l => {
      const matchingStage = savedStages.find(s => s.stage_number === l.stage_number);
      return matchingStage ? {
        stage_id: matchingStage.id,
        landmark_type: l.landmark_type,
        landmark_name: l.landmark_name,
        narrative_hook: l.narrative_hook,
        ambient_sound: l.ambient_sound || null,
      } : null;
    }).filter(Boolean);
    await landmarks.bulkUpsert(landmarkRows);
  }
} catch (e) {
  console.warn('Landmark generation failed (non-blocking):', e);
}

// Generate interactive data for special stage types
for (const stage of savedStages) {
  if (['puzzle_gate', 'choice_fork', 'evidence_board'].includes(stage.stage_type)) {
    try {
      const config = await ai.generateInteractiveData(stage, stage.stage_type);
      await interactiveStages.upsert(stage.id, stage.stage_type, config);
    } catch (e) {
      console.warn(`Interactive data generation failed for stage ${stage.stage_number}:`, e);
    }
  }
}
```

**Step 3: Commit**
```bash
git add src/pages/QuestBuilder.jsx
git commit -m "feat: generate landmarks and interactive stage data during quest creation"
```

---

### Task 16: Campfire Chat for Group Projects

**Files:**
- Create: `src/components/social/CampfireChat.jsx`
- Modify: `src/pages/student/StudentQuestPage.jsx`

**Step 1: Create CampfireChat component**

```javascript
// src/components/social/CampfireChat.jsx
import { useState, useEffect, useRef } from 'react';
import { Send, Flame } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function CampfireChat({ questId, stageId, studentName, studentId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!questId || !stageId) return;
    // Load messages
    supabase
      .from('guide_messages')
      .select('*')
      .eq('quest_id', questId)
      .eq('stage_id', stageId)
      .eq('message_type', 'campfire_chat')
      .order('created_at')
      .then(({ data }) => setMessages(data || []));
  }, [questId, stageId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const { data, error } = await supabase.from('guide_messages').insert({
      quest_id: questId, stage_id: stageId,
      student_id: studentId, student_name: studentName,
      role: 'user', content: input.trim(),
      message_type: 'campfire_chat',
    }).select().single();
    if (!error && data) setMessages(prev => [...prev, data]);
    setInput('');
    setSending(false);
  };

  return (
    <div style={{
      border: '1px solid var(--pencil)', borderRadius: 10, overflow: 'hidden',
      background: 'var(--chalk)',
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 12px', background: 'var(--parchment)',
        display: 'flex', alignItems: 'center', gap: 6,
        borderBottom: '1px solid var(--pencil)',
      }}>
        <Flame size={14} color="var(--compass-gold)" />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--graphite)' }}>
          Campfire Chat
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{
        height: 200, overflowY: 'auto', padding: 10,
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {messages.length === 0 && (
          <div style={{ color: 'var(--pencil)', fontSize: 12, textAlign: 'center', padding: 20 }}>
            Start a conversation with your team...
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.student_name === studentName;
          return (
            <div key={msg.id} style={{
              alignSelf: isMe ? 'flex-end' : 'flex-start',
              maxWidth: '75%',
            }}>
              {!isMe && (
                <div style={{ fontSize: 10, color: 'var(--graphite)', marginBottom: 2, fontFamily: 'var(--font-mono)' }}>
                  {msg.student_name}
                </div>
              )}
              <div style={{
                padding: '6px 10px', borderRadius: 8, fontSize: 13,
                fontFamily: 'var(--font-body)',
                background: isMe ? 'var(--lab-blue)' : 'var(--parchment)',
                color: isMe ? 'var(--chalk)' : 'var(--ink)',
              }}>
                {msg.content}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', gap: 6, padding: 8, borderTop: '1px solid var(--pencil)',
      }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Message your team..."
          style={{
            flex: 1, padding: '6px 10px', borderRadius: 6,
            border: '1px solid var(--pencil)', fontSize: 13,
            fontFamily: 'var(--font-body)',
          }}
        />
        <button onClick={handleSend} disabled={!input.trim() || sending}
          className="btn btn-primary" style={{ padding: '6px 10px' }}>
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Wire into StudentQuestPage AISidebar**

In the AISidebar component, add a Campfire Chat section when the quest is a group quest:

```jsx
{quest?.quest_type === 'group' && activeStage && (
  <div style={{ borderTop: '1px solid var(--pencil)', padding: 12 }}>
    <CampfireChat
      questId={quest.id}
      stageId={activeStage.id}
      studentName={studentName}
      studentId={studentProfile?.id}
    />
  </div>
)}
```

**Step 3: Commit**
```bash
git add src/components/social/CampfireChat.jsx src/pages/student/StudentQuestPage.jsx
git commit -m "feat: add Campfire Chat for group project collaboration"
```

---

### Task 17: Update QuestMap (Guide View) with TreasureMap

**Files:**
- Modify: `src/pages/QuestMap.jsx`

**Step 1: Read current JourneyMap usage in QuestMap**

Identify where the old SVG map is rendered.

**Step 2: Import and replace with TreasureMap**

Replace the existing JourneyMap with the new TreasureMap component. The guide view should show all landmarks without fog (guides see everything), but same visual style:

```javascript
import TreasureMap from '../components/map/TreasureMap';
```

Replace the `<JourneyMap>` component usage with:
```jsx
<TreasureMap
  stages={stages}
  landmarks={mapLandmarks}
  activeCard={activeCard}
  onNodeClick={handleNodeClick}
/>
```

Load landmarks:
```javascript
const [mapLandmarks, setMapLandmarks] = useState([]);
useEffect(() => {
  if (quest?.id) {
    landmarksApi.getForQuest(quest.id).then(setMapLandmarks);
  }
}, [quest?.id]);
```

Note: Keep the existing JourneyMap function in the file but unused — we can remove it in a cleanup pass after verifying the new map works.

**Step 3: Commit**
```bash
git add src/pages/QuestMap.jsx
git commit -m "feat: replace guide-view JourneyMap with TreasureMap component"
```

---

### Task 18: Integration Test & Verify

**Step 1: Run dev server**
```bash
cd "/Users/md/Quest Lab/quest-lab" && npm run dev
```

**Step 2: Verify terminology changes**
- Visit `/login` — confirm "project generation" not "curriculum"
- Visit `/signup` — same check
- Visit `/` (landing page) — check SVG says "PROJECT TYPE"

**Step 3: Test treasure map rendering**
- Create a new quest via QuestBuilder
- Open the quest in student view (`/q/:id`)
- Verify: Landmark nodes render, fog on locked stages, paths between nodes

**Step 4: Test XP system**
- Complete a stage as a student
- Verify: XP toast appears, XP bar updates, rank badge shows

**Step 5: Test interactive stages**
- If a generated quest includes puzzle_gate/choice_fork/evidence_board types, verify they render and are interactive

**Step 6: Final commit**
```bash
git add -A
git commit -m "feat: complete Phase 1 & 2 — terminology fixes, master prompt, treasure map system"
```

---

## Summary

| Task | Description | Files | Est. Size |
|------|-------------|-------|-----------|
| 1 | Fix "curriculum" text | 4 files | Small |
| 2 | Fix "quest" text | 4 files | Small |
| 3 | Master AI prompt | 1 file | Medium |
| 4 | XP & badge DB migration | 1 file | Large |
| 5 | XP/badge/landmark API layer | 1 file | Large |
| 6 | AI landmark + interactive generation | 1 file | Medium |
| 7 | TreasureMap SVG components | 5 files | Large |
| 8 | Interactive stage components | 3 files | Large |
| 9 | XP display components | 4 files | Medium |
| 10 | Wire XP into StudentQuestPage | 1 file | Large |
| 11 | Wire interactive stages into StageCard | 1 file | Medium |
| 12 | Narrative hooks display | 1 file | Small |
| 13 | Ambient sound system | 2 files | Medium |
| 14 | Explorer Log social feed | 2 files | Medium |
| 15 | QuestBuilder landmark generation | 1 file | Medium |
| 16 | Campfire Chat | 2 files | Medium |
| 17 | Guide view treasure map | 1 file | Small |
| 18 | Integration test | 0 files | Verification |

**Total: 18 tasks, ~35 files created or modified**
