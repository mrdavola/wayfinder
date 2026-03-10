import { Star } from 'lucide-react';

export function STBadge({ balance, size = 'md' }) {
  const sizes = {
    sm: { fontSize: '0.75rem', padding: '2px 8px', iconSize: 12 },
    md: { fontSize: '0.875rem', padding: '4px 10px', iconSize: 14 },
    lg: { fontSize: '1rem', padding: '6px 12px', iconSize: 16 },
  };
  const s = sizes[size] || sizes.md;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
      color: '#78350f', borderRadius: 20, padding: s.padding,
      fontSize: s.fontSize, fontWeight: 700, fontFamily: 'var(--font-mono)',
      whiteSpace: 'nowrap',
    }}>
      <Star size={s.iconSize} fill="#78350f" />
      {balance ?? 0}
    </span>
  );
}
