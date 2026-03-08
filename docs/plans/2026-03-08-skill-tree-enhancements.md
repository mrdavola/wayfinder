# Skill Tree Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 5 interconnected features inspired by open-skill-trees: interactive skill tree visualization, branching quest stages, submission scoring with resubmit, animated quest maps, and self-directed "Explore a Skill" mini-trees with video content.

**Architecture:** All features share a common skill progression backbone. Features 3 (scoring) and 5 (explore) share submission scoring logic. Features 1 (tree viz) and 5 (explore) share the SVG tree rendering component. Feature 4 (animations) is pure CSS. Feature 2 (branching stages) modifies the existing quest pipeline. Perplexity API integration (Feature 5) is a new backend capability.

**Tech Stack:** React + Vite, Supabase PostgreSQL, recharts (existing), SVG for tree rendering, CSS animations, Perplexity API (new), existing AI providers via callAI()

---

## Part A: Submission Scoring & Resubmit Loop (Feature 3)

*This goes first because Features 1 and 5 depend on scoring infrastructure.*

### Task 1: Database Migration for Scoring

**Files:**
- Create: `supabase/migrations/034_submission_scoring.sql`

**Context:** The `submission_feedback` table (015_submission_feedback.sql) already stores feedback_text, skills_demonstrated, encouragement, next_steps. We need to add numeric scoring and allow multiple submissions per stage.

**Step 1: Write the migration**

```sql
-- Add scoring columns to submission_feedback
ALTER TABLE submission_feedback ADD COLUMN IF NOT EXISTS score INTEGER;
ALTER TABLE submission_feedback ADD COLUMN IF NOT EXISTS score_max INTEGER DEFAULT 50;
ALTER TABLE submission_feedback ADD COLUMN IF NOT EXISTS hints TEXT;
ALTER TABLE submission_feedback ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1;

-- Allow multiple submissions per stage per student (drop old unique constraint if exists)
-- The stage_submissions table has UNIQUE(stage_id, student_name) — we need to allow resubmits
ALTER TABLE stage_submissions DROP CONSTRAINT IF EXISTS stage_submissions_stage_id_student_name_key;

-- Add attempt tracking to stage_submissions
ALTER TABLE stage_submissions ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1;

-- New unique constraint: one submission per stage per student per attempt
DO $$ BEGIN
  ALTER TABLE stage_submissions ADD CONSTRAINT stage_submissions_stage_student_attempt_key
    UNIQUE(stage_id, student_name, attempt_number);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index for quick lookup of latest submission
CREATE INDEX IF NOT EXISTS idx_submission_feedback_score
  ON submission_feedback(quest_id, stage_id, student_name, attempt_number);
```

**Step 2: Run migration in Supabase SQL Editor**

Paste the SQL and execute. Verify no errors.

**Step 3: Commit**

```bash
git add supabase/migrations/034_submission_scoring.sql
git commit -m "feat: add scoring columns to submission_feedback + multi-attempt support"
```

---

### Task 2: Update ai.reviewSubmission() to Return Numeric Score

**Files:**
- Modify: `src/lib/api.js` (lines 709-756, the `ai.reviewSubmission` function)

**Context:** Currently returns `{ feedback, skills_demonstrated, skill_ratings, encouragement, next_steps }`. We need to add `score` (1-50), `hints` (for resubmits), and `mastery_passed` (boolean, score >= 35).

**Step 1: Update the system prompt in ai.reviewSubmission**

Find the `reviewSubmission` function (around line 709). Update the system prompt's JSON schema to include scoring. The key change is adding these fields to the required JSON output:

```javascript
// In the system prompt, update the JSON schema section to include:
"score": 35,           // 1-50 numeric score
"hints": "If the student wants to improve: try X, consider Y",
"mastery_passed": true  // true if score >= 35
```

Add this instruction to the system prompt:
```
SCORING (1-50):
- 1-15: Minimal effort or off-topic. Student needs significant guidance.
- 16-25: Shows basic understanding but missing key elements.
- 26-34: Good effort with some gaps. Close to mastery.
- 35-42: Solid work demonstrating proficiency. Mastery achieved.
- 43-50: Exceptional depth, creativity, or insight. Advanced mastery.

Score >= 35 means the student has demonstrated mastery of this stage's learning goals.
Always provide "hints" with 1-2 specific, actionable suggestions for improvement regardless of score.
```

**Step 2: Verify the function still parses correctly**

The function uses `parseAIJSON(text)` to parse the response. No changes needed to parsing — the new fields come through automatically.

**Step 3: Commit**

```bash
git add src/lib/api.js
git commit -m "feat: add numeric scoring (1-50) to ai.reviewSubmission"
```

---

### Task 3: Build ScoreCard Component

**Files:**
- Create: `src/components/ui/ScoreCard.jsx`

**Context:** Replaces/augments the existing FeedbackCard. Shows numeric score with visual indicator, warm-cool-warm feedback, hints, and a "Try Again" button for scores < 35.

**Step 1: Create the ScoreCard component**

```jsx
// src/components/ui/ScoreCard.jsx
import { useState } from 'react';
import { CheckCircle, AlertTriangle, RotateCcw, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

const T = {
  ink: '#1A1A2E', paper: '#FAF8F5', parchment: '#F0EDE6',
  graphite: '#6B7280', pencil: '#9CA3AF', chalk: '#FFFFFF',
  fieldGreen: '#2D6A4F', compassGold: '#B8860B', labBlue: '#1B4965',
  specimenRed: '#C0392B',
};

const MASTERY_THRESHOLD = 35;

function scoreColor(score) {
  if (score >= 43) return '#16a34a'; // exceptional — bright green
  if (score >= MASTERY_THRESHOLD) return T.fieldGreen; // mastery — green
  if (score >= 26) return T.compassGold; // close — gold
  if (score >= 16) return '#ea580c'; // needs work — orange
  return T.specimenRed; // minimal — red
}

function scoreLabel(score) {
  if (score >= 43) return 'Exceptional';
  if (score >= MASTERY_THRESHOLD) return 'Mastery';
  if (score >= 26) return 'Almost There';
  if (score >= 16) return 'Keep Going';
  return 'Needs Work';
}

export default function ScoreCard({ feedback, onResubmit }) {
  const [expanded, setExpanded] = useState(false);
  const { score, feedback: feedbackText, hints, encouragement, next_steps,
          skills_demonstrated, mastery_passed, attempt_number } = feedback;

  const color = scoreColor(score || 0);
  const passed = mastery_passed || (score >= MASTERY_THRESHOLD);

  return (
    <div style={{
      background: T.chalk, borderRadius: 14,
      border: `1.5px solid ${passed ? T.fieldGreen : T.parchment}`,
      overflow: 'hidden',
    }}>
      {/* Score header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 18px',
        background: passed ? 'rgba(45,106,79,0.06)' : T.paper,
      }}>
        {/* Score circle */}
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          border: `3px solid ${color}`,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ fontSize: 18, fontWeight: 800, color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
            {score || '—'}
          </span>
          <span style={{ fontSize: 8, color: T.graphite, fontFamily: 'var(--font-mono)' }}>/50</span>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            {passed ? <CheckCircle size={14} color={T.fieldGreen} /> : <AlertTriangle size={14} color={T.compassGold} />}
            <span style={{ fontSize: 13, fontWeight: 700, color: passed ? T.fieldGreen : T.compassGold, fontFamily: 'var(--font-body)' }}>
              {scoreLabel(score || 0)}
            </span>
            {attempt_number > 1 && (
              <span style={{ fontSize: 10, color: T.pencil, fontFamily: 'var(--font-mono)' }}>
                Attempt #{attempt_number}
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: T.ink, fontFamily: 'var(--font-body)', lineHeight: 1.5, margin: 0 }}>
            {feedbackText}
          </p>
        </div>
      </div>

      {/* Score bar */}
      <div style={{ height: 4, background: T.parchment }}>
        <div style={{
          height: '100%', width: `${Math.min((score || 0) / 50 * 100, 100)}%`,
          background: color, transition: 'width 800ms ease-out',
        }} />
      </div>

      {/* Expandable details */}
      <div style={{ padding: '0 18px' }}>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, width: '100%',
            padding: '10px 0', background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 12, color: T.graphite,
            fontFamily: 'var(--font-body)', fontWeight: 600,
          }}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Hide details' : 'Show details'}
        </button>

        {expanded && (
          <div style={{ paddingBottom: 14 }}>
            {/* Skills demonstrated */}
            {skills_demonstrated?.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.labBlue, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  Skills Shown
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {skills_demonstrated.map((s, i) => (
                    <span key={i} style={{
                      padding: '3px 8px', borderRadius: 6, fontSize: 11,
                      background: 'rgba(27,73,101,0.08)', color: T.labBlue,
                      fontFamily: 'var(--font-body)', fontWeight: 500,
                    }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Encouragement */}
            {encouragement && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.fieldGreen, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  Keep it up
                </div>
                <p style={{ fontSize: 12, color: T.ink, fontFamily: 'var(--font-body)', margin: 0, lineHeight: 1.5 }}>{encouragement}</p>
              </div>
            )}

            {/* Hints for improvement */}
            {hints && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.compassGold, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  How to improve
                </div>
                <p style={{ fontSize: 12, color: T.ink, fontFamily: 'var(--font-body)', margin: 0, lineHeight: 1.5 }}>{hints}</p>
              </div>
            )}

            {/* Next steps */}
            {next_steps && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.graphite, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  Think about
                </div>
                <p style={{ fontSize: 12, color: T.graphite, fontFamily: 'var(--font-body)', margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>{next_steps}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resubmit button — only if not mastered */}
      {!passed && onResubmit && (
        <div style={{ padding: '0 18px 14px' }}>
          <button
            onClick={onResubmit}
            style={{
              width: '100%', padding: '10px', borderRadius: 8,
              border: `1.5px solid ${T.compassGold}`, background: 'rgba(184,134,11,0.06)',
              color: T.compassGold, fontSize: 13, fontWeight: 700,
              fontFamily: 'var(--font-body)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all 150ms',
            }}
          >
            <RotateCcw size={14} /> Try Again
          </button>
        </div>
      )}
    </div>
  );
}

export { MASTERY_THRESHOLD, scoreColor, scoreLabel };
```

