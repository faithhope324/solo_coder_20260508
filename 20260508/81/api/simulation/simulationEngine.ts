import type {
  SimulationParams,
  SimulationResult,
  InventoryState,
  DailySnapshot,
  DailyCostData,
  DailyKPIData,
} from '../../shared/types';
import {
  createInitialInventoryState,
  processDemand,
  checkAndPlaceOrder,
  processArrivingOrders,
  calculateHoldingCost,
  recordDailyInventory,
} from './warehouseModule';
import { generateDailyDemand } from './demandModule';
import { initiateTransfer } from './transportModule';
import { calculateOverallMetrics, calculateDailyMetrics } from './costModule';

export function runSimulation(params: SimulationParams): SimulationResult {
  const { warehouses, routes, demandModel, simulationDays, baseDemand, demandVariability } =
    params;

  const inventoryStates = new Map<string, InventoryState>();
  const warehouseConfigs = new Map<string, typeof warehouses[0]>();

  for (const warehouse of warehouses) {
    inventoryStates.set(warehouse.id, createInitialInventoryState(warehouse));
    warehouseConfigs.set(warehouse.id, warehouse);
  }

  const snapshots: DailySnapshot[] = [];
  let totalTransportCost = 0;
  const dailyTransportCosts: number[] = new Array(simulationDays + 1).fill(0);
  const dailyCosts: DailyCostData[] = [];
  const dailyKPIs: DailyKPIData[] = [];

  for (let day = 1; day <= simulationDays; day++) {
    const snapshot: DailySnapshot = {
      day,
      inventoryLevels: {},
      demand: {},
      stockouts: [],
      ordersPlaced: [],
    };

    for (const warehouse of warehouses) {
      const state = inventoryStates.get(warehouse.id)!;
      processArrivingOrders(state, day);
    }

    for (const warehouse of warehouses) {
      const state = inventoryStates.get(warehouse.id)!;
      const demand = generateDailyDemand(
        demandModel,
        baseDemand,
        demandVariability,
        day,
        simulationDays
      );
      snapshot.demand[warehouse.id] = demand;

      const { stockoutQuantity } = processDemand(state, demand, warehouse);

      if (stockoutQuantity > 0) {
        snapshot.stockouts.push(warehouse.id);

        for (const route of routes) {
          if (route.toWarehouseId === warehouse.id) {
            const fromState = inventoryStates.get(route.fromWarehouseId)!;
            const toState = state;
            const transferQuantity = Math.min(stockoutQuantity, fromState.currentLevel);

            if (transferQuantity > 0) {
              const result = initiateTransfer(
                routes,
                fromState,
                toState,
                transferQuantity,
                day
              );
              if (result.success) {
                totalTransportCost += result.transportCost;
                dailyTransportCosts[day] += result.transportCost;
              }
            }
          }
        }
      }

      const orderResult = checkAndPlaceOrder(state, warehouse, day);
      if (orderResult) {
        snapshot.ordersPlaced.push(`${warehouse.id}-order-${day}`);
      }

      calculateHoldingCost(state, warehouse);
      snapshot.inventoryLevels[warehouse.id] = state.currentLevel;
    }

    snapshots.push(snapshot);

    for (const state of inventoryStates.values()) {
      recordDailyInventory(state);
    }

    const dailyMetrics = calculateDailyMetrics(
      inventoryStates,
      warehouseConfigs,
      day,
      dailyTransportCosts.slice(0, day + 1).reduce((a, b) => a + b, 0)
    );
    dailyCosts.push(dailyMetrics.costs);
    dailyKPIs.push(dailyMetrics.kpis);
  }

  const result = calculateOverallMetrics(
    inventoryStates,
    warehouseConfigs,
    simulationDays,
    totalTransportCost
  );

  return {
    ...result,
    dailyCosts,
    dailyKPIs,
  };
}

export function generateParameterMatrix(
  baseParams: SimulationParams,
  parameters: Array<{
    warehouseId: string;
    paramName: 'safetyStock' | 'reorderPoint';
    minValue: number;
    maxValue: number;
    step: number;
  }>
): Array<{ params: SimulationParams; paramValues: Record<string, number> }> {
  const valueSets: Array<{
    warehouseId: string;
    paramName: 'safetyStock' | 'reorderPoint';
    values: number[];
  }> = [];

  for (const p of parameters) {
    const values: number[] = [];
    for (let v = p.minValue; v <= p.maxValue; v += p.step) {
      values.push(Math.round(v * 100) / 100);
    }
    valueSets.push({
      warehouseId: p.warehouseId,
      paramName: p.paramName,
      values,
    });
  }

  const combinations: Array<Record<string, { value: number; index: number }>> = [{}];

  for (const set of valueSets) {
    const key = `${set.warehouseId}_${set.paramName}`;
    const newCombinations: typeof combinations = [];

    for (const combo of combinations) {
      for (let i = 0; i < set.values.length; i++) {
        newCombinations.push({
          ...combo,
          [key]: { value: set.values[i], index: i },
        });
      }
    }

    combinations.length = 0;
    combinations.push(...newCombinations);
  }

  const result: Array<{ params: SimulationParams; paramValues: Record<string, number> }> = [];

  for (const combo of combinations) {
    const paramValues: Record<string, number> = {};
    const newParams: SimulationParams = JSON.parse(JSON.stringify(baseParams));

    for (const [key, data] of Object.entries(combo)) {
      paramValues[key] = data.value;
      const [warehouseId, paramName] = key.split('_');
      const warehouse = newParams.warehouses.find((w) => w.id === warehouseId);
      if (warehouse) {
        (warehouse as unknown as Record<string, number>)[paramName] = data.value;
      }
    }

    result.push({ params: newParams, paramValues });
  }

  return result;
}
