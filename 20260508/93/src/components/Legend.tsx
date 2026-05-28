import { useWeatherStore } from '@/store/weatherStore';
import { getColorScale } from '@/utils/canvasRenderer';

export default function Legend() {
  const { variable, renderMode } = useWeatherStore();

  if (renderMode === 'streamline') return null;

  const scale = getColorScale(variable);

  const unitMap: Record<string, string> = {
    temperature: '°C',
    humidity: 'hPa',
    wind_speed: 'm/s',
  };

  const labelMap: Record<string, string> = {
    temperature: '温度',
    humidity: '水汽压',
    wind_speed: '风速',
  };

  return (
    <div className="fixed bottom-[88px] left-4 z-[1000] glass-panel rounded-xl p-3 w-48 select-none">
      <div className="text-xs text-slate-400 mb-2">{labelMap[variable]} ({unitMap[variable]})</div>
      <div
        className="h-3 rounded-full"
        style={{
          background: `linear-gradient(to right, ${scale.colors.join(', ')})`,
        }}
      />
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-slate-500 font-mono">{scale.min}</span>
        <span className="text-[10px] text-slate-500 font-mono">{scale.max}</span>
      </div>
    </div>
  );
}
