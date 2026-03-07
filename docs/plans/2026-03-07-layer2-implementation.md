# Layer 2: Architectural & Feature Shifts — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Truth Protocol (source citations), Yearly Planning Mode, Real-World Problem Integration, and Optional Career Pathways to the Wayfinder experimental branch.

**Architecture:** Four features built in dependency order: Truth Protocol first (infrastructure), then Year Plan (largest feature), then Real-World Integration (builds on citations), then Career Pathways (additive). Each adds new DB tables, API functions, UI pages/components, and AI prompt extensions.

**Tech Stack:** React + Vite, Supabase PostgreSQL, CSS custom properties, lucide-react icons, @anthropic-ai/sdk + Gemini dual provider

---

## Part A: Truth Protocol (L2.5) — Tasks 1-5

### Task 1: Source Trust Domain List & TrustBadge Component

**Files:**
- Create: `src/lib/trustDomains.js`
- Create: `src/components/ui/TrustBadge.jsx`

**Step 1: Create trust domain list**

```javascript
// src/lib/trustDomains.js

// Tier 1: auto-trusted (green)
const TIER_1_DOMAINS = new Set([
  'gov', 'edu', 'mil',
]);
const TIER_1_PUBLISHERS = new Set([
  'ap news', 'reuters', 'bbc', 'nytimes', 'washingtonpost', 'nature.com',
  'science.org', 'pubmed', 'ncbi.nlm.nih.gov', 'cdc.gov', 'epa.gov',
  'nasa.gov', 'smithsonian', 'nationalgeographic', 'britannica',
]);

// Tier 2: review suggested (yellow)
const TIER_2_DOMAINS = new Set([
  'org', 'wikipedia.org', 'khanacademy.org',
]);

export function getTrustTier(url) {
  if (!url) return 'unknown';
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const tld = hostname.split('.').pop();
    const domain = hostname.replace(/^www\./, '');

    // Check Tier 1
    if (TIER_1_DOMAINS.has(tld)) return 'trusted';
    for (const pub of TIER_1_PUBLISHERS) {
      if (domain.includes(pub)) return 'trusted';
    }

    // Check Tier 2
    if (TIER_2_DOMAINS.has(tld)) return 'review';
    for (const d of TIER_2_DOMAINS) {
      if (domain.includes(d)) return 'review';
    }

    // Everything else is Tier 3
    return 'unverified';
  } catch {
    return 'unknown';
  }
}

export function getTrustColor(tier) {
  switch (tier) {
    case 'trusted': return 'var(--field-green)';
    case 'review': return 'var(--compass-gold)';
    case 'unverified': return 'var(--specimen-red)';
    case 'verified_by_guide': return 'var(--lab-blue)';
    default: return 'var(--pencil)';
  }
}

export function getTrustLabel(tier) {
  switch (tier) {
    case 'trusted': return 'Trusted source';
    case 'review': return 'Review suggested';
    case 'unverified': return 'Unverified';
    case 'verified_by_guide': return 'Verified by guide';
    case 'incorrect': return 'Marked incorrect';
    default: return 'Unknown source';
  }
}
```

**Step 2: Create TrustBadge component**

```javascript
// src/components/ui/TrustBadge.jsx
import { useState } from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert, UserCheck, ExternalLink } from 'lucide-react';
import { getTrustColor, getTrustLabel } from '../../lib/trustDomains';

const TIER_ICONS = {
  trusted: ShieldCheck,
  review: AlertTriangle,
  unverified: ShieldAlert,
  verified_by_guide: UserCheck,
  incorrect: ShieldAlert,
  unknown: AlertTriangle,
};

export default function TrustBadge({ tier, url, sourceName, onOverride }) {
  const [hovered, setHovered] = useState(false);
  const color = getTrustColor(tier);
  const label = getTrustLabel(tier);
  const Icon = TIER_ICONS[tier] || AlertTriangle;

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 3 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Icon size={12} color={color} />
      {sourceName && (
        <span style={{
          fontSize: 10, color, fontFamily: 'var(--font-mono)',
          maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {sourceName}
        </span>
      )}

      {/* Tooltip */}
      {hovered && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          marginBottom: 6, padding: '6px 10px', borderRadius: 6,
          background: 'var(--ink)', color: 'var(--chalk)', fontSize: 11,
          fontFamily: 'var(--font-body)', whiteSpace: 'nowrap', zIndex: 100,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--lab-blue)', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}
              onClick={(e) => e.stopPropagation()}
            >
              View source <ExternalLink size={9} />
            </a>
          )}
          {onOverride && tier !== 'verified_by_guide' && tier !== 'incorrect' && (
            <div style={{ marginTop: 4, display: 'flex', gap: 6 }}>
              <button onClick={() => onOverride('verified_by_guide')}
                style={{ fontSize: 9, color: 'var(--lab-blue)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Mark verified
              </button>
              <button onClick={() => onOverride('incorrect')}
                style={{ fontSize: 9, color: 'var(--specimen-red)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Mark incorrect
              </button>
            </div>
          )}
        </div>
      )}
    </span>
  );
}
```

**Step 3: Commit**
```bash
git add src/lib/trustDomains.js src/components/ui/TrustBadge.jsx
git commit -m "feat: add trust domain system and TrustBadge component"
```

---

### Task 2: Truth Protocol — AI Prompt Updates

**Files:**
- Modify: `src/lib/api.js` (lines 304-330 WAYFINDER_SYSTEM_PROMPT)

**Step 1: Extend WAYFINDER_SYSTEM_PROMPT with citation instructions**

Find the `TRUTH & ACCURACY` section in WAYFINDER_SYSTEM_PROMPT (around line 321) and replace it with:

```
TRUTH & ACCURACY (TRUTH PROTOCOL):
- Never present unverified facts as truth. If you cannot cite a source, frame it as a question or hypothesis.
- When making factual claims, you MUST include a source citation in your response where possible.
- Format citations as: [Source Name](url) — embed naturally in text, not as footnotes.
- Source trust tiers:
  * Tier 1 (preferred): .gov, .edu, AP, Reuters, BBC, NYT, Nature, Science, PubMed, NASA, Smithsonian
  * Tier 2 (acceptable): .org, Wikipedia, Khan Academy, established organizations
  * Tier 3 (flag): personal blogs, social media, unknown sites — use only if no better source exists, and explicitly note "unverified"
- If you're unsure about something, say so. "I'm not sure about that — let's explore it together" is always acceptable.
- Prefer real-world examples from credible sources when available.
- When generating project content (stages, descriptions, guiding questions), include a "sources" array with any referenced materials:
  {"title": "Source title", "url": "https://...", "domain": "example.gov", "trust_level": "trusted|review|unverified"}
```

