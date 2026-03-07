# Layer 3: The Projects — Learner Experience Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add hands-on/digital project mode, invisible skill assessment via gamified "Expedition Challenges," conversational assessment in Field Guide, and guide-facing skill analytics — all without ever looking or feeling like school.

**Architecture:** Three parts built in order: (A) Project Mode toggle — simple QuestBuilder addition, (B) Expedition Challenges — the core gamified assessment system with themed challenge UI, AI generation, and silent skill capture, (C) Invisible Assessment Enhancement — deeper assessment woven into existing Field Guide chat and submission review, plus guide analytics.

**Tech Stack:** React + Vite, Supabase PostgreSQL, CSS custom properties + CSS animations, lucide-react icons, dual AI provider (Gemini/Anthropic)

**Design Principle: NEVER FEEL LIKE SCHOOL.** Students see expedition obstacles, puzzles, and Field Guide conversations. Guides see skill data, assessment evidence, and proficiency levels. The word "test," "quiz," "assessment," "grade," or "score" must NEVER appear in any student-facing UI or AI output. Students earn Explorer Points. Guides see skill maps.

---

## Part A: Project Mode Toggle (L3.1) — Tasks 1-2

### Task 1: Project Mode Migration + QuestBuilder Toggle

**Files:**
- Create: `supabase/migrations/027_layer3_challenges.sql`
- Modify: `src/pages/QuestBuilder.jsx`

**Step 1: Create migration**

This single migration covers all of Layer 3's database needs — project mode, expedition challenges, and skill assessments.

```sql
-- 027_layer3_challenges.sql
-- Layer 3: Project Mode, Expedition Challenges, Skill Assessments

-- ============================================================
-- PROJECT MODE — hands-on vs digital preference per quest
-- ============================================================
ALTER TABLE quests ADD COLUMN IF NOT EXISTS project_mode TEXT DEFAULT 'mixed'
  CHECK (project_mode IN ('hands_on', 'digital', 'mixed'));

-- ============================================================
-- EXPEDITION CHALLENGES — gamified knowledge checks per stage
-- ============================================================
-- These are quick obstacles at the start of a stage, themed to the
-- landmark. Students see a puzzle/challenge. Guides see skill data.
CREATE TABLE IF NOT EXISTS expedition_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES quest_stages(id) ON DELETE CASCADE,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN (
    'estimate',      -- "How many planks for a 15-foot bridge?"
    'pattern',       -- "What comes next: 2, 6, 18, __, 162?"
    'quick_write',   -- "In one sentence, what would happen if..."
    'classify',      -- "Sort these into the right expedition packs"
    'decode'         -- "The signal reads: ___ . What does it mean?"
  )),
  challenge_text TEXT NOT NULL,        -- The question/prompt, adventure-framed
  challenge_config JSONB DEFAULT '{}', -- Type-specific config (categories, pattern, etc.)
  target_skill_ids JSONB DEFAULT '[]', -- Which skills this secretly assesses
  ep_reward INTEGER DEFAULT 15,        -- Explorer Points for completion
  difficulty TEXT DEFAULT 'standard' CHECK (difficulty IN ('warmup', 'standard', 'stretch')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expedition_challenges_stage ON expedition_challenges(stage_id);

-- ============================================================
-- SKILL ASSESSMENTS — invisible assessment results
-- ============================================================
-- Every challenge response, submission review, and Field Guide
-- conversation that reveals skill data gets logged here.
-- Students NEVER see this table. Guides see aggregated results.
CREATE TABLE IF NOT EXISTS skill_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  skill_name TEXT NOT NULL,            -- Denormalized for display
  quest_id UUID REFERENCES quests(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES quest_stages(id) ON DELETE SET NULL,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN (
    'expedition_challenge',  -- From gamified challenge
    'submission_review',     -- From deliverable evaluation
    'conversation'           -- From Field Guide chat probing
  )),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 4),
    -- 1=emerging, 2=developing, 3=proficient, 4=advanced
    -- Students never see this number
  evidence TEXT,             -- What the student said/did that showed this
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_assessments_student ON skill_assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_skill_assessments_student_skill ON skill_assessments(student_id, skill_name);

-- ============================================================
-- CHALLENGE RESPONSES — student answers to expedition challenges
-- ============================================================
CREATE TABLE IF NOT EXISTS challenge_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES expedition_challenges(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  is_successful BOOLEAN DEFAULT false,
  ep_awarded INTEGER DEFAULT 0,
  ai_feedback TEXT,           -- Adventure-framed feedback ("The bridge holds!")
  assessed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(challenge_id, student_id)
);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- expedition_challenges: everyone reads, auth creates
ALTER TABLE expedition_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY expedition_challenges_read ON expedition_challenges FOR SELECT USING (true);
CREATE POLICY expedition_challenges_anon_insert ON expedition_challenges FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY expedition_challenges_auth_manage ON expedition_challenges FOR ALL TO authenticated USING (true);

-- skill_assessments: guides read their students, anon insert
ALTER TABLE skill_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY skill_assessments_guide_read ON skill_assessments FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM students WHERE guide_id = auth.uid()));
CREATE POLICY skill_assessments_anon_read ON skill_assessments FOR SELECT TO anon USING (true);
CREATE POLICY skill_assessments_anon_insert ON skill_assessments FOR INSERT TO anon WITH CHECK (true);

-- challenge_responses: student reads own, anon insert
ALTER TABLE challenge_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY challenge_responses_read ON challenge_responses FOR SELECT USING (true);
CREATE POLICY challenge_responses_anon_insert ON challenge_responses FOR INSERT TO anon WITH CHECK (true);
```

