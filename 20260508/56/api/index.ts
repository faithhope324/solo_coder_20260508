import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { SimulationService } from './services/SimulationService';
import { presetScenes } from './data/presets';
import { calculateEnergies, calculateCenterOfMass } from './physics/energyCalculator';
import type { SimulationConfig, TimeStepData } from '../shared/types';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

app.use(cors());
app.use(express.json());

const PORT = 3001;

interface ActiveSimulation {
  service: SimulationService;
  isRunning: boolean;
  speed: number;
  intervalId?: NodeJS.Timeout;
}

app.get('/api/presets', (req, res) => {
  res.json(presetScenes);
});

app.post('/api/simulate', (req, res) => {
  const config: SimulationConfig = req.body;
  const simulationId = Math.random().toString(36).substring(7);
  res.json({ simulationId });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  let simulation: ActiveSimulation | null = null;

  const runStep = () => {
    if (!simulation || !simulation.isRunning) return;

    try {
      const stepsToRun = Math.max(1, Math.round(simulation.speed));
      let data: TimeStepData | null = null;
      
      for (let i = 0; i < stepsToRun; i++) {
        data = simulation.service.step();
      }
      
      if (data) {
        socket.emit('step', data);
      }
    } catch (error) {
      console.error('Simulation error:', error);
      socket.emit('error', { message: '模拟计算出错' });
    }
  };

  const computeInitialState = (config: SimulationConfig): TimeStepData => {
    const n = config.planets.length;
    const positions = new Float32Array(n * 3);
    const velocities = new Float32Array(n * 3);
    const masses = new Float32Array(n);

    config.planets.forEach((planet, i) => {
      positions[i * 3] = planet.position[0];
      positions[i * 3 + 1] = planet.position[1];
      positions[i * 3 + 2] = planet.position[2];
      velocities[i * 3] = planet.velocity[0];
      velocities[i * 3 + 1] = planet.velocity[1];
      velocities[i * 3 + 2] = planet.velocity[2];
      masses[i] = planet.mass;
    });

    const energies = calculateEnergies(positions, velocities, masses, config.gravitationalConstant, config.softening);
    const centerOfMass = calculateCenterOfMass(positions, masses);

    return {
      time: 0,
      positions: config.planets.map(p => [...p.position] as [number, number, number]),
      velocities: config.planets.map(p => [...p.velocity] as [number, number, number]),
      centerOfMass,
      totalEnergy: energies.total,
      kineticEnergy: energies.kinetic,
      potentialEnergy: energies.potential,
    };
  };

  socket.on('start', (data: { config: SimulationConfig }) => {
    console.log('Starting simulation for client:', socket.id);

    if (simulation) {
      simulation.service.destroy();
      if (simulation.intervalId) {
        clearInterval(simulation.intervalId);
      }
    }

    const service = new SimulationService(data.config);
    simulation = {
      service,
      isRunning: true,
      speed: 1,
    };

    const initialData = computeInitialState(data.config);
    socket.emit('step', initialData);

    simulation.intervalId = setInterval(runStep, 16);
  });

  socket.on('pause', () => {
    if (simulation) {
      simulation.isRunning = false;
      if (simulation.intervalId) {
        clearInterval(simulation.intervalId);
        simulation.intervalId = undefined;
      }
    }
  });

  socket.on('resume', () => {
    if (simulation) {
      simulation.isRunning = true;
      simulation.intervalId = setInterval(runStep, 16);
    }
  });

  socket.on('reset', () => {
    if (simulation) {
      simulation.service.reset();
      simulation.isRunning = false;
      if (simulation.intervalId) {
        clearInterval(simulation.intervalId);
        simulation.intervalId = undefined;
      }
    }
  });

  socket.on('setSpeed', (data: { speed: number }) => {
    if (simulation) {
      simulation.speed = Math.max(0.25, Math.min(100, data.speed));
    }
  });

  socket.on('stepOnce', () => {
    if (simulation) {
      runStep();
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (simulation) {
      simulation.service.destroy();
      if (simulation.intervalId) {
        clearInterval(simulation.intervalId);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
