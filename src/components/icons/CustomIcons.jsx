/**
 * CustomIcons.jsx
 * Custom SVG icons not available in Lucide.
 * All icons: 20x20 viewBox, strokeWidth 1.5, stroke-based unless noted.
 */

export function MoleculeIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Center node */}
      <circle cx="10" cy="10" r="2.2" />
      {/* Top-left node */}
      <circle cx="4" cy="5" r="1.8" />
      {/* Top-right node */}
      <circle cx="16" cy="5" r="1.8" />
      {/* Bottom node */}
      <circle cx="10" cy="17" r="1.8" />
      {/* Bond: center to top-left */}
      <line x1="8.2" y1="8.6" x2="5.6" y2="6.6" />
      {/* Bond: center to top-right */}
      <line x1="11.8" y1="8.6" x2="14.4" y2="6.6" />
      {/* Bond: center to bottom */}
      <line x1="10" y1="12.2" x2="10" y2="15.2" />
    </svg>
  );
}

export function DnaHelixIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Left strand — sinusoidal curve going top-left to bottom-right */}
      <path d="M5 2 C7 5, 13 7, 15 10 C13 13, 7 15, 5 18" />
      {/* Right strand — opposite phase */}
      <path d="M15 2 C13 5, 7 7, 5 10 C7 13, 13 15, 15 18" />
      {/* Rungs (base pairs) at crossing points */}
      <line x1="7.2" y1="6.1"  x2="12.8" y2="6.1"  />
      <line x1="9.6" y1="9.8"  x2="10.4" y2="9.8"  />
      <line x1="7.2" y1="13.9" x2="12.8" y2="13.9" />
    </svg>
  );
}

export function StethoscopeIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Left earpiece tube going down */}
      <line x1="5" y1="2" x2="5" y2="6" />
      {/* Right earpiece tube going down */}
      <line x1="15" y1="2" x2="15" y2="6" />
      {/* Curved yoke connecting both tubes at bottom */}
      <path d="M5 6 Q5 9, 10 9 Q15 9, 15 6" />
      {/* Single tube running down from yoke center */}
      <line x1="10" y1="9" x2="10" y2="14" />
      {/* Curve to chest piece */}
      <path d="M10 14 Q10 17, 13 17" />
      {/* Chest piece circle */}
      <circle cx="13" cy="17" r="1.6" />
      {/* Earpiece dots */}
      <circle cx="5"  cy="2" r="0.8" fill={color} stroke="none" />
      <circle cx="15" cy="2" r="0.8" fill={color} stroke="none" />
    </svg>
  );
}

export function VoiceWaveIcon({ size = 20, color = 'currentColor' }) {
  // 5 vertical bars of relative heights: 1, 3, 5, 4, 2
  // Centered vertically in the 20x20 viewbox
  const barWidth = 2;
  const gap = 1.5;
  const maxHeight = 14;
  const heights = [4, 8, 14, 11, 6]; // scaled from [1,3,5,4,2]
  const totalWidth = 5 * barWidth + 4 * gap; // 16.5
  const startX = (20 - totalWidth) / 2;
  const centerY = 10;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {heights.map((h, i) => {
        const x = startX + i * (barWidth + gap) + barWidth / 2;
        const y1 = centerY - h / 2;
        const y2 = centerY + h / 2;
        return <line key={i} x1={x} y1={y1} x2={x} y2={y2} />;
      })}
    </svg>
  );
}

export function BrainCircuitIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Brain blob — rounded organic shape centered in the icon */}
      <path d="
        M10 4
        C12 4, 15 5, 15.5 7.5
        C16 9.5, 15 11, 14 12
        C13 13, 12 14, 10 14
        C8 14, 7 13, 6 12
        C5 11, 4 9.5, 4.5 7.5
        C5 5, 8 4, 10 4
        Z
      " />
      {/* Circuit line: right side going out and bending down */}
      <polyline points="15,9 18,9 18,13" />
      {/* Endpoint dot — right */}
      <circle cx="18" cy="13" r="1" fill={color} stroke="none" />
      {/* Circuit line: bottom going straight down */}
      <line x1="10" y1="14" x2="10" y2="18" />
      {/* Endpoint dot — bottom */}
      <circle cx="10" cy="18" r="1" fill={color} stroke="none" />
      {/* Circuit line: left side going out */}
      <polyline points="5,9 2,9 2,13" />
      {/* Endpoint dot — left */}
      <circle cx="2" cy="13" r="1" fill={color} stroke="none" />
    </svg>
  );
}