**Step 2: Add project mode toggle to QuestBuilder**

In `src/pages/QuestBuilder.jsx`:

a) Add state variable near other Step 4 state:
```javascript
const [projectMode, setProjectMode] = useState('mixed');
```

b) In the Step4AnythingElse component (after the useRealWorld checkbox, before the textarea), add a segmented control:

```jsx
{/* Project Mode */}
<div style={{ marginBottom: 20 }}>
  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
    Expedition Style
  </div>
  <div style={{ display: 'flex', gap: 0, border: '1px solid var(--pencil)', borderRadius: 8, overflow: 'hidden' }}>
    {[
      { value: 'hands_on', label: 'Hands-On', desc: 'Building, fieldwork, experiments' },
      { value: 'mixed', label: 'Mixed', desc: 'AI decides per stage' },
      { value: 'digital', label: 'Digital', desc: 'Research, writing, design' },
    ].map(opt => (
      <button key={opt.value} onClick={() => setProjectMode(opt.value)}
        style={{
          flex: 1, padding: '10px 8px', border: 'none', cursor: 'pointer',
          background: projectMode === opt.value ? 'var(--ink)' : 'var(--chalk)',
          color: projectMode === opt.value ? 'var(--chalk)' : 'var(--graphite)',
          fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
          borderRight: '1px solid var(--pencil)',
          transition: 'all 0.15s ease',
        }}>
        <div>{opt.label}</div>
        <div style={{ fontSize: 9, fontWeight: 400, marginTop: 2, opacity: 0.7 }}>{opt.desc}</div>
      </button>
    ))}
  </div>
</div>
```

c) Pass projectMode to the quest save — in the `saveQuest` function, add `project_mode: projectMode` to the quests insert object.

d) Pass projectMode to ai.generateQuest() call:
```javascript
const questData = await ai.generateQuest({
  students: selectedStudents,
  standards: standardsStr,
  pathway: pathwayLabels.length > 0 ? pathwayLabels.join(', ') : 'none',
  type: questType,
  count: selectedStudents.length,
  studentStandardsProfiles,
  additionalContext,
  useRealWorld,
  projectMode,
});
```

**Step 3: Commit**
```bash
git add supabase/migrations/027_layer3_challenges.sql src/pages/QuestBuilder.jsx
git commit -m "feat: add Layer 3 migration and project mode toggle in QuestBuilder"
```

---

### Task 2: Wire Project Mode into AI Generation

**Files:**
- Modify: `src/lib/api.js`

**Step 1: Update ai.generateQuest() to use projectMode**

In the `ai.generateQuest()` function, find where the user message is built (the template literal with student profiles, standards, etc.). Add after the `additionalContext` section and before the `useRealWorld` section:

```javascript
// Project mode instruction
const modeInstruction = projectMode && projectMode !== 'mixed' ? `
EXPEDITION STYLE: ${projectMode === 'hands_on' ? 'HANDS-ON' : 'DIGITAL'}
${projectMode === 'hands_on'
  ? '- Emphasize physical experiments, building, art, fieldwork, interviews, and real-world observation.\n- Deliverables should be tangible: models, prototypes, field journals, art pieces, interviews recorded.\n- Resources should include physical materials, tools, outdoor spaces.\n- Minimize screen time — if research is needed, keep it brief and purposeful.'
  : '- Emphasize research, writing, coding, digital design, data analysis, and presentations.\n- Deliverables should be digital: reports, websites, infographics, slide decks, code projects.\n- Resources should include software, websites, databases, digital tools.\n- Physical activities are fine as supplements but focus should be screen-based work.'}` : '';
```

Then append `modeInstruction` to the user message string (after additionalContext, before useRealWorld block).

**Step 2: Add expedition challenge generation instruction to stage schema**

In the same generateQuest() system prompt, extend the stage JSON schema to include an expedition_challenge field:

```javascript
// Add to the stage schema description in the system prompt:
"expedition_challenge": {
  "challenge_type": "estimate|pattern|quick_write|classify|decode",
  "challenge_text": "Adventure-framed challenge text. NEVER say 'quiz' or 'test'. Frame as expedition obstacle.",
  "challenge_config": {},
  "target_skills": ["skill names this secretly assesses"],
  "difficulty": "warmup|standard|stretch"
}
```

Add this instruction to the system prompt:

