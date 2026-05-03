/** @type {import('../types').BiomeConfig} */
export const campsite = {
  id: 'campsite',
  layers: {
    back: '/biomes/campsite/back.svg',
    mid:  '/biomes/campsite/mid.svg',
    fore: '/biomes/campsite/fore.svg',
  },
  ambient: ['lanternFlicker', 'mothFlutter'],
  // Hotspots laid out as a journey from left (start) to right (end).
  // Stages 1→2→3 form a rising trail across the middle of the scene.
  // Service props (mailbox, bulletin, journal, fire) cluster in the foreground.
  hotspots: [
    { role: 'trailheadSign',  x: '13%', y: '70%' },
    { role: 'stage',          x: '32%', y: '54%', stageIndex: 0 },
    { role: 'stage',          x: '52%', y: '48%', stageIndex: 1 },
    { role: 'stage',          x: '72%', y: '54%', stageIndex: 2 },
    { role: 'mailbox',        x: '20%', y: '88%' },
    { role: 'challenger',     x: '6%',  y: '92%' },
    { role: 'guide',          x: '40%', y: '90%' },
    { role: 'bulletinSubmit', x: '86%', y: '70%' },
    { role: 'reflection',     x: '94%', y: '88%' },
  ],
  decor: [],
};
