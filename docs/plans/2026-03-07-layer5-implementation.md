# Layer 5: Year Plan v2 & Branching Narratives — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Evolve the Year Plan into a smart outcome-balancing system with visual coverage matrix and exportable project packages. Transform linear quest progression into branching narrative trees where student choices determine their path — the first step toward the "Zelda for education" vision.

**Architecture:** Two features built in order: (A) Year Plan v2 — outcome balancing, coverage matrix, package export. (B) Branching Narratives — stage tree generation, branching SVG map, choice-driven progression. Both extend existing infrastructure rather than replacing it.

**Tech Stack:** React + Vite, Supabase PostgreSQL, SVG for branching map visualization, CSS custom properties, dual AI provider

**Design constraint for branching:** Max 2 branch points per quest, max 4 leaf endings. Branches can reconverge. This keeps generation tractable, SVG clean, and the student experience focused. Future layers can deepen branching.

---

## Part A: Year Plan v2 (L5.A) — Tasks 1-5

### Task 1: Year Plan v2 Migration + Balance API

**Files:**
- Create: `supabase/migrations/029_layer5_branching.sql`
- Modify: `src/lib/api.js`

**Step 1: Create migration**

This single migration covers all Layer 5 database needs — Year Plan v2 enhancements AND branching narrative tables.

```sql
-- 029_layer5_branching.sql
-- Layer 5: Year Plan v2 (outcome balancing, packages) + Branching Narratives

-- ============================================================
-- YEAR PLAN V2 — outcome domain tracking
-- ============================================================

-- Add domain coverage tracking to year_plan_items
ALTER TABLE year_plan_items ADD COLUMN IF NOT EXISTS domain_coverage JSONB DEFAULT '{}';
  -- Format: { "math": ["standard1","standard2"], "ela": ["standard3"], "science": [] }

-- Year Plan Packages — exportable multi-project bundles
CREATE TABLE IF NOT EXISTS year_plan_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES year_plans(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  grade_band TEXT,
  items_snapshot JSONB NOT NULL DEFAULT '[]',
    -- Frozen copy of plan items at export time
  target_outcomes JSONB DEFAULT '[]',
  total_weeks INTEGER DEFAULT 0,
  avg_rating NUMERIC(2,1) DEFAULT 0,
  import_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE year_plan_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY year_plan_packages_read ON year_plan_packages FOR SELECT USING (true);
CREATE POLICY year_plan_packages_auth_manage ON year_plan_packages FOR ALL TO authenticated USING (true);

-- ============================================================
-- BRANCHING NARRATIVES — stage tree structure
-- ============================================================

-- Stage branches define what happens after a choice
-- A choice_fork stage can have 2-3 branches, each leading to a different next stage
CREATE TABLE IF NOT EXISTS stage_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES quest_stages(id) ON DELETE CASCADE,
  branch_index INTEGER NOT NULL,         -- 0, 1, 2 (which choice)
  branch_label TEXT NOT NULL,            -- "Investigate the river"
  branch_description TEXT,               -- "Follow the water source to find..."
  next_stage_id UUID REFERENCES quest_stages(id) ON DELETE SET NULL,
  narrative_variant TEXT,                -- Different narrative for this branch
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(stage_id, branch_index)
);

CREATE INDEX IF NOT EXISTS idx_stage_branches_stage ON stage_branches(stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_branches_next ON stage_branches(next_stage_id);

-- Student path choices — which branch each student took
CREATE TABLE IF NOT EXISTS student_stage_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES quest_stages(id) ON DELETE CASCADE,
  chosen_branch_index INTEGER NOT NULL,
  chosen_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, quest_id, stage_id)
);

CREATE INDEX IF NOT EXISTS idx_student_paths_student_quest ON student_stage_paths(student_id, quest_id);

-- Add is_branching flag to quests for easy filtering
ALTER TABLE quests ADD COLUMN IF NOT EXISTS is_branching BOOLEAN DEFAULT false;

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE stage_branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY stage_branches_read ON stage_branches FOR SELECT USING (true);
CREATE POLICY stage_branches_auth_manage ON stage_branches FOR ALL TO authenticated USING (true);
CREATE POLICY stage_branches_anon_insert ON stage_branches FOR INSERT TO anon WITH CHECK (true);

ALTER TABLE student_stage_paths ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_stage_paths_read ON student_stage_paths FOR SELECT USING (true);
CREATE POLICY student_stage_paths_anon_insert ON student_stage_paths FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY student_stage_paths_anon_update ON student_stage_paths FOR UPDATE TO anon USING (true);
```

**Step 2: Add Year Plan balance API**

In `src/lib/api.js`, add:

```javascript
// ===================== YEAR PLAN PACKAGES =====================

export const yearPlanPackages = {
  async list(schoolId) {
    const { data, error } = await supabase
      .from('year_plan_packages')
      .select('*, created_by_profile:profiles!year_plan_packages_created_by_fkey(id, full_name)')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  },

  async create(planId, schoolId, createdBy, { title, description, gradeBand, itemsSnapshot, targetOutcomes, totalWeeks }) {
    const { data, error } = await supabase
      .from('year_plan_packages')
      .insert({
        plan_id: planId, school_id: schoolId, created_by: createdBy,
        title, description, grade_band: gradeBand,
        items_snapshot: itemsSnapshot, target_outcomes: targetOutcomes,
        total_weeks: totalWeeks,
      })
      .select()
      .single();
    if (error) { console.error('Create package error:', error); return null; }
    return data;
  },

  async importToGuide(packageData, guideId, studentId, schoolId) {
    // Create a new year plan from the package
    const plan = await yearPlans.create(guideId, studentId, schoolId, new Date().getFullYear() + '');
    if (!plan) return null;
    // Add each item from the snapshot
    for (const item of packageData.items_snapshot || []) {
      await yearPlanItems.add(plan.id, {
        title: item.title,
        description: item.description,
        target_standards: item.target_standards,
        estimated_weeks: item.estimated_weeks,
        interest_tags: item.interest_tags,
        month_target: item.month_target,
        ai_rationale: item.ai_rationale,
        domain_coverage: item.domain_coverage || {},
      });
    }
    // Increment import count
    await supabase.from('year_plan_packages').update({ import_count: (packageData.import_count || 0) + 1 }).eq('id', packageData.id);
    return plan;
  },
};
```

