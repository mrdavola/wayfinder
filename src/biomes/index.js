import { campsite } from './campsite/index.js';
import { cabin }    from './cabin/index.js';

const REGISTRY = { campsite, cabin };

export function listBiomes() { return Object.keys(REGISTRY); }
export function getBiome(id) { return REGISTRY[id]; }
