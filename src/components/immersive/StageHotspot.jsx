import { useMemo, useState } from 'react';
import { Billboard, Html } from '@react-three/drei';
import { Vector3 } from 'three';

function yawPitchToPosition(yaw, pitch, radius = 100) {
  const yawRad = (yaw * Math.PI) / 180;
  const pitchRad = (pitch * Math.PI) / 180;
  return new Vector3(
    -radius * Math.cos(pitchRad) * Math.sin(yawRad),
    radius * Math.sin(pitchRad),
    -radius * Math.cos(pitchRad) * Math.cos(yawRad)
  );
}

const STATUS_COLORS = {
  active: '#D4A017',
  completed: '#2D8B4E',
  locked: '#A0A0A0',
};

const ICON_MAP = {
  search: '\u{1F50D}',
  wrench: '\u{1F527}',
  flask: '\u{1F9EA}',
  mic: '\u{1F3A4}',
  book: '\u{1F4D6}',
  star: '\u2B50',
  zap: '\u26A1',
  target: '\u{1F3AF}',
  compass: '\u{1F9ED}',
  lightbulb: '\u{1F4A1}',
};

export default function StageHotspot({ hotspot, stage, onClick }) {
  const [hovered, setHovered] = useState(false);
  const position = useMemo(
    () => yawPitchToPosition(hotspot.position.yaw, hotspot.position.pitch),
    [hotspot.position.yaw, hotspot.position.pitch]
  );

  const status = stage?.status || 'locked';
  const color = STATUS_COLORS[status] || STATUS_COLORS.locked;
  const isLocked = status === 'locked';
  const icon = ICON_MAP[hotspot.icon] || ICON_MAP.compass;

  return (
    <Billboard position={position}>
      <Html center zIndexRange={[100, 0]} style={{ pointerEvents: 'auto' }}>
        <div
          onClick={isLocked ? undefined : onClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            cursor: isLocked ? 'default' : 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            opacity: isLocked ? 0.4 : 1,
            transition: 'transform 200ms, opacity 200ms',
            transform: hovered && !isLocked ? 'scale(1.15)' : 'scale(1)',
          }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: color, border: '3px solid white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
            boxShadow: status === 'active'
              ? `0 0 20px ${color}, 0 0 40px ${color}40`
              : '0 4px 12px rgba(0,0,0,0.3)',
          }}>
            {status === 'completed' ? '\u2713' : icon}
          </div>
          <div style={{
            background: 'rgba(0,0,0,0.7)', color: 'white',
            padding: '3px 10px', borderRadius: 6,
            fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-body)',
            whiteSpace: 'nowrap', maxWidth: 140,
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {hotspot.label}
          </div>
        </div>
      </Html>
    </Billboard>
  );
}