```
EXPEDITION CHALLENGES (one per stage, optional — include for 60-70% of stages):
Each stage may include an "expedition_challenge" — a quick obstacle the explorer must clear.
These MUST feel like part of the adventure, NEVER like a school quiz.
Good: "The bridge is damaged. Quick — how many 2.5-foot planks do you need for a 15-foot gap?"
Bad: "Calculate: 15 / 2.5 = ?"
Good: "The signal is garbled: 2, 6, 18, __, 162. Decode the missing number to proceed."
Bad: "What is the next number in this sequence?"
Good: "Your expedition packs are mixed up! Sort these items: [Solar, Coal, Wind, Oil] into Renewable and Non-Renewable."
Bad: "Classify the following energy sources."
The student should feel like an explorer solving a problem, not a student answering a question.

Challenge types:
- estimate: number input with tolerance (config: { answer: number, tolerance: number, unit: "string" })
- pattern: fill-in-the-blank (config: { answer: "string", hint: "string" })
- quick_write: 1-2 sentence response (config: { min_words: number })
- classify: drag items to categories (config: { categories: ["A","B"], items: [{ text: "X", correct: "A" }] })
- decode: interpret a message/code (config: { answer: "string", cipher_hint: "string" })
```

**Step 3: Commit**
```bash
git add src/lib/api.js
git commit -m "feat: wire project mode and expedition challenges into AI quest generation"
```

---

## Part B: Expedition Challenges — Gamified Assessment (L3.2a) — Tasks 3-7

### Task 3: Expedition Challenge API Layer

**Files:**
- Modify: `src/lib/api.js`

**Step 1: Add expedition challenges CRUD**

```javascript
// ===================== EXPEDITION CHALLENGES =====================

export const expeditionChallenges = {
  async getForStage(stageId) {
    const { data, error } = await supabase
      .from('expedition_challenges')
      .select('*')
      .eq('stage_id', stageId)
      .single();
    if (error) { console.error('Get challenge error:', error); return null; }
    return data;
  },

  async create(stageId, challenge) {
    const { data, error } = await supabase
      .from('expedition_challenges')
      .insert({ stage_id: stageId, ...challenge })
      .select()
      .single();
    if (error) { console.error('Create challenge error:', error); return null; }
    return data;
  },

  async bulkCreate(challenges) {
    const { data, error } = await supabase
      .from('expedition_challenges')
      .insert(challenges)
      .select();
    if (error) { console.error('Bulk create challenges error:', error); return []; }
    return data || [];
  },
};

export const challengeResponses = {
  async get(challengeId, studentId) {
    const { data, error } = await supabase
      .from('challenge_responses')
      .select('*')
      .eq('challenge_id', challengeId)
      .eq('student_id', studentId)
      .single();
    if (error) return null;
    return data;
  },

  async submit(response) {
    const { data, error } = await supabase
      .from('challenge_responses')
      .upsert(response, { onConflict: 'challenge_id,student_id' })
      .select()
      .single();
    if (error) { console.error('Submit response error:', error); return null; }
    return data;
  },
};

export const skillAssessments = {
  async getForStudent(studentId) {
    const { data, error } = await supabase
      .from('skill_assessments')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    if (error) { console.error('Get skill assessments error:', error); return []; }
    return data || [];
  },

  async getForStudentGrouped(studentId) {
    const { data, error } = await supabase
      .from('skill_assessments')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    if (error) return {};
    // Group by skill_name, return latest + all history
    const grouped = {};
    (data || []).forEach(a => {
      if (!grouped[a.skill_name]) grouped[a.skill_name] = { latest: a, history: [] };
      grouped[a.skill_name].history.push(a);
    });
    return grouped;
  },

  async log(assessment) {
    const { data, error } = await supabase
      .from('skill_assessments')
      .insert(assessment)
      .select()
      .single();
    if (error) { console.error('Log skill assessment error:', error); return null; }
    return data;
  },

  async bulkLog(assessments) {
    const { data, error } = await supabase
      .from('skill_assessments')
      .insert(assessments)
      .select();
    if (error) { console.error('Bulk log assessments error:', error); return []; }
    return data || [];
  },
};
```

**Step 2: Add AI evaluation function**

Add to the `ai` object:

```javascript
async evaluateChallenge(challenge, studentResponse, studentProfile) {
  const systemPrompt = `You evaluate an explorer's response to an expedition challenge. You are NOT a teacher grading a test. You are a field guide checking if the explorer can proceed.

RULES:
- NEVER use words like "correct," "incorrect," "grade," "score," "test," or "quiz"
- Frame feedback as expedition narrative: "The bridge holds!" or "The signal clears!" for success
- For failure: "The bridge wobbles... try adjusting your estimate" or "The signal is still garbled. Look at the pattern again."
- Be encouraging. Explorers learn by trying.
- Return your assessment honestly — this data helps guides understand the explorer's skills. But the STUDENT only sees the narrative feedback.

Return ONLY valid JSON.`;

  const userMessage = `Challenge type: ${challenge.challenge_type}
Challenge: "${challenge.challenge_text}"
Config: ${JSON.stringify(challenge.challenge_config)}
Target skills: ${JSON.stringify(challenge.target_skill_ids || [])}
Explorer: ${studentProfile?.name || 'Explorer'} (age ${studentProfile?.age || '10-14'})

Explorer's response: "${studentResponse}"

