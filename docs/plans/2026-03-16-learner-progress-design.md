# Learner Progress Bar Graph — Design

## Summary

A tabbed progress section showing horizontal bar graphs of skill mastery, visible to both students and guides. Replaces the current empty "No progress data yet" state with real, AI-assessed data.

## Where It Lives

### Guide View — StudentProfilePage (`/students/:id`)
- Progress section promoted to **top** of page, below header card
- Full-width, tabbed, largest section on the page
- Guide-specific extras: Custom tab, edit ratings, comparison context, CSV export

### Student View — New route `/my-progress`
- Public page (sessionStorage identity, no auth)
- Same tabbed layout as guide view minus Custom tab and edit controls
- Accessible from: StudentHome header, Camp Hub nav, post-stage-completion toast

### Dashboard — Mini bars
- Each student row in Dashboard sidebar gets top 3 skill bars (tiny inline, 40px wide, 3px tall)
- Color-coded same as full view
- Click → navigates to student profile progress

## The Component: `<LearnerProgress />`

Reusable tabbed component embedded in all three locations.

### Summary Stats Row (above tabs, always visible)
- Projects Completed: `3 of 8`
- Strongest Skill: `Communication`
- Stages Completed: `14`
- Growth Trend: `↑` arrow if improving over last 30 days

### Tab 1: Projects (default)
- Each active/completed project as a horizontal bar
- Label: project title | Bar: stages completed / total | Percentage
- Color: `--compass-gold` for in-progress, `--field-green` for complete
- Clicking a project bar → navigates to that quest

### Tab 2: Core Skills
- 7 horizontal bars: Critical Thinking, Problem Solving, Communication, Research, Creativity, Collaboration, Self-Direction
- Each bar = average rating across all assessments for that skill (scaled 0-100%)
- Color thresholds: `--field-green` (70%+), `--compass-gold` (30-69%), `--specimen-red` (<30%)
- Small text below each bar: "Based on X assessments"
- Sorted highest → lowest

### Tab 3: Domains
- 8 academic domains: Math, Science, Reading & Writing, Social Studies, Critical Thinking, Creativity & Design, Social-Emotional, Technology
- Same bar style as Core Skills
- Derived from skill assessments mapped to domains (same mapping ProgressRadar uses)
- Optional: small radar chart summary at top, bars below for detail

### Tab 4: Custom (guide-only)
- Guide can add custom skills to track for their school
- Same bar layout
- Students see custom skills inline with Core Skills (read-only)

### Bar Graph Style (Wayfinder light theme)
- Skill/project name: left-aligned, font-body, 14px, --ink
- Horizontal bar: 6px tall, rounded corners
- Fill color: threshold-based (green/gold/red)
- Track: --parchment background
- Percentage: right-aligned, font-mono, --graphite
- Sorted highest first
- Subtle grow animation on load

## AI Assessment Pipeline

### Current (broken)
```
Student submits → ai.reviewSubmission() → feedback + skills_demonstrated (names only) → submission_feedback → DEAD END
```

### New
```
Student submits → ai.reviewSubmission() → feedback + skill_ratings → submission_feedback → AUTO-INSERT skill_assessments → bars update
```

### AI Prompt Change
`ai.reviewSubmission()` response adds `skill_ratings`:

```json
{
  "feedback": "Great work...",
  "score": 72,
  "skill_ratings": [
    { "skill": "Critical Thinking", "rating": 3, "evidence": "Strong analysis of habitat data" },
    { "skill": "Communication", "rating": 2, "evidence": "Ideas present but could be clearer" },
    { "skill": "Research", "rating": 4, "evidence": "Excellent use of field observations" }
  ]
}
```

- AI rates only core skills relevant to the submission (not all 7 every time)
- Rating scale: 1 (emerging) → 2 (developing) → 3 (proficient) → 4 (advanced)
- Overall score (0-100) also maps to the project's academic domain

### Auto-insert location
In the existing `onSubmitComplete` flow (StudentQuestPage/WorldChat), after `ai.reviewSubmission()` returns — call `skillAssessments.bulkLog()` with the ratings.

## Guide-Specific Features

- **Custom tab**: "Add Skill" button → guide types skill name → tracked for school
- **Edit ratings**: Pencil icon on each bar, manual override/adjust
- **Comparison context**: "School avg: 62%" next to student's percentage
- **Export**: Download icon → CSV of progress data

## Student-Facing Extras

- **Recent Activity** section below bars: last 5 submissions with skills assessed and scores
- **Post-completion toast**: "Your skills updated! View progress →" after stage completion

## Data Sources (no new tables)

- `skill_assessments` — point-in-time ratings (1-4) from AI reviews
- `student_skills` — catalog state of proficiency levels
- `skill_snapshots` — historical records for growth trends
- `submission_feedback` — AI feedback with skills_demonstrated
- `quest_stages` + `stage_submissions` — project completion data

## Page Order Change (StudentProfilePage)

**Before:** Header → Career/Mastery buttons → Progress (small) → Skills → Standards
**After:** Header → Career/Mastery buttons → **Progress (large, tabbed)** → Project History → Skills → Standards
