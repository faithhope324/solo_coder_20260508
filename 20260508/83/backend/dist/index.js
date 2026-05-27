"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const ws_1 = require("ws");
const kubernetes_1 = __importDefault(require("./routes/kubernetes"));
const docker_1 = __importDefault(require("./routes/docker"));
const kubernetes_2 = require("./clients/kubernetes");
const docker_2 = require("./clients/docker");
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const wss = new ws_1.WebSocketServer({ server, path: '/ws/events' });
const PORT = process.env.PORT || 3001;
const events = [];
const MAX_EVENTS = 100;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get('/api/events', (req, res) => {
    res.json(events);
});
app.use('/api/k8s', kubernetes_1.default);
app.use('/api/docker', docker_1.default);
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        kubernetes: kubernetes_2.k8sClient.isKubernetesConnected(),
        docker: docker_2.dockerClient.isDockerConnected(),
    });
});
function addEvent(event) {
    events.unshift(event);
    if (events.length > MAX_EVENTS) {
        events.pop();
    }
    broadcastEvent(event);
}
function broadcastEvent(event) {
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            client.send(JSON.stringify(event));
        }
    });
}
kubernetes_2.k8sClient.on('event', (event) => {
    addEvent(event);
});
docker_2.dockerClient.on('event', (event) => {
    addEvent(event);
});
setInterval(() => {
    const randomEvents = [
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
