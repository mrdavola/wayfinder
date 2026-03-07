import { Compass } from 'lucide-react';

export default function ExplorerToken({ cx, cy, emoji, name }) {
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <circle cx={0} cy={0} r={16} fill="var(--compass-gold)" opacity={0.15} />
      <circle cx={0} cy={0} r={13} fill="var(--compass-gold)" stroke="var(--ink)" strokeWidth={1.5} />
      <foreignObject x={-9} y={-9} width={18} height={18}>
        {emoji ? (
          <span style={{ fontSize: 14, lineHeight: '18px', display: 'block', textAlign: 'center' }}>{emoji}</span>
        ) : (
          <Compass size={18} color="var(--ink)" />
        )}
      </foreignObject>
      {name && (
        <text x={0} y={22} textAnchor="middle"
          fontFamily="var(--font-mono)" fontSize={8}
          fill="var(--compass-gold)" fontWeight={600}>
          {name.split(' ')[0]}
        </text>
      )}
    </g>
  );
}