import { Wind, RefreshCw, Zap, ZapOff, HelpCircle } from 'lucide-react'
import { useSimulationStore } from '@/store/useSimulationStore'

interface HeaderProps {
  onCalculate: () => void
  onReset: () => void
  onToggleHelp: () => void
}

export function Header({ onCalculate, onReset, onToggleHelp }: HeaderProps) {
  const { isAutoCalculate, isLoading, setAutoCalculate, result } = useSimulationStore()

  return (
    <header className="bg-slate-800/95 backdrop-blur-sm border-b border-slate-700 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
          <Wind className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            大气扩散模型模拟系统
          </h1>
          <p className="text-xs text-slate-400">
            高斯烟羽模型 · Atmospheric Diffusion Simulator
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {result && (
          <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-slate-900/50 rounded-lg">
            <div className="text-right">
              <p className="text-xs text-slate-400">最大浓度</p>
              <p className="text-lg font-mono font-bold text-orange-400">
                {result.maxConcentration.toFixed(2)}
                <span className="text-xs text-slate-500 ml-1">μg/m³</span>
              </p>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-right">
              <p className="text-xs text-slate-400">计算时间</p>
              <p className="text-lg font-mono font-bold text-cyan-400">
                {(result.statistics.computationTime * 1000).toFixed(0)}
                <span className="text-xs text-slate-500 ml-1">ms</span>
              </p>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-right">
              <p className="text-xs text-slate-400">有效源高</p>
              <p className="text-lg font-mono font-bold text-emerald-400">
                {result.effectiveHeight.toFixed(1)}
                <span className="text-xs text-slate-500 ml-1">m</span>
              </p>
            </div>
          </div>
        )}

        <button
          onClick={() => setAutoCalculate(!isAutoCalculate)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
            isAutoCalculate
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
              : 'bg-slate-700/50 text-slate-400 border border-slate-600 hover:bg-slate-700'
          }`}
        >
          {isAutoCalculate ? (
            <Zap className="w-4 h-4 fill-current" />
          ) : (
            <ZapOff className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">{isAutoCalculate ? '实时计算' : '手动计算'}</span>
        </button>

        {!isAutoCalculate && (
          <button
            onClick={onCalculate}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span className="text-sm">{isLoading ? '计算中...' : '开始计算'}</span>
          </button>
        )}

        <button
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-all duration-200 border border-slate-600"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="text-sm hidden sm:inline">重置参数</span>
        </button>

        <button
          onClick={onToggleHelp}
          className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-all duration-200 border border-slate-600"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
