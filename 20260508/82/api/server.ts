/**
 * local server entry file, for local development
 */
import app from './app.js';
import { TrajectoryWebSocketServer } from './websocket/WebSocketServer.js';

/**
 * start server with port
 */
const PORT = process.env.PORT || 3010;

const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`);
});

/**
 * Initialize WebSocket server for trajectory streaming
 */
const wsServer = new TrajectoryWebSocketServer(server);

/**
 * close server
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  wsServer.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  wsServer.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;