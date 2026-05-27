import { Router, Request, Response } from 'express';
import type {
  SimulationParams,
  SimulationResult,
  SensitivityRequest,
  SensitivityResult,
} from '../../shared/types';
import { runSimulation, generateParameterMatrix } from '../simulation/simulationEngine';

const router = Router();

router.post('/simulation', (req: Request, res: Response) => {
  try {
    const params = req.body as SimulationParams;

    if (!params.warehouses || params.warehouses.length === 0) {
      return res.status(400).json({ error: '至少需要配置一个仓库' });
    }

    if (!params.simulationDays || params.simulationDays < 1) {
      return res.status(400).json({ error: '模拟天数必须大于0' });
    }

    const result: SimulationResult = runSimulation(params);
    res.json(result);
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({ error: '模拟执行失败', details: (error as Error).message });
  }
});

router.post('/sensitivity', (req: Request, res: Response) => {
  try {
    const request = req.body as SensitivityRequest;

    if (!request.baseParams || !request.parameters) {
      return res.status(400).json({ error: '请求参数不完整' });
    }

    if (request.parameters.length === 0) {
      return res.status(400).json({ error: '至少需要配置一个敏感性分析参数' });
    }

    const scenarios = generateParameterMatrix(
      request.baseParams,
      request.parameters
    );

    const results: SensitivityResult = {
      scenarios: [],
    };

    for (const scenario of scenarios) {
      const result = runSimulation(scenario.params);
      results.scenarios.push({
        params: scenario.paramValues,
        result,
      });
    }

    res.json(results);
  } catch (error) {
    console.error('Sensitivity analysis error:', error);
    res.status(500).json({
      error: '敏感性分析执行失败',
      details: (error as Error).message,
    });
  }
});

router.get('/default-params', (_req: Request, res: Response) => {
  const defaultParams: SimulationParams = {
    warehouses: [
      {
        id: 'wh1',
        name: '华东仓库',
        initialInventory: 500,
        safetyStock: 150,
        reorderPoint: 300,
        reorderQuantity: 400,
        holdingCostRate: 0.5,
        orderCost: 200,
        stockoutCost: 50,
        leadTime: 3,
      },
      {
        id: 'wh2',
        name: '华南仓库',
        initialInventory: 400,
        safetyStock: 120,
        reorderPoint: 250,
        reorderQuantity: 350,
        holdingCostRate: 0.45,
        orderCost: 180,
        stockoutCost: 45,
        leadTime: 4,
      },
      {
        id: 'wh3',
        name: '华北仓库',
        initialInventory: 450,
        safetyStock: 130,
        reorderPoint: 280,
        reorderQuantity: 380,
        holdingCostRate: 0.48,
        orderCost: 190,
        stockoutCost: 48,
        leadTime: 3,
      },
    ],
    routes: [
      {
        id: 'route1',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        transitTime: 2,
        unitCost: 2.5,
        capacity: 200,
      },
      {
        id: 'route2',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh3',
        transitTime: 3,
        unitCost: 3.0,
        capacity: 250,
      },
      {
        id: 'route3',
        fromWarehouseId: 'wh2',
        toWarehouseId: 'wh3',
        transitTime: 2,
        unitCost: 2.0,
        capacity: 180,
      },
    ],
    demandModel: 'seasonal',
    simulationDays: 90,
    baseDemand: 80,
    demandVariability: 0.3,
  };

  res.json(defaultParams);
});

export default router;
