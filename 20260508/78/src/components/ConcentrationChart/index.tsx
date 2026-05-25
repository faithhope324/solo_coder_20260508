import { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { TrendingUp, Info } from 'lucide-react'
import { useSimulationStore } from '@/store/useSimulationStore'
import type { PlumePoint } from '@/types'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export function ConcentrationChart() {
  const chartRef = useRef<ChartJS<'line'>>(null)
  const { result, source, meteorology } = useSimulationStore()

  const getChartData = (plumeLine: PlumePoint[]) => {
    const maxConcentration = Math.max(...plumeLine.map(p => p.concentration))
    const maxIndex = plumeLine.findIndex(p => p.concentration === maxConcentration)

    return {
      labels: plumeLine.map(p => (p.distance / 1000).toFixed(1)),
      datasets: [
        {
          label: '地面浓度 (μg/m³)',
          data: plumeLine.map(p => p.concentration),
          borderColor: 'rgb(14, 165, 233)',
          backgroundColor: 'rgba(14, 165, 233, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#f97316',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2
        },
        {
          label: `峰值 (${maxConcentration.toFixed(2)} μg/m³)`,
          data: plumeLine.map((p, i) => (i === maxIndex ? p.concentration : null)),
          backgroundColor: '#f97316',
          borderColor: '#f97316',
          borderWidth: 0,
          pointRadius: 8,
          pointHoverRadius: 10,
          pointStyle: 'circle'
        }
      ]
    }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 500,
      easing: 'easeOutQuart' as const
    },
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: '#94a3b8',
          font: {
            size: 11,
            family: 'Inter, sans-serif'
          },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#fff',
        bodyColor: '#94a3b8',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        titleFont: {
          size: 12,
          weight: 'bold' as const
        },
        bodyFont: {
          size: 11
        },
        callbacks: {
          title: (context: any) => {
            const distance = parseFloat(context[0].label)
            return `下风向距离: ${distance} km`
          },
          label: (context: any) => {
            return `浓度: ${context.raw.toFixed(4)} μg/m³`
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: '下风向距离 (km)',
          color: '#94a3b8',
          font: {
            size: 11,
            weight: 'normal' as const
          }
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 10
          },
          maxTicksLimit: 10
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: '地面浓度 (μg/m³)',
          color: '#94a3b8',
          font: {
            size: 11,
            weight: 'normal' as const
          }
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 10
          },
          callback: (value: number | string) => {
            const num = typeof value === 'string' ? parseFloat(value) : value
            if (num >= 1000) {
              return (num / 1000).toFixed(1) + 'k'
            }
            return num.toFixed(1)
          }
        },
        beginAtZero: true
      }
    }
  }

  if (!result || !result.plumeLine || result.plumeLine.length === 0) {
    return (
      <div className="w-80 bg-slate-800/95 backdrop-blur-sm border-l border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            下风向轴线浓度
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700/50 flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-slate-400 text-sm">等待计算结果</p>
            <p className="text-slate-500 text-xs mt-1">调整参数后将自动生成浓度曲线</p>
          </div>
        </div>
      </div>
    )
  }

  const maxConcentration = Math.max(...result.plumeLine.map(p => p.concentration))
  const maxDistance = result.plumeLine.find(p => p.concentration === maxConcentration)?.distance || 0

  return (
    <div className="w-80 bg-slate-800/95 backdrop-blur-sm border-l border-slate-700 flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          下风向轴线浓度
        </h2>
      </div>

      <div className="p-4 border-b border-slate-700 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">峰值浓度</p>
            <p className="text-lg font-mono font-bold text-orange-400 mt-1">
              {maxConcentration.toFixed(2)}
              <span className="text-[10px] text-slate-500 ml-1">μg/m³</span>
            </p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">峰值距离</p>
            <p className="text-lg font-mono font-bold text-cyan-400 mt-1">
              {(maxDistance / 1000).toFixed(2)}
              <span className="text-[10px] text-slate-500 ml-1">km</span>
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
          <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="text-[10px] text-slate-400 leading-relaxed">
            曲线显示地面轴线浓度随下风向距离的变化。
            有效源高 <span className="text-emerald-400 font-mono">{result.effectiveHeight.toFixed(1)} m</span>，
            抬升高度 <span className="text-orange-400 font-mono">{result.plumeRise.toFixed(1)} m</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4">
        <div className="h-64">
          <Line
            ref={chartRef}
            data={getChartData(result.plumeLine)}
            options={chartOptions}
          />
        </div>
      </div>

      <div className="p-4 border-t border-slate-700 bg-slate-900/50">
        <div className="text-[10px] text-slate-500 space-y-1">
          <div className="flex justify-between">
            <span>污染源位置</span>
            <span className="font-mono text-slate-400">
              {source.longitude.toFixed(4)}, {source.latitude.toFixed(4)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>排放速率</span>
            <span className="font-mono text-slate-400">{source.emissionRate} g/s</span>
          </div>
          <div className="flex justify-between">
            <span>风速 / 风向</span>
            <span className="font-mono text-slate-400">
              {meteorology.windSpeed} m/s / {meteorology.windDirection}°
            </span>
          </div>
          <div className="flex justify-between">
            <span>稳定度分类</span>
            <span className="font-mono text-slate-400">
              {meteorology.stabilityClass}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
