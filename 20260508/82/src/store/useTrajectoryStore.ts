import { create } from 'zustand';
import type { MetaMessage, FrameData, ControlMessage } from '../../shared/types.js';

export interface PhysicsDataPoint {
  frame: number;
  temperature: number;
  potentialEnergy: number;
  kineticEnergy: number;
  time: number;
}

export interface TrajectoryState {
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  meta: MetaMessage | null;
  currentFrame: number;
  currentFrameData: FrameData | null;
  positions: Float32Array | null;
  previousPositions: Float32Array | null;
  isPlaying: boolean;
  playbackSpeed: number;
  physicsHistory: PhysicsDataPoint[];
  maxHistoryLength: number;
  fps: number;
  compressionRatio: number;
  totalBytesReceived: number;
  lastFrameTime: number;
  error: string | null;
  sendMessage: ((message: ControlMessage) => void) | null;
}

export interface TrajectoryActions {
  setConnectionStatus: (status: TrajectoryState['connectionStatus']) => void;
  setMeta: (meta: MetaMessage) => void;
  setCurrentFrame: (frame: number) => void;
  setCurrentFrameData: (data: FrameData, positions: Float32Array) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  addPhysicsData: (point: PhysicsDataPoint) => void;
  updateFps: () => void;
  setCompressionRatio: (ratio: number) => void;
  addBytesReceived: (bytes: number) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  seekToFrame: (frame: number) => void;
  setSendMessage: (fn: ((message: ControlMessage) => void) | null) => void;
  play: () => void;
  pause: () => void;
  seek: (frame: number) => void;
  setSpeed: (speed: number) => void;
}

const initialState: TrajectoryState = {
  connectionStatus: 'disconnected',
  meta: null,
  currentFrame: 0,
  currentFrameData: null,
  positions: null,
  previousPositions: null,
  isPlaying: false,
  playbackSpeed: 1,
  physicsHistory: [],
  maxHistoryLength: 200,
  fps: 0,
  compressionRatio: 0,
  totalBytesReceived: 0,
  lastFrameTime: 0,
  error: null,
  sendMessage: null,
};

export const useTrajectoryStore = create<TrajectoryState & TrajectoryActions>((set, get) => ({
  ...initialState,

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  setMeta: (meta) => set({ meta }),

  setCurrentFrame: (frame) => set({ currentFrame: frame }),

  setCurrentFrameData: (data, positions) => {
    const { previousPositions: prevPos } = get();
    set({
      currentFrameData: data,
      currentFrame: data.frame,
      positions,
      previousPositions: prevPos || positions,
      lastFrameTime: performance.now(),
    });
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),

  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  addPhysicsData: (point) => {
    const { physicsHistory, maxHistoryLength } = get();
    const newHistory = [...physicsHistory, point];
    if (newHistory.length > maxHistoryLength) {
      newHistory.shift();
    }
    set({ physicsHistory: newHistory });
  },

  updateFps: () => {
    const { lastFrameTime } = get();
    if (lastFrameTime > 0) {
      const now = performance.now();
      const delta = now - lastFrameTime;
      if (delta > 0) {
        const fps = 1000 / delta;
        set({ fps });
      }
    }
  },

  setCompressionRatio: (ratio) => set({ compressionRatio: ratio }),

  addBytesReceived: (bytes) => {
    const { totalBytesReceived } = get();
    set({ totalBytesReceived: totalBytesReceived + bytes });
  },

  setError: (error) => set({ error }),

  reset: () => set({
    currentFrame: 0,
    currentFrameData: null,
    positions: null,
    previousPositions: null,
    isPlaying: false,
    physicsHistory: [],
    fps: 0,
    totalBytesReceived: 0,
    lastFrameTime: 0,
    error: null,
  }),

  seekToFrame: (frame) => {
    set({
      currentFrame: frame,
      previousPositions: null,
    });
  },

  setSendMessage: (fn) => set({ sendMessage: fn }),

  play: () => {
    const { sendMessage, setIsPlaying } = get();
    if (sendMessage) {
      sendMessage({ type: 'play' });
      setIsPlaying(true);
    }
  },

  pause: () => {
    const { sendMessage, setIsPlaying } = get();
    if (sendMessage) {
      sendMessage({ type: 'pause' });
      setIsPlaying(false);
    }
  },

  seek: (frame) => {
    const { sendMessage, seekToFrame } = get();
    if (sendMessage) {
      sendMessage({ type: 'seek', frame });
      seekToFrame(frame);
    }
  },

  setSpeed: (speed) => {
    const { sendMessage, setPlaybackSpeed } = get();
    if (sendMessage) {
      sendMessage({ type: 'speed', speed });
      setPlaybackSpeed(speed);
    }
  },
}));

export default useTrajectoryStore;
