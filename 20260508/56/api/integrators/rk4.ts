import { calculateAllForces } from '../physics/forceCalculator';

export function rk4Step(
  positions: Float32Array,
  velocities: Float32Array,
  masses: Float32Array,
  dt: number,
  G: number,
  softening: number
): { positions: Float32Array; velocities: Float32Array } {
  const n = masses.length;
  const newPositions = new Float32Array(positions);
  const newVelocities = new Float32Array(velocities);

  const k1v = calculateAllForces(positions, masses, G, softening);
  const k1x = new Float32Array(velocities);

  for (let i = 0; i < n * 3; i++) {
    k1v[i] /= masses[Math.floor(i / 3)];
  }

  const pos2 = new Float32Array(positions);
  const vel2 = new Float32Array(velocities);
  for (let i = 0; i < n * 3; i++) {
    pos2[i] += k1x[i] * dt * 0.5;
    vel2[i] += k1v[i] * dt * 0.5;
  }

  const k2v = calculateAllForces(pos2, masses, G, softening);
  const k2x = new Float32Array(vel2);
  for (let i = 0; i < n * 3; i++) {
    k2v[i] /= masses[Math.floor(i / 3)];
  }

  const pos3 = new Float32Array(positions);
  const vel3 = new Float32Array(velocities);
  for (let i = 0; i < n * 3; i++) {
    pos3[i] += k2x[i] * dt * 0.5;
    vel3[i] += k2v[i] * dt * 0.5;
  }

  const k3v = calculateAllForces(pos3, masses, G, softening);
  const k3x = new Float32Array(vel3);
  for (let i = 0; i < n * 3; i++) {
    k3v[i] /= masses[Math.floor(i / 3)];
  }

  const pos4 = new Float32Array(positions);
  const vel4 = new Float32Array(velocities);
  for (let i = 0; i < n * 3; i++) {
    pos4[i] += k3x[i] * dt;
    vel4[i] += k3v[i] * dt;
  }

  const k4v = calculateAllForces(pos4, masses, G, softening);
  const k4x = new Float32Array(vel4);
  for (let i = 0; i < n * 3; i++) {
    k4v[i] /= masses[Math.floor(i / 3)];
  }

  for (let i = 0; i < n * 3; i++) {
    newPositions[i] += (dt / 6) * (k1x[i] + 2 * k2x[i] + 2 * k3x[i] + k4x[i]);
    newVelocities[i] += (dt / 6) * (k1v[i] + 2 * k2v[i] + 2 * k3v[i] + k4v[i]);
  }

  return { positions: newPositions, velocities: newVelocities };
}
