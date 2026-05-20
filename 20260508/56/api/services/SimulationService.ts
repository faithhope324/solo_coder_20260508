import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import path from 'path';
import { rk4Step } from '../integrators/rk4';
import { hermiteStep } from '../integrators/hermite';
import { calculateEnergies, calculateCenterOfMass } from '../physics/energyCalculator';
import type { SimulationConfig, TimeStepData } from '../../shared/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SimulationService {
  private positions: Float32Array;
  private velocities: Float32Array;
  private masses: Float32Array;
  private config: SimulationConfig;
  private time: number = 0;
  private workers: Worker[] = [];
  private useParallel: boolean;

  constructor(config: SimulationConfig) {
    this.config = config;
    const n = config.planets.length;

    this.positions = new Float32Array(n * 3);
    this.velocities = new Float32Array(n * 3);
    this.masses = new Float32Array(n);

    config.planets.forEach((planet, i) => {
      this.positions[i * 3] = planet.position[0];
      this.positions[i * 3 + 1] = planet.position[1];
      this.positions[i * 3 + 2] = planet.position[2];
      this.velocities[i * 3] = planet.velocity[0];
      this.velocities[i * 3 + 1] = planet.velocity[1];
      this.velocities[i * 3 + 2] = planet.velocity[2];
      this.masses[i] = planet.mass;
    });

    this.useParallel = n >= 4;
    if (this.useParallel) {
      this.initWorkers();
    }
  }

  private initWorkers(): void {
    const numWorkers = Math.min(4, this.masses.length);
    const workerFile = process.env.NODE_ENV === 'production' 
      ? '../workers/forceWorker.js' 
      : '../workers/forceWorker.ts';
    for (let i = 0; i < numWorkers; i++) {
      const worker = new Worker(new URL(workerFile, import.meta.url));
      this.workers.push(worker);
    }
  }

  public step(): TimeStepData {
    const dt = this.config.timeStep;
    const G = this.config.gravitationalConstant;
    const softening = this.config.softening;

    let result;
    if (this.config.integrator === 'rk4') {
      result = rk4Step(this.positions, this.velocities, this.masses, dt, G, softening);
    } else {
      result = hermiteStep(this.positions, this.velocities, this.masses, dt, G, softening);
    }

    this.positions = result.positions;
    this.velocities = result.velocities;
    this.time += dt;

    const energies = calculateEnergies(this.positions, this.velocities, this.masses, G, softening);
    const centerOfMass = calculateCenterOfMass(this.positions, this.masses);

    const positions: [number, number, number][] = [];
    const velocities: [number, number, number][] = [];
    const n = this.masses.length;

    for (let i = 0; i < n; i++) {
      positions.push([
        this.positions[i * 3],
        this.positions[i * 3 + 1],
        this.positions[i * 3 + 2],
      ]);
      velocities.push([
        this.velocities[i * 3],
        this.velocities[i * 3 + 1],
        this.velocities[i * 3 + 2],
      ]);
    }

    return {
      time: this.time,
      positions,
      velocities,
      centerOfMass,
      totalEnergy: energies.total,
      kineticEnergy: energies.kinetic,
      potentialEnergy: energies.potential,
    };
  }

  public reset(): void {
    this.time = 0;
    this.config.planets.forEach((planet, i) => {
      this.positions[i * 3] = planet.position[0];
      this.positions[i * 3 + 1] = planet.position[1];
      this.positions[i * 3 + 2] = planet.position[2];
      this.velocities[i * 3] = planet.velocity[0];
      this.velocities[i * 3 + 1] = planet.velocity[1];
      this.velocities[i * 3 + 2] = planet.velocity[2];
    });
  }

  public destroy(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
  }

  public getTime(): number {
    return this.time;
  }
}