**Step 2: Add truth protocol instruction to ai.generateQuest()**

In the `ai.generateQuest()` system prompt (around line 458), add to the stage JSON schema:

```
"sources": [{"title": "Source name", "url": "full URL", "domain": "domain.tld", "trust_level": "trusted|review|unverified"}]
```

And add instruction: `For each stage, include a "sources" array with any real-world references used in the description, guiding questions, or deliverable. Prefer Tier 1 sources. If a stage uses no external references, use an empty array.`

**Step 3: Add truth protocol to ai.reviewSubmission() and ai.questHelp()**

In `ai.reviewSubmission()` (line ~569), add to the JSON response schema:
```
"sources_referenced": [{"title": "...", "url": "...", "trust_level": "trusted|review|unverified"}]
```

In `ai.questHelp()` (line ~536), add instruction:
`When making factual claims in your response, note the source. Format: "According to [Source](url), ...". If you cannot cite a source, say "Based on what I know" to signal it's AI-generated.`

**Step 4: Commit**
```bash
git add src/lib/api.js
git commit -m "feat: add Truth Protocol to AI system prompts with citation requirements"
```

---

### Task 3: Citation Storage — Database Migration

**Files:**
- Create: `supabase/migrations/024_truth_protocol.sql`

**Step 1: Create migration**

```sql
-- 024_truth_protocol.sql
-- Truth Protocol: source citations and guide overrides

-- Add sources JSONB to quest_stages (AI-generated references per stage)
ALTER TABLE quest_stages ADD COLUMN IF NOT EXISTS sources JSONB DEFAULT '[]';

-- Add sources JSONB to guide_messages (citations in Field Guide chat)
ALTER TABLE guide_messages ADD COLUMN IF NOT EXISTS sources JSONB DEFAULT '[]';

-- Add sources JSONB to submission_feedback (citations in AI feedback)
ALTER TABLE submission_feedback ADD COLUMN IF NOT EXISTS sources JSONB DEFAULT '[]';

-- Guide overrides on sources
CREATE TABLE IF NOT EXISTS source_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL CHECK (table_name IN ('quest_stages', 'guide_messages', 'submission_feedback')),
  record_id UUID NOT NULL,
  source_url TEXT NOT NULL,
  override_status TEXT NOT NULL CHECK (override_status IN ('verified_by_guide', 'incorrect')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_source_overrides_record ON source_overrides(table_name, record_id);

-- RLS
ALTER TABLE source_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY source_overrides_auth_manage ON source_overrides FOR ALL TO authenticated USING (true);
CREATE POLICY source_overrides_anon_read ON source_overrides FOR SELECT TO anon USING (true);
```

**Step 2: Commit**
```bash
git add supabase/migrations/024_truth_protocol.sql
git commit -m "feat: add Truth Protocol migration — sources columns and guide overrides"
```

**Step 3: Run migration in Supabase SQL Editor**

---

### Task 4: Citation API Functions

**Files:**
- Modify: `src/lib/api.js`

**Step 1: Add source override API**

Add after the `explorerLog` export:

```javascript
// ===================== SOURCE OVERRIDES (TRUTH PROTOCOL) =====================

export const sourceOverrides = {
  async getForRecord(tableName, recordId) {
    const { data, error } = await supabase
      .from('source_overrides')
      .select('*')
      .eq('table_name', tableName)
      .eq('record_id', recordId);
    if (error) { console.error('Get overrides error:', error); return []; }
    return data || [];
  },

  async set(guideId, tableName, recordId, sourceUrl, status, note = null) {
    const { data, error } = await supabase
      .from('source_overrides')
      .upsert({
        guide_id: guideId,
        table_name: tableName,
        record_id: recordId,
        source_url: sourceUrl,
        override_status: status,
        note,
      }, { onConflict: 'table_name,record_id,source_url' })
      .select()
      .single();
    if (error) { console.error('Set override error:', error); return null; }
    return data;
  },
};
```

**Step 2: Commit**
```bash
git add src/lib/api.js
git commit -m "feat: add source override API for Truth Protocol"
```

---

### Task 5: Wire Citations into QuestBuilder Step 5 (Review)

**Files:**
- Modify: `src/pages/QuestBuilder.jsx`

**Step 1: Import TrustBadge**

Add to imports at top of QuestBuilder.jsx:
```javascript
import TrustBadge from '../components/ui/TrustBadge';
import { getTrustTier } from '../lib/trustDomains';
```

**Step 2: Display citations in stage cards during review**

In the `Step6Review` component, find the stage accordion cards section (around line 2272 where deliverables are shown). After the deliverable section, add a sources section:

```jsx
{/* Sources */}
{s.sources?.length > 0 && (
  <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--parchment)', borderRadius: 8 }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
      Sources
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {s.sources.map((src, si) => (
        <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <TrustBadge
            tier={src.trust_level || getTrustTier(src.url)}
            url={src.url}
            sourceName={src.title || src.domain}
          />
          <a href={src.url} target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--lab-blue)', fontSize: 11, textDecoration: 'none' }}>
            {src.title || src.url}
          </a>
        </div>
      ))}
    </div>
  </div>
)}
```

**Step 3: Save sources when saving quest stages**

In the `saveQuest()` function (around line 2847), add `sources` to the stage insert:

Find:
```javascript
stretch_challenge: s.stretch_challenge || null,
status: i === 0 ? 'active' : 'locked',
```

Replace with:
```javascript
stretch_challenge: s.stretch_challenge || null,
sources: Array.isArray(s.sources) ? s.sources : [],
status: i === 0 ? 'active' : 'locked',
```

**Step 4: Commit**
```bash
git add src/pages/QuestBuilder.jsx
git commit -m "feat: display and save source citations in QuestBuilder review"
```

---

## Part B: Yearly Planning Mode (L2.1) — Tasks 6-14

### Task 6: Year Plan Database Tables

**Files:**
- Create: `supabase/migrations/025_year_plans.sql`

**Step 1: Create migration**

