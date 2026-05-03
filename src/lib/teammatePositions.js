// Teammate figure positions, kept clear of the 9 static biome hotspots.
//
// Service hotspot positions to avoid: trailhead 13%, mailbox 24%, guide 42%,
// reflection 88%, bulletinSubmit 82%, challenger 8%, stages 32%/52%/72%.
// Player avatar pins beside the active stage (~32% or 52% or 72% ±6%).
//
// We park teammates between the player and the bulletin/reflection — at 92%
// y-band so they sit below stage cairns and don't shadow service props.
const POSITIONS = [
  { x: '54%', y: '90%' },
  { x: '70%', y: '92%' },
  { x: '46%', y: '94%' },
  { x: '78%', y: '94%' },
  { x: '62%', y: '88%' },
];

/**
 * Returns up to 5 {x, y} percentage positions for teammate hotspots.
 * @param {number} count
 * @returns {{ x: string, y: string }[]}
 */
export function computeTeammatePositions(count) {
  return POSITIONS.slice(0, Math.min(count, POSITIONS.length));
}
