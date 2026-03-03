/**
 * ProgressBar.jsx
 * A thin (3px) horizontal progress bar.
 *
 * Props:
 *   value  {number}  Current progress value (required)
 *   max    {number}  Maximum value (default: 100)
 *   color  {string}  Fill color (default: var(--field-green))
 */

export default function ProgressBar({ value, max = 100, color = 'var(--field-green)' }) {
  const clamped = Math.min(Math.max(value ?? 0, 0), max);
  const pct = max > 0 ? (clamped / max) * 100 : 0;

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={`${Math.round(pct)}% complete`}
      style={{
        width: '100%',
        height: '3px',
        background: 'var(--pencil)',
        borderRadius: '100px',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          borderRadius: '100px',
          transition: 'width 300ms ease',
        }}
      />
    </div>
  );
}
