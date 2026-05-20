import { useRef } from 'react';
import { Mesh, SphereGeometry, MeshBasicMaterial } from 'three';

interface CenterOfMassProps {
  position: [number, number, number];
}

export function CenterOfMass({ position }: CenterOfMassProps) {
  const meshRef = useRef<Mesh>(null);

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#4caf50" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial
          color="#4caf50"
          transparent
          opacity={0.2}
          side={2}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.25, 64]} />
        <meshBasicMaterial
          color="#4caf50"
          transparent
          opacity={0.5}
          side={2}
        />
      </mesh>
    </group>
  );
}