```sql
-- 025_year_plans.sql
-- Yearly Planning Mode: year plans and plan items

CREATE TABLE IF NOT EXISTS year_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  school_year TEXT NOT NULL, -- e.g. '2025-2026'
  title TEXT DEFAULT '',
  target_outcomes JSONB DEFAULT '[]', -- [{standard_code, label, subject}]
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (guide_id, student_id, school_year)
);

CREATE TABLE IF NOT EXISTS year_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES year_plans(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  target_standards JSONB DEFAULT '[]', -- [{code, label}]
  estimated_weeks INTEGER DEFAULT 2,
  interest_tags JSONB DEFAULT '[]', -- ["robotics", "ocean"]
  quest_id UUID REFERENCES quests(id) ON DELETE SET NULL, -- linked once generated
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'swapped')),
  month_target TEXT, -- e.g. 'September', 'Q1'
  ai_rationale TEXT, -- why AI suggested this
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_year_plans_guide ON year_plans(guide_id);
CREATE INDEX IF NOT EXISTS idx_year_plans_student ON year_plans(student_id);
CREATE INDEX IF NOT EXISTS idx_year_plan_items_plan ON year_plan_items(plan_id);

-- RLS
ALTER TABLE year_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY year_plans_guide_manage ON year_plans FOR ALL TO authenticated
  USING (guide_id = auth.uid());
CREATE POLICY year_plans_anon_read ON year_plans FOR SELECT TO anon USING (true);

ALTER TABLE year_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY year_plan_items_via_plan ON year_plan_items FOR ALL TO authenticated
  USING (plan_id IN (SELECT id FROM year_plans WHERE guide_id = auth.uid()));
CREATE POLICY year_plan_items_anon_read ON year_plan_items FOR SELECT TO anon USING (true);
```

**Step 2: Commit**
```bash
git add supabase/migrations/025_year_plans.sql
git commit -m "feat: add year_plans and year_plan_items tables (migration 025)"
```

**Step 3: Run migration in Supabase SQL Editor**

---

### Task 7: Year Plan API Layer

**Files:**
- Modify: `src/lib/api.js`

**Step 1: Add year plan CRUD functions**

Add after the `sourceOverrides` export:

```javascript
// ===================== YEAR PLANS =====================

export const yearPlans = {
  async getForGuide(guideId) {
    const { data, error } = await supabase
      .from('year_plans')
      .select('*, students(id, name, avatar_emoji), year_plan_items(*)')
      .eq('guide_id', guideId)
      .order('created_at', { ascending: false });
    if (error) { console.error('Get year plans error:', error); return []; }
    return data || [];
  },

  async getById(planId) {
    const { data, error } = await supabase
      .from('year_plans')
      .select('*, students(id, name, avatar_emoji, about_me, passions, interests), year_plan_items(*, quests(id, title, status))')
      .eq('id', planId)
      .single();
    if (error) { console.error('Get year plan error:', error); return null; }
    // Sort items by position
    if (data?.year_plan_items) {
      data.year_plan_items.sort((a, b) => a.position - b.position);
    }
    return data;
  },

  async create(guideId, studentId, schoolId, schoolYear) {
    const { data, error } = await supabase
      .from('year_plans')
      .insert({ guide_id: guideId, student_id: studentId, school_id: schoolId, school_year: schoolYear })
      .select()
      .single();
    if (error) { console.error('Create year plan error:', error); return null; }
    return data;
  },

  async update(planId, updates) {
    const { data, error } = await supabase
      .from('year_plans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', planId)
      .select()
      .single();
    if (error) { console.error('Update year plan error:', error); return null; }
    return data;
  },

  async delete(planId) {
    const { error } = await supabase.from('year_plans').delete().eq('id', planId);
    if (error) { console.error('Delete year plan error:', error); }
    return !error;
  },
};

export const yearPlanItems = {
  async add(planId, item) {
    const { data, error } = await supabase
      .from('year_plan_items')
      .insert({ plan_id: planId, ...item })
      .select()
      .single();
    if (error) { console.error('Add plan item error:', error); return null; }
    return data;
  },

  async update(itemId, updates) {
    const { data, error } = await supabase
      .from('year_plan_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single();
    if (error) { console.error('Update plan item error:', error); return null; }
    return data;
  },

  async remove(itemId) {
    const { error } = await supabase.from('year_plan_items').delete().eq('id', itemId);
    if (error) { console.error('Remove plan item error:', error); }
    return !error;
  },

  async reorder(planId, orderedIds) {
    // Update positions in batch
    const updates = orderedIds.map((id, i) =>
      supabase.from('year_plan_items').update({ position: i }).eq('id', id)
    );
    await Promise.all(updates);
  },

  async linkToQuest(itemId, questId) {
    return this.update(itemId, { quest_id: questId, status: 'active' });
  },
};
```

**Step 2: Add AI generation functions for year plans**

Add to the `ai` object:

```javascript
async generateYearPlan(studentProfile, outcomes, existingCoverage = []) {
  const systemPrompt = `You are a year-plan advisor for a learner-driven school. Generate project IDEAS (not full projects) for a student's year. Each idea should be compelling, age-appropriate, and cover specific learning outcomes.

IMPORTANT:
- Generate 15-20 diverse project ideas
- Each should target 2-4 specific outcomes from the provided list
- Consider the student's interests, passions, and skill levels
- Vary project types: hands-on, digital, mixed
- Include estimated duration (1-4 weeks each)
- Flag which outcomes are NOT yet covered so the guide can fill gaps
- Include sources for any real-world problems referenced

Return ONLY valid JSON.`;

  const userMessage = `Student: ${studentProfile.name}
Age/Grade: ${studentProfile.age || 'unknown'} / ${studentProfile.grade_band || 'unknown'}
Interests: ${studentProfile.interests?.join(', ') || studentProfile.passions?.join(', ') || 'not specified'}
About: ${studentProfile.about_me || 'not specified'}

Target outcomes for the year:
${outcomes.map(o => `- ${o.standard_code || o.label}: ${o.label || o.standard_description || ''}`).join('\n')}

Already covered by existing projects:
${existingCoverage.length ? existingCoverage.map(c => `- ${c.label}`).join('\n') : 'None yet'}

Generate 15-20 project ideas as JSON:
[{
  "title": "Project title",
  "description": "2-3 sentence description",
  "target_standards": [{"code": "std_code", "label": "Standard label"}],
  "estimated_weeks": 2,
  "interest_tags": ["tag1", "tag2"],
  "interest_alignment": 0.85,
  "rationale": "Why this project fits this student",
  "month_suggestion": "September",
  "sources": [{"title": "...", "url": "...", "trust_level": "trusted|review|unverified"}]
}]`;

  const raw = await callAI({ systemPrompt, userMessage, maxTokens: 4096 });
  try {
    const parsed = JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
},

async reassessYearPlan(planItems, completedQuests, remainingOutcomes, studentProfile) {
  const systemPrompt = `You reassess a student's year plan after project completion. Suggest swaps or adjustments based on what was learned, what's still needed, and how the student has grown.