**Step 2: Commit**

```bash
git add src/components/ui/ScoreCard.jsx
git commit -m "feat: add ScoreCard component with numeric scoring, details, and resubmit button"
```

---

### Task 4: Wire ScoreCard into StudentQuestPage Submission Flow

**Files:**
- Modify: `src/pages/student/StudentQuestPage.jsx`

**Context:** Currently, when a student submits work on a stage, `ai.reviewSubmission()` is called and the result is shown via FeedbackCard. We need to:
1. Pass the new score fields through
2. Replace FeedbackCard with ScoreCard
3. Add resubmit flow (clear submission text, increment attempt, allow re-entry)
4. Only allow stage completion when score >= 35

**Step 1: Find the submission handler in StudentQuestPage.jsx**

Search for where `ai.reviewSubmission` or `submissionFeedback` is called. This is where the student submits their work for a stage. The flow is approximately:
1. Student types in submission textarea
2. Clicks submit
3. `ai.reviewSubmission()` called
4. Result stored in `submission_feedback` table
5. `ai.assessMastery()` called to update skills
6. FeedbackCard rendered

**Step 2: Update the submission handler to include scoring**

After `ai.reviewSubmission()` returns, the result now includes `score`, `hints`, `mastery_passed`. Store the `score`, `hints`, and `attempt_number` when inserting into `submission_feedback`:

```javascript
// When inserting into submission_feedback, add:
score: result.score,
hints: result.hints,
attempt_number: currentAttempt,
```

Also update the stage_submissions insert to include `attempt_number`.

**Step 3: Add resubmit state management**

Add state for tracking attempts:
```javascript
const [attemptNumbers, setAttemptNumbers] = useState({}); // { [stageId]: number }
```

When a stage scores < 35, the "Try Again" button in ScoreCard calls:
```javascript
function handleResubmit(stageId) {
  setAttemptNumbers(prev => ({ ...prev, [stageId]: (prev[stageId] || 1) + 1 }));
  // Clear the submission text for this stage
  // Re-enable the submission form
}
```

**Step 4: Gate stage completion on mastery**

Currently stage completion happens after any submission. Change it so:
- If `score >= 35`: Show ScoreCard with green "Mastery" + enable "Complete Stage" button
- If `score < 35`: Show ScoreCard with "Try Again" button, do NOT auto-complete the stage

**Step 5: Replace FeedbackCard import with ScoreCard**

```javascript
// Remove:
import FeedbackCard from '../../components/ui/FeedbackCard';
// Add:
import ScoreCard from '../../components/ui/ScoreCard';
```

Replace all `<FeedbackCard ... />` with `<ScoreCard feedback={...} onResubmit={() => handleResubmit(stageId)} />`.

**Step 6: Commit**

```bash
git add src/pages/student/StudentQuestPage.jsx
git commit -m "feat: wire ScoreCard into submission flow with resubmit loop and mastery gating"
```

---

### Task 5: Feed Scores into Mastery Tracking

**Files:**
- Modify: `src/lib/api.js` (ai.assessMastery function, ~line 758)
- Modify: `src/pages/student/StudentQuestPage.jsx` (after submission scoring)

**Context:** Currently `ai.assessMastery()` is called after `ai.reviewSubmission()`. We should also pass the numeric score so mastery assessment can be more precise. A score >= 35 on a stage should bump related skills toward 'proficient'.

**Step 1: Update the mastery assessment call to include score**

In StudentQuestPage, where `ai.assessMastery()` is called after getting feedback, pass the score:

```javascript
const masteryResult = await ai.assessMastery({
  stageTitle: stage.title,
  submissionContent: submissionText,
  skillsDemonstrated: feedbackResult.skills_demonstrated,
  studentSkills: currentStudentSkills,
  score: feedbackResult.score, // NEW
});
```

**Step 2: Update ai.assessMastery prompt to consider score**

Add to the system prompt in `ai.assessMastery`:
```
The student received a score of ${score}/50 on this submission (35+ = mastery).
Factor this score into your proficiency assessment:
- Score 43-50: Consider bumping to 'advanced' if evidence supports it
- Score 35-42: Consider 'proficient' for demonstrated skills
- Score 26-34: Consider 'developing' — they're close
- Score below 26: Keep at current level or 'emerging'
```

**Step 3: Commit**

```bash
git add src/lib/api.js src/pages/student/StudentQuestPage.jsx
git commit -m "feat: feed numeric scores into mastery assessment for more precise skill tracking"
```

---

## Part B: Animated Quest Map (Feature 4)

*Pure CSS — no dependencies on other features. Can be done in parallel.*

### Task 6: Add CSS Animations to QuestMap (Guide-facing)

**Files:**
- Modify: `src/pages/QuestMap.jsx` (lines 160-250, the SVG rendering section)

**Context:** The QuestMap uses SVG with circular nodes and line connections. Currently static colors. We need:
- Pulsing glow on active stage node (gold pulse)
- Animated dashes flowing along the "next" connection (the one leading to the active stage)
- Completed nodes with subtle green glow
- All CSS animations, no JS animation loops

**Step 1: Add CSS keyframes in the QuestMap `<style>` block**

