import { ATOM_TYPES, type SimulationConfig, type FrameData } from '../../shared/types.js';

const DEFAULT_CONFIG: SimulationConfig = {
  systemName: '水分子盒子',
  atomCount: 128,
  boxSize: [15.0, 15.0, 15.0],
  temperature: 300.0,
  timestep: 0.001,
  totalFrames: 500,
  atomTypes: [1, 4],
  writeInterval: 5,
};

export class LAMMPSSimulator {
  private config: SimulationConfig;
  private positions: Float32Array;
  private velocities: Float32Array;
  private atomTypeIds: Int32Array;
  private currentFrame: number = 0;
  private kB: number = 1.380649e-23;

  constructor(config: Partial<SimulationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.positions = new Float32Array(this.config.atomCount * 3);
    this.velocities = new Float32Array(this.config.atomCount * 3);
    this.atomTypeIds = new Int32Array(this.config.atomCount);
    this.initializeSystem();
  }

  private initializeSystem(): void {
    const { atomCount, boxSize, temperature, atomTypes } = this.config;
    const atomsPerType = Math.floor(atomCount / atomTypes.length);

    for (let i = 0; i < atomCount; i++) {
      const typeIndex = Math.min(Math.floor(i / atomsPerType), atomTypes.length - 1);
      this.atomTypeIds[i] = atomTypes[typeIndex];

      this.positions[i * 3] = (Math.random() - 0.5) * boxSize[0] * 0.9;
      this.positions[i * 3 + 1] = (Math.random() - 0.5) * boxSize[1] * 0.9;
      this.positions[i * 3 + 2] = (Math.random() - 0.5) * boxSize[2] * 0.9;

      const type = this.getAtomTypeById(atomTypes[typeIndex]);
      const mass = type ? type.mass : 1.0;
      const sigma = Math.sqrt(temperature / mass);

      this.velocities[i * 3] = this.gaussianRandom() * sigma;
      this.velocities[i * 3 + 1] = this.gaussianRandom() * sigma;
      this.velocities[i * 3 + 2] = this.gaussianRandom() * sigma;
    }

    this.removeCenterOfMassMotion();
  }

  private getAtomTypeById(id: number): typeof ATOM_TYPES[string] | null {
    return Object.values(ATOM_TYPES).find((t) => t.id === id) || null;
  }

