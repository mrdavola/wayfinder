import { useState, useEffect } from 'react';
import { OrbitControls } from '@react-three/drei';

export default function CameraController({ isMobile }) {
  // On mobile with gyro permission granted, we'd use DeviceOrientationControls
  // For now, use OrbitControls everywhere with touch-drag on mobile
  // DeviceOrientationControls from drei may not be available in latest version
  // so we use OrbitControls as universal fallback with appropriate settings

  return (
    <OrbitControls
      enableZoom={false}
      enablePan={false}
      rotateSpeed={isMobile ? -0.5 : -0.3}
      dampingFactor={0.1}
      enableDamping
      target={[0, 0, 0]}
    />
  );
}

// Separate HTML component for gyro permission prompt (rendered outside Canvas)
export function GyroPermissionButton({ onGranted }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const handleRequest = async () => {
    try {
      const perm = await DeviceOrientationEvent.requestPermission();
      if (perm === 'granted') {
        onGranted();
        setVisible(false);
      }
    } catch (err) {
      console.error('Gyro permission denied:', err);
    }
  };

  return (
    <button
      onClick={handleRequest}
      style={{
        position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
        zIndex: 200, padding: '12px 24px', borderRadius: 12,
        background: 'var(--compass-gold)', color: 'var(--ink)',
        border: 'none', fontSize: 14, fontWeight: 700,
        fontFamily: 'var(--font-body)', cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}
    >
      Enable Look Around
    </button>
  );
}
