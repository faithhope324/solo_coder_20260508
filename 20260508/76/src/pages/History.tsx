import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, Area, AreaChart 
} from 'recharts';
import { ArrowLeft, Calendar, Clock, Users, Gauge as GaugeIcon, Play } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Meeting, WebRtcMetrics } from '../../shared/types';

const API_BASE_URL = 'http://localhost:3004/api';

const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const formatDuration = (start: number, end?: number): string => {
  const ms = (end || Date.now()) - start;
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}小时${minutes % 60}分钟`;
  }
  return `${minutes}分钟${seconds % 60}秒`;
};

const getQualityColor = (score: number): string => {
  if (score >= 80) return 'text-status-good';
  if (score >= 50) return 'text-status-warning';
  return 'text-status-critical';
};

const getQualityBg = (score: number): string => {
  if (score >= 80) return 'bg-status-good/10 border-status-good/30';
  if (score >= 50) return 'bg-status-warning/10 border-status-warning/30';
  return 'bg-status-critical/10 border-status-critical/30';
};

interface TrendDataPoint {
  time: string;
  timestamp: number;
  latency: number;
  jitter: number;
  packetLoss: number;
}

const History: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [metrics, setMetrics] = useState<WebRtcMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<string | 'all'>('all');

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/meetings`);
      const data = await res.json();
      setMeetings(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to fetch meetings:', e);
      setMeetings([]);
    }
    setLoading(false);
  };

  const fetchMetrics = async (meetingId: string, participantId?: string) => {
    setLoadingMetrics(true);
    try {
      const url = participantId && participantId !== 'all'
        ? `${API_BASE_URL}/meetings/${meetingId}/metrics?participantId=${participantId}`
        : `${API_BASE_URL}/meetings/${meetingId}/metrics`;
      const res = await fetch(url);
      const data = await res.json();
      setMetrics(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to fetch metrics:', e);
      setMetrics([]);
    }
    setLoadingMetrics(false);
  };

  const handleSelectMeeting = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setSelectedParticipant('all');
    fetchMetrics(meeting.id);
  };

  const participants = selectedMeeting
    ? [...new Map(metrics.map(m => [m.participantId, m.participantName])).entries()]
    : [];

  const trendData: TrendDataPoint[] = metrics.slice(-100).map(m => ({
    time: new Date(m.timestamp).toLocaleTimeString('zh-CN'),
    timestamp: m.timestamp,
    latency: m.latency,
    jitter: m.jitter,
    packetLoss: m.packetLoss
  }));

  const avgMetrics = metrics.length > 0 ? {
    latency: Math.round(metrics.reduce((s, m) => s + m.latency, 0) / metrics.length),
    jitter: Math.round(metrics.reduce((s, m) => s + m.jitter, 0) / metrics.length),
    packetLoss: (metrics.reduce((s, m) => s + m.packetLoss, 0) / metrics.length).toFixed(2),
    bitrate: Math.round(metrics.reduce((s, m) => s + m.bitrate, 0) / metrics.length)
  } : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-space-900 via-space-800 to-space-900">
      <div 
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="relative z-10">
        <header className="sticky top-0 z-20 bg-space-900/90 backdrop-blur-md border-b border-space-700">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <NavLink
                  to="/"
                  className="p-2 rounded-lg bg-space-700 hover:bg-space-600 text-gray-300 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </NavLink>
                <div>
                  <h1 className="font-display font-bold text-xl text-white tracking-wide">
                    历史会议回顾
                  </h1>
                  <p className="text-xs text-gray-400 font-mono">
                    查看已结束会议的质量数据
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-space-800/80 backdrop-blur-sm rounded-xl border border-space-600 overflow-hidden">
                <div className="p-4 border-b border-space-700">
                  <h2 className="font-semibold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-neon-purple" />
                    会议列表
                  </h2>
                </div>
                
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="w-8 h-8 border-2 border-space-600 border-t-neon-purple rounded-full animate-spin mx-auto" />
                    <p className="text-gray-500 text-sm mt-3">加载中...</p>
                  </div>
                ) : meetings.length === 0 ? (
                  <div className="p-8 text-center">
                    <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">暂无历史会议</p>
                    <p className="text-gray-500 text-xs mt-1">完成的会议将显示在这里</p>
                  </div>
                ) : (
                  <div className="divide-y divide-space-700 max-h-[600px] overflow-y-auto">
                    {meetings.map((meeting) => (
                      <button
                        key={meeting.id}
                        onClick={() => handleSelectMeeting(meeting)}
                        className={cn(
                          'w-full p-4 text-left transition-colors hover:bg-space-700/50',
                          selectedMeeting?.id === meeting.id && 'bg-space-700/50'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {meeting.title}
                            </p>
                            <p className="text-xs text-gray-500 font-mono mt-1">
                              {formatDate(meeting.startTime)}
                            </p>
                          </div>
                          <div className={cn(
                            'px-2 py-1 rounded text-xs font-bold border',
                            getQualityBg(meeting.averageQuality)
                          )}>
                            <span className={getQualityColor(meeting.averageQuality)}>
                              {meeting.averageQuality}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {meeting.endTime ? formatDuration(meeting.startTime, meeting.endTime) : '进行中'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {meeting.participantCount}人
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2">
              {selectedMeeting ? (
                <div className="space-y-6">
                  <div className="bg-space-800/80 backdrop-blur-sm rounded-xl border border-space-600 p-5">
                    <h2 className="font-semibold text-white text-lg mb-4">
                      {selectedMeeting.title}
                    </h2>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-space-900/50 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                          <Calendar className="w-3.5 h-3.5" />
                          开始时间
                        </div>
                        <div className="font-mono text-sm text-white">
                          {formatDate(selectedMeeting.startTime)}
                        </div>
                      </div>
                      <div className="bg-space-900/50 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                          <Clock className="w-3.5 h-3.5" />
                          会议时长
                        </div>
                        <div className="font-mono text-sm text-white">
                          {selectedMeeting.endTime 
                            ? formatDuration(selectedMeeting.startTime, selectedMeeting.endTime)
                            : '进行中'}
                        </div>
                      </div>
                      <div className="bg-space-900/50 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                          <Users className="w-3.5 h-3.5" />
                          参会人数
                        </div>
                        <div className="font-mono text-sm text-white">
                          {selectedMeeting.participantCount} 人
                        </div>
                      </div>
                      <div className={cn('rounded-lg p-3 border', getQualityBg(selectedMeeting.averageQuality))}>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                          <GaugeIcon className="w-3.5 h-3.5" />
                          平均质量
                        </div>
                        <div className={cn('font-display text-2xl font-bold', getQualityColor(selectedMeeting.averageQuality))}>
                          {selectedMeeting.averageQuality}
                        </div>
                      </div>
                    </div>

                    {participants.length > 1 && (
                      <div className="mb-4">
                        <label className="block text-xs text-gray-400 mb-2">选择参会者</label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              setSelectedParticipant('all');
                              fetchMetrics(selectedMeeting.id);
                            }}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                              selectedParticipant === 'all'
                                ? 'bg-neon-cyan text-white'
                                : 'bg-space-700 text-gray-300 hover:bg-space-600'
                            )}
                          >
                            全部
                          </button>
                          {participants.map(([id, name]) => (
                            <button
                              key={id}
                              onClick={() => {
                                setSelectedParticipant(id);
                                fetchMetrics(selectedMeeting.id, id);
                              }}
                              className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                                selectedParticipant === id
                                  ? 'bg-neon-purple text-white'
                                  : 'bg-space-700 text-gray-300 hover:bg-space-600'
                              )}
                            >
                              {name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {avgMetrics && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                        <div className="bg-neon-cyan/10 rounded-lg p-3 border border-neon-cyan/20">
                          <div className="text-xs text-gray-400">平均延迟</div>
                          <div className="font-mono font-bold text-neon-cyan">
                            {avgMetrics.latency} <span className="text-xs">ms</span>
                          </div>
                        </div>
                        <div className="bg-neon-purple/10 rounded-lg p-3 border border-neon-purple/20">
                          <div className="text-xs text-gray-400">平均抖动</div>
                          <div className="font-mono font-bold text-neon-purple">
                            {avgMetrics.jitter} <span className="text-xs">ms</span>
                          </div>
                        </div>
                        <div className="bg-status-warning/10 rounded-lg p-3 border border-status-warning/20">
                          <div className="text-xs text-gray-400">平均丢包</div>
                          <div className="font-mono font-bold text-status-warning">
                            {avgMetrics.packetLoss} <span className="text-xs">%</span>
                          </div>
                        </div>
                        <div className="bg-status-good/10 rounded-lg p-3 border border-status-good/20">
                          <div className="text-xs text-gray-400">平均码率</div>
                          <div className="font-mono font-bold text-status-good">
                            {avgMetrics.bitrate} <span className="text-xs">kbps</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-space-800/80 backdrop-blur-sm rounded-xl border border-space-600 p-5">
                    <h3 className="font-semibold text-white mb-4">指标趋势图</h3>
                    
                    {loadingMetrics ? (
                      <div className="h-80 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-space-600 border-t-neon-purple rounded-full animate-spin" />
                      </div>
                    ) : trendData.length > 0 ? (
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trendData}>
                            <defs>
                              <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="colorJitter" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis 
                              dataKey="time" 
                              stroke="#64748B"
                              fontSize={11}
                              tickLine={false}
                            />
                            <YAxis 
                              stroke="#64748B"
                              fontSize={11}
                              tickLine={false}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#0F172A',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                fontSize: '12px'
                              }}
                              labelStyle={{ color: '#94A3B8' }}
                            />
                            <Legend 
                              wrapperStyle={{ fontSize: '12px' }}
                            />
                            <Area
                              type="monotone"
                              dataKey="latency"
                              stroke="#06B6D4"
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#colorLatency)"
                              name="延迟 (ms)"
                            />
                            <Area
                              type="monotone"
                              dataKey="jitter"
                              stroke="#8B5CF6"
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#colorJitter)"
                              name="抖动 (ms)"
                            />
                            <Line
                              type="monotone"
                              dataKey="packetLoss"
                              stroke="#F59E0B"
                              strokeWidth={2}
                              dot={false}
                              name="丢包率 (%)"
                              yAxisId={0}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-80 flex items-center justify-center">
                        <p className="text-gray-500">暂无指标数据</p>
                      </div>
                    )}
                  </div>

                  {metrics.length > 0 && (
                    <div className="bg-space-800/80 backdrop-blur-sm rounded-xl border border-space-600 overflow-hidden">
                      <div className="p-4 border-b border-space-700">
                        <h3 className="font-semibold text-white">原始数据点 ({metrics.length})</h3>
                      </div>
                      <div className="max-h-64 overflow-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-space-900/50 sticky top-0">
                            <tr className="text-gray-400 text-xs">
                              <th className="text-left p-3 font-medium">时间</th>
                              <th className="text-left p-3 font-medium">参会者</th>
                              <th className="text-right p-3 font-medium">延迟</th>
                              <th className="text-right p-3 font-medium">抖动</th>
                              <th className="text-right p-3 font-medium">丢包</th>
                              <th className="text-right p-3 font-medium">分辨率</th>
                              <th className="text-center p-3 font-medium">状态</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-space-700">
                            {metrics.slice(-50).reverse().map((m, idx) => (
                              <tr key={idx} className="hover:bg-space-700/30">
                                <td className="p-3 text-gray-400 font-mono text-xs">
                                  {new Date(m.timestamp).toLocaleTimeString('zh-CN')}
                                </td>
                                <td className="p-3 text-white font-medium">
                                  {m.participantName}
                                </td>
                                <td className="p-3 text-right font-mono">
                                  <span className={cn(
                                    m.latency >= 300 ? 'text-status-critical' :
                                    m.latency >= 150 ? 'text-status-warning' : 'text-status-good'
                                  )}>
                                    {m.latency}ms
                                  </span>
                                </td>
                                <td className="p-3 text-right font-mono">
                                  <span className={cn(
                                    m.jitter >= 60 ? 'text-status-critical' :
                                    m.jitter >= 30 ? 'text-status-warning' : 'text-status-good'
                                  )}>
                                    {m.jitter}ms
                                  </span>
                                </td>
                                <td className="p-3 text-right font-mono">
                                  <span className={cn(
                                    m.packetLoss >= 5 ? 'text-status-critical' :
                                    m.packetLoss >= 2 ? 'text-status-warning' : 'text-status-good'
                                  )}>
                                    {m.packetLoss.toFixed(2)}%
                                  </span>
                                </td>
                                <td className="p-3 text-right font-mono text-gray-300">
                                  {m.resolution.width}×{m.resolution.height}
                                </td>
                                <td className="p-3 text-center">
                                  <span className={cn(
                                    'inline-block w-2.5 h-2.5 rounded-full',
                                    m.status === 'good' ? 'bg-status-good' :
                                    m.status === 'warning' ? 'bg-status-warning' :
                                    'bg-status-critical animate-pulse'
                                  )} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-space-800/80 backdrop-blur-sm rounded-xl border border-space-600 p-16 text-center">
                  <div className="w-20 h-20 rounded-full bg-space-700/50 flex items-center justify-center mx-auto mb-6">
                    <Play className="w-10 h-10 text-gray-500" />
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2">选择一个会议</h2>
                  <p className="text-gray-400">
                    从左侧列表中选择一个历史会议查看详情
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default History;
