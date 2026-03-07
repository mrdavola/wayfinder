import { RANK_CONFIG } from './ExplorerRankBadge';

const RANK_THRESHOLDS = [
  { rank: 'apprentice', min: 0 },
  { rank: 'scout', min: 200 },
  { rank: 'pathfinder', min: 600 },
  { rank: 'trailblazer', min: 1500 },
  { rank: 'navigator', min: 3000 },
  { rank: 'expedition_leader', min: 6000 },
];

export default function XPBar({ totalPoints = 0, currentRank = 'apprentice' }) {
  const currentIdx = RANK_THRESHOLDS.findIndex(r => r.rank === currentRank);
  const nextRank = currentIdx < RANK_THRESHOLDS.length - 1 ? RANK_THRESHOLDS[currentIdx + 1] : null;
  const currentMin = RANK_THRESHOLDS[currentIdx]?.min || 0;
  const nextMin = nextRank?.min || currentMin;
  const progress = nextRank ? ((totalPoints - currentMin) / (nextMin - currentMin)) * 100 : 100;
  const config = RANK_CONFIG[currentRank] || RANK_CONFIG.apprentice;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--graphite)' }}>{totalPoints} EP</span>
        {nextRank && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--pencil)' }}>
            {nextMin - totalPoints} to {RANK_CONFIG[nextRank.rank]?.label}
          </span>
        )}
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--parchment)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 3, background: config.color, width: `${Math.min(100, Math.max(0, progress))}%`, transition: 'width 600ms ease' }} />
      </div>
    </div>
  );
}
