export function calculateEnergies(
  positions: Float32Array,
  velocities: Float32Array,
  masses: Float32Array,
  G: number,
  softening: number
): { kinetic: number; potential: number; total: number } {
  const n = masses.length;
  let kinetic = 0;
  let potential = 0;

  for (let i = 0; i < n; i++) {
    const vx = velocities[i * 3];
    const vy = velocities[i * 3 + 1];
    const vz = velocities[i * 3 + 2];
    kinetic += 0.5 * masses[i] * (vx * vx + vy * vy + vz * vz);
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = positions[j * 3] - positions[i * 3];
      const dy = positions[j * 3 + 1] - positions[i * 3 + 1];
      const dz = positions[j * 3 + 2] - positions[i * 3 + 2];

      const distSq = dx * dx + dy * dy + dz * dz;
      const dist = Math.sqrt(distSq + softening * softening);

      potential -= (G * masses[i] * masses[j]) / dist;
    }
  }

  return {
    kinetic,
    potential,
    total: kinetic + potential,
  };
}

export function calculateCenterOfMass(
  positions: Float32Array,
  masses: Float32Array
): [number, number, number] {
  const n = masses.length;
  let totalMass = 0;
  let comX = 0;
  let comY = 0;
  let comZ = 0;

  for (let i = 0; i < n; i++) {
    totalMass += masses[i];
    comX += positions[i * 3] * masses[i];
    comY += positions[i * 3 + 1] * masses[i];
    comZ += positions[i * 3 + 2] * masses[i];
  }

  return [comX / totalMass, comY / totalMass, comZ / totalMass];
}
