import { useEffect, useRef } from 'react'

interface SliderInputProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (value: number) => void
  description?: string
  highlight?: boolean
}

export function SliderInput({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  description,
  highlight = false
}: SliderInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const prevValue = useRef(value)

  useEffect(() => {
    if (highlight && value !== prevValue.current && inputRef.current) {
      inputRef.current.classList.add('ring-2', 'ring-cyan-400')
      const timer = setTimeout(() => {
        inputRef.current?.classList.remove('ring-2', 'ring-cyan-400')
      }, 300)
      prevValue.current = value
      return () => clearTimeout(timer)
    }
  }, [value, highlight])

  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-300">{label}</label>
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            type="number"
            value={value}
            step={step}
            min={min}
            max={max}
            onChange={(e) => {
              const val = parseFloat(e.target.value)
              if (!isNaN(val) && val >= min && val <= max) {
                onChange(val)
              }
            }}
            className="w-20 px-2 py-1 text-right bg-slate-900/50 border border-slate-600 rounded text-sm font-mono text-cyan-400 focus:outline-none focus:border-cyan-500 transition-all duration-200"
          />
          <span className="text-xs text-slate-500 w-8">{unit}</span>
        </div>
      </div>
      <div className="relative">
        <div
          className="absolute top-1/2 left-0 h-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 -translate-y-1/2 pointer-events-none"
          style={{ width: `${percentage}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer relative z-10
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-all
            [&::-webkit-slider-thumb]:duration-150
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-webkit-slider-thumb]:active:scale-95
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-white
            [&::-moz-range-thumb]:border-none
            [&::-moz-range-thumb]:shadow-lg
            [&::-moz-range-thumb]:cursor-pointer"
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      {description && (
        <p className="text-[10px] text-slate-500">{description}</p>
      )}
    </div>
  )
}
