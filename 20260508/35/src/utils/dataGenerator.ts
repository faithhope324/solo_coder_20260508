import type { CDNNode, NodeStatus } from '../types';

const HISTORY_LENGTH = 10;

export const generateRandomValue = (base: number, variance: number, min = 0, max = 100): number => {
  const change = (Math.random() - 0.5) * variance;
  return Math.max(min, Math.min(max, base + change));
};

export const determineStatus = (latency: number, packetLoss: number): NodeStatus => {
  if (latency > 200 || packetLoss > 3) {
    return 'critical';
  }
  if (latency > 100 || packetLoss > 1) {
    return 'warning';
  }
  return 'healthy';
};

export const updateNodeMetrics = (node: CDNNode): CDNNode => {
  const shouldAnomaly = Math.random() < 0.008;

  const latency = shouldAnomaly
    ? generateRandomValue(node.latency + 120, 60, 50, 500)
    : generateRandomValue(node.latency, 15, 15, 300);

  const packetLoss = shouldAnomaly
    ? generateRandomValue(node.packetLoss + 4, 2, 0, 20)
    : generateRandomValue(node.packetLoss, 0.5, 0, 8);

  const bandwidth = generateRandomValue(node.bandwidth, 6, 10, 95);
  const throughput = generateRandomValue(node.throughput, 40, 100, 1000);
  const availability = generateRandomValue(node.availability, 0.15, 95, 100);
  const cpuUsage = generateRandomValue(node.cpuUsage || 45, 8, 10, 95);
  const memoryUsage = generateRandomValue(node.memoryUsage || 60, 5, 20, 90);
  const connections = generateRandomValue(node.connections || 5000, 500, 500, 50000);
  const qps = generateRandomValue(node.qps || 12000, 1500, 1000, 100000);

  const newHistory = {
    latency: [...node.history.latency.slice(1), latency],
    bandwidth: [...node.history.bandwidth.slice(1), bandwidth],
    packetLoss: [...node.history.packetLoss.slice(1), packetLoss],
  };

  return {
    ...node,
    latency: Math.round(latency * 10) / 10,
    bandwidth: Math.round(bandwidth * 10) / 10,
    packetLoss: Math.round(packetLoss * 100) / 100,
    throughput: Math.round(throughput),
    availability: Math.round(availability * 10) / 10,
    cpuUsage: Math.round(cpuUsage * 10) / 10,
    memoryUsage: Math.round(memoryUsage * 10) / 10,
    connections: Math.round(connections),
    qps: Math.round(qps),
    status: determineStatus(latency, packetLoss),
    lastUpdated: new Date(),
    history: newHistory,
  };
};

export const generateInitialHistory = (baseLatency: number, baseBandwidth: number, basePacketLoss: number) => {
  const latency: number[] = [];
  const bandwidth: number[] = [];
  const packetLoss: number[] = [];

  for (let i = 0; i < HISTORY_LENGTH; i++) {
    latency.push(generateRandomValue(baseLatency, 15, 20, 300));
    bandwidth.push(generateRandomValue(baseBandwidth, 10, 10, 95));
    packetLoss.push(generateRandomValue(basePacketLoss, 0.5, 0, 5));
  }

  return { latency, bandwidth, packetLoss };
};
