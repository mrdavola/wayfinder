# Immersive 3D Worlds — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add AI-generated panoramic 3D worlds to quests — students click "Enter World" to explore a 360° scene with stage hotspots, using Three.js with gyroscope on mobile.

**Architecture:** Gemini generates a scene description + hotspot map, then Gemini Image API creates a 21:9 panoramic image uploaded to Supabase Storage. Three.js renders it as a textured sphere with Billboard hotspots. TreasureMap stays as default nav; immersive view is a premium overlay.

**Tech Stack:** Three.js, @react-three/fiber, @react-three/drei, Gemini 3.1 Flash Image API (`gemini-3.1-flash-image-preview`), Supabase Storage

---

## Part A: Foundation (Tasks 1-3)

### Task 1: Database migration — world scene columns

**Files:**
- Create: `supabase/migrations/032_world_scenes.sql`

**What to do:**

Add three columns to the `quests` table for world scene data.

```sql
-- 032_world_scenes.sql
-- Add immersive 3D world scene columns to quests

ALTER TABLE quests ADD COLUMN IF NOT EXISTS world_scene_url TEXT;
ALTER TABLE quests ADD COLUMN IF NOT EXISTS world_hotspots JSONB DEFAULT '[]';
ALTER TABLE quests ADD COLUMN IF NOT EXISTS world_scene_prompt TEXT;
```

`world_scene_url` stores the Supabase Storage public URL for the panoramic image.
`world_hotspots` stores the hotspot placement array: `[{stage_number, label, position: {yaw, pitch}, icon}]`.
`world_scene_prompt` stores the image generation prompt for regeneration.

**How to test:** Run the migration in the Supabase SQL editor. Verify columns exist:
```sql
SELECT world_scene_url, world_hotspots, world_scene_prompt FROM quests LIMIT 1;
```

**Commit:** `feat: add world_scene columns to quests table (migration 032)`

---

### Task 2: Install Three.js dependencies

**Files:**
- Modify: `package.json`

**What to do:**

```bash
cd "/Users/md/Quest Lab/quest-lab"
npm install three @react-three/fiber @react-three/drei
```

These provide:
- `three` — core WebGL engine
- `@react-three/fiber` — React renderer for Three.js (declarative JSX)
- `@react-three/drei` — helpers: OrbitControls, Billboard, useTexture, Html, DeviceOrientationControls

**How to test:** Run `npm run dev` — app should start without errors. Run `npx vite build` — should build successfully.

**Commit:** `chore: install three.js + react-three-fiber + drei for 3D worlds`

---

### Task 3: Supabase Storage image upload utility

**Files:**
- Modify: `src/lib/api.js`

**What to do:**

Add an `uploadWorldScene` utility function to api.js. It takes a base64 image (from Gemini Image API), converts to a Blob, uploads to Supabase Storage bucket `world-scenes`, and returns the public URL.

Add this near the top of api.js (after the supabase import):

```javascript
async function uploadWorldScene(questId, base64ImageData, mimeType = 'image/png') {
  // Convert base64 to Uint8Array
  const byteString = atob(base64ImageData);
  const bytes = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    bytes[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });

  const path = `${questId}/scene.png`;
  const { error } = await supabase.storage
    .from('world-scenes')
    .upload(path, blob, { upsert: true, contentType: mimeType });
  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('world-scenes')
    .getPublicUrl(path);

  return publicUrl;
}
```

**Prerequisites:** The guide must create a `world-scenes` bucket in Supabase Storage dashboard (Settings > Storage > New bucket, public, name: `world-scenes`).

**How to test:** This is a utility — it will be tested via integration in Task 6. For now, verify the build passes with `npx vite build`.

**Commit:** `feat: add uploadWorldScene utility for Supabase Storage`

---

## Part B: AI Scene Generation (Tasks 4-6)

### Task 4: ai.generateWorldScene() — text call for scene description + hotspot map

**Files:**
- Modify: `src/lib/api.js` — add `generateWorldScene` to the `ai` object (around line 1200+, after `generateLandmarks`)

**What to do:**

Add a new AI function that takes quest metadata and returns a structured scene description + hotspot placement map. This is a TEXT-ONLY call via the existing `callAI()` function.

```javascript
generateWorldScene: async ({ questTitle, stages, studentInterests, careerPathway, gradeBand }) => {
  const stageList = stages.map(s =>
    `Stage ${s.stage_number}: "${s.stage_title || s.title}" (${s.stage_type}) — ${(s.description || '').slice(0, 80)}`
  ).join('\n');

  const systemPrompt = `You are a scene designer for an educational 3D world. Given a project theme and stages, you design a SINGLE panoramic environment where each stage has a physical location.

