import { useRef, useState, useCallback, Component } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import './TactilePropViewer.css';
import PropMesh from './PropMesh';
import { TACTILE_PROPS } from '../../lib/tactileProps';

// ─── Fallback SVG icons (shown when WebGL unavailable or on error) ───────────

const FALLBACK_SVGS = {
  lantern: (
    <svg viewBox="0 0 80 110" width="80" height="110" aria-hidden="true">
      <rect x="22" y="28" width="36" height="52" rx="6" fill="#c49030" opacity="0.9"/>
      <ellipse cx="40" cy="52" rx="14" ry="20" fill="#fff0a0" opacity="0.85"/>
      <polygon points="22,28 40,8 58,28" fill="#7a5018"/>
      <rect x="36" y="2" width="8" height="8" rx="2" fill="#5a3a10"/>
      <rect x="22" y="78" width="36" height="8" rx="3" fill="#7a5018"/>
    </svg>
  ),
  journal: (
    <svg viewBox="0 0 100 75" width="100" height="75" aria-hidden="true">
      <rect x="8" y="8" width="84" height="60" rx="3" fill="#5e2f10"/>
      <rect x="12" y="12" width="76" height="52" rx="2" fill="#f3ecd8"/>
      <rect x="8" y="8" width="12" height="60" rx="3" fill="#3e1a08"/>
      <line x1="24" y1="24" x2="80" y2="24" stroke="#c0a880" strokeWidth="1.5" opacity="0.6"/>
      <line x1="24" y1="34" x2="80" y2="34" stroke="#c0a880" strokeWidth="1.5" opacity="0.6"/>
      <line x1="24" y1="44" x2="80" y2="44" stroke="#c0a880" strokeWidth="1.5" opacity="0.6"/>
      <path d="M72,8 Q88,8 88,20 L88,56 Q88,68 72,68" fill="none" stroke="#7a3e18" strokeWidth="2.5"/>
    </svg>
  ),
  specimenJar: (
    <svg viewBox="0 0 70 100" width="70" height="100" aria-hidden="true">
      <rect x="16" y="18" width="38" height="62" rx="8" fill="#c4d8e0" opacity="0.7"/>
      <rect x="14" y="10" width="42" height="12" rx="4" fill="#7a6840"/>
      <rect x="22" y="42" width="26" height="18" rx="2" fill="#f0e6cc" opacity="0.9"/>
      <ellipse cx="35" cy="64" rx="10" ry="10" fill="#7a9a52" opacity="0.8"/>
    </svg>
  ),
  mailbox: (
    <svg viewBox="0 0 90 110" width="90" height="110" aria-hidden="true">
      <rect x="42" y="55" width="6" height="48" rx="2" fill="#6e4a22"/>
      <rect x="18" y="24" width="54" height="36" rx="4" fill="#a83a22"/>
      <ellipse cx="45" cy="24" rx="27" ry="10" fill="#a83a22"/>
      <rect x="22" y="38" width="24" height="6" rx="2" fill="#f0e8d8" opacity="0.7"/>
      <rect x="65" y="30" width="6" height="22" rx="2" fill="#c03010" transform="rotate(-15 68 41)"/>
    </svg>
  ),
  tent: (
    <svg viewBox="0 0 100 80" width="100" height="80" aria-hidden="true">
      <polygon points="50,5 90,68 10,68" fill="#c0885a"/>
      <rect x="10" y="66" width="80" height="8" rx="3" fill="#9a6838"/>
      <polygon points="50,30 62,68 38,68" fill="#7a4820" opacity="0.85"/>
      <circle cx="10" cy="70" r="4" fill="#5a3a18"/>
      <circle cx="90" cy="70" r="4" fill="#5a3a18"/>
      <circle cx="50" cy="74" r="4" fill="#5a3a18"/>
    </svg>
  ),
};

// ─── CSS 3D Fallback (keyboard-accessible) ───────────────────────────────────

export function TactilePropFallback({ propId }) {
  const [rotY, setRotY] = useState(0);
  const [rotX, setRotX] = useState(0);
  const prop = TACTILE_PROPS[propId] ?? { label: propId, ariaDescription: propId };

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); setRotY(r => r - 25); }
    if (e.key === 'ArrowRight') { e.preventDefault(); setRotY(r => r + 25); }
    if (e.key === 'ArrowUp')    { e.preventDefault(); setRotX(r => r - 15); }
    if (e.key === 'ArrowDown')  { e.preventDefault(); setRotX(r => r + 15); }
  }, []);

  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width  - 0.5) * 30;
    const ny = ((e.clientY - rect.top)  / rect.height - 0.5) * -20;
    setRotY(nx);
    setRotX(ny);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setRotY(0);
    setRotX(0);
  }, []);

  return (
    <div
      className="tactile-prop-fallback"
      tabIndex={0}
      role="img"
      aria-label={prop.ariaDescription}
      onKeyDown={handleKeyDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      data-prop={propId}
      data-fallback="true"
    >
      <div
        className="tactile-prop-fallback__svg"
        style={{ transform: `rotateY(${rotY}deg) rotateX(${rotX}deg)` }}
      >
        {FALLBACK_SVGS[propId] ?? null}
      </div>
      <p className="tactile-prop-fallback__hint" aria-hidden="true">
        ← → to rotate
      </p>
    </div>
  );
}

// ─── R3F rotating group ───────────────────────────────────────────────────────

function RotatingProp({ propId, rotY, isDragging }) {
  const groupRef = useRef();

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (!isDragging.current) {
      rotY.current += delta * 0.45;   // gentle idle spin
    }
    groupRef.current.rotation.y = rotY.current;
  });

  return (
    <group ref={groupRef}>
      <PropMesh propId={propId} />
    </group>
  );
}

// ─── Error boundary for WebGL failure ────────────────────────────────────────

class PropErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <TactilePropFallback propId={this.props.propId} />;
    return this.props.children;
  }
}

// ─── Main viewer ─────────────────────────────────────────────────────────────

/**
 * Renders a small interactive R3F Canvas showing the prop for the given propId.
 * Drag to rotate. Keyboard: ← → spins. Falls back to CSS 3D if WebGL fails.
 *
 * @param {{ propId: string }} props
 */
export default function TactilePropViewer({ propId }) {
  const rotY = useRef(0);
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const prop = TACTILE_PROPS[propId];
  if (!prop) return null;

  const handlePointerDown = useCallback((e) => {
    isDragging.current = true;
    lastX.current = e.clientX;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging.current) return;
    rotY.current += (e.clientX - lastX.current) * 0.012;
    lastX.current = e.clientX;
  }, []);

  const handlePointerUp = useCallback((e) => {
    isDragging.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); rotY.current -= 0.4; }
    if (e.key === 'ArrowRight') { e.preventDefault(); rotY.current += 0.4; }
  }, []);

  return (
    <PropErrorBoundary propId={propId}>
      <div
        className="tactile-prop-viewer"
        data-prop={propId}
        data-testid="tactile-prop-viewer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="img"
        aria-label={prop.ariaDescription}
      >
        <Canvas
          camera={{ position: [0, 0.5, 3], fov: 40 }}
          frameloop="always"
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.65} />
          <directionalLight position={[2, 4, 3]} intensity={1.1} />
          <RotatingProp propId={propId} rotY={rotY} isDragging={isDragging} />
        </Canvas>
        <p className="tactile-prop-viewer__hint" aria-hidden="true">
          Drag · ← → to rotate
        </p>
      </div>
    </PropErrorBoundary>
  );
}
