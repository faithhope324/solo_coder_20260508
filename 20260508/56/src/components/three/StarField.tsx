import { useRef, useMemo } from 'react';
import { Points, PointMaterial, BufferGeometry, Float32BufferAttribute } from 'three';

export function StarField() {
  const starsRef = useRef<Points>(null);
  
  const [positions, colors] = useMemo(() => {
    const positions = [];
    const colors = [];
    const numStars = 5000;
    const radius = 100;

    for (let i = 0; i < numStars; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * Math.cbrt(Math.random());

      positions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );

      const brightness = 0.5 + Math.random() * 0.5;
      colors.push(brightness, brightness, brightness);
    }

    return [
      new Float32Array(positions),
      new Float32Array(colors),
    ];
  }, []);

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
}
