/**
 * @typedef {'campsite'|'lab'|'workshop'|'cabin'} BiomeId
 *
 * @typedef {Object} BiomeLayers
 * @property {string} back
 * @property {string} mid
 * @property {string} fore
 *
 * @typedef {'trailheadSign'|'stage'|'guide'|'bulletinSubmit'|'mailbox'|'challenger'|'reflection'|'stretch'|'teammate'|'parentLetter'|'wallMap'|'specimenCabinet'|'bulletinBoard'} HotspotRole
 *
 * @typedef {Object} HotspotConfig
 * @property {HotspotRole} role
 * @property {string} x  CSS percentage e.g. '50%'
 * @property {string} y
 * @property {number} [stageIndex]      required when role === 'stage'
 * @property {string} [tactile]         GLB filename (Phase 3)
 *
 * @typedef {Object} BiomeConfig
 * @property {BiomeId} id
 * @property {BiomeLayers} layers
 * @property {string[]} ambient         ambient-motion preset ids
 * @property {HotspotConfig[]} hotspots
 */
export {};
