# Layer 4: Progress, Mastery & Community — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Mastery Map (visual progress with world map + knowledge graph views), Accountability Buddy (peer encouragement + stall detection), and Community Repository (share, browse, rate, clone completed projects).

**Architecture:** Three features in dependency order: (A) Mastery Map first (uses existing skill_assessments data, adds SVG visualization), (B) Accountability Buddy (new tables + stall detection + buddy messaging), (C) Community Repository (sharing, browsing, rating, cloning — builds on QuestLibrary patterns).

**Tech Stack:** React + Vite, Supabase PostgreSQL, SVG for World Map, simple force layout for Knowledge Graph (no d3 dependency — lightweight custom), CSS custom properties, lucide-react icons

---

## Part A: Mastery Map (L4.1) — Tasks 1-5

### Task 1: Mastery Map Migration + API

**Files:**
- Create: `supabase/migrations/028_layer4_community.sql`
- Modify: `src/lib/api.js`

**Step 1: Create migration**

This single migration covers all Layer 4 database needs.

```sql
-- 028_layer4_community.sql
-- Layer 4: Accountability Buddies, Community Repository

-- ============================================================
-- BUDDY PAIRS — accountability partner assignments
-- ============================================================
CREATE TABLE IF NOT EXISTS buddy_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_a_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_b_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_a_id, student_b_id)
);

CREATE INDEX IF NOT EXISTS idx_buddy_pairs_students ON buddy_pairs(student_a_id, student_b_id);

-- ============================================================
-- BUDDY MESSAGES — encouragement between partners
-- ============================================================
CREATE TABLE IF NOT EXISTS buddy_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id UUID NOT NULL REFERENCES buddy_pairs(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- STALL ALERTS — guide notifications for inactive students
-- ============================================================
CREATE TABLE IF NOT EXISTS stall_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  days_inactive INTEGER NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'flagged_parent')),
  parent_flagged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stall_alerts_guide ON stall_alerts(guide_id, status);

-- ============================================================
-- COMMUNITY PROJECTS — shared completed projects
-- ============================================================
CREATE TABLE IF NOT EXISTS community_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tags JSONB DEFAULT '[]',
  grade_band TEXT,
  project_mode TEXT DEFAULT 'mixed',
  career_pathway TEXT,
  avg_rating NUMERIC(2,1) DEFAULT 0,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_projects_school ON community_projects(school_id);

-- ============================================================
-- COMMUNITY REVIEWS — ratings and comments on shared projects
-- ============================================================
CREATE TABLE IF NOT EXISTS community_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_project_id UUID NOT NULL REFERENCES community_projects(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(community_project_id, reviewer_id)
);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE buddy_pairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY buddy_pairs_read ON buddy_pairs FOR SELECT USING (true);
CREATE POLICY buddy_pairs_auth_manage ON buddy_pairs FOR ALL TO authenticated USING (true);
CREATE POLICY buddy_pairs_anon_read ON buddy_pairs FOR SELECT TO anon USING (true);

ALTER TABLE buddy_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY buddy_messages_read ON buddy_messages FOR SELECT USING (true);
CREATE POLICY buddy_messages_anon_insert ON buddy_messages FOR INSERT TO anon WITH CHECK (true);

ALTER TABLE stall_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY stall_alerts_auth_manage ON stall_alerts FOR ALL TO authenticated USING (true);
CREATE POLICY stall_alerts_anon_read ON stall_alerts FOR SELECT TO anon USING (true);

ALTER TABLE community_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY community_projects_read ON community_projects FOR SELECT USING (true);
CREATE POLICY community_projects_auth_manage ON community_projects FOR ALL TO authenticated USING (true);

ALTER TABLE community_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY community_reviews_read ON community_reviews FOR SELECT USING (true);
CREATE POLICY community_reviews_auth_manage ON community_reviews FOR ALL TO authenticated USING (true);

-- ============================================================
-- RPC: Get inactive students for a guide
-- ============================================================
CREATE OR REPLACE FUNCTION get_inactive_students(
  p_guide_id UUID,
  p_days_threshold INTEGER DEFAULT 3
) RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  avatar_emoji TEXT,
  days_inactive INTEGER,
  last_active DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS student_id,
    s.name AS student_name,
    s.avatar_emoji,
    COALESCE(CURRENT_DATE - sx.last_active_date, 999) AS days_inactive,
    sx.last_active_date AS last_active
  FROM students s
  LEFT JOIN student_xp sx ON sx.student_id = s.id
  WHERE s.guide_id = p_guide_id
    AND (sx.last_active_date IS NULL OR CURRENT_DATE - sx.last_active_date >= p_days_threshold)
  ORDER BY days_inactive DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Step 2: Add Mastery Map API functions**

In `src/lib/api.js`, add a new `masteryMap` export:

```javascript
// ===================== MASTERY MAP =====================

