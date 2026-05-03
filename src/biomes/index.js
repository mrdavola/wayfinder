import { campsite }  from './campsite/index.js';
import { cabin }     from './cabin/index.js';
import { lab }       from './lab/index.js';
import { workshop }  from './workshop/index.js';

const REGISTRY = { campsite, cabin, lab, workshop };

export function listBiomes() { return Object.keys(REGISTRY); }
export function getBiome(id) { return REGISTRY[id]; }