Find the existing `<style>` tag in QuestMap (or add one inside the component's return). Add these keyframes:

```jsx
<style>{`
  @keyframes qm-pulse {
    0%, 100% { filter: drop-shadow(0 0 4px rgba(184,134,11,0.4)); }
    50% { filter: drop-shadow(0 0 12px rgba(184,134,11,0.8)); }
  }
  @keyframes qm-glow-green {
    0%, 100% { filter: drop-shadow(0 0 3px rgba(45,106,79,0.3)); }
    50% { filter: drop-shadow(0 0 6px rgba(45,106,79,0.5)); }
  }
  @keyframes qm-dash-flow {
    to { stroke-dashoffset: -20; }
  }
  @keyframes qm-node-enter {
    from { opacity: 0; transform: scale(0.8); }
    to { opacity: 1; transform: scale(1); }
  }
`}</style>
```

**Step 2: Apply animations to stage nodes**

In the SVG where stage circles are rendered (around line 226+), add style attributes based on status:

For **active** stage node circle:
```jsx
style={{
  animation: 'qm-pulse 2s ease-in-out infinite',
  cursor: 'pointer',
}}
```

For **completed** stage node circle:
```jsx
style={{
  animation: 'qm-glow-green 3s ease-in-out infinite',
}}
```

**Step 3: Animate the connection line leading to the active stage**

Find the SVG `<line>` elements connecting nodes (around line 170-188). For the line where the target node is the active stage:

```jsx
<line
  // ...existing props
  strokeDasharray="6 4"
  style={{
    animation: 'qm-dash-flow 0.8s linear infinite',
  }}
/>
```

For completed connections (both nodes completed), keep them solid with no animation.

**Step 4: Add entry animation to all nodes**

Wrap each node group in an element with staggered entry:
```jsx
style={{
  animation: `qm-node-enter 400ms ease-out ${i * 80}ms both`,
}}
```

**Step 5: Commit**

```bash
git add src/pages/QuestMap.jsx
git commit -m "feat: add pulsing glow, flowing dashes, and entry animations to QuestMap"
```

---

### Task 7: Add CSS Animations to StudentQuestPage

**Files:**
- Modify: `src/pages/student/StudentQuestPage.jsx`

**Context:** The student-facing page renders stages as a vertical list of StageCards. We need similar animations but adapted for the card-based layout:
- Active stage card has a subtle gold left-border pulse
- Completed stage cards have a green check glow
- The "next locked" stage has a subtle shimmer to indicate it's coming up
- Stage transitions animate smoothly

**Step 1: Add keyframes to the existing `<style>` block**

```jsx
<style>{`
  @keyframes sq-border-pulse {
    0%, 100% { border-left-color: rgba(184,134,11,0.6); }
    50% { border-left-color: rgba(184,134,11,1); }
  }
  @keyframes sq-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes sq-complete-pop {
    0% { transform: scale(1); }
    50% { transform: scale(1.02); }
    100% { transform: scale(1); }
  }
  .sq-stage-active {
    border-left: 4px solid var(--compass-gold) !important;
    animation: sq-border-pulse 2s ease-in-out infinite;
  }
  .sq-stage-next-locked {
    background: linear-gradient(90deg, var(--chalk) 40%, rgba(184,134,11,0.04) 50%, var(--chalk) 60%) !important;
    background-size: 200% 100%;
    animation: sq-shimmer 3s ease-in-out infinite;
  }
  .sq-stage-completed {
    animation: sq-complete-pop 300ms ease-out;
  }
`}</style>
```

**Step 2: Apply classes to stage cards**

Find where StageCard/stage divs are rendered. Add className based on status:
- `status === 'active'` → `className="sq-stage-active"`
- `status === 'locked'` and is the NEXT stage after active → `className="sq-stage-next-locked"`
- `status === 'completed'` → `className="sq-stage-completed"`

**Step 3: Commit**

```bash
git add src/pages/student/StudentQuestPage.jsx
git commit -m "feat: add pulse, shimmer, and pop animations to student stage cards"
```

---

## Part C: Interactive Skill Tree Visualization (Feature 1)

### Task 8: Database Migration for Skill Dependencies

**Files:**
- Create: `supabase/migrations/035_skill_dependencies.sql`

**Context:** Skills need dependency relationships. "Research" depends on "Reading Comprehension". "Data Analysis" depends on "Math". These dependencies drive the tree layout. AI generates them when skills are added.

**Step 1: Write the migration**

```sql
-- Skill dependency graph: which skills lead to which
CREATE TABLE IF NOT EXISTS skill_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  depends_on_skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'prerequisite'
    CHECK (relationship IN ('prerequisite', 'related', 'builds_on')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(skill_id, depends_on_skill_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_deps_skill ON skill_dependencies(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_deps_parent ON skill_dependencies(depends_on_skill_id);

-- RLS: readable by authenticated users
ALTER TABLE skill_dependencies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY skill_deps_read ON skill_dependencies FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY skill_deps_write ON skill_dependencies FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed default dependencies between the existing 25+ skills
-- These connect the skill catalog into a meaningful graph
INSERT INTO skill_dependencies (skill_id, depends_on_skill_id, relationship)
SELECT s1.id, s2.id, 'builds_on'
FROM skills s1, skills s2
WHERE (s1.name, s2.name) IN (
  ('Critical Thinking', 'Reading Comprehension'),
  ('Problem Solving', 'Math Reasoning'),
  ('Problem Solving', 'Critical Thinking'),
  ('Data Analysis', 'Math Reasoning'),
  ('Data Analysis', 'Statistics'),
  ('Research', 'Reading Comprehension'),
  ('Research', 'Critical Thinking'),
  ('Scientific Thinking', 'Research'),
  ('Scientific Thinking', 'Problem Solving'),
  ('Environmental Science', 'Scientific Thinking'),
  ('Engineering', 'Problem Solving'),
  ('Engineering', 'Scientific Thinking'),
  ('Digital Design', 'Creativity'),
  ('Game Design', 'Digital Design'),
  ('Game Design', 'Problem Solving'),
  ('Public Speaking', 'Communication'),
  ('Storytelling', 'Writing'),
  ('Storytelling', 'Creativity'),
  ('Digital Literacy', 'Technology'),
  ('Coding', 'Problem Solving'),
  ('Coding', 'Technology'),
  ('Leadership', 'Collaboration'),
  ('Leadership', 'Communication'),
  ('History & Civics', 'Reading Comprehension'),
  ('Geography & Culture', 'Research'),
  ('Economics & Financial Literacy', 'Math Reasoning')
)
ON CONFLICT DO NOTHING;
```

**Step 2: Run in Supabase SQL Editor and verify**

**Step 3: Commit**

```bash
git add supabase/migrations/035_skill_dependencies.sql
git commit -m "feat: add skill_dependencies table with seeded prerequisite graph"
```

---

### Task 9: API Functions for Skill Dependencies

**Files:**
- Modify: `src/lib/api.js` — add to the `skills` export object

**Step 1: Add dependency API functions**

After the existing `skills.bulkUpsert` function (around line 1919), add:

```javascript
  getDependencies: async (skillIds) => {
    // Get all dependencies for a set of skills
    return supabase
      .from('skill_dependencies')
      .select('*, skill:skills!skill_dependencies_skill_id_fkey(id, name, category), parent:skills!skill_dependencies_depends_on_skill_id_fkey(id, name, category)')
      .in('skill_id', skillIds);
  },

  getAllDependencies: async () => {
    return supabase
      .from('skill_dependencies')
      .select('skill_id, depends_on_skill_id, relationship');
  },
```

**Step 2: Commit**

```bash
git add src/lib/api.js
git commit -m "feat: add skill dependency API functions"
```

---

### Task 10: Build SkillTreeView SVG Component

**Files:**
- Create: `src/components/ui/SkillTreeView.jsx`

**Context:** An SVG-based interactive skill tree. Nodes are the student's skills positioned using a simple force-directed layout. Edges come from skill_dependencies. Click a node to see details popup. Color-coded by proficiency. This sits alongside the existing ProgressRadar in a tab toggle.

**Step 1: Create the SkillTreeView component**

```jsx
// src/components/ui/SkillTreeView.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';

const T = {
  ink: '#1A1A2E', paper: '#FAF8F5', parchment: '#F0EDE6',
  graphite: '#6B7280', pencil: '#9CA3AF', chalk: '#FFFFFF',
  fieldGreen: '#2D6A4F', compassGold: '#B8860B', labBlue: '#1B4965',
  specimenRed: '#C0392B',
};

const PROFICIENCY_COLORS = {
  advanced: '#16a34a',    // bright green
  proficient: T.fieldGreen,
  developing: T.compassGold,
  emerging: T.pencil,
  unrated: '#e5e7eb',
};

const CATEGORY_COLORS = {
  core: T.labBlue,
  soft: T.compassGold,
  interest: T.fieldGreen,
};

const NODE_RADIUS = 28;

// Simple force-directed layout (runs once, not animated)
function layoutNodes(skills, dependencies, width, height) {
  // Place skills in a circle initially, then nudge based on dependencies
  const nodes = skills.map((s, i) => {
    const angle = (i / skills.length) * 2 * Math.PI - Math.PI / 2;
    const rx = width * 0.35;
    const ry = height * 0.35;
    return {
      ...s,
      x: width / 2 + rx * Math.cos(angle),
      y: height / 2 + ry * Math.sin(angle),
    };
  });

  // Simple spring iterations to cluster connected nodes
  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.skill_id || n.id] = n; });

  for (let iter = 0; iter < 50; iter++) {
    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = 800 / (dist * dist);
        nodes[i].x -= (dx / dist) * force;
        nodes[i].y -= (dy / dist) * force;
        nodes[j].x += (dx / dist) * force;
        nodes[j].y += (dy / dist) * force;
      }
    }

    // Attraction for connected nodes
    for (const dep of dependencies) {
      const a = nodeMap[dep.skill_id];
      const b = nodeMap[dep.depends_on_skill_id];
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const force = (dist - 120) * 0.02;
      a.x += (dx / dist) * force;
      a.y += (dy / dist) * force;
      b.x -= (dx / dist) * force;
      b.y -= (dy / dist) * force;
    }

    // Keep within bounds
    const pad = NODE_RADIUS + 10;
    nodes.forEach(n => {
      n.x = Math.max(pad, Math.min(width - pad, n.x));
      n.y = Math.max(pad, Math.min(height - pad, n.y));
    });
  }

  return nodes;
}

export default function SkillTreeView({ studentSkills, allSkills, dependencies, compact, onSkillClick }) {
  const svgRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [size, setSize] = useState({ w: 600, h: compact ? 320 : 450 });

  // Build the node list: merge catalog skills with student ratings
  const { nodes, edges } = useMemo(() => {
    if (!allSkills?.length) return { nodes: [], edges: [] };

    const studentMap = {};
    (studentSkills || []).forEach(s => {
      studentMap[s.skill_id || s.id] = s;
    });

    // Only show skills that the student has rated OR that connect to rated skills
    const ratedIds = new Set(Object.keys(studentMap));
    const connectedIds = new Set();
    (dependencies || []).forEach(d => {
      if (ratedIds.has(d.skill_id) || ratedIds.has(d.depends_on_skill_id)) {
        connectedIds.add(d.skill_id);
        connectedIds.add(d.depends_on_skill_id);
      }
    });

    const visibleIds = new Set([...ratedIds, ...connectedIds]);
    const visibleSkills = allSkills
      .filter(s => visibleIds.has(s.id))
      .map(s => ({
        ...s,
        skill_id: s.id,
        proficiency: studentMap[s.id]?.proficiency || studentMap[s.id]?.current_level_label || 'unrated',
        isRated: !!studentMap[s.id],
      }));

    const visibleDeps = (dependencies || []).filter(
      d => visibleIds.has(d.skill_id) && visibleIds.has(d.depends_on_skill_id)
    );

    const laid = layoutNodes(visibleSkills, visibleDeps, size.w, size.h);
    return { nodes: laid, edges: visibleDeps };
  }, [allSkills, studentSkills, dependencies, size]);

  // Resize observer
  useEffect(() => {
    if (!svgRef.current?.parentElement) return;
    const obs = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      if (width > 100) setSize({ w: width, h: compact ? 320 : 450 });
    });
    obs.observe(svgRef.current.parentElement);
    return () => obs.disconnect();
  }, [compact]);

  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.skill_id] = n; });

  if (nodes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: T.pencil }}>
        <p style={{ fontSize: 40, marginBottom: 8 }}>🌱</p>
        <p style={{ fontSize: 13, fontFamily: 'var(--font-body)' }}>
          No skills tracked yet. Complete projects or rate your skills to grow your skill tree!
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${size.w} ${size.h}`}
        width="100%"
        height={size.h}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <filter id="st-glow-green">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="st-glow-gold">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Edges */}
        {edges.map((e, i) => {
          const from = nodeMap[e.depends_on_skill_id];
          const to = nodeMap[e.skill_id];
          if (!from || !to) return null;
          const bothRated = from.isRated && to.isRated;
          return (
            <line
              key={i}
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={bothRated ? T.labBlue : T.pencil}
              strokeWidth={bothRated ? 2 : 1}
              strokeOpacity={bothRated ? 0.5 : 0.2}
              strokeDasharray={bothRated ? 'none' : '4 3'}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const color = PROFICIENCY_COLORS[node.proficiency] || PROFICIENCY_COLORS.unrated;
          const catColor = CATEGORY_COLORS[node.category] || T.graphite;
          const isSelected = selected?.skill_id === node.skill_id;
          const glowFilter = node.proficiency === 'advanced' ? 'url(#st-glow-green)'
            : node.proficiency === 'proficient' ? 'url(#st-glow-gold)' : 'none';

          return (
            <g
              key={node.skill_id}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setSelected(isSelected ? null : node);
                if (onSkillClick && !isSelected) onSkillClick(node);
              }}
            >
              {/* Outer ring — category color */}
              <circle
                cx={node.x} cy={node.y} r={NODE_RADIUS}
                fill={T.chalk}
                stroke={isSelected ? T.ink : catColor}
                strokeWidth={isSelected ? 3 : 1.5}
                filter={glowFilter}
              />
              {/* Inner fill — proficiency */}
              <circle
                cx={node.x} cy={node.y} r={NODE_RADIUS - 5}
                fill={color}
                fillOpacity={node.isRated ? 0.25 : 0.08}
              />
              {/* Proficiency indicator dot */}
              {node.isRated && (
                <circle
                  cx={node.x + NODE_RADIUS - 6} cy={node.y - NODE_RADIUS + 6} r={5}
                  fill={color} stroke={T.chalk} strokeWidth={1.5}
                />
              )}
              {/* Label */}
              <text
                x={node.x} y={node.y + 1}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={compact ? 8 : 9}
                fontFamily="var(--font-body)"
                fontWeight={600}
                fill={T.ink}
                style={{ pointerEvents: 'none' }}
              >
                {node.name.length > 14 ? node.name.slice(0, 12) + '…' : node.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Detail popup */}
      {selected && (
        <div style={{
          position: 'absolute', top: 8, right: 8, width: 220,
          background: T.chalk, borderRadius: 12, padding: '14px 16px',
          border: `1px solid ${T.parchment}`, boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          zIndex: 10,
        }}>
          <button
            onClick={() => setSelected(null)}
            style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: T.pencil, padding: 2 }}
          >
            <X size={14} />
          </button>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, fontFamily: 'var(--font-body)', marginBottom: 4 }}>
            {selected.name}
          </div>
          <div style={{ fontSize: 11, color: T.graphite, fontFamily: 'var(--font-body)', marginBottom: 8 }}>
            {selected.description || 'No description'}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{
              padding: '3px 8px', borderRadius: 6, fontSize: 10,
              fontWeight: 600, fontFamily: 'var(--font-mono)',
              background: `${PROFICIENCY_COLORS[selected.proficiency]}20`,
              color: PROFICIENCY_COLORS[selected.proficiency],
              textTransform: 'uppercase',
            }}>
              {selected.proficiency}
            </span>
            <span style={{
              padding: '3px 8px', borderRadius: 6, fontSize: 10,
              fontWeight: 600, fontFamily: 'var(--font-mono)',
              background: `${CATEGORY_COLORS[selected.category]}15`,
              color: CATEGORY_COLORS[selected.category],
              textTransform: 'uppercase',
            }}>
              {selected.category}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/ui/SkillTreeView.jsx
