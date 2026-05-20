import { useState } from 'react';
import { Play, Pause, RotateCcw, SkipForward, FastForward, Rewind } from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { simulationSocket } from '../../services/socket';

export function PlaybackControls() {
  const {
    isRunning,
    currentTime,
    speed,
    isConnected,
    showCenterOfMass,
    showOrbits,
    showLabels,
    setIsRunning,
    setSpeed,
    setShowCenterOfMass,
    setShowOrbits,
    setShowLabels,
    resetSimulation,
    getConfig,
  } = useSimulationStore();

  const [isLoading, setIsLoading] = useState(false);

  const handleStartPause = async () => {
    if (isLoading) return;
    
    if (!isRunning) {
      setIsLoading(true);
      try {
        if (!isConnected) {
          await simulationSocket.start(getConfig());
        } else {
          simulationSocket.resume();
        }
        setIsRunning(true);
      } catch (error) {
        console.error('Failed to start simulation:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      simulationSocket.pause();
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    simulationSocket.reset();
    resetSimulation();
  };

  const handleStepOnce = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      if (!isConnected) {
        await simulationSocket.start(getConfig());
        simulationSocket.pause();
        setIsRunning(false);
      }
      await simulationSocket.stepOnce();
    } catch (error) {
      console.error('Failed to step simulation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    simulationSocket.setSpeed(newSpeed);
  };

  const speedOptions = [0.25, 0.5, 1, 2, 4, 8];

  return (
    <div className="glass-panel px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="p-2 rounded bg-space-dark/50 text-gray-300 hover:text-white hover:bg-planet-blue/20 transition-colors"
            title="重置"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => handleSpeedChange(Math.max(0.25, speed / 2))}
            className="p-2 rounded bg-space-dark/50 text-gray-300 hover:text-white hover:bg-planet-blue/20 transition-colors"
            title="减速"
          >
            <Rewind className="w-5 h-5" />
          </button>

          <button
            onClick={handleStartPause}
            disabled={isLoading}
            className="p-3 rounded-full bg-planet-blue text-white hover:bg-planet-blue/80 transition-colors shadow-lg shadow-planet-blue/30 disabled:opacity-50 disabled:cursor-not-allowed"
            title={isRunning ? '暂停' : '开始'}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isRunning ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-0.5" />
            )}
          </button>

          <button
            onClick={() => handleSpeedChange(Math.min(8, speed * 2))}
            className="p-2 rounded bg-space-dark/50 text-gray-300 hover:text-white hover:bg-planet-blue/20 transition-colors"
            title="加速"
          >
            <FastForward className="w-5 h-5" />
          </button>

          <button
            onClick={handleStepOnce}
            disabled={isRunning}
            className="p-2 rounded bg-space-dark/50 text-gray-300 hover:text-white hover:bg-planet-blue/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="单步执行"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">速度:</span>
          <div className="flex gap-1">
            {speedOptions.map((s) => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  speed === s
                    ? 'bg-planet-blue text-white'
                    : 'bg-space-dark/50 text-gray-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-center">
          <div className="text-xs text-gray-400">模拟时间</div>
          <div className="text-lg font-mono text-planet-blue glow-text">
            {currentTime.toFixed(2)}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOrbits}
              onChange={(e) => setShowOrbits(e.target.checked)}
              className="accent-planet-blue"
            />
            <span className="text-sm text-gray-300">轨道</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCenterOfMass}
              onChange={(e) => setShowCenterOfMass(e.target.checked)}
              className="accent-com-green"
            />
            <span className="text-sm text-gray-300">质心</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              className="accent-planet-blue"
            />
            <span className="text-sm text-gray-300">标签</span>
          </label>
        </div>
      </div>
    </div>
  );
}
