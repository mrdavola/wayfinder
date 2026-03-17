import { useEffect, useState } from 'react';

function getBarColor(percentage) {
  if (percentage >= 70) return 'var(--field-green)';
  if (percentage >= 30) return 'var(--compass-gold)';
  return 'var(--specimen-red)';
}

export default function ProgressBar({ label, percentage, subtitle, onClick, color }) {
  const [animatedWidth, setAnimatedWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedWidth(percentage), 50);
    return () => clearTimeout(timer);
  }, [percentage]);

  const barColor = color || getBarColor(percentage);

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 0',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{
        width: 140,
        fontFamily: 'var(--font-body)',
        fontSize: 14,
        color: 'var(--ink)',
        fontWeight: 500,
        flexShrink: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{
          height: 6,
          borderRadius: 3,
          background: 'var(--parchment)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${animatedWidth}%`,
            borderRadius: 3,
            background: barColor,
            transition: 'width 0.6s ease-out',
          }} />
        </div>
        {subtitle && (
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            color: 'var(--graphite)',
          }}>
            {subtitle}
          </div>
        )}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 13,
        color: 'var(--graphite)',
        width: 40,
        textAlign: 'right',
        flexShrink: 0,
      }}>
        {Math.round(percentage)}%
      </div>
    </div>
  );
}
