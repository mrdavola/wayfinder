# Learner Progress Bar Graph — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a tabbed progress section (Projects / Core Skills / Domains / Custom) with horizontal bar graphs showing learner mastery, visible to both students and guides.

**Architecture:** Reusable `<LearnerProgress />` component that fetches skill assessments, project completion, and domain data. Embedded in StudentProfilePage (guide), new `/my-progress` route (student), and Dashboard sidebar (mini bars). AI pipeline enriched to auto-insert skill_assessments on every submission review.

**Tech Stack:** React, Supabase (existing tables), CSS custom properties (Wayfinder design system), existing `ai.reviewSubmission()` + `skillAssessments.bulkLog()` APIs.

---

### Task 1: Build the `<ProgressBar />` primitive component

**Files:**
- Create: `src/components/progress/ProgressBar.jsx`

**Step 1: Create the component**

```jsx
// src/components/progress/ProgressBar.jsx
import { useEffect, useState } from 'react';

function getBarColor(percentage) {
  if (percentage >= 70) return 'var(--field-green)';
  if (percentage >= 30) return 'var(--compass-gold)';
  return 'var(--specimen-red)';
}

export default function ProgressBar({ label, percentage, subtitle, onClick, color }) {
  const [animatedWidth, setAnimatedWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedWidth(percentage), 50);
    return () => clearTimeout(timer);
  }, [percentage]);

  const barColor = color || getBarColor(percentage);

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 0',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{
        width: 140,
        fontFamily: 'var(--font-body)',
        fontSize: 14,
        color: 'var(--ink)',
        fontWeight: 500,
        flexShrink: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{
          height: 6,
          borderRadius: 3,
          background: 'var(--parchment)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${animatedWidth}%`,
            borderRadius: 3,
            background: barColor,
            transition: 'width 0.6s ease-out',
          }} />
        </div>
        {subtitle && (
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            color: 'var(--graphite)',
          }}>
            {subtitle}
          </div>
        )}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 13,
        color: 'var(--graphite)',
        width: 40,
        textAlign: 'right',
        flexShrink: 0,
      }}>
        {Math.round(percentage)}%
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/progress/ProgressBar.jsx
git commit -m "feat: add ProgressBar primitive component"
```

---

### Task 2: Build the `<LearnerProgress />` tabbed container

**Files:**
- Create: `src/components/progress/LearnerProgress.jsx`

**Step 1: Create the component with tabs and summary stats**

```jsx
// src/components/progress/LearnerProgress.jsx
import { useState, useEffect } from 'react';
import { Target, TrendingUp, Award, BookOpen } from 'lucide-react';
import ProgressBar from './ProgressBar';
import { supabase } from '../../lib/supabase';
import { skillAssessments, skills as skillsApi } from '../../lib/api';

const CORE_SKILLS = [
  'Critical Thinking', 'Problem Solving', 'Communication',
  'Research', 'Creativity', 'Collaboration', 'Self-Direction',
];

const DOMAIN_MAP = {
  'Math': ['Quantity', 'Operations', 'Part-Whole', 'Measurement', 'Patterns', 'Spatial', 'Variables', 'Equality', 'Scaling', 'Change & Rate', 'Uncertainty', 'Logic'],
  'Science': ['Research', 'observation', 'hypothesis', 'experiment', 'data analysis', 'biology', 'chemistry', 'physics', 'ecology', 'environmental'],
  'Reading & Writing': ['Communication', 'writing', 'reading', 'vocabulary', 'grammar', 'storytelling', 'persuasion', 'narrative'],
  'Social Studies': ['history', 'geography', 'civics', 'economics', 'culture', 'government'],
  'Critical Thinking': ['Critical Thinking', 'Problem Solving', 'logic', 'reasoning', 'analysis', 'evaluation'],
  'Creativity & Design': ['Creativity', 'design', 'art', 'innovation', 'imagination', 'aesthetics'],
  'Social-Emotional': ['Collaboration', 'empathy', 'Self-Direction', 'resilience', 'leadership', 'teamwork'],
  'Technology': ['coding', 'programming', 'digital', 'technology', 'engineering', 'robotics'],
};

