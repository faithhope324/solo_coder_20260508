import { useEffect, useState, useCallback } from 'react'
import { Header } from '@/components/Header'
import { ControlPanel } from '@/components/ControlPanel'
import { MapView } from '@/components/MapView'
import { ConcentrationChart } from '@/components/ConcentrationChart'
import { HelpModal } from '@/components/HelpModal'
import { useSimulationStore } from '@/store/useSimulationStore'
import { useDebounce } from '@/hooks/useDebounce'
import { calculate as apiCalculate } from '@/services/api'
import type { CalculateRequest } from '@/types'

export default function Home() {
  const [showHelp, setShowHelp] = useState(false)
  const [requestParams, setRequestParams] = useState<CalculateRequest | null>(null)

  const {
    source,
    meteorology,
    domain,
    modelType,
    isLoading,
    isAutoCalculate,
    setLoading,
    setResult,
    setError,
    resetToDefaults,
    getRequestParams
  } = useSimulationStore()

  const debouncedSource = useDebounce(source, 300)
  const debouncedMeteorology = useDebounce(meteorology, 300)
  const debouncedDomain = useDebounce(domain, 300)

  const handleCalculate = useCallback(async () => {
    const params = getRequestParams()
    setRequestParams(params)
  }, [getRequestParams])

  useEffect(() => {
    if (isAutoCalculate) {
      handleCalculate()
    }
  }, [debouncedSource, debouncedMeteorology, debouncedDomain, isAutoCalculate, handleCalculate])

  useEffect(() => {
    if (!requestParams) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await apiCalculate(requestParams)
        setResult(result)
      } catch (err: any) {
        console.error('计算错误:', err)
        setError(err.message || '计算失败，请检查后端服务是否运行')
        setResult(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [requestParams, setLoading, setResult, setError])

  useEffect(() => {
    handleCalculate()
  }, [])

  const handleReset = useCallback(() => {
    resetToDefaults()
    setRequestParams(null)
    setTimeout(() => {
      handleCalculate()
    }, 100)
  }, [resetToDefaults, handleCalculate])

  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden">
      <Header
        onCalculate={handleCalculate}
        onReset={handleReset}
        onToggleHelp={() => setShowHelp(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        <ControlPanel />
        <MapView isLoading={isLoading} />
        <ConcentrationChart />
      </div>

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  )
}
