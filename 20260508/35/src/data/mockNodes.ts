import type { CDNNode } from '../types';
import { determineStatus, generateInitialHistory } from '../utils/dataGenerator';

const nodeConfigs = [
  { id: 'us-east', name: '弗吉尼亚', location: '美国东部', region: '北美', lat: 38.72, lng: -77.98, baseLatency: 45, baseBandwidth: 65, basePacketLoss: 0.3 },
  { id: 'us-west', name: '加利福尼亚', location: '美国西部', region: '北美', lat: 36.77, lng: -119.41, baseLatency: 55, baseBandwidth: 72, basePacketLoss: 0.2 },
  { id: 'us-central', name: '德克萨斯', location: '美国中部', region: '北美', lat: 31.96, lng: -99.90, baseLatency: 40, baseBandwidth: 58, basePacketLoss: 0.25 },
  { id: 'brazil', name: '圣保罗', location: '巴西', region: '南美', lat: -23.55, lng: -46.63, baseLatency: 85, baseBandwidth: 48, basePacketLoss: 0.8 },
  { id: 'uk', name: '伦敦', location: '英国', region: '欧洲', lat: 51.50, lng: -0.12, baseLatency: 35, baseBandwidth: 78, basePacketLoss: 0.15 },
  { id: 'germany', name: '法兰克福', location: '德国', region: '欧洲', lat: 50.11, lng: 8.68, baseLatency: 38, baseBandwidth: 82, basePacketLoss: 0.1 },
  { id: 'france', name: '巴黎', location: '法国', region: '欧洲', lat: 48.85, lng: 2.35, baseLatency: 42, baseBandwidth: 70, basePacketLoss: 0.2 },
  { id: 'netherlands', name: '阿姆斯特丹', location: '荷兰', region: '欧洲', lat: 52.36, lng: 4.90, baseLatency: 36, baseBandwidth: 75, basePacketLoss: 0.18 },
  { id: 'singapore', name: '新加坡', location: '新加坡', region: '亚太', lat: 1.35, lng: 103.82, baseLatency: 65, baseBandwidth: 68, basePacketLoss: 0.4 },
  { id: 'japan', name: '东京', location: '日本', region: '亚太', lat: 35.67, lng: 139.65, baseLatency: 70, baseBandwidth: 72, basePacketLoss: 0.35 },
  { id: 'korea', name: '首尔', location: '韩国', region: '亚太', lat: 37.56, lng: 126.97, baseLatency: 68, baseBandwidth: 70, basePacketLoss: 0.3 },
  { id: 'india', name: '孟买', location: '印度', region: '亚太', lat: 19.07, lng: 72.87, baseLatency: 90, baseBandwidth: 55, basePacketLoss: 0.9 },
  { id: 'australia', name: '悉尼', location: '澳大利亚', region: '亚太', lat: -33.86, lng: 151.20, baseLatency: 85, baseBandwidth: 60, basePacketLoss: 0.5 },
  { id: 'uae', name: '迪拜', location: '阿联酋', region: '中东', lat: 25.20, lng: 55.27, baseLatency: 75, baseBandwidth: 52, basePacketLoss: 0.6 },
  { id: 'south-africa', name: '约翰内斯堡', location: '南非', region: '非洲', lat: -26.20, lng: 28.04, baseLatency: 110, baseBandwidth: 45, basePacketLoss: 1.2 },
  { id: 'canada', name: '多伦多', location: '加拿大', region: '北美', lat: 43.65, lng: -79.38, baseLatency: 48, baseBandwidth: 62, basePacketLoss: 0.3 },
  { id: 'mexico', name: '墨西哥城', location: '墨西哥', region: '北美', lat: 19.43, lng: -99.13, baseLatency: 75, baseBandwidth: 50, basePacketLoss: 0.7 },
  { id: 'russia', name: '莫斯科', location: '俄罗斯', region: '欧洲', lat: 55.75, lng: 37.61, baseLatency: 80, baseBandwidth: 58, basePacketLoss: 0.65 },
];

export const createInitialNodes = (): CDNNode[] => {
  return nodeConfigs.map(config => {
    const history = generateInitialHistory(config.baseLatency, config.baseBandwidth, config.basePacketLoss);
    const latency = history.latency[history.latency.length - 1];
    const packetLoss = history.packetLoss[history.packetLoss.length - 1];
    const bandwidth = history.bandwidth[history.bandwidth.length - 1];

    return {
      id: config.id,
      name: config.name,
      location: config.location,
      region: config.region,
      lat: config.lat,
      lng: config.lng,
      latency: Math.round(latency * 10) / 10,
      bandwidth: Math.round(bandwidth * 10) / 10,
      packetLoss: Math.round(packetLoss * 100) / 100,
      availability: Math.round((99.5 + Math.random() * 0.5) * 10) / 10,
      throughput: Math.round(300 + Math.random() * 500),
      cpuUsage: Math.round((35 + Math.random() * 30) * 10) / 10,
      memoryUsage: Math.round((45 + Math.random() * 25) * 10) / 10,
      connections: Math.round(2000 + Math.random() * 8000),
      qps: Math.round(5000 + Math.random() * 15000),
      status: determineStatus(latency, packetLoss),
      lastUpdated: new Date(),
      history,
    };
  });
};
