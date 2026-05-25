export interface SourceParams {
  longitude: number
  latitude: number
  emissionRate: number
  stackHeight: number
  stackRadius: number
  exitVelocity: number
  exitTemperature: number
}

export interface MeteorologyParams {
  windSpeed: number
  windDirection: number
  stabilityClass: string
  mixingHeight: number
  ambientTemperature: number
}

export interface DomainParams {
  gridSize: number
  domainWidth: number
  domainHeight: number
  downwindDistance: number
}

export interface CalculateRequest {
  source: SourceParams
  meteorology: MeteorologyParams
  domain: DomainParams
  modelType: 'gaussian' | 'calpuff'
}

export interface GridPoint {
  x: number
  y: number
  lon: number
  lat: number
  concentration: number
}

export interface PlumePoint {
  distance: number
  concentration: number
}

export interface ContourData {
  levels: number[]
  paths: string[][]
  bounds?: {
    xMin: number
    xMax: number
    yMin: number
    yMax: number
  }
}

export interface CalculateResponse {
  grid: GridPoint[][]
  maxConcentration: number
  maxConcentrationPoint: { lon: number; lat: number }
  plumeLine: PlumePoint[]
  contourData: ContourData
  effectiveHeight: number
  plumeRise: number
  statistics: {
    computationTime: number
    gridPoints: number
  }
}

export interface StabilityClass {
  description: string
  sigma_y_a: number
  sigma_y_b: number
  sigma_z_a: number
  sigma_z_b: number
  wind_condition: string
}

export type StabilityClasses = Record<string, StabilityClass>

export interface SimulationState {
  source: SourceParams
  meteorology: MeteorologyParams
  domain: DomainParams
  modelType: 'gaussian' | 'calpuff'
  result: CalculateResponse | null
  isLoading: boolean
  isAutoCalculate: boolean
  error: string | null
}