export default function LearnerProgress({ studentId, studentName, isGuide, quests }) {
  const [tab, setTab] = useState('projects');
  const [assessments, setAssessments] = useState({});
  const [studentSkills, setStudentSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [studentId]);

  async function loadData() {
    setLoading(true);
    try {
      const [assessData, skillsData] = await Promise.all([
        skillAssessments.getForStudentGrouped(studentId),
        skillsApi.getStudentSkills(studentId),
      ]);
      setAssessments(assessData || {});
      setStudentSkills(skillsData?.data || []);
    } catch (err) {
      console.error('LearnerProgress load error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Compute summary stats
  const completedQuests = (quests || []).filter(q => q.status === 'completed').length;
  const totalQuests = (quests || []).length;
  const totalStages = (quests || []).reduce((sum, q) => sum + (q.completed_stages || 0), 0);
  const skillEntries = Object.entries(assessments);
  const strongestSkill = skillEntries.length > 0
    ? skillEntries.sort((a, b) => (b[1].latest?.rating || 0) - (a[1].latest?.rating || 0))[0]?.[0]
    : null;

  // Build core skills data
  function getCoreSkillsData() {
    return CORE_SKILLS.map(skill => {
      const data = assessments[skill];
      if (!data) return { label: skill, percentage: 0, count: 0 };
      const allRatings = data.history?.map(h => h.rating).filter(Boolean) || [];
      if (data.latest?.rating) allRatings.push(data.latest.rating);
      const avg = allRatings.length > 0 ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : 0;
      return { label: skill, percentage: (avg / 4) * 100, count: allRatings.length };
    }).sort((a, b) => b.percentage - a.percentage);
  }

  // Build domains data
  function getDomainsData() {
    return Object.entries(DOMAIN_MAP).map(([domain, keywords]) => {
      const matchingSkills = Object.entries(assessments).filter(([name]) =>
        keywords.some(kw => name.toLowerCase().includes(kw.toLowerCase()))
      );
      if (matchingSkills.length === 0) return { label: domain, percentage: 0, count: 0 };
      const allRatings = matchingSkills.flatMap(([, data]) => {
        const ratings = data.history?.map(h => h.rating).filter(Boolean) || [];
        if (data.latest?.rating) ratings.push(data.latest.rating);
        return ratings;
      });
      const avg = allRatings.length > 0 ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : 0;
      return { label: domain, percentage: (avg / 4) * 100, count: allRatings.length };
    }).sort((a, b) => b.percentage - a.percentage);
  }

  // Build projects data
  function getProjectsData() {
    return (quests || []).map(q => {
      const total = q.total_stages || q.quest_stages?.length || 0;
      const completed = q.completed_stages || 0;
      const pct = total > 0 ? (completed / total) * 100 : 0;
      return {
        id: q.id,
        label: q.title,
        percentage: pct,
        subtitle: `${completed}/${total} stages`,
        color: pct >= 100 ? 'var(--field-green)' : 'var(--compass-gold)',
      };
    }).sort((a, b) => b.percentage - a.percentage);
  }

  const tabs = [
    { key: 'projects', label: 'Projects' },
    { key: 'skills', label: 'Core Skills' },
    { key: 'domains', label: 'Domains' },
    ...(isGuide ? [{ key: 'custom', label: 'Custom' }] : []),
  ];

  return (
    <div style={{ marginBottom: 32 }}>
      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
        marginBottom: 20,
      }}>
        {[
          { icon: BookOpen, label: 'Projects', value: `${completedQuests} of ${totalQuests}` },
          { icon: Award, label: 'Strongest Skill', value: strongestSkill || '—' },
          { icon: Target, label: 'Stages Done', value: totalStages },
          { icon: TrendingUp, label: 'Growth', value: '—' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--chalk)',
            border: '1px solid var(--pencil)',
            borderRadius: 8,
            padding: '14px 16px',
            textAlign: 'center',
          }}>
            <stat.icon size={16} style={{ color: 'var(--compass-gold)', marginBottom: 4 }} />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink)' }}>
              {stat.value}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 0,
        borderBottom: '1px solid var(--pencil)',
        marginBottom: 20,
      }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? 'var(--ink)' : 'var(--graphite)',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid var(--compass-gold)' : '2px solid transparent',
              padding: '8px 16px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--graphite)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
          Loading progress...
        </div>
      ) : (
        <div style={{
          background: 'var(--chalk)',
          border: '1px solid var(--pencil)',
          borderRadius: 10,
          padding: '20px 24px',
        }}>
          {tab === 'projects' && (
            getProjectsData().length > 0
              ? getProjectsData().map(p => (
                  <ProgressBar key={p.id} label={p.label} percentage={p.percentage} subtitle={p.subtitle} color={p.color} />
                ))
              : <EmptyState text="No projects yet" />
          )}
          {tab === 'skills' && (
            getCoreSkillsData().some(s => s.percentage > 0)
              ? getCoreSkillsData().map(s => (
                  <ProgressBar key={s.label} label={s.label} percentage={s.percentage} subtitle={`Based on ${s.count} assessments`} />
                ))
              : <EmptyState text="Core skill ratings will appear as projects are completed and reviewed" />
          )}
          {tab === 'domains' && (
            getDomainsData().some(d => d.percentage > 0)
              ? getDomainsData().map(d => (
                  <ProgressBar key={d.label} label={d.label} percentage={d.percentage} subtitle={`Based on ${d.count} assessments`} />
                ))
              : <EmptyState text="Domain progress will appear as skills are assessed across projects" />
          )}
          {tab === 'custom' && isGuide && (
            <EmptyState text="Custom skill tracking coming soon" />
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ padding: '32px 20px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
        No progress data yet
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--graphite)' }}>
        {text}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/progress/LearnerProgress.jsx
git commit -m "feat: add LearnerProgress tabbed container component"
```

---

### Task 3: Enrich `ai.reviewSubmission()` to return `skill_ratings`

**Files:**
- Modify: `src/lib/api.js` — the `reviewSubmission` function (around lines 979-1042)

**Step 1: Update the system prompt**

Find the `reviewSubmission` function in `api.js`. In the system prompt string, add instructions for `skill_ratings` to the JSON output format. The prompt already asks for `skill_ratings` in the expected JSON — verify this is present. If the prompt only asks for `skills_demonstrated` (a list of names), add:

```
Also rate the student on these core transferable skills (ONLY rate skills that are clearly demonstrated in this submission, skip others):
- Critical Thinking (analysis, evaluation, reasoning)
- Problem Solving (identifying issues, proposing solutions)
- Communication (clarity, organization, expression)
- Research (gathering information, citing sources)
- Creativity (originality, innovation, imagination)
- Collaboration (teamwork references, building on others' ideas)
- Self-Direction (initiative, planning, reflection)

Include a "skill_ratings" array in your JSON with objects: { "skill_name": "...", "rating": 1-4, "evidence": "one sentence" }
Rating scale: 1=emerging, 2=developing, 3=proficient, 4=advanced
```

**Step 2: Verify the JSON parsing handles `skill_ratings`**

The `parseAIJSON()` function should already handle extra fields. No change needed — just verify `skill_ratings` comes through in the returned object.

**Step 3: Commit**

```bash
git add src/lib/api.js
git commit -m "feat: enrich reviewSubmission prompt to return skill_ratings"
```

---

### Task 4: Auto-insert skill assessments after submission review

**Files:**
- Modify: `src/components/world/WorldChat.jsx` (around line 647, after feedback persistence)
- Modify: `src/pages/student/StudentQuestPage.jsx` (around line 2783, verify existing bulkLog call)

**Step 1: Add skill_ratings → skill_assessments in WorldChat.jsx**

After the `submissionFeedback.add()` call (around line 647), add:

```javascript
// Auto-insert skill assessments from AI ratings
if (review?.skill_ratings?.length > 0 && studentSession?.studentId) {
  const assessmentRecords = review.skill_ratings.map(sr => ({
    student_id: studentSession.studentId,
    skill_name: sr.skill_name || sr.skill,
    quest_id: quest.id,
    stage_id: stage.id,
    assessment_type: 'submission_review',
    rating: sr.rating,
    evidence: sr.evidence || '',
  }));
  skillAssessments.bulkLog(assessmentRecords).catch(() => {});
}
```

Make sure `skillAssessments` is imported at the top of WorldChat.jsx:
```javascript
import { skillAssessments } from '../../lib/api';
```

**Step 2: Verify StudentQuestPage already does this**

The explore agent found that StudentQuestPage lines 2783-2793 already call `skillAssessments.bulkLog()` with `result.skill_ratings`. Verify this code exists and handles both `sr.skill_name` and `sr.skill` field names.

**Step 3: Commit**

```bash
git add src/components/world/WorldChat.jsx src/pages/student/StudentQuestPage.jsx
git commit -m "feat: auto-insert skill assessments from AI review in WorldChat"
```

---

### Task 5: Integrate `<LearnerProgress />` into StudentProfilePage

**Files:**
- Modify: `src/pages/StudentProfilePage.jsx`

**Step 1: Replace the existing Progress section**

Import the new component at the top:
```javascript
import LearnerProgress from '../components/progress/LearnerProgress';
```

Find the Progress section (around lines 565-607) that renders `SkillProgressBars` and `SkillTreeView`. Replace the entire section with:

```jsx
{/* Progress — primary section */}
<div style={{ marginBottom: 32 }}>
  <h2 style={{
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-lg)',
    color: 'var(--ink)',
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  }}>
    <Target size={20} /> Progress
  </h2>
  <LearnerProgress
    studentId={student.id}
    studentName={student.name}
    isGuide={true}
    quests={quests}
  />
</div>
```

**Step 2: Move this section above the Skills and Standards sections**

The Progress section should be the first major section after the header card and Career/Mastery buttons. Move it above the existing Skills grouping.

**Step 3: Remove the old SkillProgressBars component definition (lines 47-138)**

Since `LearnerProgress` replaces it, remove the old `SkillProgressBars` function. Keep `SkillTreeView` — it's still used in the Skill Tree toggle.

**Step 4: Fetch quests for the student**

Add a quest fetch in the existing `useEffect` data loading:
```javascript
const { data: studentQuests } = await supabase
  .from('quests')
  .select('id, title, status, quest_stages(id, status)')
  .or(`student_names.cs.{${student.name}},guide_id.eq.${user.id}`)
  .order('created_at', { ascending: false });

// Compute completed stages per quest
const enrichedQuests = (studentQuests || []).map(q => ({
  ...q,
  total_stages: q.quest_stages?.length || 0,
  completed_stages: q.quest_stages?.filter(s => s.status === 'completed').length || 0,
}));
setQuests(enrichedQuests);
```

Add `const [quests, setQuests] = useState([]);` to state declarations.

**Step 5: Commit**

```bash
git add src/pages/StudentProfilePage.jsx
git commit -m "feat: integrate LearnerProgress into StudentProfilePage as primary section"
```

---

### Task 6: Create `/my-progress` student-facing page

**Files:**
- Create: `src/pages/student/MyProgressPage.jsx`
- Modify: `src/App.jsx` — add route

**Step 1: Create the page component**

```jsx
// src/pages/student/MyProgressPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import LearnerProgress from '../../components/progress/LearnerProgress';
import { supabase } from '../../lib/supabase';

export default function MyProgressPage() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = JSON.parse(sessionStorage.getItem('studentSession') || '{}');
    if (!session.studentId || !session.studentName) {
      navigate('/');
      return;
    }
    loadData(session);
  }, []);

  async function loadData(session) {
    setStudent({ id: session.studentId, name: session.studentName });

    // Load quests this student is part of
    const { data: questData } = await supabase
      .from('quests')
      .select('id, title, status, quest_stages(id, status)')
      .contains('student_names', [session.studentName])
      .order('created_at', { ascending: false });

    const enriched = (questData || []).map(q => ({
      ...q,
      total_stages: q.quest_stages?.length || 0,
      completed_stages: q.quest_stages?.filter(s => s.status === 'completed').length || 0,
    }));
    setQuests(enriched);
    setLoading(false);
  }

  if (loading || !student) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--graphite)' }}>Loading...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <div className="container" style={{ paddingTop: 24, paddingBottom: 48, maxWidth: 800 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--graphite)',
            marginBottom: 20,
          }}
        >
          <ArrowLeft size={16} /> Back
        </button>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-xl)',
          color: 'var(--ink)',
          marginBottom: 4,
        }}>
          My Progress
        </h1>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          color: 'var(--graphite)',
          marginBottom: 24,
        }}>
          {student.name}'s learning journey
        </p>

        <LearnerProgress
          studentId={student.id}
          studentName={student.name}
          isGuide={false}
          quests={quests}
        />
      </div>
    </div>
  );
}
```

**Step 2: Add route in App.jsx**

Find the public routes section (around line 68 near `/q/:id`). Add:

```jsx
<Route path="/my-progress" element={<MyProgressPage />} />
```

Add the lazy import at the top:
```javascript
const MyProgressPage = lazy(() => import('./pages/student/MyProgressPage'));
```

**Step 3: Commit**

```bash
git add src/pages/student/MyProgressPage.jsx src/App.jsx
git commit -m "feat: add /my-progress student-facing progress page"
```

---

### Task 7: Add "My Progress" button to student views

**Files:**
- Modify: `src/pages/student/StudentHome.jsx` — add progress button to header
- Modify: `src/pages/student/CampHub.jsx` — add progress nav item

**Step 1: Add button in StudentHome header area**

Find the header section in StudentHome. Add a "My Progress" button near the student name/greeting:

```jsx
<button
  onClick={() => navigate('/my-progress')}
  style={{
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'var(--chalk)', border: '1px solid var(--pencil)',
    borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
    fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
    color: 'var(--ink)',
  }}