RULES:
- The scene must be a REAL place (not fantasy). Match the student's interests.
- The scene is a wide panoramic view (21:9 aspect ratio) — imagine standing in the center and looking around 360 degrees.
- Each stage gets a hotspot at a specific yaw angle (-180 to 180 degrees, where 0 is center-front) and pitch (-30 to 30, where 0 is eye-level).
- Spread hotspots evenly across the panorama (don't cluster them).
- The image_prompt should describe a photorealistic panoramic photograph with distinct visual zones for each stage location.
- Each hotspot label should be a short, evocative name for that location (e.g., "The Workshop Bench", "Judge's Booth", "Research Wall").
- icon must be one of: search, wrench, flask, mic, book, star, zap, target, compass, lightbulb

Grade level: ${gradeBand || '6-8'}
Adapt scene complexity to age: K-2 gets colorful/simple scenes, 9-12 gets professional/realistic.

Return ONLY valid JSON. No markdown fences.`;

  const userMessage = `Design an immersive world for this project:

Title: "${questTitle}"
Student interests: ${(studentInterests || []).join(', ') || 'general'}
Career pathway: ${careerPathway || 'none'}

Stages:
${stageList}

Return JSON:
{
  "image_prompt": "Ultra-wide panoramic photograph of [detailed scene description with distinct zones for each stage]...",
  "scene_description": "Brief 1-sentence description of the world",
  "hotspots": [
    { "stage_number": 1, "label": "Location Name", "position": { "yaw": -60, "pitch": 0 }, "icon": "search" }
  ]
}`;

  const raw = await callAI({ systemPrompt, userMessage });
  try {
    const parsed = JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
    if (!parsed.image_prompt || !Array.isArray(parsed.hotspots)) {
      throw new Error('Invalid scene response');
    }
    return parsed;
  } catch {
    return null; // Scene generation failed — quest still works without it
  }
},
```

**How to test:** Call from browser console after importing:
```javascript
const scene = await ai.generateWorldScene({ questTitle: 'Physics of Skateboarding', stages: [{stage_number: 1, stage_title: 'Research', stage_type: 'research', description: 'Research forces'}], studentInterests: ['skateboarding'], careerPathway: 'engineering' });
console.log(scene);
```
Should return JSON with `image_prompt`, `scene_description`, and `hotspots` array.

**Commit:** `feat: ai.generateWorldScene() — text call for scene description + hotspot map`

---

### Task 5: Gemini Image API integration

**Files:**
- Modify: `src/lib/api.js` — add `generateWorldImage` function

**What to do:**

Add a function that calls the Gemini Image API (`gemini-3.1-flash-image-preview`) to generate a panoramic image from a text prompt. This uses the same `@google/generative-ai` SDK already installed, but with a different model and `responseModalities: ["IMAGE"]`.

**IMPORTANT:** Check the Gemini docs at https://ai.google.dev/gemini-api/docs/image-generation for the exact API. The image model returns base64-encoded image data.

```javascript
async function generateWorldImage(imagePrompt) {
  const settings = getAiSettings();
  const apiKey = settings.geminiKey || import.meta.env.VITE_GEMINI_API_KEY || '';
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  });

  const result = await model.generateContent(
    `Generate a photorealistic ultra-wide panoramic image (21:9 aspect ratio). ${imagePrompt}`
  );

  const response = result.response;
  const parts = response.candidates?.[0]?.content?.parts || [];

  // Find the image part in the response
  const imagePart = parts.find(p => p.inlineData);
  if (!imagePart?.inlineData?.data) {
    throw new Error('No image generated');
  }

  return {
    base64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || 'image/png',
  };
}
```

**Note:** The model ID may need adjustment based on what's available with your API key. `gemini-2.5-flash` supports image generation with `responseModalities: ['IMAGE']`. If `gemini-3.1-flash-image-preview` is available, prefer that. Test with the simpler model first, then upgrade.

**Fallback:** If image generation fails (model not available, quota exceeded), return null. The quest still works without a world scene.

**How to test:** Call directly:
```javascript
const img = await generateWorldImage('A sunny professional skatepark with concrete bowls and rails');
console.log(img.mimeType, img.base64.length);
```

**Commit:** `feat: Gemini Image API integration for panoramic scene generation`

---

### Task 6: Full pipeline — ai.generateFullWorldScene()

**Files:**
- Modify: `src/lib/api.js` — add `generateFullWorldScene` to the `ai` object

**What to do:**

Orchestrate the full pipeline: scene description (Task 4) → image generation (Task 5) → upload to storage (Task 3) → return URL + hotspots.

```javascript
generateFullWorldScene: async ({ questId, questTitle, stages, studentInterests, careerPathway, gradeBand }) => {
  try {
    // Step 1: Generate scene description + hotspot placement
    const sceneData = await ai.generateWorldScene({ questTitle, stages, studentInterests, careerPathway, gradeBand });
    if (!sceneData) return null;

    // Step 2: Generate panoramic image
    const image = await generateWorldImage(sceneData.image_prompt);
    if (!image) return { ...sceneData, sceneUrl: null }; // Have hotspots but no image

    // Step 3: Upload to Supabase Storage
    const sceneUrl = await uploadWorldScene(questId, image.base64, image.mimeType);

    return {
      sceneUrl,
      hotspots: sceneData.hotspots,
      scenePrompt: sceneData.image_prompt,
      sceneDescription: sceneData.scene_description,
    };
  } catch (err) {
    console.error('World scene generation failed:', err);
    return null; // Non-fatal — quest works without scene
  }
},
```

Also add `generateFullWorldScene` to the `ai` export object.

**How to test:** This requires a real quest ID. Test after QuestBuilder integration (Task 7). For now, verify build passes.

**Commit:** `feat: full world scene pipeline — describe → generate image → upload → return URL`

---

## Part C: QuestBuilder Integration (Tasks 7-8)

### Task 7: Wire scene generation into QuestBuilder Step 4

**Files:**
- Modify: `src/pages/QuestBuilder.jsx` — `runGeneration()` function (around line 2888)

**What to do:**

After `ai.generateQuest()` returns successfully, fire off scene generation in parallel. The scene generation is non-blocking — if it fails, the quest still works.

In the `runGeneration()` function, after `setGeneratedQuest(questData)` (around line 2974), add:

```javascript
// After setGeneratedQuest(questData):
setGeneratedQuest(questData);

// Fire off world scene generation in background (non-blocking)
const studentInterests = selectedStudents.flatMap(s => [...(s.interests || []), ...(s.passions || [])]);
ai.generateFullWorldScene({
  questId: null, // No quest ID yet — will use a temp ID, re-upload on save
  questTitle: questData.quest_title,
  stages: questData.stages,
  studentInterests,
  careerPathway: pathwayLabels[0] || 'none',
  gradeBand: selectedStudents[0]?.grade_band || '6-8',
}).then(worldData => {
  if (worldData) {
    setGeneratedQuest(prev => ({
      ...prev,
      _worldScene: worldData, // Attach to quest data for Step 6 review
    }));
  }
}).catch(() => {}); // Silently ignore errors
```

Add state for world scene loading:

```javascript
const [worldSceneLoading, setWorldSceneLoading] = useState(false);
```

**Note:** Since we don't have a quest ID yet (it's created on save), we can either:
- Use a temporary UUID for the storage path, then update the URL on save
- Generate the image but only upload on save (store base64 temporarily)

