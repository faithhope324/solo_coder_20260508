import { useState } from 'react';
import { useWeatherStore, type WeatherVariable, type PressureLevel, type RenderMode } from '@/store/weatherStore';
import { Thermometer, Droplets, Wind, Layers, PanelLeftClose, PanelLeftOpen, MapPin, Search } from 'lucide-react';
import { fetchPointData } from '@/api/weatherApi';

const VARIABLES: { key: WeatherVariable; label: string; icon: React.ReactNode }[] = [
  { key: 'temperature', label: '温度', icon: <Thermometer size={16} /> },
  { key: 'humidity', label: '湿度', icon: <Droplets size={16} /> },
  { key: 'wind_speed', label: '风速', icon: <Wind size={16} /> },
];

const LEVELS: { key: PressureLevel; label: string }[] = [
  { key: 1000, label: '1000 hPa (~100m)' },
  { key: 850, label: '850 hPa (~1500m)' },
  { key: 500, label: '500 hPa (~5500m)' },
  { key: 250, label: '250 hPa (~10400m)' },
];

const MODES: { key: RenderMode; label: string }[] = [
  { key: 'contour', label: '等值线' },
  { key: 'streamline', label: '风场流线' },
];

export default function ControlPanel() {
  const { variable, level, step, renderMode, panelCollapsed, setVariable, setLevel, setRenderMode, togglePanel, setSelectedPoint, setPointData } = useWeatherStore();
  const [latInput, setLatInput] = useState('39.90');
  const [lonInput, setLonInput] = useState('116.40');
  const [inputError, setInputError] = useState('');

  const handleQueryPoint = async () => {
    const lat = parseFloat(latInput);
    const lon = parseFloat(lonInput);

    if (isNaN(lat) || isNaN(lon)) {
      setInputError('请输入有效数字');
      return;
    }

    setInputError('');
    setSelectedPoint({ lat, lon });
    try {
      const data = await fetchPointData(lat, lon, level, step);
      setPointData(data);
    } catch (err) {
      console.error('Failed to fetch point data:', err);
    }
  };

  if (panelCollapsed) {
    return (
      <button
        onClick={togglePanel}
        className="fixed top-4 left-4 z-[1000] glass-panel p-2 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
      >
        <PanelLeftOpen size={20} className="text-cyan-400" />
      </button>
    );
  }

  return (
    <div className="fixed top-4 left-4 z-[1000] glass-panel rounded-xl p-4 w-60 select-none">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-cyan-300 tracking-wider uppercase">控制面板</h2>
        <button onClick={togglePanel} className="cursor-pointer hover:bg-white/10 p-1 rounded transition-colors">
          <PanelLeftClose size={16} className="text-cyan-400" />
        </button>
      </div>

      <div className="mb-4">
        <label className="text-xs text-slate-400 mb-2 block flex items-center gap-1">
          <Thermometer size={12} /> 气象变量
        </label>
        <div className="flex flex-col gap-1">
          {VARIABLES.map((v) => (
            <button
              key={v.key}
              onClick={() => { setVariable(v.key); if (v.key === 'wind_speed') setRenderMode('streamline'); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                variable === v.key
                  ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 shadow-[0_0_10px_rgba(0,212,255,0.2)]'
                  : 'bg-white/5 text-slate-400 border border-transparent hover:bg-white/10 hover:text-slate-300'
              }`}
            >
              {v.icon} {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="text-xs text-slate-400 mb-2 block flex items-center gap-1">
          <Layers size={12} /> 高度层
        </label>
        <select
          value={level}
          onChange={(e) => setLevel(Number(e.target.value) as PressureLevel)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300 outline-none focus:border-cyan-500/50 cursor-pointer"
        >
          {LEVELS.map((l) => (
            <option key={l.key} value={l.key} className="bg-slate-800">
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="text-xs text-slate-400 mb-2 block">渲染模式</label>
        <div className="flex gap-1">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setRenderMode(m.key)}
              disabled={variable === 'wind_speed' && m.key === 'contour'}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                renderMode === m.key
                  ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                  : 'bg-white/5 text-slate-400 border border-transparent hover:bg-white/10'
              } ${variable === 'wind_speed' && m.key === 'contour' ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 pt-4">
        <label className="text-xs text-slate-400 mb-2 block flex items-center gap-1">
          <MapPin size={12} /> 坐标查询
        </label>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-[10px] text-slate-500 block mb-1">纬度 °N</label>
            <input
              type="number"
              value={latInput}
              onChange={(e) => { setLatInput(e.target.value); setInputError(''); }}
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-slate-300 outline-none focus:border-cyan-500/50"
              step="0.1"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 block mb-1">经度 °E</label>
            <input
              type="number"
              value={lonInput}
              onChange={(e) => { setLonInput(e.target.value); setInputError(''); }}
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-slate-300 outline-none focus:border-cyan-500/50"
              step="0.1"
            />
          </div>
        </div>
        {inputError && (
          <p className="text-[10px] text-red-400 mb-2">{inputError}</p>
        )}
        <button
          onClick={handleQueryPoint}
          className="w-full flex items-center justify-center gap-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
        >
          <Search size={12} /> 查询
        </button>
      </div>
    </div>
  );
}
