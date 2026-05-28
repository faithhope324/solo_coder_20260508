import { Router, type Request, type Response } from 'express';
import {
  getGridData,
  getWindData,
  getPointData,
  getTimesteps,
  type PressureLevel,
} from '../model/weatherModel.js';

const router = Router();

const VALID_VARIABLES = ['temperature', 'humidity', 'wind_speed'] as const;
const VALID_LEVELS = [1000, 850, 500, 250] as const;

function parseLevel(val: string | undefined): PressureLevel {
  const n = parseInt(val || '1000', 10);
  if ((VALID_LEVELS as readonly number[]).includes(n)) return n as PressureLevel;
  return 1000;
}

function parseStep(val: string | undefined): number {
  const n = parseInt(val || '0', 10);
  return Math.max(0, Math.min(72, n));
}

router.get('/grid', (req: Request, res: Response) => {
  const variable = req.query.variable as string;
  if (!VALID_VARIABLES.includes(variable as any)) {
    res.status(400).json({ error: 'Invalid variable. Use: temperature, humidity, wind_speed' });
    return;
  }
  const level = parseLevel(req.query.level as string);
  const step = parseStep(req.query.step as string);

  try {
    const data = getGridData(variable as any, level, step);
    res.json(data);
  } catch (err: any) {
    console.error('Grid data error:', err.message || err);
    res.status(500).json({ error: 'Failed to compute grid data', detail: err.message });
  }
});

router.get('/wind', (req: Request, res: Response) => {
  const level = parseLevel(req.query.level as string);
  const step = parseStep(req.query.step as string);

  try {
    const data = getWindData(level, step);
    res.json(data);
  } catch (err: any) {
    console.error('Wind data error:', err.message || err);
    res.status(500).json({ error: 'Failed to compute wind data', detail: err.message });
  }
});

router.get('/point', (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lon = parseFloat(req.query.lon as string);

  if (isNaN(lat) || isNaN(lon)) {
    res.status(400).json({ error: 'Invalid lat/lon parameters' });
    return;
  }

  const level = parseLevel(req.query.level as string);
  const step = parseStep(req.query.step as string);

  try {
    const data = getPointData(lat, lon, level, step);
    res.json(data);
  } catch (err: any) {
    console.error('Point data error:', err.message || err);
    res.status(500).json({ error: 'Failed to compute point data', detail: err.message });
  }
});

router.get('/timesteps', (_req: Request, res: Response) => {
  res.json(getTimesteps());
});

export default router;
