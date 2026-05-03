/** @type {import('../types').BiomeConfig} */
export const workshop = {
  id: 'workshop',
  layers: {
    back: '/biomes/workshop/back.svg',
    mid:  '/biomes/workshop/mid.svg',
    fore: '/biomes/workshop/fore.svg',
  },
  ambient: ['hammerTap', 'sawdust'],
  // Stages walk along the workbench top, left to right; figures and
  // service hotspots stay on the floor band below the bench.
  hotspots: [
    { role: 'trailheadSign',  x: '12%', y: '72%' },
    { role: 'stage',          x: '32%', y: '60%', stageIndex: 0 },
    { role: 'stage',          x: '50%', y: '60%', stageIndex: 1 },
    { role: 'stage',          x: '68%', y: '60%', stageIndex: 2 },
    { role: 'mailbox',        x: '20%', y: '88%' },
    { role: 'challenger',     x: '6%',  y: '92%' },
    { role: 'guide',          x: '40%', y: '90%' },
    { role: 'bulletinSubmit', x: '86%', y: '72%' },
    { role: 'reflection',     x: '94%', y: '88%' },
  ],
  decor: [],
};
