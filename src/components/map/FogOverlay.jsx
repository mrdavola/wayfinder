export default function FogOverlay({ cx, cy, radius, clearing }) {
  const gradId = `fog-${Math.round(cx)}-${Math.round(cy)}`;
  return (
    <g>
      <defs>
        <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--parchment)" stopOpacity={clearing ? 0 : 0.85} />
          <stop offset="70%" stopColor="var(--parchment)" stopOpacity={clearing ? 0 : 0.6} />
          <stop offset="100%" stopColor="var(--parchment)" stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={radius}
        fill={`url(#${gradId})`}
        style={{ transition: 'opacity 1.5s ease', opacity: clearing ? 0 : 1 }}
        pointerEvents="none"
      />
    </g>
  );
}