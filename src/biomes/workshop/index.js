/** @type {import('../types').BiomeConfig} */
export const workshop = {
  id: 'workshop',
  layers: {
    back: '/biomes/workshop/back.svg',
    mid:  '/biomes/workshop/mid.svg',
    fore: '/biomes/workshop/fore.svg',
  },
  ambient: ['hammerTap', 'sawdust'],
  hotspots: [
    { role: 'trailheadSign',  x: '10%', y: '64%' },
    { role: 'stage',          x: '30%', y: '60%', stageIndex: 0 },
    { role: 'stage',          x: '48%', y: '56%', stageIndex: 1 },
    { role: 'stage',          x: '64%', y: '52%', stageIndex: 2 },
    { role: 'guide',          x: '42%', y: '74%' },
    { role: 'bulletinSubmit', x: '74%', y: '48%' },
    { role: 'mailbox',        x: '84%', y: '66%' },
    { role: 'reflection',     x: '36%', y: '78%' },
    { role: 'challenger',     x: '18%', y: '72%' },
  ],
  decor: [
    {
      slot: 'blueprint_board',
      x: '72%',
      y: '45%',
      subject: 'a rolled-out blueprint pinned with thumb tacks showing a mechanical contraption with hand-written measurements',
    },
    {
      slot: 'tool_rack',
      x: '9%',
      y: '58%',
      subject: 'a pegboard of vintage hand tools — hammers, chisels and gauges — with pencil-sketch outlines tracing each shape',
    },
  ],
};
