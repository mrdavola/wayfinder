import { useState } from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert, UserCheck, ExternalLink } from 'lucide-react';
import { getTrustColor, getTrustLabel } from '../../lib/trustDomains';

const TIER_ICONS = {
  trusted: ShieldCheck,
  review: AlertTriangle,
  unverified: ShieldAlert,
  verified_by_guide: UserCheck,
  incorrect: ShieldAlert,
  unknown: AlertTriangle,
};

export default function TrustBadge({ tier, url, sourceName, onOverride }) {
  const [hovered, setHovered] = useState(false);
  const color = getTrustColor(tier);
  const label = getTrustLabel(tier);
  const Icon = TIER_ICONS[tier] || AlertTriangle;

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 3 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
      {hovered && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          marginBottom: 6, padding: '6px 10px', borderRadius: 6,
          background: 'var(--ink)', color: 'var(--chalk)', fontSize: 11,
          fontFamily: 'var(--font-body)', whiteSpace: 'nowrap', zIndex: 100,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--lab-blue)', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}
              onClick={(e) => e.stopPropagation()}>
              View source <ExternalLink size={9} />
            </a>
          )}
          {onOverride && tier !== 'verified_by_guide' && tier !== 'incorrect' && (
            <div style={{ marginTop: 4, display: 'flex', gap: 6 }}>
              <button onClick={() => onOverride('verified_by_guide')}
                style={{ fontSize: 9, color: 'var(--lab-blue)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Mark verified
              </button>
              <button onClick={() => onOverride('incorrect')}
                style={{ fontSize: 9, color: 'var(--specimen-red)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Mark incorrect
              </button>
            </div>
          )}
        </div>
      )}
    </span>
  );
}
