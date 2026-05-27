import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import pako from 'pako';
import { FrameStreamer } from './FrameStreamer.js';
import { MESSAGE_TYPE } from '../../shared/types.js';

export class TrajectoryWebSocketServer {
  private wss: WebSocketServer;
  private frameStreamer: FrameStreamer;
  private httpServer: HttpServer;

  constructor(httpServer: HttpServer) {
    this.httpServer = httpServer;
    this.wss = new WebSocketServer({ noServer: true });
    this.frameStreamer = new FrameStreamer();
    this.setupEventHandlers();
    this.setupUpgradeHandler();
  }

  private setupEventHandlers(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New WebSocket connection established');
      console.log('Total clients:', this.frameStreamer.getClientCount() + 1);

      this.frameStreamer.addClient(ws);

      ws.on('message', async (data: Buffer) => {
        try {
          const messageStr = data.toString('utf8');
          await this.frameStreamer.handleControlMessage(ws, messageStr);
        } catch (error) {
          console.error('Error handling message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed');
        this.frameStreamer.removeClient(ws);
        console.log('Remaining clients:', this.frameStreamer.getClientCount());
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.frameStreamer.removeClient(ws);
      });
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket Server error:', error);
    });
  }

  private setupUpgradeHandler(): void {
    this.httpServer.on('upgrade', (request, socket, head) => {
      const pathname = new URL(request.url || '/', `http://${request.headers.host}`).pathname;

      if (pathname === '/ws') {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });
  }

  private sendError(ws: WebSocket, message: string): void {
    if (ws.readyState === WebSocket.OPEN) {
      const errorData = new TextEncoder().encode(JSON.stringify({ type: 'error', message }));
      const compressed = pako.deflate(errorData);
      
      const headerSize = 9;
      const msg = new Uint8Array(headerSize + compressed.length);
      msg[0] = MESSAGE_TYPE.ERROR;
      
      const view = new DataView(msg.buffer);
      view.setUint32(1, errorData.length, true);
      view.setUint32(5, compressed.length, true);
      msg.set(compressed, headerSize);
      
      ws.send(msg);
    }
  }

  public getFrameStreamer(): FrameStreamer {
    return this.frameStreamer;
  }

  public getWebSocketServer(): WebSocketServer {
    return this.wss;
  }

  public close(): void {
    this.wss.close();
  }

  public getClientCount(): number {
    return this.frameStreamer.getClientCount();
  }
}

export default TrajectoryWebSocketServer;
