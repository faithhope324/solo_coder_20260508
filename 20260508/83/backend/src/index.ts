import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import kubernetesRoutes from './routes/kubernetes';
import dockerRoutes from './routes/docker';
import { k8sClient } from './clients/kubernetes';
import { dockerClient } from './clients/docker';
import { Event } from './types';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/events' });

const PORT = process.env.PORT || 3001;
const events: Event[] = [];
const MAX_EVENTS = 100;

app.use(cors());
app.use(express.json());

app.get('/api/events', (req, res) => {
  res.json(events);
});

app.use('/api/k8s', kubernetesRoutes);
app.use('/api/docker', dockerRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    kubernetes: k8sClient.isKubernetesConnected(),
    docker: dockerClient.isDockerConnected(),
  });
});

function addEvent(event: Event) {
  events.unshift(event);
  if (events.length > MAX_EVENTS) {
    events.pop();
  }
  broadcastEvent(event);
}

function broadcastEvent(event: Event) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(event));
    }
  });
}

k8sClient.on('event', (event: Event) => {
  addEvent(event);
});

dockerClient.on('event', (event: Event) => {
  addEvent(event);
});

setInterval(() => {
  const randomEvents: Event[] = [
    {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'pod_created',
      message: `模拟 Pod demo-pod-${Math.floor(Math.random() * 100)} 已创建`,
      timestamp: new Date().toISOString(),
      source: 'simulation',
      metadata: { namespace: 'default', nodeName: 'node-1' },
    },
    {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'deployment_scaled',
      message: `模拟 Deployment 已扩缩容到 ${Math.floor(Math.random() * 5) + 1} 个副本`,
      timestamp: new Date().toISOString(),
      source: 'simulation',
      metadata: { deploymentName: 'demo-app', namespace: 'default' },
    },
  ];

  if (Math.random() > 0.7) {
    const event = randomEvents[Math.floor(Math.random() * randomEvents.length)];
    addEvent(event);
  }
}, 10000);

wss.on('connection', (ws) => {
  console.log('WebSocket 客户端已连接');
  ws.send(JSON.stringify({ type: 'connected', message: '事件流已连接' }));

  ws.on('close', () => {
    console.log('WebSocket 客户端已断开');
  });
});

server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`WebSocket 事件流: ws://localhost:${PORT}/ws/events`);
});
