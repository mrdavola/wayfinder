# Fun Mode: Less School, More Studio

**Date:** 2026-03-15
**Branch:** `experiment/fun-mode`
**Status:** Phase 1 + Phase 2 implemented on experiment/fun-mode branch. Phase 3 (Gemini Embedding 2) pending.

## Problem Statement

Wayfinder's student experience feels like school wearing a game costume. Stages are content-heavy — students read paragraphs, review guiding questions, then submit text. The structure mirrors assignments, not creation. For a mixed-age audience (8-18), this kills engagement. Kids in this generation are creators by default (TikTok, Minecraft, Roblox Studio). They learn by making, not consuming.

**Core insight:** Too much reading, not enough creating and doing.

## Research & Principles

- **Constructionism** (Seymour Papert / MIT Media Lab): Learning happens through building artifacts, not consuming content. Scratch, Minecraft Education, and Roblox Studio prove this — the tool IS the learning.
- **Flow state** (Csikszentmihalyi): Fun = clear goals + immediate feedback + challenge matched to skill. Walls of text break flow. Making things sustains it.
- **Creator generation**: Students are default creators (video, remix, build). "Read then answer" is alien to how they naturally engage.

## Design Overview

Three phases, each building on the last:

| Phase | Name | Focus |
|-------|------|-------|
| 1 | Less School, More Studio | Rebuild stage experience — challenges + rich media creation |
| 2 | Creation Toolkit | Interactive mini-app creation tools per stage |
| 3 | Smart Connections | Gemini Embedding 2 for cross-modal assessment & discovery |

---

## Phase 1: Less School, More Studio

Ship on `experiment/fun-mode` branch for internal testing before merging to main.

### 1.1 New Stage Card

**Current flow:** Title → long description → guiding questions list → deliverable box → text submission → submit button

**New flow:** Challenge prompt (1-2 sentences) → creation mode picker → make it → share

```
┌─────────────────────────────────────┐
│  Stage Challenge (1-2 lines)        │
│  "Build a food web showing how      │
│   3 species depend on each other"   │
│                                     │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌──────┐ │
│  │Video│ │Audio│ │Photo│ │Write │ │
│  └─────┘ └─────┘ └─────┘ └──────┘ │
│         ┌──────┐ ┌──────┐          │
│         │Link  │ │File  │          │
│         └──────┘ └──────┘          │
│                                     │
│  [ AI suggested: Photo ]            │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  (creation area appears     │   │
│  │   based on selected mode)   │   │
│  └─────────────────────────────┘   │
│                                     │
│       [ Share what you made ]       │
└─────────────────────────────────────┘
```

Key changes:
- Challenge text is the ONLY thing the student reads on the card
- AI pre-selects a recommended creation mode based on student profile + stage type
- Student can pick any other mode (respects agency)
- "Share what you made" replaces "Submit"
- Guiding questions removed from the card entirely — they live in Field Guide conversation

### 1.2 Three AI Characters

**Field Guide** (default, always present)
- Role: Creative helper, encourager, unsticker
- Tone: Curious friend, not teacher
- Behavior: Asks guiding questions one at a time, conversationally, as the student works. Reacts to what they're creating.

**Challenger** (appears at checkpoints)
- Role: Devil's advocate, stress-tests the student's work
- Tone: Respectful pushback, not adversarial
- Behavior: Same as current but with age-adaptive tone

**The Mentor** (opt-in, student chooses to consult)
- Role: Socratic deep-thinker
- Tone: The wise NPC you go talk to when you want to go deeper
- Behavior: Questions assumptions, invites philosophical thinking, deepens understanding
- Key: Never appears unprompted. Student initiates. Older students may use often, younger students may never touch it.

**Three thinking modes covered:**
- Field Guide → creative support
- Challenger → defending your work
- Mentor → deepening understanding

### 1.3 Age-Adaptive AI Tone

All three characters adapt voice based on student age/profile:

**Younger (8-11):**
> "Ooh that's cool — what happens if the frog disappears from your food web?"
> "Nice! What was the hardest part to figure out?"

**Middle (11-14):**
> "Interesting angle — have you thought about what someone who disagrees would say?"
> "That's a solid start. What would make it hit harder?"

**Older (14-18):**
> "This is strong. One thing I'd push back on — where's the evidence for that second point?"
> "Real talk — would this hold up if you presented it to someone in the field?"

Implementation: Age/grade from student profile feeds into AI system prompts for all three characters.

### 1.4 Non-Linear Tier-Based Navigation

**Current:** Sequential. Stage 2 locked until stage 1 complete.

**New: Quest board model.** Stages grouped into tiers:

```
┌─ Available Now ──────────────────────┐
│  [Research]  [Explore]  [Interview]  │
│   any order, pick what grabs you     │
└──────────────────────────────────────┘
          │ complete 2 of 3 │
          ▼
┌─ Unlocks Next ───────────────────────┐
│  [Build]  [Design]                   │
└──────────────────────────────────────┘
          │ complete both │
          ▼
┌─ Final ──────────────────────────────┐
│  [Share / Present]                   │
└──────────────────────────────────────┘
```