Also add branching API:

```javascript
// ===================== STAGE BRANCHES =====================

export const stageBranches = {
  async getForQuest(questId) {
    const { data: stages } = await supabase
      .from('quest_stages')
      .select('id')
      .eq('quest_id', questId);
    if (!stages?.length) return [];
    const stageIds = stages.map(s => s.id);
    const { data, error } = await supabase
      .from('stage_branches')
      .select('*')
      .in('stage_id', stageIds)
      .order('branch_index', { ascending: true });
    if (error) return [];
    return data || [];
  },

  async getForStage(stageId) {
    const { data, error } = await supabase
      .from('stage_branches')
      .select('*')
      .eq('stage_id', stageId)
      .order('branch_index', { ascending: true });
    if (error) return [];
    return data || [];
  },

  async bulkCreate(branches) {
    const { data, error } = await supabase
      .from('stage_branches')
      .insert(branches)
      .select();
    if (error) { console.error('Bulk create branches error:', error); return []; }
    return data || [];
  },
};

export const studentPaths = {
  async getForQuest(studentId, questId) {
    const { data, error } = await supabase
      .from('student_stage_paths')
      .select('*')
      .eq('student_id', studentId)
      .eq('quest_id', questId);
    if (error) return [];
    return data || [];
  },

  async recordChoice(studentId, questId, stageId, branchIndex) {
    const { data, error } = await supabase
      .from('student_stage_paths')
      .upsert(
        { student_id: studentId, quest_id: questId, stage_id: stageId, chosen_branch_index: branchIndex },
        { onConflict: 'student_id,quest_id,stage_id' }
      )
      .select()
      .single();
    if (error) { console.error('Record choice error:', error); return null; }
    return data;
  },
};
```

**Step 3: Commit**
```bash
git add supabase/migrations/029_layer5_branching.sql src/lib/api.js
git commit -m "feat: add Layer 5 migration — year plan packages, stage branches, student paths"
```

---

### Task 2: AI Outcome Balancing Function

**Files:**
- Modify: `src/lib/api.js`

**Step 1: Add ai.balanceYearPlan() function**

Add to the `ai` object:

```javascript
async balanceYearPlan(planItems, allOutcomes, studentProfile) {
  const systemPrompt = `You are an educational planner ensuring balanced skill coverage across a year of projects.

RULES:
- Every outcome should be addressed by at least one project
- No single project should carry more than 40% of total outcomes
- Flag overloaded projects (too many outcomes) and gap areas (uncovered outcomes)
- Suggest specific swaps or additions to improve balance
- Keep suggestions aligned with the student's interests

Return ONLY valid JSON.`;

  const userMessage = `Student: ${studentProfile?.name || 'Learner'}
Interests: ${studentProfile?.interests?.join(', ') || studentProfile?.passions?.join(', ') || 'various'}

Target Outcomes (${allOutcomes.length} total):
${allOutcomes.map(o => `- [${o.category || 'general'}] ${o.description || o}`).join('\n')}

Current Plan Items (${planItems.length} projects):
${planItems.map((item, i) => `${i + 1}. "${item.title}" — covers: ${(item.target_standards || []).join(', ') || 'none specified'} — ${item.estimated_weeks || '?'} weeks`).join('\n')}

Analyze balance and return JSON:
{
  "coverage_matrix": {
    "outcome_description": ["project_title_1", "project_title_2"]
  },
  "coverage_pct": 85,
  "domain_breakdown": {
    "math": { "covered": 3, "total": 5, "status": "good|warning|gap" },
    "ela": { "covered": 1, "total": 4, "status": "gap" }
  },
  "overloaded_projects": ["project_title that has too many outcomes"],
  "gap_outcomes": ["outcome not covered by any project"],
  "suggestions": [
    {
      "type": "swap|add|redistribute",
      "description": "Replace Project 3 with a writing-focused project to cover ELA gaps",
      "affected_items": ["project_title"],
      "new_coverage": ["outcome1", "outcome2"]
    }
  ]
}`;

  const raw = await callAI({ systemPrompt, userMessage, maxTokens: 2048 });
  try {
    return JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
  } catch { return { coverage_pct: 0, domain_breakdown: {}, gap_outcomes: [], suggestions: [] }; }
},
```

**Step 2: Commit**
```bash
git add src/lib/api.js
git commit -m "feat: add AI outcome balancing function for Year Plan v2"
```

---

### Task 3: Coverage Matrix UI in Year Plan Page

**Files:**
- Modify: `src/pages/YearPlan.jsx`

**Step 1: Add balance state and function**

```javascript
const [balanceData, setBalanceData] = useState(null);
const [balancing, setBalancing] = useState(false);
```

```javascript
const handleBalance = async () => {
  if (balancing || !activePlan) return;
  setBalancing(true);
  const result = await ai.balanceYearPlan(
    planItems,
    activePlan.target_outcomes || [],
    selectedStudent
  );
  setBalanceData(result);
  setBalancing(false);
};
```

**Step 2: Replace the simple coverage meter in the sidebar with enhanced version**

Find the coverage sidebar (sticky right panel). Replace the single % display with a domain breakdown:

