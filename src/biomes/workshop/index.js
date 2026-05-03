/** @type {import('../types').BiomeConfig} */
export const workshop = {
  id: 'workshop',
  layers: {
    back: '/biomes/workshop/back.svg',
    mid:  '/biomes/workshop/mid.svg',
    fore: '/biomes/workshop/fore.svg',
  },
  ambient: ['hammerTap', 'sawdust'],
  // Stages walk along the workbench top, left to right.
  hotspots: [
    { role: 'trailheadSign',  x: '12%', y: '70%' },
    { role: 'stage',          x: '32%', y: '60%', stageIndex: 0 },
    { role: 'stage',          x: '50%', y: '60%', stageIndex: 1 },
    { role: 'stage',          x: '68%', y: '60%', stageIndex: 2 },
    { role: 'guide',          x: '42%', y: '82%' },
    { role: 'reflection',     x: '88%', y: '80%' },
    { role: 'bulletinSubmit', x: '80%', y: '70%' },
    { role: 'mailbox',        x: '22%', y: '82%' },
    { role: 'challenger',     x: '60%', y: '82%' },
  ],
  decor: [],
};
