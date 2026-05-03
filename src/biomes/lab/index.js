/** @type {import('../types').BiomeConfig} */
export const lab = {
  id: 'lab',
  layers: {
    back: '/biomes/lab/back.svg',
    mid:  '/biomes/lab/mid.svg',
    fore: '/biomes/lab/fore.svg',
  },
  ambient: ['chalkScratch', 'paperRustle'],
  // Indoor study: stages laid across the workbench. Service hotspots and
  // figures sit on the floor band below the bench (y >= 80%) so nothing
  // overlaps the bench-top stage notebooks.
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
