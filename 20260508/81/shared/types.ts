export interface WarehouseConfig {
  id: string;
  name: string;
  initialInventory: number;
  safetyStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  holdingCostRate: number;
  orderCost: number;
  stockoutCost: number;
  leadTime: number;
}

export interface TransportRoute {
  id: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  transitTime: number;
  unitCost: number;
  capacity: number;
}

export type DemandModelType = 'constant' | 'trend' | 'seasonal' | 'random';

export interface SimulationParams {
  warehouses: WarehouseConfig[];
  routes: TransportRoute[];
  demandModel: DemandModelType;
  simulationDays: number;
  baseDemand: number;
  demandVariability: number;
}

export interface DailyCostData {
  orderingCost: number;
  holdingCost: number;
  stockoutCost: number;
  transportCost: number;
  totalCost: number;
}

export interface DailyKPIData {
  turnoverRate: number;
  stockoutRate: number;
}

export interface SimulationResult {
  totalCost: number;
  inventoryTurnoverRate: number;
  stockoutRate: number;
  dailyInventory: Record<string, number[]>;
  dailyCosts: DailyCostData[];
  dailyKPIs: DailyKPIData[];
  costBreakdown: {
    orderingCost: number;
    holdingCost: number;
    stockoutCost: number;
    transportCost: number;
  };
  warehouseResults: Array<{
    warehouseId: string;
    warehouseName: string;
    avgInventory: number;
    stockoutCount: number;
    turnoverRate: number;
  }>;
}

export interface SensitivityParameter {
  warehouseId: string;
  paramName: 'safetyStock' | 'reorderPoint';
  minValue: number;
  maxValue: number;
  step: number;
}

export interface SensitivityRequest {
  baseParams: SimulationParams;
  parameters: SensitivityParameter[];
}

export interface SensitivityResult {
  scenarios: Array<{
    params: Record<string, number>;
    result: SimulationResult;
  }>;
}

interface PendingOrder {
  orderId: string;
  quantity: number;
  arrivalDay: number;
  fromWarehouseId?: string;
}

export interface InventoryState {
  warehouseId: string;
  currentLevel: number;
  inTransit: number;
  pendingOrders: PendingOrder[];
  stockoutDays: number;
  totalDemand: number;
  totalStockoutQuantity: number;
  orderCount: number;
  totalHoldingCost: number;
  totalOrderingCost: number;
  totalStockoutCost: number;
  dailyInventory: number[];
}

export interface DailySnapshot {
  day: number;
  inventoryLevels: Record<string, number>;
  demand: Record<string, number>;
  stockouts: string[];
  ordersPlaced: string[];
}