Evaluate as JSON:
{
  "is_successful": true/false,
  "narrative_feedback": "1-2 sentences, adventure-framed. What the explorer sees.",
  "skill_ratings": [
    {
      "skill_name": "the skill assessed",
      "rating": 1-4,
      "evidence": "brief note on what showed this level"
    }
  ],
  "ep_awarded": ${challenge.ep_reward || 15} if successful, 5 if good attempt but not quite
}`;

  const raw = await callAI({ systemPrompt, userMessage, maxTokens: 512 });
  try {
    return JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
  } catch { return { is_successful: false, narrative_feedback: 'The path ahead is unclear. Try again, explorer.', skill_ratings: [], ep_awarded: 0 }; }
},
```

**Step 3: Commit**
```bash
git add src/lib/api.js
git commit -m "feat: add expedition challenges API, response tracking, and AI evaluation"
```

---

### Task 4: Save Expedition Challenges During Quest Generation

**Files:**
- Modify: `src/pages/QuestBuilder.jsx`

**Step 1: Import new API**

Add to imports:
```javascript
import { expeditionChallenges } from '../lib/api';
```

(Should already have other api imports nearby.)

**Step 2: Save challenges after stage save**

In the `saveQuest` function, find where stages are saved and landmarks are generated (after the stage insert and `.select()`). After the landmark generation block, add:

```javascript
// Save expedition challenges
const challengesToSave = [];
savedStages.forEach(saved => {
  const originalStage = questData.stages.find(s => s.stage_number === saved.stage_number);
  if (originalStage?.expedition_challenge) {
    const ec = originalStage.expedition_challenge;
    challengesToSave.push({
      stage_id: saved.id,
      challenge_type: ec.challenge_type,
      challenge_text: ec.challenge_text,
      challenge_config: ec.challenge_config || {},
      target_skill_ids: ec.target_skills || [],
      difficulty: ec.difficulty || 'standard',
      ep_reward: 15,
    });
  }
});
if (challengesToSave.length > 0) {
  await expeditionChallenges.bulkCreate(challengesToSave);
}
```

**Step 3: Commit**
```bash
git add src/pages/QuestBuilder.jsx
git commit -m "feat: save expedition challenges when quest is generated"
```

---

### Task 5: ExpeditionChallenge Component

**Files:**
- Create: `src/components/gamified/ExpeditionChallenge.jsx`

**Step 1: Create the component**

This is the core gamified UI. Each challenge type renders a different interactive experience, all wrapped in an adventure-themed frame. The component handles the full flow: present challenge -> collect response -> evaluate -> show result -> award EP.