export const masteryMap = {
  async getFullProfile(studentId) {
    // Get all data needed for the mastery visualization
    const [assessments, studentSkills, snapshots, quests] = await Promise.all([
      skillAssessments.getForStudentGrouped(studentId),
      skills.getStudentSkills(studentId),
      skillSnapshots.listForStudent(studentId),
      supabase
        .from('quest_students')
        .select('quests(id, title, career_pathway, status, academic_standards, created_at)')
        .eq('student_id', studentId)
        .then(r => (r.data || []).map(qs => qs.quests).filter(Boolean)),
    ]);

    // Build skill connections (skills that appeared in the same quest)
    const connections = [];
    const skillsByQuest = {};
    Object.entries(assessments).forEach(([skillName, { history }]) => {
      history.forEach(a => {
        if (a.quest_id) {
          if (!skillsByQuest[a.quest_id]) skillsByQuest[a.quest_id] = new Set();
          skillsByQuest[a.quest_id].add(skillName);
        }
      });
    });
    Object.values(skillsByQuest).forEach(skillSet => {
      const arr = [...skillSet];
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          connections.push({ from: arr[i], to: arr[j] });
        }
      }
    });

    return { assessments, studentSkills, snapshots, quests, connections };
  },
};
```

**Step 3: Commit**
```bash
git add supabase/migrations/028_layer4_community.sql src/lib/api.js
git commit -m "feat: add Layer 4 migration and mastery map API"
```

---

### Task 2: Mastery Map — World Map View

**Files:**
- Create: `src/pages/MasteryMap.jsx`
- Modify: `src/App.jsx`

**Step 1: Add route**

In App.jsx, add import and route:
```javascript
import MasteryMap from './pages/MasteryMap';
// In protected routes:
<Route path="/mastery/:studentId" element={<MasteryMap />} />
```

**Step 2: Create MasteryMap.jsx**

The World Map view renders skill categories as "islands" on an SVG ocean. Each island represents a skill category (Core, Soft, Interest). Skills within each island are landmarks. Mastery level controls visual intensity. Completed quests are labeled regions.

```jsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Map, GitBranch, Loader2, Eye } from 'lucide-react';
import { masteryMap } from '../lib/api';
import { supabase } from '../lib/supabase';
import WayfinderLogoIcon from '../components/icons/WayfinderLogo';

// Skill category → island position and color
const ISLANDS = {
  core: { cx: 280, cy: 200, rx: 130, ry: 90, color: 'var(--lab-blue)', label: 'Core Skills' },
  soft: { cx: 580, cy: 160, rx: 110, ry: 80, color: 'var(--compass-gold)', label: 'Explorer Skills' },
  interest: { cx: 430, cy: 380, rx: 140, ry: 85, color: 'var(--field-green)', label: 'Discovery Skills' },
};

const RATING_OPACITY = { 0: 0.15, 1: 0.3, 2: 0.5, 3: 0.75, 4: 1 };
const RATING_LABELS = ['Uncharted', 'Emerging', 'Developing', 'Proficient', 'Advanced'];

// Deterministic position for a skill within its island
function skillPosition(island, index, total) {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
  const r = 0.55;
  return {
    x: island.cx + island.rx * r * Math.cos(angle),
    y: island.cy + island.ry * r * Math.sin(angle),
  };
}