- AI generates stages with `tier` (number) and `required_to_advance` (how many in that tier must be completed)
- Within a tier, all stages are open — student picks order
- N-of-M completion per tier (not necessarily all)
- Final tier is always a creation/presentation stage
- TreasureMap visual reworked to show tiers as clusters instead of a linear path

### 1.5 Language Overhaul

| Current | New |
|---------|-----|
| Submit | Share what you made |
| Deliverable | What you'll create |
| Guiding questions | *(removed from UI — fed to Field Guide)* |
| Stage description (paragraph) | Challenge (1-2 sentences) |
| Mark complete | Done! |
| Locked | Coming up |
| Quest/Project stages | Challenges |
| Submission | Creation |
| Feedback | Reactions |

### 1.6 AI Generation Prompt Rewrite

The quest/project generation prompt changes to output:
- **Challenge** — 1-2 sentence action prompt (not a description paragraph)
- **Suggested creation mode** — video, audio, photo, link, file, or text
- **Tier number** — which tier this stage belongs to
- **Required to advance** — how many stages in the tier must be completed to unlock the next tier
- **Hidden guiding questions** — stored in DB, fed to Field Guide during conversation, never shown to student directly

---

## Phase 2: Creation Toolkit

Build interactive mini-app creation tools that replace external creation + upload.

### 2.1 Planned Tools

| Tool | Description | Best for |
|------|-------------|----------|
| **Canvas Board** | Drag-and-drop for mood boards, evidence boards, timelines, concept maps | Visual thinking, organizing ideas |
| **Sketch Pad** | Freeform drawing and annotation | Diagrams, illustrations, quick ideation |
| **Slide Builder** | Simple 3-5 slide deck creator | Pitches, presentations, storytelling |
| **Evidence Board** | Pin clues, images, quotes — draw connections between them | Research, investigation, analysis |
| **Ranking / Sorting** | Drag items into tiers, priority matrices, ordered lists | Decision-making, evaluation, comparison |
| **Poll / Survey Builder** | Create a survey to gather data from others | Data collection, community research |
| **Checklist Builder** | Plan steps, check off as you go | Project planning, process design |
| **Comparison Table** | Fill in a matrix (pros/cons, feature grids) | Analysis, evaluation, critical thinking |

### 2.2 How It Works

- AI picks from expanded tool menu when generating stages (in addition to video/audio/photo/link/text)
- Student can still swap to any other tool or media type
- Each tool is a self-contained React component
- Creations saved as structured JSON + rendered preview
- Tools designed to be age-adaptive (simpler defaults for younger, full features for older)

### 2.3 Prioritization

Build in order of impact:
1. Canvas Board (most versatile)
2. Sketch Pad (youngest-friendly)
3. Slide Builder (presentation stages)
4. Evidence Board (investigation stages)
5. Remaining tools based on usage data

---

## Phase 3: Smart Connections (Gemini Embedding 2)

### 3.1 What It Is

Gemini Embedding 2 (`gemini-embedding-2-preview`) is Google's first natively multimodal embedding model. Maps text, images, video, audio, and documents into a single 3072-dimensional vector space. This means you can mathematically compare any media type to any other.

**Key specs:**
- Inputs: text (8K tokens), images (up to 6/request), video (up to 120s), audio, PDFs
- Output: 3072-dim vectors (truncatable to 768 or 1536 via Matryoshka representation)
- Free tier available via Gemini API

### 3.2 Use Cases for Wayfinder

**Cross-modal skill assessment:**
A student records a video explaining ecosystems. Another draws a food web. A third writes an essay. Embeddings let us assess conceptual understanding regardless of creation format — meeting students where they are.

**"Show me similar" discovery:**
Students can browse creations from other students that are conceptually related to theirs, across all media types. A video about bridges surfaces alongside a sketch about structural engineering.

**Smarter student grouping:**
Group students by what they expressed and understood, not just what they typed. Embedding similarity across modalities reveals deeper conceptual alignment.

**Standards alignment:**
Match student creations (any format) to learning standards/competencies. A voice memo can demonstrate mastery just as well as a written response.

### 3.3 Data Model Prep

Phase 1 should keep the submission/creation data model flexible:
- Store creation type (video, audio, photo, text, etc.)
- Store raw content or URL reference
- Reserve a `vector` column (or adjacent table) for future embedding storage
- No embedding computation in Phase 1 — just ensure the schema can accommodate it later

---

## Implementation Notes

- All Phase 1 work happens on `experiment/fun-mode` branch
- Internal testing before any merge to main
- Vercel only auto-deploys main — experiment branch requires manual deploy or preview URL
- Existing DB schema (stages, submissions, guide_messages) may need migration for tier fields and creation_mode
- AI prompt changes (generation + Field Guide + Challenger + Mentor) are the highest-leverage changes — they transform the experience without major UI rebuilds
