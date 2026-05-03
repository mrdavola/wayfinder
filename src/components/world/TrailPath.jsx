/**
 * Renders a dashed, hand-drawn path connecting stage waypoints.
 * Each waypoint is anchored at the BASE of its cairn (translate -50%/-100% in CSS),
 * so the trail visually walks along the ground rather than floating mid-cairn.
 *
 * @param {object} props
 * @param {{x: string, y: string, state: string}[]} props.waypoints
 * @param {'outdoor'|'indoor'} [props.style='outdoor']
 * @param {number} [props.yOffsetPct=0]   shift entire path down by this many percentage points
 */
export default function TrailPath({ waypoints, style = 'outdoor', yOffsetPct = 0 }) {
  if (!waypoints || waypoints.length < 2) return null;

  const pts = waypoints.map(w => ({
    x: parseFloat(w.x),
    y: parseFloat(w.y) + yOffsetPct,
    state: w.state,
  }));

  // Smooth curve through points via simple quadratics, arcing slightly upward between points
  let pathData = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cx = (prev.x + curr.x) / 2;
    const cy = Math.min(prev.y, curr.y) - 2;
    pathData += ` Q ${cx} ${cy}, ${curr.x} ${curr.y}`;
  }

  const stroke = style === 'indoor' ? '#7a684a' : '#c4a870';

  return (
    <svg
      className="trail-path"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <path
        d={pathData}
        stroke="rgba(40, 28, 14, 0.18)"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        transform="translate(0, 0.4)"
      />
      <path
        d={pathData}
        stroke={stroke}
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="3 3"
        opacity="0.75"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
