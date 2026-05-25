export interface WebRtcMetrics {
  participantId: string;
  participantName: string;
  timestamp: number;
  packetLoss: number;
  latency: number;
  jitter: number;
  resolution: {
    width: number;
    height: number;
  };
  bitrate: number;
  status: 'good' | 'warning' | 'critical';
}

export interface Meeting {
  id: string;
  title: string;
  startTime: number;
  endTime?: number;
  participantCount: number;
  averageQuality: number;
}

export interface ThresholdConfig {
  packetLoss: { warning: number; critical: number };
  latency: { warning: number; critical: number };
  jitter: { warning: number; critical: number };
  resolution: { warning: number; critical: number };
}

export type WsMessageType = 
  | 'metrics' 
  | 'participantJoined' 
  | 'participantLeft' 
  | 'meetingStarted' 
  | 'meetingEnded'
  | 'control';

export interface WsMessage {
  type: WsMessageType;
  data: any;
  timestamp: number;
}

export interface Participant {
  id: string;
  name: string;
  lastMetrics?: WebRtcMetrics;
  joinedAt: number;
}

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  packetLoss: { warning: 2, critical: 5 },
  latency: { warning: 150, critical: 300 },
  jitter: { warning: 30, critical: 60 },
  resolution: { warning: 720, critical: 480 }
};

export const PARTICIPANT_NAMES = [
  '张伟', '李娜', '王强', '刘芳', '陈明',
  '杨洋', '赵丽', '周杰', '吴敏', '郑涛',
  '孙琳', '马超', '朱婷', '胡军', '林雪'
];

export function calculateStatus(
  metrics: Omit<WebRtcMetrics, 'status'>,
  thresholds: ThresholdConfig = DEFAULT_THRESHOLDS
): 'good' | 'warning' | 'critical' {
  const isCritical = 
    metrics.packetLoss >= thresholds.packetLoss.critical ||
    metrics.latency >= thresholds.latency.critical ||
    metrics.jitter >= thresholds.jitter.critical ||
    metrics.resolution.height <= thresholds.resolution.critical;

  if (isCritical) return 'critical';

  const isWarning = 
    metrics.packetLoss >= thresholds.packetLoss.warning ||
    metrics.latency >= thresholds.latency.warning ||
    metrics.jitter >= thresholds.jitter.warning ||
    metrics.resolution.height <= thresholds.resolution.warning;

  if (isWarning) return 'warning';

  return 'good';
}

export function calculateQualityScore(
  metrics: Omit<WebRtcMetrics, 'status'>,
  thresholds: ThresholdConfig = DEFAULT_THRESHOLDS
): number {
  let score = 100;

  if (metrics.packetLoss >= thresholds.packetLoss.critical) score -= 40;
  else if (metrics.packetLoss >= thresholds.packetLoss.warning) score -= 20;
  else score -= metrics.packetLoss * 2;

  if (metrics.latency >= thresholds.latency.critical) score -= 30;
  else if (metrics.latency >= thresholds.latency.warning) score -= 15;
  else score -= Math.max(0, (metrics.latency - 50) * 0.1);

  if (metrics.jitter >= thresholds.jitter.critical) score -= 20;
  else if (metrics.jitter >= thresholds.jitter.warning) score -= 10;
  else score -= Math.max(0, (metrics.jitter - 10) * 0.3);

  if (metrics.resolution.height < thresholds.resolution.critical) score -= 10;
  else if (metrics.resolution.height < thresholds.resolution.warning) score -= 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}