export default function MasteryMap() {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('world'); // 'world' | 'graph'
  const [selectedSkill, setSelectedSkill] = useState(null);

  useEffect(() => {
    if (!studentId) return;
    const load = async () => {
      setLoading(true);
      const [{ data: s }, profile] = await Promise.all([
        supabase.from('students').select('*').eq('id', studentId).single(),
        masteryMap.getFullProfile(studentId),
      ]);
      setStudent(s);
      setData(profile);
      setLoading(false);
    };
    load();
  }, [studentId]);

  // Categorize skills
  const categorized = useMemo(() => {
    if (!data?.assessments) return {};
    const cats = { core: [], soft: [], interest: [] };
    // Use studentSkills for category info, assessments for rating
    const skillCategories = {};
    (data.studentSkills || []).forEach(s => {
      skillCategories[s.skill_name] = s.category || 'interest';
    });
    Object.entries(data.assessments).forEach(([name, info]) => {
      const cat = skillCategories[name] || 'interest';
      const bucket = cats[cat] || cats.interest;
      bucket.push({ name, ...info });
    });
    return cats;
  }, [data]);

  // Summary stats
  const stats = useMemo(() => {
    if (!data?.assessments) return {};
    const all = Object.values(data.assessments);
    const total = all.length;
    const mastered = all.filter(a => a.latest.rating >= 3).length;
    const strongest = all.sort((a, b) => b.latest.rating - a.latest.rating)[0];
    const weakest = all.sort((a, b) => a.latest.rating - b.latest.rating)[0];
    return { total, mastered, pct: total ? Math.round((mastered / total) * 100) : 0, strongest, weakest };
  }, [data]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={20} color="var(--graphite)" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', fontFamily: 'var(--font-body)' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }`}</style>

      {/* Header */}
      <header style={{
        height: 48, background: 'var(--chalk)', borderBottom: '1px solid var(--pencil)',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8,
      }}>
        <Link to={`/students/${studentId}`} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--graphite)', textDecoration: 'none', fontSize: 12 }}>
          <ArrowLeft size={14} /> Back to profile
        </Link>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--pencil)', borderRadius: 6, overflow: 'hidden' }}>
            <button onClick={() => setView('world')} style={{
              padding: '4px 10px', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600,
              background: view === 'world' ? 'var(--ink)' : 'var(--chalk)',
              color: view === 'world' ? 'var(--chalk)' : 'var(--graphite)',
              display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)',
            }}><Map size={11} /> World Map</button>
            <button onClick={() => setView('graph')} style={{
              padding: '4px 10px', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600,
              background: view === 'graph' ? 'var(--ink)' : 'var(--chalk)',
              color: view === 'graph' ? 'var(--chalk)' : 'var(--graphite)',
              display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)',
            }}><GitBranch size={11} /> Knowledge Graph</button>
          </div>
          <WayfinderLogoIcon size={16} color="var(--compass-gold)" />
        </div>
      </header>

      {/* Title + Stats Bar */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 24px 0' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)', margin: '0 0 4px' }}>
          {student?.avatar_emoji || '🧭'} {student?.name}'s Mastery Map
        </h1>
        <div style={{ display: 'flex', gap: 20, fontSize: 11, color: 'var(--graphite)', marginBottom: 16 }}>
          <span><strong>{stats.total || 0}</strong> skills discovered</span>
          <span><strong>{stats.pct || 0}%</strong> proficient or above</span>
          {stats.strongest && <span>Strongest: <strong>{stats.strongest.name}</strong></span>}
          {stats.weakest && stats.total > 1 && <span>Growing: <strong>{stats.weakest.name}</strong></span>}
        </div>
      </div>

      {/* Map Area */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 32px' }}>
        {view === 'world' ? (
          <div style={{ background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 14, padding: 16, position: 'relative' }}>
            <svg viewBox="0 0 860 500" style={{ width: '100%', height: 'auto' }}>
              {/* Ocean background */}
              <rect x="0" y="0" width="860" height="500" rx="10" fill="rgba(27,73,101,0.04)" />

              {/* Compass rose */}
              <text x="790" y="40" fontSize="10" fill="var(--pencil)" fontFamily="var(--font-mono)" textAnchor="middle">N</text>
              <line x1="790" y1="44" x2="790" y2="60" stroke="var(--pencil)" strokeWidth="0.5" />

              {/* Islands */}
              {Object.entries(ISLANDS).map(([cat, island]) => {
                const skills = categorized[cat] || [];
                return (
                  <g key={cat}>
                    {/* Island shape */}
                    <ellipse cx={island.cx} cy={island.cy} rx={island.rx} ry={island.ry}
                      fill={`color-mix(in srgb, ${island.color} 8%, var(--parchment))`}
                      stroke={island.color} strokeWidth="1.5" strokeDasharray={skills.length === 0 ? '4 4' : 'none'}
                      opacity={skills.length === 0 ? 0.3 : 1}
                    />
                    {/* Island label */}
                    <text x={island.cx} y={island.cy - island.ry + 16} textAnchor="middle"
                      fontSize="9" fontWeight="700" fill={island.color}
                      fontFamily="var(--font-mono)" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {island.label}
                    </text>
                    {skills.length === 0 && (
                      <text x={island.cx} y={island.cy + 4} textAnchor="middle"
                        fontSize="9" fill="var(--pencil)" fontStyle="italic">
                        Uncharted territory
                      </text>
                    )}
                    {/* Skill landmarks */}
                    {skills.map((skill, i) => {
                      const pos = skillPosition(island, i, skills.length);
                      const rating = skill.latest?.rating || 0;
                      const opacity = RATING_OPACITY[rating] || 0.15;
                      const size = 6 + rating * 2;
                      return (
                        <g key={skill.name} style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedSkill(selectedSkill === skill.name ? null : skill.name)}>
                          <circle cx={pos.x} cy={pos.y} r={size}
                            fill={island.color} opacity={opacity}
                            stroke={selectedSkill === skill.name ? 'var(--ink)' : 'none'}
                            strokeWidth={selectedSkill === skill.name ? 2 : 0}
                          />
                          {rating >= 3 && (
                            <circle cx={pos.x} cy={pos.y} r={size + 3}
                              fill="none" stroke={island.color} strokeWidth="0.5"
                              opacity={0.4} style={{ animation: 'pulse 2s infinite' }}
                            />
                          )}
                          <text x={pos.x} y={pos.y + size + 10} textAnchor="middle"
                            fontSize="8" fill="var(--graphite)" fontFamily="var(--font-body)">
                            {skill.name.length > 14 ? skill.name.slice(0, 12) + '...' : skill.name}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}

              {/* Connections between skills (dotted paths between islands) */}
              {data?.connections?.slice(0, 20).map((conn, i) => {
                // Find positions of connected skills
                let fromPos = null, toPos = null;
                Object.entries(ISLANDS).forEach(([cat, island]) => {
                  const skills = categorized[cat] || [];
                  skills.forEach((s, idx) => {
                    const pos = skillPosition(island, idx, skills.length);
                    if (s.name === conn.from) fromPos = pos;
                    if (s.name === conn.to) toPos = pos;
                  });
                });
                if (!fromPos || !toPos) return null;
                return (
                  <line key={i} x1={fromPos.x} y1={fromPos.y} x2={toPos.x} y2={toPos.y}
                    stroke="var(--pencil)" strokeWidth="0.5" strokeDasharray="3 3" opacity={0.4}
                  />
                );
              })}
            </svg>

            {/* Skill detail popup */}
            {selectedSkill && data?.assessments[selectedSkill] && (
              <div style={{
                position: 'absolute', bottom: 16, left: 16, right: 16,
                background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 10,
                padding: '12px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{selectedSkill}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                    background: 'rgba(27,73,101,0.08)', color: 'var(--lab-blue)',
                    fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                  }}>
                    {RATING_LABELS[data.assessments[selectedSkill].latest.rating]}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--graphite)', margin: '0 0 4px', lineHeight: 1.4 }}>
                  <strong>Evidence:</strong> {data.assessments[selectedSkill].latest.evidence || 'No details yet'}
                </p>
                <p style={{ fontSize: 10, color: 'var(--pencil)', margin: 0 }}>
                  {data.assessments[selectedSkill].history.length} observations
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Knowledge Graph View */
          <KnowledgeGraph assessments={data?.assessments || {}} connections={data?.connections || []} />
        )}
      </div>
    </div>
  );
}

// ---- Knowledge Graph Component ----
function KnowledgeGraph({ assessments, connections }) {
  const nodes = useMemo(() => {
    const entries = Object.entries(assessments);
    if (entries.length === 0) return [];
    // Simple circular layout with perturbation based on connections
    const angleStep = (2 * Math.PI) / entries.length;
    return entries.map(([name, info], i) => {
      const angle = i * angleStep - Math.PI / 2;
      const radius = 180;
      return {
        name,
        x: 430 + radius * Math.cos(angle),
        y: 250 + radius * Math.sin(angle) * 0.7,
        rating: info.latest?.rating || 1,
        history: info.history,
      };
    });
  }, [assessments]);

  const nodeMap = useMemo(() => {
    const map = {};
    nodes.forEach(n => { map[n.name] = n; });
    return map;
  }, [nodes]);

  return (
    <div style={{ background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 14, padding: 16 }}>
      <svg viewBox="0 0 860 500" style={{ width: '100%', height: 'auto' }}>
        <rect x="0" y="0" width="860" height="500" rx="10" fill="rgba(27,73,101,0.02)" />

        {/* Edges */}
        {connections.slice(0, 30).map((conn, i) => {
          const from = nodeMap[conn.from];
          const to = nodeMap[conn.to];
          if (!from || !to) return null;
          return (
            <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke="var(--pencil)" strokeWidth="1" opacity={0.25}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const size = 8 + node.rating * 4;
          const colors = ['var(--pencil)', 'var(--specimen-red)', 'var(--compass-gold)', 'var(--lab-blue)', 'var(--field-green)'];
          return (
            <g key={node.name}>
              <circle cx={node.x} cy={node.y} r={size}
                fill={colors[node.rating]} opacity={0.7}
              />
              <text x={node.x} y={node.y + size + 12} textAnchor="middle"
                fontSize="9" fill="var(--graphite)" fontFamily="var(--font-body)">
                {node.name.length > 16 ? node.name.slice(0, 14) + '...' : node.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
```

**Step 3: Commit**
```bash
git add src/pages/MasteryMap.jsx src/App.jsx
git commit -m "feat: add Mastery Map page with world map and knowledge graph views"
```

---

### Task 3: Link Mastery Map from Profile + Parent Dashboard

**Files:**
- Modify: `src/pages/StudentProfilePage.jsx`
- Modify: `src/pages/parent/ParentDashboard.jsx`

**Step 1: Add Mastery Map link to StudentProfilePage**

Find the profile header area (near the student name/avatar). Add a link button:

```jsx
<Link to={`/mastery/${student.id}`} style={{
  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
  borderRadius: 8, border: '1px solid var(--pencil)', background: 'var(--chalk)',
  color: 'var(--ink)', fontSize: 11, fontWeight: 600, textDecoration: 'none',
}}>
  <Map size={13} /> Mastery Map
</Link>
```

Import `Map` from lucide-react and `Link` from react-router-dom if not already imported.

**Step 2: Add Mastery Map link to ParentDashboard**

Find the parent dashboard where student info is shown. Add a simple link:

```jsx
<a href={`/mastery/${student.id}`} style={{
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
  borderRadius: 8, border: '1px solid var(--pencil)', background: 'var(--chalk)',
  color: 'var(--ink)', fontSize: 12, fontWeight: 600, textDecoration: 'none', marginTop: 12,
}}>
  View Mastery Map
</a>
```

**Step 3: Commit**
```bash
git add src/pages/StudentProfilePage.jsx src/pages/parent/ParentDashboard.jsx
git commit -m "feat: link Mastery Map from student profile and parent dashboard"
```

---

## Part B: Accountability Buddy (L4.3) — Tasks 4-7

### Task 4: Buddy API + Stall Detection

**Files:**
- Modify: `src/lib/api.js`

**Step 1: Add buddy pairs API**

```javascript
// ===================== ACCOUNTABILITY BUDDIES =====================

export const buddyPairs = {
  async getForStudent(studentId) {
    const { data, error } = await supabase
      .from('buddy_pairs')
      .select('*, student_a:students!buddy_pairs_student_a_id_fkey(id, name, avatar_emoji), student_b:students!buddy_pairs_student_b_id_fkey(id, name, avatar_emoji)')
      .or(`student_a_id.eq.${studentId},student_b_id.eq.${studentId}`)
      .eq('status', 'active')
      .single();
    if (error) return null;
    return data;
  },

  async getForSchool(schoolId) {
    const { data, error } = await supabase
      .from('buddy_pairs')
      .select('*, student_a:students!buddy_pairs_student_a_id_fkey(id, name, avatar_emoji), student_b:students!buddy_pairs_student_b_id_fkey(id, name, avatar_emoji)')
      .eq('school_id', schoolId)
      .eq('status', 'active');
    if (error) return [];
    return data || [];
  },

  async create(studentAId, studentBId, schoolId) {
    const { data, error } = await supabase
      .from('buddy_pairs')
      .insert({ student_a_id: studentAId, student_b_id: studentBId, school_id: schoolId })
      .select()
      .single();
    if (error) { console.error('Create buddy pair error:', error); return null; }
    return data;
  },

  async end(pairId) {
    const { error } = await supabase
      .from('buddy_pairs')
      .update({ status: 'ended' })
      .eq('id', pairId);
    if (error) console.error('End buddy pair error:', error);
  },
};

export const buddyMessages = {
  async getForPair(pairId) {
    const { data, error } = await supabase
      .from('buddy_messages')
      .select('*, sender:students!buddy_messages_sender_id_fkey(id, name, avatar_emoji)')
      .eq('pair_id', pairId)
      .order('created_at', { ascending: true });
    if (error) return [];
    return data || [];
  },

  async send(pairId, senderId, message, isTemplate = false) {
    const { data, error } = await supabase
      .from('buddy_messages')
      .insert({ pair_id: pairId, sender_id: senderId, message, is_template: isTemplate })
      .select()
      .single();
    if (error) { console.error('Send buddy message error:', error); return null; }
    return data;
  },
};

export const stallAlerts = {
  async getInactiveStudents(guideId, daysThreshold = 3) {
    const { data, error } = await supabase.rpc('get_inactive_students', {
      p_guide_id: guideId,
      p_days_threshold: daysThreshold,
    });
    if (error) { console.error('Get inactive students error:', error); return []; }
    return data || [];
  },

  async dismiss(alertId) {
    const { error } = await supabase
      .from('stall_alerts')
      .update({ status: 'dismissed' })
      .eq('id', alertId);
    if (error) console.error('Dismiss alert error:', error);
  },

  async flagParent(alertId) {
    const { error } = await supabase
      .from('stall_alerts')
      .update({ status: 'flagged_parent', parent_flagged_at: new Date().toISOString() })
      .eq('id', alertId);
    if (error) console.error('Flag parent error:', error);
  },
};
```

**Step 2: Commit**
```bash
git add src/lib/api.js
git commit -m "feat: add buddy pairs, buddy messages, and stall alerts API"
```

---

### Task 5: Student Pulse Section in Dashboard

**Files:**
- Modify: `src/pages/Dashboard.jsx`

**Step 1: Import stallAlerts**

```javascript
import { stallAlerts } from '../lib/api';
```

**Step 2: Add state and load inactive students**

```javascript
const [inactiveStudents, setInactiveStudents] = useState([]);
```

In the existing useEffect that loads dashboard data (or add a new one):
```javascript
useEffect(() => {
  if (!user?.id) return;
  stallAlerts.getInactiveStudents(user.id, 3).then(setInactiveStudents);
}, [user?.id]);
```

**Step 3: Add Student Pulse section**

After the Active Projects section, add:

```jsx
{/* Student Pulse */}
{inactiveStudents.length > 0 && (
  <div style={{ marginTop: 32 }}>
    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)', marginBottom: 12 }}>
      Student Pulse
    </h2>
    <div style={{ display: 'grid', gap: 8 }}>
      {inactiveStudents.map(s => (
        <div key={s.student_id} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
          background: s.days_inactive >= 7 ? 'rgba(200,50,50,0.04)' : 'rgba(184,134,11,0.04)',
          border: `1px solid ${s.days_inactive >= 7 ? 'rgba(200,50,50,0.15)' : 'rgba(184,134,11,0.15)'}`,
          borderRadius: 8,
        }}>
          <span style={{ fontSize: 20 }}>{s.avatar_emoji || '🧭'}</span>
          <div style={{ flex: 1 }}>
            <Link to={`/students/${s.student_id}`} style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', textDecoration: 'none' }}>
              {s.student_name}
            </Link>
            <div style={{ fontSize: 10, color: s.days_inactive >= 7 ? 'var(--specimen-red)' : 'var(--compass-gold)' }}>
              {s.days_inactive >= 999 ? 'Never active' : `${s.days_inactive} days since last activity`}
            </div>
          </div>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 10,
            background: s.days_inactive >= 7 ? 'rgba(200,50,50,0.1)' : 'rgba(184,134,11,0.1)',
            color: s.days_inactive >= 7 ? 'var(--specimen-red)' : 'var(--compass-gold)',
            fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
          }}>
            {s.days_inactive >= 7 ? 'Stalled' : 'Drifting'}
          </span>
        </div>
      ))}
    </div>
  </div>
)}
```

Import `Link` from react-router-dom if not already imported.

**Step 4: Commit**
```bash
git add src/pages/Dashboard.jsx
git commit -m "feat: add Student Pulse section to dashboard with stall detection"
```

---

### Task 6: Buddy Pairing UI in StudentsPage

**Files:**
- Modify: `src/pages/StudentsPage.jsx`

**Step 1: Add imports**

```javascript
import { buddyPairs } from '../lib/api';
import { Users } from 'lucide-react';
```

**Step 2: Add state**

```javascript
const [pairs, setPairs] = useState([]);
const [pairingMode, setPairingMode] = useState(false);
const [selectedForPairing, setSelectedForPairing] = useState([]);
```

**Step 3: Load existing pairs**

```javascript
useEffect(() => {
  if (!school?.id) return;
  buddyPairs.getForSchool(school.id).then(setPairs);
}, [school?.id]);
```

**Step 4: Add pairing handler**

```javascript
const handlePair = async () => {
  if (selectedForPairing.length !== 2 || !school?.id) return;
  const pair = await buddyPairs.create(selectedForPairing[0], selectedForPairing[1], school.id);
  if (pair) {
    setPairs(prev => [...prev, pair]);
    setSelectedForPairing([]);
    setPairingMode(false);
  }
};

const handleUnpair = async (pairId) => {
  await buddyPairs.end(pairId);
  setPairs(prev => prev.filter(p => p.id !== pairId));
};

const getBuddy = (studentId) => {
  const pair = pairs.find(p => p.student_a_id === studentId || p.student_b_id === studentId);
  if (!pair) return null;
  const buddy = pair.student_a_id === studentId ? pair.student_b : pair.student_a;
  return { buddy, pairId: pair.id };
};
```

**Step 5: Add "Pair Buddies" button in the header area**

Near existing buttons (like Groups):

```jsx
<button onClick={() => setPairingMode(!pairingMode)} style={{
  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
  borderRadius: 8, border: pairingMode ? '1.5px solid var(--compass-gold)' : '1px solid var(--pencil)',
  background: pairingMode ? 'rgba(184,134,11,0.06)' : 'var(--chalk)',
  color: 'var(--ink)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
}}>
  <Users size={13} /> {pairingMode ? 'Cancel Pairing' : 'Pair Buddies'}
</button>
```

**Step 6: Show pairing state in student rows**

In each student row, show buddy info or pairing checkbox:

```jsx
{/* Buddy indicator */}
{pairingMode ? (
  <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
    <input type="checkbox"
      checked={selectedForPairing.includes(student.id)}
      disabled={selectedForPairing.length >= 2 && !selectedForPairing.includes(student.id)}
      onChange={e => {
        if (e.target.checked) setSelectedForPairing(prev => [...prev, student.id]);
        else setSelectedForPairing(prev => prev.filter(id => id !== student.id));
      }}
      style={{ accentColor: 'var(--compass-gold)' }}
    />
    <span style={{ fontSize: 10 }}>Select</span>
  </label>
) : getBuddy(student.id) ? (
  <span style={{
    fontSize: 10, padding: '2px 8px', borderRadius: 10,
    background: 'rgba(184,134,11,0.08)', color: 'var(--compass-gold)',
  }}>
    Buddy: {getBuddy(student.id).buddy?.name}
  </span>
) : null}
```

**Step 7: Show "Confirm Pair" button when 2 selected**

```jsx
{pairingMode && selectedForPairing.length === 2 && (
  <button onClick={handlePair} style={{
    padding: '8px 16px', borderRadius: 8, border: 'none',
    background: 'var(--compass-gold)', color: 'white', fontSize: 12, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'var(--font-body)',
  }}>
    Pair These Learners
  </button>
)}
```

**Step 8: Commit**
```bash
git add src/pages/StudentsPage.jsx
git commit -m "feat: add buddy pairing UI to students page"
```

---

### Task 7: Buddy Nudge in StudentQuestPage

**Files:**
- Modify: `src/pages/student/StudentQuestPage.jsx`

**Step 1: Add imports**

```javascript
import { buddyPairs, buddyMessages } from '../../lib/api';
```

**Step 2: Add state**

```javascript
const [buddy, setBuddy] = useState(null);
const [buddyPair, setBuddyPair] = useState(null);
const [buddyMsgs, setBuddyMsgs] = useState([]);
const [nudgeMessage, setNudgeMessage] = useState('');
const [showBuddyChat, setShowBuddyChat] = useState(false);
```

**Step 3: Load buddy on mount**

```javascript
useEffect(() => {
  if (!studentId) return;
  const loadBuddy = async () => {
    const pair = await buddyPairs.getForStudent(studentId);
    if (pair) {
      setBuddyPair(pair);
      const buddyStudent = pair.student_a_id === studentId ? pair.student_b : pair.student_a;
      setBuddy(buddyStudent);
      const msgs = await buddyMessages.getForPair(pair.id);
      setBuddyMsgs(msgs);
    }
  };
  loadBuddy();
}, [studentId]);
```

**Step 4: Add buddy send handler**

```javascript
const handleSendNudge = async (msg) => {
  if (!buddyPair || !msg.trim()) return;
  const sent = await buddyMessages.send(buddyPair.id, studentId, msg);
  if (sent) {
    setBuddyMsgs(prev => [...prev, sent]);
    setNudgeMessage('');
  }
};
```

**Step 5: Add buddy chip in header**

Near the student name/header area, show buddy info:

```jsx
{buddy && (
  <button onClick={() => setShowBuddyChat(!showBuddyChat)} style={{
    display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
    borderRadius: 20, border: '1px solid var(--pencil)', background: 'var(--chalk)',
    color: 'var(--ink)', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
  }}>
    <span>{buddy.avatar_emoji || '🧭'}</span> Buddy: {buddy.name}
  </button>
)}
```

**Step 6: Add buddy message panel**

Below the header or as a small collapsible section:

```jsx
{showBuddyChat && buddy && (
  <div style={{
    margin: '8px 0 16px', padding: 12, background: 'var(--chalk)',
    border: '1px solid var(--pencil)', borderRadius: 10,
  }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
      Messages with {buddy.name}
    </div>
    {/* Quick templates */}
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
      {['Hey, your expedition misses you!', 'Want to work on our projects together?', 'I just finished a stage — you got this!'].map(tmpl => (
        <button key={tmpl} onClick={() => handleSendNudge(tmpl)} style={{
          padding: '4px 10px', borderRadius: 14, border: '1px solid var(--pencil)',
          background: 'var(--paper)', color: 'var(--graphite)', fontSize: 10,
          cursor: 'pointer', fontFamily: 'var(--font-body)',
        }}>
          {tmpl}
        </button>
      ))}
    </div>
    {/* Messages */}
    <div style={{ maxHeight: 120, overflowY: 'auto', marginBottom: 8 }}>
      {buddyMsgs.map(msg => (
        <div key={msg.id} style={{
          padding: '4px 0', fontSize: 11, color: 'var(--ink)',
          textAlign: msg.sender_id === studentId ? 'right' : 'left',
        }}>
          <span style={{ fontWeight: 600, fontSize: 10, color: 'var(--graphite)' }}>
            {msg.sender?.name || (msg.sender_id === studentId ? 'You' : buddy.name)}
          </span>
          <div>{msg.message}</div>
        </div>
      ))}
    </div>
    {/* Custom message */}
    <div style={{ display: 'flex', gap: 6 }}>
      <input value={nudgeMessage} onChange={e => setNudgeMessage(e.target.value)}
        placeholder="Send encouragement..." onKeyDown={e => e.key === 'Enter' && handleSendNudge(nudgeMessage)}
        style={{
          flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--pencil)',
          fontSize: 11, fontFamily: 'var(--font-body)', outline: 'none',
        }}
      />
      <button onClick={() => handleSendNudge(nudgeMessage)} style={{
        padding: '6px 12px', borderRadius: 6, border: 'none',
        background: 'var(--compass-gold)', color: 'white', fontSize: 11,
        fontWeight: 600, cursor: 'pointer',
      }}>Send</button>
    </div>
  </div>
)}
```

**Step 7: Commit**
```bash
git add src/pages/student/StudentQuestPage.jsx
git commit -m "feat: add buddy nudge and messaging in student quest page"
```

---

## Part C: Community Repository (L4.4) — Tasks 8-10

### Task 8: Community API

**Files:**
- Modify: `src/lib/api.js`

**Step 1: Add community projects API**

```javascript
// ===================== COMMUNITY REPOSITORY =====================

export const communityProjects = {
  async listForSchool(schoolId, { pathway, gradeBand, sortBy } = {}) {
    let query = supabase
      .from('community_projects')
      .select('*, shared_by_profile:profiles!community_projects_shared_by_fkey(id, full_name)')
      .eq('school_id', schoolId);
    if (pathway) query = query.contains('tags', [pathway]);
    if (gradeBand) query = query.eq('grade_band', gradeBand);
    if (sortBy === 'rating') query = query.order('avg_rating', { ascending: false });
    else if (sortBy === 'popular') query = query.order('use_count', { ascending: false });
    else query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) { console.error('List community projects error:', error); return []; }
    return data || [];
  },

  async share(questId, schoolId, sharedBy, { title, description, tags, gradeBand, projectMode, careerPathway }) {
    const { data, error } = await supabase
      .from('community_projects')
      .insert({
        quest_id: questId, school_id: schoolId, shared_by: sharedBy,
        title, description, tags, grade_band: gradeBand,
        project_mode: projectMode, career_pathway: careerPathway,
      })
      .select()
      .single();
    if (error) { console.error('Share project error:', error); return null; }
    return data;
  },

  async incrementUsage(projectId) {
    await supabase.rpc('increment_usage', { p_id: projectId }).catch(() => {
      // Fallback: manual increment
      supabase.from('community_projects').select('use_count').eq('id', projectId).single()
        .then(({ data }) => {
          if (data) supabase.from('community_projects').update({ use_count: (data.use_count || 0) + 1 }).eq('id', projectId);
        });
    });
  },
};

export const communityReviews = {
  async getForProject(projectId) {
    const { data, error } = await supabase
      .from('community_reviews')
      .select('*, reviewer:profiles!community_reviews_reviewer_id_fkey(id, full_name)')
      .eq('community_project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  },

  async submit(projectId, reviewerId, rating, reviewText) {
    const { data, error } = await supabase
      .from('community_reviews')
      .upsert({ community_project_id: projectId, reviewer_id: reviewerId, rating, review_text: reviewText }, { onConflict: 'community_project_id,reviewer_id' })
      .select()
      .single();
    if (error) { console.error('Submit review error:', error); return null; }

    // Update avg_rating
    const { data: reviews } = await supabase
      .from('community_reviews')
      .select('rating')
      .eq('community_project_id', projectId);
    if (reviews?.length > 0) {
      const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      await supabase.from('community_projects').update({ avg_rating: Math.round(avg * 10) / 10 }).eq('id', projectId);
    }

    return data;
  },
};
```

**Step 2: Commit**
```bash
git add src/lib/api.js
git commit -m "feat: add community projects and reviews API"
```

---

### Task 9: Community Repository Page

**Files:**
- Create: `src/pages/CommunityRepository.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/layout/TopBar.jsx`

**Step 1: Add route and nav**

In App.jsx:
```javascript
import CommunityRepository from './pages/CommunityRepository';
// In protected routes:
<Route path="/community" element={<CommunityRepository />} />
```

In TopBar.jsx, add "Community" to NAV_LINKS after "Year Plan":
```javascript
{ path: '/community', label: 'Community' },
```

**Step 2: Create CommunityRepository.jsx**

```jsx
import { useState, useEffect } from 'react';
import { Star, Search, Loader2, Copy, ExternalLink, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { communityProjects, communityReviews } from '../lib/api';
import { supabase } from '../lib/supabase';
import TopBar from '../components/layout/TopBar';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'popular', label: 'Most Used' },
];

export default function CommunityRepository() {
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  useEffect(() => {
    if (!profile?.school_id) return;
    setLoading(true);
    communityProjects.listForSchool(profile.school_id, { sortBy }).then(data => {
      setProjects(data);
      setLoading(false);
    });
  }, [profile?.school_id, sortBy]);

  const filtered = projects.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectProject = async (project) => {
    setSelectedProject(project);
    const revs = await communityReviews.getForProject(project.id);
    setReviews(revs);
  };

  const handleSubmitReview = async () => {
    if (!selectedProject || !reviewRating || !user) return;
    const rev = await communityReviews.submit(selectedProject.id, user.id, reviewRating, reviewText);
    if (rev) {
      setReviews(prev => [rev, ...prev.filter(r => r.reviewer_id !== user.id)]);
      setReviewRating(0);
      setReviewText('');
      // Refresh project to get updated avg_rating
      const updated = await communityProjects.listForSchool(profile.school_id, { sortBy });
      setProjects(updated);
    }
  };

  const handleClone = (project) => {
    // Store project data in sessionStorage and navigate to QuestBuilder
    sessionStorage.setItem('community_clone', JSON.stringify({
      title: project.title,
      description: project.description,
      tags: project.tags,
      career_pathway: project.career_pathway,
    }));
    communityProjects.incrementUsage(project.id);
    window.location.href = '/quest/new';
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', fontFamily: 'var(--font-body)' }}>
      <TopBar />
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--ink)', margin: '0 0 4px' }}>
          Community Repository
        </h1>
        <p style={{ fontSize: 12, color: 'var(--graphite)', marginBottom: 20 }}>
          Projects shared by guides at your school. Browse, rate, and use as templates.
        </p>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search size={14} color="var(--graphite)" style={{ position: 'absolute', left: 10, top: 9 }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search projects..."
              style={{
                width: '100%', padding: '8px 10px 8px 30px', borderRadius: 8,
                border: '1px solid var(--pencil)', fontSize: 12, fontFamily: 'var(--font-body)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 0, border: '1px solid var(--pencil)', borderRadius: 6, overflow: 'hidden' }}>
            {SORT_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setSortBy(opt.value)} style={{
                padding: '6px 12px', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600,
                background: sortBy === opt.value ? 'var(--ink)' : 'var(--chalk)',
                color: sortBy === opt.value ? 'var(--chalk)' : 'var(--graphite)',
                fontFamily: 'var(--font-body)', borderRight: '1px solid var(--pencil)',
              }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Loader2 size={20} color="var(--graphite)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--pencil)' }}>
            <p style={{ fontSize: 13 }}>No shared projects yet. Complete a project and share it!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {filtered.map(project => (
              <div key={project.id} onClick={() => handleSelectProject(project)} style={{
                background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 12,
                padding: '16px 18px', cursor: 'pointer', transition: 'border-color 0.15s',
                borderColor: selectedProject?.id === project.id ? 'var(--lab-blue)' : 'var(--pencil)',
              }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--ink)', margin: '0 0 4px' }}>
                  {project.title}
                </h3>
                <p style={{ fontSize: 11, color: 'var(--graphite)', margin: '0 0 8px', lineHeight: 1.4 }}>
                  {project.description.length > 100 ? project.description.slice(0, 100) + '...' : project.description}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--compass-gold)' }}>
                    <Star size={11} fill="var(--compass-gold)" /> {project.avg_rating || '—'}
                  </div>
                  <span style={{ color: 'var(--pencil)' }}>|</span>
                  <span style={{ color: 'var(--graphite)' }}>Used {project.use_count}x</span>
                  {project.career_pathway && (
                    <>
                      <span style={{ color: 'var(--pencil)' }}>|</span>
                      <span style={{ color: 'var(--graphite)' }}>{project.career_pathway}</span>
                    </>
                  )}
                </div>
                {project.tags?.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                    {project.tags.map((tag, i) => (
                      <span key={i} style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: 9,
                        background: 'rgba(27,73,101,0.06)', color: 'var(--lab-blue)',
                        fontFamily: 'var(--font-mono)',
                      }}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Selected Project Detail */}
        {selectedProject && (
          <div style={{
            marginTop: 24, background: 'var(--chalk)', border: '1px solid var(--pencil)',
            borderRadius: 14, padding: '20px 24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)', margin: 0 }}>
                {selectedProject.title}
              </h2>
              <button onClick={() => handleClone(selectedProject)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                borderRadius: 8, border: 'none', background: 'var(--lab-blue)',
                color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}>
                <Copy size={13} /> Use as Template
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--graphite)', lineHeight: 1.5, marginBottom: 16 }}>
              {selectedProject.description}
            </p>
            <div style={{ fontSize: 10, color: 'var(--pencil)', marginBottom: 16 }}>
              Shared by {selectedProject.shared_by_profile?.full_name || 'a guide'}
            </div>

            {/* Reviews */}
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Reviews</h3>
            {reviews.map(rev => (
              <div key={rev.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--parchment)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{ display: 'flex', gap: 1 }}>
                    {[1,2,3,4,5].map(n => (
                      <Star key={n} size={10} fill={n <= rev.rating ? 'var(--compass-gold)' : 'none'}
                        color={n <= rev.rating ? 'var(--compass-gold)' : 'var(--pencil)'} />
                    ))}
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--graphite)' }}>{rev.reviewer?.full_name || 'Guide'}</span>
                </div>
                {rev.review_text && <p style={{ fontSize: 11, color: 'var(--ink)', margin: 0 }}>{rev.review_text}</p>}
              </div>
            ))}

            {/* Write review */}
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
                {[1,2,3,4,5].map(n => (
                  <Star key={n} size={16} style={{ cursor: 'pointer' }}
                    fill={n <= reviewRating ? 'var(--compass-gold)' : 'none'}
                    color={n <= reviewRating ? 'var(--compass-gold)' : 'var(--pencil)'}
                    onClick={() => setReviewRating(n)}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={reviewText} onChange={e => setReviewText(e.target.value)}
                  placeholder="Share your experience..."
                  style={{
                    flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--pencil)',
                    fontSize: 11, fontFamily: 'var(--font-body)', outline: 'none',
                  }}
                />
                <button onClick={handleSubmitReview} disabled={!reviewRating} style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none',
                  background: reviewRating ? 'var(--compass-gold)' : 'var(--pencil)',
                  color: 'white', fontSize: 11, fontWeight: 600, cursor: reviewRating ? 'pointer' : 'not-allowed',
                }}>
                  Review
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
```

**Step 3: Commit**
```bash
git add src/pages/CommunityRepository.jsx src/App.jsx src/components/layout/TopBar.jsx
git commit -m "feat: add Community Repository page with search, ratings, reviews, and clone"
```

---

### Task 10: "Share to Community" Button in QuestMap

**Files:**
- Modify: `src/pages/QuestMap.jsx`

**Step 1: Add imports**

```javascript
import { communityProjects } from '../lib/api';
import { Share2 } from 'lucide-react';
```

(Share2 may already be imported — check first.)

**Step 2: Add share handler**

```javascript
const [shared, setShared] = useState(false);

const handleShareToCommunity = async () => {
  if (!quest || !profile?.school_id || shared) return;
  const result = await communityProjects.share(quest.id, profile.school_id, user.id, {
    title: quest.title,
    description: quest.subtitle || quest.narrative_hook || '',
    tags: quest.academic_standards || [],
    gradeBand: quest.grade_band || null,
    projectMode: quest.project_mode || 'mixed',
    careerPathway: quest.career_pathway || null,
  });
  if (result) setShared(true);
};
```

**Step 3: Add Share button**

Find the quest action buttons area (near Copy Link, Archive, etc.). Add:

```jsx
{quest?.status === 'completed' && (
  <button onClick={handleShareToCommunity} disabled={shared} style={{
    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
    borderRadius: 8, border: '1px solid var(--pencil)',
    background: shared ? 'rgba(75,139,59,0.06)' : 'var(--chalk)',
    color: shared ? 'var(--field-green)' : 'var(--ink)',
    fontSize: 11, fontWeight: 600, cursor: shared ? 'default' : 'pointer',
    fontFamily: 'var(--font-body)',
  }}>
    <Share2 size={13} /> {shared ? 'Shared!' : 'Share to Community'}
  </button>
)}
```

**Step 4: Commit**
```bash
git add src/pages/QuestMap.jsx
git commit -m "feat: add Share to Community button on completed quests"
```

---

## Verification Checklist

- [ ] `npm run build` passes
- [ ] /mastery/:studentId shows World Map with skill islands
- [ ] Knowledge Graph toggle shows connected skill nodes
- [ ] Student Profile has "Mastery Map" link
- [ ] Dashboard shows "Student Pulse" for inactive learners
- [ ] StudentsPage has "Pair Buddies" flow
- [ ] StudentQuestPage shows buddy chip and messaging
- [ ] /community shows shared projects with search + sort
- [ ] Star rating and review submission works
- [ ] "Use as Template" navigates to QuestBuilder
- [ ] "Share to Community" appears on completed quests

## Migration to Run

Run in Supabase SQL Editor:
1. `supabase/migrations/028_layer4_community.sql`
