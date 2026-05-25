import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import { MetricsSimulator } from './simulator.js';
import { createMeeting, endMeeting, insertMetrics } from './db.js';
import type { WsMessage, Meeting, WebRtcMetrics, Participant } from '../shared/types.js';
import { calculateQualityScore } from '../shared/types.js';

interface Client {
  ws: WebSocket;
  id: string;
}

export class WebRtcMonitorServer {
  private wss: WebSocketServer;
  private simulator: MetricsSimulator;
  private clients: Map<string, Client> = new Map();
  private broadcastInterval: NodeJS.Timeout | null = null;
  private currentMeeting: Meeting | null = null;
  private metricsBuffer: WebRtcMetrics[] = [];
  private qualityScores: number[] = [];
  private isRunning: boolean = false;

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws',
      verifyClient: (_info, callback) => {
        callback(true);
      }
    });
    this.simulator = new MetricsSimulator(5);
    this.setupConnectionHandler();
  }

  private setupConnectionHandler() {
    this.wss.on('connection', (ws, req) => {
      const clientId = Math.random().toString(36).substring(2, 10);
      const client: Client = { ws, id: clientId };
      this.clients.set(clientId, client);

      console.log(`Client connected: ${clientId}, total: ${this.clients.size}`);
      console.log(`  Remote address: ${req.socket.remoteAddress}`);
      console.log(`  User-Agent: ${req.headers['user-agent']?.substring(0, 100)}`);
      console.log(`  WS readyState on connect: ${ws.readyState}`);

      if (this.currentMeeting) {
        this.sendToClient(ws, {
          type: 'meetingStarted',
          data: this.currentMeeting,
          timestamp: Date.now()
        });

        const participants = this.simulator.getParticipants();
        participants.forEach(p => {
          if (p.lastMetrics) {
            this.sendToClient(ws, {
              type: 'metrics',
              data: p.lastMetrics,
              timestamp: Date.now()
            });
          }
        });
      }

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString()) as WsMessage;
          this.handleClientMessage(clientId, message);
        } catch (e) {
          console.error('Error parsing message:', e);
        }
      });

      ws.on('close', (code, reason) => {
        this.clients.delete(clientId);
        console.log(`Client disconnected: ${clientId}, code: ${code}, reason: ${reason.toString()}, total: ${this.clients.size}`);
      });

      ws.on('error', (error) => {
        console.error(`Client ${clientId} error:`, error.message);
        console.error(`  Error type: ${error.name}`);
        this.clients.delete(clientId);
      });
    });
  }

  private handleClientMessage(clientId: string, message: WsMessage) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'control':
        this.handleControlMessage(client, message.data);
        break;
    }
  }

  private handleControlMessage(client: Client, data: any) {
    const { action, params } = data || {};

    switch (action) {
      case 'start':
        this.startSimulation(params?.participantCount || 5, params?.volatility || 0.3);
        break;

      case 'stop':
        this.stopSimulation();
        break;

      case 'setVolatility':
        this.simulator.setVolatility(params?.level || 0.3);
        break;

      case 'addParticipants':
        const newParticipants = this.simulator.addParticipants(params?.count || 1);
        newParticipants.forEach(p => {
          this.broadcast({
            type: 'participantJoined',
            data: p,
            timestamp: Date.now()
          });
        });
        if (this.currentMeeting) {
          this.currentMeeting.participantCount = this.simulator.getParticipants().length;
        }
        break;

      case 'removeParticipant':
        this.simulator.removeParticipant(params?.id);
        this.broadcast({
          type: 'participantLeft',
          data: { id: params?.id },
          timestamp: Date.now()
        });
        if (this.currentMeeting) {
          this.currentMeeting.participantCount = this.simulator.getParticipants().length;
        }
        break;

      case 'triggerEvent':
        this.simulator.triggerNetworkEvent(params?.participantId, params?.eventType);
        break;
    }
  }

  startSimulation(participantCount: number = 5, volatility: number = 0.3) {
    if (this.isRunning) return;

    this.simulator.reset();
    this.simulator.setVolatility(volatility);
    const participants = this.simulator.addParticipants(participantCount);

    this.currentMeeting = createMeeting(
      `WebRTC 会议 - ${new Date().toLocaleString('zh-CN')}`,
      participantCount
    );

    this.metricsBuffer = [];
    this.qualityScores = [];
    this.isRunning = true;

    this.broadcast({
      type: 'meetingStarted',
      data: { ...this.currentMeeting, participants },
      timestamp: Date.now()
    });

    this.broadcastInterval = setInterval(() => {
      const metrics = this.simulator.generateAllMetrics();
      
      metrics.forEach(m => {
        this.metricsBuffer.push(m);
        const score = calculateQualityScore(m);
        this.qualityScores.push(score);
      });

      metrics.forEach(m => {
        this.broadcast({
          type: 'metrics',
          data: m,
          timestamp: Date.now()
        });
      });

      if (this.currentMeeting && this.metricsBuffer.length > 0) {
        this.currentMeeting.averageQuality = Math.round(
          this.qualityScores.reduce((a, b) => a + b, 0) / this.qualityScores.length
        );
      }
    }, 1000);

    const dbSaveInterval = setInterval(() => {
      if (!this.currentMeeting || this.metricsBuffer.length === 0) return;
      
      const toSave = [...this.metricsBuffer];
      this.metricsBuffer = [];
      
      toSave.forEach(m => {
        if (this.currentMeeting) {
          insertMetrics(this.currentMeeting.id, m);
        }
      });

      if (!this.isRunning) {
        clearInterval(dbSaveInterval);
      }
    }, 5000);

    console.log('Simulation started with', participantCount, 'participants');
  }

  stopSimulation() {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }

    if (this.currentMeeting) {
      this.metricsBuffer.forEach(m => {
        if (this.currentMeeting) {
          insertMetrics(this.currentMeeting.id, m);
        }
      });
      this.metricsBuffer = [];

      const avgQuality = this.qualityScores.length > 0
        ? Math.round(this.qualityScores.reduce((a, b) => a + b, 0) / this.qualityScores.length)
        : 0;

      endMeeting(this.currentMeeting.id, avgQuality);

      this.broadcast({
        type: 'meetingEnded',
        data: { ...this.currentMeeting, averageQuality: avgQuality, endTime: Date.now() },
        timestamp: Date.now()
      });
    }

    this.currentMeeting = null;
    console.log('Simulation stopped');
  }

  private broadcast(message: WsMessage) {
    const data = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    });
  }

  private sendToClient(ws: WebSocket, message: WsMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  getCurrentMeeting(): Meeting | null {
    return this.currentMeeting;
  }

  getParticipants(): Participant[] {
    return this.simulator.getParticipants();
  }

  isSimulationRunning(): boolean {
    return this.isRunning;
  }

  getClientCount(): number {
    return this.clients.size;
  }

  shutdown() {
    this.stopSimulation();
    this.wss.close();
  }
}

export default WebRtcMonitorServer;