>
  <TrendingUp size={14} /> My Progress
</button>
```

**Step 2: Add nav item in CampHub**

Find the navigation tabs in CampHub. Add a "Progress" tab that navigates to `/my-progress`.

**Step 3: Commit**

```bash
git add src/pages/student/StudentHome.jsx src/pages/student/CampHub.jsx
git commit -m "feat: add My Progress buttons to StudentHome and CampHub"
```

---

### Task 8: Add mini progress bars to Dashboard StudentsCard

**Files:**
- Modify: `src/pages/Dashboard.jsx` — the `StudentsCard` component (around lines 926-1120)

**Step 1: Fetch top skill assessments per student**

In the StudentsCard component, after fetching students, batch-fetch the latest skill assessments. For each student, get top 3 skills by rating:

```javascript
// After students are loaded, fetch assessments for mini bars
const studentIds = students.map(s => s.id);
const { data: allAssessments } = await supabase
  .from('skill_assessments')
  .select('student_id, skill_name, rating')
  .in('student_id', studentIds)
  .order('created_at', { ascending: false });

// Group by student, get top 3 unique skills by latest rating
const miniProgress = {};
for (const a of (allAssessments || [])) {
  if (!miniProgress[a.student_id]) miniProgress[a.student_id] = {};
  if (!miniProgress[a.student_id][a.skill_name]) {
    miniProgress[a.student_id][a.skill_name] = a.rating;
  }
}
setStudentProgress(miniProgress);
```

Add `const [studentProgress, setStudentProgress] = useState({});` to state.

**Step 2: Render mini bars in each student row**

After the interest tags div, add:

```jsx
{/* Mini skill bars */}
{(() => {
  const progress = studentProgress[student.id];
  if (!progress) return null;
  const top3 = Object.entries(progress)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);
  if (top3.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
      {top3.map(([skill, rating]) => (
        <div key={skill} title={`${skill}: ${Math.round((rating/4)*100)}%`} style={{
          width: 40, height: 3, borderRadius: 2,
          background: 'var(--parchment)', overflow: 'hidden',
        }}>
          <div style={{
            width: `${(rating/4)*100}%`, height: '100%', borderRadius: 2,
            background: rating >= 3 ? 'var(--field-green)' : rating >= 2 ? 'var(--compass-gold)' : 'var(--specimen-red)',
          }} />
        </div>
      ))}
    </div>
  );
})()}
```

**Step 3: Commit**

```bash
git add src/pages/Dashboard.jsx
git commit -m "feat: add mini progress bars to Dashboard student cards"
```

---

### Task 9: Push and deploy

**Step 1: Push all changes**

```bash
git push origin main
```

**Step 2: Deploy to Vercel**

```bash
vercel deploy --prod
```

**Step 3: Verify**

- Guide view: Go to `/students/:id` — Progress section should be prominent with tabs
- Student view: Navigate to `/my-progress` — should show same tabbed layout
- Dashboard: Student sidebar cards should show mini bars (only if assessments exist)
- Submit work on a student quest → check that skill_assessments records are created → bars update
