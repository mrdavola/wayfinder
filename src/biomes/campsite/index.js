/** @type {import('../types').BiomeConfig} */
export const campsite = {
  id: 'campsite',
  layers: {
    back: '/biomes/campsite/back.svg',  // not yet created — Phase 1 deliverable
    mid:  '/biomes/campsite/mid.svg',
    fore: '/biomes/campsite/fore.svg',
  },
  ambient: ['lanternFlicker', 'mothFlutter'],
  hotspots: [
    { role: 'trailheadSign',  x: '12%', y: '62%' },
    { role: 'stage',          x: '34%', y: '58%', stageIndex: 0 },
    { role: 'stage',          x: '52%', y: '54%', stageIndex: 1 },
    { role: 'stage',          x: '68%', y: '50%', stageIndex: 2 },
    { role: 'guide',          x: '46%', y: '72%' },
    { role: 'bulletinSubmit', x: '78%', y: '46%' },
    { role: 'mailbox',        x: '88%', y: '64%' },
    { role: 'reflection',     x: '40%', y: '76%' },
    { role: 'challenger',     x: '20%', y: '70%' },
  ],
};
