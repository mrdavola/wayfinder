import './WorldSnapshotCard.css';
import { getBiome } from '../../biomes';
import { suggestBiome } from '../../biomes/suggest';

const BIOME_LABELS = {
  campsite: 'Campsite',
  lab: 'Research Lab',
  workshop: 'Workshop',
};

/**
 * Static biome thumbnail for parent-facing quest cards.
 * No interactivity. Uses the back SVG layer as a background image.
 *
 * @param {{ quest: object | null }} props
 */
export default function WorldSnapshotCard({ quest }) {
  if (!quest) return null;
  const biomeId = suggestBiome(quest);
  const cfg = getBiome(biomeId);
  if (!cfg) return null;
  const label = BIOME_LABELS[biomeId] ?? biomeId;

  return (
    <div
      className="world-snapshot-card"
      data-biome={biomeId}
      style={{ backgroundImage: `url(${cfg.layers.back})` }}
      role="img"
      aria-label={`${label} biome`}
    >
      <span className="world-snapshot-card__label">{label}</span>
    </div>
  );
}
