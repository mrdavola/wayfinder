import { useState, useEffect } from 'react';
import { Star, TrendingUp } from 'lucide-react';
import ExplorerRankBadge from './ExplorerRankBadge';

export default function XPToast({ points, rankUp, newRank, badgeEarned, onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDone?.(), 300);
    }, rankUp ? 4000 : 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 9999,
      transform: visible ? 'translateX(0)' : 'translateX(120%)',
      opacity: visible ? 1 : 0,
      transition: 'all 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    }}>
      <div style={{
        background: 'var(--ink)', color: 'var(--chalk)', borderRadius: 12,
        padding: '12px 20px', minWidth: 200,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 14 }}>
          <Star size={16} color="var(--compass-gold)" fill="var(--compass-gold)" />
          <span style={{ color: 'var(--compass-gold)', fontWeight: 700 }}>+{points} EP</span>
        </div>
        {rankUp && newRank && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-body)', fontSize: 13 }}>
            <TrendingUp size={14} color="var(--field-green)" />
            <span>Rank up!</span>
            <ExplorerRankBadge rank={newRank} size="sm" />
          </div>
        )}
        {badgeEarned && (
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--compass-gold)' }}>
            Badge earned: {badgeEarned}
          </div>
        )}
      </div>
    </div>
  );
}