**Recommended approach:** Store the raw scene data (including base64 image) in `generatedQuest._worldScene`, then upload during `saveQuest()` when we have the real quest ID.

Update the pipeline call to skip upload:
```javascript
// In runGeneration — don't upload yet, just generate
ai.generateWorldScene({ questTitle: questData.quest_title, stages: questData.stages, studentInterests, careerPathway: pathwayLabels[0] || 'none', gradeBand: selectedStudents[0]?.grade_band || '6-8' })
  .then(async sceneData => {
    if (!sceneData) return;
    try {
      const image = await generateWorldImage(sceneData.image_prompt);
      setGeneratedQuest(prev => ({
        ...prev,
        _worldScene: { ...sceneData, _imageBase64: image?.base64, _imageMime: image?.mimeType },
      }));
    } catch {}
  })
  .catch(() => {});
```

Then in `saveQuest()`, after the quest INSERT returns a quest ID, upload the image:
```javascript
// After quest INSERT, before stage INSERT:
if (generatedQuest._worldScene?._imageBase64) {
  try {
    const sceneUrl = await uploadWorldScene(quest.id, generatedQuest._worldScene._imageBase64, generatedQuest._worldScene._imageMime);
    await supabase.from('quests').update({
      world_scene_url: sceneUrl,
      world_hotspots: generatedQuest._worldScene.hotspots || [],
      world_scene_prompt: generatedQuest._worldScene.image_prompt || '',
    }).eq('id', quest.id);
  } catch (err) {
    console.error('World scene save failed:', err);
    // Non-fatal
  }
}
```

**How to test:**
1. Create a new quest in QuestBuilder
2. After generation completes (Step 5 → Step 6), check browser console for any errors
3. After launching, check the quest in Supabase: `SELECT world_scene_url, world_hotspots FROM quests WHERE id = '<new_quest_id>'`
4. If world_scene_url is populated, open it in a browser — should show a panoramic image

**Commit:** `feat: wire world scene generation into QuestBuilder Step 4 + save on launch`

---

### Task 8: World preview in QuestBuilder Step 5 review + regenerate button

**Files:**
- Modify: `src/pages/QuestBuilder.jsx` — `Step6Review` component (around line 1977)

**What to do:**

Add a "World Preview" section in the Step 6 review page, after the "Sharing with" section and before the stages list. Shows the panoramic image with hotspot markers overlaid, plus a "Regenerate World" button.

After the "Sharing with" section in Step6Review (around line 2008), add:

