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
