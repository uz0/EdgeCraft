/**
 * MOCK MULTIPLAYER SERVER
 *
 * ⚠️ This is a simplified mock for local development only.
 * Production uses: https://github.com/uz0/core-edge
 */

import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { GameRoom } from './rooms/GameRoom';
import { LobbyRoom } from './rooms/LobbyRoom';
import express from 'express';
import cors from 'cors';

// Configuration
const PORT = process.env.MOCK_SERVER_PORT || 2567;
const IS_MOCK = true;

// Create express app
const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    mock: IS_MOCK,
    message: 'This is a MOCK server. Use core-edge for production.',
    coreEdge: 'https://github.com/uz0/core-edge'
  });
});

// Mock authentication endpoint
app.post('/auth', (req, res) => {
  const { username } = req.body;

  // Mock authentication - always succeeds in development
  res.json({
    success: true,
    token: `mock-token-${username}-${Date.now()}`,
    userId: `mock-user-${Math.random().toString(36).substr(2, 9)}`,
    warning: 'Mock authentication - core-edge required for production'
  });
});

// Create Colyseus server
const gameServer = new Server({
  transport: new WebSocketTransport({
    server: app.listen(PORT)
  })
});

// Register room handlers
gameServer.define('lobby', LobbyRoom);
gameServer.define('game', GameRoom);

// Startup message
console.log(`
╔════════════════════════════════════════════════════════╗
║                  MOCK MULTIPLAYER SERVER                ║
║                                                         ║
║  ⚠️  This is a DEVELOPMENT MOCK                         ║
║                                                         ║
║  For production multiplayer features, use:             ║
║  https://github.com/uz0/core-edge                      ║
║                                                         ║
║  Mock server running on: http://localhost:${PORT}      ║
╚════════════════════════════════════════════════════════╝
`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\\nShutting down mock server...');
  gameServer.gracefullyShutdown();
  process.exit(0);
});

export { gameServer };