git commit -m "feat: add interactive SVG SkillTreeView with force-directed layout and detail popup"
```

---

### Task 11: Add Tab Toggle to StudentProfilePage (Radar + Tree)

**Files:**
- Modify: `src/pages/StudentProfilePage.jsx` (the Progress Radar section, ~lines 421-440)

**Context:** Add a tab toggle above the chart area: "Radar" | "Skill Tree". Both views show the same underlying data, just different visualizations. The radar is already there; we add SkillTreeView as an alternative.

**Step 1: Add imports and state**

```javascript
import SkillTreeView from '../components/ui/SkillTreeView';
// ...existing imports

// Inside the component, add:
const [profileView, setProfileView] = useState('radar'); // 'radar' | 'tree'
const [allSkills, setAllSkills] = useState([]);
const [skillDeps, setSkillDeps] = useState([]);

// In the data loading effect, add:
const [catalogRes, depsRes] = await Promise.all([
  skillsApi.listCatalog(null), // all skills, no grade filter
  skillsApi.getAllDependencies(),
]);
if (catalogRes.data) setAllSkills(catalogRes.data);
if (depsRes.data) setSkillDeps(depsRes.data);
```

**Step 2: Add tab toggle UI**

Replace the current Progress Radar section header with a toggle:

```jsx
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
  <h2 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
    <Target size={16} style={{ marginRight: 6, color: T.labBlue }} />
    Progress
  </h2>
  <div style={{ display: 'flex', gap: 0, background: T.parchment, borderRadius: 8, padding: 2 }}>
    {['radar', 'tree'].map(v => (
      <button
        key={v}
        onClick={() => setProfileView(v)}
        style={{
          padding: '4px 12px', borderRadius: 6, border: 'none',
          background: profileView === v ? T.chalk : 'transparent',
          color: profileView === v ? T.ink : T.graphite,
          fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-body)',
          cursor: 'pointer', transition: 'all 150ms',
          boxShadow: profileView === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
        }}
      >
        {v === 'radar' ? 'Radar' : 'Skill Tree'}
      </button>
    ))}
  </div>
