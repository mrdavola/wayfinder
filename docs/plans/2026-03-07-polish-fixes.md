# Polish & Fixes Plan — Student Quest Experience

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix critical UX bugs and polish the student quest experience based on user testing feedback.

**Priority:** These are blocking issues that make the app feel broken or untrustworthy.

---

## Part A: Critical Bugs (Tasks 1-5)

### Task 0: HIGHEST PRIORITY — Rewrite AI generation tone: real-world, not fantasy exploration

**Problem:** Every generated quest feels like a fantasy theme park adventure — "wayfarers," "expeditions," "mystical journeys." Students see through this. It doesn't feel real. Quests should feel like real-world projects with real roles, real deliverables, and real career connections.

**GOOD example (what we want):**
> "Cosmic Habitats: Building Life Beyond Earth (or for a Better Earth!)"
> "Imagine you're part of an elite team tasked with designing future homes for humans and plants..."
> Simulation: "You are a team of Bio-Habitat Specialists presenting your final design to the 'Cosmic Gardens' corporation..."

**BAD example (what we have now):**
> "Aethelgard's Secrets: Initial Recon"
> "The expedition reaches a crossroads, wayfinder..."
> Generic exploration/adventure framing on every quest

**Files:** `src/lib/api.js` — `WAYFINDER_SYSTEM_PROMPT`, `generateQuest`, `generateBranchingQuest`, `questHelp`, all student-facing AI prompts

**Fix — Rewrite the core system prompt and generation instructions:**

1. **WAYFINDER_SYSTEM_PROMPT** — Replace exploration/adventure framing with:
   - "Generate projects grounded in REAL scenarios. Students take on real professional roles (engineer, biologist, urban planner, journalist, game designer) working on real problems."
   - "The narrative hook should connect to something the student actually cares about (their interests, games they play, things they build) but the PROJECT itself should be real work."
   - "Deliverables should be real artifacts: designs, reports, presentations, prototypes, models — things a professional in that field would actually produce."
   - "NEVER use generic fantasy/exploration language like 'wayfarer,' 'expedition,' 'mystical journey,' 'ancient secrets.' The framing can be exciting and imaginative, but it must be rooted in reality."

2. **Simulation stages** — Every quest must include a career simulation where the student role-plays a real professional scenario:
   - "You are a [real job title] presenting to [real audience]"
   - "You've been hired by [real-sounding company] to solve [real problem]"
   - NOT "You are an explorer in the Cave of Knowledge"

3. **Stage descriptions** — Should read like project briefs, not storybook pages:
   - "Research different extreme environments on Earth" NOT "The mystical lands call you to discover ancient ecosystems"
   - "Create a design proposal for..." NOT "Craft your expedition report for the guild..."

4. **Field Guide (questHelp)** — The AI assistant should talk like a supportive mentor/coach, not a fantasy guide character. Use the student's name, reference their actual interests, ask about their real thinking.

5. **Expedition challenges** — Keep the gamified framing (these are meant to be fun), but ground the content in real knowledge. "Navigation Check" is fine, but the actual question should test real understanding, not fantasy lore.

**Commit:** `feat: rewrite AI prompts — real-world projects, real roles, no fantasy framing`

---

### Task 1: Fix "Launching..." infinite spin on quest save

**Problem:** Clicking "Launch" in QuestBuilder Step 6 spins forever. User has to refresh multiple times.

**File:** `src/pages/QuestBuilder.jsx`

**Investigation:** Find the `saveQuest` / launch handler. Likely the save function hits an error silently (could be branch-saving failing for non-branching quests, or a missing await, or the stage-saving loop timing out). Add error handling and ensure the button resets on failure. Also check if the `is_branching` column or `stageBranches.bulkCreate` call throws when there are no branches.

**Fix:**
- Wrap the entire save flow in try/catch
- Reset saving state in the catch block
- Add a timeout fallback (if save takes >30s, show error and reset)
- Check that branching-specific save code only runs when `isBranching` is true AND `generatedQuest?.is_branching` is true
- Console.log any errors for debugging

**Commit:** `fix: prevent infinite Launching spinner — add error recovery to quest save`

---

### Task 2: Fix "Submitting..." infinite spin on student work submission

