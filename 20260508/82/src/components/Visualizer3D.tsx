import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Stars } from '@react-three/drei';
import * as THREE from 'three';
import useTrajectoryStore from '@/store/useTrajectoryStore';

interface AtomsProps {
  positions: Float32Array;
  atomTypes: Array<{ id: number; name: string; color: string; radius: number }>;
  boxSize: [number, number, number];
}

function Atoms({ positions, atomTypes, boxSize }: AtomsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const atomCount = positions.length / 3;

  const typeAssignments = useMemo(() => {
    const assignments: number[] = [];
    const typesPerAtom = Math.floor(atomCount / atomTypes.length);
    for (let i = 0; i < atomCount; i++) {
      const typeIdx = Math.min(Math.floor(i / typesPerAtom), atomTypes.length - 1);
      assignments.push(typeIdx);
    }
    return assignments;
  }, [atomCount, atomTypes.length]);

  useFrame(() => {
    if (!meshRef.current) return;

    for (let i = 0; i < atomCount; i++) {
      const idx = i * 3;
      const typeIdx = typeAssignments[i];
      const atomType = atomTypes[typeIdx];
      const scale = atomType.radius * 0.8;

      tempObject.position.set(
        positions[idx],
        positions[idx + 1],
        positions[idx + 2]
      );
      tempObject.scale.setScalar(scale);
      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);

      const color = new THREE.Color(atomType.color);
      meshRef.current.setColorAt(i, color);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, atomCount]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial metalness={0.3} roughness={0.4} emissiveIntensity={0.1} />
    </instancedMesh>
  );
}

function BoxBoundary({ boxSize }: { boxSize: [number, number, number] }) {
  const edgesRef = useRef<THREE.LineSegments>(null);

  const points = useMemo(() => {
    const [x, y, z] = boxSize;
    const hx = x / 2;
    const hy = y / 2;
    const hz = z / 2;

    const vertices = new Float32Array([
      -hx, -hy, -hz, hx, -hy, -hz,
      hx, -hy, -hz, hx, hy, -hz,
      hx, hy, -hz, -hx, hy, -hz,
      -hx, hy, -hz, -hx, -hy, -hz,
      -hx, -hy, hz, hx, -hy, hz,
      hx, -hy, hz, hx, hy, hz,
      hx, hy, hz, -hx, hy, hz,
      -hx, hy, hz, -hx, -hy, hz,
      -hx, -hy, -hz, -hx, -hy, hz,
      hx, -hy, -hz, hx, -hy, hz,
      hx, hy, -hz, hx, hy, hz,
      -hx, hy, -hz, -hx, hy, hz,
    ]);
    return vertices;
  }, [boxSize]);

  return (
    <lineSegments ref={edgesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length / 3}
          array={points}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#64ffda" transparent opacity={0.3} />
    </lineSegments>
  );
}

function SceneContent() {
  const { positions, meta } = useTrajectoryStore();

  if (!meta || !positions) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#64ffda" wireframe />
      </mesh>
    );
  }

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 10]} intensity={1} castShadow />
      <directionalLight position={[-10, -5, -10]} intensity={0.5} />
      <pointLight position={[0, 0, 0]} intensity={0.5} color="#64ffda" />

      <Atoms
        positions={positions}
        atomTypes={meta.atomTypes}
        boxSize={meta.boxSize}
      />

      <BoxBoundary boxSize={meta.boxSize} />

      <Grid
        args={[meta.boxSize[0] * 1.5, Math.floor(meta.boxSize[0] * 1.5)]}
        position={[0, -meta.boxSize[1] / 2 - 0.5, 0]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1a3a5c"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#64ffda"
        fadeDistance={50}
        fadeStrength={1}
        followCamera={false}
      />

      <axesHelper args={[meta.boxSize[0] * 0.8]} />

      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
    </>
  );
}

export function Visualizer3D() {
  const { meta } = useTrajectoryStore();
  const cameraPosition: [number, number, number] = meta 
    ? [meta.boxSize[0], meta.boxSize[1], meta.boxSize[2]] 
    : [15, 15, 15];

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: cameraPosition, fov: 60, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#0a192f']} />
        <fog attach="fog" args={['#0a192f', 30, 100]} />
        
        <SceneContent />
        
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={5}
          maxDistance={100}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
        />
      </Canvas>
    </div>
  );
}

export default Visualizer3D;