```jsx
{/* Coverage Matrix */}
<div style={{ marginTop: 16 }}>
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)' }}>Outcome Balance</span>
    <button onClick={handleBalance} disabled={balancing} style={{
      padding: '4px 10px', borderRadius: 6, border: '1px solid var(--pencil)',
      background: 'var(--chalk)', color: 'var(--ink)', fontSize: 9, fontWeight: 600,
      cursor: balancing ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)',
    }}>
      {balancing ? 'Analyzing...' : 'Analyze Balance'}
    </button>
  </div>

  {balanceData && (
    <>
      {/* Overall coverage */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
          <span style={{ color: 'var(--graphite)' }}>Overall Coverage</span>
          <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{balanceData.coverage_pct}%</span>
        </div>
        <div style={{ height: 6, background: 'var(--parchment)', borderRadius: 3 }}>
          <div style={{
            height: '100%', borderRadius: 3, transition: 'width 0.5s ease',
            width: `${balanceData.coverage_pct}%`,
            background: balanceData.coverage_pct >= 80 ? 'var(--field-green)' : balanceData.coverage_pct >= 50 ? 'var(--compass-gold)' : 'var(--specimen-red)',
          }} />
        </div>
      </div>

      {/* Domain breakdown */}
      {Object.entries(balanceData.domain_breakdown || {}).map(([domain, info]) => (
        <div key={domain} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
            <span style={{ color: 'var(--graphite)', textTransform: 'capitalize' }}>{domain}</span>
            <span style={{
              fontWeight: 700, fontSize: 9, padding: '1px 6px', borderRadius: 8,
              background: info.status === 'good' ? 'rgba(75,139,59,0.1)' : info.status === 'warning' ? 'rgba(184,134,11,0.1)' : 'rgba(200,50,50,0.1)',
              color: info.status === 'good' ? 'var(--field-green)' : info.status === 'warning' ? 'var(--compass-gold)' : 'var(--specimen-red)',
            }}>
              {info.covered}/{info.total}
            </span>
          </div>
          <div style={{ height: 3, background: 'var(--parchment)', borderRadius: 2 }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: `${info.total ? (info.covered / info.total) * 100 : 0}%`,
              background: info.status === 'good' ? 'var(--field-green)' : info.status === 'warning' ? 'var(--compass-gold)' : 'var(--specimen-red)',
            }} />
          </div>
        </div>
      ))}

      {/* Gap outcomes */}
      {balanceData.gap_outcomes?.length > 0 && (
        <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(200,50,50,0.04)', borderRadius: 6 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--specimen-red)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 4 }}>
            Gaps
          </div>
          {balanceData.gap_outcomes.map((gap, i) => (
            <div key={i} style={{ fontSize: 10, color: 'var(--graphite)', padding: '2px 0' }}>
              {gap}
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {balanceData.suggestions?.length > 0 && (
        <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(184,134,11,0.04)', borderRadius: 6 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--compass-gold)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 4 }}>
            Suggestions
          </div>
          {balanceData.suggestions.map((sug, i) => (
            <div key={i} style={{ fontSize: 10, color: 'var(--ink)', padding: '3px 0', lineHeight: 1.4 }}>
              <strong style={{ textTransform: 'capitalize' }}>{sug.type}:</strong> {sug.description}
            </div>
          ))}
        </div>
      )}
    </>
  )}
</div>
```

**Step 3: Commit**
```bash
git add src/pages/YearPlan.jsx
git commit -m "feat: add outcome balance analysis with domain breakdown and suggestions"
```

---

### Task 4: Year Plan Package Export/Import

**Files:**
- Modify: `src/pages/YearPlan.jsx`
- Modify: `src/pages/CommunityRepository.jsx`

**Step 1: Add export button to YearPlan page**

Import `yearPlanPackages`:
```javascript
import { yearPlanPackages } from '../lib/api';
```

Add state:
```javascript
const [exported, setExported] = useState(false);
```

Add handler:
```javascript
const handleExportPackage = async () => {
  if (!activePlan || !profile?.school_id || exported) return;
  const snapshot = planItems.map(item => ({
    title: item.title,
    description: item.description,
    target_standards: item.target_standards,
    estimated_weeks: item.estimated_weeks,
    interest_tags: item.interest_tags,
    month_target: item.month_target,
    ai_rationale: item.ai_rationale,
    domain_coverage: item.domain_coverage || {},
  }));
  const pkg = await yearPlanPackages.create(activePlan.id, profile.school_id, user.id, {
    title: activePlan.title || `${selectedStudent?.name || 'Student'}'s Year Plan`,
    description: `${planItems.length} projects, ${planItems.reduce((s, i) => s + (i.estimated_weeks || 0), 0)} weeks`,
    gradeBand: selectedStudent?.grade_band,
    itemsSnapshot: snapshot,
    targetOutcomes: activePlan.target_outcomes || [],
    totalWeeks: planItems.reduce((s, i) => s + (i.estimated_weeks || 0), 0),
  });
  if (pkg) setExported(true);
};
```

Add export button in the sidebar (below the coverage section):

```jsx
<button onClick={handleExportPackage} disabled={exported || planItems.length === 0} style={{
  marginTop: 12, width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--pencil)',
  background: exported ? 'rgba(75,139,59,0.06)' : 'var(--chalk)',
  color: exported ? 'var(--field-green)' : 'var(--ink)',
  fontSize: 11, fontWeight: 600, cursor: exported ? 'default' : 'pointer',
  fontFamily: 'var(--font-body)',
}}>
  {exported ? 'Shared to Community!' : 'Share as Package'}
