/** @type {import('../types').BiomeConfig} */
// Cabin = student home base / hub. Three hub hotspots wired to CabinOverlay
// (wallMap → projects, specimenCabinet → skills, bulletinBoard → messages).
// Positions anchor over the painted props in the cabin SVG layers.
export const cabin = {
  id: 'cabin',
  layers: {
    back: '/biomes/cabin/back.svg',
    mid:  '/biomes/cabin/mid.svg',
    fore: '/biomes/cabin/fore.svg',
  },
  ambient: ['hearthFlicker'],
  hotspots: [
    { role: 'wallMap',         x: '14%', y: '38%' },   // left window — view your projects
    { role: 'specimenCabinet', x: '13%', y: '78%' },   // bookshelf — review your skills
    { role: 'bulletinBoard',   x: '30%', y: '38%' },   // cork board — check your messages
  ],
  decor: [],
};
