import { useWeatherStore } from '@/store/weatherStore';
import { Clock } from 'lucide-react';

export default function TimeSlider() {
  const { step, setStep, loading } = useWeatherStore();

  const hours = step;
  const day = Math.floor(hours / 24);
  const hr = hours % 24;
  const label = step === 0 ? '初始场' : `T+${hours}h (${day > 0 ? `D+${day} ` : ''}${hr}:00)`;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000] glass-panel rounded-xl px-6 py-3 w-[560px] max-w-[90vw] select-none">
      <div className="flex items-center gap-3 mb-1">
        <Clock size={14} className="text-cyan-400 shrink-0" />
        <span className="text-xs text-cyan-300 font-mono tracking-wide">{label}</span>
        {loading && (
          <span className="ml-auto text-xs text-orange-400 animate-pulse">计算中...</span>
        )}
      </div>
      <div className="relative">
        <input
          type="range"
          min={0}
          max={72}
          value={step}
          onChange={(e) => setStep(Number(e.target.value))}
          className="time-slider w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #00d4ff ${((step) / 72) * 100}%, rgba(255,255,255,0.1) ${((step) / 72) * 100}%)`,
          }}
        />
        <div className="flex justify-between mt-1 px-0.5">
          <span className="text-[10px] text-slate-500 font-mono">0h</span>
          <span className="text-[10px] text-slate-500 font-mono">24h</span>
          <span className="text-[10px] text-slate-500 font-mono">48h</span>
          <span className="text-[10px] text-slate-500 font-mono">72h</span>
        </div>
      </div>
    </div>
  );
}
