// Fixed teammate avatar positions clustered in the lower-right quadrant,
// chosen to avoid the 9 static hotspot positions used by all three biomes.
const POSITIONS = [
  { x: '60%', y: '74%' },
  { x: '70%', y: '76%' },
  { x: '55%', y: '81%' },
  { x: '65%', y: '83%' },
  { x: '73%', y: '80%' },
];

/**
 * Returns up to 5 {x, y} percentage positions for teammate hotspots.
 * @param {number} count
 * @returns {{ x: string, y: string }[]}
 */
export function computeTeammatePositions(count) {
  return POSITIONS.slice(0, Math.min(count, POSITIONS.length));
}