```jsx
// src/components/gamified/ExpeditionChallenge.jsx
import { useState, useEffect } from 'react';
import { Compass, Zap, Loader2, ChevronRight, RotateCcw, Sparkles } from 'lucide-react';

// Themed headers per challenge type
const CHALLENGE_THEMES = {
  estimate: { icon: Compass, label: 'Navigation Check', color: 'var(--compass-gold)', verb: 'Estimate' },
  pattern: { icon: Zap, label: 'Signal Decode', color: 'var(--lab-blue)', verb: 'Complete' },
  quick_write: { icon: Compass, label: 'Field Report', color: 'var(--field-green)', verb: 'Record' },
  classify: { icon: Compass, label: 'Supply Sort', color: 'var(--specimen-red)', verb: 'Organize' },
  decode: { icon: Zap, label: 'Cipher Break', color: 'var(--lab-blue)', verb: 'Decode' },
};

export default function ExpeditionChallenge({ challenge, existingResponse, onEvaluate, disabled }) {
  const [response, setResponse] = useState('');
  const [classifyAnswers, setClassifyAnswers] = useState({});
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState(existingResponse ? {
    is_successful: existingResponse.is_successful,
    narrative_feedback: existingResponse.ai_feedback,
    ep_awarded: existingResponse.ep_awarded,
  } : null);
  const [showChallenge, setShowChallenge] = useState(false);

  const theme = CHALLENGE_THEMES[challenge.challenge_type] || CHALLENGE_THEMES.estimate;
  const config = challenge.challenge_config || {};
  const completed = !!existingResponse || result?.is_successful;

  // Animate in
  useEffect(() => {
    const t = setTimeout(() => setShowChallenge(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async () => {
    if (evaluating || disabled) return;
    const submissionText = challenge.challenge_type === 'classify'
      ? JSON.stringify(classifyAnswers)
      : response;
    if (!submissionText.trim()) return;

    setEvaluating(true);
    const evalResult = await onEvaluate(challenge, submissionText);
    setResult(evalResult);
    setEvaluating(false);
  };

  const handleRetry = () => {
    setResult(null);
    setResponse('');
    setClassifyAnswers({});
  };

  // ---- Completed State ----
  if (completed) {
    return (
      <div style={{
        margin: '12px 0', padding: '14px 16px', borderRadius: 10,
        background: 'rgba(75,139,59,0.06)', border: '1px solid rgba(75,139,59,0.2)',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Sparkles size={14} color="var(--compass-gold)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--field-green)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Challenge Cleared
          </span>
          {(result?.ep_awarded || existingResponse?.ep_awarded) > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: 'var(--compass-gold)' }}>
              +{result?.ep_awarded || existingResponse?.ep_awarded} EP
            </span>
          )}
        </div>
        <p style={{ fontSize: 12, color: 'var(--graphite)', margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>
          {result?.narrative_feedback || existingResponse?.ai_feedback || 'The path ahead is clear.'}
        </p>
      </div>
    );
  }

  // ---- Failed Attempt ----
  if (result && !result.is_successful) {
    return (
      <div style={{
        margin: '12px 0', padding: '14px 16px', borderRadius: 10,
        background: 'rgba(184,134,11,0.06)', border: '1.5px dashed var(--compass-gold)',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <RotateCcw size={14} color="var(--compass-gold)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--compass-gold)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
            Not quite...
          </span>
          {result.ep_awarded > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: 'var(--compass-gold)' }}>
              +{result.ep_awarded} EP for trying
            </span>
          )}
        </div>
        <p style={{ fontSize: 12, color: 'var(--graphite)', margin: '0 0 10px', lineHeight: 1.5, fontStyle: 'italic' }}>
          {result.narrative_feedback}
        </p>
        <button onClick={handleRetry} style={{
          padding: '6px 14px', borderRadius: 6, border: '1px solid var(--pencil)',
          background: 'var(--chalk)', color: 'var(--ink)', fontSize: 11, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'var(--font-body)',
        }}>
          Try Again
        </button>
      </div>
    );
  }

  // ---- Active Challenge ----
  return (
    <div style={{
      margin: '12px 0', borderRadius: 10,
      border: `1.5px solid ${theme.color}`,
      background: 'var(--chalk)',
      overflow: 'hidden',
      opacity: showChallenge ? 1 : 0,
      transform: showChallenge ? 'translateY(0)' : 'translateY(8px)',
      transition: 'all 0.4s ease',
    }}>
      {/* Header bar */}
      <div style={{
        padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8,
        background: `color-mix(in srgb, ${theme.color} 8%, transparent)`,
        borderBottom: `1px solid color-mix(in srgb, ${theme.color} 15%, transparent)`,
      }}>
        <theme.icon size={14} color={theme.color} />
        <span style={{ fontSize: 10, fontWeight: 700, color: theme.color, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {theme.label}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--graphite)' }}>
          +{challenge.ep_reward || 15} EP
        </span>
      </div>

      {/* Challenge body */}
      <div style={{ padding: '14px 16px' }}>
        <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6, margin: '0 0 12px', fontWeight: 500 }}>
          {challenge.challenge_text}
        </p>

        {/* TYPE-SPECIFIC INPUT */}
        {(challenge.challenge_type === 'estimate' || challenge.challenge_type === 'pattern' || challenge.challenge_type === 'decode') && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type={challenge.challenge_type === 'estimate' ? 'number' : 'text'}
              value={response}
              onChange={e => setResponse(e.target.value)}
              placeholder={challenge.challenge_type === 'estimate' ? 'Your estimate...' : 'Your answer...'}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 8,
                border: `1.5px solid color-mix(in srgb, ${theme.color} 30%, var(--pencil))`,
                background: 'var(--paper)', fontSize: 14, fontFamily: 'var(--font-body)',
                color: 'var(--ink)', outline: 'none',
              }}
            />
            {config.unit && (
              <span style={{ fontSize: 12, color: 'var(--graphite)', fontWeight: 600 }}>{config.unit}</span>
            )}
          </div>
        )}

        {challenge.challenge_type === 'quick_write' && (
          <textarea
            value={response}
            onChange={e => setResponse(e.target.value)}
            placeholder="Write your field report..."
            rows={3}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 8, resize: 'vertical',
              border: `1.5px solid color-mix(in srgb, ${theme.color} 30%, var(--pencil))`,
              background: 'var(--paper)', fontSize: 13, fontFamily: 'var(--font-body)',
              color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
            }}
          />
        )}

        {challenge.challenge_type === 'classify' && config.categories && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {config.categories.map(cat => (
              <div key={cat} style={{
                flex: '1 1 140px', padding: 10, borderRadius: 8,
                border: '1px dashed var(--pencil)', background: 'var(--paper)', minWidth: 120,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: theme.color, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 8 }}>
                  {cat}
                </div>
                {(config.items || []).map(item => (
                  <label key={item.text} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0',
                    fontSize: 12, color: 'var(--ink)', cursor: 'pointer',
                  }}>
                    <input type="radio" name={`classify-${item.text}`}
                      checked={classifyAnswers[item.text] === cat}
                      onChange={() => setClassifyAnswers(prev => ({ ...prev, [item.text]: cat }))}
                      style={{ accentColor: theme.color }}
                    />
                    {item.text}
                  </label>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Submit button */}
        <button onClick={handleSubmit} disabled={evaluating}
          style={{
            marginTop: 12, display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: evaluating ? 'var(--pencil)' : theme.color,
            color: 'white', fontSize: 12, fontWeight: 700, cursor: evaluating ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-body)', transition: 'background 0.15s ease',
          }}>
          {evaluating ? (
            <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Checking...</>
          ) : (
            <><ChevronRight size={13} /> Proceed</>
          )}
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add src/components/gamified/ExpeditionChallenge.jsx
git commit -m "feat: add ExpeditionChallenge component with 5 challenge types"
```

---

### Task 6: Wire Expedition Challenges into StudentQuestPage

**Files:**
- Modify: `src/pages/student/StudentQuestPage.jsx`

**Step 1: Add imports**

