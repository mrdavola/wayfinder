// R3F prop geometries — one component per tactile prop.
// No tests here: these are purely visual; browser + unit acceptance covers them.
// Replace with useGLTF(path) when real GLB assets are commissioned.

function LanternMesh() {
  return (
    <group>
      {/* body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.32, 0.27, 0.62, 8]} />
        <meshStandardMaterial color="#c49030" metalness={0.35} roughness={0.55} />
      </mesh>
      {/* inner glow */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.24, 0.2, 0.58, 8]} />
        <meshStandardMaterial color="#fff0a0" emissive="#ffcc44" emissiveIntensity={0.9} transparent opacity={0.75} />
      </mesh>
      {/* top cap */}
      <mesh position={[0, 0.38, 0]}>
        <coneGeometry args={[0.32, 0.2, 8]} />
        <meshStandardMaterial color="#7a5018" metalness={0.45} roughness={0.5} />
      </mesh>
      {/* hook */}
      <mesh position={[0, 0.52, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.1, 6]} />
        <meshStandardMaterial color="#5a3a10" metalness={0.7} />
      </mesh>
      {/* base */}
      <mesh position={[0, -0.36, 0]}>
        <cylinderGeometry args={[0.3, 0.27, 0.07, 8]} />
        <meshStandardMaterial color="#7a5018" metalness={0.45} roughness={0.5} />
      </mesh>
    </group>
  );
}

function JournalMesh() {
  return (
    <group rotation={[-0.12, 0.18, 0.04]}>
      {/* back cover */}
      <mesh position={[0, -0.065, 0]}>
        <boxGeometry args={[1.0, 0.11, 0.74]} />
        <meshStandardMaterial color="#5e2f10" roughness={0.85} />
      </mesh>
      {/* pages block */}
      <mesh position={[0.04, 0.03, 0]}>
        <boxGeometry args={[0.93, 0.08, 0.7]} />
        <meshStandardMaterial color="#f3ecd8" roughness={0.92} />
      </mesh>
      {/* front cover */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[1.0, 0.04, 0.74]} />
        <meshStandardMaterial color="#5e2f10" roughness={0.85} />
      </mesh>
      {/* spine */}
      <mesh position={[-0.46, 0.02, 0]}>
        <boxGeometry args={[0.09, 0.15, 0.74]} />
        <meshStandardMaterial color="#3e1a08" roughness={0.8} />
      </mesh>
      {/* strap */}
      <mesh position={[0.18, 0.12, 0]}>
        <boxGeometry args={[0.62, 0.022, 0.055]} />
        <meshStandardMaterial color="#7a3e18" roughness={0.65} />
      </mesh>
    </group>
  );
}

function SpecimenJarMesh() {
  return (
    <group>
      {/* jar body — slightly transparent glass */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.36, 0.3, 0.88, 16]} />
        <meshStandardMaterial color="#c4d8e0" transparent opacity={0.52} roughness={0.08} metalness={0.08} />
      </mesh>
      {/* lid */}
      <mesh position={[0, 0.48, 0]}>
        <cylinderGeometry args={[0.38, 0.38, 0.1, 16]} />
        <meshStandardMaterial color="#7a6840" roughness={0.5} />
      </mesh>
      {/* lid ring edge */}
      <mesh position={[0, 0.42, 0]}>
        <torusGeometry args={[0.37, 0.022, 6, 16]} />
        <meshStandardMaterial color="#5a4e28" metalness={0.55} roughness={0.38} />
      </mesh>
      {/* paper label */}
      <mesh position={[0, 0, 0.35]} rotation={[0, 0, 0]}>
        <planeGeometry args={[0.48, 0.3]} />
        <meshStandardMaterial color="#f0e6cc" roughness={0.92} />
      </mesh>
      {/* specimen inside */}
      <mesh position={[0, -0.12, 0]}>
        <sphereGeometry args={[0.17, 8, 8]} />
        <meshStandardMaterial color="#7a9a52" roughness={0.72} />
      </mesh>
    </group>
  );
}

function MailboxMesh() {
  return (
    <group>
      {/* post */}
      <mesh position={[0, -0.52, 0]}>
        <cylinderGeometry args={[0.048, 0.06, 0.72, 8]} />
        <meshStandardMaterial color="#6e4a22" roughness={0.82} />
      </mesh>
      {/* box body */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[0.64, 0.38, 0.44]} />
        <meshStandardMaterial color="#a83a22" roughness={0.62} />
      </mesh>
      {/* curved top — half-cylinder */}
      <mesh position={[0, 0.27, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.19, 0.19, 0.64, 8, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#a83a22" roughness={0.62} />
      </mesh>
      {/* mail slot */}
      <mesh position={[0, 0.04, 0.225]}>
        <boxGeometry args={[0.28, 0.055, 0.01]} />
        <meshStandardMaterial color="#7a1808" />
      </mesh>
      {/* flag arm */}
      <mesh position={[0.34, 0.18, 0]} rotation={[0, 0, -0.18]}>
        <boxGeometry args={[0.055, 0.26, 0.018]} />
        <meshStandardMaterial color="#c03010" roughness={0.6} />
      </mesh>
    </group>
  );
}

function TentMesh() {
  return (
    <group>
      {/* main tent cone */}
      <mesh position={[0, 0.24, 0]}>
        <coneGeometry args={[0.68, 0.66, 4]} />
        <meshStandardMaterial color="#c0885a" roughness={0.82} />
      </mesh>
      {/* ground cloth */}
      <mesh position={[0, -0.08, 0]}>
        <cylinderGeometry args={[0.66, 0.66, 0.06, 4]} />
        <meshStandardMaterial color="#9a6838" roughness={0.9} />
      </mesh>
      {/* door */}
      <mesh position={[0, 0.08, 0.65]}>
        <planeGeometry args={[0.36, 0.48]} />
        <meshStandardMaterial color="#7a4820" roughness={0.85} />
      </mesh>
      {/* centre pole */}
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.62, 4]} />
        <meshStandardMaterial color="#5a3a18" metalness={0.28} />
      </mesh>
      {/* guy-rope pegs × 4 */}
      {[0, 1, 2, 3].map(i => (
        <mesh
          key={i}
          position={[
            Math.cos((i * Math.PI) / 2) * 0.74,
            -0.1,
            Math.sin((i * Math.PI) / 2) * 0.74,
          ]}
        >
          <cylinderGeometry args={[0.022, 0.018, 0.11, 4]} />
          <meshStandardMaterial color="#7a5830" />
        </mesh>
      ))}
    </group>
  );
}

const MESHES = { lantern: LanternMesh, journal: JournalMesh, specimenJar: SpecimenJarMesh, mailbox: MailboxMesh, tent: TentMesh };

/**
 * Renders the 3D geometry for one of the five tactile props.
 * Must be used inside an R3F <Canvas>.
 * @param {{ propId: string }} props
 */
export default function PropMesh({ propId }) {
  const Mesh = MESHES[propId];
  if (!Mesh) return null;
  return <Mesh />;
}
