import { create } from 'zustand';
import type { WebRtcMetrics, Participant, Meeting } from '../../shared/types';
import { calculateQualityScore } from '../../shared/types';

interface MonitorState {
  currentMeeting: Meeting | null;
  participants: Map<string, Participant>;
  latestMetrics: Map<string, WebRtcMetrics>;
  metricsHistory: Map<string, WebRtcMetrics[]>;
  isConnected: boolean;
  isSimulationRunning: boolean;
  averageQuality: number;
  startTime: number | null;
  
  setCurrentMeeting: (meeting: Meeting | null) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (id: string) => void;
  updateMetrics: (metrics: WebRtcMetrics) => void;
  setConnected: (connected: boolean) => void;
  setSimulationRunning: (running: boolean) => void;
  reset: () => void;
  calculateAverageQuality: () => number;
}

const MAX_HISTORY = 60;

export const useMonitorStore = create<MonitorState>((set, get) => ({
  currentMeeting: null,
  participants: new Map(),
  latestMetrics: new Map(),
  metricsHistory: new Map(),
  isConnected: false,
  isSimulationRunning: false,
  averageQuality: 100,
  startTime: null,

  setCurrentMeeting: (meeting) => set({ 
    currentMeeting: meeting,
    startTime: meeting?.startTime || null
  }),

  addParticipant: (participant) => set((state) => {
    const newParticipants = new Map(state.participants);
    newParticipants.set(participant.id, participant);
    return { participants: newParticipants };
  }),

  removeParticipant: (id) => set((state) => {
    const newParticipants = new Map(state.participants);
    const newMetrics = new Map(state.latestMetrics);
    const newHistory = new Map(state.metricsHistory);
    newParticipants.delete(id);
    newMetrics.delete(id);
    newHistory.delete(id);
    return { 
      participants: newParticipants, 
      latestMetrics: newMetrics,
      metricsHistory: newHistory
    };
  }),

  updateMetrics: (metrics) => set((state) => {
    const newMetrics = new Map(state.latestMetrics);
    const newHistory = new Map(state.metricsHistory);
    
    newMetrics.set(metrics.participantId, metrics);
    
    const history = newHistory.get(metrics.participantId) || [];
    history.push(metrics);
    if (history.length > MAX_HISTORY) {
      history.shift();
    }
    newHistory.set(metrics.participantId, history);
    
    const allMetrics = Array.from(newMetrics.values());
    let avgQuality = 100;
    if (allMetrics.length > 0) {
      avgQuality = Math.round(
        allMetrics.reduce((sum, m) => sum + calculateQualityScore(m), 0) / allMetrics.length
      );
    }
    
    return { 
      latestMetrics: newMetrics, 
      metricsHistory: newHistory,
      averageQuality: avgQuality
    };
  }),

  setConnected: (connected) => set({ isConnected: connected }),

  setSimulationRunning: (running) => set({ isSimulationRunning: running }),

  reset: () => set({
    currentMeeting: null,
    participants: new Map(),
    latestMetrics: new Map(),
    metricsHistory: new Map(),
    isSimulationRunning: false,
    averageQuality: 100,
    startTime: null
  }),

  calculateAverageQuality: () => {
    const state = get();
    const allMetrics = Array.from(state.latestMetrics.values());
    if (allMetrics.length === 0) return 100;
    return Math.round(
      allMetrics.reduce((sum, m) => sum + calculateQualityScore(m), 0) / allMetrics.length
    );
  }
}));
