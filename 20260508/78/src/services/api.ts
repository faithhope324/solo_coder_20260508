import axios from 'axios'
import type {
  CalculateRequest,
  CalculateResponse,
  StabilityClasses,
  SourceParams,
  MeteorologyParams,
  DomainParams
} from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const healthCheck = async (): Promise<{ status: string; message: string }> => {
  const response = await apiClient.get('/health')
  return response.data
}

export const getDefaultParams = async (): Promise<{
  source: SourceParams
  meteorology: MeteorologyParams
  domain: DomainParams
}> => {
  const response = await apiClient.get('/default-params')
  return response.data
}

export const getStabilityClasses = async (): Promise<StabilityClasses> => {
  const response = await apiClient.get('/stability-classes')
  return response.data
}

export const calculate = async (
  params: CalculateRequest
): Promise<CalculateResponse> => {
  const response = await apiClient.post('/calculate', params)
  return response.data
}

export const calculatePlume = async (
  params: CalculateRequest
): Promise<{
  plumeLine: { distance: number; concentration: number }[]
  effectiveHeight: number
  plumeRise: number
  statistics: { computationTime: number; gridPoints: number }
}> => {
  const response = await apiClient.post('/calculate-plume', params)
  return response.data
}