Return ONLY valid JSON.`;

  const userMessage = `Student: ${studentProfile.name}
Current plan items: ${JSON.stringify(planItems.map(i => ({ title: i.title, status: i.status, target_standards: i.target_standards })))}

Recently completed:
${completedQuests.map(q => `- "${q.title}" — covered: ${q.academic_standards?.join(', ') || 'unknown'}`).join('\n')}

Remaining uncovered outcomes:
${remainingOutcomes.map(o => `- ${o.label}`).join('\n')}

Suggest adjustments as JSON:
{
  "assessment": "1-2 sentence overview of progress",
  "swap_suggestions": [{"remove_item_title": "...", "replace_with": {"title": "...", "description": "...", "target_standards": [...], "rationale": "..."}}],
  "additions": [{"title": "...", "description": "...", "target_standards": [...], "rationale": "..."}],
  "coverage_after": {"covered_count": N, "total_count": N, "gaps": ["uncovered outcome labels"]}
}`;

  const raw = await callAI({ systemPrompt, userMessage, maxTokens: 2048 });
  try {
    return JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
  } catch { return { assessment: 'Unable to assess at this time.', swap_suggestions: [], additions: [], coverage_after: null }; }
},
```

**Step 3: Commit**
```bash
git add src/lib/api.js
git commit -m "feat: add Year Plan API layer and AI generation functions"
```

---

### Task 8: Year Plan Page — Setup, Route, and Nav

**Files:**
- Create: `src/pages/YearPlan.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/layout/TopBar.jsx`

**Step 1: Add route in App.jsx**

Find the protected routes section. Add after the `/students/:id` route:

```javascript
<Route path="/yearplan" element={<ProtectedRoute><YearPlan /></ProtectedRoute>} />
<Route path="/yearplan/:planId" element={<ProtectedRoute><YearPlan /></ProtectedRoute>} />
```

Add import at top:
```javascript
import YearPlan from './pages/YearPlan';
```

**Step 2: Add nav item in TopBar.jsx**

In the `NAV_LINKS` array (line 14-18), add:
```javascript
{ label: 'Year Plan', to: '/yearplan' },
```

So it becomes:
```javascript
const NAV_LINKS = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Year Plan', to: '/yearplan' },
  { label: 'Library', to: '/library' },
  { label: 'Students', to: '/students' },
];
```

**Step 3: Create YearPlan.jsx scaffold**

