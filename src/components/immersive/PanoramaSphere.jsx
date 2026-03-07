import { useLoader } from '@react-three/fiber';
import { TextureLoader, BackSide } from 'three';

export default function PanoramaSphere({ imageUrl }) {
  const texture = useLoader(TextureLoader, imageUrl);

  return (
    <mesh>
      <sphereGeometry args={[500, 64, 32]} />
      <meshBasicMaterial map={texture} side={BackSide} />
    </mesh>
  );
}
