import { parentPort } from 'worker_threads';
import { calculateForces } from '../physics/forceCalculator';
import type { WorkerTask, WorkerResult } from '../../shared/types';

parentPort?.on('message', (task: WorkerTask) => {
  if (task.type === 'calculateForces') {
    const forces = calculateForces(
      task.positions,
      task.masses,
      task.G,
      task.softening,
      task.startIndex,
      task.endIndex
    );

    const result: WorkerResult = {
      type: 'forcesResult',
      forces,
      startIndex: task.startIndex,
      endIndex: task.endIndex,
    };

    parentPort?.postMessage(result);
  }
});
