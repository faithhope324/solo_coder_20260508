import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { StarField } from './StarField';
import { Planet } from './Planet';
import { OrbitTrail } from './OrbitTrail';
import { CenterOfMass } from './CenterOfMass';
import { useSimulationStore } from '../../store/useSimulationStore';

export function SimulationScene() {
  const {
    planets,
    currentStepData,
    trajectoryHistory,
    showCenterOfMass,
    showOrbits,
    selectedPlanetId,
    setSelectedPlanetId,
  } = useSimulationStore();

  const positions = useMemo(() => {
    if (currentStepData) {
      return currentStepData.positions;
    }
    return planets.map(p => p.position);
  }, [currentStepData, planets]);

  const orbitTrails = useMemo(() => {
    if (!showOrbits || trajectoryHistory.length < 2) return [];
    
    return planets.map((planet, planetIndex) => {
      const trail: [number, number, number][] = [];
      for (let i = 0; i < trajectoryHistory.length; i++) {
        if (trajectoryHistory[i][planetIndex]) {
          trail.push(trajectoryHistory[i][planetIndex]);
        }
      }
      return {
        planetId: planet.id,
        color: planet.color,
        points: trail,
      };
    });
  }, [trajectoryHistory, planets, showOrbits]);

  return (
    <Canvas
      camera={{ position: [0, 10, 15], fov: 60 }}
      gl={{ antialias: true, alpha: false }}
      onPointerMissed={() => setSelectedPlanetId(null)}
    >
      <color attach="background" args={['#050810']} />
      <fog attach="fog" args={['#050810', 30, 100]} />
      
      <ambientLight intensity={0.1} />
      <pointLight position={[0, 0, 0]} intensity={2} distance={50} />
      
      <StarField />
      
      {planets.map((planet, index) => (
        <Planet
          key={planet.id}
          planet={planet}
          position={(positions[index] || planet.position) as [number, number, number]}
          isSelected={selectedPlanetId === planet.id}
          onClick={() => setSelectedPlanetId(planet.id)}
        />
      ))}
      
      {orbitTrails.map((trail) => (
        <OrbitTrail
          key={trail.planetId}
          points={trail.points}
          color={trail.color}
        />
      ))}
      
      {showCenterOfMass && currentStepData && (
        <CenterOfMass position={currentStepData.centerOfMass} />
      )}
      
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={100}
      />
      
      <EffectComposer>
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
