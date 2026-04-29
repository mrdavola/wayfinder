// Tiny 360° preview used by QuestBuilder once Marble has finished generating.
// Lives in its own module so the ~200KB Three.js + drei dependency only loads
// when a guide actually reaches the rare "world ready" state.

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import PanoramaSphere from './PanoramaSphere';

export default function MiniPanoramaPreview({ panoUrl }) {
  return (
    <Canvas camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 0, 0.1] }}>
      <PanoramaSphere imageUrl={panoUrl} />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        rotateSpeed={-0.3}
        autoRotate
        autoRotateSpeed={0.5}
      />
      <ambientLight intensity={0.5} />
    </Canvas>
  );
}
