# Immersive World + Voice + API Security Design

> **Date:** 2026-03-08
> **Status:** Approved

## Goal

Three interconnected features: (1) secure all API keys via server-side proxy, (2) integrate World Labs Marble for true 3D immersive worlds, (3) add ElevenLabs voice narration for immersive experience.

## Part 1: API Proxy Layer

**Problem**: All API keys (VITE_ANTHROPIC_API_KEY, VITE_GEMINI_API_KEY, VITE_PERPLEXITY_API_KEY) are bundled into client JavaScript. Anyone can open DevTools and steal them.

**Solution**: Vercel Serverless Functions at `/api/*` that proxy every external API call.

```
Browser  →  /api/ai  →  Anthropic / Gemini
Browser  →  /api/perplexity  →  Perplexity Sonar
Browser  →  /api/worldlabs  →  World Labs Marble
Browser  →  /api/voice  →  ElevenLabs TTS
```

- Create `api/ai.js`, `api/perplexity.js`, `api/worldlabs.js`, `api/voice.js` in project root
- Each reads server-side env vars (no `VITE_` prefix)
- Client code changes from direct SDK usage to `fetch('/api/...')`
- `getAiSettings()` localStorage override still works for model selection, keys come from server
- Local dev: `vercel dev` instead of `npm run dev`
- Vercel Dashboard: add ANTHROPIC_API_KEY, GEMINI_API_KEY, PERPLEXITY_API_KEY, WORLDLABS_API_KEY, ELEVENLABS_API_KEY

## Part 2: Marble World Labs Integration

**Architecture:**

```
Quest Creation (Step 4):
  1. AI generates quest + scene design (existing)
  2. Marble Mini generates 3D world (~30-45s)
  3. Gemini generates panorama fallback (existing, parallel)
  4. Save both URLs to quest record

Student Enters World:
  1. Load Marble iframe (primary) OR Three.js panorama (fallback)
  2. HTML overlay with floating hotspot circles
  3. Click hotspot → slide-in panel with challenge content
  4. Submit/talk/type inside the overlay — never leave the world

Background Upgrade:
  After Mini world displays, kick off Marble Plus (~5 min)
  When done, swap iframe src seamlessly
```

**Iframe + Overlay layout:**
```
┌──────────────────────────────────────┐
│  Marble iframe (full 3D world)       │
│                                      │
│    ◯ Stage 1      ◯ Stage 3         │
│                                      │
│         ◯ Stage 2                    │
│                        ┌────────────┐│
│                        │ Challenge  ││
│    ◯ Stage 4           │ Submit box ││
│                        │ Voice btn  ││
│                        └────────────┘│
│  [Exit]                    [Voice]   │
└──────────────────────────────────────┘
```

**Data:**
- New DB columns on quests: `marble_world_url`, `marble_operation_id`, `marble_model`
- Keep existing `world_scene_url` (Gemini panorama) as fallback
- `api/worldlabs.js` handles generation + polling

**Fallback logic:**
1. marble_world_url exists → iframe embed
2. world_scene_url exists → Three.js panorama (Gemini)
3. Neither → "Generating your world..." loading state

## Part 3: ElevenLabs Voice Narration

**Scope:**
1. **World intro**: Voice describes scene on entry (~2-3 sentences)
2. **Challenge narration**: Voice reads challenge prompt on hotspot click
3. **Feedback voice**: AI feedback read aloud after submission

**Implementation:**
- `api/voice.js` serverless function → ElevenLabs TTS API
- Returns audio stream, client plays via `<audio>` element
- One warm, encouraging voice (configurable later)
- Fallback: Web Speech API (free, already implemented via `useSpeech` hook)

**Not in scope:** Conversational NPC, student voice input

## Decisions

| Decision | Choice |
|----------|--------|
| Marble embed | Iframe (Option A) |
| Generation timing | Mini preview + Plus upgrade (Option C) |
| Hotspot style | Floating HTML circles over iframe |
| Fallback | Auto to Gemini panorama with error toast |
| API keys | All server-side via Vercel Serverless Functions |
| Voice | ElevenLabs TTS for narration, Web Speech as fallback |