```javascript
// src/pages/YearPlan.jsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus, Loader2, AlertCircle, ChevronDown, Map, CalendarDays,
  List, LayoutGrid, Sparkles, GripVertical, Trash2, ArrowRight,
  RefreshCw, CheckCircle, Target, Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { yearPlans, yearPlanItems, ai } from '../lib/api';
import TrustBadge from '../components/ui/TrustBadge';
import { getTrustTier } from '../lib/trustDomains';
import TopBar from '../components/layout/TopBar';

export default function YearPlan() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [plans, setPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [view, setView] = useState(() => localStorage.getItem('yearplan_view') || 'list');
  const [suggestions, setSuggestions] = useState([]);

  // Load plans and students
  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      setLoading(true);
      const [plansData, { data: studentsData }] = await Promise.all([
        yearPlans.getForGuide(user.id),
        supabase.from('students').select('id, name, avatar_emoji, about_me, passions, interests, grade_band')
          .eq('guide_id', user.id).order('name'),
      ]);
      setPlans(plansData);
      setStudents(studentsData || []);

      if (planId) {
        const plan = await yearPlans.getById(planId);
        setActivePlan(plan);
      }
      setLoading(false);
    };
    load();
  }, [user?.id, planId]);

  // Create new plan
  const handleCreatePlan = async (studentId) => {
    const student = students.find(s => s.id === studentId);
    if (!student || !profile?.school_id) return;
    const currentYear = new Date().getFullYear();
    const schoolYear = `${currentYear}-${currentYear + 1}`;
    const plan = await yearPlans.create(user.id, studentId, profile.school_id, schoolYear);
    if (plan) navigate(`/yearplan/${plan.id}`);
  };

  // Generate AI suggestions
  const handleGenerate = async () => {
    if (!activePlan || generating) return;
    setGenerating(true);
    const student = activePlan.students;

    // Get student's target outcomes
    const { data: standards } = await supabase
      .from('student_standards')
      .select('*')
      .eq('student_id', activePlan.student_id)
      .eq('status', 'active');

    const existingCoverage = (activePlan.year_plan_items || [])
      .filter(i => i.status === 'completed')
      .flatMap(i => i.target_standards || []);

    const ideas = await ai.generateYearPlan(student, standards || [], existingCoverage);
    setSuggestions(ideas);
    setGenerating(false);
  };

  // Add suggestion to plan
  const handleAddSuggestion = async (suggestion) => {
    if (!activePlan) return;
    const currentItems = activePlan.year_plan_items || [];
    const item = await yearPlanItems.add(activePlan.id, {
      position: currentItems.length,
      title: suggestion.title,
      description: suggestion.description,
      target_standards: suggestion.target_standards,
      estimated_weeks: suggestion.estimated_weeks,
      interest_tags: suggestion.interest_tags,
      month_target: suggestion.month_suggestion,
      ai_rationale: suggestion.rationale,
    });
    if (item) {
      setActivePlan(prev => ({
        ...prev,
        year_plan_items: [...(prev.year_plan_items || []), item],
      }));
      setSuggestions(prev => prev.filter(s => s.title !== suggestion.title));
    }
  };

  // Remove item from plan
  const handleRemoveItem = async (itemId) => {
    await yearPlanItems.remove(itemId);
    setActivePlan(prev => ({
      ...prev,
      year_plan_items: (prev.year_plan_items || []).filter(i => i.id !== itemId),
    }));
  };

  // "Generate Now" — go to QuestBuilder pre-filled
  const handleGenerateNow = (item) => {
    sessionStorage.setItem('yearplan_prefill', JSON.stringify({
      title: item.title,
      description: item.description,
      standards: item.target_standards,
      planItemId: item.id,
    }));
    navigate('/quest/new');
  };

  // Save view preference
  useEffect(() => {
    localStorage.setItem('yearplan_view', view);
  }, [view]);

  // Coverage calculation
  const allOutcomes = activePlan?.target_outcomes || [];
  const items = activePlan?.year_plan_items || [];
  const coveredCodes = new Set(items.flatMap(i => (i.target_standards || []).map(s => s.code)));
  const coveragePct = allOutcomes.length > 0
    ? Math.round((allOutcomes.filter(o => coveredCodes.has(o.standard_code || o.code)).length / allOutcomes.length) * 100)
    : 0;

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <TopBar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <Loader2 size={20} color="var(--graphite)" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    </div>
  );

  // Plan selector (no active plan)
  if (!activePlan) return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <TopBar />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--ink)', marginBottom: 8 }}>
          Year Plans
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--graphite)', marginBottom: 32 }}>
          Map out a full year of projects for each learner.
        </p>

        {/* Existing plans */}
        {plans.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
            {plans.map(plan => (
              <div key={plan.id} onClick={() => navigate(`/yearplan/${plan.id}`)}
                style={{
                  background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 12,
                  padding: 20, cursor: 'pointer', transition: 'box-shadow 150ms',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>{plan.students?.avatar_emoji || '🧭'}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--ink)' }}>
                    {plan.students?.name}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>
                  {plan.school_year} · {plan.year_plan_items?.length || 0} projects
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create new plan */}
        <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12, color: 'var(--graphite)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
          Start a new year plan
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {students.map(s => (
            <button key={s.id} onClick={() => handleCreatePlan(s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
                background: 'var(--chalk)', border: '1.5px dashed var(--pencil)', borderRadius: 10,
                cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink)',
                transition: 'all 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--compass-gold)'; e.currentTarget.style.background = 'rgba(184,134,11,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--pencil)'; e.currentTarget.style.background = 'var(--chalk)'; }}
            >
              <span>{s.avatar_emoji || '👤'}</span>
              <span>{s.name}</span>
              <Plus size={14} color="var(--graphite)" style={{ marginLeft: 'auto' }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Active plan view
  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <TopBar />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 48px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 22 }}>{activePlan.students?.avatar_emoji || '🧭'}</span>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--ink)', margin: 0 }}>
                {activePlan.students?.name}'s Year Plan
              </h1>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--graphite)' }}>
              {activePlan.school_year}
            </span>
          </div>

          {/* View switcher */}
          <div style={{ display: 'flex', gap: 2, background: 'var(--parchment)', borderRadius: 8, padding: 2 }}>
            {[
              { key: 'list', icon: List, label: 'List' },
              { key: 'timeline', icon: LayoutGrid, label: 'Timeline' },
              { key: 'calendar', icon: CalendarDays, label: 'Calendar' },
              { key: 'map', icon: Map, label: 'Map' },
            ].map(v => (
              <button key={v.key} onClick={() => setView(v.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
                  borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600,
                  fontFamily: 'var(--font-body)', cursor: 'pointer',
                  background: view === v.key ? 'var(--chalk)' : 'transparent',
                  color: view === v.key ? 'var(--ink)' : 'var(--graphite)',
                  boxShadow: view === v.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}>
                <v.icon size={12} />
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          {/* Main content */}
          <div style={{ flex: 1 }}>
            {/* Generate button */}
            <button onClick={handleGenerate} disabled={generating}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '14px 20px', marginBottom: 20,
                background: generating ? 'var(--parchment)' : 'rgba(184,134,11,0.06)',
                border: '1.5px dashed var(--compass-gold)', borderRadius: 10,
                cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)',
                fontSize: 13, fontWeight: 600, color: 'var(--ink)',
              }}>
              {generating ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={16} color="var(--compass-gold)" />}
              {generating ? 'Generating project ideas...' : 'Suggest Projects with AI'}
            </button>

            {/* AI suggestions */}
            {suggestions.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12, color: 'var(--compass-gold)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  AI Suggestions ({suggestions.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {suggestions.map((s, i) => (
                    <div key={i} style={{
                      padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(184,134,11,0.3)',
                      background: 'rgba(184,134,11,0.03)', display: 'flex', gap: 12, alignItems: 'flex-start',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--ink)', marginBottom: 4 }}>{s.title}</div>
                        <p style={{ fontSize: 12, color: 'var(--graphite)', margin: '0 0 6px', lineHeight: 1.5 }}>{s.description}</p>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {(s.interest_tags || []).map(t => (
                            <span key={t} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'var(--parchment)', color: 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>{t}</span>
                          ))}
                          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'var(--parchment)', color: 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>
                            ~{s.estimated_weeks}w
                          </span>
                        </div>
                        {s.sources?.length > 0 && (
                          <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {s.sources.map((src, si) => (
                              <TrustBadge key={si} tier={src.trust_level || getTrustTier(src.url)} url={src.url} sourceName={src.title} />
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={() => handleAddSuggestion(s)}
                        style={{
                          padding: '6px 12px', borderRadius: 6, border: 'none',
                          background: 'var(--compass-gold)', color: 'var(--ink)',
                          fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                        }}>
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Plan items — List view (default) */}
            {view === 'list' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.length === 0 && !generating && (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--pencil)', fontSize: 13 }}>
                    No projects in the plan yet. Click "Suggest Projects with AI" to get started.
                  </div>
                )}
                {items.map((item, i) => (
                  <div key={item.id} style={{
                    background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 10,
                    padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0, paddingTop: 2 }}>
                      <GripVertical size={14} color="var(--pencil)" />
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--pencil)' }}>{i + 1}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--ink)' }}>{item.title}</span>
                        {item.status === 'completed' && <CheckCircle size={14} color="var(--field-green)" />}
                        {item.quest_id && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'var(--field-green)', color: 'var(--chalk)', fontFamily: 'var(--font-mono)' }}>Generated</span>}
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--graphite)', margin: '0 0 6px', lineHeight: 1.5 }}>{item.description}</p>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                        {item.month_target && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'var(--parchment)', color: 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>{item.month_target}</span>}
                        <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'var(--parchment)', color: 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>~{item.estimated_weeks}w</span>
                        {(item.target_standards || []).slice(0, 2).map(s => (
                          <span key={s.code} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(27,73,101,0.08)', color: 'var(--lab-blue)', fontFamily: 'var(--font-mono)' }}>{s.label?.slice(0, 30) || s.code}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                      {!item.quest_id && (
                        <button onClick={() => handleGenerateNow(item)}
                          title="Generate this project"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
                            borderRadius: 6, border: 'none', background: 'var(--ink)', color: 'var(--chalk)',
                            fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          }}>
                          <ArrowRight size={11} /> Generate
                        </button>
                      )}
                      <button onClick={() => handleRemoveItem(item.id)}
                        title="Remove from plan"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px',
                          borderRadius: 6, border: '1px solid var(--pencil)', background: 'transparent',
                          color: 'var(--graphite)', cursor: 'pointer',
                        }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Timeline view placeholder */}
            {view === 'timeline' && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--pencil)', fontSize: 13 }}>
                Timeline view — coming in next iteration
              </div>
            )}

            {/* Calendar view placeholder */}
            {view === 'calendar' && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--pencil)', fontSize: 13 }}>
                Calendar view — coming in next iteration
              </div>
            )}

            {/* Map view placeholder */}
            {view === 'map' && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--pencil)', fontSize: 13 }}>
                Journey Map view — coming in next iteration
              </div>
            )}
          </div>

          {/* Coverage sidebar */}
          <div style={{ width: 240, flexShrink: 0, position: 'sticky', top: 72 }}>
            <div style={{ background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Target size={14} color="var(--lab-blue)" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--lab-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Coverage
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--graphite)' }}>Outcomes covered</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{coveragePct}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--parchment)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${coveragePct}%`, background: 'var(--lab-blue)', borderRadius: 3, transition: 'width 400ms ease' }} />
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--graphite)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Projects planned</span>
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{items.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total weeks</span>
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{items.reduce((sum, i) => sum + (i.estimated_weeks || 0), 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Generated</span>
                  <span style={{ fontWeight: 600, color: 'var(--field-green)' }}>{items.filter(i => i.quest_id).length}</span>
                </div>
              </div>

              {/* Reassess button */}
              {items.filter(i => i.status === 'completed').length > 0 && (
                <button onClick={async () => {
                  setGenerating(true);
                  const result = await ai.reassessYearPlan(
                    items, items.filter(i => i.quest_id && i.status === 'completed'),
                    allOutcomes.filter(o => !coveredCodes.has(o.standard_code || o.code)),
                    activePlan.students
                  );
                  if (result.swap_suggestions?.length || result.additions?.length) {
                    setSuggestions([
                      ...result.swap_suggestions.map(s => ({ ...s.replace_with, rationale: `Swap for "${s.remove_item_title}": ${s.replace_with.rationale}` })),
                      ...result.additions,
                    ]);
                  }
                  setGenerating(false);
                }}
                  disabled={generating}
                  style={{
                    marginTop: 12, width: '100%', padding: '8px',
                    borderRadius: 6, border: '1px solid var(--pencil)', background: 'transparent',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--graphite)',
                  }}>
                  <RefreshCw size={11} /> Reassess Plan
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Commit**
```bash
git add src/pages/YearPlan.jsx src/App.jsx src/components/layout/TopBar.jsx
git commit -m "feat: add Year Plan page with list view, AI suggestions, and coverage meter"
```

---

### Task 9: QuestBuilder — Prefill from Year Plan

**Files:**
- Modify: `src/pages/QuestBuilder.jsx`

**Step 1: Read yearplan prefill from sessionStorage on mount**

In the QuestBuilder component, find the state initialization area (around line 2574). Add after the existing state init:

```javascript
// Check for Year Plan prefill
useEffect(() => {
  try {
    const prefill = sessionStorage.getItem('yearplan_prefill');
    if (prefill) {
      const data = JSON.parse(prefill);
      sessionStorage.removeItem('yearplan_prefill');
      // Store for later: when quest is saved, link back to plan item
      yearPlanItemRef.current = data.planItemId || null;
      // Could pre-fill additional context with the title/description
      if (data.title) {
        setAdditionalContext(prev => prev ? prev : `Project idea: "${data.title}" — ${data.description || ''}`);
      }
    }
  } catch {}
}, []);
```

Add ref at top of component:
```javascript
const yearPlanItemRef = useRef(null);
```

**Step 2: Link quest to year plan item after save**

In `saveQuest()`, after the quest is successfully saved (after `return quest.id`), add before the return:

```javascript
// Link back to year plan if this was generated from one
if (yearPlanItemRef.current) {
  yearPlanItems.linkToQuest(yearPlanItemRef.current, quest.id).catch(console.warn);
  yearPlanItemRef.current = null;
}
```

Add import at top:
```javascript
import { yearPlanItems } from '../lib/api';
```

**Step 3: Commit**
```bash
git add src/pages/QuestBuilder.jsx
git commit -m "feat: support Year Plan prefill in QuestBuilder with plan item linking"
```

---

## Part C: Real-World Problem Integration (L2.2) — Tasks 10-12

### Task 10: Web Search Helper Function

**Files:**
- Modify: `src/lib/api.js`

**Step 1: Add searchRealWorldProblems function to ai object**

This uses the AI's tool_use capability to search for real problems. Since we can't call external search APIs directly from the browser, we ask the AI to generate sourced content and explicitly tag source reliability.

```javascript
async searchRealWorldProblems(topic, standards, interests) {
  const systemPrompt = `You find REAL, current, verifiable problems and stakeholders related to a topic. Your role is to provide factual context that can be woven into educational projects.

CRITICAL: Only cite sources you are confident about. For each source:
- Include the full URL
- Include the organization/publisher name
- Tag trust_level: "trusted" (.gov, .edu, major news), "review" (.org, Wikipedia), or "unverified" (other)
- If you're not confident a URL is real, use trust_level "unverified" and note it

Return ONLY valid JSON.`;

  const userMessage = `Topic: ${topic}
Standards: ${standards?.join(', ') || 'general'}
Student interests: ${interests?.join(', ') || 'not specified'}

Find 5-8 real-world problems, stakeholders, and data points. Return JSON:
[{
  "problem": "Brief description of the real-world problem",
  "stakeholders": ["Organization 1", "Person/Role 2"],
  "data_point": "A specific statistic or fact",
  "location": "City/State/Country if applicable",
  "sources": [{"title": "Source name", "url": "https://...", "domain": "example.gov", "trust_level": "trusted|review|unverified"}],
  "connection_to_topic": "How this connects to the project topic"
}]`;

  const raw = await callAI({ systemPrompt, userMessage, maxTokens: 2048 });
  try {
    const parsed = JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
},
```

**Step 2: Commit**
```bash
git add src/lib/api.js
git commit -m "feat: add AI real-world problem search function"
```

---

### Task 11: Wire Real-World Toggle into QuestBuilder

**Files:**
- Modify: `src/pages/QuestBuilder.jsx`

**Step 1: Add "Use Real-World Problems" toggle to Step 4 (Anything Else)**

Find the Step4 component (around line 1704). Read its current content.

Add a toggle above the additional context textarea:

```jsx
{/* Real-World Problems toggle */}
<div style={{
  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
  background: 'var(--parchment)', borderRadius: 10, marginBottom: 16,
}}>
  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
    <input type="checkbox" checked={useRealWorld}
      onChange={(e) => setUseRealWorld(e.target.checked)}
      style={{ width: 16, height: 16, accentColor: 'var(--field-green)' }}
    />
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-body)' }}>
        Ground in real-world problems
      </div>
      <div style={{ fontSize: 11, color: 'var(--graphite)' }}>
        AI will search for current problems, stakeholders, and data to weave into the project
      </div>
    </div>
  </label>
</div>
```

Add state:
```javascript
const [useRealWorld, setUseRealWorld] = useState(false);
```

**Step 2: Pass to generation and extend ai.generateQuest prompt**

In `runGeneration()` (around line 2766), pass `useRealWorld` to the AI call:

```javascript
const questData = await ai.generateQuest({
  students: selectedStudents,
  standards: standardsStr,
  pathway: pathwayLabels.join(', '),
  type: questType,
  count: selectedStudents.length,
  studentStandardsProfiles,
  additionalContext,
  useRealWorld,
});
```

In `ai.generateQuest()` in api.js, add parameter to the destructured args and extend the system prompt:

Add after the existing prompt text (around line 500):
```javascript
${params.useRealWorld ? `
REAL-WORLD INTEGRATION:
- Ground every stage in a REAL, current, verifiable problem.
- Include real stakeholders, organizations, data points, and news.
- Each stage must have a "sources" array with citations.
- Tag projects as "Verified Real World" if all sources are Tier 1/2.
- Weave real-world context naturally into descriptions and guiding questions — don't bolt it on.
` : ''}
```

**Step 3: Commit**
```bash
git add src/pages/QuestBuilder.jsx src/lib/api.js
git commit -m "feat: add real-world problem integration toggle in QuestBuilder"
```

---

### Task 12: Citation Display in Student Quest Page

**Files:**
- Modify: `src/pages/student/StudentQuestPage.jsx`

**Step 1: Import TrustBadge**

Add to imports:
```javascript
import TrustBadge from '../../components/ui/TrustBadge';
import { getTrustTier } from '../../lib/trustDomains';
```

**Step 2: Display sources in stage cards**

Find the StageCard component in StudentQuestPage. After the description section and before the deliverable, add:

```jsx
{/* Sources */}
{stage.sources?.length > 0 && (
  <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(27,73,101,0.04)', borderRadius: 6 }}>
    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
      Sources
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {stage.sources.map((src, i) => (
        <TrustBadge key={i} tier={src.trust_level || getTrustTier(src.url)} url={src.url} sourceName={src.title || src.domain} />
      ))}
    </div>
  </div>
)}
```

**Step 3: Commit**
```bash
git add src/pages/student/StudentQuestPage.jsx
git commit -m "feat: display source citations with trust badges in student stage view"
```

---

## Part D: Optional Career Pathways (L2.3) — Tasks 13-15

### Task 13: Career Insights Database Table

**Files:**
- Create: `supabase/migrations/026_career_pathways.sql`

**Step 1: Create migration**

```sql
-- 026_career_pathways.sql
-- Optional Career Pathways: career insights per student

CREATE TABLE IF NOT EXISTS student_career_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  career_title TEXT NOT NULL,
  description TEXT NOT NULL,
  reason TEXT NOT NULL, -- "Why this fits you"
  related_quest_ids JSONB DEFAULT '[]', -- UUIDs of quests that surfaced this
  source_urls JSONB DEFAULT '[]', -- [{title, url, trust_level}]
  category TEXT DEFAULT 'discovered' CHECK (category IN ('discovered', 'suggested', 'explored')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_career_insights_student ON student_career_insights(student_id);

ALTER TABLE student_career_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY career_insights_read ON student_career_insights FOR SELECT USING (true);
CREATE POLICY career_insights_anon_insert ON student_career_insights FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY career_insights_auth_manage ON student_career_insights FOR ALL TO authenticated USING (true);

-- Add career_insights_enabled to students (opt-in)
ALTER TABLE students ADD COLUMN IF NOT EXISTS career_insights_enabled BOOLEAN DEFAULT false;
```

**Step 2: Commit**
```bash
git add supabase/migrations/026_career_pathways.sql
git commit -m "feat: add student_career_insights table (migration 026)"
```

**Step 3: Run migration in Supabase SQL Editor**

---

### Task 14: Career API and AI Functions

**Files:**
- Modify: `src/lib/api.js`

**Step 1: Add career insights API**

```javascript
// ===================== CAREER INSIGHTS =====================

export const careerInsights = {
  async getForStudent(studentId) {
    const { data, error } = await supabase
      .from('student_career_insights')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    if (error) { console.error('Get career insights error:', error); return []; }
    return data || [];
  },

  async add(studentId, insight) {
    const { data, error } = await supabase
      .from('student_career_insights')
      .insert({ student_id: studentId, ...insight })
      .select()
      .single();
    if (error) { console.error('Add career insight error:', error); return null; }
    return data;
  },

  async bulkAdd(studentId, insights) {
    const rows = insights.map(i => ({ student_id: studentId, ...i }));
    const { data, error } = await supabase
      .from('student_career_insights')
      .insert(rows)
      .select();
    if (error) { console.error('Bulk add career insights error:', error); return []; }
    return data || [];
  },
};
```

**Step 2: Add AI function for career discovery**

Add to the `ai` object:

```javascript
async discoverCareers(studentProfile, completedQuests) {
  const systemPrompt = `You connect a student's project work to real career paths. Be inspiring, specific, and grounded.

RULES:
- Reference real careers, not made-up titles
- Explain WHY this student would be a good fit based on their demonstrated skills and interests
- Include real resources (Bureau of Labor Statistics, career videos, professional organizations) with URLs
- Keep it encouraging — these are possibilities, not prescriptions
- Age-appropriate descriptions for ages 8-14

Return ONLY valid JSON.`;

  const userMessage = `Student: ${studentProfile.name}
Interests: ${studentProfile.interests?.join(', ') || studentProfile.passions?.join(', ') || 'various'}
About: ${studentProfile.about_me || ''}
Skills shown: ${studentProfile.skills?.map(s => s.name).join(', ') || 'various'}

Completed projects:
${completedQuests.map(q => `- "${q.title}" (${q.career_pathway || 'general'})`).join('\n') || 'None yet'}

Suggest 5-8 career connections as JSON:
[{
  "career_title": "Environmental Engineer",
  "description": "1-2 sentences about what they do, kid-friendly",
  "reason": "Why this fits YOU specifically, referencing their work",
  "category": "discovered",
  "source_urls": [{"title": "BLS: Environmental Engineers", "url": "https://...", "trust_level": "trusted"}]
}]`;

  const raw = await callAI({ systemPrompt, userMessage, maxTokens: 2048 });
  try {
    const parsed = JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
},
```

**Step 3: Commit**
```bash
git add src/lib/api.js
git commit -m "feat: add career insights API and AI career discovery function"
```

---

### Task 15: Career Explorer Page

**Files:**
- Create: `src/pages/CareerExplorer.jsx`
- Modify: `src/App.jsx`

**Step 1: Add route**

In App.jsx, add in the student-facing routes section:
```javascript
<Route path="/careers/:studentId" element={<CareerExplorer />} />
```

Add import:
```javascript
import CareerExplorer from './pages/CareerExplorer';
```

**Step 2: Create CareerExplorer.jsx**

```javascript
// src/pages/CareerExplorer.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Compass, Sparkles, Loader2, ExternalLink, Briefcase, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { careerInsights, ai } from '../lib/api';
import TrustBadge from '../components/ui/TrustBadge';
import { getTrustTier } from '../lib/trustDomains';
import WayfinderLogoIcon from '../components/icons/WayfinderLogo';

export default function CareerExplorer() {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    const load = async () => {
      setLoading(true);
      const [{ data: studentData }, insightsData] = await Promise.all([
        supabase.from('students').select('*, student_skills(*, skills(*))').eq('id', studentId).single(),
        careerInsights.getForStudent(studentId),
      ]);
      setStudent(studentData);
      setInsights(insightsData);
      setLoading(false);
    };
    load();
  }, [studentId]);

  const handleDiscover = async () => {
    if (!student || discovering) return;
    setDiscovering(true);

    // Get completed quests
    const { data: questStudents } = await supabase
      .from('quest_students')
      .select('quests(id, title, career_pathway, status)')
      .eq('student_id', studentId);
    const completedQuests = (questStudents || [])
      .map(qs => qs.quests)
      .filter(q => q?.status === 'completed');

    const profile = {
      ...student,
      skills: student.student_skills?.map(ss => ss.skills) || [],
    };

    const newCareers = await ai.discoverCareers(profile, completedQuests);
    if (newCareers.length > 0) {
      const saved = await careerInsights.bulkAdd(studentId, newCareers.map(c => ({
        career_title: c.career_title,
        description: c.description,
        reason: c.reason,
        category: c.category || 'suggested',
        source_urls: c.source_urls || [],
        related_quest_ids: completedQuests.map(q => q.id),
      })));
      setInsights(prev => [...saved, ...prev]);
    }
    setDiscovering(false);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={20} color="var(--graphite)" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', fontFamily: 'var(--font-body)' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <header style={{
        height: 48, background: 'var(--chalk)', borderBottom: '1px solid var(--pencil)',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8,
      }}>
        <Link to={`/students/${studentId}`} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--graphite)', textDecoration: 'none', fontSize: 12 }}>
          <ArrowLeft size={14} /> Back to profile
        </Link>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <WayfinderLogoIcon size={16} color="var(--compass-gold)" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--ink)' }}>Career Explorer</span>
        </div>
      </header>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 28 }}>{student?.avatar_emoji || '🧭'}</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--ink)', margin: 0 }}>
            {student?.name}'s Career Map
          </h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--graphite)', marginBottom: 28 }}>
          Careers connected to your projects and interests. These are possibilities to explore — not predictions!
        </p>

        {/* Discover button */}
        <button onClick={handleDiscover} disabled={discovering}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '14px 20px', marginBottom: 24,
            background: discovering ? 'var(--parchment)' : 'rgba(184,134,11,0.06)',
            border: '1.5px dashed var(--compass-gold)', borderRadius: 10,
            cursor: discovering ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-body)',
          }}>
          {discovering ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={16} color="var(--compass-gold)" />}
          {discovering ? 'Discovering careers...' : 'Explore More Careers'}
        </button>

        {/* Career cards */}
        {insights.length === 0 && !discovering && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--pencil)' }}>
            <Briefcase size={32} color="var(--pencil)" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 13 }}>No career connections yet. Complete projects or click "Explore More" to discover careers!</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {insights.map(insight => (
            <div key={insight.id} style={{
              background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 12,
              padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Briefcase size={16} color="var(--lab-blue)" />
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--ink)', margin: 0 }}>
                  {insight.career_title}
                </h3>
              </div>
              <p style={{ fontSize: 12, color: 'var(--graphite)', lineHeight: 1.5, margin: 0 }}>
                {insight.description}
              </p>
              <div style={{
                padding: '8px 10px', background: 'rgba(184,134,11,0.06)', borderRadius: 6,
                fontSize: 12, color: 'var(--ink)', lineHeight: 1.5,
              }}>
                <strong style={{ color: 'var(--compass-gold)' }}>Why this fits you:</strong> {insight.reason}
              </div>
              {insight.source_urls?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {insight.source_urls.map((src, i) => (
                    <a key={i} href={src.url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--lab-blue)', textDecoration: 'none' }}>
                      <TrustBadge tier={src.trust_level || getTrustTier(src.url)} url={src.url} sourceName={src.title} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Add link to Career Explorer from StudentProfilePage**

In `src/pages/StudentProfilePage.jsx`, find where the profile actions are displayed and add:

```jsx
{student?.career_insights_enabled && (
  <Link to={`/careers/${student.id}`}
    style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
      borderRadius: 8, border: '1px solid var(--pencil)', background: 'var(--chalk)',
      color: 'var(--ink)', fontSize: 12, fontWeight: 600, textDecoration: 'none',
    }}>
    <Briefcase size={13} /> Career Explorer
  </Link>
)}
```

**Step 4: Commit**
```bash
git add src/pages/CareerExplorer.jsx src/App.jsx src/pages/StudentProfilePage.jsx
git commit -m "feat: add Career Explorer page with AI career discovery"
```

---

## Summary

| Part | Feature | Tasks | New Files | New Tables |
|------|---------|-------|-----------|------------|
| A | Truth Protocol | 1-5 | trustDomains.js, TrustBadge.jsx | source_overrides |
| B | Year Plan | 6-9 | YearPlan.jsx, 025_year_plans.sql | year_plans, year_plan_items |
| C | Real-World Integration | 10-12 | — | — (uses sources column from Task 3) |
| D | Career Pathways | 13-15 | CareerExplorer.jsx, 026_career_pathways.sql | student_career_insights |

**Total: 15 tasks, 3 migrations to run, 5 new files, 4 new DB tables**

**Dependencies:**
- Task 3 (migration 024) must run before Tasks 4-5
- Task 6 (migration 025) must run before Tasks 7-9
- Task 10 builds on Task 2 (truth protocol prompts)
- Task 13 (migration 026) must run before Tasks 14-15
