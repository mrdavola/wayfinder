// Versioned style prefix for AI-generated learner-world art (character
// portraits and decorative items). Brand-protection seam: bumping
// STYLE_PREFIX_VERSION + backfilling regenerates everything.

export const STYLE_PREFIX_VERSION = 'v1';

export const STYLE_PREFIX_V1 =
  'vintage natural-history color plate, sepia + cream parchment background, ' +
  'ink-line + watercolor wash, hand-drawn naturalist register, soft edges, ' +
  'no modern UI elements, no text overlays, gentle muted palette, ' +
  'subject:';

/**
 * @param {string} subjectPrompt user-controlled subject description (e.g. "a botanist holding a fern")
 * @returns {string} full prompt to send to the image-gen provider
 */
export function buildArtPrompt(subjectPrompt) {
  const cleaned = String(subjectPrompt || '').replace(/\s+/g, ' ').trim();
  return `${STYLE_PREFIX_V1} ${cleaned}`;
}
