# Immersive World + Voice + API Security Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Secure all API keys via Vercel Serverless Functions, integrate World Labs Marble for 3D immersive worlds, and wire ElevenLabs voice narration into the immersive experience.

**Architecture:** Vercel Serverless Functions proxy all external API calls (Anthropic, Gemini, Perplexity, World Labs, ElevenLabs). Client code calls `/api/*` endpoints instead of external APIs directly. Marble worlds embed via iframe with HTML hotspot overlay. ElevenLabs voice (already implemented in `useSpeech.js`) routes through the proxy. Web Speech API is the free fallback.

**Tech Stack:** Vercel Serverless Functions (Node.js), World Labs Marble API, ElevenLabs TTS API, existing React+Vite+Supabase+Three.js stack

**Design Doc:** `docs/plans/2026-03-08-immersive-world-voice-design.md`

---

## Part A: API Proxy Layer (Tasks 1-7)

### Task 1: Create the AI proxy serverless function

**Files:**
- Create: `api/ai.js`

**Context:** Currently `src/lib/api.js` calls Anthropic SDK directly (line 507-519, `dangerouslyAllowBrowser: true`) and Google Gemini SDK directly (line 477-503). Both read `VITE_*` env vars which are bundled into client JS. This serverless function receives the same params and proxies to the correct provider server-side.

**Step 1: Create `api/ai.js`**

```javascript
// api/ai.js — Vercel Serverless Function
// Proxies AI calls to Anthropic or Gemini, keeping API keys server-side

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { provider, systemPrompt, userMessage, messages, maxTokens = 2048 } = req.body;

  try {
    let text;
    if (provider === 'anthropic') {
      text = await callAnthropic({ systemPrompt, userMessage, messages, maxTokens });
    } else {
      text = await callGemini({ systemPrompt, userMessage, messages });
    }
    res.status(200).json({ text });
  } catch (err) {
    console.error('AI proxy error:', err);
    res.status(500).json({ error: err.message || 'AI call failed' });
  }
}

async function callAnthropic({ systemPrompt, userMessage, messages, maxTokens }) {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msgs = messages || [{ role: 'user', content: userMessage }];
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: msgs,
  });
  return response.content[0].text;
}

async function callGemini({ systemPrompt, userMessage, messages }) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemPrompt,
  });

  if (messages && messages.length > 0) {
    const converted = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const firstUserIdx = converted.findIndex(m => m.role === 'user');
    const history = firstUserIdx > 0 ? converted.slice(firstUserIdx) : converted;
    const lastMsg = messages[messages.length - 1];
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMsg.content);
    return result.response.text();
  } else {
    const result = await model.generateContent(userMessage);
    return result.response.text();
  }
}
```

**Step 2: Verify file exists**

Run: `ls -la api/ai.js`
Expected: file exists

**Step 3: Commit**

```bash
git add api/ai.js
git commit -m "feat: add AI proxy serverless function"
```

---

### Task 2: Create the Gemini image proxy serverless function

**Files:**
- Create: `api/image.js`

**Context:** `generateWorldImage()` in `src/lib/api.js:382-406` calls Gemini 2.5 Flash Image model directly from the browser. This needs its own endpoint because it returns base64 image data (large payload).

**Step 1: Create `api/image.js`**

```javascript
// api/image.js — Proxies image generation to Gemini
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imagePrompt } = req.body;
  if (!imagePrompt) {
    return res.status(400).json({ error: 'imagePrompt required' });
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-image',
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    });

    const result = await model.generateContent(
      `Generate a high-quality equirectangular panoramic photograph (2:1 aspect ratio, for 360-degree sphere projection). The image should be a seamless wrap-around environment as if taken by a 360° camera. Photorealistic, detailed, well-lit, vibrant colors. NO text or words in the image. ${imagePrompt}`
    );

    const parts = result.response.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(p => p.inlineData);
    if (!imagePart?.inlineData?.data) {
      throw new Error('No image generated');
    }

    res.status(200).json({
      base64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType || 'image/png',
    });
  } catch (err) {
    console.error('Image generation error:', err);
    res.status(500).json({ error: err.message || 'Image generation failed' });
  }
}
```

**Step 2: Commit**

```bash
git add api/image.js
git commit -m "feat: add Gemini image generation proxy"
```

---

### Task 3: Create the Perplexity proxy serverless function

**Files:**
- Create: `api/perplexity.js`

**Context:** `src/lib/perplexity.js` calls Perplexity API directly with `VITE_PERPLEXITY_API_KEY` from browser.

**Step 1: Create `api/perplexity.js`**

```javascript
// api/perplexity.js — Proxies Perplexity Sonar API calls
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ text: null }); // graceful degradation
  }

  const { prompt, systemPrompt } = req.body;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      console.error('Perplexity API error:', response.status);
      return res.status(200).json({ text: null });
    }

    const data = await response.json();
    res.status(200).json({ text: data.choices?.[0]?.message?.content || null });
  } catch (err) {
    console.error('Perplexity proxy error:', err);
    res.status(200).json({ text: null }); // graceful — don't break exploration
  }
}
```

**Step 2: Commit**

```bash
git add api/perplexity.js
git commit -m "feat: add Perplexity proxy serverless function"
```

---

### Task 4: Create the ElevenLabs voice proxy serverless function

**Files:**
- Create: `api/voice.js`

**Context:** `src/hooks/useSpeech.js` currently calls ElevenLabs directly with `VITE_ELEVENLABS_API_KEY` from browser (line 99-112). This proxy streams the audio response back.

**Step 1: Create `api/voice.js`**

