# Mock Launcher Map

## ⚠️ IMPORTANT: This is a MOCK implementation

**For the full launcher experience, use the official index.edgecraft:**
- Repository: https://github.com/uz0/index.edgecraft
- Features: Advanced UI, network features, map browser, user profiles

## Purpose
This mock launcher provides minimal menu functionality for local development without requiring the full index.edgecraft repository.

## Features (Mock Only)
- Basic main menu
- Single player game start
- Settings placeholder
- Map list (static)
- Exit button

## File Structure
```
launcher-map/
├── index.edgecraft     # Mock launcher map file
├── manifest.json       # Map metadata
├── scripts/
│   └── launcher.ts     # Basic UI logic
├── assets/
│   ├── ui/            # Minimal UI assets
│   └── sounds/        # Basic sound effects
└── README.md          # This file
```

## Map Format
```json
{
  "format": "edgecraft",
  "version": "1.0.0",
  "name": "Edge Craft Launcher (Mock)",
  "description": "Simplified launcher for development",
  "author": "Edge Craft Team",
  "type": "launcher",
  "autoLoad": true,
  "repository": "https://github.com/uz0/index.edgecraft"
}
```

## Integration

### Default Loading
The game ALWAYS loads `/maps/index.edgecraft` on startup:

```typescript
// src/engine/MapLoader.ts
class MapLoader {
  async loadDefaultMap(): Promise<void> {
    const launcherPath = '/maps/index.edgecraft';

    // In development, use mock
    const mapUrl = process.env.NODE_ENV === 'development'
      ? './mocks/launcher-map/index.edgecraft'
      : 'https://cdn.edgecraft.game/maps/index.edgecraft';

    await this.loadMap(mapUrl);
  }
}
```

## Development vs Production

### Development (This Mock)
- Simple HTML/CSS menu
- Basic button navigation
- Static map list
- No network features
- Instant loading

### Production (index.edgecraft)
- Advanced 3D menu scene
- Dynamic map browser
- User authentication
- Multiplayer lobby
- Statistics and profiles
- Map ratings and comments
- Auto-update system

## Setup Instructions

### For Mock Development
```bash
# Mock is included in main repo
npm run dev
# Launcher loads automatically
```

### For Full Launcher Development
```bash
# 1. Clone index.edgecraft
git clone https://github.com/uz0/index.edgecraft ../index.edgecraft

# 2. Build launcher
cd ../index.edgecraft
npm install
npm run build

# 3. Link to main project
cd ../edgecraft
npm run link:launcher ../index.edgecraft/dist

# 4. Start with full launcher
npm run dev:full-launcher
```

## Creating Custom Launcher
To create your own launcher map:

1. Fork https://github.com/uz0/index.edgecraft
2. Modify the launcher UI and features
3. Build and test locally
4. Submit PR for review

## Important Notes
- **EVERY game session starts with index.edgecraft**
- Mock launcher is for basic development only
- Network features require full index.edgecraft
- Production deployment must use official launcher
- Custom launchers must maintain compatibility

## Testing
```bash
# Test mock launcher
npm run test:launcher

# Verify auto-load
npm run test:startup

# Integration test
npm run test:launcher-integration
```

## Migration Path
When ready to use full launcher:

1. Ensure index.edgecraft is cloned and built
2. Update environment configuration
3. Test with full launcher locally
4. Deploy with CDN reference

## References
- Launcher Repo: https://github.com/uz0/index.edgecraft
- Documentation: https://github.com/uz0/index.edgecraft/wiki
- Examples: https://github.com/uz0/index.edgecraft/tree/main/examples