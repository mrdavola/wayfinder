/**
 * WayfinderLogoIcon — compass rose mark for Wayfinder
 * Two concentric rings + cardinal ticks + 4-pointed concave star with hollow center
 */
export default function WayfinderLogoIcon({ size = 32, color = 'currentColor', style, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Wayfinder"
      style={{ color, flexShrink: 0, ...style }}
      {...props}
    >
      <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="5" />
      <circle cx="50" cy="50" r="37" stroke="currentColor" strokeWidth="2" />
      <line x1="50" y1="5"  x2="50" y2="13" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="87" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="50" y1="87" x2="50" y2="95" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="5"  y1="50" x2="13" y2="50" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <path
        d="M 50 18 C 54 36, 64 46, 82 50 C 64 54, 54 64, 50 82 C 46 64, 36 54, 18 50 C 36 46, 46 36, 50 18 Z M 50 44 A 6 6 0 0 1 50 56 A 6 6 0 0 1 50 44 Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}
