export default function MapPath({ x1, y1, x2, y2, status, animated }) {
  const isComplete = status === 'completed';
  const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={isComplete ? 'var(--field-green)' : 'var(--pencil)'}
        strokeWidth={isComplete ? 2.5 : 1.5}
        strokeDasharray={isComplete ? 'none' : '8 6'}
        opacity={isComplete ? 0.6 : 0.3}
        strokeLinecap="round"
      />
      {animated && isComplete && (
        <line x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="var(--field-green)" strokeWidth={3}
          strokeDasharray={length} strokeDashoffset={length}
          strokeLinecap="round" opacity={0.8}>
          <animate attributeName="stroke-dashoffset" from={length} to={0}
            dur="1.5s" fill="freeze" />
        </line>
      )}
    </g>
  );
}