```javascript
// api/voice.js — Proxies ElevenLabs TTS calls
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(404).json({ error: 'Voice not configured' });
  }

  const { text, voiceId = '21m00Tcm4TlvDq8ikWAM' } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'text required' });
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`ElevenLabs ${response.status}: ${body}`);
    }

    // Stream the audio back to the client
    res.setHeader('Content-Type', 'audio/mpeg');
    const buffer = Buffer.from(await response.arrayBuffer());
    res.status(200).send(buffer);
  } catch (err) {
    console.error('Voice proxy error:', err);
    res.status(500).json({ error: err.message || 'TTS failed' });
  }
}
```

**Step 2: Commit**

```bash
git add api/voice.js
git commit -m "feat: add ElevenLabs voice proxy serverless function"
```

---

### Task 5: Create the World Labs Marble proxy serverless function

**Files:**
- Create: `api/worldlabs.js`

**Context:** World Labs Marble API is async: POST to generate returns an `operation_id`, poll until `done: true`, then get `world_marble_url` and `assets.imagery.pano_url`. Two models: `Marble 0.1-mini` (~30-45s) and `Marble 0.1-plus` (~5 min). API key header: `WLT-Api-Key`.

**Step 1: Create `api/worldlabs.js`**

```javascript
// api/worldlabs.js — Proxies World Labs Marble API
const MARBLE_BASE = 'https://api.worldlabs.ai/marble/v1';

export default async function handler(req, res) {
  const apiKey = process.env.WORLDLABS_API_KEY;
  if (!apiKey) {
    return res.status(404).json({ error: 'World Labs not configured' });
  }

  const headers = {
    'WLT-Api-Key': apiKey,
    'Content-Type': 'application/json',
  };

  try {
    // POST /api/worldlabs — generate a new world
    if (req.method === 'POST') {
      const { displayName, textPrompt, imageUrl, model = 'Marble 0.1-mini' } = req.body;

      const body = { display_name: displayName || 'Wayfinder World', model };

      if (imageUrl) {
        body.world_prompt = { type: 'image', image_prompt: { url: imageUrl } };
      } else {
        body.world_prompt = { type: 'text', text_prompt: textPrompt };
      }

      const response = await fetch(`${MARBLE_BASE}/worlds:generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Marble ${response.status}: ${errText}`);
      }

      const data = await response.json();
      return res.status(200).json(data);
    }

    // GET /api/worldlabs?operationId=xxx — poll operation status
    if (req.method === 'GET') {
      const { operationId, worldId } = req.query;

      if (worldId) {
        const response = await fetch(`${MARBLE_BASE}/worlds/${worldId}`, { headers });
        if (!response.ok) throw new Error(`Marble GET world ${response.status}`);
        return res.status(200).json(await response.json());
      }

      if (operationId) {
        const response = await fetch(`${MARBLE_BASE}/operations/${operationId}`, { headers });
        if (!response.ok) throw new Error(`Marble poll ${response.status}`);
        return res.status(200).json(await response.json());
      }

      return res.status(400).json({ error: 'operationId or worldId required' });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('World Labs proxy error:', err);
    res.status(500).json({ error: err.message || 'Marble API call failed' });
  }
}
```

**Step 2: Commit**

```bash
git add api/worldlabs.js
git commit -m "feat: add World Labs Marble proxy serverless function"
```

---

### Task 6: Update vercel.json for serverless routing + update .env.example

**Files:**
- Modify: `vercel.json`
- Modify: `.env.example`

**Context:** Current `vercel.json` only has a catch-all rewrite to `index.html`. Need to ensure `/api/*` routes hit serverless functions (Vercel does this automatically for files in `/api/`, but the catch-all rewrite would intercept them). The rewrite needs to NOT match `/api/` paths.

**Step 1: Update `vercel.json`**

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ],
  "trailingSlash": false
}
```

**Step 2: Update `.env.example`**

```
# === Server-side only (Vercel Environment Variables) ===
# These keys are NEVER sent to the browser.
# Add them in Vercel Dashboard → Settings → Environment Variables
# For local dev, add them to .env (not .env.local) and use `vercel dev`

ANTHROPIC_API_KEY=your_anthropic_key
GEMINI_API_KEY=your_gemini_key
PERPLEXITY_API_KEY=pplx-your_key_here
WORLDLABS_API_KEY=your_worldlabs_key
ELEVENLABS_API_KEY=your_elevenlabs_key

# === Client-side (safe to expose) ===
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Step 3: Commit**

```bash
git add vercel.json .env.example
git commit -m "feat: configure serverless routing and update env var docs"
```

---

### Task 7: Refactor client code to use proxy endpoints

**Files:**
- Modify: `src/lib/api.js` (lines 459-532, 382-406)
- Modify: `src/lib/perplexity.js` (lines 1-36)
- Modify: `src/hooks/useSpeech.js` (lines 1-6, 84-130)

**Context:** This is the big refactor. Replace all direct SDK calls with `fetch('/api/...')`. The key change points:

1. `callGemini()` (api.js:477-503) → `fetch('/api/ai', { body: { provider: 'gemini', ... } })`
2. `callAnthropic()` (api.js:507-519) → `fetch('/api/ai', { body: { provider: 'anthropic', ... } })`
3. `generateWorldImage()` (api.js:382-406) → `fetch('/api/image', { body: { imagePrompt } })`
4. `callPerplexity()` (perplexity.js:6-36) → `fetch('/api/perplexity', { body: { prompt, systemPrompt } })`
5. `speakElevenLabs()` (useSpeech.js:84-130) → `fetch('/api/voice', { body: { text } })`

**Step 1: Refactor `src/lib/api.js` — replace `callGemini`, `callAnthropic`, `generateWorldImage`**

Replace `callGemini` function (lines ~477-503) with:
```javascript
async function callGemini({ systemPrompt, userMessage, messages }) {
  const resp = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'gemini', systemPrompt, userMessage, messages }),
  });
  if (!resp.ok) throw new Error(`AI proxy error: ${resp.status}`);
  const data = await resp.json();
  return data.text;
}
```

