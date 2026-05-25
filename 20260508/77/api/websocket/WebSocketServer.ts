import { WebSocketServer as WSServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import type { Transaction, StatsData, DetectionRatePoint, WebSocketMessage } from '../types';
import { TransactionSimulator } from '../services/TransactionSimulator';
import { IsolationForest, createTrainedModel } from '../services/IsolationForest';

const MAX_HISTORY = 20;
const TRANSACTIONS_PER_SECOND = 10;
const STATS_UPDATE_INTERVAL = 5000;
const DETECTION_RATE_INTERVAL = 10000;
const MAX_DETECTION_POINTS = 60;

export class WebSocketServer {
  private wss: WSServer;
  private simulator: TransactionSimulator;
  private model: IsolationForest;
  private clients: Set<WebSocket> = new Set();
  private transactionHistory: Transaction[] = [];
  private totalTransactions: number = 0;
  private fraudCount: number = 0;
  private totalFraudAmount: number = 0;
  private detectionRateHistory: DetectionRatePoint[] = [];
  private intervalTimers: NodeJS.Timeout[] = [];
  private windowTransactions: number = 0;
  private windowFraud: number = 0;

  constructor(server: HttpServer) {
    this.model = createTrainedModel();
    this.simulator = new TransactionSimulator(this.model);

    this.wss = new WSServer({ server, path: '/ws' });

    this.wss.on('connection', (ws) => {
      this.handleConnection(ws);
    });

    this.initializeDetectionRateHistory();
    this.startTransactionStream();
    this.startStatsUpdates();
    this.startDetectionRateUpdates();
  }

  private initializeDetectionRateHistory(): void {
    const now = new Date();
    for (let i = MAX_DETECTION_POINTS - 1; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 10000);
      this.detectionRateHistory.push({
        time: time.toLocaleTimeString('en-US', { hour12: false }),
        rate: 0,
        count: 0,
      });
    }
  }

  private handleConnection(ws: WebSocket): void {
    this.clients.add(ws);

    const historyMsg: WebSocketMessage = {
      type: 'history',
      data: [...this.transactionHistory],
    };
    ws.send(JSON.stringify(historyMsg));

    const statsMsg: WebSocketMessage = {
      type: 'stats',
      data: this.getCurrentStats(),
    };
    ws.send(JSON.stringify(statsMsg));

    const rateMsg: WebSocketMessage = {
      type: 'detectionRate',
      data: [...this.detectionRateHistory],
    };
    ws.send(JSON.stringify(rateMsg));

    ws.on('close', () => {
      this.clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.clients.delete(ws);
    });
  }

  private broadcast(message: WebSocketMessage): void {
    const data = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  private getCurrentStats(): StatsData {
    return {
      totalTransactions: this.totalTransactions,
      fraudCount: this.fraudCount,
      detectionRate: this.totalTransactions > 0 ? this.fraudCount / this.totalTransactions : 0,
      totalFraudAmount: this.totalFraudAmount,
    };
  }

  private startTransactionStream(): void {
    const interval = setInterval(() => {
      const transactions = this.simulator.generateBatch(TRANSACTIONS_PER_SECOND);

      for (const tx of transactions) {
        this.totalTransactions++;
        this.windowTransactions++;

        if (tx.isFraud) {
          this.fraudCount++;
          this.windowFraud++;
          this.totalFraudAmount += tx.amount;
        }

        this.transactionHistory.unshift(tx);
        if (this.transactionHistory.length > MAX_HISTORY) {
          this.transactionHistory.pop();
        }

        const msg: WebSocketMessage = {
          type: 'transaction',
          data: tx,
        };
        this.broadcast(msg);
      }
    }, 1000);

    this.intervalTimers.push(interval);
  }

  private startStatsUpdates(): void {
    const interval = setInterval(() => {
      const msg: WebSocketMessage = {
        type: 'stats',
        data: this.getCurrentStats(),
      };
      this.broadcast(msg);
    }, STATS_UPDATE_INTERVAL);

    this.intervalTimers.push(interval);
  }

  private startDetectionRateUpdates(): void {
    const interval = setInterval(() => {
      const now = new Date();
      const rate = this.windowTransactions > 0 ? this.windowFraud / this.windowTransactions : 0;

      const newPoint: DetectionRatePoint = {
        time: now.toLocaleTimeString('en-US', { hour12: false }),
        rate: Math.round(rate * 10000) / 100,
        count: this.windowFraud,
      };

      this.detectionRateHistory.push(newPoint);
      if (this.detectionRateHistory.length > MAX_DETECTION_POINTS) {
        this.detectionRateHistory.shift();
      }

      this.windowTransactions = 0;
      this.windowFraud = 0;

      const msg: WebSocketMessage = {
        type: 'detectionRate',
        data: [...this.detectionRateHistory],
      };
      this.broadcast(msg);
    }, DETECTION_RATE_INTERVAL);

    this.intervalTimers.push(interval);
  }

  public close(): void {
    for (const timer of this.intervalTimers) {
      clearInterval(timer);
    }

    for (const client of this.clients) {
      client.close();
    }

    this.wss.close();
  }
}