**Problem:** Clicking submit on student work spins forever. User has to refresh and resubmit.

**File:** `src/pages/student/StudentQuestPage.jsx`

**Investigation:** Find the submission handler (likely `handleSubmit` or similar). The AI review call (`ai.reviewSubmission`) may be failing silently, or the skill assessment chain after it may throw. The submitting state never resets.

**Fix:**
- Wrap the submission + AI review + skill assessment chain in try/catch
- Reset `submitting` state in catch and finally blocks
- Show a brief error toast/message if submission fails
- Ensure the submission is saved to Supabase BEFORE the AI review call (so work isn't lost if AI fails)

**Commit:** `fix: prevent infinite Submitting spinner — save work before AI review`

---

### Task 3: Hide broken source links from TrustBadge

**Problem:** Source URLs from AI-generated content almost never resolve to real pages. Showing fake links makes the app seem less reputable than showing no links.

**File:** `src/components/ui/TrustBadge.jsx`

**Fix:**
- Remove the "View source" link from the tooltip entirely
- Keep the trust tier label and icon (Trusted source / Needs review / etc.)
- Keep the guide override buttons (Mark verified / Mark incorrect)
- In the future, we can add URL validation, but for now hiding is better than showing broken links

**Commit:** `fix: hide source links from TrustBadge — URLs are unreliable`

---

### Task 4: Strip markdown from AI outputs in student view

**Problem:** AI responses show raw markdown (`*asterisks*`, `**bold**`, etc.) instead of rendered text.

**Files:** `src/pages/student/StudentQuestPage.jsx`

**Investigation:** Find where AI feedback, Field Guide messages, and "What to Explore Next" are rendered. They're displaying raw text with markdown syntax.

**Fix:**
- Create a simple `renderMarkdown(text)` utility that converts:
  - `**text**` → `<strong>text</strong>`
  - `*text*` → `<em>text</em>`
  - `\n` → `<br/>`
  - Bullet lists (`- item` or `* item`) → proper list items
- Apply it to: Field Guide responses, AI feedback cards, "What to Explore Next" section, submission feedback
- Use `dangerouslySetInnerHTML` with the sanitized output, or use a simple component

**Commit:** `fix: render markdown in AI outputs instead of showing raw syntax`

---

## Part B: AI Generation Quality (Tasks 5-7)

### Task 5: Fix standards coverage X marks — ensure AI maps standards to stages

**Problem:** Standards Coverage in QuestBuilder Step 6 shows all X marks (red circles), meaning the AI isn't mapping academic_skills_embedded back to the requested standards.

**File:** `src/lib/api.js` (AI generation prompts) and `src/pages/QuestBuilder.jsx` (coverage display)

**Investigation:** Check how Standards Coverage is calculated. The AI generates `academic_skills_embedded` per stage, but the coverage checker likely compares these against the selected standards codes. The AI may be generating skill descriptions instead of matching the exact standard codes.

**Fix:**
- In the generation prompt (both `generateQuest` and `generateBranchingQuest`), add explicit instruction: "For academic_skills_embedded, use the EXACT standard codes provided (e.g., '5.G.A.1', 'W.5.2'), not paraphrased descriptions"
- If the coverage checker does exact string matching, also add fuzzy matching (check if the standard code appears anywhere in the embedded skill string)

**Commit:** `fix: AI now uses exact standard codes in academic_skills_embedded`

---

### Task 6: Add guiding questions to choice_fork stages

**Problem:** Branch point (choice_fork) stages have no guiding questions, making them feel empty compared to other stages.

**File:** `src/lib/api.js` — branching quest prompt

**Fix:**
- In the `generateBranchingQuest` prompt, explicitly require: "Choice fork stages MUST include guiding_questions that help the student think about which path to choose. Example: 'What aspect of the problem interests you most — the hands-on investigation or the creative design?'"
- In the JSON schema example, add `guiding_questions` to the choice_fork stage

**Commit:** `fix: choice_fork stages now generate guiding questions`

---

### Task 7: Age-adapt language in expedition challenges and AI content

**Problem:** Wording may be too advanced for younger learners (K-2, 3-5). Need to match reading level to grade band.

**Files:** `src/lib/api.js` — all AI prompts that generate student-facing content

**Fix:**
- Add grade-level adaptation instructions to these prompts:
  - `generateQuest` / `generateBranchingQuest` — stage descriptions, guiding questions
  - `questHelp` (Field Guide) — already has some, strengthen it
  - `reviewSubmission` — feedback language
  - `evaluateChallenge` — challenge evaluation responses
  - expedition challenge generation in `generateQuest`
- Add to system prompts: "CRITICAL: Adapt ALL student-facing language to the learner's grade level. K-2: simple sentences, familiar words, max 2 syllables. 3-5: clear language, define any advanced terms. 6-8: can use subject vocabulary with context. 9-12: academic language appropriate."
- Pass `gradeBand` or `grade_level` through to all relevant AI calls

**Commit:** `feat: age-adapt AI language to student grade level across all prompts`

---

## Part C: Require Simulations (Task 8)

### Task 8: Ensure every quest includes at least one simulation stage

**Problem:** No simulations are being generated. Every project should have at least one.

**File:** `src/lib/api.js` — `generateQuest` and `generateBranchingQuest` prompts

**Fix:**
- Add to both generation prompts: "REQUIRED: At least one stage MUST be of type 'simulate'. A simulation stage puts the student in an immersive scenario where they apply what they've learned — role-playing as a scientist, engineer, city planner, etc. The simulation should feel like a game or adventure, not a worksheet."
- Add validation after generation: if no simulate stage exists, log a warning (don't block, but flag it)
- The simulate stage type is already in the allowed stage_type CHECK constraint

**Commit:** `feat: require at least one simulation stage in every generated quest`

---

## Part D: Challenger Boss Encounters (Task 9)

### Task 9: Make the Challenger a prominent "mini boss" encounter

**Problem:** The Devil's Advocate / Challenger is too subtle — it's a small card in the sidebar that's easy to ignore. It should feel like a boss encounter that pops up, demands attention, and tests what the student actually knows. This is one of the most important learning moments.

**Files:**
- `src/pages/student/StudentQuestPage.jsx` — challenger trigger logic + UI
- `src/components/gamified/ChallengerEncounter.jsx` — NEW component
- `src/lib/api.js` — `ai.devilsAdvocate()` prompt improvements

**Current behavior:** ChallengerCard appears inline in the AI sidebar. Easy to miss. Feels optional.

**New behavior — Boss Encounter:**

1. **Dramatic entrance:** When triggered, the Challenger takes over the screen with a modal/overlay:
   - Dark semi-transparent backdrop
   - Challenger avatar (use a distinct icon — maybe a flame or lightning bolt)
   - Animated entrance (slide up from bottom or fade in with scale)
   - Sound cue (optional, via Web Speech or a subtle CSS animation pulse)
   - Bold title: "CHALLENGER APPEARS" or the challenger's name

2. **The challenge itself:**
   - Large, readable challenge text — a pointed question that tests understanding
   - NOT a quiz. It's more like: "You said X, but what about Y? How do you explain that?"
   - The AI should reference what the student actually submitted/said
   - Timer or urgency visual (pulsing border, not a countdown — no test anxiety)

3. **Student response:**
   - Large textarea for their response
   - "Stand Your Ground" button (not "Submit" — this is a boss fight)
   - EP reward shown upfront: "Defeat this challenge: +30 EP"

4. **Result:**
   - If strong response: "CHALLENGER DEFEATED" with celebration animation, EP awarded, skill assessment logged
   - If weak response: "The Challenger isn't convinced..." with a follow-up question or hint. They can try again (no penalty, reduced EP on retry)
   - Response and result persist — show "Challenged" badge on the stage with collapsed response

5. **Trigger points (more aggressive than current):**
   - After EVERY stage completion (not just checkpoints)
   - After short/low-effort submissions (< 50 words)
   - When the student advances quickly through multiple stages
   - Random chance (~30%) even on good submissions to keep them on their toes
   - The AI should adapt difficulty: harder challenges for students who keep defeating them

6. **AI prompt improvements:**
   - The Challenger should have personality — skeptical but fair, like a tough mentor
   - Reference the student's actual work: "You wrote about X, but you didn't mention Y. Can you explain why?"
   - Grade-level adapted language (same as Task 7)
   - Should feel like a real conversation, not a generated quiz question

**Component structure:**
```
ChallengerEncounter (modal overlay)
├── ChallengerAvatar (animated icon/character)
├── ChallengeText (the question)
├── ResponseArea (textarea + submit)
├── ResultDisplay (defeated/retry)
└── EPReward (points earned)
```

**Commit:** `feat: redesign Challenger as prominent boss encounter with modal overlay`

---

## Part E: Student Quest Page Layout Overhaul (Tasks 10-12)

### Task 10: Horizontal animated trail map (replace vertical)

**Problem:** The vertical trail map on the student quest page takes too much space and doesn't feel like a journey. Should be horizontal with animation between stages.

**File:** `src/pages/student/StudentQuestPage.jsx` and the TreasureMap SVG component

**Investigation:** Find `TreasureMap` component. It renders a vertical SVG path with landmark nodes.

**Fix:**
- Redesign TreasureMap as a horizontal scrollable trail:
  - Nodes flow left-to-right with a connecting path
  - Active node is centered/highlighted with a pulse animation
  - Completed nodes show checkmarks, upcoming nodes are dimmed
  - Smooth scroll animation when advancing to next stage
  - On mobile: horizontal scroll with snap points
- The BranchingMap should also be horizontal (tree spreads right instead of down)
- Keep landmarks and landmark names
- Add a CSS transition when stage status changes (node lights up, path fills in)

**Commit:** `feat: horizontal animated trail map for student quest page`

---

### Task 11: Better spacing and readability for stage content

**Problem:** Stage content (description, questions, deliverable) is too cramped. Doesn't breathe.

**File:** `src/pages/student/StudentQuestPage.jsx`

**Fix:**
- Increase padding inside stage cards (current ~16px → 24px)
- Add more vertical spacing between sections (description, questions, deliverable, submission)
- Make stage titles larger and more prominent
- Add subtle dividers between sections
- Ensure max-width of content area is ~680px for comfortable reading
- On mobile: full-width with comfortable margins (16px sides)
- Questions should have more breathing room between them (12px gap → 16px)

**Commit:** `fix: improve spacing and readability of stage content in student view`

---

### Task 12: Optimize student quest page for web (wider screens)

**Problem:** The page doesn't use wider screen space well. Content is narrow and centered awkwardly.

**File:** `src/pages/student/StudentQuestPage.jsx`

**Fix:**
- On desktop (>1024px): Use a two-column layout:
  - Left column (60%): Stage content with good max-width
  - Right column (40%): Trail map (vertical is fine here as sidebar), AI sidebar, buddy chat
- On tablet (768-1024px): Single column but wider content area
- On mobile (<768px): Current single column with horizontal trail at top
- The AI sidebar should be sticky on desktop, overlay on mobile (this may already work)

**Commit:** `feat: responsive two-column layout for student quest page on desktop`

---

## Verification Checklist

- [ ] Launch button: saves quest without infinite spin, shows error on failure
- [ ] Submit button: saves work and shows feedback, doesn't spin forever
- [ ] TrustBadge: shows tier label only, no broken source links
- [ ] AI outputs: no raw markdown visible anywhere in student view
- [ ] Standards Coverage: shows green checks for matched standards
- [ ] Choice fork stages: have guiding questions
- [ ] K-2 quest: uses simple age-appropriate language
- [ ] Every generated quest: contains at least one simulate stage
- [ ] Trail map: horizontal, animated stage transitions
- [ ] Stage content: well-spaced, readable, comfortable
- [ ] Desktop: two-column layout with sidebar

---

## Execution Order

1. **Task 0 FIRST** — rewrite AI tone (this changes the entire feel of the product)
2. **Tasks 1-4** — critical bugs (Launch/Submit spinners, hide broken links, strip markdown) — parallelizable
3. **Tasks 5-8** — AI quality (standards, guiding questions, age-adaptation, simulations) — parallelizable
4. **Task 9** — Challenger boss encounters (big feature, do alone)
5. **Tasks 10-12** — layout overhaul (horizontal trail, spacing, responsive) — sequential

Total: 13 tasks. Task 0 is the most impactful single change. Task 9 is the biggest new feature.
