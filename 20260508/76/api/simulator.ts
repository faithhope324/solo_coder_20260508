import { v4 as uuidv4 } from 'uuid';
import {
  WebRtcMetrics,
  Participant,
  PARTICIPANT_NAMES,
  calculateStatus,
  DEFAULT_THRESHOLDS
} from '../shared/types.js';

interface ParticipantState {
  participant: Participant;
  baseLatency: number;
  baseJitter: number;
  basePacketLoss: number;
  baseResolution: { width: number; height: number };
  baseBitrate: number;
  instability: number;
  networkEvent: 'none' | 'congestion' | 'recovery' | 'disruption';
  eventDuration: number;
}

export class MetricsSimulator {
  private participants: Map<string, ParticipantState> = new Map();
  private volatility: number = 0.3;

  constructor(initialParticipantCount: number = 5) {
    this.addParticipants(initialParticipantCount);
  }

  private generateBaseValues() {
    return {
      baseLatency: 30 + Math.random() * 80,
      baseJitter: 5 + Math.random() * 15,
      basePacketLoss: Math.random() * 0.5,
      baseResolution: this.randomResolution(),
      baseBitrate: 1500 + Math.random() * 2500,
      instability: 0.2 + Math.random() * 0.4
    };
  }

  private randomResolution() {
    const resolutions = [
      { width: 1920, height: 1080 },
      { width: 1280, height: 720 },
      { width: 854, height: 480 },
      { width: 640, height: 360 }
    ];
    const weights = [0.3, 0.4, 0.2, 0.1];
    const rand = Math.random();
    let sum = 0;
    for (let i = 0; i < resolutions.length; i++) {
      sum += weights[i];
      if (rand < sum) return resolutions[i];
    }
    return resolutions[1];
  }

  addParticipants(count: number): Participant[] {
    const newParticipants: Participant[] = [];
    const usedNames = Array.from(this.participants.values()).map(p => p.participant.name);
    const availableNames = PARTICIPANT_NAMES.filter(name => !usedNames.includes(name));

    for (let i = 0; i < count && availableNames.length > 0; i++) {
      const nameIndex = Math.floor(Math.random() * availableNames.length);
      const name = availableNames.splice(nameIndex, 1)[0];
      const id = uuidv4();
      const baseValues = this.generateBaseValues();

      const participant: Participant = {
        id,
        name,
        joinedAt: Date.now()
      };

      this.participants.set(id, {
        participant,
        ...baseValues,
        networkEvent: 'none',
        eventDuration: 0
      });

      newParticipants.push(participant);
    }

    return newParticipants;
  }

  removeParticipant(id: string): boolean {
    return this.participants.delete(id);
  }

  getParticipants(): Participant[] {
    return Array.from(this.participants.values()).map(ps => ps.participant);
  }

  setVolatility(level: number) {
    this.volatility = Math.max(0, Math.min(1, level));
  }

  private generateNetworkEvent(state: ParticipantState): 'none' | 'congestion' | 'recovery' | 'disruption' {
    if (state.networkEvent !== 'none') {
      state.eventDuration--;
      if (state.eventDuration <= 0) {
        if (state.networkEvent === 'disruption') {
          state.networkEvent = 'recovery';
          state.eventDuration = 30 + Math.floor(Math.random() * 60);
        } else {
          state.networkEvent = 'none';
        }
      }
      return state.networkEvent;
    }

    const eventChance = 0.005 * this.volatility;
    if (Math.random() < eventChance) {
      const eventType = Math.random();
      if (eventType < 0.6) {
        state.networkEvent = 'congestion';
        state.eventDuration = 20 + Math.floor(Math.random() * 40);
      } else {
        state.networkEvent = 'disruption';
        state.eventDuration = 10 + Math.floor(Math.random() * 20);
      }
      return state.networkEvent;
    }

    return 'none';
  }

  private applyVolatility(base: number, maxChange: number, state: ParticipantState): number {
    const event = state.networkEvent;
    let multiplier = 1;
    let changeAmount = maxChange * this.volatility * state.instability;

    if (event === 'congestion') {
      multiplier = 1.5 + Math.random() * 1.5;
    } else if (event === 'disruption') {
      multiplier = 3 + Math.random() * 3;
    } else if (event === 'recovery') {
      multiplier = 0.3;
    }

    const change = (Math.random() - 0.45) * changeAmount * multiplier;
    return Math.max(0, base + change);
  }

  generateMetrics(participantId: string): WebRtcMetrics | null {
    const state = this.participants.get(participantId);
    if (!state) return null;

    this.generateNetworkEvent(state);

    const latency = Math.round(this.applyVolatility(state.baseLatency, 50, state));
    const jitter = Math.round(this.applyVolatility(state.baseJitter, 15, state));
    let packetLoss = Math.round(this.applyVolatility(state.basePacketLoss, 2, state) * 100) / 100;

    if (state.networkEvent === 'disruption') {
      packetLoss = Math.min(30, packetLoss + 5 + Math.random() * 15);
    } else if (state.networkEvent === 'congestion') {
      packetLoss = Math.min(10, packetLoss + 1 + Math.random() * 3);
    }

    let resolution = state.baseResolution;
    let bitrate = state.baseBitrate;

    if (state.networkEvent === 'disruption' || latency > 250 || packetLoss > 3) {
      const resolutions = [
        { width: 1280, height: 720 },
        { width: 854, height: 480 },
        { width: 640, height: 360 }
      ];
      resolution = resolutions[Math.floor(Math.random() * resolutions.length)];
      bitrate *= 0.6 + Math.random() * 0.3;
    } else if (state.networkEvent === 'recovery') {
      resolution = state.baseResolution;
      bitrate = state.baseBitrate;
    }

    const metrics: Omit<WebRtcMetrics, 'status'> = {
      participantId,
      participantName: state.participant.name,
      timestamp: Date.now(),
      packetLoss: Math.round(packetLoss * 100) / 100,
      latency,
      jitter,
      resolution,
      bitrate: Math.round(bitrate)
    };

    const status = calculateStatus(metrics, DEFAULT_THRESHOLDS);

    state.participant.lastMetrics = { ...metrics, status };

    return { ...metrics, status };
  }

  generateAllMetrics(): WebRtcMetrics[] {
    const metrics: WebRtcMetrics[] = [];
    for (const id of this.participants.keys()) {
      const m = this.generateMetrics(id);
      if (m) metrics.push(m);
    }
    return metrics;
  }

  triggerNetworkEvent(participantId: string, eventType: 'congestion' | 'disruption'): boolean {
    const state = this.participants.get(participantId);
    if (!state) return false;

    state.networkEvent = eventType;
    state.eventDuration = eventType === 'disruption' ? 15 : 30;
    return true;
  }

  reset(): void {
    this.participants.clear();
  }
}

export default MetricsSimulator;
