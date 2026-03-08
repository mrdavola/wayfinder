import { useState, useRef } from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert, UserCheck } from 'lucide-react';
import { getTrustColor, getTrustLabel } from '../../lib/trustDomains';

const TIER_ICONS = {
  trusted: ShieldCheck,
  review: AlertTriangle,
  unverified: ShieldAlert,
  verified_by_guide: UserCheck,
  incorrect: ShieldAlert,
  unknown: AlertTriangle,
};

export default function TrustBadge({ tier, url, sourceName, onOverride, verified }) {
  const [hovered, setHovered] = useState(false);
  const hideTimeout = useRef(null);
  const color = getTrustColor(tier);
  const label = getTrustLabel(tier);
  const Icon = TIER_ICONS[tier] || AlertTriangle;

  const showTooltip = () => {
    clearTimeout(hideTimeout.current);
    setHovered(true);
  };

  const hideTooltip = () => {
    hideTimeout.current = setTimeout(() => setHovered(false), 150);
  };

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 3 }}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      <Icon size={12} color={color} />
      {sourceName && (
        <span style={{
          fontSize: 10, color, fontFamily: 'var(--font-mono)',
          maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {sourceName}
        </span>
      )}
      {verified === true && (
        <span style={{
          fontSize: 8, fontWeight: 700, color: '#2D6A4F',
          background: 'rgba(45,106,79,0.1)', padding: '1px 4px',
          borderRadius: 3, fontFamily: 'var(--font-mono)',
          marginLeft: 2, verticalAlign: 'middle', lineHeight: '14px',
        }}>
          VERIFIED
        </span>
      )}
      {hovered && (
        <div
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
          style={{
            position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
            marginBottom: 4, padding: '8px 12px', borderRadius: 6,
            background: 'var(--ink)', color: 'var(--chalk)', fontSize: 11,
            fontFamily: 'var(--font-body)', whiteSpace: 'nowrap', zIndex: 100,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}>
          <div style={{ fontWeight: 600, marginBottom: 0 }}>{label}</div>
          {onOverride && tier !== 'verified_by_guide' && tier !== 'incorrect' && (
            <div style={{ marginTop: 4, display: 'flex', gap: 6 }}>
              <button onClick={() => onOverride('verified_by_guide')}
                style={{ fontSize: 9, color: '#7CB9E8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                Mark verified
              </button>
              <button onClick={() => onOverride('incorrect')}
                style={{ fontSize: 9, color: 'var(--specimen-red)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                Mark incorrect
              </button>
            </div>
          )}
        </div>
      )}
    </span>
  );
}
