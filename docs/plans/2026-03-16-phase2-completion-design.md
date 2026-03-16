# Phase 2 Completion: Remaining Creation Tools + Age-Adaptive Defaults

**Date:** 2026-03-16
**Branch:** `experiment/fun-mode`
**Status:** Design approved, ready for implementation

## What's Missing

Phase 2 shipped 3 of 8 creation tools. This document covers the remaining 5 tools plus age-adaptive defaults for all 8.

## Tools to Build

### 1. Evidence Board (creation mode)

Freeform investigation board where students create zones, add evidence, and build arguments.

- Students create their own zones (not pre-defined)
- Add evidence cards with type (fact, quote, data, observation) and source
- Drag evidence into zones
- Write a conclusion/argument
- `onSave({ zones: [...], evidence: [...], argument: '' })`

### 2. Ranking/Sorting

Two modes: linear rank (drag to reorder) or tier buckets (3 tiers).

- Add/edit/delete items
- Toggle between rank mode and tier mode
- Reasoning textarea: "Why did you rank it this way?"
- `onSave({ mode: 'rank'|'tier', items: [...], tiers: {...}, reasoning: '' })`

### 3. Poll/Survey Builder

Students design a survey (up to 10 questions).

- Question types: multiple choice, rating (1-5), yes/no, open response
- Edit question text and options
- Reorder questions
- `onSave({ title: '', questions: [{ text, type, options }] })`

### 4. Checklist Builder

Plan steps and track progress.

- Add/edit/delete/reorder steps
- Check off completed steps
- Progress bar visualization
- Notes textarea
- `onSave({ title: '', steps: [{ text, done }], notes: '' })`

### 5. Comparison Table

Dynamic matrix with editable headers and cells.

- Add/remove rows and columns
- Editable headers and cell content
- Conclusion textarea
- `onSave({ columns: [...], rows: [...], cells: {...}, conclusion: '' })`

## Age-Adaptive Defaults

All 8 tools accept an optional `ageGroup` prop: `'young'` (8-11), `'middle'` (11-14, default), `'older'` (14-18).

| Aspect | Young | Middle | Older |
|--------|-------|--------|-------|
| Font sizes | 16px+ body | 14px body | 13px body |
| Touch targets | 48px+ | 40px | 36px |
| Max items | Lower (10 cards, 6 steps) | Standard (15, 10) | Higher (20, 15) |
| Labels | Simple, with emoji | Standard | Compact |
| Default mode | Simplest variant | Standard | Full features |

## Integration Checklist (per tool)

1. Create component in `src/components/creation/`
2. Export from `src/components/creation/index.js`
3. Add to CREATION_MODES in StudentQuestPage.jsx
4. Add render block in SubmissionPanel
5. Add to isCreationTool check
6. Add serialization in serializeCreationDataForAI()
7. Add embedding prep in prepareEmbeddingContent()
8. Add SubmissionView rendering for completed work
9. Update submission_type CHECK constraint (migration)
10. Update ai.generateQuest() to suggest new tools

## DB Migration

Extend submission_type CHECK to include: 'evidence_board', 'ranking', 'survey', 'checklist', 'comparison'