  private gaussianRandom(): number {
    let u = 0,
      v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  private removeCenterOfMassMotion(): void {
    let totalMass = 0;
    const comVel = [0, 0, 0];

    for (let i = 0; i < this.config.atomCount; i++) {
      const type = this.getAtomTypeById(this.atomTypeIds[i]);
      const mass = type ? type.mass : 1.0;
      totalMass += mass;
      comVel[0] += this.velocities[i * 3] * mass;
      comVel[1] += this.velocities[i * 3 + 1] * mass;
      comVel[2] += this.velocities[i * 3 + 2] * mass;
    }

    for (let d = 0; d < 3; d++) {
      comVel[d] /= totalMass;
    }

    for (let i = 0; i < this.config.atomCount; i++) {
      this.velocities[i * 3] -= comVel[0];
      this.velocities[i * 3 + 1] -= comVel[1];
      this.velocities[i * 3 + 2] -= comVel[2];
    }
  }

  private calculateForces(): Float32Array {
    const { atomCount, boxSize } = this.config;
    const forces = new Float32Array(atomCount * 3);
    const epsilon = 1.0;
    const sigma = 1.0;
    const cutoff = 2.5 * sigma;
    const cutoffSq = cutoff * cutoff;

    for (let i = 0; i < atomCount; i++) {
      for (let j = i + 1; j < atomCount; j++) {
        let dx = this.positions[i * 3] - this.positions[j * 3];
        let dy = this.positions[i * 3 + 1] - this.positions[j * 3 + 1];
        let dz = this.positions[i * 3 + 2] - this.positions[j * 3 + 2];

        dx -= boxSize[0] * Math.round(dx / boxSize[0]);
        dy -= boxSize[1] * Math.round(dy / boxSize[1]);
        dz -= boxSize[2] * Math.round(dz / boxSize[2]);

        const rSq = dx * dx + dy * dy + dz * dz;

        if (rSq < cutoffSq && rSq > 0.01) {
          const r2inv = 1.0 / rSq;
          const r6inv = r2inv * r2inv * r2inv;
          const r12inv = r6inv * r6inv;

          const factor = 48 * epsilon * (r12inv - 0.5 * r6inv) * r2inv;

          const fx = factor * dx;
          const fy = factor * dy;
          const fz = factor * dz;

          forces[i * 3] += fx;
          forces[i * 3 + 1] += fy;
          forces[i * 3 + 2] += fz;
          forces[j * 3] -= fx;
          forces[j * 3 + 1] -= fy;
          forces[j * 3 + 2] -= fz;
        }
      }
    }

    return forces;
  }

  private calculatePotentialEnergy(): number {
    const { atomCount, boxSize } = this.config;
    let potentialEnergy = 0;
    const epsilon = 1.0;
    const sigma = 1.0;
    const cutoff = 2.5 * sigma;
    const cutoffSq = cutoff * cutoff;

    for (let i = 0; i < atomCount; i++) {
      for (let j = i + 1; j < atomCount; j++) {
        let dx = this.positions[i * 3] - this.positions[j * 3];
        let dy = this.positions[i * 3 + 1] - this.positions[j * 3 + 1];
        let dz = this.positions[i * 3 + 2] - this.positions[j * 3 + 2];

        dx -= boxSize[0] * Math.round(dx / boxSize[0]);
        dy -= boxSize[1] * Math.round(dy / boxSize[1]);
        dz -= boxSize[2] * Math.round(dz / boxSize[2]);

        const rSq = dx * dx + dy * dy + dz * dz;

        if (rSq < cutoffSq && rSq > 0.01) {
          const r2inv = 1.0 / rSq;
          const r6inv = r2inv * r2inv * r2inv;
          const r12inv = r6inv * r6inv;

          potentialEnergy += 4 * epsilon * (r12inv - r6inv);
        }
      }
    }

    return potentialEnergy;
  }

  private calculateKineticEnergyAndTemperature(): { kineticEnergy: number; temperature: number } {
    const { atomCount } = this.config;
    let kineticEnergy = 0;

    for (let i = 0; i < atomCount; i++) {
      const type = this.getAtomTypeById(this.atomTypeIds[i]);
      const mass = type ? type.mass : 1.0;
      const vx = this.velocities[i * 3];
      const vy = this.velocities[i * 3 + 1];
      const vz = this.velocities[i * 3 + 2];
      kineticEnergy += 0.5 * mass * (vx * vx + vy * vy + vz * vz);
    }

    const degreesOfFreedom = 3 * atomCount - 3;
    const temperature = (2 * kineticEnergy) / (degreesOfFreedom * this.kB) * 1e-4;

    return { kineticEnergy, temperature };
  }

  private applyPeriodicBoundaryConditions(): void {
    const { boxSize } = this.config;

    for (let i = 0; i < this.config.atomCount; i++) {
      for (let d = 0; d < 3; d++) {
        const idx = i * 3 + d;
        while (this.positions[idx] > boxSize[d] / 2) this.positions[idx] -= boxSize[d];
        while (this.positions[idx] < -boxSize[d] / 2) this.positions[idx] += boxSize[d];
      }
    }
  }

  public step(): void {
    const { timestep } = this.config;
    const forces = this.calculateForces();

    for (let i = 0; i < this.config.atomCount; i++) {
      const type = this.getAtomTypeById(this.atomTypeIds[i]);
      const mass = type ? type.mass : 1.0;
      const dtOverMass = timestep / mass;
      const halfDt2OverMass = 0.5 * timestep * timestep / mass;

      for (let d = 0; d < 3; d++) {
        const idx = i * 3 + d;
        this.positions[idx] += this.velocities[idx] * timestep + halfDt2OverMass * forces[idx];
        this.velocities[idx] += 0.5 * dtOverMass * forces[idx];
      }
    }

    this.applyPeriodicBoundaryConditions();

    const newForces = this.calculateForces();

    for (let i = 0; i < this.config.atomCount; i++) {
      const type = this.getAtomTypeById(this.atomTypeIds[i]);
      const mass = type ? type.mass : 1.0;
      const halfDtOverMass = 0.5 * timestep / mass;

      for (let d = 0; d < 3; d++) {
        const idx = i * 3 + d;
        this.velocities[idx] += halfDtOverMass * newForces[idx];
      }
    }

    this.currentFrame++;
  }

  public getFrameData(): FrameData {
    const { kineticEnergy, temperature } = this.calculateKineticEnergyAndTemperature();
    const potentialEnergy = this.calculatePotentialEnergy();

    return {
      frame: this.currentFrame,
      time: this.currentFrame * this.config.timestep,
      temperature,
      potentialEnergy,
      kineticEnergy,
      positions: new Float32Array(this.positions),
      velocities: new Float32Array(this.velocities),
    };
  }

  public generateAllFrames(): FrameData[] {
    const frames: FrameData[] = [];
    const { totalFrames, writeInterval } = this.config;

    for (let i = 0; i < totalFrames; i++) {
      this.step();
      if (i % writeInterval === 0) {
        frames.push(this.getFrameData());
      }
    }

    return frames;
  }

  public getConfig(): SimulationConfig {
    return { ...this.config };
  }

  public getAtomTypeIds(): Int32Array {
    return new Int32Array(this.atomTypeIds);
  }

  public reset(): void {
    this.currentFrame = 0;
    this.initializeSystem();
  }

  public seekToFrame(frame: number): void {
    if (frame < this.currentFrame) {
      this.reset();
    }
    while (this.currentFrame < frame) {
      this.step();
    }
  }
}

export default LAMMPSSimulator;
