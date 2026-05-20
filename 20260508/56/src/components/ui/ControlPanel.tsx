import { useState } from 'react';
import { Plus, Trash2, Settings, Globe } from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import type { Planet } from '../../../shared/types';

const planetColors = [
  '#ff6b6b', '#4ecdc4', '#ffe66d', '#ffd700', '#4a90d9',
  '#c1440e', '#e6c229', '#b5b5b5', '#87ceeb', '#daa520',
];

export function ControlPanel() {
  const {
    planets,
    integrator,
    timeStep,
    gravitationalConstant,
    softening,
    isRunning,
    presets,
    updatePlanet,
    removePlanet,
    addPlanet,
    setIntegrator,
    setTimeStep,
    setGravitationalConstant,
    setSoftening,
    loadPreset,
  } = useSimulationStore();

  const [activeTab, setActiveTab] = useState<'planets' | 'settings' | 'presets'>('planets');

  const handleAddPlanet = () => {
    const newPlanet: Planet = {
      id: Date.now().toString(),
      name: `天体 ${planets.length + 1}`,
      mass: 1,
      position: [Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5],
      velocity: [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1],
      color: planetColors[planets.length % planetColors.length],
      radius: 0.1 + Math.random() * 0.2,
    };
    addPlanet(newPlanet);
  };

  return (
    <div className="w-80 h-full glass-panel flex flex-col">
      <div className="p-4 border-b border-planet-blue/20">
        <h2 className="text-xl font-bold text-planet-blue glow-text font-orbitron">
          控制面板
        </h2>
      </div>

      <div className="flex border-b border-planet-blue/20">
        <button
          className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
            activeTab === 'planets'
              ? 'bg-planet-blue/20 text-planet-blue'
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('planets')}
        >
          <Globe className="w-4 h-4 inline mr-1" />
          行星列表
        </button>
        <button
          className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
            activeTab === 'settings'
              ? 'bg-planet-blue/20 text-planet-blue'
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings className="w-4 h-4 inline mr-1" />
          积分设置
        </button>
        <button
          className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
            activeTab === 'presets'
              ? 'bg-planet-blue/20 text-planet-blue'
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('presets')}
        >
          预设
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'planets' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">行星数量: {planets.length}</span>
              <button
                onClick={handleAddPlanet}
                disabled={isRunning}
                className="flex items-center gap-1 px-3 py-1 bg-planet-blue/20 text-planet-blue rounded text-sm hover:bg-planet-blue/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                添加
              </button>
            </div>

            <div className="space-y-3">
              {planets.map((planet) => (
                <PlanetEditor
                  key={planet.id}
                  planet={planet}
                  disabled={isRunning}
                  onUpdate={(updates) => updatePlanet(planet.id, updates)}
                  onRemove={() => removePlanet(planet.id)}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                积分算法
              </label>
              <select
                value={integrator}
                onChange={(e) => setIntegrator(e.target.value as 'rk4' | 'hermite')}
                disabled={isRunning}
                className="w-full px-3 py-2 bg-space-dark border border-planet-blue/30 rounded text-white focus:outline-none focus:border-planet-blue disabled:opacity-50"
              >
                <option value="rk4">Runge-Kutta 4 (RK4)</option>
                <option value="hermite">Hermite</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                时间步长: {timeStep.toFixed(4)}
              </label>
              <input
                type="range"
                min="0.001"
                max="0.1"
                step="0.001"
                value={timeStep}
                onChange={(e) => setTimeStep(parseFloat(e.target.value))}
                disabled={isRunning}
                className="w-full accent-planet-blue disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                引力常数 G: {gravitationalConstant.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={gravitationalConstant}
                onChange={(e) => setGravitationalConstant(parseFloat(e.target.value))}
                disabled={isRunning}
                className="w-full accent-planet-blue disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                软化参数: {softening.toFixed(3)}
              </label>
              <input
                type="range"
                min="0.001"
                max="0.1"
                step="0.001"
                value={softening}
                onChange={(e) => setSoftening(parseFloat(e.target.value))}
                disabled={isRunning}
                className="w-full accent-planet-blue disabled:opacity-50"
              />
            </div>
          </div>
        )}

        {activeTab === 'presets' && (
          <div className="space-y-3">
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => loadPreset(preset)}
                disabled={isRunning}
                className="w-full p-3 text-left bg-space-dark/50 border border-planet-blue/20 rounded hover:border-planet-blue/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-medium text-white">{preset.name}</div>
                <div className="text-xs text-gray-400 mt-1">{preset.description}</div>
                <div className="text-xs text-planet-blue mt-1">
                  {preset.config.planets.length} 个天体 · {preset.config.integrator.toUpperCase()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface PlanetEditorProps {
  planet: Planet;
  disabled: boolean;
  onUpdate: (updates: Partial<Planet>) => void;
  onRemove: () => void;
}

function PlanetEditor({ planet, disabled, onUpdate, onRemove }: PlanetEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-space-dark/50 border border-planet-blue/20 rounded overflow-hidden">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-planet-blue/10 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: planet.color }}
          />
          <span className="font-medium text-white">{planet.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">M: {planet.mass.toFixed(1)}</span>
          {!disabled && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-1 text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 border-t border-planet-blue/20 space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">名称</label>
            <input
              type="text"
              value={planet.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              disabled={disabled}
              className="w-full px-2 py-1 bg-space-dark border border-planet-blue/30 rounded text-sm text-white focus:outline-none focus:border-planet-blue disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">质量</label>
              <input
                type="number"
                value={planet.mass}
                onChange={(e) => onUpdate({ mass: parseFloat(e.target.value) || 0 })}
                disabled={disabled}
                step="0.1"
                min="0.01"
                className="w-full px-2 py-1 bg-space-dark border border-planet-blue/30 rounded text-sm text-white focus:outline-none focus:border-planet-blue disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">半径</label>
              <input
                type="number"
                value={planet.radius}
                onChange={(e) => onUpdate({ radius: parseFloat(e.target.value) || 0 })}
                disabled={disabled}
                step="0.01"
                min="0.01"
                className="w-full px-2 py-1 bg-space-dark border border-planet-blue/30 rounded text-sm text-white focus:outline-none focus:border-planet-blue disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">颜色</label>
            <div className="flex gap-1 flex-wrap">
              {planetColors.map((color) => (
                <button
                  key={color}
                  onClick={() => onUpdate({ color })}
                  disabled={disabled}
                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                    planet.color === color ? 'border-white' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">位置 (X, Y, Z)</label>
            <div className="grid grid-cols-3 gap-1">
              {['X', 'Y', 'Z'].map((axis, i) => (
                <input
                  key={axis}
                  type="number"
                  value={planet.position[i]}
                  onChange={(e) => {
                    const newPos = [...planet.position] as [number, number, number];
                    newPos[i] = parseFloat(e.target.value) || 0;
                    onUpdate({ position: newPos });
                  }}
                  disabled={disabled}
                  step="0.1"
                  className="w-full px-2 py-1 bg-space-dark border border-planet-blue/30 rounded text-sm text-white focus:outline-none focus:border-planet-blue disabled:opacity-50"
                  placeholder={axis}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">速度 (X, Y, Z)</label>
            <div className="grid grid-cols-3 gap-1">
              {['X', 'Y', 'Z'].map((axis, i) => (
                <input
                  key={axis}
                  type="number"
                  value={planet.velocity[i]}
                  onChange={(e) => {
                    const newVel = [...planet.velocity] as [number, number, number];
                    newVel[i] = parseFloat(e.target.value) || 0;
                    onUpdate({ velocity: newVel });
                  }}
                  disabled={disabled}
                  step="0.1"
                  className="w-full px-2 py-1 bg-space-dark border border-planet-blue/30 rounded text-sm text-white focus:outline-none focus:border-planet-blue disabled:opacity-50"
                  placeholder={axis}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
