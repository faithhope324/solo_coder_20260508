import { useSimulationStore } from '../store/useSimulationStore';
import { Calendar } from 'lucide-react';

export function DaySlider() {
  const { params, result, currentDay, setCurrentDay } = useSimulationStore();

  if (!params || !result) return null;

  const maxDay = params.simulationDays;

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-cyan-400" />
          <span className="text-sm text-slate-300">时间轴控制</span>
        </div>
        <span className="font-mono text-lg text-cyan-400">
          第 {currentDay} 天 / {maxDay} 天
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={maxDay}
        step={1}
        value={currentDay}
        onChange={(e) => setCurrentDay(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-cyan-500"
      />

      <div className="flex justify-between text-xs text-slate-500">
        <span>开始</span>
        <span>1/4</span>
        <span>1/2</span>
        <span>3/4</span>
        <span>结束</span>
      </div>
    </div>
  );
}
