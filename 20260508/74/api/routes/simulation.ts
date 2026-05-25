import express from 'express';
import { solveSimulation, generateReport, healthCheck } from '../controllers/simulationController.js';

const router = express.Router();

router.post('/solve', solveSimulation);
router.post('/report', generateReport);
router.get('/health', healthCheck);

export default router;