</button>
```

**Step 2: Add package browsing to CommunityRepository**

In `src/pages/CommunityRepository.jsx`, add a "Packages" tab alongside the existing project grid. Import `yearPlanPackages`:

```javascript
import { yearPlanPackages } from '../lib/api';
```

Add state:
```javascript
const [viewMode, setViewMode] = useState('projects'); // 'projects' | 'packages'
const [packages, setPackages] = useState([]);
```

Load packages:
```javascript
useEffect(() => {
  if (!profile?.school_id || viewMode !== 'packages') return;
  yearPlanPackages.list(profile.school_id).then(setPackages);
}, [profile?.school_id, viewMode]);
```

Add a tab toggle above the search bar:

```jsx
<div style={{ display: 'flex', gap: 0, border: '1px solid var(--pencil)', borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
  <button onClick={() => setViewMode('projects')} style={{
    flex: 1, padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
    background: viewMode === 'projects' ? 'var(--ink)' : 'var(--chalk)',
    color: viewMode === 'projects' ? 'var(--chalk)' : 'var(--graphite)',
    fontFamily: 'var(--font-body)',
  }}>Projects</button>
  <button onClick={() => setViewMode('packages')} style={{
    flex: 1, padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
    background: viewMode === 'packages' ? 'var(--ink)' : 'var(--chalk)',
    color: viewMode === 'packages' ? 'var(--chalk)' : 'var(--graphite)',
    fontFamily: 'var(--font-body)',
  }}>Year Plan Packages</button>
</div>
```

When `viewMode === 'packages'`, render package cards instead of project cards:

```jsx
{viewMode === 'packages' && (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
    {packages.map(pkg => (
      <div key={pkg.id} style={{
        background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 12,
        padding: '16px 18px',
      }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--ink)', margin: '0 0 4px' }}>
          {pkg.title}
        </h3>
        <p style={{ fontSize: 11, color: 'var(--graphite)', margin: '0 0 8px', lineHeight: 1.4 }}>
          {pkg.description}
        </p>
        <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--graphite)', marginBottom: 8 }}>
          <span>{(pkg.items_snapshot || []).length} projects</span>
          <span>{pkg.total_weeks} weeks</span>
          <span>Imported {pkg.import_count}x</span>
        </div>
        <button onClick={async () => {
          // Import package items into guide's year plan for a student (prompt user to select student first in a real implementation)
          // For now, just store in sessionStorage and navigate to year plan
          sessionStorage.setItem('package_import', JSON.stringify(pkg));
          window.location.href = '/yearplan';
        }} style={{
          padding: '6px 14px', borderRadius: 8, border: 'none',
          background: 'var(--lab-blue)', color: 'white', fontSize: 11,
          fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)',
        }}>
          Import Plan
        </button>
      </div>
    ))}
    {packages.length === 0 && (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--pencil)', gridColumn: '1 / -1' }}>
        <p style={{ fontSize: 13 }}>No year plan packages shared yet.</p>
      </div>
    )}
  </div>
)}
```

**Step 3: Commit**
```bash
git add src/pages/YearPlan.jsx src/pages/CommunityRepository.jsx
git commit -m "feat: add year plan package export and import via Community Repository"
```

---

### Task 5: Fill Year Plan Timeline + Calendar Views

**Files:**
- Modify: `src/pages/YearPlan.jsx`

**Step 1: Replace timeline placeholder with simple timeline view**

Find the timeline placeholder (look for "coming in next iteration" or the view toggle). Replace with:

```jsx
{/* Timeline View */}
{activeView === 'timeline' && (
  <div style={{ position: 'relative', paddingLeft: 30 }}>
    {/* Vertical line */}
    <div style={{ position: 'absolute', left: 14, top: 0, bottom: 0, width: 2, background: 'var(--pencil)' }} />
    {planItems.map((item, i) => {
      const isGenerated = !!item.quest_id;
      return (
        <div key={item.id} style={{ position: 'relative', marginBottom: 20, paddingLeft: 20 }}>
          {/* Dot on timeline */}
          <div style={{
            position: 'absolute', left: -22, top: 6, width: 10, height: 10, borderRadius: '50%',
            background: isGenerated ? 'var(--field-green)' : item.status === 'completed' ? 'var(--lab-blue)' : 'var(--pencil)',
            border: '2px solid var(--chalk)',
          }} />
          <div style={{ background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{item.title}</span>
              {item.month_target && (
                <span style={{ fontSize: 9, color: 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>
                  {item.month_target}
                </span>
              )}
              <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                background: isGenerated ? 'rgba(75,139,59,0.1)' : 'rgba(184,134,11,0.1)',
                color: isGenerated ? 'var(--field-green)' : 'var(--compass-gold)',
                fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
              }}>
                {isGenerated ? 'Generated' : item.status || 'planned'}
              </span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--graphite)', margin: 0, lineHeight: 1.4 }}>
              {item.description?.slice(0, 120)}{item.description?.length > 120 ? '...' : ''}
            </p>
            <div style={{ marginTop: 6, fontSize: 10, color: 'var(--pencil)' }}>
              {item.estimated_weeks} weeks
              {item.interest_tags?.length > 0 && ` · ${item.interest_tags.join(', ')}`}
            </div>
          </div>
        </div>
      );
    })}
  </div>
)}
```

**Step 2: Replace calendar placeholder with month grid**

```jsx
{/* Calendar View */}
{activeView === 'calendar' && (() => {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const itemsByMonth = {};
  planItems.forEach(item => {
    const month = item.month_target || 'Unscheduled';
    if (!itemsByMonth[month]) itemsByMonth[month] = [];
    itemsByMonth[month].push(item);
  });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
      {months.map(month => (
        <div key={month} style={{
          background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 8,
          padding: 10, minHeight: 80,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
            {month}
          </div>
          {(itemsByMonth[month] || []).map(item => (
            <div key={item.id} style={{
              padding: '4px 8px', marginBottom: 4, borderRadius: 6, fontSize: 10,
              background: item.quest_id ? 'rgba(75,139,59,0.08)' : 'rgba(27,73,101,0.06)',
              color: 'var(--ink)', fontWeight: 500,
            }}>
              {item.title}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
})()}
```

**Step 3: Commit**
```bash
git add src/pages/YearPlan.jsx
git commit -m "feat: add timeline and calendar views to Year Plan page"
```

---

## Part B: Branching Narratives (L5.B Phase 1) — Tasks 6-10

### Task 6: Extend AI Generation for Branching Quests

**Files:**
- Modify: `src/lib/api.js`

**Step 1: Add ai.generateBranchingQuest() function**

This is a separate function from `generateQuest` — guides opt in to branching via a toggle. It generates a stage tree instead of a linear list.

Add to the `ai` object:

```javascript
async generateBranchingQuest(params) {
  // Uses the same student/standards/pathway data as generateQuest
  const { students, standards, pathway, type, count, studentStandardsProfiles, additionalContext, projectMode } = params;

  const systemPrompt = WAYFINDER_SYSTEM_PROMPT + `
You generate BRANCHING project experiences — narrative trees where student choices determine their path.

STRUCTURE RULES:
- Start with 1-2 linear stages (setup/introduction)
- Include 1-2 BRANCH POINTS (choice_fork stages) where the student picks a path
- Each branch leads to 2-3 different stages
- Branches MAY reconverge at a final stage (both paths lead to the same conclusion) OR end differently
- Total stages: 6-10 (student experiences ~5-6 of them depending on choices)
- Every path through the tree must cover the core academic standards
- Different paths emphasize different aspects (e.g., one is more creative, another more analytical)

STAGE NUMBERING:
- Use sequential numbers (1, 2, 3...) for ALL stages including branch variants
- Branch stages use letters: 3A, 3B for the two options after a branch point at stage 2
- Reconvergence stage gets the next number after all branches

OUTPUT FORMAT:
Return a JSON object with stages as an array. Each stage has a "next" field:
- Linear stages: "next": 4 (just the next stage number)
- Branch points (choice_fork): "next": null, "branches": [{"label": "...", "description": "...", "next_stage": "3A"}, {"label": "...", "description": "...", "next_stage": "3B"}]
- Final stage: "next": null (quest complete)

NARRATIVE FEEL:
- Each branch should feel like a genuinely different adventure, not just the same task with different words
- Branch descriptions should make both options sound exciting — no "right" or "wrong" choice
- The narrative should make the student feel like an explorer choosing their own path

${SAFETY_PREAMBLE}`;

  // Build user message similar to generateQuest
  const studentProfiles = students.map(s =>
    `${s.name} (age ${s.age || '?'}, grade ${s.grade_level || '?'}) — interests: ${(s.interests || s.passions || []).join(', ')}`
  ).join('\n');

  const userMessage = `Students:\n${studentProfiles}

Academic Standards: ${standards || 'general learning'}
Career Pathway: ${pathway || 'none'}
Project Mode: ${projectMode || 'mixed'}
${additionalContext ? `Guide's context: ${additionalContext}` : ''}

Generate a BRANCHING quest as JSON:
{
  "quest_title": "...",
  "quest_subtitle": "...",
  "narrative_hook": "...",
  "is_branching": true,
  "total_duration": 10,
  "stages": [
    {
      "stage_id": "1",
      "stage_title": "...",
      "stage_type": "research",
      "duration": 2,
      "description": "...",
      "deliverable": "...",
      "guiding_questions": ["..."],
      "resources_needed": ["..."],
      "academic_skills_embedded": ["..."],
      "next": "2",
      "expedition_challenge": { ... } or null
    },
    {
      "stage_id": "2",
      "stage_title": "Choose Your Path",
      "stage_type": "choice_fork",
      "duration": 1,
      "description": "The expedition reaches a crossroads...",
      "deliverable": null,
      "next": null,
      "branches": [
        { "label": "Follow the river", "description": "Track the water source...", "next_stage": "3A" },
        { "label": "Scale the ridge", "description": "Climb for a better view...", "next_stage": "3B" }
      ]
    },
    {
      "stage_id": "3A",
      "stage_title": "River Exploration",
      "stage_type": "experiment",
      ...
      "next": "4"
    },
    {
      "stage_id": "3B",
      "stage_title": "Ridge Survey",
      "stage_type": "research",
      ...
      "next": "4"
    },
    {
      "stage_id": "4",
      "stage_title": "Final Expedition Report",
      "stage_type": "present",
      ...
      "next": null
    }
  ],
  "reflection_prompts": ["..."],
  "parent_summary": "..."
}`;

  const raw = await callAI({ systemPrompt, userMessage, maxTokens: 4096 });
  try {
    return JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
  } catch { return null; }
},
```

**Step 2: Commit**
```bash
git add src/lib/api.js
git commit -m "feat: add AI branching quest generation function"
```

---

### Task 7: QuestBuilder Branching Toggle + Save

**Files:**
- Modify: `src/pages/QuestBuilder.jsx`

**Step 1: Add branching toggle state**

Near `projectMode` state:
```javascript
const [isBranching, setIsBranching] = useState(false);
```

**Step 2: Add toggle UI in Step 4**

After the project mode segmented control:

```jsx
{/* Branching toggle */}
<div style={{ marginBottom: 20 }}>
  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
    <input type="checkbox" checked={isBranching} onChange={e => setIsBranching(e.target.checked)}
      style={{ accentColor: 'var(--compass-gold)', width: 16, height: 16 }} />
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Branching Narrative</div>
      <div style={{ fontSize: 10, color: 'var(--graphite)' }}>
        Learners choose their own path through the project — different choices lead to different stages
      </div>
    </div>
  </label>
</div>
```

**Step 3: Call branching generation**

In the generation step (Step 5), find where `ai.generateQuest()` is called. Add a branch:

```javascript
const questData = isBranching
  ? await ai.generateBranchingQuest({
      students: selectedStudents, standards: standardsStr,
      pathway: pathwayLabels.join(', ') || 'none', type: questType,
      count: selectedStudents.length, studentStandardsProfiles,
      additionalContext, projectMode,
    })
  : await ai.generateQuest({ /* existing params */ });
```

**Step 4: Save branching data in saveQuest**

After stages are saved (and you have `savedStages` with IDs), add branching logic:

```javascript
// Save branch relationships for branching quests
if (isBranching && questData.is_branching) {
  // Set is_branching on the quest
  await supabase.from('quests').update({ is_branching: true }).eq('id', quest.id);

  // Build stage ID map (stage_id string → saved UUID)
  const stageIdMap = {};
  savedStages.forEach(saved => {
    const originalStage = questData.stages.find(s =>
      s.stage_id === String(saved.stage_number) || s.stage_title === saved.title
    );
    if (originalStage) stageIdMap[originalStage.stage_id] = saved.id;
  });

  // Save branches
  const branchRows = [];
  questData.stages.forEach(stage => {
    if (stage.branches?.length > 0) {
      const parentId = stageIdMap[stage.stage_id];
      if (!parentId) return;
      stage.branches.forEach((branch, idx) => {
        branchRows.push({
          stage_id: parentId,
          branch_index: idx,
          branch_label: branch.label,
          branch_description: branch.description,
          next_stage_id: stageIdMap[branch.next_stage] || null,
          narrative_variant: branch.narrative_variant || null,
        });
      });
    }
  });

  if (branchRows.length > 0) {
    const { stageBranches: sbApi } = await import('../lib/api');
    // or use the already-imported stageBranches
    await stageBranches.bulkCreate(branchRows);
  }

  // For branching quests: only first stage is active, all others are locked
  // Branch stages that aren't reachable from the first path remain locked
  // The student's choices will unlock the correct branch
}
```

Import `stageBranches` at the top of the file:
```javascript
import { stageBranches } from '../lib/api';
```

**Step 5: Commit**
```bash
git add src/pages/QuestBuilder.jsx
git commit -m "feat: add branching narrative toggle and branch saving in QuestBuilder"
```

---

### Task 8: BranchingMap SVG Component

**Files:**
- Create: `src/components/map/BranchingMap.jsx`

**Step 1: Create the branching map component**

This renders a stage tree as SVG instead of a linear path. Branch points fan out, unchosen branches are fogged, the student's path is highlighted.

```jsx
import { useMemo } from 'react';

const NODE_W = 140;
const NODE_H = 50;
const V_GAP = 100;
const H_GAP = 180;

// Layout algorithm: assign x,y coordinates to each stage in a tree
function layoutTree(stages, branches, studentChoices) {
  const stageMap = {};
  stages.forEach(s => { stageMap[s.id] = { ...s, children: [], x: 0, y: 0, depth: 0, reachable: false }; });

  // Build adjacency from branches
  const branchMap = {}; // parentStageId → [{branch_index, next_stage_id, label}]
  branches.forEach(b => {
    if (!branchMap[b.stage_id]) branchMap[b.stage_id] = [];
    branchMap[b.stage_id].push(b);
  });

  // Mark reachable stages based on student choices
  const choiceMap = {};
  studentChoices.forEach(c => { choiceMap[c.stage_id] = c.chosen_branch_index; });

  // BFS from first stage
  const firstStage = stages.find(s => s.stage_number === 1) || stages[0];
  if (!firstStage) return [];

  const queue = [{ id: firstStage.id, depth: 0, xOffset: 0 }];
  const visited = new Set();
  const nodes = [];
  let maxDepth = 0;

  while (queue.length > 0) {
    const { id, depth, xOffset } = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);

    const stage = stageMap[id];
    if (!stage) continue;

    stage.depth = depth;
    stage.x = 400 + xOffset;
    stage.y = 60 + depth * V_GAP;
    stage.reachable = true;
    maxDepth = Math.max(maxDepth, depth);
    nodes.push(stage);

    const stageBranches = branchMap[id];
    if (stageBranches?.length > 0) {
      // This is a branch point
      const chosen = choiceMap[id];
      const spread = (stageBranches.length - 1) * H_GAP / 2;
      stageBranches.forEach((b, i) => {
        if (b.next_stage_id) {
          const branchX = xOffset + (i * H_GAP) - spread;
          const isChosen = chosen === b.branch_index;
          if (stageMap[b.next_stage_id]) {
            stageMap[b.next_stage_id].reachable = isChosen || chosen === undefined;
            stageMap[b.next_stage_id]._branchLabel = b.branch_label;
            stageMap[b.next_stage_id]._fromBranch = { parentId: id, index: i, chosen: isChosen };
          }
          queue.push({ id: b.next_stage_id, depth: depth + 1, xOffset: branchX });
        }
      });
    } else {
      // Linear: find next stage by stage_number
      const nextStage = stages.find(s => s.stage_number === stage.stage_number + 1 && !visited.has(s.id));
      if (nextStage) {
        queue.push({ id: nextStage.id, depth: depth + 1, xOffset });
      }
    }
  }

  return { nodes, maxDepth, branchMap };
}

export default function BranchingMap({ stages, branches, studentChoices, landmarks, activeStageId, onStageClick }) {
  const { nodes, maxDepth, branchMap } = useMemo(
    () => layoutTree(stages || [], branches || [], studentChoices || []),
    [stages, branches, studentChoices]
  );

  const svgHeight = (maxDepth + 1) * V_GAP + 120;

  return (
    <svg viewBox={`0 0 800 ${svgHeight}`} style={{ width: '100%', height: 'auto' }}>
      <rect x="0" y="0" width="800" height={svgHeight} fill="rgba(27,73,101,0.03)" rx="12" />

      {/* Edges */}
      {nodes.map(node => {
        const nodeBranches = (branchMap || {})[node.id];
        if (nodeBranches?.length > 0) {
          return nodeBranches.map((b, i) => {
            const target = nodes.find(n => n.id === b.next_stage_id);
            if (!target) return null;
            const isChosen = node._fromBranch?.chosen !== false;
            return (
              <g key={`${node.id}-${i}`}>
                <line x1={node.x} y1={node.y + NODE_H / 2} x2={target.x} y2={target.y - NODE_H / 2}
                  stroke={target.reachable ? 'var(--compass-gold)' : 'var(--pencil)'}
                  strokeWidth={target.reachable ? 2 : 1}
                  strokeDasharray={target.reachable ? 'none' : '4 4'}
                  opacity={target.reachable ? 1 : 0.3}
                />
                {/* Branch label */}
                <text
                  x={(node.x + target.x) / 2}
                  y={(node.y + NODE_H / 2 + target.y - NODE_H / 2) / 2}
                  textAnchor="middle" fontSize="8" fill="var(--graphite)"
                  fontFamily="var(--font-body)" fontStyle="italic"
                >
                  {b.branch_label}
                </text>
              </g>
            );
          });
        }
        // Linear edge to next
        const nextNode = nodes.find(n => n.depth === node.depth + 1 && Math.abs(n.x - node.x) < H_GAP / 2);
        if (!nextNode || (branchMap || {})[node.id]) return null;
        return (
          <line key={`${node.id}-next`}
            x1={node.x} y1={node.y + NODE_H / 2}
            x2={nextNode.x} y2={nextNode.y - NODE_H / 2}
            stroke={nextNode.reachable ? 'var(--compass-gold)' : 'var(--pencil)'}
            strokeWidth={nextNode.reachable ? 2 : 1}
            opacity={nextNode.reachable ? 1 : 0.3}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map(node => {
        const isActive = node.id === activeStageId;
        const isCompleted = node.status === 'completed';
        const landmark = landmarks?.find(l => l.stage_id === node.id);
        const opacity = node.reachable ? 1 : 0.3;

        return (
          <g key={node.id} style={{ cursor: 'pointer', opacity }} onClick={() => onStageClick?.(node)}>
            <rect x={node.x - NODE_W / 2} y={node.y - NODE_H / 2}
              width={NODE_W} height={NODE_H} rx="10"
              fill={isActive ? 'var(--compass-gold)' : isCompleted ? 'var(--field-green)' : 'var(--chalk)'}
              stroke={isActive ? 'var(--ink)' : 'var(--pencil)'}
              strokeWidth={isActive ? 2 : 1}
            />
            {/* Stage title */}
            <text x={node.x} y={node.y - 4} textAnchor="middle"
              fontSize="10" fontWeight="600"
              fill={isActive || isCompleted ? 'white' : 'var(--ink)'}
              fontFamily="var(--font-body)">
              {node.title?.length > 18 ? node.title.slice(0, 16) + '...' : node.title}
            </text>
            {/* Stage type */}
            <text x={node.x} y={node.y + 10} textAnchor="middle"
              fontSize="8" fill={isActive || isCompleted ? 'rgba(255,255,255,0.7)' : 'var(--graphite)'}
              fontFamily="var(--font-mono)">
              {node.stage_type}
            </text>
            {/* Landmark emoji */}
            {landmark && (
              <text x={node.x + NODE_W / 2 - 8} y={node.y - NODE_H / 2 + 14}
                fontSize="14" textAnchor="middle">
                {landmark.landmark_type === 'cave' ? '🕳️' : landmark.landmark_type === 'lighthouse' ? '🗼' : '🏔️'}
              </text>
            )}
            {/* Fog for unreachable */}
            {!node.reachable && (
              <rect x={node.x - NODE_W / 2} y={node.y - NODE_H / 2}
                width={NODE_W} height={NODE_H} rx="10"
                fill="var(--parchment)" opacity="0.6"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
```

**Step 2: Commit**
```bash
git add src/components/map/BranchingMap.jsx
git commit -m "feat: add BranchingMap SVG component with tree layout and branch visualization"
```

---

### Task 9: Branching Progression Logic in StudentQuestPage

**Files:**
- Modify: `src/pages/student/StudentQuestPage.jsx`

**Step 1: Import branching components and APIs**

```javascript
import BranchingMap from '../../components/map/BranchingMap';
import { stageBranches, studentPaths } from '../../lib/api';
```

**Step 2: Add state**

```javascript
const [questBranches, setQuestBranches] = useState([]);
const [studentChoices, setStudentChoices] = useState([]);
const [isBranchingQuest, setIsBranchingQuest] = useState(false);
```

**Step 3: Load branches on mount**

```javascript
useEffect(() => {
  if (!quest?.id || !quest?.is_branching) return;
  setIsBranchingQuest(true);
  const loadBranches = async () => {
    const [branches, choices] = await Promise.all([
      stageBranches.getForQuest(quest.id),
      studentPaths.getForQuest(studentId, quest.id),
    ]);
    setQuestBranches(branches);
    setStudentChoices(choices);
  };
  loadBranches();
}, [quest?.id, quest?.is_branching, studentId]);
```

**Step 4: Add branch choice handler**

```javascript
const handleBranchChoice = async (stageId, branchIndex) => {
  // Record the choice
  await studentPaths.recordChoice(studentId, quest.id, stageId, branchIndex);
  setStudentChoices(prev => [...prev.filter(c => c.stage_id !== stageId), { stage_id: stageId, chosen_branch_index: branchIndex }]);

  // Find the branch that was chosen
  const branch = questBranches.find(b => b.stage_id === stageId && b.branch_index === branchIndex);
  if (branch?.next_stage_id) {
    // Complete the current (choice_fork) stage
    await supabase.from('quest_stages').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', stageId);
    // Activate the chosen next stage
    await supabase.from('quest_stages').update({ status: 'active' }).eq('id', branch.next_stage_id);
    // Refresh stages
    const { data: refreshed } = await supabase.from('quest_stages').select('*').eq('quest_id', quest.id).order('stage_number');
    setStages(refreshed || []);
  }
};
```

**Step 5: Modify completeStage to handle branching**

Find the existing `completeStage` function. Add branching-aware next-stage logic:

```javascript
// In completeStage, replace the simple "stages[currentIdx + 1]" logic:
// For branching quests, check if the current stage has branches
const currentBranches = questBranches.filter(b => b.stage_id === stageId);
if (currentBranches.length > 0) {
  // This is a branch point — don't auto-advance, wait for choice
  return;
}

// Check if there's a branch that leads TO a next stage (following the tree)
// For linear stages within a branch, just advance to the next by stage_number
// For reconvergence stages, advance normally
```

The key modification: when completing a stage in a branching quest, the function should check if the NEXT stage is determined by a branch choice or by linear progression. If the current stage's `next` was determined by a branch, we already set it up in `handleBranchChoice`. For linear stages within a branch, progression works normally.

**Step 6: Render choice fork UI for branching**

Find where `choice_fork` stages are rendered. For branching quests, the choice should call `handleBranchChoice` instead of just completing:

```jsx
{stage.stage_type === 'choice_fork' && isBranchingQuest && stage.status === 'active' && (
  <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
    {questBranches
      .filter(b => b.stage_id === stage.id)
      .sort((a, b) => a.branch_index - b.branch_index)
      .map(branch => (
        <button key={branch.id} onClick={() => handleBranchChoice(stage.id, branch.branch_index)}
          style={{
            padding: '14px 18px', borderRadius: 10, textAlign: 'left',
            border: '1.5px solid var(--compass-gold)', background: 'rgba(184,134,11,0.04)',
            cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
            {branch.branch_label}
          </div>
          <div style={{ fontSize: 11, color: 'var(--graphite)', lineHeight: 1.4 }}>
            {branch.branch_description}
          </div>
        </button>
      ))}
  </div>
)}
```

**Step 7: Use BranchingMap for branching quests**

Find where the TreasureMap component is rendered. Add a condition:

```jsx
{isBranchingQuest ? (
  <BranchingMap
    stages={stages}
    branches={questBranches}
    studentChoices={studentChoices}
    landmarks={mapLandmarks}
    activeStageId={stages.find(s => s.status === 'active')?.id}
    onStageClick={(stage) => { /* scroll to stage card */ }}
  />
) : (
  <TreasureMap ... /> // existing linear map
)}
```

**Step 8: Commit**
```bash
git add src/pages/student/StudentQuestPage.jsx
git commit -m "feat: add branching progression logic with choice UI and BranchingMap"
```

---

### Task 10: Branching Preview in QuestBuilder Review

**Files:**
- Modify: `src/pages/QuestBuilder.jsx`

**Step 1: Import BranchingMap**

```javascript
import BranchingMap from '../components/map/BranchingMap';
```

**Step 2: Show branching preview in Step 6**

In the Step6Review component, if the generated quest is branching, add a visual tree preview before the stage list:

```jsx
{generatedQuest?.is_branching && (
  <div style={{ marginBottom: 24 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--compass-gold)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 8 }}>
      Branching Narrative Preview
    </div>
    <div style={{ background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 12, padding: 12 }}>
      <svg viewBox="0 0 800 400" style={{ width: '100%', height: 'auto' }}>
        {/* Simple preview: show stage titles as nodes with branch connections */}
        {generatedQuest.stages.map((stage, i) => {
          const y = 30 + i * 40;
          const isFork = stage.stage_type === 'choice_fork';
          return (
            <g key={stage.stage_id}>
              <circle cx={400} cy={y} r={isFork ? 8 : 5}
                fill={isFork ? 'var(--compass-gold)' : 'var(--lab-blue)'}
              />
              <text x={420} y={y + 4} fontSize="10" fill="var(--ink)" fontFamily="var(--font-body)">
                {stage.stage_id}. {stage.stage_title}
                {isFork ? ' (Branch Point)' : ''}
              </text>
              {stage.branches?.map((b, bi) => (
                <text key={bi} x={440} y={y + 14 + bi * 12} fontSize="8" fill="var(--graphite)" fontStyle="italic">
                  → {b.label} → Stage {b.next_stage}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  </div>
)}
```

Also mark branch points in the stage list:

```jsx
{/* In each stage card in Step 6, after stage_type badge */}
{stage.branches?.length > 0 && (
  <span style={{
    fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
    background: 'rgba(184,134,11,0.1)', color: 'var(--compass-gold)',
    fontFamily: 'var(--font-mono)',
  }}>
    {stage.branches.length} branches
  </span>
)}
```

**Step 3: Commit**
```bash
git add src/pages/QuestBuilder.jsx
git commit -m "feat: add branching narrative preview in QuestBuilder review step"
```

---

## Verification Checklist

- [ ] `npm run build` passes
- [ ] Year Plan: "Analyze Balance" shows domain breakdown, gaps, suggestions
- [ ] Year Plan: "Share as Package" exports to community
- [ ] Community: "Year Plan Packages" tab shows importable plans
- [ ] Year Plan: Timeline view shows vertical timeline with dot markers
- [ ] Year Plan: Calendar view shows month grid with project cards
- [ ] QuestBuilder: "Branching Narrative" checkbox appears in Step 4
- [ ] Branching quest generation returns a stage tree (check console)
- [ ] Step 6 review shows branch preview and branch point badges
- [ ] StudentQuestPage: Choice Fork stages show branch buttons for branching quests
- [ ] Choosing a branch records the choice and activates the correct next stage
- [ ] BranchingMap SVG renders tree layout with fogged unchosen paths

## Migration to Run

Run in Supabase SQL Editor:
1. `supabase/migrations/029_layer5_branching.sql`
