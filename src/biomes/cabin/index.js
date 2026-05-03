/** @type {import('../types').BiomeConfig} */
export const cabin = {
  id: 'cabin',
  layers: {
    back: '/biomes/cabin/back.svg',
    mid:  '/biomes/cabin/mid.svg',
    fore: '/biomes/cabin/fore.svg',
  },
  ambient: ['hearthFlicker'],
  hotspots: [
    { role: 'wallMap',         x: '20%', y: '38%' },
    { role: 'specimenCabinet', x: '76%', y: '28%' },
    { role: 'bulletinBoard',   x: '45%', y: '62%' },
  ],
};
