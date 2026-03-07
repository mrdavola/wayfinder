import { useLoader } from '@react-three/fiber';
import { TextureLoader, BackSide, RepeatWrapping, SRGBColorSpace } from 'three';

export default function PanoramaSphere({ imageUrl }) {
  const texture = useLoader(TextureLoader, imageUrl);

  // Flip horizontally so text reads correctly on the inside of the sphere
  texture.wrapS = RepeatWrapping;
  texture.repeat.x = -1;
  // Better color reproduction
  texture.colorSpace = SRGBColorSpace;

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[500, 64, 32]} />
      <meshBasicMaterial map={texture} side={BackSide} />
    </mesh>
  );
}
