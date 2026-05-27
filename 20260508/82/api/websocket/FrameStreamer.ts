import type { WebSocket } from 'ws';
import { LAMMPSSimulator } from '../trajectory/LAMMPSSimulator.js';
import { Compressor } from '../compression/Compressor.js';
import { ATOM_TYPES, MESSAGE_TYPE } from '../../shared/types.js';
import type { FrameData, MetaMessage, ControlMessage } from '../../shared/types.js';

export interface ClientState {
  ws: WebSocket;
  isPlaying: boolean;
  currentFrame: number;
  speed: number;
  lastFrameTime: number;
  frameInterval: number;
  compressor: Compressor;
  atomTypeIds: Int32Array;
}

export class FrameStreamer {
  private simulator: LAMMPSSimulator;
  private clients: Map<WebSocket, ClientState> = new Map();
  private frameDataCache: Map<number, FrameData> = new Map();
  private isCaching: boolean = true;
  private cacheComplete: boolean = false;
  private pregeneratePromise: Promise<void> | null = null;

  constructor() {
    this.simulator = new LAMMPSSimulator();
    setTimeout(() => {
      this.pregeneratePromise = this.pregenerateFrames();
    }, 100);
  }

  private async pregenerateFrames(): Promise<void> {
    console.log('Starting trajectory pregeneration...');
    const config = this.simulator.getConfig();
    const totalFrames = Math.floor(config.totalFrames / config.writeInterval);

    for (let i = 0; i < totalFrames; i++) {
      for (let j = 0; j < config.writeInterval; j++) {
        this.simulator.step();
      }
      const frameData = this.simulator.getFrameData();
      this.frameDataCache.set(frameData.frame, frameData);

      if (i % 10 === 0) {
        console.log(`Pregenerated ${i + 1}/${totalFrames} frames`);
        await new Promise((resolve) => setTimeout(resolve, 2));
      }
    }

    this.cacheComplete = true;
    console.log(`Pregeneration complete. Cached ${this.frameDataCache.size} frames.`);
    this.simulator.reset();
  }

  public addClient(ws: WebSocket): void {
    const config = this.simulator.getConfig();
    const atomCount = config.atomCount;
    const compressor = new Compressor(atomCount);

    const clientState: ClientState = {
      ws,
      isPlaying: false,
      currentFrame: 0,
      speed: 1,
      lastFrameTime: 0,
      frameInterval: 50,
      compressor,
      atomTypeIds: this.simulator.getAtomTypeIds(),
    };

    this.clients.set(ws, clientState);
    this.sendMeta(ws);
  }

  public removeClient(ws: WebSocket): void {
    this.clients.delete(ws);
  }

  private sendMeta(ws: WebSocket): void {
    const config = this.simulator.getConfig();
    const totalFrames = Math.floor(config.totalFrames / config.writeInterval);

    const atomTypesList = config.atomTypes.map((id) => {
      const type = Object.values(ATOM_TYPES).find((t) => t.id === id);
      return {
        id: type?.id || id,
        name: type?.name || 'Unknown',
        color: type?.color || '#888888',
        radius: type?.radius || 0.5,
      };
    });

    const metaMessage: MetaMessage = {
      type: 'meta',
      atomCount: config.atomCount,
      totalFrames,
      boxSize: config.boxSize as [number, number, number],
      atomTypes: atomTypesList,
      timestep: config.timestep * config.writeInterval,
      systemName: config.systemName,
    };

    const metaJson = JSON.stringify(metaMessage);
    const metaData = new TextEncoder().encode(metaJson);
    const compressed = Compressor.compress(metaData);
    const message = new Uint8Array(9 + compressed.length);
    message[0] = MESSAGE_TYPE.META;
    const view = new DataView(message.buffer);
    view.setUint32(1, metaData.length, true);
    view.setUint32(5, compressed.length, true);
    message.set(compressed, 9);

    ws.send(message);
  }

  public async handleControlMessage(ws: WebSocket, data: string): Promise<void> {
    const client = this.clients.get(ws);
    if (!client) return;

    try {
      const message: ControlMessage = JSON.parse(data);

      switch (message.type) {
        case 'init':
          client.compressor.reset();
          client.currentFrame = 0;
          this.sendFrame(ws, 0);
          break;

        case 'play':
          client.isPlaying = true;
          client.lastFrameTime = Date.now();
          this.streamFrames(ws);
          break;

        case 'pause':
          client.isPlaying = false;
          break;

        case 'seek':
          if (message.frame !== undefined) {
            client.currentFrame = Math.max(0, message.frame);
            client.compressor.reset();
            this.sendFrame(ws, client.currentFrame);
          }
          break;

        case 'speed':
            if (message.speed !== undefined) {
            client.speed = Math.max(0.25, Math.min(8, message.speed));
            client.frameInterval = 50 / client.speed;
          }
          break;
      }
    } catch (error) {
      console.error('Error parsing control message:', error);
    }
  }

  private getFrameData(frameIndex: number): FrameData | null {
    const config = this.simulator.getConfig();
    const absoluteFrame = frameIndex * config.writeInterval;

    if (this.cacheComplete && this.frameDataCache.has(absoluteFrame)) {
      return this.frameDataCache.get(absoluteFrame)!;
    }

    if (this.isCaching && this.frameDataCache.has(absoluteFrame)) {
      return this.frameDataCache.get(absoluteFrame)!;
    }

    this.simulator.seekToFrame(absoluteFrame);
    return this.simulator.getFrameData();
  }

  private sendFrame(ws: WebSocket, frameIndex: number): boolean {
    const client = this.clients.get(ws);
    if (!client) return false;

    const frameData = this.getFrameData(frameIndex);
    if (!frameData) return false;

    const frameDataWithLogicalIndex: FrameData = {
      ...frameData,
      frame: frameIndex,
    };

    const isKeyFrame = frameIndex === 0 || frameIndex % 30 === 0;
    const useDelta = !isKeyFrame;

    if (isKeyFrame) {
      client.compressor.reset();
    }

    const result = client.compressor.compressFrame(frameDataWithLogicalIndex, useDelta);

    if (ws.readyState === ws.OPEN) {
      ws.send(result.message);
      return true;
    }

    return false;
  }

  private async streamFrames(ws: WebSocket): Promise<void> {
    const client = this.clients.get(ws);
    if (!client) return;

    const config = this.simulator.getConfig();
    const totalFrames = Math.floor(config.totalFrames / config.writeInterval);

    while (client.isPlaying && ws.readyState === ws.OPEN) {
      const now = Date.now();
      const elapsed = now - client.lastFrameTime;

      if (elapsed >= client.frameInterval) {
        const success = this.sendFrame(ws, client.currentFrame);

        if (success) {
          client.currentFrame++;
          if (client.currentFrame >= totalFrames) {
            client.currentFrame = 0;
            client.compressor.reset();
          }
        }

        client.lastFrameTime = now;
      }

      await new Promise((resolve) => setTimeout(resolve, 1));
    }
  }

  public getSimulator(): LAMMPSSimulator {
    return this.simulator;
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public getCachedFrameCount(): number {
    return this.frameDataCache.size;
  }

  public isCacheComplete(): boolean {
    return this.cacheComplete;
  }

  public async waitForCache(): Promise<void> {
    if (this.pregeneratePromise) {
      await this.pregeneratePromise;
    }
  }
}

export default FrameStreamer;
