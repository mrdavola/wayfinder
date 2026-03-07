import { Compass, Anchor, Flame, Map as MapIcon, Zap, Mountain, Telescope, Flag, PenTool, Crown } from 'lucide-react';

const BADGE_ICONS = {
  compass: Compass, anchor: Anchor, flame: Flame, map: MapIcon,
  zap: Zap, mountain: Mountain, telescope: Telescope, flag: Flag,
  'pen-tool': PenTool, crown: Crown,
};

export default function BadgeGrid({ earnedBadges = [], allBadges = [] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {allBadges.map(badge => {
        const earned = earnedBadges.some(eb => (eb.badges?.slug || eb.badge_slug) === badge.slug);
        const Icon = BADGE_ICONS[badge.icon] || Compass;
        return (
          <div key={badge.slug} title={earned ? `${badge.name}: ${badge.description}` : badge.name}
            style={{
              width: 56, height: 56, borderRadius: 12,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: earned ? 'var(--compass-gold)10' : 'var(--parchment)',
              border: `1.5px solid ${earned ? 'var(--compass-gold)' : 'var(--pencil)40'}`,
              opacity: earned ? 1 : 0.35, transition: 'all 300ms',
            }}>
            <Icon size={20} color={earned ? 'var(--compass-gold)' : 'var(--pencil)'} />
            <span style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: earned ? 'var(--ink)' : 'var(--pencil)', marginTop: 2, textAlign: 'center', lineHeight: 1.1, maxWidth: 50, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {badge.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