```javascript
import ExpeditionChallenge from '../../components/gamified/ExpeditionChallenge';
import { expeditionChallenges, challengeResponses, skillAssessments, ai } from '../../lib/api';
```

Note: `ai` may already be imported. Only add what's missing. Also import `expeditionChallenges` and `challengeResponses` — check existing imports first.

**Step 2: Add state for challenges**

Near other state declarations:
```javascript
const [stageChallenges, setStageChallenges] = useState({});   // { stageId: challenge }
const [challengeResponseMap, setChallengeResponseMap] = useState({}); // { challengeId: response }
```

**Step 3: Load challenges when quest loads**

Add a useEffect that loads challenges for all stages after the quest stages are loaded. Find the existing useEffect that fetches quest data (stages). After stages are available, add:

```javascript
// Load expedition challenges for all stages
useEffect(() => {
  if (!stages || stages.length === 0) return;
  const loadChallenges = async () => {
    const challengeMap = {};
    const responseMap = {};
    await Promise.all(stages.map(async (stage) => {
      const challenge = await expeditionChallenges.getForStage(stage.id);
      if (challenge) {
        challengeMap[stage.id] = challenge;
        if (studentId) {
          const resp = await challengeResponses.get(challenge.id, studentId);
          if (resp) responseMap[challenge.id] = resp;
        }
      }
    }));
    setStageChallenges(challengeMap);
    setChallengeResponseMap(responseMap);
  };
  loadChallenges();
}, [stages, studentId]);
```

**Step 4: Add challenge evaluation handler**

```javascript
const handleChallengeEvaluate = async (challenge, responseText) => {
  // Get student profile for evaluation context
  const studentProfile = { name: studentName, age: student?.age, grade: student?.grade };

  // Call AI to evaluate
  const evalResult = await ai.evaluateChallenge(challenge, responseText, studentProfile);

  // Save response
  const saved = await challengeResponses.submit({
    challenge_id: challenge.id,
    student_id: studentId,
    response_text: responseText,
    is_successful: evalResult.is_successful,
    ep_awarded: evalResult.ep_awarded || 0,
    ai_feedback: evalResult.narrative_feedback,
  });

  if (saved) {
    setChallengeResponseMap(prev => ({ ...prev, [challenge.id]: saved }));
  }

  // Silently log skill assessments (student never sees this)
  if (evalResult.skill_ratings?.length > 0) {
    const assessments = evalResult.skill_ratings.map(sr => ({
      student_id: studentId,
      skill_name: sr.skill_name,
      quest_id: quest?.id,
      stage_id: challenge.stage_id,
      assessment_type: 'expedition_challenge',
      rating: sr.rating,
      evidence: sr.evidence,
    }));
    await skillAssessments.bulkLog(assessments);
  }

  // Award EP if successful
  if (evalResult.ep_awarded > 0 && evalResult.is_successful) {
    // Use existing award_xp RPC if available
    try {
      await supabase.rpc('award_xp', {
        p_student_id: studentId,
        p_event_type: 'stage_complete',
        p_points: evalResult.ep_awarded,
        p_quest_id: quest?.id,
        p_stage_id: challenge.stage_id,
        p_metadata: { source: 'expedition_challenge', challenge_type: challenge.challenge_type },
      });
    } catch (e) { /* XP system may not be migrated yet */ }
  }

  return evalResult;
};
```

**Step 5: Render challenge in stage cards**

Find the active stage rendering section. The challenge should appear BEFORE the description — it's the "obstacle" the explorer encounters first. Find where the active stage card renders (after the narrative hook, before the description). Add:

```jsx
{/* Expedition Challenge — appears before main stage content */}
{stageChallenges[stage.id] && stage.status === 'active' && (
  <ExpeditionChallenge
    challenge={stageChallenges[stage.id]}
    existingResponse={challengeResponseMap[stageChallenges[stage.id]?.id]}
    onEvaluate={handleChallengeEvaluate}
  />
)}
```

For completed stages, show the cleared challenge state:
```jsx
{stageChallenges[stage.id] && stage.status === 'completed' && (
  <ExpeditionChallenge
    challenge={stageChallenges[stage.id]}
    existingResponse={challengeResponseMap[stageChallenges[stage.id]?.id] || { is_successful: true, ai_feedback: 'Challenge cleared.', ep_awarded: 0 }}
    onEvaluate={handleChallengeEvaluate}
    disabled
  />
)}
```

**Step 6: Run build**
```bash
cd "/Users/md/Quest Lab/quest-lab" && npm run build
```

**Step 7: Commit**
```bash
git add src/pages/student/StudentQuestPage.jsx
git commit -m "feat: wire expedition challenges into student quest page with evaluation flow"
```

---

### Task 7: Challenge Preview in QuestBuilder Review

**Files:**
- Modify: `src/pages/QuestBuilder.jsx`

**Step 1: Show expedition challenges in Step 6 Review**

In the Step6Review component, find where each stage card is rendered. After the sources section and before the end of the stage card, add a preview of the expedition challenge if present:

