import React, { useState } from 'react';
import { useMonitorStore } from '../store/useMonitorStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { ParticipantCard } from '../components/ParticipantCard';
import { OverviewCards } from '../components/OverviewCards';
import { ControlPanel } from '../components/ControlPanel';
import { NavLink } from 'react-router-dom';
import { History, Radio } from 'lucide-react';
import { cn } from '../lib/utils';

const Dashboard: React.FC = () => {
  const [volatility, setVolatility] = useState(0.3);
  
  const {
    participants,
    latestMetrics,
    currentMeeting,
    isConnected,
    isSimulationRunning,
    averageQuality,
    startTime
  } = useMonitorStore();

  const { sendControl } = useWebSocket();

  const participantList = Array.from(participants.values());

  const handleStart = (count: number, vol: number) => {
    sendControl('start', { participantCount: count, volatility: vol });
  };

  const handleStop = () => {
    sendControl('stop');
  };

  const handleAddParticipants = (count: number) => {
    sendControl('addParticipants', { count });
  };

  const handleVolatilityChange = (level: number) => {
    setVolatility(level);
    if (isSimulationRunning) {
      sendControl('setVolatility', { level });
    }
  };

  const handleTriggerEvent = (participantId: string, eventType: 'congestion' | 'disruption') => {
    sendControl('triggerEvent', { participantId, eventType });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-space-900 via-space-800 to-space-900">
      <div 
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="relative z-10">
        <header className="sticky top-0 z-20 bg-space-900/90 backdrop-blur-md border-b border-space-700">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center shadow-glow-cyan">
                  <Radio className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-display font-bold text-xl text-white tracking-wide">
                    WebRTC 会议质量监控
                  </h1>
                  {currentMeeting && (
                    <p className="text-xs text-gray-400 font-mono">
                      {currentMeeting.title}
                    </p>
                  )}
                </div>
              </div>

              <NavLink
                to="/history"
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  'bg-space-700 hover:bg-space-600 text-gray-300 hover:text-white'
                )}
              >
                <History className="w-4 h-4" />
                历史会议
              </NavLink>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-6">
            <OverviewCards
              participantCount={participantList.length}
              averageQuality={averageQuality}
              startTime={startTime}
              isConnected={isConnected}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <ControlPanel
                isRunning={isSimulationRunning}
                participantCount={participantList.length}
                onStart={handleStart}
                onStop={handleStop}
                onAddParticipants={handleAddParticipants}
                onVolatilityChange={handleVolatilityChange}
                volatility={volatility}
              />
            </div>

            <div className="lg:col-span-3">
              {isSimulationRunning ? (
                participantList.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-5">
                    {participantList.map((participant) => (
                      <ParticipantCard
                        key={participant.id}
                        participantId={participant.id}
                        participantName={participant.name}
                        metrics={latestMetrics.get(participant.id)}
                        onTriggerEvent={handleTriggerEvent}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-space-800/80 backdrop-blur-sm rounded-xl border border-space-600 p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-space-700 flex items-center justify-center mx-auto mb-4">
                      <Radio className="w-8 h-8 text-gray-500" />
                    </div>
                    <p className="text-gray-400">暂无参会者</p>
                    <p className="text-sm text-gray-500 mt-1">点击左侧"添加参会者"按钮</p>
                  </div>
                )
              ) : (
                <div className="bg-space-800/80 backdrop-blur-sm rounded-xl border border-space-600 p-16 text-center">
                  <div className="w-20 h-20 rounded-full bg-space-700/50 flex items-center justify-center mx-auto mb-6">
                    <Radio className="w-10 h-10 text-gray-500" />
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2">模拟未启动</h2>
                  <p className="text-gray-400 mb-6">
                    设置参会人数和网络波动强度，然后点击"开始"按钮启动模拟
                  </p>
                  <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-status-good" />
                      <span>正常</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-status-warning" />
                      <span>警告</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-status-critical" />
                      <span>严重</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        <footer className="border-t border-space-700 mt-12">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <p className="text-center text-xs text-gray-500 font-mono">
              WebRTC Quality Monitor v1.0 | 数据每秒更新 | 自动持久化到 SQLite
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;
