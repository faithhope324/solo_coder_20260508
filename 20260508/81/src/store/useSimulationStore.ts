import { create } from 'zustand';
import type {
  SimulationParams,
  SimulationResult,
  SensitivityResult,
  DemandModelType,
} from '../../shared/types';
import { getDefaultParams, runSimulation, runSensitivityAnalysis } from '../services/api';

interface SimulationState {
  params: SimulationParams | null;
  result: SimulationResult | null;
  sensitivityResult: SensitivityResult | null;
  isLoading: boolean;
  error: string | null;
  currentDay: number;
  activeWarehouseTab: string;

  fetchDefaultParams: () => Promise<void>;
  updateWarehouseParam: (
    warehouseId: string,
    paramName: keyof SimulationParams['warehouses'][0],
    value: number
  ) => void;
  updateGlobalParam: (
    paramName: 'simulationDays' | 'baseDemand' | 'demandVariability' | 'demandModel',
    value: number | DemandModelType
  ) => void;
  runSimulation: () => Promise<void>;
  runSensitivity: (
    parameters: Array<{
      warehouseId: string;
      paramName: 'safetyStock' | 'reorderPoint';
      minValue: number;
      maxValue: number;
      step: number;
    }>
  ) => Promise<void>;
  setCurrentDay: (day: number) => void;
  setActiveWarehouseTab: (id: string) => void;
  reset: () => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  params: null,
  result: null,
  sensitivityResult: null,
  isLoading: false,
  error: null,
  currentDay: 0,
  activeWarehouseTab: 'wh1',

  fetchDefaultParams: async () => {
    try {
      set({ isLoading: true, error: null });
      const params = await getDefaultParams();
      set({
        params,
        isLoading: false,
        activeWarehouseTab: params.warehouses[0]?.id || 'wh1',
        currentDay: params.simulationDays,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '加载默认参数失败',
      });
    }
  },

  updateWarehouseParam: (warehouseId, paramName, value) => {
    const { params } = get();
    if (!params) return;

    const newWarehouses = params.warehouses.map((w) =>
      w.id === warehouseId ? { ...w, [paramName]: value } : w
    );

    set({ params: { ...params, warehouses: newWarehouses } });
  },

  updateGlobalParam: (paramName, value) => {
    const { params } = get();
    if (!params) return;

    set({ params: { ...params, [paramName]: value } });
  },

  runSimulation: async () => {
    const { params } = get();
    if (!params) return;

    try {
      set({ isLoading: true, error: null, result: null });
      const result = await runSimulation(params);
      set({ result, isLoading: false, currentDay: params.simulationDays });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '模拟执行失败',
      });
    }
  },

  runSensitivity: async (parameters) => {
    const { params } = get();
    if (!params) return;

    try {
      set({ isLoading: true, error: null, sensitivityResult: null });
      const result = await runSensitivityAnalysis({
        baseParams: params,
        parameters,
      });
      set({ sensitivityResult: result, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '敏感性分析失败',
      });
    }
  },

  setCurrentDay: (day) => set({ currentDay: day }),

  setActiveWarehouseTab: (id) => set({ activeWarehouseTab: id }),

  reset: () => {
    set({ result: null, sensitivityResult: null, error: null, currentDay: 0 });
  },
}));
