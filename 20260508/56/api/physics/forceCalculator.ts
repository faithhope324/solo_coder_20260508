export function calculateForces(
  positions: Float32Array,
  masses: Float32Array,
  G: number,
  softening: number,
  startIndex: number = 0,
  endIndex?: number
): Float32Array {
  const n = masses.length;
  const actualEnd = endIndex ?? n;
  const forces = new Float32Array((actualEnd - startIndex) * 3);

  for (let i = startIndex; i < actualEnd; i++) {
    let fx = 0;
    let fy = 0;
    let fz = 0;

    const ix = i * 3;
    const iy = ix + 1;
    const iz = ix + 2;

    for (let j = 0; j < n; j++) {
      if (i === j) continue;

      const jx = j * 3;
      const jy = jx + 1;
      const jz = jx + 2;

      const dx = positions[jx] - positions[ix];
      const dy = positions[jy] - positions[iy];
      const dz = positions[jz] - positions[iz];

      const distSq = dx * dx + dy * dy + dz * dz;
      const dist = Math.sqrt(distSq + softening * softening);
      const distCubed = dist * dist * dist;

      const forceMagnitude = (G * masses[i] * masses[j]) / distCubed;

      fx += forceMagnitude * dx;
      fy += forceMagnitude * dy;
      fz += forceMagnitude * dz;
    }

    const idx = (i - startIndex) * 3;
    forces[idx] = fx;
    forces[idx + 1] = fy;
    forces[idx + 2] = fz;
  }

  return forces;
}

export function calculateAllForces(
  positions: Float32Array,
  masses: Float32Array,
  G: number,
  softening: number
): Float32Array {
  return calculateForces(positions, masses, G, softening, 0, masses.length);
}
