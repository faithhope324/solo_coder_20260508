import type { DemandModelType } from '../../shared/types';

export function generateDailyDemand(
  model: DemandModelType,
  baseDemand: number,
  variability: number,
  day: number,
  totalDays: number
): number {
  const randomFactor = 1 + (Math.random() - 0.5) * 2 * variability;

  switch (model) {
    case 'constant':
      return Math.max(0, Math.round(baseDemand * randomFactor));

    case 'trend': {
      const trend = (day / totalDays) * 0.5 + 0.75;
      return Math.max(0, Math.round(baseDemand * trend * randomFactor));
    }

    case 'seasonal': {
      const seasonality = Math.sin((day / totalDays) * Math.PI * 4) * 0.3 + 1;
      return Math.max(0, Math.round(baseDemand * seasonality * randomFactor));
    }

    case 'random': {
      const randomWalk = 0.5 + Math.random();
      return Math.max(0, Math.round(baseDemand * randomWalk * randomFactor));
    }

    default:
      return Math.max(0, Math.round(baseDemand * randomFactor));
  }
}
