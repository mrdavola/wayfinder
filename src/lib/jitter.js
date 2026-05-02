// src/lib/jitter.js
// Deterministic per-id jitter rotation (degrees) for hand-placed-on-paper feel.
// Uses a small FNV-1a hash on the id and maps to [-maxDeg, +maxDeg].

/**
 * @param {string} id stable identifier (e.g. specimen id, hotspot id)
 * @param {number} maxDeg maximum absolute degrees of rotation
 * @returns {number} degrees in [-maxDeg, +maxDeg]
 */
export function seededJitterDeg(id, maxDeg = 1) {
  if (!id) return 0;
  // FNV-1a 32-bit
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // Normalise to [0, 1)
  const norm = ((hash >>> 0) % 10000) / 10000;
  // Map to [-maxDeg, +maxDeg]
  return (norm * 2 - 1) * maxDeg;
}