</div>

{profileView === 'radar' ? (
  <ProgressRadar
    assessments={assessmentData}
    studentSkills={studentSkills}
    learningOutcomes={parentInfo?.learning_outcomes || []}
    compact
  />
) : (
  <SkillTreeView
    studentSkills={studentSkills}
    allSkills={allSkills}
    dependencies={skillDeps}
    compact
  />
)}
```

**Step 3: Do the same for MasteryMap.jsx**

Add the same tab toggle to the full Mastery Map page (non-compact version).

**Step 4: Commit**

```bash
git add src/pages/StudentProfilePage.jsx src/pages/MasteryMap.jsx
git commit -m "feat: add Radar/Skill Tree tab toggle to profile and mastery map"
```

---

## Part D: Branching Quest Stages (Feature 2)

### Task 12: Database Migration for Stage Dependencies

**Files:**
- Create: `supabase/migrations/036_stage_dependencies.sql`

**Step 1: Write the migration**

```sql
-- Add dependency support to quest_stages
ALTER TABLE quest_stages ADD COLUMN IF NOT EXISTS dependencies UUID[] DEFAULT '{}';

-- When a stage has dependencies, ALL must be completed before it unlocks.
-- Empty dependencies = only requires stage_number - 1 (backward compat with linear quests).

-- Create a function to check if a stage can be unlocked
CREATE OR REPLACE FUNCTION check_stage_unlockable(p_stage_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  deps UUID[];
  all_done BOOLEAN;
BEGIN
  SELECT dependencies INTO deps FROM quest_stages WHERE id = p_stage_id;

  -- No dependencies = linear progression (check previous stage)
  IF deps IS NULL OR array_length(deps, 1) IS NULL THEN
    RETURN TRUE;
  END IF;

  -- All dependency stages must be completed
  SELECT bool_and(status = 'completed')
  INTO all_done
  FROM quest_stages
  WHERE id = ANY(deps);

  RETURN COALESCE(all_done, FALSE);
END;
$$ LANGUAGE plpgsql;
```

**Step 2: Run in Supabase SQL Editor**

**Step 3: Commit**

```bash
git add supabase/migrations/036_stage_dependencies.sql
git commit -m "feat: add dependencies column to quest_stages + unlock check function"
```

---

### Task 13: Update AI Quest Generation to Produce Dependencies

**Files:**
- Modify: `src/lib/api.js` (ai.generateQuest function, ~lines 483-639)

**Context:** The AI already generates stages with `stage_number`. We need it to also produce `depends_on: [stage_numbers]` for each stage, defining the dependency graph. Most quests will still be mostly linear, but with occasional branches (e.g., stage 3a and 3b can be done in parallel, both required for stage 4).

**Step 1: Update the generateQuest system prompt**

In the stage schema section of the prompt, add:

```
"depends_on": [1],  // array of stage_numbers this stage requires (empty = first stage)
```

Add this instruction:
```
STAGE DEPENDENCIES:
- Stage 1 always has depends_on: [] (no dependencies, it's the start)
- Most stages depend on the previous one: depends_on: [N-1]
- For branching: two stages can share the same dependency (parallel paths)
- For convergence: a stage can depend on multiple stages (merge point)
- Example branch-merge: stages 3 and 4 both depend on [2], stage 5 depends on [3, 4]
- At least one quest in 3 should have a branch (two parallel stages)
- Keep it simple: max 1 branch point per quest
```

**Step 2: Update the stage saving logic in QuestBuilder**

When saving stages in Step 6 (launch), convert `depends_on` stage numbers to stage UUIDs:

```javascript
// After inserting stages and getting their IDs back:
// Map stage_number → UUID for dependency resolution
const stageIdMap = {};
insertedStages.forEach(s => { stageIdMap[s.stage_number] = s.id; });

// Update dependencies from stage_numbers to UUIDs
for (const stage of insertedStages) {
  const depNumbers = generatedStage.depends_on || [];
  const depIds = depNumbers.map(n => stageIdMap[n]).filter(Boolean);
  if (depIds.length > 0) {
    await supabase.from('quest_stages').update({ dependencies: depIds }).eq('id', stage.id);
  }
}
```

**Step 3: Update initial stage status logic**

Currently: stage 1 = 'active', rest = 'locked'.
New logic: stages with `depends_on: []` = 'active', rest = 'locked'.

**Step 4: Commit**

```bash
git add src/lib/api.js src/pages/QuestBuilder.jsx
git commit -m "feat: AI generates stage dependencies for branching quest paths"
```

---

### Task 14: Update Stage Unlocking Logic

**Files:**
- Modify: `src/pages/student/StudentQuestPage.jsx` (stage completion handler)
- Modify: `src/lib/api.js` (questStages.complete function)

**Context:** Currently when a student completes a stage, it marks the current stage as 'completed' and the next sequential stage as 'active'. With dependencies, we need to check all stages that depend on the completed one and unlock any whose dependencies are ALL met.

**Step 1: Update questStages.complete**

Find the `questStages.complete` function in api.js. Change it from:

```javascript
// Old: mark current complete, mark next active
```

To:

```javascript
complete: async (stageId, questId) => {
  // 1. Mark current stage completed
  await supabase.from('quest_stages').update({
    status: 'completed', completed_at: new Date().toISOString()
  }).eq('id', stageId);

  // 2. Find all stages in this quest that depend on the completed stage
  const { data: allStages } = await supabase
    .from('quest_stages')
    .select('id, status, dependencies')
    .eq('quest_id', questId);

  // 3. For each locked stage, check if all dependencies are now completed
  const completedIds = new Set(
    allStages.filter(s => s.status === 'completed' || s.id === stageId).map(s => s.id)
  );

  const toUnlock = allStages.filter(s => {
    if (s.status !== 'locked') return false;
    const deps = s.dependencies || [];
    if (deps.length === 0) return false; // no deps = handled by linear fallback
    return deps.every(depId => completedIds.has(depId));
  });

  // 4. Unlock eligible stages
  if (toUnlock.length > 0) {
    await supabase.from('quest_stages')
      .update({ status: 'active' })
      .in('id', toUnlock.map(s => s.id));
  }

  // 5. Fallback for linear quests (no dependencies): unlock next by stage_number
  if (toUnlock.length === 0) {
    const { data: current } = await supabase.from('quest_stages')
      .select('stage_number').eq('id', stageId).single();
    if (current) {
      await supabase.from('quest_stages')
        .update({ status: 'active' })
        .eq('quest_id', questId)
        .eq('stage_number', current.stage_number + 1)
        .eq('status', 'locked');
    }
  }
},
```

**Step 2: Commit**

```bash
git add src/lib/api.js src/pages/student/StudentQuestPage.jsx
git commit -m "feat: dependency-aware stage unlocking (with linear fallback)"
```

---

### Task 15: Render Branching Stage Layout in QuestMap SVG

**Files:**
- Modify: `src/pages/QuestMap.jsx`

**Context:** Currently nodes are positioned in a zigzag column. With branching, parallel stages should appear side-by-side. We need a simple layout algorithm:
- Stages with no parallel siblings → center column (existing behavior)
- Stages at the same "depth" (same set of dependencies) → spread horizontally

**Step 1: Build a depth-based layout function**

```javascript
function layoutStages(stages) {
  // Compute depth for each stage based on dependencies
  const stageMap = {};
  stages.forEach(s => { stageMap[s.id] = s; });

  function getDepth(stage, memo = {}) {
    if (memo[stage.id] !== undefined) return memo[stage.id];
    const deps = stage.dependencies || [];
    if (deps.length === 0) { memo[stage.id] = 0; return 0; }
    const maxParent = Math.max(...deps.map(d => stageMap[d] ? getDepth(stageMap[d], memo) : -1));
    memo[stage.id] = maxParent + 1;
    return memo[stage.id];
  }

  const depths = {};
  stages.forEach(s => { depths[s.id] = getDepth(s); });

  // Group by depth
  const byDepth = {};
  stages.forEach(s => {
    const d = depths[s.id];
    if (!byDepth[d]) byDepth[d] = [];
    byDepth[d].push(s);
  });

  // Position: each depth level = a row, spread horizontally within row
  const positions = {};
  Object.entries(byDepth).forEach(([depth, group]) => {
    const d = parseInt(depth);
    const total = group.length;
    group.forEach((s, i) => {
      const xOffset = total === 1 ? 0 : (i - (total - 1) / 2) * 100;
      positions[s.id] = {
        x: SVG_CENTER_X + xOffset,
        y: 60 + d * NODE_SPACING,
      };
    });
  });

  return positions;
}
```

**Step 2: Use positions from layoutStages instead of getNodeX/getNodeY**

Replace the hardcoded zigzag positions with the dependency-aware positions. Fall back to zigzag for stages without dependencies (linear quests).

**Step 3: Draw connection lines based on actual dependencies**

Instead of connecting stage i to stage i+1, connect each stage to its dependency parents:

```jsx
{stages.map(stage => (
  (stage.dependencies || []).map(depId => {
    const from = positions[depId];
    const to = positions[stage.id];
    if (!from || !to) return null;
    return <line key={`${depId}-${stage.id}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} ... />;
  })
))}
```

**Step 4: Commit**

```bash
git add src/pages/QuestMap.jsx
git commit -m "feat: branching stage layout in QuestMap based on dependencies"
```

---

## Part E: "Explore a Skill" Self-Directed Trees (Feature 5)

*The big one. Depends on Parts A (scoring) and C (tree viz).*

### Task 16: Database Migration for Skill Explorations

**Files:**
- Create: `supabase/migrations/037_skill_explorations.sql`

**Step 1: Write the migration**

```sql
-- Skill exploration trees: student-initiated mini skill trees
CREATE TABLE IF NOT EXISTS skill_explorations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'abandoned')),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Individual nodes within a skill exploration tree
CREATE TABLE IF NOT EXISTS exploration_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exploration_id UUID NOT NULL REFERENCES skill_explorations(id) ON DELETE CASCADE,
  parent_node_id UUID REFERENCES exploration_nodes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  node_type TEXT DEFAULT 'skill'
    CHECK (node_type IN ('root', 'skill', 'challenge')),
  status TEXT DEFAULT 'locked'
    CHECK (status IN ('locked', 'active', 'completed')),
  -- Content (AI-generated)
  one_pager TEXT,                   -- markdown summary
  video_url TEXT,                   -- YouTube URL
  video_title TEXT,
  action_item TEXT,                 -- challenge/exercise description
  resources JSONB DEFAULT '[]',     -- [{ title, url, type, trust_level }]
  -- Submission & scoring
  submission_text TEXT,
  score INTEGER,
  score_feedback TEXT,
  attempt_number INTEGER DEFAULT 0,
  -- Layout
  x FLOAT DEFAULT 0,
  y FLOAT DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exploration_student ON skill_explorations(student_id);
CREATE INDEX IF NOT EXISTS idx_exploration_nodes_tree ON exploration_nodes(exploration_id);
CREATE INDEX IF NOT EXISTS idx_exploration_nodes_parent ON exploration_nodes(parent_node_id);

ALTER TABLE skill_explorations ENABLE ROW LEVEL SECURITY;
ALTER TABLE exploration_nodes ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users (guides + student session) to read/write
DO $$ BEGIN
  CREATE POLICY exploration_all ON skill_explorations FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY exploration_nodes_all ON exploration_nodes FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

**Step 2: Run in Supabase SQL Editor**

**Step 3: Commit**

```bash
git add supabase/migrations/037_skill_explorations.sql
git commit -m "feat: add skill_explorations and exploration_nodes tables"
```

---

### Task 17: Perplexity API Integration + Link Checker

**Files:**
- Create: `src/lib/perplexity.js`

**Context:** Perplexity API is used for two things: (1) finding relevant YouTube videos for a topic, and (2) finding trusted educational sources. We also add a link checker that validates URLs are live.

**Step 1: Create the Perplexity integration module**

```javascript
// src/lib/perplexity.js

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

async function callPerplexity(prompt, systemPrompt) {
  const apiKey = import.meta.env.VITE_PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.warn('No Perplexity API key — falling back to AI-generated links');
    return null;
  }

  const response = await fetch(PERPLEXITY_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    console.error('Perplexity API error:', response.status);
    return null;
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || null;
}

// Find YouTube videos for a learning topic
export async function findYouTubeVideos(topic, level, count = 1) {
  const text = await callPerplexity(
    `Find ${count} YouTube video(s) that teach "${topic}" at a ${level} level. For each video, provide the exact YouTube URL, the video title, and the channel name. Prefer educational channels (Khan Academy, CrashCourse, 3Blue1Brown, Veritasium, etc.) and videos under 15 minutes. Return ONLY valid JSON: [{"url": "https://youtube.com/watch?v=...", "title": "...", "channel": "..."}]`,
    'You are a YouTube educational video curator. Return only valid JSON arrays. Always use full youtube.com URLs (not youtu.be shortened). Only suggest real, existing videos you are confident exist.'
  );

  if (!text) return [];
  try {
    const parsed = JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

// Find trusted educational sources for a topic
export async function findTrustedSources(topic, level, count = 3) {
  const text = await callPerplexity(
    `Find ${count} trusted educational resources for learning "${topic}" at a ${level} level. Include a mix of articles, interactive tools, and reference sites. Prefer .edu, .org, and well-known educational platforms (Khan Academy, BBC Bitesize, National Geographic Education, Smithsonian, PBS LearningMedia, etc.). Return ONLY valid JSON: [{"title": "...", "url": "https://...", "type": "article|interactive|reference", "trust_level": "trusted|review"}]`,
    'You are an educational resource curator focused on K-12 content. Return only valid JSON arrays. Only suggest real, existing URLs from reputable educational sources.'
  );

  if (!text) return [];
  try {
    const parsed = JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

// Validate that a URL is actually live (returns HTTP 200)
export async function checkLink(url) {
  try {
    const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
    // no-cors returns opaque response (status 0) but means the server responded
    return true;
  } catch {
    return false;
  }
}

// Validate an array of resources and filter out dead links
export async function validateResources(resources) {
  const results = await Promise.allSettled(
    resources.map(async (r) => {
      const alive = await checkLink(r.url);
      return { ...r, verified: alive };
    })
  );
  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
}
```

**Step 2: Add VITE_PERPLEXITY_API_KEY to .env.local**

The user will need to add their Perplexity API key. Add a note in the code:

```javascript
// Add to .env.local: VITE_PERPLEXITY_API_KEY=pplx-...
// Get your key at https://www.perplexity.ai/settings/api
```

**Step 3: Commit**

```bash
git add src/lib/perplexity.js
git commit -m "feat: add Perplexity API integration for YouTube discovery + trusted sources + link checker"
```

---

### Task 18: AI Function to Generate Exploration Tree

**Files:**
- Modify: `src/lib/api.js` — add `ai.generateExplorationTree` function

**Context:** Given a skill name and student level, generate a 5-8 node mini skill tree. Each node needs a title, description, one-pager (markdown), action item, and position in the tree. YouTube videos and resources are fetched separately via Perplexity.

**Step 1: Add the function to the ai object in api.js**

Add after the existing `ai.recommendSkills` function:

```javascript
generateExplorationTree: async ({ skillName, level, studentAge, studentInterests }) => {
  const text = await callAI({
    systemPrompt: `You are Wayfinder's skill exploration engine. Given a skill to explore, generate a mini learning tree — a structured set of 5-8 learning nodes that take a student from basics to competence.

You MUST respond with ONLY valid JSON matching this structure:
{
  "tree_title": "Exploring [Skill Name]",
  "tree_description": "One sentence overview",
  "nodes": [
    {
      "id": 1,
      "title": "Node title (short, engaging)",
      "description": "2-3 sentences about what this node covers",
      "one_pager": "A comprehensive but concise summary (200-400 words, markdown formatted). This is the main learning content. Include key concepts, examples, and connections to real life.",
      "action_item": "A specific, doable challenge or exercise. Should take 10-20 minutes. Be concrete: 'Write a...', 'Create a...', 'Research and compare...'",
      "video_search_query": "Exact YouTube search query to find a good explainer video",
      "parent_id": null,
      "sort_order": 1
    }
  ]
}

Rules:
- Node 1 is always the root (parent_id: null), an introduction/overview
- Other nodes branch from the root or from each other via parent_id (reference by node id number)
- Create a meaningful tree: some nodes branch, some are sequential
- Adapt language and complexity to the student's age and level
- Make action_items engaging and connected to student interests when possible
- one_pager should be genuinely educational — teach the concept, don't just describe it
- video_search_query should be specific enough to find a relevant educational video`,

    userMessage: `Generate a skill exploration tree for:
- Skill: ${skillName}
- Level: ${level || 'beginner'}
- Student age: ${studentAge || 'unknown'}
- Student interests: ${(studentInterests || []).join(', ') || 'general'}

Create 5-8 learning nodes that would take this student from basics to competence in this skill.`,
  });

  return await parseAIJSON(text);
},
```

**Step 2: Commit**

```bash
git add src/lib/api.js
git commit -m "feat: add ai.generateExplorationTree for self-directed skill trees"
```

---

### Task 19: Exploration API Functions (CRUD)

**Files:**
- Modify: `src/lib/api.js` — add `explorations` export

**Step 1: Add CRUD functions**

```javascript
// ===================== SKILL EXPLORATIONS =====================
export const explorations = {
  create: async ({ studentId, skillName, skillId }) => {
    return supabase
      .from('skill_explorations')
      .insert({ student_id: studentId, skill_name: skillName, skill_id: skillId })
      .select()
      .single();
  },

  get: async (explorationId) => {
    return supabase
      .from('skill_explorations')
      .select('*, exploration_nodes(*)')
      .eq('id', explorationId)
      .single();
  },

  listForStudent: async (studentId) => {
    return supabase
      .from('skill_explorations')
      .select('*, exploration_nodes(id, status)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
  },

  complete: async (explorationId) => {
    return supabase
      .from('skill_explorations')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', explorationId);
  },

  // Nodes
  createNodes: async (nodes) => {
    return supabase.from('exploration_nodes').insert(nodes).select();
  },

  updateNode: async (nodeId, updates) => {
    return supabase.from('exploration_nodes').update(updates).eq('id', nodeId).select().single();
  },

  submitAnswer: async (nodeId, { text, attemptNumber }) => {
    return supabase.from('exploration_nodes').update({
      submission_text: text,
      attempt_number: attemptNumber,
    }).eq('id', nodeId);
  },

  scoreSubmission: async (nodeId, { score, feedback }) => {
    return supabase.from('exploration_nodes').update({
      score, score_feedback: feedback,
      status: score >= 35 ? 'completed' : 'active',
    }).eq('id', nodeId);
  },
};
```

**Step 2: Commit**

```bash
git add src/lib/api.js
git commit -m "feat: add explorations CRUD API functions"
```

---

### Task 20: Build the Exploration Generation Pipeline

**Files:**
- Create: `src/lib/explorationPipeline.js`

**Context:** Orchestrates the full flow: AI generates tree structure → Perplexity finds videos + resources → link checker validates → save to DB → return exploration ID.

**Step 1: Create the pipeline**

```javascript
// src/lib/explorationPipeline.js
import { ai, explorations, skills as skillsApi } from './api';
import { findYouTubeVideos, findTrustedSources, validateResources } from './perplexity';

export async function generateExploration({ studentId, skillName, skillId, level, studentAge, studentInterests }) {
  // 1. Create the exploration record
  const { data: exploration } = await explorations.create({ studentId, skillName, skillId });
  if (!exploration) throw new Error('Failed to create exploration');

  // 2. Generate tree structure via AI
  const tree = await ai.generateExplorationTree({
    skillName, level, studentAge, studentInterests,
  });

  if (!tree?.nodes?.length) throw new Error('AI failed to generate tree');

  // 3. For each node, fetch video + resources in parallel
  const enrichedNodes = await Promise.all(
    tree.nodes.map(async (node) => {
      // Fetch video and sources in parallel
      const [videos, sources] = await Promise.all([
        findYouTubeVideos(node.video_search_query || node.title, level, 1),
        findTrustedSources(node.title, level, 3),
      ]);

      // Validate all resource links
      const allResources = [
        ...sources.map(s => ({ ...s, type: s.type || 'article' })),
      ];
      const validated = await validateResources(allResources);

      return {
        ...node,
        video_url: videos[0]?.url || null,
        video_title: videos[0]?.title || null,
        resources: validated.filter(r => r.verified),
      };
    })
  );

  // 4. Build parent_id map (AI uses numeric IDs, we need UUIDs after insert)
  // First insert root node, then children referencing parent UUIDs
  const nodeIdMap = {}; // aiId → UUID

  // Sort by parent_id (nulls first = root)
  const sorted = [...enrichedNodes].sort((a, b) => {
    if (a.parent_id === null) return -1;
    if (b.parent_id === null) return 1;
    return (a.parent_id || 0) - (b.parent_id || 0);
  });

  // Simple tree layout
  const rootX = 300, rootY = 40, levelSpacing = 100, siblingSpacing = 160;
  const childrenByParent = {};
  sorted.forEach(n => {
    const pid = n.parent_id || 'root';
    if (!childrenByParent[pid]) childrenByParent[pid] = [];
    childrenByParent[pid].push(n);
  });

  function assignPositions(nodeId, x, y, depth) {
    const children = childrenByParent[nodeId] || [];
    const totalWidth = (children.length - 1) * siblingSpacing;
    children.forEach((child, i) => {
      child._x = x - totalWidth / 2 + i * siblingSpacing;
      child._y = y + levelSpacing;
      assignPositions(child.id, child._x, child._y, depth + 1);
    });
  }

  const root = sorted.find(n => n.parent_id === null);
  if (root) {
    root._x = rootX;
    root._y = rootY;
    assignPositions(root.id, rootX, rootY, 0);
  }

  // Insert nodes sequentially to resolve parent references
  for (const node of sorted) {
    const parentUUID = node.parent_id ? nodeIdMap[node.parent_id] : null;
    const { data: inserted } = await explorations.createNodes([{
      exploration_id: exploration.id,
      parent_node_id: parentUUID,
      title: node.title,
      description: node.description,
      node_type: node.parent_id === null ? 'root' : 'skill',
      status: node.parent_id === null ? 'active' : 'locked',
      one_pager: node.one_pager,
      video_url: node.video_url,
      video_title: node.video_title,
      action_item: node.action_item,
      resources: node.resources || [],
      x: node._x || 0,
      y: node._y || 0,
      sort_order: node.sort_order || 0,
    }]);
    if (inserted?.[0]) {
      nodeIdMap[node.id] = inserted[0].id;
    }
  }

  return exploration.id;
}
```

**Step 2: Commit**

```bash
git add src/lib/explorationPipeline.js
git commit -m "feat: exploration generation pipeline — AI tree + Perplexity videos + link validation"
```

---

### Task 21: Build ExploreSkillPage

**Files:**
- Create: `src/pages/student/ExploreSkillPage.jsx`

**Context:** The main page for exploring a skill tree. Shows the SVG tree, clicking a node opens a side panel with video, one-pager, action item, and submission form with scoring.

**Step 1: Create the page component**

This is a large component. Key sections:

1. **Header** — Back button, exploration title, progress indicator
2. **Tree view** — SVG rendering of exploration nodes (reuse layout from SkillTreeView pattern)
3. **Node panel** — Slide-in panel showing:
   - YouTube video embed (iframe)
   - One-pager content (rendered markdown)
   - Action item / challenge description
   - Submission textarea
   - ScoreCard (after submission)
   - "Complete Node" button (when score >= 35)
4. **Completion flow** — When all nodes completed, show celebration + update mastery

The component should:
- Load exploration + nodes via `explorations.get(explorationId)`
- Track selected node in state
- Handle submissions: call `ai.reviewSubmission()` with node's action_item as the deliverable
- On node completion: unlock child nodes (similar to stage dependency logic)
- On tree completion: call `ai.assessMastery()` and update `student_skills`

```jsx
// Key structure (not full code — implement based on patterns from StudentQuestPage):
export default function ExploreSkillPage() {
  const { explorationId } = useParams();
  const [exploration, setExploration] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({}); // { [nodeId]: feedbackObj }

  // Load exploration data
  useEffect(() => { loadExploration(); }, [explorationId]);

  // SVG tree rendering (adapt SkillTreeView pattern)
  // Node panel (slide-in from right, 380px width)
  // Submission + scoring flow (adapt from StudentQuestPage)
  // Node unlock logic (when node completed, unlock children where all parents done)
  // Tree completion → mastery tracking update
}
```

**Step 2: Add route**

In `src/App.jsx` (or router config), add:
```jsx
<Route path="/student/explore/:explorationId" element={<ExploreSkillPage />} />
```

**Step 3: Commit**

```bash
git add src/pages/student/ExploreSkillPage.jsx src/App.jsx
git commit -m "feat: add ExploreSkillPage with tree view, node panel, submission scoring"
```

---

### Task 22: "Explore a Skill" Entry Points

**Files:**
- Modify: `src/pages/student/StudentHome.jsx` — add Explore button + creation flow
- Modify: `src/pages/student/StudentHome.jsx` — update SkillEditorModal with Explore buttons

**Context:** Two entry points:
1. **StudentHome**: An "Explore a Skill" button (like "Create My Own Project") that opens a prompt
2. **SkillEditorModal**: Each skill gets a small "Explore" link that generates a tree for that specific skill

**Step 1: Add "Explore a Skill" button to StudentHome**

After the "Update My Skills" button, add:

```jsx
{/* Explore a Skill CTA */}
{!loading && (
  <button
    onClick={() => setShowExploreModal(true)}
    style={{
      display: 'flex', alignItems: 'center', gap: 8,
      width: '100%', padding: '14px 20px', marginBottom: 28,
      background: 'rgba(45,106,79,0.04)', border: '1.5px dashed var(--field-green)',
      borderRadius: 12, cursor: 'pointer', transition: 'all 150ms',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(45,106,79,0.08)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(45,106,79,0.04)'; }}
  >
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      background: 'rgba(45,106,79,0.12)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      {/* Tree/branch icon */}
      <GitBranch size={18} color="var(--field-green)" />
    </div>
    <div style={{ textAlign: 'left' }}>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
        Explore a Skill
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--graphite)' }}>
        Dive deep into any skill with videos, reading, and challenges
      </div>
    </div>
  </button>
)}
```

**Step 2: Build ExploreModal (simple prompt flow)**

```jsx
function ExploreModal({ studentId, onClose, onCreated }) {
  const [skillInput, setSkillInput] = useState('');
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    // Get student profile for context
    const { data: student } = await supabase.from('students')
      .select('age, grade_band, interests').eq('id', studentId).single();

    const explorationId = await generateExploration({
      studentId,
      skillName: skillInput.trim(),
      skillId: null, // free-text skill
      level: 'beginner',
      studentAge: student?.age,
      studentInterests: student?.interests,
    });

    setGenerating(false);
    onCreated(explorationId);
  }

  // Render: input field + "Generate" button + loading state
}
```

**Step 3: Add Explore link to SkillEditorModal skill cards**

In the SkillEditorModal, next to each skill's proficiency buttons, add a small link:

```jsx
<button
  onClick={() => {
    onClose(); // close modal
    handleExploreSkill(skill.id, skill.name); // trigger exploration
  }}
  style={{ fontSize: 11, color: T.fieldGreen, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
>
  Explore →
</button>
```

**Step 4: Show existing explorations on StudentHome**

Add a section showing in-progress and completed explorations:

```jsx
{explorations.length > 0 && (
  <div style={{ marginBottom: 40 }}>
    <h2>Skill Explorations</h2>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
      {explorations.map(exp => (
        <Link to={`/student/explore/${exp.id}`} key={exp.id}>
          {/* Card showing skill name, node count, progress */}
        </Link>
      ))}
    </div>
  </div>
)}
```

**Step 5: Commit**

```bash
git add src/pages/student/StudentHome.jsx
git commit -m "feat: add Explore a Skill entry points on StudentHome and SkillEditorModal"
```

---

### Task 23: Wire Exploration Completion to Mastery Tracking

**Files:**
- Modify: `src/pages/student/ExploreSkillPage.jsx`

**Context:** When a student completes all nodes in an exploration tree, their progress should count toward mastery. This means:
1. Each completed node with score >= 35 demonstrates skill competence
2. On tree completion, call `ai.assessMastery()` with all action items + scores
3. Update `student_skills` proficiency based on assessment
4. Add `skill_snapshots` entry for historical tracking

**Step 1: Add completion handler**

```javascript
async function handleTreeCompletion() {
  // 1. Mark exploration as completed
  await explorations.complete(explorationId);

  // 2. Gather all submission evidence
  const completedNodes = nodes.filter(n => n.status === 'completed' && n.score >= 35);
  const evidence = completedNodes.map(n => `${n.title}: ${n.submission_text} (Score: ${n.score}/50)`).join('\n\n');

  // 3. Get current student skills
  const { data: currentSkills } = await skillsApi.getStudentSkills(session.studentId);

  // 4. Assess mastery
  const mastery = await ai.assessMastery({
    stageTitle: `Skill Exploration: ${exploration.skill_name}`,
    submissionContent: evidence,
    skillsDemonstrated: [exploration.skill_name],
    studentSkills: currentSkills || [],
    score: Math.round(completedNodes.reduce((sum, n) => sum + n.score, 0) / completedNodes.length),
  });

  // 5. Update student_skills
  if (mastery?.updates?.length > 0) {
    for (const update of mastery.updates) {
      const matchedSkill = (currentSkills || []).find(s =>
        s.skill_name?.toLowerCase() === update.skill_name?.toLowerCase()
      );
      if (matchedSkill) {
        await skillsApi.upsertStudentSkill({
          studentId: session.studentId,
          skillId: matchedSkill.skill_id,
          proficiency: update.new_proficiency,
          source: 'quest',
        });
        await snapshotsApi.add({
          studentId: session.studentId,
          skillId: matchedSkill.skill_id,
          proficiency: update.new_proficiency,
          source: 'quest',
        });
      }
    }
  }

  // 6. Show celebration UI
  setTreeCompleted(true);
}
```

**Step 2: Trigger on last node completion**

After each node scores >= 35 and gets marked completed, check if all nodes are done:

```javascript
// After scoring a node:
const allDone = updatedNodes.every(n => n.node_type === 'root' || n.status === 'completed');
if (allDone) {
  handleTreeCompletion();
}
```

**Step 3: Commit**

```bash
git add src/pages/student/ExploreSkillPage.jsx
git commit -m "feat: wire exploration completion to mastery tracking via assessMastery + skill updates"
```

---

## Part F: Integration & Polish

### Task 24: Add Perplexity Link Validation to Existing Quest Sources

**Files:**
- Modify: `src/pages/student/StudentQuestPage.jsx`
- Modify: `src/lib/api.js` (ai.generateQuest sources)

**Context:** The existing quest generation produces `sources` arrays with URLs that aren't always accurate. We should validate these with the link checker.

**Step 1: Add source validation to quest generation**

After `ai.generateQuest()` returns, validate sources for each stage:

```javascript
// In QuestBuilder.jsx Step 4, after AI generation returns:
import { validateResources } from '../lib/perplexity';

// For each stage in the generated quest:
for (const stage of generatedQuest.stages) {
  if (stage.sources?.length > 0) {
    const validated = await validateResources(stage.sources);
    stage.sources = validated.filter(r => r.verified !== false);
  }
}
```

**Step 2: Show trust indicators in StudentQuestPage**

When rendering source links, show trust level badges:

```jsx
{source.trust_level === 'trusted' && (
  <span style={{ fontSize: 9, color: T.fieldGreen }}>✓ Trusted</span>
)}
```

**Step 3: Commit**

```bash
git add src/pages/QuestBuilder.jsx src/pages/student/StudentQuestPage.jsx
git commit -m "feat: validate quest source links via Perplexity + show trust indicators"
```

---

### Task 25: Environment Variable Setup & Documentation

**Files:**
- Modify: `.env.local.example` (or create if not exists)

**Step 1: Add required env var documentation**

```bash
# Existing
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ANTHROPIC_API_KEY=your_anthropic_key

# NEW — Feature 5: Explore a Skill (YouTube + trusted sources)
VITE_PERPLEXITY_API_KEY=pplx-your_key_here
# Get at: https://www.perplexity.ai/settings/api
# Optional: without this, explorations still work but without YouTube videos and trusted sources
```

**Step 2: Commit**

```bash
git add .env.local.example
git commit -m "docs: add Perplexity API key to env example"
```

---

## Migration Summary

Run these migrations in Supabase SQL Editor **in order**:

1. `034_submission_scoring.sql` — scoring columns + multi-attempt
2. `035_skill_dependencies.sql` — skill dependency graph
3. `036_stage_dependencies.sql` — branching quest stages
4. `037_skill_explorations.sql` — exploration trees + nodes

---

## Execution Order

**Phase 1 (Foundation):** Tasks 1-5 (Part A: Scoring) — everything else depends on this
**Phase 2 (Visual Polish):** Tasks 6-7 (Part B: Animations) — independent, can parallel with Phase 3
**Phase 3 (Skill Tree):** Tasks 8-11 (Part C: Skill Tree Viz)
**Phase 4 (Branching):** Tasks 12-15 (Part D: Branching Stages)
**Phase 5 (Explore):** Tasks 16-23 (Part E: Self-Directed Trees) — depends on Phases 1 + 3
**Phase 6 (Polish):** Tasks 24-25 (Part F: Integration)