Replace `callAnthropic` function (lines ~507-519) with:
```javascript
async function callAnthropic({ systemPrompt, userMessage, messages, maxTokens = 2048 }) {
  const resp = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'anthropic', systemPrompt, userMessage, messages, maxTokens }),
  });
  if (!resp.ok) throw new Error(`AI proxy error: ${resp.status}`);
  const data = await resp.json();
  return data.text;
}
```

Replace `generateWorldImage` function (lines ~382-406) with:
```javascript
async function generateWorldImage(imagePrompt) {
  const resp = await fetch('/api/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imagePrompt }),
  });
  if (!resp.ok) throw new Error(`Image proxy error: ${resp.status}`);
  return resp.json(); // { base64, mimeType }
}
```

Remove the `getAiSettings()` key reads (keep model/provider selection from localStorage). Remove `import.meta.env.VITE_ANTHROPIC_API_KEY` and `import.meta.env.VITE_GEMINI_API_KEY` references. Remove `dangerouslyAllowBrowser: true`.

**Step 2: Refactor `src/lib/perplexity.js` — replace `callPerplexity`**

Replace the `callPerplexity` function (lines 6-36) with:
```javascript
async function callPerplexity(prompt, systemPrompt) {
  try {
    const resp = await fetch('/api/perplexity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, systemPrompt }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.text;
  } catch {
    return null;
  }
}
```

Remove `import.meta.env.VITE_PERPLEXITY_API_KEY` reference. Remove the early `if (!apiKey)` check (server handles that).

**Step 3: Refactor `src/hooks/useSpeech.js` — replace direct ElevenLabs call**

Replace lines 1-5 (env var reads) with:
```javascript
import { useState, useCallback, useRef } from 'react';

const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel
```

Replace `speakElevenLabs` (lines ~84-130) to call `/api/voice`:
```javascript
const speakElevenLabs = useCallback(async (text) => {
  stop();

  const cached = audioCache.get(text);
  if (cached) {
    playAudio(cached.url, audioRef, setSpeaking);
    return;
  }

  setLoading(true);
  const controller = new AbortController();
  abortRef.current = controller;

  try {
    const res = await fetch('/api/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId: VOICE_ID }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Voice ${res.status}`);

    const blob = await res.blob();
    const url = cacheSet(text, blob);
    setLoading(false);
    playAudio(url, audioRef, setSpeaking);
  } catch (err) {
    setLoading(false);
    if (err.name !== 'AbortError') {
      console.warn('ElevenLabs TTS failed, falling back to Web Speech:', err.message);
      speakWebSpeech(text);
    }
  }
}, [stop, speakWebSpeech]);
```

Update the `speak` function to always try ElevenLabs first (server returns 404 if no key configured, then falls back):
```javascript
const speak = useCallback((text) => {
  if (!text) return;
  speakElevenLabs(text); // server falls back gracefully; client catches errors → Web Speech
}, [speakElevenLabs]);
```

**Step 4: Build check**

Run: `cd "/Users/md/Quest Lab/quest-lab" && npx vite build --logLevel error 2>&1 | head -20`
Expected: Build succeeds with no errors

**Step 5: Commit**

```bash
git add src/lib/api.js src/lib/perplexity.js src/hooks/useSpeech.js
git commit -m "refactor: route all API calls through serverless proxy — no more client-side keys"
```

---

## Part B: Marble World Labs Integration (Tasks 8-12)

### Task 8: Create Supabase migration for Marble columns

**Files:**
- Create: `supabase/migrations/038_marble_worlds.sql`

**Context:** Need to store Marble world data alongside existing Gemini panorama data on the quests table.

**Step 1: Create migration**

```sql
-- 038_marble_worlds.sql
-- Add Marble World Labs columns to quests table

ALTER TABLE quests ADD COLUMN IF NOT EXISTS marble_world_url TEXT;
ALTER TABLE quests ADD COLUMN IF NOT EXISTS marble_world_id TEXT;
ALTER TABLE quests ADD COLUMN IF NOT EXISTS marble_operation_id TEXT;
ALTER TABLE quests ADD COLUMN IF NOT EXISTS marble_model TEXT DEFAULT 'Marble 0.1-mini';
ALTER TABLE quests ADD COLUMN IF NOT EXISTS marble_pano_url TEXT;
ALTER TABLE quests ADD COLUMN IF NOT EXISTS marble_thumbnail_url TEXT;

-- Index for polling active operations
CREATE INDEX IF NOT EXISTS idx_quests_marble_operation ON quests(marble_operation_id) WHERE marble_operation_id IS NOT NULL;

COMMENT ON COLUMN quests.marble_world_url IS 'Embeddable Marble viewer URL (iframe src)';
COMMENT ON COLUMN quests.marble_world_id IS 'World Labs world UUID for API lookups';
COMMENT ON COLUMN quests.marble_operation_id IS 'Active generation operation ID (null when complete)';
COMMENT ON COLUMN quests.marble_pano_url IS 'Panorama image from Marble (fallback for Three.js)';
```

**Step 2: Commit**

```bash
git add supabase/migrations/038_marble_worlds.sql
git commit -m "feat: add Marble world columns to quests table"
```

**Note:** User must run this migration in Supabase dashboard SQL editor before testing.

---

### Task 9: Add Marble generation + polling to api.js

**Files:**
- Modify: `src/lib/api.js` (add marble functions near the world scene section ~line 1375)

**Context:** Need client-side functions that call our `/api/worldlabs` proxy. Two functions: `generateMarbleWorld()` starts generation, `pollMarbleOperation()` checks status.

**Step 1: Add marble helper functions in `src/lib/api.js`**

Add these after the existing `generateFullWorldScene` function (around line 1453):

```javascript
// ===================== MARBLE WORLD LABS =====================