```jsx
{/* Expedition Challenge Preview */}
{stage.expedition_challenge && (
  <div style={{
    marginTop: 10, padding: '10px 12px', borderRadius: 8,
    border: '1.5px dashed var(--compass-gold)',
    background: 'rgba(184,134,11,0.04)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <Compass size={12} color="var(--compass-gold)" />
      <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--compass-gold)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Expedition Challenge ({stage.expedition_challenge.challenge_type})
      </span>
    </div>
    <p style={{ fontSize: 12, color: 'var(--ink)', margin: 0, lineHeight: 1.5 }}>
      {stage.expedition_challenge.challenge_text}
    </p>
    {stage.expedition_challenge.target_skills?.length > 0 && (
      <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {stage.expedition_challenge.target_skills.map((skill, i) => (
          <span key={i} style={{
            padding: '2px 8px', borderRadius: 10, fontSize: 9,
            background: 'rgba(184,134,11,0.1)', color: 'var(--compass-gold)',
            fontFamily: 'var(--font-mono)',
          }}>{skill}</span>
        ))}
      </div>
    )}
  </div>
)}
```

Make sure `Compass` is imported from lucide-react (it likely already is).

**Step 2: Commit**
```bash
git add src/pages/QuestBuilder.jsx
git commit -m "feat: show expedition challenge preview in QuestBuilder review step"
```

---

## Part C: Invisible Assessment Enhancement (L3.2b) — Tasks 8-10

### Task 8: Enhanced Submission Review with Structured Skill Ratings

**Files:**
- Modify: `src/lib/api.js`
- Modify: `src/pages/student/StudentQuestPage.jsx`

**Step 1: Enhance ai.reviewSubmission() prompt**

Find the `ai.reviewSubmission()` function. Update the system prompt to include structured skill assessment. Change the return schema section to:

```javascript
const systemPrompt = `You review a learner's project submission. Give warm, specific, encouraging feedback.

FEEDBACK STYLE: warm-cool-warm (start positive, note growth area, end encouraging).
NEVER use: "grade," "score," "test," "assessment," "rubric," "correct/incorrect"
DO use: "Your work shows...", "One area to explore further...", "You demonstrated..."

SKILL ASSESSMENT (invisible to student — this data is for the guide):
Rate each academic skill demonstrated on a 1-4 scale:
1 = emerging (just starting to show understanding)
2 = developing (shows partial understanding, needs more practice)
3 = proficient (solid understanding, can apply independently)
4 = advanced (deep understanding, can teach others or extend)
Be honest but generous. Only rate skills you can genuinely see evidence for.

Return ONLY valid JSON:
{
  "feedback": "2-3 sentences warm-cool-warm",
  "skills_demonstrated": ["skill 1", "skill 2"],
  "skill_ratings": [
    { "skill_name": "Fractions", "rating": 3, "evidence": "Correctly calculated 3/4 of the budget" },
    { "skill_name": "Persuasive Writing", "rating": 2, "evidence": "Made a claim but didn't support with data" }
  ],
  "encouragement": "1 sentence of specific encouragement",
  "next_steps": "1 question about what to explore next",
  "sources_referenced": [{"title": "string", "url": "string", "trust_level": "trusted|review|unverified"}]
}`;
```

Keep the rest of the function the same (user message construction, callAI call, JSON parsing).

**Step 2: Log skill assessments after submission review**

In StudentQuestPage, find where `ai.reviewSubmission()` is called and the result is handled. After the feedback is saved, add skill assessment logging:

```javascript
// After reviewSubmission returns and feedback is saved...
if (feedbackResult.skill_ratings?.length > 0) {
  const assessments = feedbackResult.skill_ratings.map(sr => ({
    student_id: studentId,
    skill_name: sr.skill_name,
    quest_id: quest?.id,
    stage_id: activeStage?.id,
    assessment_type: 'submission_review',
    rating: sr.rating,
    evidence: sr.evidence,
  }));
  await skillAssessments.bulkLog(assessments);
}
```

**Step 3: Commit**
```bash
git add src/lib/api.js src/pages/student/StudentQuestPage.jsx
git commit -m "feat: add structured skill ratings to submission review with silent assessment logging"
```

---

### Task 9: Field Guide Conversational Assessment

**Files:**
- Modify: `src/lib/api.js`

**Step 1: Enhance ai.questHelp() prompt for skill probing**

Find the `ai.questHelp()` function. Add to the system prompt (after existing Socratic method instructions):

```
SKILL PROBING (do this naturally, never announce it):
- When the explorer explains their thinking, gently probe deeper: "Interesting! What made you choose that approach?" or "What would happen if you doubled that?"
- When they show understanding, acknowledge it warmly: "You've got a sharp eye for patterns!"
- When they struggle, scaffold without giving away: "Let's break that down. What's the first piece you're sure about?"

INVISIBLE ASSESSMENT:
After EVERY response, silently evaluate what the conversation reveals about the explorer's skills.
Append a hidden JSON block at the END of your response, after your natural reply, separated by the delimiter "---ASSESSMENT---":
---ASSESSMENT---
{"skill_observations": [{"skill_name": "string", "rating": 1-4, "evidence": "what they said that shows this"}]}

If the conversation doesn't reveal anything assessable, return empty: {"skill_observations": []}
The explorer NEVER sees this block — it is stripped before display.
```

**Step 2: Parse hidden assessment from Field Guide responses**

