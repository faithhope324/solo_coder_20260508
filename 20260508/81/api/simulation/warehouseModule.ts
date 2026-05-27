import type { WarehouseConfig, InventoryState } from '../../shared/types';

export function createInitialInventoryState(warehouse: WarehouseConfig): InventoryState {
  return {
    warehouseId: warehouse.id,
    currentLevel: warehouse.initialInventory,
    inTransit: 0,
    pendingOrders: [],
    stockoutDays: 0,
    totalDemand: 0,
    totalStockoutQuantity: 0,
    orderCount: 0,
    totalHoldingCost: 0,
    totalOrderingCost: 0,
    totalStockoutCost: 0,
    dailyInventory: [warehouse.initialInventory],
  };
}

export function processDemand(
  state: InventoryState,
  demand: number,
  config: WarehouseConfig
): { stockoutQuantity: number; fulfilledDemand: number } {
  state.totalDemand += demand;

  if (state.currentLevel >= demand) {
    state.currentLevel -= demand;
    return { stockoutQuantity: 0, fulfilledDemand: demand };
  } else {
    const stockoutQuantity = demand - state.currentLevel;
    const fulfilledDemand = state.currentLevel;
    state.currentLevel = 0;
    state.stockoutDays += 1;
    state.totalStockoutQuantity += stockoutQuantity;
    state.totalStockoutCost += stockoutQuantity * config.stockoutCost;
    return { stockoutQuantity, fulfilledDemand };
  }
}

export function checkAndPlaceOrder(
  state: InventoryState,
  config: WarehouseConfig,
  day: number
): { orderQuantity: number; arrivalDay: number } | null {
  if (state.currentLevel <= config.reorderPoint) {
    const hasPendingOrder = state.pendingOrders.length > 0;
    if (!hasPendingOrder) {
      const orderQuantity = config.reorderQuantity;
      const arrivalDay = day + config.leadTime;
      state.pendingOrders.push({
        orderId: `${config.id}-order-${day}`,
        quantity: orderQuantity,
        arrivalDay,
      });
      state.orderCount += 1;
      state.totalOrderingCost += config.orderCost;
      state.inTransit += orderQuantity;
      return { orderQuantity, arrivalDay };
    }
  }
  return null;
}

export function processArrivingOrders(state: InventoryState, day: number): number {
  let arrivedQuantity = 0;
  const remainingOrders: typeof state.pendingOrders = [];

  for (const order of state.pendingOrders) {
    if (order.arrivalDay <= day) {
      state.currentLevel += order.quantity;
      state.inTransit -= order.quantity;
      arrivedQuantity += order.quantity;
    } else {
      remainingOrders.push(order);
    }
  }

  state.pendingOrders = remainingOrders;
  return arrivedQuantity;
}

export function calculateHoldingCost(state: InventoryState, config: WarehouseConfig): number {
  const holdingCost = state.currentLevel * config.holdingCostRate;
  state.totalHoldingCost += holdingCost;
  return holdingCost;
}

export function recordDailyInventory(state: InventoryState): void {
  state.dailyInventory.push(state.currentLevel);
}
