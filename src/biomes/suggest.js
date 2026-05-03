const LAB_KEYWORDS = new Set([
  'biology', 'chemistry', 'physics', 'ecology', 'environmental',
  'medical', 'life_science', 'earth_science', 'neuroscience', 'genetics',
  'biochemistry', 'microbiology', 'zoology', 'botany',
]);

const WORKSHOP_KEYWORDS = new Set([
  'engineering', 'technology', 'material_science', 'robotics', 'design',
  'computer_science', 'programming', 'architecture', 'manufacturing',
  'mechatronics', 'electronics', 'fabrication', 'woodworking',
]);

const QUEST_BIOMES = new Set(['campsite', 'lab', 'workshop']);

/**
 * Returns the biome id for a quest. Respects an explicit biome_id when set
 * to a valid quest biome. Falls back to keyword-matching career_pathway.
 * The cabin biome is never returned — it is a hub, not a quest biome.
 *
 * @param {object|null} quest
 * @returns {'campsite'|'lab'|'workshop'}
 */
export function suggestBiome(quest) {
  if (!quest) return 'campsite';
  if (quest.biome_id && QUEST_BIOMES.has(quest.biome_id)) return quest.biome_id;
  const pathway = String(quest.career_pathway || '').toLowerCase().replace(/ /g, '_');
  if (LAB_KEYWORDS.has(pathway)) return 'lab';
  if (WORKSHOP_KEYWORDS.has(pathway)) return 'workshop';
  return 'campsite';
}
