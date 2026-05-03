// src/lib/artGen.js
import { fal } from '@fal-ai/client';
import { buildArtPrompt } from './styleGenAI';

fal.config({ credentials: import.meta.env.VITE_FAL_KEY || '' });

const GUIDE_SUBJECT = {
  campsite: 'a naturalist field guide character, warm smile, wearing a canvas field vest, holding a worn leather journal, soft forest clearing background',
  lab:      'a laboratory mentor character, friendly curious expression, wearing a crisp lab coat, holding a glass flask, bright clean laboratory background',
  workshop: 'a skilled workshop mentor character, warm expression, wearing a canvas workshop apron, hands on workbench surrounded by wooden tools, warm workshop background',
};

const DECOR_SUBJECT = {
  bulletin_note:    'a hand-lettered expedition notice board pinned with field notes and sketches',
  trailhead_banner: 'a weathered wooden trailhead sign with carved text and a small compass rose',
};

/**
 * @param {'campsite'|'lab'|'workshop'} biomeId
 * @param {string} [extraHint]  e.g. "for a marine biology project"
 * @returns {Promise<string>}  CDN URL of the generated portrait
 */
export async function generatePortrait(biomeId = 'campsite', extraHint = '') {
  if (!import.meta.env.VITE_FAL_KEY) return null;
  const subject = GUIDE_SUBJECT[biomeId] ?? GUIDE_SUBJECT.campsite;
  const hint    = String(extraHint || '').trim();
  const prompt  = buildArtPrompt(hint ? `${subject}, ${hint}` : subject);

  let result;
  try {
    result = await fal.subscribe('fal-ai/nano-banana-2', {
      input: { prompt, image_size: 'portrait_4_3', num_images: 1 },
    });
  } catch (err) {
    console.warn(`fal.ai portrait request failed (biome: ${biomeId}):`, err.message);
    return null;
  }

  return result?.data?.images?.[0]?.url ?? null;
}

/**
 * @param {string} slot        biome config slot key, e.g. 'bulletin_note'
 * @param {string} biomeId
 * @param {string} questTitle  used as context hint
 * @returns {Promise<{url: string, prompt: string}>}
 */
export async function generateDecorSlot(slot, biomeId = 'campsite', questTitle = '') {
  if (!import.meta.env.VITE_FAL_KEY) return null;
  const subject = DECOR_SUBJECT[slot] ?? `a decorative element for a ${biomeId} biome`;
  const hint    = String(questTitle || '').trim();
  const prompt  = buildArtPrompt(hint ? `${subject}, related to "${hint}"` : subject);

  let result;
  try {
    result = await fal.subscribe('fal-ai/nano-banana-2', {
      input: { prompt, image_size: 'square', num_images: 1 },
    });
  } catch (err) {
    console.warn(`fal.ai decor request failed (slot: ${slot}):`, err.message);
    return null;
  }

  const url = result?.data?.images?.[0]?.url;
  if (!url) return null;
  return { url, prompt };
}

/**
 * Subject hints for project-banner imagery, by role. Each describes a SCENE
 * relevant to the role's UX surface (e.g. mailbox = pile of letters), tied
 * back to the project title so the result reads as "this project".
 */
const ROLE_SUBJECTS = {
  trailheadSign:  'an opening illustration that captures the project — its setting, its people, its central question',
  bulletinSubmit: 'a flat-lay of a finished deliverable pinned to a corkboard — sketches, photos, notes',
  bulletinBoard:  'a corkboard pinned with rich student work in progress',
  reflection:     'a quiet reflective scene — journal pages, evening light, room to think',
  mailbox:        'a flat-lay of incoming letters and feedback notes spread on a desk',
  challenger:     'an illustration of a thoughtful conversation between two people debating ideas',
  stretch:        'a side path branching off from the main trail — an invitation to go further',
  parentLetter:   'a hand-written letter from home, opened on a wooden surface',
};

/**
 * Generate a project-relevant banner image for a HotspotOverlay panel.
 * Uses fal.ai if configured; returns null otherwise so the caller can
 * render a deterministic text-card fallback.
 *
 * Self-check: validates the returned URL is reachable and the image has
 * non-trivial dimensions before returning. Failed checks return null.
 *
 * @param {object} quest             quest record with title + driving_question
 * @param {string} role              hotspot role
 * @returns {Promise<string|null>}   image URL or null
 */
export async function generateProjectBanner(quest, role = 'trailheadSign') {
  if (!import.meta.env.VITE_FAL_KEY) return null;
  if (!quest?.title) return null;

  const roleSubject = ROLE_SUBJECTS[role] || ROLE_SUBJECTS.trailheadSign;
  const drivingQuestion = quest.driving_question || quest.description || '';
  const subjectFull = `${roleSubject}; project title: "${quest.title}"; ` +
    (drivingQuestion ? `driving question: "${drivingQuestion}". ` : '') +
    'composition: wide landscape, clear focal subject, no text or letters.';
  const prompt = buildArtPrompt(subjectFull);

  let result;
  try {
    result = await fal.subscribe('fal-ai/nano-banana-2', {
      input: { prompt, image_size: 'landscape_16_9', num_images: 1 },
    });
  } catch (err) {
    console.warn(`fal.ai banner request failed (role: ${role}):`, err.message);
    return null;
  }

  const url = result?.data?.images?.[0]?.url;
  if (!url) return null;

  // Self-check: image must be reachable and non-trivial in size.
  try {
    const head = await fetch(url, { method: 'HEAD' });
    if (!head.ok) return null;
    const contentLength = parseInt(head.headers.get('content-length') || '0', 10);
    if (contentLength > 0 && contentLength < 4000) return null; // suspiciously tiny
  } catch {
    // CORS may block HEAD; let the <img> onerror handler decide instead.
  }
  return url;
}
