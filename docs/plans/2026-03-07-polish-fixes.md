# Polish & Fixes Plan — Student Quest Experience

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix critical UX bugs and polish the student quest experience based on user testing feedback.

**Priority:** These are blocking issues that make the app feel broken or untrustworthy.

---

## Part A: Critical Bugs (Tasks 1-4)

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

## Part D: Student Quest Page Layout Overhaul (Tasks 9-11)

### Task 9: Horizontal animated trail map (replace vertical)

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

### Task 10: Better spacing and readability for stage content

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

### Task 11: Optimize student quest page for web (wider screens)

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

Tasks 1-4 first (critical bugs), then 5-8 (AI quality), then 9-11 (layout). Tasks 1-4 can be parallelized. Tasks 5-8 can be parallelized. Tasks 9-11 are sequential.
