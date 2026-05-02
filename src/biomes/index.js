import { campsite } from './campsite/index.js';

const REGISTRY = { campsite };

export function listBiomes() { return Object.keys(REGISTRY); }
export function getBiome(id) { return REGISTRY[id]; }
