# Mock Multiplayer Server

## ⚠️ IMPORTANT: This is a MOCK implementation

**For production multiplayer functionality, use the official core-edge server:**
- Repository: https://github.com/uz0/core-edge
- Documentation: https://github.com/uz0/core-edge/wiki

## Purpose
This mock server provides minimal multiplayer functionality for local development and testing without requiring the full core-edge server setup.

## Features
- Basic Colyseus room creation
- Simple state synchronization
- Mock authentication
- Local testing capabilities

## Setup
```bash
# This mock runs automatically with the main dev server
npm run dev

# To run standalone mock server
npm run mock:server
```

## Limitations
- No persistence
- No real authentication
- Maximum 4 concurrent connections
- No replay system
- No matchmaking

## Migration to core-edge
When ready for production multiplayer:

1. Clone core-edge repository:
```bash
git clone https://github.com/uz0/core-edge ../core-edge
cd ../core-edge
npm install
```

2. Update environment variables:
```bash
# .env
MULTIPLAYER_SERVER=http://localhost:2567  # core-edge default port
```

3. Start core-edge server:
```bash
cd ../core-edge
npm run dev
```

4. Update client configuration:
```typescript
// src/config/external.ts
const MULTIPLAYER_CONFIG = {
  endpoint: process.env.NODE_ENV === 'production'
    ? 'wss://core-edge.edgecraft.game'
    : 'ws://localhost:2567'
};
```

## Mock Server Structure
```
multiplayer-server/
├── index.ts           # Mock server entry
├── rooms/
│   ├── GameRoom.ts   # Basic game room
│   └── LobbyRoom.ts  # Lobby implementation
├── schemas/
│   └── GameState.ts  # State schema
└── README.md         # This file
```

## Testing
```bash
# Run mock server tests
npm run test:mock-server

# Integration tests with client
npm run test:multiplayer
```

## Important Notes
- This mock is for development only
- All multiplayer PRPs must reference core-edge
- Production deployment requires core-edge integration
- Mock data is not persistent between restarts