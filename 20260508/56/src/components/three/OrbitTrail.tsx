import { useMemo } from 'react';
import { BufferGeometry, LineBasicMaterial, Color, Float32BufferAttribute } from 'three';

interface OrbitTrailProps {
  points: [number, number, number][];
  color: string;
}

export function OrbitTrail({ points, color }: OrbitTrailProps) {
  if (points.length < 2) return null;

  const geometry = useMemo(() => {
    const positions = new Float32Array(points.length * 3);
    points.forEach((p, i) => {
      positions[i * 3] = p[0];
      positions[i * 3 + 1] = p[1];
      positions[i * 3 + 2] = p[2];
    });

    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    return geo;
  }, [points]);

  return (
    <line geometry={geometry}>
      <lineBasicMaterial
        color={new Color(color)}
        transparent
        opacity={0.4}
      />
    </line>
  );
}
