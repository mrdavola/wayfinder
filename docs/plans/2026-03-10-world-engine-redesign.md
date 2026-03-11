# World Engine Redesign — Immersive Hero's Journey

**Date:** 2026-03-10
**Status:** Approved
**Context:** Feedback round 4 — simplify UX, make student experience immersive, not feel like school

---

## Design Decisions

| Decision | Answer |
|----------|--------|
| Primary focus | Both student + facilitator in parallel |
| Student onboarding | 2 screens → into first world (<2 min) |
| Core student experience | Full immersive Hero's Journey world |
| Between projects | Camp hub (trophies, next adventure, campfire reflection) |
| Skills system | AI-observed + metacognitive reflection (no self-rating) |
| Submissions | Chat-based, in-world, presenting to Mentor character |
| Facilitator dashboard | Keep as-is |
| XP / Ranks | Keep visible |
| Skill visualization (guides) | Horizontal progress bars with evidence (replaces radar chart) |
| Student login | PIN (shown at Camp after first session) |

---

## 1. World Engine — How Worlds Get Born

When a project is created (by guide or AI from student's curiosity answer), the AI generates a **World Blueprint** alongside the project content:

```
World Blueprint = {
  setting:       "The Dying Reef"
  atmosphere:    "deep ocean — bioluminescent, pressure, mystery"
  palette:       { bg: deep navy, accent: cyan glow, text: soft white }
  ambientAudio:  "underwater-deep"
  mentor:        { name: "Dr. Coral", personality: "warm but direct marine biologist" }
  challenger:    { name: "The Bleach", personality: "creeping force — uncomfortable questions about human impact" }
  stages: [
    { location: "The Surface", beat: "Call to Adventure" },
    { location: "The Shallows", beat: "Crossing the Threshold" },
    { location: "The Deep Wall", beat: "Tests & Allies" },
    { location: "The Graveyard", beat: "The Ordeal" },
    { location: "The Nursery", beat: "The Reward" },
  ]
  tone:          "serious, scientific, emotionally grounded"
}
```

**Hero's Journey beats map to stages automatically.** Every project follows: ordinary world → call → threshold → tests → ordeal → reward → return. Stages get slotted into these beats.

**Grade band shapes tone:**
- **3-5**: Wonder, fantastical framing. Talking sea turtle ally. Vivid but simple language.
- **6-8**: Grittier, real-world stakes. Real scientist characters. Actual data. Challenging language.

**Guide can override** any element — setting, characters, tone. Defaults are smart enough most won't need to.

---

## 2. Inside the World — Student Experience

When a student enters a world, the entire UI transforms. No dashboard chrome. No nav bar. They're in it.

### 3 Layers:

**Layer 1 — Atmosphere (background)**
Full-bleed CSS atmosphere from palette + setting. Dynamic CSS: gradients, particle effects (bubbles underwater, embers in cave, stars in space), color shifts as journey progresses. SimulationChamber vibe, themed per world.

**Layer 2 — Location (main content)**
Current stage as a place. Top: narrative moment ("You descend past the shallow corals. Dr. Coral's voice crackles: 'This is where it gets real.'"). Below: the work — guiding questions, deliverable, challenge — framed as what you're doing here, in this location.

**Layer 3 — Characters (interaction panels)**
Chat panels slide in from side/bottom:
- **Mentor** (Field Guide) — always available, speaks in character. Socratic, helpful, in their voice.
- **Challenger** — appears at key beats. Narrative confrontation, not a popup quiz. Pushes back on work.
- **Submission** — present work to the Mentor via chat. Paste text, upload file, or record voice. Mentor responds with feedback in character, AI scoring runs behind the scenes.

### Navigation
Minimal journey line (top or side) showing location in the world. Clicking next unlocked location triggers brief transition (narrative line + atmosphere shift). No stage list — a path through the world.

### Leaving
Subtle exit icon (compass/door) in corner → Camp. Progress saved, return to exact position.

### No visible scores
ScoreCard runs behind scenes (guides see it). Student gets Mentor's reaction: "Strong work. But what about the economic angle?" If not at mastery, Mentor guides deeper. If mastery achieved, path forward unlocks with narrative celebration.

### XP + Rank
Visible. XP earned through submissions, reflections, challenger responses. Rank evolves through worlds completed.

---

## 3. Camp — Between Worlds

Visual scene, not a dashboard. Campfire at dusk, soft ambient audio, artifacts around you.

### Journey Wall
Completed projects as visual artifacts/trophies. Reef project = glowing coral fragment. Coding project = circuit emblem. Clickable to revisit world (read-only journal). Camp fills up over time = portfolio made tangible.

### The Horizon
One clear next step:
- Guide-assigned project waiting: "A new world is calling..." + setting teaser
- Or "Chart your own course" — curiosity question again, generates new world

### The Campfire
Metacognitive reflection after completing a world. Not a form — a conversation:
- "You just mapped an entire dying reef. How did you figure out where to start?"
- "What surprised you most about what you found?"
- "If someone asked you to do this again for a different ecosystem, what would you do differently?"

AI-generated based on specific project, actual submissions, observed skill areas. Student responds in text or voice. AI reads reflection and updates skill assessments behind the scenes.

**That's it.** No "Update My Skills." No "Explore a Skill." No leaderboard. Just: where you've been, where you're going, a moment to think.

---

## 4. Onboarding → First World

A new student's first 2 minutes:

**Screen 1: "Who are you?"**
First name + emoji avatar (grid of ~16). Grade band already known from guide's invite link.

**Screen 2: "What lights you up?"**
10-12 interest bubbles to tap (Music, Animals, Building, Space, Sports, Art, Coding, Nature, Food, Stories, Science, Games). Pick as many as you want, min 2. Below: one big text box — "What's something you're curious about right now?" Conversational framing.

**Then: "Building your world..."**
Atmospheric loading — colors shift, ambient sound fades in. AI generates World Blueprint from interests + curiosity + grade band. World opens. Mentor introduces themselves. Journey begins.

**PIN shown at Camp** after first session, not during onboarding.

---

## 5. Skills System

### No self-rating
Students never see a "rate yourself" screen. Skills are AI-observed from:
- Submission content and quality
- Field Guide / Mentor conversations
- Challenger encounter responses
- Campfire reflections (metacognitive reasoning)

### Metacognitive reflection (not rating)
At the Campfire, AI asks Socratic questions:
- "How did you solve it?"
- "What was the hardest part and how did you work through it?"
- "What would you try differently next time?"

AI infers skill growth from HOW they reason, not which button they click. "I just guessed" vs "I tried two approaches and the second worked because..." — the AI sees the difference.

### Guide view
Skills shown as horizontal progress bars with evidence:
- "Critical Thinking ████████░░ — strong evidence from 3 submissions"
- Not radar charts. Simple, scannable, actionable.

---

## 6. Guide Side

### Dashboard
Stays as-is. No changes.

### Project cards (enhancement)
Show student's current location in the journey: "Jordan is at The Deep Wall (Stage 4 of 5)" — narrative sense, not just a percentage.

### Student progress view
When guide clicks into a student's project:
- Each stage with actual submissions
- Raw AI scores and feedback (not in-character version)
- Metacognitive reflections from Campfire
- Skills as horizontal progress bars with evidence citations
- Flags: "Stuck 3 days" or "Thin challenger response — check in"

**Guides never enter the world.** They see data + actionable signals.

---

## 7. Architecture

### New (build from scratch)
- **WorldEngine** — AI world blueprint generation (setting, characters, palette, audio, narrative beats)
- **WorldRenderer** — immersive full-screen experience (atmosphere, location content, character panels)
- **CampHub** — between-worlds scene (journey wall, horizon, campfire)
- **WorldChat** — unified chat interface (mentor, challenger, submissions all conversational)
- **Simplified LearnerIntakeForm** — 2 screens → into first world

### Evolve (heavy refactor)
- `StudentQuestPage` → becomes WorldRenderer. Bones exist (stages, AI sidebar, challenger, submissions) but UI transforms completely
- `SimulationChamber` → its immersive patterns (ambient audio, atmospheric UI, conversational AI) become foundation for all worlds
- `StudentHome` → becomes CampHub. 7-10 sections → 3 elements
- AI functions in `api.js` → `generateQuest()` now also generates World Blueprint; `questHelp()` and `reviewSubmission()` respond in-character; new reflection generation

### Stays as-is
- `Dashboard.jsx`
- `QuestBuilder.jsx` (maybe add world theme preview in Step 5)
- `QuestLibrary.jsx`
- `TopBar.jsx`, auth system, Supabase backend
- `StudentsPage.jsx`
- `StudentProfilePage.jsx` (swap radar for progress bars)

### Removed / replaced
- `SkillEditorModal` — no more manual skill rating
- `ExploreModal` — skills come through doing
- `TreasureMap` / `BranchingMap` SVGs — replaced by in-world journey line
- `ScoreCard` visible to students — feedback through Mentor character
- Leaderboard on student pages

---

## 8. Feedback Traceability

| Feedback Item | Design Response |
|---------------|----------------|
| Simplify facilitator dashboard | Keep as-is (already good) |
| Student onboarding too many questions | 2 screens: name+avatar, interests+curiosity → into world |
| Student dashboard too many options | Replaced with Camp (3 elements) |
| Skill self-rating unclear (4 options) | Removed. AI-observed + metacognitive reflection |
| Radar chart hard to read | Replaced with horizontal progress bars for guides |
| Submission flow overwhelming | Chat-based, in-world, presenting to Mentor |
| 3D/immersive — be intentional | Full World Engine, every project is an immersive journey |
| Video game onboarding | Students learn by doing, not by filling forms |
