import { useState } from 'react';
import {
  Mountain, Waves, Wind, TreePine, Compass, Landmark as LandmarkIcon,
  FlameKindling, Eye, Castle, Anchor, CloudRain, MountainSnow
} from 'lucide-react';

const LANDMARK_ICONS = {
  cave: FlameKindling,
  lighthouse: Eye,
  bridge: LandmarkIcon,
  volcano: Mountain,
  camp: FlameKindling,
  observatory: Eye,
  waterfall: Waves,
  ruins: Castle,
  tower: Castle,
  harbor: Anchor,
  forest: TreePine,
  mountain_peak: MountainSnow,
};

const LANDMARK_COLORS = {
  completed: { fill: 'var(--field-green)', stroke: '#1B5E3B', icon: 'var(--chalk)' },
  active: { fill: 'var(--compass-gold)', stroke: '#8B6914', icon: 'var(--ink)' },
  locked: { fill: 'var(--parchment)', stroke: 'var(--pencil)', icon: 'var(--pencil)' },
};

export default function MapLandmark({ cx, cy, stage, landmark, isSelected, isActive, onClick }) {
  const [hovered, setHovered] = useState(false);
  const status = stage.status;
  const colors = LANDMARK_COLORS[status] || LANDMARK_COLORS.locked;
  const Icon = LANDMARK_ICONS[landmark?.landmark_type] || Compass;
  const r = 28;

  return (
    <g
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'pointer' }}
      role="button"
      tabIndex={0}
      aria-label={`${landmark?.landmark_name || stage.title} — ${status}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick?.();
      }}
    >
      {status === 'active' && (
        <circle cx={cx} cy={cy} r={r + 10} fill="none"
          stroke="var(--compass-gold)" strokeWidth={1.5} opacity={0.4}>
          <animate attributeName="r" from={r + 6} to={r + 16} dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
      {isSelected && (
        <circle cx={cx} cy={cy} r={r + 6} fill="none"
          stroke="var(--lab-blue)" strokeWidth={2.5} opacity={0.8} />
      )}
      <circle cx={cx} cy={cy} r={r}
        fill={colors.fill} stroke={colors.stroke} strokeWidth={2}
        opacity={status === 'locked' ? 0.55 : 1}
        style={{ transition: 'all 300ms ease' }}
      />
      <foreignObject x={cx - 12} y={cy - 12} width={24} height={24}
        style={{ opacity: status === 'locked' ? 0.45 : 1 }}>
        <Icon size={24} color={colors.icon} />
      </foreignObject>
      <text x={cx} y={cy + r + 16} textAnchor="middle"
        fontFamily="var(--font-mono)" fontSize={9}
        fill="var(--graphite)" opacity={status === 'locked' ? 0.45 : 0.8}>
        {(landmark?.landmark_name || `Stage ${stage.stage_number}`).slice(0, 20)}
      </text>
      {hovered && (
        <foreignObject x={cx - 80} y={cy - r - 44} width={160} height={36}>
          <div style={{
            background: 'var(--ink)', color: 'var(--chalk)', padding: '4px 10px',
            borderRadius: 6, fontSize: 11, fontFamily: 'var(--font-body)',
            textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {landmark?.landmark_name || stage.title}
          </div>
        </foreignObject>
      )}
      {status === 'completed' && (
        <g>
          <circle cx={cx + r - 4} cy={cy - r + 4} r={8} fill="var(--field-green)" stroke="var(--chalk)" strokeWidth={1.5} />
          <text x={cx + r - 4} y={cy - r + 8} textAnchor="middle" fontSize={10} fill="var(--chalk)">✓</text>
        </g>
      )}
    </g>
  );
}