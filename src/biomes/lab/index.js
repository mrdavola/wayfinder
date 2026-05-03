/** @type {import('../types').BiomeConfig} */
export const lab = {
  id: 'lab',
  layers: {
    back: '/biomes/lab/back.svg',
    mid:  '/biomes/lab/mid.svg',
    fore: '/biomes/lab/fore.svg',
  },
  ambient: ['chalkScratch', 'paperRustle'],
  hotspots: [
    { role: 'trailheadSign',  x: '14%', y: '60%' },
    { role: 'stage',          x: '32%', y: '56%', stageIndex: 0 },
    { role: 'stage',          x: '50%', y: '52%', stageIndex: 1 },
    { role: 'stage',          x: '66%', y: '48%', stageIndex: 2 },
    { role: 'guide',          x: '44%', y: '70%' },
    { role: 'bulletinSubmit', x: '76%', y: '44%' },
    { role: 'mailbox',        x: '86%', y: '62%' },
    { role: 'reflection',     x: '38%', y: '74%' },
    { role: 'challenger',     x: '22%', y: '68%' },
  ],
  decor: [
    {
      slot: 'lab_board',
      x: '74%',
      y: '41%',
      subject: 'a hand-drawn scientific diagram pinned to a corkboard with specimen labels and ink annotations',
    },
    {
      slot: 'specimen_shelf',
      x: '13%',
      y: '55%',
      subject: 'a weathered wooden shelf of glass specimen jars with handwritten labels and pressed botanical samples',
    },
  ],
};
