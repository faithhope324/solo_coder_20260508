import { createServer } from 'http';
import app from './app.js';
import { WebRtcMonitorServer } from './websocket.js';
import { init as initDb, shutdown as shutdownDb } from './db.js';

const START_PORT = parseInt(process.env.PORT || '3004');
const maxRetries = 10;
let currentPort = START_PORT;

console.log('[Init] Starting WebRTC Monitor Server...');

await initDb();
const server = createServer(app);
const monitorServer = new WebRtcMonitorServer(server);

setInterval(() => {
  // Keep process alive
}, 2147483647);

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE' && currentPort < START_PORT + maxRetries) {
    currentPort++;
    server.listen(currentPort);
  } else {
    console.error('[Error]', err);
    process.exit(1);
  }
});

server.on('listening', () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║  WebRTC Monitor Server: http://localhost:${currentPort}          ║
  ╚═══════════════════════════════════════════════════════════╝`);
});

process.on('SIGTERM', () => {
  monitorServer.shutdown();
  shutdownDb();
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  monitorServer.shutdown();
  shutdownDb();
  server.close(() => process.exit(0));
});

server.listen(currentPort);
console.log('[Init] Ready.');
