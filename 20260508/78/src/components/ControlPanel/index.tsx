import { Factory, Cloud, Settings, MapPin, Thermometer, Gauge, Wind, RotateCcw } from 'lucide-react'
import { useSimulationStore } from '@/store/useSimulationStore'
import { SliderInput } from './SliderInput'
import { kelvinToCelsius, celsiusToKelvin } from '@/utils/coordinates'

const STABILITY_OPTIONS = [
  { value: 'A', label: 'A - 极不稳定' },
  { value: 'B', label: 'B - 中等不稳定' },
  { value: 'C', label: 'C - 弱不稳定' },
  { value: 'D', label: 'D - 中性' },
  { value: 'E', label: 'E - 弱稳定' },
  { value: 'F', label: 'F - 中等稳定' }
]

const WIND_DIRECTION_LABELS = [
  { angle: 0, label: '北' },
  { angle: 45, label: '东北' },
  { angle: 90, label: '东' },
  { angle: 135, label: '东南' },
  { angle: 180, label: '南' },
  { angle: 225, label: '西南' },
  { angle: 270, label: '西' },
  { angle: 315, label: '西北' }
]

export function ControlPanel() {
  const { source, meteorology, domain, setSource, setMeteorology, setDomain } = useSimulationStore()

  const getWindDirectionLabel = (angle: number): string => {
    const normalizedAngle = ((angle % 360) + 360) % 360
    const index = Math.round(normalizedAngle / 45) % 8
    return WIND_DIRECTION_LABELS[index].label
  }

  return (
    <div className="w-80 bg-slate-800/95 backdrop-blur-sm border-r border-slate-700 overflow-y-auto flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Settings className="w-4 h-4 text-cyan-400" />
          模拟参数
        </h2>
      </div>

      <div className="flex-1 p-4 space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-orange-400">
            <Factory className="w-4 h-4" />
            <h3 className="text-sm font-semibold">污染源参数</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-500" />
                经度
              </label>
              <input
                type="number"
                step="0.0001"
                value={source.longitude}
                onChange={(e) => setSource({ longitude: parseFloat(e.target.value) })}
                className="w-full px-2 py-1.5 bg-slate-900/50 border border-slate-600 rounded text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-500" />
                纬度
              </label>
              <input
                type="number"
                step="0.0001"
                value={source.latitude}
                onChange={(e) => setSource({ latitude: parseFloat(e.target.value) })}
                className="w-full px-2 py-1.5 bg-slate-900/50 border border-slate-600 rounded text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <SliderInput
            label="排放速率"
            value={source.emissionRate}
            min={1}
            max={1000}
            step={1}
            unit="g/s"
            onChange={(v) => setSource({ emissionRate: v })}
            highlight
          />

          <SliderInput
            label="烟囱高度"
            value={source.stackHeight}
            min={10}
            max={500}
            step={5}
            unit="m"
            onChange={(v) => setSource({ stackHeight: v })}
          />

          <SliderInput
            label="烟囱出口半径"
            value={source.stackRadius}
            min={0.1}
            max={10}
            step={0.1}
            unit="m"
            onChange={(v) => setSource({ stackRadius: v })}
          />

          <SliderInput
            label="烟气出口速度"
            value={source.exitVelocity}
            min={1}
            max={50}
            step={1}
            unit="m/s"
            onChange={(v) => setSource({ exitVelocity: v })}
          />

          <SliderInput
            label="烟气出口温度"
            value={Math.round(kelvinToCelsius(source.exitTemperature))}
            min={30}
            max={300}
            step={5}
            unit="°C"
            onChange={(v) => setSource({ exitTemperature: celsiusToKelvin(v) })}
          />
        </div>

        <div className="w-full h-px bg-slate-700" />

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-cyan-400">
            <Cloud className="w-4 h-4" />
            <h3 className="text-sm font-semibold">气象参数</h3>
          </div>

          <SliderInput
            label="风速"
            value={meteorology.windSpeed}
            min={0.1}
            max={30}
            step={0.1}
            unit="m/s"
            onChange={(v) => setMeteorology({ windSpeed: v })}
            highlight
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1">
                <RotateCcw className="w-3 h-3 text-slate-500" />
                风向
              </label>
              <span className="text-sm font-mono text-cyan-400">
                {meteorology.windDirection}° ({getWindDirectionLabel(meteorology.windDirection)})
              </span>
            </div>
            
            <div className="relative w-32 h-32 mx-auto">
              <div className="absolute inset-0 rounded-full border-2 border-slate-600 bg-slate-900/50">
                {WIND_DIRECTION_LABELS.map((dir) => (
                  <div
                    key={dir.angle}
                    className="absolute text-[9px] text-slate-500"
                    style={{
                      top: `${50 - 45 * Math.cos((dir.angle * Math.PI) / 180)}%`,
                      left: `${50 + 45 * Math.sin((dir.angle * Math.PI) / 180)}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    {dir.label}
                  </div>
                ))}
                <div
                  className="absolute w-1 h-12 bg-gradient-to-t from-orange-500 to-transparent left-1/2 -translate-x-1/2 origin-bottom rounded-full"
                  style={{
                    bottom: '50%',
                    transform: `translateX(-50%) rotate(${meteorology.windDirection}deg)`
                  }}
                />
                <div className="absolute top-1/2 left-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50" />
              </div>
            </div>

            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={meteorology.windDirection}
              onChange={(e) => setMeteorology({ windDirection: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-orange-500
                [&::-webkit-slider-thumb]:shadow-lg
                [&::-webkit-slider-thumb]:cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">大气稳定度</label>
            <select
              value={meteorology.stabilityClass}
              onChange={(e) => setMeteorology({ stabilityClass: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {STABILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <SliderInput
            label="混合层高度"
            value={meteorology.mixingHeight}
            min={100}
            max={3000}
            step={50}
            unit="m"
            onChange={(v) => setMeteorology({ mixingHeight: v })}
          />

          <SliderInput
            label="环境温度"
            value={Math.round(kelvinToCelsius(meteorology.ambientTemperature))}
            min={-20}
            max={45}
            step={1}
            unit="°C"
            onChange={(v) => setMeteorology({ ambientTemperature: celsiusToKelvin(v) })}
          />
        </div>

        <div className="w-full h-px bg-slate-700" />

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <Gauge className="w-4 h-4" />
            <h3 className="text-sm font-semibold">计算域参数</h3>
          </div>

          <SliderInput
            label="网格分辨率"
            value={domain.gridSize}
            min={10}
            max={200}
            step={10}
            unit="m"
            onChange={(v) => setDomain({ gridSize: v })}
          />

          <SliderInput
            label="计算域宽度"
            value={domain.domainWidth}
            min={500}
            max={5000}
            step={100}
            unit="m"
            onChange={(v) => setDomain({ domainWidth: v })}
          />

          <SliderInput
            label="下风向最大距离"
            value={domain.downwindDistance}
            min={1000}
            max={20000}
            step={500}
            unit="m"
            onChange={(v) => setDomain({ downwindDistance: v })}
          />
        </div>
      </div>

      <div className="p-4 border-t border-slate-700 bg-slate-900/50">
        <div className="flex items-start gap-2 text-[11px] text-slate-400">
          <Wind className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
          <p>
            提示：在地图上点击可快速设置污染源位置。调整参数时系统会自动重新计算（防抖300ms）。
          </p>
        </div>
      </div>
    </div>
  )
}
