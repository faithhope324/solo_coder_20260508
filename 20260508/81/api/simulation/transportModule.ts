import type { TransportRoute, InventoryState } from '../../shared/types';

export function calculateTransportCost(
  routes: TransportRoute[],
  fromId: string,
  toId: string,
  quantity: number
): number {
  const route = routes.find(
    (r) => r.fromWarehouseId === fromId && r.toWarehouseId === toId
  );
  if (!route) return 0;
  return Math.min(quantity, route.capacity) * route.unitCost;
}

export function canTransfer(
  routes: TransportRoute[],
  fromId: string,
  toId: string,
  quantity: number
): boolean {
  const route = routes.find(
    (r) => r.fromWarehouseId === fromId && r.toWarehouseId === toId
  );
  if (!route) return false;
  return quantity <= route.capacity;
}

export function getTransitTime(
  routes: TransportRoute[],
  fromId: string,
  toId: string
): number {
  const route = routes.find(
    (r) => r.fromWarehouseId === fromId && r.toWarehouseId === toId
  );
  return route?.transitTime ?? 0;
}

export interface TransferResult {
  success: boolean;
  transportCost: number;
  arrivalDay: number;
}

export function initiateTransfer(
  routes: TransportRoute[],
  fromState: InventoryState,
  toState: InventoryState,
  quantity: number,
  currentDay: number
): TransferResult {
  if (fromState.currentLevel < quantity) {
    return { success: false, transportCost: 0, arrivalDay: 0 };
  }

  if (!canTransfer(routes, fromState.warehouseId, toState.warehouseId, quantity)) {
    return { success: false, transportCost: 0, arrivalDay: 0 };
  }

  const transitTime = getTransitTime(routes, fromState.warehouseId, toState.warehouseId);
  const transportCost = calculateTransportCost(
    routes,
    fromState.warehouseId,
    toState.warehouseId,
    quantity
  );

  fromState.currentLevel -= quantity;
  toState.inTransit += quantity;
  toState.pendingOrders.push({
    orderId: `transfer-${fromState.warehouseId}-${toState.warehouseId}-${currentDay}`,
    quantity,
    arrivalDay: currentDay + transitTime,
    fromWarehouseId: fromState.warehouseId,
  });

  return {
    success: true,
    transportCost,
    arrivalDay: currentDay + transitTime,
  };
}
