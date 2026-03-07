import { Compass, Binoculars, Map, Flame, Telescope, Crown } from 'lucide-react';

const RANK_CONFIG = {
  apprentice: { icon: Compass, label: 'Apprentice', color: 'var(--pencil)' },
  scout: { icon: Binoculars, label: 'Scout', color: 'var(--field-green)' },
  pathfinder: { icon: Map, label: 'Pathfinder', color: 'var(--lab-blue)' },
  trailblazer: { icon: Flame, label: 'Trailblazer', color: 'var(--compass-gold)' },
  navigator: { icon: Telescope, label: 'Navigator', color: 'var(--specimen-red)' },
  expedition_leader: { icon: Crown, label: 'Expedition Leader', color: '#7C3AED' },
};

export default function ExplorerRankBadge({ rank = 'apprentice', size = 'md', showLabel = true }) {
  const config = RANK_CONFIG[rank] || RANK_CONFIG.apprentice;
  const Icon = config.icon;
  const sizes = { sm: { icon: 14, font: 10, pad: '3px 8px' }, md: { icon: 18, font: 12, pad: '5px 12px' }, lg: { icon: 24, font: 14, pad: '8px 16px' } };
  const s = sizes[size] || sizes.md;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: s.pad, borderRadius: 20,
      background: `${config.color}15`, border: `1.5px solid ${config.color}40`,
      fontFamily: 'var(--font-mono)', fontSize: s.font, color: config.color,
      fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
    }}>
      <Icon size={s.icon} />
      {showLabel && config.label}
    </span>
  );
}

export { RANK_CONFIG };
