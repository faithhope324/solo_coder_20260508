import { useWeatherStore } from '@/store/weatherStore';
import { MapPin, Wind, Thermometer, Droplets, Navigation } from 'lucide-react';

export default function InfoPanel() {
  const { selectedPoint, pointData } = useWeatherStore();

  if (!selectedPoint || !pointData) return null;

  const windDirLabel = (deg: number) => {
    const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
    return dirs[Math.round(deg / 45) % 8];
  };

  return (
    <div className="fixed bottom-20 right-4 z-[1000] glass-panel rounded-xl p-4 w-64 select-none">
      <div className="flex items-center gap-2 mb-3">
        <MapPin size={14} className="text-orange-400" />
        <span className="text-xs text-orange-300 font-mono">
          {selectedPoint.lat.toFixed(2)}°N, {selectedPoint.lon.toFixed(2)}°E
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Thermometer size={12} className="text-red-400" />
            <span className="text-xs text-slate-400">温度</span>
          </div>
          <span className="text-sm text-slate-200 font-mono font-semibold">
            {pointData.temperature.toFixed(1)}°C
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets size={12} className="text-blue-400" />
            <span className="text-xs text-slate-400">湿度</span>
          </div>
          <span className="text-sm text-slate-200 font-mono font-semibold">
            {pointData.humidity.toFixed(1)} hPa
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wind size={12} className="text-cyan-400" />
            <span className="text-xs text-slate-400">风速</span>
          </div>
          <span className="text-sm text-slate-200 font-mono font-semibold">
            {pointData.windSpeed.toFixed(1)} m/s
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation size={12} className="text-emerald-400" />
            <span className="text-xs text-slate-400">风向</span>
          </div>
          <span className="text-sm text-slate-200 font-mono font-semibold">
            {windDirLabel(pointData.windDirection)} {pointData.windDirection.toFixed(0)}°
          </span>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-white/5 flex items-center gap-3">
        <span className="text-[10px] text-slate-500 font-mono">U: {pointData.u.toFixed(2)}</span>
        <span className="text-[10px] text-slate-500 font-mono">V: {pointData.v.toFixed(2)}</span>
      </div>
    </div>
  );
}