async function generateMarbleWorld({ textPrompt, imageUrl, displayName, model = 'Marble 0.1-mini' }) {
  const resp = await fetch('/api/worldlabs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ textPrompt, imageUrl, displayName, model }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Marble generation failed: ${resp.status}`);
  }
  return resp.json(); // { operation_id, done, ... }
}

async function pollMarbleOperation(operationId) {
  const resp = await fetch(`/api/worldlabs?operationId=${operationId}`);
  if (!resp.ok) throw new Error(`Marble poll failed: ${resp.status}`);
  return resp.json();
}

async function waitForMarbleWorld(operationId, { onProgress, maxWaitMs = 600000, intervalMs = 5000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const op = await pollMarbleOperation(operationId);
    onProgress?.(op);
    if (op.done) {
      if (op.error) throw new Error(op.error.message || 'Marble generation failed');
      return op.response; // { id, world_marble_url, assets: { imagery: { pano_url }, ... } }
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error('Marble generation timed out');
}
```

**Step 2: Add `generateMarbleFullScene` to the `ai` export object**

Add inside the `ai` object (after `generateFullWorldScene`):

```javascript
async generateMarbleScene({ questId, questTitle, stages, studentInterests, careerPathway, gradeBand }) {
  try {
    // 1. Generate scene design + image prompt (reuse existing AI)
    const sceneData = await ai.generateWorldScene({ questTitle, stages, studentInterests, careerPathway, gradeBand });
    if (!sceneData) return null;

    // 2. Start Marble Mini generation
    const op = await generateMarbleWorld({
      textPrompt: sceneData.image_prompt,
      displayName: questTitle || 'Wayfinder World',
      model: 'Marble 0.1-mini',
    });

    return {
      operationId: op.operation_id,
      hotspots: sceneData.hotspots,
      scenePrompt: sceneData.image_prompt,
      sceneDescription: sceneData.scene_description,
    };
  } catch (err) {
    console.error('Marble scene generation failed:', err);
    return null;
  }
},

async pollMarbleStatus(operationId) {
  return pollMarbleOperation(operationId);
},

async waitForMarble(operationId, callbacks) {
  return waitForMarbleWorld(operationId, callbacks);
},

async upgradeMarbleWorld({ questId, textPrompt, imageUrl, displayName }) {
  try {
    // Use pano_url from mini as image input for plus (higher quality)
    const op = await generateMarbleWorld({
      textPrompt: imageUrl ? undefined : textPrompt,
      imageUrl,
      displayName,
      model: 'Marble 0.1-plus',
    });
    return { operationId: op.operation_id };
  } catch (err) {
    console.error('Marble upgrade failed:', err);
    return null;
  }
},
```

**Step 3: Build check**

Run: `cd "/Users/md/Quest Lab/quest-lab" && npx vite build --logLevel error 2>&1 | head -20`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/lib/api.js
git commit -m "feat: add Marble world generation + polling functions"
```

---

### Task 10: Create MarbleWorldView component (iframe + hotspot overlay)

**Files:**
- Create: `src/components/immersive/MarbleWorldView.jsx`

**Context:** This replaces/augments `ImmersiveWorldView` when Marble is available. It embeds the Marble viewer in an iframe and overlays HTML hotspot circles + stage panel on top. The iframe handles all 3D navigation (WASD, mouse, touch). Hotspots are positioned around the viewport edges as a HUD (since we can't place them in 3D space inside the iframe).

**Step 1: Create the component**

```jsx
import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Volume2, VolumeX, Send, ChevronRight } from 'lucide-react';
import useSpeech from '../../hooks/useSpeech';

export default function MarbleWorldView({
  marbleUrl,
  hotspots,
  stages,
  activeStageId,
  onStageSelect,
  onStageSubmit,
  onExit,
  isMobile,
  sceneDescription,
}) {
  const [selectedStage, setSelectedStage] = useState(null);
  const [submission, setSubmission] = useState('');
  const { speak, stop, speaking, loading: voiceLoading } = useSpeech();
  const [hasSpokenIntro, setHasSpokenIntro] = useState(false);

  // Narrate scene on entry
  useEffect(() => {
    if (sceneDescription && !hasSpokenIntro) {
      const timer = setTimeout(() => {
        speak(`Welcome to your world. ${sceneDescription}`);
        setHasSpokenIntro(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [sceneDescription, hasSpokenIntro, speak]);

  const handleHotspotClick = useCallback((stageNumber) => {
    const stage = stages.find(s => s.stage_number === stageNumber);
    if (!stage || stage.status === 'locked') return;
    setSelectedStage(stage);
    setSubmission('');
    onStageSelect?.(stage.id);
    // Narrate the challenge
    if (stage.description) {
      stop();
      setTimeout(() => speak(stage.title + '. ' + stage.description), 300);
    }
  }, [stages, onStageSelect, speak, stop]);

  const handleSubmit = useCallback(() => {
    if (!submission.trim() || !selectedStage) return;
    onStageSubmit?.(selectedStage.id, submission.trim());
    setSubmission('');
  }, [submission, selectedStage, onStageSubmit]);

  // Position hotspots in a circle around viewport edges
  const hotspotPositions = (hotspots || []).map((h, i) => {
    const total = hotspots.length;
    // Distribute around edges: top, right, bottom, left
    const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
    const rx = isMobile ? 38 : 42; // % from center
    const ry = isMobile ? 36 : 40;
    return {
      ...h,
      left: `${50 + rx * Math.cos(angle)}%`,
      top: `${50 + ry * Math.sin(angle)}%`,
    };
  });

  const STATUS_COLORS = {
    active: 'var(--compass-gold)',
    completed: 'var(--field-green)',
    locked: 'var(--graphite)',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#000',
    }}>
      {/* Marble iframe — full screen */}
      <iframe
        src={marbleUrl}
        title="Immersive World"
        allow="accelerometer; gyroscope; fullscreen"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          border: 'none',
        }}
      />

      {/* HUD overlay — pointer-events: none except on interactive elements */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1001,
        pointerEvents: 'none',
      }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          padding: isMobile ? 12 : 16,
        }}>
          <button
            onClick={onExit}
            style={{
              pointerEvents: 'auto',
              padding: '8px 16px', borderRadius: 8,
              background: 'rgba(0,0,0,0.6)', color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              backdropFilter: 'blur(8px)',
            }}
          >
            <X size={14} /> Exit World
          </button>

          {/* Voice toggle */}
          <button
            onClick={() => speaking ? stop() : speak(sceneDescription || 'Look around and explore.')}
            style={{
              pointerEvents: 'auto',
              width: 40, height: 40, borderRadius: '50%',
              background: speaking ? 'var(--compass-gold)' : 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: speaking ? 'var(--ink)' : 'white',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}
          >
            {speaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>

        {/* Floating hotspot circles */}
        {hotspotPositions.map((h) => {
          const stage = stages.find(s => s.stage_number === h.stage_number) || stages[h.stage_number - 1];
          const status = stage?.status || 'locked';
          const isActive = stage?.id === selectedStage?.id;
          const color = STATUS_COLORS[status];

          return (
            <button
              key={h.stage_number}
              onClick={() => handleHotspotClick(h.stage_number)}
              style={{
                pointerEvents: status === 'locked' ? 'none' : 'auto',
                position: 'absolute',
                left: h.left, top: h.top,
                transform: 'translate(-50%, -50%)',
                width: isActive ? 56 : 48, height: isActive ? 56 : 48,
                borderRadius: '50%',
                background: color,
                border: isActive ? '3px solid white' : '2px solid rgba(255,255,255,0.6)',
                cursor: status === 'locked' ? 'default' : 'pointer',
                opacity: status === 'locked' ? 0.3 : 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 0, padding: 0,
                boxShadow: status === 'active'
                  ? `0 0 20px ${color}, 0 0 40px rgba(212,160,23,0.3)`
                  : '0 4px 12px rgba(0,0,0,0.4)',
                transition: 'all 200ms',
                animation: status === 'active' ? 'marblePulse 2s ease-in-out infinite' : 'none',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: 'white', fontFamily: 'var(--font-mono)' }}>
                {h.stage_number}
              </span>
            </button>
          );
        })}

        {/* Hotspot labels (below circles) */}
        {hotspotPositions.map((h) => {
          const stage = stages.find(s => s.stage_number === h.stage_number) || stages[h.stage_number - 1];
          if (stage?.status === 'locked') return null;
          return (
            <div
              key={`label-${h.stage_number}`}
              style={{
                position: 'absolute',
                left: h.left, top: h.top,
                transform: 'translate(-50%, 32px)',
                background: 'rgba(0,0,0,0.7)',
                color: 'white', padding: '2px 8px', borderRadius: 4,
                fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-body)',
                whiteSpace: 'nowrap', maxWidth: 120,
                overflow: 'hidden', textOverflow: 'ellipsis',
                pointerEvents: 'none',
              }}
            >
              {h.label}
            </div>
          );
        })}

        {/* Bottom hint when no stage selected */}
        {!selectedStage && (
          <div style={{
            position: 'absolute', bottom: isMobile ? 24 : 24, left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 20px', borderRadius: 20,
            background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.8)',
            fontSize: 12, fontFamily: 'var(--font-body)',
            backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
          }}>
            Use WASD or drag to explore — tap a circle to start a challenge
          </div>
        )}

        {/* Stage panel (slide-in) */}
        {selectedStage && (
          <>
            <div
              onClick={() => setSelectedStage(null)}
              style={{
                position: 'absolute', inset: 0, zIndex: 1002,
                pointerEvents: 'auto',
              }}
            />
            <div
              style={{
                position: 'absolute', zIndex: 1003,
                pointerEvents: 'auto',
                ...(isMobile
                  ? { bottom: 0, left: 0, right: 0, maxHeight: '65vh', borderRadius: '16px 16px 0 0' }
                  : { top: 0, right: 0, width: 400, height: '100%' }
                ),
                background: 'rgba(255,255,255,0.95)',
                overflowY: 'auto',
                boxShadow: '-4px 0 30px rgba(0,0,0,0.4)',
                backdropFilter: 'blur(12px)',
                animation: isMobile ? 'slideUp 300ms ease-out' : 'slideInRight 300ms ease-out',
              }}
            >
              {/* Panel header */}
              <div style={{
                padding: '14px 18px', borderBottom: '1px solid var(--pencil)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                position: 'sticky', top: 0, background: 'rgba(255,255,255,0.95)', zIndex: 1,
                backdropFilter: 'blur(12px)',
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
                  color: 'var(--graphite)', textTransform: 'uppercase',
                }}>
                  Stage {selectedStage.stage_number} — {selectedStage.stage_type || 'Challenge'}
                </span>
                <button
                  onClick={() => setSelectedStage(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                >
                  <X size={16} color="var(--graphite)" />
                </button>
              </div>

              {/* Panel content */}
              <div style={{ padding: '20px 22px' }}>
                <h3 style={{
                  fontFamily: 'var(--font-display)', fontSize: 20,
                  color: 'var(--ink)', margin: '0 0 12px',
                }}>
                  {selectedStage.title}
                </h3>

                {selectedStage.description && (
                  <p style={{
                    fontSize: 14, color: 'var(--graphite)',
                    lineHeight: 1.7, margin: '0 0 16px',
                  }}>
                    {selectedStage.description}
                  </p>
                )}

                {selectedStage.guiding_questions?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: 'var(--graphite)',
                      fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                      marginBottom: 8,
                    }}>
                      Think about
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {selectedStage.guiding_questions.map((q, i) => (
                        <li key={i} style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedStage.deliverable && (
                  <div style={{
                    background: 'var(--parchment)', borderRadius: 10,
                    padding: '12px 16px', borderLeft: '3px solid var(--compass-gold)',
                    marginBottom: 16,
                  }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: 'var(--compass-gold)',
                      fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                      marginBottom: 4,
                    }}>
                      What to make
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5, margin: 0 }}>
                      {selectedStage.deliverable}
                    </p>
                  </div>
                )}

                {/* Submission area */}
                {selectedStage.status === 'active' && (
                  <div style={{ marginTop: 8 }}>
                    <textarea
                      value={submission}
                      onChange={e => setSubmission(e.target.value)}
                      placeholder="Type your response here..."
                      style={{
                        width: '100%', minHeight: 100, padding: 12,
                        borderRadius: 8, border: '1px solid var(--pencil)',
                        fontFamily: 'var(--font-body)', fontSize: 14,
                        resize: 'vertical', boxSizing: 'border-box',
                      }}
                    />
                    <button
                      onClick={handleSubmit}
                      disabled={!submission.trim()}
                      style={{
                        marginTop: 8, width: '100%',
                        padding: '10px 16px', borderRadius: 8,
                        background: submission.trim() ? 'var(--ink)' : 'var(--pencil)',
                        color: 'white', border: 'none',
                        fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)',
                        cursor: submission.trim() ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}
                    >
                      <Send size={14} /> Submit
                    </button>
                  </div>
                )}

                {selectedStage.status === 'completed' && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 8,
                    background: 'rgba(45,139,78,0.1)', border: '1px solid var(--field-green)',
                    color: 'var(--field-green)', fontSize: 13, fontWeight: 600,
                    textAlign: 'center',
                  }}>
                    Completed
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes marblePulse {
          0%, 100% { box-shadow: 0 0 12px rgba(212,160,23,0.4), 0 4px 12px rgba(0,0,0,0.4); }
          50% { box-shadow: 0 0 24px rgba(212,160,23,0.7), 0 4px 16px rgba(0,0,0,0.4); }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
```

**Step 2: Build check**

Run: `cd "/Users/md/Quest Lab/quest-lab" && npx vite build --logLevel error 2>&1 | head -20`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/immersive/MarbleWorldView.jsx
git commit -m "feat: create MarbleWorldView with iframe embed + hotspot overlay + voice"
```

---

### Task 11: Wire Marble into QuestBuilder Step 4 (generation) and Step 5 (preview)

**Files:**
- Modify: `src/pages/QuestBuilder.jsx`

**Context:** Currently QuestBuilder Step 4 calls `ai.generateFullWorldScene()` (Gemini) in the background during quest generation. Need to also kick off Marble Mini generation in parallel, then poll for completion. Step 5 should show a Marble preview (thumbnail or embedded mini viewer) alongside the existing panorama preview.

The key changes are:
1. In the generation phase (Step 4), after quest is generated, call `ai.generateMarbleScene()` in parallel with existing Gemini generation
2. Poll Marble status and update state when ready
3. In Step 5 review, show Marble preview (thumbnail when available, loading indicator while generating)
4. When saving quest, store marble columns

**Step 1: Find the generation section in QuestBuilder.jsx and add Marble generation**

In the quest generation handler (the function that runs during Step 4), after the existing world scene generation code, add Marble generation. The Marble generation should run in parallel — don't block the user.

Add state at the component top:
```javascript
const [marbleStatus, setMarbleStatus] = useState(null); // null | 'generating' | 'ready' | 'failed'
const [marbleData, setMarbleData] = useState(null); // { operationId, worldUrl, panoUrl, thumbnailUrl, hotspots }
const marblePollingRef = useRef(null);
```

After the existing `ai.generateFullWorldScene()` call, add:
```javascript
// Marble generation (parallel, non-blocking)
try {
  setMarbleStatus('generating');
  const marbleResult = await ai.generateMarbleScene({
    questTitle: generated.title,
    stages: generated.stages,
    studentInterests: allInterests,
    careerPathway: pathway,
    gradeBand: students[0]?.grade_band,
  });

  if (marbleResult?.operationId) {
    setMarbleData({ operationId: marbleResult.operationId, hotspots: marbleResult.hotspots });
    // Start polling
    const pollMarble = async () => {
      try {
        const op = await ai.pollMarbleStatus(marbleResult.operationId);
        if (op.done) {
          if (op.error) {
            setMarbleStatus('failed');
          } else {
            setMarbleStatus('ready');
            setMarbleData(prev => ({
              ...prev,
              worldUrl: op.response?.world_marble_url,
              worldId: op.response?.id,
              panoUrl: op.response?.assets?.imagery?.pano_url,
              thumbnailUrl: op.response?.assets?.thumbnail_url,
            }));
          }
          return;
        }
        marblePollingRef.current = setTimeout(pollMarble, 5000);
      } catch {
        setMarbleStatus('failed');
      }
    };
    marblePollingRef.current = setTimeout(pollMarble, 5000);
  } else {
    setMarbleStatus('failed');
  }
} catch (err) {
  console.warn('Marble generation skipped:', err.message);
  setMarbleStatus('failed');
}
```

Clean up polling on unmount:
```javascript
useEffect(() => {
  return () => {
    if (marblePollingRef.current) clearTimeout(marblePollingRef.current);
  };
}, []);
```

In Step 5 review UI, add a Marble status indicator near the world preview:
```jsx
{marbleStatus === 'generating' && (
  <div style={{
    padding: '12px 16px', borderRadius: 8,
    background: 'var(--parchment)', border: '1px solid var(--pencil)',
    fontSize: 13, color: 'var(--graphite)', display: 'flex', alignItems: 'center', gap: 8,
  }}>
    <div style={{
      width: 16, height: 16, border: '2px solid var(--pencil)',
      borderTopColor: 'var(--compass-gold)', borderRadius: '50%',
      animation: 'worldSpin 1s linear infinite',
    }} />
    Generating 3D world...
  </div>
)}
{marbleStatus === 'ready' && marbleData?.thumbnailUrl && (
  <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--pencil)' }}>
    <img src={marbleData.thumbnailUrl} alt="3D World Preview" style={{ width: '100%', display: 'block' }} />
    <div style={{
      padding: '8px 12px', background: 'var(--parchment)',
      fontSize: 12, color: 'var(--field-green)', fontWeight: 600,
    }}>
      3D World ready
    </div>
  </div>
)}
```

In the save function, include marble data:
```javascript
// When saving quest to DB, add marble columns
const questRecord = {
  ...existingFields,
  marble_world_url: marbleData?.worldUrl || null,
  marble_world_id: marbleData?.worldId || null,
  marble_operation_id: null, // completed
  marble_model: 'Marble 0.1-mini',
  marble_pano_url: marbleData?.panoUrl || null,
  marble_thumbnail_url: marbleData?.thumbnailUrl || null,
};
```

**Step 2: Build check**

Run: `cd "/Users/md/Quest Lab/quest-lab" && npx vite build --logLevel error 2>&1 | head -20`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/pages/QuestBuilder.jsx
git commit -m "feat: generate Marble Mini world during quest creation with polling"
```

---

### Task 12: Wire MarbleWorldView into StudentQuestPage

**Files:**
- Modify: `src/pages/student/StudentQuestPage.jsx`

**Context:** Currently `StudentQuestPage` renders `ImmersiveWorldView` when `immersiveMode` is true and `quest.world_scene_url` exists. Need to check for `marble_world_url` first and render `MarbleWorldView` instead. Also add background upgrade to Plus model on first student entry.

**Step 1: Import MarbleWorldView**

At top of file, add:
```javascript
import MarbleWorldView from '../../components/immersive/MarbleWorldView';
```

**Step 2: Update the immersive mode rendering**

Find the section where `ImmersiveWorldView` is rendered (around line 3702-3722). Replace with:

```jsx
{immersiveMode && (quest?.marble_world_url || quest?.world_scene_url) && (
  quest.marble_world_url ? (
    <MarbleWorldView
      marbleUrl={quest.marble_world_url}
      hotspots={quest.world_hotspots}
      stages={stages}
      activeStageId={activeCard?.id}
      onStageSelect={(id) => {
        setActiveCard(stages.find(s => s.id === id));
      }}
      onStageSubmit={async (stageId, text) => {
        // Reuse existing submission handler
        await handleSubmission(stageId, text);
      }}
      onExit={() => setImmersiveMode(false)}
      isMobile={isMobile}
      sceneDescription={quest.world_scene_prompt}
    />
  ) : (
    <ImmersiveWorldView
      sceneUrl={quest.world_scene_url}
      hotspots={quest.world_hotspots}
      stages={stages}
      activeStageId={activeCard?.id}
      onStageSelect={(id) => setActiveCard(stages.find(s => s.id === id))}
      onExit={() => setImmersiveMode(false)}
      isMobile={isMobile}
      studentName={student?.name}
      xp={null}
    />
  )
)}
```

**Step 3: Add background upgrade to Plus on first entry**

When entering immersive mode with a Mini world, kick off Plus upgrade:
```javascript
// In the enter world handler or useEffect
useEffect(() => {
  if (immersiveMode && quest?.marble_world_url && quest?.marble_model === 'Marble 0.1-mini') {
    // Background upgrade to Plus
    ai.upgradeMarbleWorld({
      questId: quest.id,
      textPrompt: quest.world_scene_prompt,
      imageUrl: quest.marble_pano_url, // Use mini's panorama as input for plus
      displayName: quest.title,
    }).then(result => {
      if (result?.operationId) {
        // Poll and update when ready
        const poll = async () => {
          try {
            const op = await ai.pollMarbleStatus(result.operationId);
            if (op.done && !op.error) {
              // Update quest with plus data
              const world = op.response;
              await supabase.from('quests').update({
                marble_world_url: world.world_marble_url,
                marble_world_id: world.id,
                marble_model: 'Marble 0.1-plus',
                marble_pano_url: world.assets?.imagery?.pano_url,
                marble_thumbnail_url: world.assets?.thumbnail_url,
              }).eq('id', quest.id);
              // Could update local state here, but student is already in mini
              console.log('Marble Plus upgrade complete');
              return;
            }
            if (!op.done) setTimeout(poll, 10000);
          } catch { /* silent */ }
        };
        setTimeout(poll, 10000);
      }
    }).catch(() => { /* silent background upgrade */ });
  }
}, [immersiveMode]);
```

**Step 4: Update EnterWorldButton to show Marble badge**

In the section where `EnterWorldButton` is rendered, update:
```jsx
<EnterWorldButton
  sceneUrl={quest?.marble_thumbnail_url || quest?.world_scene_url}
  sceneDescription={quest?.world_scene_prompt ? (
    quest.marble_world_url ? '3D World Ready — Enter to explore' : quest.world_scene_prompt
  ) : null}
  onClick={() => setImmersiveMode(true)}
/>
```

**Step 5: Build check**

Run: `cd "/Users/md/Quest Lab/quest-lab" && npx vite build --logLevel error 2>&1 | head -20`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/pages/student/StudentQuestPage.jsx
git commit -m "feat: wire MarbleWorldView into StudentQuestPage with Plus upgrade"
```

---

## Part C: Voice Narration in Immersive World (Tasks 13-14)

### Task 13: Wire voice narration into ImmersiveWorldView (Gemini fallback path)

**Files:**
- Modify: `src/components/immersive/ImmersiveWorldView.jsx`

**Context:** MarbleWorldView (Task 10) already has voice narration built in. But the Gemini fallback path (ImmersiveWorldView) also needs it. Add the same pattern: narrate scene on entry, narrate stage on hotspot click.

**Step 1: Add voice to ImmersiveWorldView**

Add imports at top:
```javascript
import { Volume2, VolumeX } from 'lucide-react';
import useSpeech from '../../hooks/useSpeech';
```

Add hook at component top:
```javascript
const { speak, stop, speaking } = useSpeech();
const [hasSpokenIntro, setHasSpokenIntro] = useState(false);
```

Add intro narration effect:
```javascript
useEffect(() => {
  // Narrate world description on entry
  if (!hasSpokenIntro) {
    const timer = setTimeout(() => {
      speak('Welcome to your world. Look around and tap a hotspot to begin.');
      setHasSpokenIntro(true);
    }, 2000);
    return () => clearTimeout(timer);
  }
}, [hasSpokenIntro, speak]);
```

In `handleHotspotClick`, add narration:
```javascript
const handleHotspotClick = useCallback((stageNumber) => {
  const stage = stages.find(s => s.stage_number === stageNumber);
  if (stage && stage.status !== 'locked') {
    setSelectedStage(stage);
    onStageSelect?.(stage.id);
    // Narrate the stage
    stop();
    if (stage.description) {
      setTimeout(() => speak(stage.title + '. ' + stage.description), 300);
    }
  }
}, [stages, onStageSelect, speak, stop]);
```

Add voice toggle button next to XP display in the HUD:
```jsx
<button
  onClick={() => speaking ? stop() : speak('Look around and tap a hotspot to begin.')}
  style={{
    pointerEvents: 'auto',
    width: 36, height: 36, borderRadius: '50%',
    background: speaking ? 'var(--compass-gold)' : 'rgba(0,0,0,0.6)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: speaking ? 'var(--ink)' : 'white',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(8px)',
  }}
>
  {speaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
</button>
```

Clean up on exit: add `stop()` in the exit button's onClick.

**Step 2: Build check**

Run: `cd "/Users/md/Quest Lab/quest-lab" && npx vite build --logLevel error 2>&1 | head -20`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/immersive/ImmersiveWorldView.jsx
git commit -m "feat: add voice narration to ImmersiveWorldView (Gemini fallback)"
```

---

### Task 14: Add voice feedback narration after submission scoring

**Files:**
- Modify: `src/components/immersive/MarbleWorldView.jsx`
- Modify: `src/pages/student/StudentQuestPage.jsx`

**Context:** After a student submits in the immersive world and gets AI feedback, the feedback should be read aloud. The `useSpeech` hook is already available. Need to add a callback prop to MarbleWorldView for when feedback arrives, and wire it in StudentQuestPage.

**Step 1: Add feedback voice to MarbleWorldView**

Add a new prop `onFeedbackReceived` and effect:

Add prop: `feedbackText`

Add effect to speak feedback when it arrives:
```javascript
const [lastFeedback, setLastFeedback] = useState(null);

useEffect(() => {
  if (feedbackText && feedbackText !== lastFeedback) {
    setLastFeedback(feedbackText);
    // Small delay so submission UI updates first
    setTimeout(() => speak(feedbackText), 500);
  }
}, [feedbackText, lastFeedback, speak]);
```

**Step 2: In StudentQuestPage, pass feedback text to MarbleWorldView**

After the submission handler processes AI feedback, set feedback state:
```javascript
const [immersiveFeedback, setImmersiveFeedback] = useState('');
```

In the submission handler, after AI review completes:
```javascript
// After reviewSubmission returns feedback
if (feedback?.feedback) {
  setImmersiveFeedback(feedback.feedback);
}
```

Pass to MarbleWorldView:
```jsx
<MarbleWorldView
  ... existing props ...
  feedbackText={immersiveFeedback}
/>
```

**Step 3: Build check**

Run: `cd "/Users/md/Quest Lab/quest-lab" && npx vite build --logLevel error 2>&1 | head -20`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/immersive/MarbleWorldView.jsx src/pages/student/StudentQuestPage.jsx
git commit -m "feat: narrate AI feedback aloud in immersive world"
```

---

## Part D: Final Integration (Task 15)

### Task 15: Update .env.local, add dev script, final build check

**Files:**
- Modify: `package.json` (add dev:vercel script)

**Step 1: Add vercel dev script to package.json**

In the `"scripts"` section, add:
```json
"dev:vercel": "vercel dev"
```

Keep the existing `"dev": "vite"` for when serverless functions aren't needed (offline dev).

**Step 2: Full build check**

Run: `cd "/Users/md/Quest Lab/quest-lab" && npx vite build --logLevel error 2>&1 | head -30`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add package.json
git commit -m "feat: add vercel dev script for local serverless function testing"
```

---

## Post-Implementation Checklist

1. **Run migration** `038_marble_worlds.sql` in Supabase dashboard
2. **Add Vercel env vars**: ANTHROPIC_API_KEY, GEMINI_API_KEY, PERPLEXITY_API_KEY, WORLDLABS_API_KEY, ELEVENLABS_API_KEY
3. **Remove old VITE_ env vars** from Vercel (they're no longer needed except VITE_SUPABASE_*)
4. **Test locally**: `npx vercel dev` and verify `/api/ai` endpoint works
5. **Deploy**: `vercel deploy --prod` or push to main
6. **Test immersive flow**: Create a quest → verify Marble Mini generates → enter world → verify iframe + hotspots work → submit → verify voice feedback