```jsx
{/* World Preview */}
{generatedQuest._worldScene && (
  <div style={{
    marginBottom: 20, borderRadius: 12, overflow: 'hidden',
    border: `1px solid ${T.pencil}`, background: T.paper,
  }}>
    <div style={{
      padding: '10px 14px', borderBottom: `1px solid ${T.parchment}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: T.graphite, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Immersive World Preview
      </span>
      <button
        onClick={handleRegenerateWorld}
        style={{
          padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.pencil}`,
          background: 'transparent', color: T.graphite, fontSize: 11,
          fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        <RefreshCw size={11} /> Regenerate
      </button>
    </div>
    {generatedQuest._worldScene._imageBase64 ? (
      <div style={{ position: 'relative' }}>
        <img
          src={`data:${generatedQuest._worldScene._imageMime || 'image/png'};base64,${generatedQuest._worldScene._imageBase64}`}
          alt="World preview"
          style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
        />
        {/* Hotspot markers overlay */}
        <div style={{ position: 'absolute', inset: 0 }}>
          {(generatedQuest._worldScene.hotspots || []).map((h, i) => {
            // Map yaw (-180 to 180) → left % (0 to 100)
            const leftPct = ((h.position.yaw + 180) / 360) * 100;
            // Map pitch (-30 to 30) → top % (roughly 30-70 range)
            const topPct = 50 - (h.position.pitch / 30) * 20;
            return (
              <div key={i} style={{
                position: 'absolute', left: `${leftPct}%`, top: `${topPct}%`,
                transform: 'translate(-50%, -50%)',
                width: 22, height: 22, borderRadius: '50%',
                background: T.compassGold, border: '2px solid white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}>
                {h.stage_number}
              </div>
            );
          })}
        </div>
      </div>
    ) : (
      <div style={{ padding: 24, textAlign: 'center', color: T.pencil, fontSize: 13 }}>
        World image is generating...
      </div>
    )}
    {generatedQuest._worldScene.scene_description && (
      <div style={{ padding: '8px 14px', fontSize: 12, color: T.graphite, fontStyle: 'italic' }}>
        {generatedQuest._worldScene.scene_description}
      </div>
    )}
  </div>
)}
```

Add the regenerate handler:
```javascript
const handleRegenerateWorld = async () => {
  const studentInterests = selectedStudents.flatMap(s => [...(s.interests || []), ...(s.passions || [])]);
  setGeneratedQuest(prev => ({ ...prev, _worldScene: { ...prev._worldScene, _imageBase64: null } }));
  try {
    const sceneData = await ai.generateWorldScene({
      questTitle: generatedQuest.quest_title,
      stages: generatedQuest.stages,
      studentInterests,
      careerPathway: selectedPathways[0] || 'none',
      gradeBand: selectedStudents[0]?.grade_band || '6-8',
    });
    if (sceneData) {
      const image = await generateWorldImage(sceneData.image_prompt);
      setGeneratedQuest(prev => ({
        ...prev,
        _worldScene: { ...sceneData, _imageBase64: image?.base64, _imageMime: image?.mimeType },
      }));
    }
  } catch (err) {
    console.error('World regeneration failed:', err);
  }
};
```

**Note:** `generateWorldImage` needs to be exported from api.js or accessed via `ai.generateWorldImage`. Add it to the ai export object.

**How to test:**
1. Generate a quest in QuestBuilder
2. In Step 6 review, you should see a "World Preview" section with the panoramic image
3. Numbered hotspot markers should appear on the image at approximate stage locations
4. Click "Regenerate" — image clears, regenerates, reappears

**Commit:** `feat: world preview in QuestBuilder Step 5 review with regenerate button`

---

## Part D: Three.js Components (Tasks 9-13)

### Task 9: PanoramaSphere component

**Files:**
- Create: `src/components/immersive/PanoramaSphere.jsx`

**What to do:**

Create an inverted sphere that displays the panoramic image as a texture on its inner surface. The camera sits at the center looking outward.

```jsx
import { useLoader } from '@react-three/fiber';
import { TextureLoader, BackSide } from 'three';

export default function PanoramaSphere({ imageUrl }) {
  const texture = useLoader(TextureLoader, imageUrl);

  return (
    <mesh>
      <sphereGeometry args={[500, 64, 32]} />
      <meshBasicMaterial map={texture} side={BackSide} />
    </mesh>
  );
}
```

**Key details:**
- `sphereGeometry args={[500, 64, 32]}` — radius 500 (large), 64 width segments, 32 height segments for smooth sphere
- `side={BackSide}` — renders the INSIDE of the sphere (inverted, so texture is visible from the center)
- `useLoader(TextureLoader, imageUrl)` — loads the panoramic image as a Three.js texture
- The camera is at position [0, 0, 0] (center of sphere) by default

**How to test:** Will be tested as part of ImmersiveWorldView (Task 12). Verify build passes.

**Commit:** `feat: PanoramaSphere — inverted sphere with panoramic texture`

---

### Task 10: CameraController — desktop mouse + mobile gyroscope

**Files:**
- Create: `src/components/immersive/CameraController.jsx`

**What to do:**

Handle camera rotation controls. Desktop: mouse drag (OrbitControls limited to rotation). Mobile: DeviceOrientation (gyroscope) with touch-drag fallback.

```jsx
import { useRef, useState, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, DeviceOrientationControls } from '@react-three/drei';

export default function CameraController({ isMobile }) {
  const [hasGyro, setHasGyro] = useState(false);
  const [gyroPermission, setGyroPermission] = useState(false);

  useEffect(() => {
    if (!isMobile) return;
    // Check if DeviceOrientationEvent is available
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      // iOS 13+ requires permission
      setHasGyro(true);
    } else if ('DeviceOrientationEvent' in window) {
      // Android and older iOS
      setHasGyro(true);
      setGyroPermission(true);
    }
  }, [isMobile]);

  if (isMobile && hasGyro && gyroPermission) {
    return <DeviceOrientationControls />;
  }

  // Desktop or mobile fallback: orbit controls (rotation only)
  return (
    <OrbitControls
      enableZoom={false}
      enablePan={false}
      rotateSpeed={-0.3}
      dampingFactor={0.1}
      enableDamping
    />
  );
}

// Separate component for gyro permission prompt (HTML overlay)
export function GyroPermissionButton({ onGranted }) {
  const handleRequest = async () => {
    try {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        const perm = await DeviceOrientationEvent.requestPermission();
        if (perm === 'granted') {
          onGranted();
        }
      }
    } catch (err) {
      console.error('Gyro permission denied:', err);
    }
  };

  return (
    <button
      onClick={handleRequest}
      style={{
        position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
        zIndex: 200, padding: '12px 24px', borderRadius: 12,
        background: 'var(--compass-gold)', color: 'var(--ink)',
        border: 'none', fontSize: 14, fontWeight: 700,
        fontFamily: 'var(--font-body)', cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}
    >
      Enable Look Around (Gyroscope)
    </button>
  );
}
```

**Key details:**
- `rotateSpeed={-0.3}` — negative inverts direction for natural "grab and drag" feel
- `enableZoom={false}`, `enablePan={false}` — only rotation allowed (we're inside a sphere)
- iOS 13+ requires explicit `DeviceOrientationEvent.requestPermission()` call from a user gesture
- The GyroPermissionButton is rendered as HTML overlay, not inside the Three.js canvas

**How to test:** Will be tested as part of ImmersiveWorldView (Task 12). Verify build passes.

**Commit:** `feat: CameraController — mouse orbit on desktop, gyroscope on mobile`

---

### Task 11: StageHotspot component

**Files:**
- Create: `src/components/immersive/StageHotspot.jsx`

**What to do:**

Create a Billboard sprite (always faces camera) positioned at yaw/pitch coordinates on the sphere. Shows stage icon, label, and status (locked/active/completed).

```jsx
import { useMemo, useState } from 'react';
import { Billboard, Html } from '@react-three/drei';
import { Vector3 } from 'three';

// Convert yaw/pitch (degrees) to 3D position on a sphere of given radius
function yawPitchToPosition(yaw, pitch, radius = 450) {
  const yawRad = (yaw * Math.PI) / 180;
  const pitchRad = (pitch * Math.PI) / 180;
  return new Vector3(
    -radius * Math.cos(pitchRad) * Math.sin(yawRad),
    radius * Math.sin(pitchRad),
    -radius * Math.cos(pitchRad) * Math.cos(yawRad)
  );
}

const STATUS_COLORS = {
  active: '#D4A017',    // compass-gold
  completed: '#2D8B4E', // field-green
  locked: '#A0A0A0',    // grey
};

const ICON_MAP = {
  search: '\u{1F50D}',
  wrench: '\u{1F527}',
  flask: '\u{1F9EA}',
  mic: '\u{1F3A4}',
  book: '\u{1F4D6}',
  star: '\u2B50',
  zap: '\u26A1',
  target: '\u{1F3AF}',
  compass: '\u{1F9ED}',
  lightbulb: '\u{1F4A1}',
};

export default function StageHotspot({ hotspot, stage, onClick }) {
  const [hovered, setHovered] = useState(false);
  const position = useMemo(
    () => yawPitchToPosition(hotspot.position.yaw, hotspot.position.pitch),
    [hotspot.position.yaw, hotspot.position.pitch]
  );

  const status = stage?.status || 'locked';
  const color = STATUS_COLORS[status] || STATUS_COLORS.locked;
  const isLocked = status === 'locked';
  const icon = ICON_MAP[hotspot.icon] || ICON_MAP.compass;

  return (
    <Billboard position={position} follow lockX={false} lockY={false} lockZ={false}>
      <Html center distanceFactor={150} style={{ pointerEvents: 'auto' }}>
        <div
          onClick={isLocked ? undefined : onClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            cursor: isLocked ? 'default' : 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            opacity: isLocked ? 0.4 : 1,
            transition: 'transform 200ms, opacity 200ms',
            transform: hovered && !isLocked ? 'scale(1.15)' : 'scale(1)',
          }}
        >
          {/* Hotspot circle */}
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: color, border: '3px solid white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
            boxShadow: status === 'active'
              ? `0 0 20px ${color}, 0 0 40px ${color}40`
              : '0 4px 12px rgba(0,0,0,0.3)',
            animation: status === 'active' ? 'hotspot-pulse 2s ease-in-out infinite' : 'none',
          }}>
            {status === 'completed' ? '\u2713' : icon}
          </div>
          {/* Label */}
          <div style={{
            background: 'rgba(0,0,0,0.7)', color: 'white',
            padding: '3px 10px', borderRadius: 6,
            fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-body)',
            whiteSpace: 'nowrap', maxWidth: 140,
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {hotspot.label}
          </div>
        </div>
      </Html>
    </Billboard>
  );
}
```

**Key details:**
- `Billboard` from drei makes the hotspot always face the camera
- `Html` from drei renders HTML inside the Three.js scene (handles projection/scaling)
- `distanceFactor={150}` controls how the hotspot scales with distance
- `yawPitchToPosition` converts the AI-assigned angles to 3D coordinates on the sphere (radius 450, slightly inside the 500-radius sphere)
- Active stage gets a glowing box-shadow pulse
- Locked stages are dimmed and non-clickable

**How to test:** Will be tested as part of ImmersiveWorldView (Task 12). Verify build passes.

**Commit:** `feat: StageHotspot — Billboard sprite with icon, label, and status`

---

### Task 12: ImmersiveWorldView container

**Files:**
- Create: `src/components/immersive/ImmersiveWorldView.jsx`

**What to do:**

The main container component that ties everything together: Three.js Canvas with the panorama sphere, camera controls, hotspots, plus HTML overlays for the HUD and stage panel.

```jsx
import { Suspense, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { X, Map, Maximize2, Minimize2 } from 'lucide-react';
import PanoramaSphere from './PanoramaSphere';
import CameraController, { GyroPermissionButton } from './CameraController';
import StageHotspot from './StageHotspot';

export default function ImmersiveWorldView({
  sceneUrl,
  hotspots,
  stages,
  activeStageId,
  onStageSelect,
  onExit,
  isMobile,
  studentName,
  xp,
}) {
  const [selectedStage, setSelectedStage] = useState(null);
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(false);

  const handleHotspotClick = useCallback((stageNumber) => {
    const stage = stages.find(s => s.stage_number === stageNumber);
    if (stage && stage.status !== 'locked') {
      setSelectedStage(stage);
      onStageSelect?.(stage.id);
    }
  }, [stages, onStageSelect]);

  const needsGyroPrompt = isMobile && !gyroEnabled &&
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof DeviceOrientationEvent.requestPermission === 'function';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#000',
    }}>
      {/* Three.js Canvas */}
      <Suspense fallback={
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 16, fontFamily: 'var(--font-body)' }}>
          Loading your world...
        </div>
      }>
        <Canvas
          camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 0, 0.1] }}
          style={{ width: '100%', height: '100%' }}
        >
          <PanoramaSphere imageUrl={sceneUrl} />
          <CameraController isMobile={isMobile && gyroEnabled} />

          {/* Stage hotspots */}
          {hotspots.map((h) => {
            const stage = stages.find(s => s.stage_number === h.stage_number);
            return (
              <StageHotspot
                key={h.stage_number}
                hotspot={h}
                stage={stage}
                onClick={() => handleHotspotClick(h.stage_number)}
              />
            );
          })}

          {/* Ambient lighting */}
          <ambientLight intensity={0.5} />
        </Canvas>
      </Suspense>

      {/* HUD overlay */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pointerEvents: 'none' }}>
        {/* Exit button */}
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

        {/* XP bar */}
        {xp != null && (
          <div style={{
            pointerEvents: 'auto',
            padding: '6px 14px', borderRadius: 8,
            background: 'rgba(0,0,0,0.6)', color: 'var(--compass-gold)',
            fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)',
            backdropFilter: 'blur(8px)',
          }}>
            {xp} EP
          </div>
        )}
      </div>

      {/* Gyroscope permission prompt (mobile iOS) */}
      {needsGyroPrompt && (
        <GyroPermissionButton onGranted={() => setGyroEnabled(true)} />
      )}

      {/* Stage panel (slides in from right on desktop, bottom on mobile) */}
      {selectedStage && (
        <div
          style={{
            position: 'absolute',
            ...(isMobile
              ? { bottom: 0, left: 0, right: 0, maxHeight: '60vh', borderRadius: '16px 16px 0 0' }
              : { top: 0, right: 0, width: 420, height: '100%' }
            ),
            background: 'var(--chalk)',
            overflowY: 'auto',
            boxShadow: '-4px 0 30px rgba(0,0,0,0.3)',
            zIndex: 1001,
            animation: 'slideIn 300ms ease-out',
          }}
        >
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--pencil)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--graphite)', textTransform: 'uppercase' }}>
              Stage {selectedStage.stage_number}
            </span>
            <button onClick={() => setSelectedStage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <X size={16} color="var(--graphite)" />
            </button>
          </div>
          <div style={{ padding: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)', margin: '0 0 12px' }}>
              {selectedStage.title}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--graphite)', lineHeight: 1.7, margin: '0 0 16px' }}>
              {selectedStage.description}
            </p>
            {selectedStage.guiding_questions?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Questions to explore
                </div>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {selectedStage.guiding_questions.map((q, i) => (
                    <li key={i} style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6, marginBottom: 6 }}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
            {selectedStage.deliverable && (
              <div style={{ background: 'var(--parchment)', borderRadius: 10, padding: '14px 18px', borderLeft: '3px solid var(--compass-gold)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--compass-gold)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 5 }}>
                  What to make
                </div>
                <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6, margin: 0 }}>
                  {selectedStage.deliverable}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CSS keyframes for animations */}
      <style>{`
        @keyframes hotspot-pulse {
          0%, 100% { box-shadow: 0 0 20px #D4A017, 0 0 40px #D4A01740; }
          50% { box-shadow: 0 0 30px #D4A017, 0 0 60px #D4A01760; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
```

**Key details:**
- `position: fixed, inset: 0, zIndex: 1000` — takes over the full screen
- `camera fov: 75` — natural field of view for looking around
- `Suspense` shows loading text while the panoramic texture loads
- Stage panel reuses Wayfinder's CSS variables for visual consistency
- Mobile: stage panel slides up from bottom (60vh max), desktop: slides in from right (420px)
- Body scroll should be locked when immersive view is open

**How to test:** Will be tested in Task 14 when wired into StudentQuestPage. Verify build passes.

**Commit:** `feat: ImmersiveWorldView — full-screen 3D container with hotspots and stage panel`

---

### Task 13: "Enter World" button component

**Files:**
- Create: `src/components/immersive/EnterWorldButton.jsx`

**What to do:**

A prominent, visually exciting button that appears on the student quest page when a world scene exists. Shows the panoramic image as a blurred background with "Enter Your World" text.

```jsx
import { Sparkles } from 'lucide-react';

export default function EnterWorldButton({ sceneUrl, sceneDescription, onClick }) {
  if (!sceneUrl) return null;

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', position: 'relative', overflow: 'hidden',
        borderRadius: 14, border: '2px solid var(--compass-gold)',
        background: 'var(--ink)', cursor: 'pointer',
        padding: 0, display: 'block',
        boxShadow: '0 4px 24px rgba(184,134,11,0.2)',
        transition: 'transform 200ms, box-shadow 200ms',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(184,134,11,0.35)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(184,134,11,0.2)'; }}
    >
      {/* Background image */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${sceneUrl})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'blur(2px) brightness(0.4)',
      }} />

      {/* Content overlay */}
      <div style={{
        position: 'relative', zIndex: 1,
        padding: '28px 24px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--compass-gold)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 30px rgba(184,134,11,0.5)',
          animation: 'enterWorldPulse 2s ease-in-out infinite',
        }}>
          <Sparkles size={22} color="var(--ink)" />
        </div>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 22,
          color: 'white', letterSpacing: '0.02em',
        }}>
          Enter Your World
        </span>
        {sceneDescription && (
          <span style={{
            fontSize: 12, color: 'rgba(255,255,255,0.7)',
            fontFamily: 'var(--font-body)', maxWidth: 400, textAlign: 'center',
          }}>
            {sceneDescription}
          </span>
        )}
      </div>

      <style>{`
        @keyframes enterWorldPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(184,134,11,0.4); }
          50% { box-shadow: 0 0 40px rgba(184,134,11,0.7); }
        }
      `}</style>
    </button>
  );
}
```

**How to test:** Will be tested in Task 14. Verify build passes.

**Commit:** `feat: EnterWorldButton — glowing CTA with scene preview background`

---

## Part E: Student Page Integration (Tasks 14-15)

### Task 14: Wire ImmersiveWorldView into StudentQuestPage

**Files:**
- Modify: `src/pages/student/StudentQuestPage.jsx`

**What to do:**

1. **Lazy import** ImmersiveWorldView (code-split so Three.js bundle only loads on click):

```javascript
// At top of file, after other imports:
import { lazy, Suspense } from 'react';
const ImmersiveWorldView = lazy(() => import('../../components/immersive/ImmersiveWorldView'));
import EnterWorldButton from '../../components/immersive/EnterWorldButton';
```

2. **Add state** for immersive mode:

```javascript
const [immersiveMode, setImmersiveMode] = useState(false);
```

3. **Render EnterWorldButton** above the horizontal trail map (after the narrative hook section, around line 3161, before the `{/* Horizontal trail map */}` comment):

```jsx
{/* Enter World button — above trail map */}
{quest?.world_scene_url && !isMobile && (
  <div style={{ padding: '0 22px 8px' }}>
    <EnterWorldButton
      sceneUrl={quest.world_scene_url}
      sceneDescription={quest.world_hotspots?.[0] ? `${quest.world_hotspots.length} locations to explore` : null}
      onClick={() => setImmersiveMode(true)}
    />
  </div>
)}
```

Also show on mobile (simpler version):
```jsx
{quest?.world_scene_url && isMobile && (
  <div style={{ padding: '0 14px 8px' }}>
    <EnterWorldButton
      sceneUrl={quest.world_scene_url}
      sceneDescription="Tap to explore"
      onClick={() => setImmersiveMode(true)}
    />
  </div>
)}
```

4. **Render ImmersiveWorldView** when immersive mode is active (at the bottom of the component, before the final closing tags):

```jsx
{/* Immersive 3D World */}
{immersiveMode && quest?.world_scene_url && (
  <Suspense fallback={
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 16, fontFamily: 'var(--font-body)' }}>
      Loading your world...
    </div>
  }>
    <ImmersiveWorldView
      sceneUrl={quest.world_scene_url}
      hotspots={quest.world_hotspots || []}
      stages={stages}
      activeStageId={activeCard}
      onStageSelect={(stageId) => {
        setActiveCard(stageId);
      }}
      onExit={() => setImmersiveMode(false)}
      isMobile={isMobile}
      studentName={studentName}
      xp={xpState?.totalXP}
    />
  </Suspense>
)}
```

5. **Lock body scroll** when immersive mode is active:

```javascript
useEffect(() => {
  if (immersiveMode) {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }
}, [immersiveMode]);
```

**How to test:**
1. You need a quest with `world_scene_url` populated (from Task 7, or manually INSERT a test image URL)
2. Open the student quest page `/q/:id`
3. You should see the "Enter Your World" button above the trail map
4. Click it — the 3D immersive view should load (full screen, panoramic image on sphere)
5. Look around with mouse drag
6. Click a hotspot — stage panel slides in
7. Click "Exit World" — returns to normal quest page
8. On mobile (or mobile emulator): test touch-drag look-around

**Commit:** `feat: wire ImmersiveWorldView into StudentQuestPage with lazy import`

---

### Task 15: Scene regeneration on student "Suggest a change"

**Files:**
- Modify: `src/pages/student/StudentQuestPage.jsx`

**What to do:**

After a student's stage edit is accepted (via `handleAcceptEdit` in StageCard), show an "Update World" option. When clicked, regenerate the world scene with the updated stages.

1. **Add state** for world regeneration:

```javascript
const [worldUpdateAvailable, setWorldUpdateAvailable] = useState(false);
const [worldUpdating, setWorldUpdating] = useState(false);
```

2. **In the onSuggestEdit callback** (where `handleStageEdited` is called after a stage edit), set the flag:

```javascript
// Existing handler — add worldUpdateAvailable flag
const handleStageEdited = () => {
  // Reload stages
  loadQuest(); // or however stages are refreshed
  if (quest?.world_scene_url) {
    setWorldUpdateAvailable(true);
  }
};
```

3. **Render an "Update World" banner** when `worldUpdateAvailable` is true (near the Enter World button):

```jsx
{worldUpdateAvailable && quest?.world_scene_url && (
  <div style={{
    margin: '0 22px 8px', padding: '10px 16px', borderRadius: 10,
    background: 'rgba(184,134,11,0.08)', border: '1px solid rgba(184,134,11,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  }}>
    <span style={{ fontSize: 12, color: 'var(--ink)', fontFamily: 'var(--font-body)' }}>
      Stage updated — your world can be refreshed to match!
    </span>
    <button
      onClick={handleUpdateWorld}
      disabled={worldUpdating}
      style={{
        padding: '6px 14px', borderRadius: 8, border: 'none',
        background: 'var(--compass-gold)', color: 'var(--ink)',
        fontSize: 12, fontWeight: 700, cursor: worldUpdating ? 'wait' : 'pointer',
        fontFamily: 'var(--font-body)',
      }}
    >
      {worldUpdating ? 'Updating...' : 'Update World'}
    </button>
  </div>
)}
```

4. **Handle world regeneration:**

```javascript
const handleUpdateWorld = async () => {
  setWorldUpdating(true);
  try {
    const studentInterests = [...(studentProfile?.interests || []), ...(studentProfile?.passions || [])];
    const worldData = await ai.generateFullWorldScene({
      questId: quest.id,
      questTitle: quest.title,
      stages: stages.map(s => ({ stage_number: s.stage_number, stage_title: s.title, stage_type: s.stage_type, description: s.description })),
      studentInterests,
      careerPathway: quest.career_pathway || 'none',
      gradeBand: studentProfile?.grade_band || '6-8',
    });
    if (worldData?.sceneUrl) {
      await supabase.from('quests').update({
        world_scene_url: worldData.sceneUrl,
        world_hotspots: worldData.hotspots || [],
        world_scene_prompt: worldData.scenePrompt || '',
      }).eq('id', quest.id);
      // Reload quest to pick up new scene
      loadQuest();
    }
    setWorldUpdateAvailable(false);
  } catch (err) {
    console.error('World update failed:', err);
  }
  setWorldUpdating(false);
};
```

**How to test:**
1. Open a quest that has a world scene
2. Click "Suggest a change" on an active stage
3. Type a change and accept it
4. You should see "Stage updated — your world can be refreshed to match!" banner
5. Click "Update World" — it should regenerate the scene
6. The Enter World button should show the new scene image

**Commit:** `feat: world scene regeneration on student stage edits`

---

## Verification Checklist

- [ ] Migration 032 run in Supabase — world_scene columns exist
- [ ] Three.js dependencies installed — build passes
- [ ] world-scenes Storage bucket created in Supabase (public)
- [ ] Generate a quest → world scene is generated alongside
- [ ] QuestBuilder Step 5 shows world preview with hotspot markers
- [ ] QuestBuilder Step 5 "Regenerate" button works
- [ ] Launch quest → world_scene_url and world_hotspots saved to DB
- [ ] Student opens quest → "Enter World" button visible
- [ ] Click "Enter World" → full-screen 3D panorama loads
- [ ] Desktop: mouse drag to look around
- [ ] Mobile: gyroscope look-around (or touch-drag fallback)
- [ ] Stage hotspots visible at correct positions
- [ ] Click hotspot → stage panel slides in
- [ ] Active stage hotspot pulses, completed shows checkmark, locked is dimmed
- [ ] "Exit World" returns to normal quest page
- [ ] "Suggest a change" → "Update World" banner appears
- [ ] Old quests without scenes → no "Enter World" button, TreasureMap works as before

---

## Execution Order

1. **Tasks 1-3** (Foundation) — sequential, fast
2. **Tasks 4-6** (AI Scene Generation) — sequential, depend on each other
3. **Tasks 7-8** (QuestBuilder Integration) — sequential
4. **Tasks 9-11** (Three.js Components) — parallelizable (independent components)
5. **Task 12** (ImmersiveWorldView container) — depends on 9-11
6. **Task 13** (EnterWorldButton) — independent, can parallel with 9-11
7. **Task 14** (StudentQuestPage integration) — depends on 12 + 13
8. **Task 15** (Regeneration on edits) — depends on 14

Total: 15 tasks. Tasks 9-11+13 can run in parallel. Everything else is sequential.
