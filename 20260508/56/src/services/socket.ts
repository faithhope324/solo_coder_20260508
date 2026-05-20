import { io, Socket } from 'socket.io-client';
import type { SimulationConfig, TimeStepData } from '../../shared/types';

class SimulationSocket {
  private socket: Socket | null = null;
  private onStepCallback: ((data: TimeStepData) => void) | null = null;
  private onErrorCallback: ((message: string) => void) | null = null;
  private connectPromise: Promise<void> | null = null;

  connect(): Promise<void> {
    if (this.socket?.connected) {
      return Promise.resolve();
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = new Promise((resolve, reject) => {
      const serverUrl = import.meta.env.DEV ? 'http://localhost:3001' : '/';
      
      this.socket = io(serverUrl, {
        transports: ['websocket'],
      });

      this.socket.on('connect', () => {
        console.log('Connected to simulation server');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        this.connectPromise = null;
        reject(error);
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from simulation server');
        this.connectPromise = null;
      });

      this.socket.on('step', (data: TimeStepData) => {
        this.onStepCallback?.(data);
      });

      this.socket.on('error', (data: { message: string }) => {
        this.onErrorCallback?.(data.message);
      });
    });

    return this.connectPromise;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectPromise = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  async start(config: SimulationConfig): Promise<void> {
    if (!this.socket?.connected) {
      await this.connect();
    }
    this.socket?.emit('start', { config });
  }

  pause(): void {
    if (this.socket?.connected) {
      this.socket.emit('pause');
    }
  }

  resume(): void {
    if (this.socket?.connected) {
      this.socket.emit('resume');
    }
  }

  reset(): void {
    if (this.socket?.connected) {
      this.socket.emit('reset');
    }
  }

  setSpeed(speed: number): void {
    if (this.socket?.connected) {
      this.socket.emit('setSpeed', { speed });
    }
  }

  async stepOnce(): Promise<void> {
    if (!this.socket?.connected) {
      await this.connect();
    }
    this.socket?.emit('stepOnce');
  }

  onStep(callback: (data: TimeStepData) => void): void {
    this.onStepCallback = callback;
  }

  onError(callback: (message: string) => void): void {
    this.onErrorCallback = callback;
  }
}

export const simulationSocket = new SimulationSocket();
