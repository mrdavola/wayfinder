// src/lib/worldEngine.js
// World Engine — constants, blueprint schema, and helpers

export const HERO_JOURNEY_BEATS = [
  { id: 'ordinary_world', label: 'Ordinary World', description: 'Where the hero starts — their comfort zone' },
  { id: 'call_to_adventure', label: 'Call to Adventure', description: 'The challenge is presented' },
  { id: 'crossing_threshold', label: 'Crossing the Threshold', description: 'Committing to the journey' },
  { id: 'tests_allies', label: 'Tests & Allies', description: 'Facing challenges, finding help' },
  { id: 'the_ordeal', label: 'The Ordeal', description: 'The biggest challenge' },
  { id: 'the_reward', label: 'The Reward', description: 'Mastery achieved, knowledge gained' },
  { id: 'the_return', label: 'The Return', description: 'Bringing knowledge back, reflection' },
];

export function mapStagesToBeats(stageCount) {
  const allBeats = HERO_JOURNEY_BEATS.map(b => b.id);
  if (stageCount >= 7) return allBeats;
  if (stageCount === 6) return ['call_to_adventure', 'crossing_threshold', 'tests_allies', 'the_ordeal', 'the_reward', 'the_return'];
  if (stageCount === 5) return ['call_to_adventure', 'crossing_threshold', 'tests_allies', 'the_ordeal', 'the_reward'];
  if (stageCount === 4) return ['call_to_adventure', 'crossing_threshold', 'the_ordeal', 'the_reward'];
  if (stageCount === 3) return ['call_to_adventure', 'the_ordeal', 'the_reward'];
  return ['call_to_adventure', 'the_reward'];
}

export const AMBIENT_PRESETS = {
  'underwater-deep': { particle: 'bubble', bgGradient: 'linear-gradient(180deg, #0a1628 0%, #0d2847 40%, #1a4a6e 100%)' },
  'forest-canopy': { particle: 'leaf', bgGradient: 'linear-gradient(180deg, #1a2f1a 0%, #2d5a2d 40%, #3d7a3d 100%)' },
  'mountain-summit': { particle: 'snow', bgGradient: 'linear-gradient(180deg, #2c3e50 0%, #546a7b 40%, #8fa4b0 100%)' },
  'space-station': { particle: 'star', bgGradient: 'linear-gradient(180deg, #0a0a1a 0%, #1a1a3a 40%, #2a2a5a 100%)' },
  'desert-ruins': { particle: 'dust', bgGradient: 'linear-gradient(180deg, #3d2b1f 0%, #6b4423 40%, #c4a265 100%)' },
  'urban-night': { particle: 'rain', bgGradient: 'linear-gradient(180deg, #1a1a2e 0%, #2d2d4e 40%, #3d3d5e 100%)' },
  'volcanic-cave': { particle: 'ember', bgGradient: 'linear-gradient(180deg, #1a0a0a 0%, #3d1a0a 40%, #6b2d0a 100%)' },
  'arctic-ice': { particle: 'frost', bgGradient: 'linear-gradient(180deg, #e8f0f8 0%, #b8d4e8 40%, #8ab4d4 100%)' },
  'jungle-river': { particle: 'firefly', bgGradient: 'linear-gradient(180deg, #0a1f0a 0%, #1a3f1a 40%, #2d6b2d 100%)' },
  'storm-coast': { particle: 'spray', bgGradient: 'linear-gradient(180deg, #2c3e50 0%, #34495e 40%, #5d7b93 100%)' },
};

export const GRADE_TONE = {
  'K-2': 'warm, magical, wonder-filled. Simple vocabulary. Characters can be fantastical (talking animals, friendly spirits). Stakes feel safe but exciting.',
  '3-5': 'adventurous, imaginative but grounded. Rich vocabulary with context clues. Characters blend real and fantastical. Stakes feel meaningful.',
  '6-8': 'grounded, real-world stakes, emotionally resonant. Sophisticated vocabulary. Characters are realistic professionals or complex figures. No hand-holding — students confront real data and hard questions.',
  '9-12': 'mature, nuanced, professionally grounded. Academic vocabulary expected. Characters are domain experts with flaws. Stakes are systemic and complex.',
};

export function blueprintToCSSVars(palette) {
  if (!palette) return {};
  return {
    '--world-bg': palette.bg || '#1a1a2e',
    '--world-bg-mid': palette.bgMid || palette.bg || '#2d2d4e',
    '--world-accent': palette.accent || '#4ecdc4',
    '--world-text': palette.text || '#f0f0f0',
    '--world-text-muted': palette.textMuted || 'rgba(240,240,240,0.6)',
    '--world-surface': palette.surface || 'rgba(255,255,255,0.08)',
    '--world-surface-hover': palette.surfaceHover || 'rgba(255,255,255,0.12)',
    '--world-border': palette.border || 'rgba(255,255,255,0.1)',
  };
}

export function getParticleCSS(particleType) {
  const configs = {
    bubble: { char: '○', count: 15, direction: 'up', speed: '8s', sway: true },
    leaf: { char: '🍃', count: 10, direction: 'down', speed: '12s', sway: true },
    snow: { char: '·', count: 25, direction: 'down', speed: '10s', sway: true },
    star: { char: '✦', count: 20, direction: 'none', speed: '3s', sway: false },
    dust: { char: '·', count: 15, direction: 'right', speed: '15s', sway: true },
    rain: { char: '│', count: 20, direction: 'down', speed: '1s', sway: false },
    ember: { char: '●', count: 12, direction: 'up', speed: '6s', sway: true },
    frost: { char: '❋', count: 10, direction: 'down', speed: '14s', sway: true },
    firefly: { char: '·', count: 12, direction: 'none', speed: '4s', sway: false },
    spray: { char: '~', count: 15, direction: 'up', speed: '3s', sway: true },
  };
  return configs[particleType] || configs.dust;
}
