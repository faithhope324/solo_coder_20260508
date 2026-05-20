import { calculateAllForces } from '../physics/forceCalculator';

function calculateAccelerations(
  positions: Float32Array,
  masses: Float32Array,
  G: number,
  softening: number
): Float32Array {
  const forces = calculateAllForces(positions, masses, G, softening);
  const accels = new Float32Array(forces.length);
  for (let i = 0; i < forces.length; i++) {
    accels[i] = forces[i] / masses[Math.floor(i / 3)];
  }
  return accels;
}

function calculateJerks(
  positions: Float32Array,
  velocities: Float32Array,
  masses: Float32Array,
  G: number,
  softening: number
): Float32Array {
  const n = masses.length;
  const jerks = new Float32Array(n * 3);

  for (let i = 0; i < n; i++) {
    let jx = 0;
    let jy = 0;
    let jz = 0;

    const ix = i * 3;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;

      const jxIdx = j * 3;

      const dx = positions[jxIdx] - positions[ix];
      const dy = positions[jxIdx + 1] - positions[ix + 1];
      const dz = positions[jxIdx + 2] - positions[ix + 2];

      const dvx = velocities[jxIdx] - velocities[ix];
      const dvy = velocities[jxIdx + 1] - velocities[ix + 1];
      const dvz = velocities[jxIdx + 2] - velocities[ix + 2];

      const distSq = dx * dx + dy * dy + dz * dz;
      const dist = Math.sqrt(distSq + softening * softening);
      const dist5 = Math.pow(dist, 5);

      const dotProduct = dx * dvx + dy * dvy + dz * dvz;

      const factor = (G * masses[j]) / dist5;
      const term1 = factor * (distSq + softening * softening);
      const term2 = 3 * factor * dotProduct;

      jx += term1 * dvx - term2 * dx;
      jy += term1 * dvy - term2 * dy;
      jz += term1 * dvz - term2 * dz;
    }

    jerks[ix] = jx;
    jerks[ix + 1] = jy;
    jerks[ix + 2] = jz;
  }

  return jerks;
}

export function hermiteStep(
  positions: Float32Array,
  velocities: Float32Array,
  masses: Float32Array,
  dt: number,
  G: number,
  softening: number
): { positions: Float32Array; velocities: Float32Array } {
  const n = masses.length;

  const a0 = calculateAccelerations(positions, masses, G, softening);
  const j0 = calculateJerks(positions, velocities, masses, G, softening);

  const newPositions = new Float32Array(positions);
  const newVelocities = new Float32Array(velocities);

  for (let i = 0; i < n * 3; i++) {
    newPositions[i] += velocities[i] * dt + 0.5 * a0[i] * dt * dt + (1 / 6) * j0[i] * dt * dt * dt;
    newVelocities[i] += a0[i] * dt + 0.5 * j0[i] * dt * dt;
  }

  const a1 = calculateAccelerations(newPositions, masses, G, softening);
  const j1 = calculateJerks(newPositions, newVelocities, masses, G, softening);

  for (let i = 0; i < n * 3; i++) {
    const a2 = (-3 * a0[i] + 3 * a1[i] - 2 * j0[i] * dt - j1[i] * dt) / (dt * dt);
    const a3 = (2 * a0[i] - 2 * a1[i] + j0[i] * dt + j1[i] * dt) / (dt * dt * dt);

    newPositions[i] = positions[i] + velocities[i] * dt + 0.5 * a0[i] * dt * dt + (1 / 6) * j0[i] * dt * dt * dt + (1 / 24) * a2 * dt * dt * dt * dt + (1 / 120) * a3 * dt * dt * dt * dt * dt;
    newVelocities[i] = velocities[i] + a0[i] * dt + 0.5 * j0[i] * dt * dt + (1 / 6) * a2 * dt * dt * dt + (1 / 24) * a3 * dt * dt * dt * dt;
  }

  return { positions: newPositions, velocities: newVelocities };
}
