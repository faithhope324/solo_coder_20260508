import { useEffect } from 'react';
import { SimulationScene } from './components/three/SimulationScene';
import { ControlPanel } from './components/ui/ControlPanel';
import { PlaybackControls } from './components/ui/PlaybackControls';
import { DataPanel } from './components/ui/DataPanel';
import { simulationSocket } from './services/socket';
import { useSimulationStore } from './store/useSimulationStore';
import type { TimeStepData, PresetScene } from '../shared/types';

function App() {
  const {
    setCurrentStepData,
    setIsConnected,
    setPresets,
  } = useSimulationStore();

  useEffect(() => {
    simulationSocket.onStep((data: TimeStepData) => {
      setCurrentStepData(data);
    });

    simulationSocket.onError((message: string) => {
      console.error('Simulation error:', message);
    });

    fetch('/api/presets')
      .then(res => res.json())
      .then((presets: PresetScene[]) => {
        setPresets(presets);
      })
      .catch(console.error);

    return () => {
      simulationSocket.disconnect();
    };
  }, [setCurrentStepData, setPresets]);

  useEffect(() => {
    const checkConnection = setInterval(() => {
      setIsConnected(simulationSocket.isConnected());
    }, 1000);

    return () => clearInterval(checkConnection);
  }, [setIsConnected]);

  return (
    <div className="w-full h-full flex flex-col bg-space-dark overflow-hidden">
      <header className="h-14 glass-panel flex items-center justify-between px-6 border-b border-planet-blue/20 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-planet-blue to-energy-orange animate-pulse-slow" />
          <h1 className="text-xl font-bold text-white font-orbitron glow-text">
            天体力学 N 体模拟系统
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              simulationSocket.isConnected() ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
            }`} />
            <span className="text-xs text-gray-400">
              {simulationSocket.isConnected() ? '已连接' : '未连接'}
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <ControlPanel />
        
        <main className="flex-1 flex flex-col relative">
          <div className="flex-1 relative">
            <SimulationScene />
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 z-10">
            <PlaybackControls />
          </div>
        </main>

        <DataPanel />
      </div>
    </div>
  );
}

export default App;
