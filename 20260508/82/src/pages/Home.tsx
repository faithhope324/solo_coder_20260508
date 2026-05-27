import { useEffect } from 'react';
import Visualizer3D from '@/components/Visualizer3D';
import PlaybackControls from '@/components/PlaybackControls';
import PhysicsCharts from '@/components/PhysicsCharts';
import StatusBar from '@/components/StatusBar';
import ControlPanel from '@/components/ControlPanel';
import useWebSocket from '@/hooks/useWebSocket';
import useTrajectoryStore from '@/store/useTrajectoryStore';

export default function Home() {
  const { connectionStatus, error } = useTrajectoryStore();
  useWebSocket('ws://localhost:3010/ws');

  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        <ControlPanel />

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="absolute top-4 left-4 z-10">
            {connectionStatus === 'connecting' && (
              <div className="px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg backdrop-blur-sm">
                <span className="text-yellow-400 text-sm font-medium">正在连接到模拟服务器...</span>
              </div>
            )}
            {connectionStatus === 'error' && (
              <div className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg backdrop-blur-sm">
                <span className="text-red-400 text-sm font-medium">连接错误: {error || '无法连接到服务器'}</span>
              </div>
            )}
          </div>

          <div className="flex-1 relative">
            <Visualizer3D />
          </div>
        </div>

        <div className="w-[350px] h-full border-l border-cyan-500/20 bg-slate-900/50">
          <PhysicsCharts />
        </div>
      </div>

      <PlaybackControls />
      <StatusBar />
    </div>
  );
}