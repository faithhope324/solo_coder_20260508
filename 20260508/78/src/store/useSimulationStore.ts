import { create } from 'zustand'
import type {
  SourceParams,
  MeteorologyParams,
  DomainParams,
  CalculateResponse,
  CalculateRequest
} from '@/types'

interface SimulationStore {
  source: SourceParams
  meteorology: MeteorologyParams
  domain: DomainParams
  modelType: 'gaussian' | 'calpuff'
  result: CalculateResponse | null
  isLoading: boolean
  isAutoCalculate: boolean
  error: string | null

  setSource: (params: Partial<SourceParams>) => void
  setMeteorology: (params: Partial<MeteorologyParams>) => void
  setDomain: (params: Partial<DomainParams>) => void
  setModelType: (type: 'gaussian' | 'calpuff') => void
  setResult: (result: CalculateResponse | null) => void
  setLoading: (loading: boolean) => void
  setAutoCalculate: (auto: boolean) => void
  setError: (error: string | null) => void
  resetToDefaults: () => void
  getRequestParams: () => CalculateRequest
}

const DEFAULT_SOURCE: SourceParams = {
  longitude: 116.3975,
  latitude: 39.9087,
  emissionRate: 100,
  stackHeight: 100,
  stackRadius: 2,
  exitVelocity: 15,
  exitTemperature: 393.15
}

const DEFAULT_METEOROLOGY: MeteorologyParams = {
  windSpeed: 5,
  windDirection: 180,
  stabilityClass: 'B',
  mixingHeight: 1000,
  ambientTemperature: 293.15
}

const DEFAULT_DOMAIN: DomainParams = {
  gridSize: 50,
  domainWidth: 2000,
  domainHeight: 2000,
  downwindDistance: 5000
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  source: DEFAULT_SOURCE,
  meteorology: DEFAULT_METEOROLOGY,
  domain: DEFAULT_DOMAIN,
  modelType: 'gaussian',
  result: null,
  isLoading: false,
  isAutoCalculate: true,
  error: null,

  setSource: (params) =>
    set((state) => ({
      source: { ...state.source, ...params }
    })),

  setMeteorology: (params) =>
    set((state) => ({
      meteorology: { ...state.meteorology, ...params }
    })),

  setDomain: (params) =>
    set((state) => ({
      domain: { ...state.domain, ...params }
    })),

  setModelType: (type) => set({ modelType: type }),
  setResult: (result) => set({ result }),
  setLoading: (loading) => set({ isLoading: loading }),
  setAutoCalculate: (auto) => set({ isAutoCalculate: auto }),
  setError: (error) => set({ error }),

  resetToDefaults: () =>
    set({
      source: DEFAULT_SOURCE,
      meteorology: DEFAULT_METEOROLOGY,
      domain: DEFAULT_DOMAIN,
      result: null,
      error: null
    }),

  getRequestParams: () => {
    const { source, meteorology, domain, modelType } = get()
    return {
      source,
      meteorology,
      domain,
      modelType
    }
  }
}))
