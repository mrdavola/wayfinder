const VALID_BIOME_IDS = new Set(['campsite', 'lab', 'workshop', 'cabin']);
const VALID_ROLES = new Set([
  'trailheadSign', 'stage', 'guide', 'bulletinSubmit', 'mailbox',
  'challenger', 'reflection', 'stretch', 'teammate', 'parentLetter',
  'wallMap', 'specimenCabinet', 'bulletinBoard',
]);
const PCT = /^\d+(\.\d+)?%$/;

export function validateBiomeConfig(cfg) {
  const errors = [];
  if (!cfg || typeof cfg !== 'object') {
    return { ok: false, errors: ['config must be an object'] };
  }
  if (!cfg.id || !VALID_BIOME_IDS.has(cfg.id)) {
    errors.push(`id must be one of ${[...VALID_BIOME_IDS].join(',')}`);
  }
  if (!cfg.layers || !cfg.layers.back || !cfg.layers.mid || !cfg.layers.fore) {
    errors.push('layers.back, layers.mid, layers.fore are all required');
  }
  if (!Array.isArray(cfg.ambient)) {
    errors.push('ambient must be an array of preset ids');
  }
  if (!Array.isArray(cfg.hotspots) || cfg.hotspots.length === 0) {
    errors.push('hotspots must be a non-empty array');
  } else {
    cfg.hotspots.forEach((h, i) => {
      if (!h.role || !VALID_ROLES.has(h.role)) errors.push(`hotspots[${i}].role invalid`);
      if (typeof h.x !== 'string' || !PCT.test(h.x)) errors.push(`hotspots[${i}].x must be a percentage string`);
      if (typeof h.y !== 'string' || !PCT.test(h.y)) errors.push(`hotspots[${i}].y must be a percentage string`);
      if (h.role === 'stage' && typeof h.stageIndex !== 'number') {
        errors.push(`hotspots[${i}].stageIndex required when role='stage'`);
      }
    });
  }
  return { ok: errors.length === 0, errors };
}
