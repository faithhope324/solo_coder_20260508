import { useRef, useMemo } from 'react';
import { Mesh, SphereGeometry, MeshStandardMaterial, Color } from 'three';
import type { Planet as PlanetType } from '../../../shared/types';

interface PlanetProps {
  planet: PlanetType;
  position: [number, number, number];
  isSelected: boolean;
  onClick: () => void;
}

export function Planet({ planet, position, isSelected, onClick }: PlanetProps) {
  const meshRef = useRef<Mesh>(null);
  
  const color = useMemo(() => new Color(planet.color), [planet.color]);

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <sphereGeometry args={[planet.radius, 32, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={isSelected ? 0.5 : 0.2}
        roughness={0.3}
        metalness={0.1}
      />
      {isSelected && (
        <mesh>
          <sphereGeometry args={[planet.radius * 1.5, 32, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.1}
            side={2}
          />
        </mesh>
      )}
    </mesh>
  );
}
