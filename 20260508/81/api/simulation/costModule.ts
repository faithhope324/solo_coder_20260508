import type { InventoryState, WarehouseConfig, DailyCostData, DailyKPIData } from '../../shared/types';

export interface CostSummary {
  orderingCost: number;
  holdingCost: number;
  stockoutCost: number;
  transportCost: number;
  totalCost: number;
}

export function calculateDailyMetrics(
  states: Map<string, InventoryState>,
  configs: Map<string, WarehouseConfig>,
  currentDay: number,
  cumulativeTransportCost: number
): { costs: DailyCostData; kpis: DailyKPIData } {
  let orderingCost = 0;
  let holdingCost = 0;
  let stockoutCost = 0;
  let totalStockoutDays = 0;
  let totalTurnover = 0;

  for (const [id, state] of states) {
    const config = configs.get(id)!;
    orderingCost += state.totalOrderingCost;
    holdingCost += state.totalHoldingCost;
    stockoutCost += state.totalStockoutCost;
    totalStockoutDays += state.stockoutDays;

    const avgInventory =
      state.dailyInventory.length > 0
        ? state.dailyInventory.reduce((sum, inv) => sum + inv, 0) /
          state.dailyInventory.length
        : 0;

    if (avgInventory > 0) {
      const costOfGoodsSold = state.totalDemand * config.holdingCostRate * 10;
      totalTurnover += costOfGoodsSold / avgInventory;
    }
  }

  const totalCost = orderingCost + holdingCost + stockoutCost + cumulativeTransportCost;
  const warehouseCount = states.size;
  const stockoutRate =
    warehouseCount > 0
      ? Math.round((totalStockoutDays / (currentDay * warehouseCount)) * 10000) / 100
      : 0;
  const turnoverRate =
    warehouseCount > 0 ? Math.round((totalTurnover / warehouseCount) * 100) / 100 : 0;

  return {
    costs: {
      orderingCost: Math.round(orderingCost * 100) / 100,
      holdingCost: Math.round(holdingCost * 100) / 100,
      stockoutCost: Math.round(stockoutCost * 100) / 100,
      transportCost: Math.round(cumulativeTransportCost * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
    },
    kpis: {
      turnoverRate,
      stockoutRate,
    },
  };
}

export function aggregateCosts(
  states: Map<string, InventoryState>,
  additionalTransportCost: number = 0
): CostSummary {
  let orderingCost = 0;
  let holdingCost = 0;
  let stockoutCost = 0;

  for (const state of states.values()) {
    orderingCost += state.totalOrderingCost;
    holdingCost += state.totalHoldingCost;
    stockoutCost += state.totalStockoutCost;
  }

  const totalCost = orderingCost + holdingCost + stockoutCost + additionalTransportCost;

  return {
    orderingCost,
    holdingCost,
    stockoutCost,
    transportCost: additionalTransportCost,
    totalCost,
  };
}

export function calculateTurnoverRate(
  state: InventoryState,
  config: WarehouseConfig,
  simulationDays: number
): number {
  if (state.dailyInventory.length === 0) return 0;

  const avgInventory =
    state.dailyInventory.reduce((sum, inv) => sum + inv, 0) / state.dailyInventory.length;

  if (avgInventory === 0) return 0;

  const costOfGoodsSold = state.totalDemand * config.holdingCostRate * 10;
  return costOfGoodsSold / avgInventory;
}

export function calculateStockoutRate(
  state: InventoryState,
  simulationDays: number
): number {
  return state.stockoutDays / simulationDays;
}

export function calculateOverallMetrics(
  states: Map<string, InventoryState>,
  configs: Map<string, WarehouseConfig>,
  simulationDays: number,
  transportCost: number
) {
  const costs = aggregateCosts(states, transportCost);

  let totalAvgInventory = 0;
  let totalStockoutDays = 0;
  let totalTurnover = 0;

  const warehouseResults: Array<{
    warehouseId: string;
    warehouseName: string;
    avgInventory: number;
    stockoutCount: number;
    turnoverRate: number;
  }> = [];

  for (const [id, state] of states) {
    const config = configs.get(id)!;
    const avgInventory =
      state.dailyInventory.reduce((sum, inv) => sum + inv, 0) / state.dailyInventory.length;
    const turnoverRate = calculateTurnoverRate(state, config, simulationDays);
    const stockoutRate = calculateStockoutRate(state, simulationDays);

    totalAvgInventory += avgInventory;
    totalStockoutDays += state.stockoutDays;
    totalTurnover += turnoverRate;

    warehouseResults.push({
      warehouseId: id,
      warehouseName: config.name,
      avgInventory: Math.round(avgInventory * 100) / 100,
      stockoutCount: state.stockoutDays,
      turnoverRate: Math.round(turnoverRate * 100) / 100,
    });
  }

  const warehouseCount = states.size;
  const overallTurnoverRate =
    warehouseCount > 0 ? Math.round((totalTurnover / warehouseCount) * 100) / 100 : 0;
  const overallStockoutRate =
    warehouseCount > 0
      ? Math.round((totalStockoutDays / (simulationDays * warehouseCount)) * 10000) / 100
      : 0;

  const dailyInventory: Record<string, number[]> = {};
  for (const [id, state] of states) {
    dailyInventory[id] = [...state.dailyInventory];
  }

  return {
    totalCost: Math.round(costs.totalCost * 100) / 100,
    inventoryTurnoverRate: overallTurnoverRate,
    stockoutRate: overallStockoutRate,
    dailyInventory,
    costBreakdown: {
      orderingCost: Math.round(costs.orderingCost * 100) / 100,
      holdingCost: Math.round(costs.holdingCost * 100) / 100,
      stockoutCost: Math.round(costs.stockoutCost * 100) / 100,
      transportCost: Math.round(costs.transportCost * 100) / 100,
    },
    warehouseResults,
  };
}