In StudentQuestPage, find where questHelp() responses are processed and displayed. Before displaying the message to the student, strip and capture the assessment:

```javascript
// After receiving Field Guide response
let displayMessage = rawResponse;
let conversationAssessments = [];

const assessmentDelimiter = '---ASSESSMENT---';
if (rawResponse.includes(assessmentDelimiter)) {
  const parts = rawResponse.split(assessmentDelimiter);
  displayMessage = parts[0].trim();
  try {
    const assessmentData = JSON.parse(parts[1].trim());
    conversationAssessments = assessmentData.skill_observations || [];
  } catch { /* ignore parse errors */ }
}

// Display only the clean message to student
// ... existing message display logic using displayMessage ...

// Silently log any skill observations
if (conversationAssessments.length > 0) {
  const assessments = conversationAssessments.map(obs => ({
    student_id: studentId,
    skill_name: obs.skill_name,
    quest_id: quest?.id,
    stage_id: activeStage?.id,
    assessment_type: 'conversation',
    rating: obs.rating,
    evidence: obs.evidence,
  }));
  skillAssessments.bulkLog(assessments); // fire-and-forget, don't await
}
```

**Step 3: Commit**
```bash
git add src/lib/api.js src/pages/student/StudentQuestPage.jsx
git commit -m "feat: add invisible skill assessment to Field Guide conversations"
```

---

### Task 10: Guide Skill Analytics in StudentProfilePage

**Files:**
- Modify: `src/pages/StudentProfilePage.jsx`

**Step 1: Import skillAssessments API**

```javascript
import { skillAssessments } from '../lib/api';
```

**Step 2: Load and display skill assessment data**

Add state:
```javascript
const [assessmentData, setAssessmentData] = useState({});
```

Add useEffect to load grouped assessments:
```javascript
useEffect(() => {
  if (!student?.id) return;
  skillAssessments.getForStudentGrouped(student.id).then(setAssessmentData);
}, [student?.id]);
```

**Step 3: Add Skill Insights section**

Find where the student's skills are displayed (the existing Skill Growth section). After it, add a new section for assessment insights that's only visible to guides (check if `useAuth().user` exists — if yes, it's a guide viewing):

```jsx
{/* Skill Insights — Guide Only */}
{Object.keys(assessmentData).length > 0 && (
  <div style={{ marginTop: 32 }}>
    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)', marginBottom: 16 }}>
      Skill Insights
    </h2>
    <p style={{ fontSize: 11, color: 'var(--graphite)', marginBottom: 16 }}>
      Gathered invisibly from expedition challenges, project submissions, and Field Guide conversations.
    </p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
      {Object.entries(assessmentData).map(([skillName, { latest, history }]) => {
        const ratingLabels = ['', 'Emerging', 'Developing', 'Proficient', 'Advanced'];
        const ratingColors = ['', 'var(--specimen-red)', 'var(--compass-gold)', 'var(--lab-blue)', 'var(--field-green)'];
        return (
          <div key={skillName} style={{
            background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 10,
            padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{skillName}</span>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                background: `color-mix(in srgb, ${ratingColors[latest.rating]} 12%, transparent)`,
                color: ratingColors[latest.rating],
                fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
              }}>
                {ratingLabels[latest.rating]}
              </span>
            </div>
            {/* Progress bar */}
            <div style={{ height: 4, background: 'var(--parchment)', borderRadius: 2, marginBottom: 8 }}>
              <div style={{
                height: '100%', borderRadius: 2, transition: 'width 0.5s ease',
                width: `${(latest.rating / 4) * 100}%`,
                background: ratingColors[latest.rating],
              }} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--graphite)', lineHeight: 1.4 }}>
              <strong>Latest evidence:</strong> {latest.evidence || 'No details recorded'}
            </div>
            <div style={{ fontSize: 9, color: 'var(--pencil)', marginTop: 4 }}>
              {history.length} observation{history.length !== 1 ? 's' : ''} across{' '}
              {new Set(history.map(h => h.assessment_type)).size} source{new Set(history.map(h => h.assessment_type)).size !== 1 ? 's' : ''}
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}
```

**Step 4: Commit**
```bash
git add src/pages/StudentProfilePage.jsx
git commit -m "feat: add guide-facing skill insights section with assessment evidence"
```

---

## Verification Checklist

After all tasks, verify:

- [ ] `npm run build` passes with no errors
- [ ] QuestBuilder Step 4 shows "Expedition Style" segmented control (Hands-On / Mixed / Digital)
- [ ] Generated quests include expedition_challenge objects in stage JSON
- [ ] StudentQuestPage shows expedition challenges at the start of active stages
- [ ] Completing a challenge shows narrative feedback + EP, never "correct/incorrect"
- [ ] Failed challenges show encouraging retry prompt, never "wrong"
- [ ] Submission review returns skill_ratings (check browser console for the response)
- [ ] Field Guide responses have ---ASSESSMENT--- block stripped before display
- [ ] StudentProfilePage shows Skill Insights section with rating bars (when guide is viewing)
- [ ] No student-facing text contains: "test," "quiz," "assessment," "grade," "score," "rubric"

## Migrations to Run

Run in Supabase SQL Editor:
1. `supabase/migrations/027_layer3_challenges.sql`
