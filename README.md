# 🏗️ Edge Craft: WebGL-Based RTS Game Engine

## 🔗 CRITICAL: External Dependencies

Edge Craft requires **TWO external repositories** for full functionality:

### 1. 🌐 Multiplayer Server: [core-edge](https://github.com/uz0/core-edge)
- **Purpose**: Authoritative multiplayer server implementation
- **Required For**: Online gameplay, lobbies, matchmaking
- **Development**: Uses included mock server until integration

### 2. 🎮 Default Launcher: [index.edgecraft](https://github.com/uz0/index.edgecraft)
- **Purpose**: Main menu and launcher map
- **Required For**: **EVERY game session** (loads `/maps/index.edgecraft` on startup)
- **Development**: Uses included mock launcher until integration

> ⚠️ **IMPORTANT**: The game **ALWAYS** loads `/maps/index.edgecraft` on startup. This is not configurable.

## 🎯 Project Vision
Edge Craft is a modern, browser-based RTS game engine that enables users to import, play, and modify maps from classic RTS games while maintaining legal compliance through clean-room implementation and original assets. Built with TypeScript, React, and Babylon.js, it provides a complete ecosystem for RTS game development in the browser.

## 📋 Core Features

### 🎮 Game Engine
- **WebGL Rendering**: Powered by Babylon.js for high-performance 3D graphics
- **Map Compatibility**: Support for StarCraft (*.scm, *.scx, *.SC2Map) and Warcraft 3 (*.w3m, *.w3x) maps
- **Copyright-Free Assets**: Complete replacement with original CC0/MIT licensed models, textures, and sounds
- **Real-Time Multiplayer**: WebSocket-based networking with deterministic lockstep simulation
- **Cross-Platform**: Runs on any device with WebGL support

### 🛠️ Development Tools
- **Visual Map Editor**: Terrain sculpting, unit placement, trigger system
- **Script Transpilers**: JASS → TypeScript, GalaxyScript → TypeScript
- **Asset Pipeline**: glTF 2.0 support with conversion from MDX/M3 formats
- **Visual Scripting**: Blockly-based trigger GUI system

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ and npm
- TypeScript 5.3+
- Git

### Installation

#### Option 1: Basic Setup (with mocks)
```bash
# Clone the repository
git clone https://github.com/your-org/edge-craft.git
cd edge-craft

# Install dependencies
npm install

# Start development server (uses mock server & launcher)
npm run dev

# Open browser to http://localhost:3000
```

#### Verify Your Setup
```bash
# 1. Verify Node version (should be 20+)
node --version

# 2. Run TypeScript type checking
npm run typecheck

# 3. Test production build
npm run build

# 4. Test hot reload
# Start dev server with: npm run dev
# Edit src/App.tsx - changes should auto-refresh in browser
```

#### Option 2: Full Setup (with external repositories)
```bash
# 1. Clone main repository
git clone https://github.com/your-org/edge-craft.git
cd edge-craft

# 2. Run setup script for external dependencies
./scripts/setup-external.sh
# This will prompt to clone:
# - https://github.com/uz0/core-edge
# - https://github.com/uz0/index.edgecraft

# 3. Start core-edge server (Terminal 1)
cd ../core-edge
npm run dev

# 4. Start Edge Craft (Terminal 2)
cd ../edge-craft
npm run dev
```

### Development with Context Engineering
```bash
# Generate a PRP for a new feature
/generate-prp INITIAL.md

# Execute the PRP to implement the feature
/execute-prp PRPs/feature-name.md

# Run specific agents for specialized tasks
/agent babylon-renderer
/agent format-parser
/agent multiplayer-architect
```

## 📁 Project Structure
```
edge-craft/
├── .claude/
│   ├── agents/         # Specialized AI agents for development
│   └── commands/       # Custom commands for common tasks
├── src/
│   ├── engine/         # Core game engine (Babylon.js integration)
│   ├── editor/         # Map editor components
│   ├── formats/        # File format parsers (MPQ, CASC, etc.)
│   ├── gameplay/       # RTS mechanics (pathfinding, combat, etc.)
│   ├── networking/     # Multiplayer infrastructure
│   ├── assets/         # Asset management and loading
│   └── ui/            # React UI components
├── tools/
│   ├── converter/      # Map conversion tools
│   ├── transpiler/     # Script language transpilers
│   └── validator/      # Content validation tools
├── PRPs/              # Project Requirement Proposals
├── tests/             # Test suites
└── docs/              # Documentation
```

## 🔧 Context Engineering Methodology

This project uses Context Engineering to ensure efficient AI-assisted development:

- **CLAUDE.md**: Project-specific instructions for AI assistants
- **INITIAL.md**: Initial context loaded for new conversations
- **PRPs/**: Detailed requirement proposals for each feature
- **.claude/**: Commands and agents for specialized tasks

### Available Commands
- `/generate-prp` - Create comprehensive implementation plans
- `/execute-prp` - Execute implementation from PRP
- `/validate-assets` - Check asset copyright compliance
- `/test-conversion` - Test map format conversion
- `/benchmark-performance` - Run performance tests

### Specialist Agents
- `babylon-renderer` - Babylon.js rendering expert
- `format-parser` - File format specialist (MPQ, CASC, MDX)
- `multiplayer-architect` - Networking and multiplayer systems
- `legal-compliance` - Copyright and DMCA compliance
- `asset-creator` - Original asset generation guidance
- `ui-designer` - React/TypeScript UI components

## 📚 Development Roadmap

Edge Craft follows a phased development roadmap with detailed PRPs (Phase Requirement Proposals). See [PRPs/README.md](./PRPs/README.md) for the complete development plan.

### Current Phase: Phase 2 - Advanced Rendering & Visual Effects
**Status**: ⚠️ 70% Complete | 🔴 3 Critical Issues Blocking Map Rendering
**PRIMARY GOAL**: ALL 24 MAPS (14 w3x, 7 w3n, 3 SC2Map) RENDER CORRECTLY

**✅ Completed (70%)**:
- Post-Processing Pipeline (FXAA, Bloom, Color Grading, Tone Mapping)
- Advanced Lighting System (8 lights @ MEDIUM, distance culling)
- GPU Particle System (5,000 particles @ 60 FPS)
- Weather Effects (Rain, Snow, Fog with smooth transitions)
- PBR Material System (glTF 2.0 compatible)
- Custom Shader Framework (Water, Force Field, Hologram, Dissolve)
- Decal System (50 texture decals @ MEDIUM)
- Minimap RTT (256x256 @ 30fps)
- Quality Preset System (LOW/MEDIUM/HIGH/ULTRA)
- Map Gallery UI (Browse and load 24 maps)
- Map Viewer App (Integrated rendering with Phase 2 effects)
- Legal Asset Library (PRP 2.12: 19 terrain textures, 33 doodad models)

**❌ Critical Issues (30%)**:
1. **Terrain Multi-Texture Splatmap** (P0) - All terrain rendered with single fallback texture
   - Root Cause: `W3XMapLoader.ts:272` passes tileset letter "A" instead of `groundTextureIds` array
   - Solution Required: Implement splatmap shader with 4-8 texture samplers
   - ETA: 2-3 days

2. **Asset Coverage Gap** (P0) - 60% of doodads render as placeholder boxes
   - 56/93 doodad types missing (trees, rocks, plants, structures)
   - Solution Required: Download Kenney.nl asset packs, map 40-50 new models
   - ETA: 4-6 hours

3. **Unit Parser Failures** (P1) - Only 1/342 units parsed (0.3% success rate)
   - Error: `RangeError: Offset is outside bounds` in W3UParser
   - Solution Required: Add version detection, optional field handling
   - ETA: 1-2 days

**Next Steps**: Fix 3 critical issues, validate all 24 maps, create screenshot tests

**Previous Phase: Phase 1 - Foundation (COMPLETE ✅)**
Completion Date: 2025-10-10
Performance: 187 draw calls, 58 FPS, 1842 MB memory

### Phase Overview
| Phase | Name | PRPs | Status |
|-------|------|------|--------|
| **1** | Foundation - MVP Launch | 7 | ✅ **COMPLETE** |
| **2** | Advanced Rendering & Visual Effects | 10 | 🎨 **MAP GALLERY READY** - Browser Validation Pending |
| **3** | Gameplay Mechanics | 11 | ⏳ Pending |
| **5** | File Format Support (Extended) | 4 | ⏳ Pending |
| **9** | Multiplayer Infrastructure | 8 | ⏳ Pending |

### Getting Started with Development
1. Review [PRPs/README.md](./PRPs/README.md) for detailed phase information
2. Check Phase 1 completion: [PRPs/phase1-foundation/README.md](./PRPs/phase1-foundation/README.md)
3. Review Phase 2 planning: [PRPs/phase2-rendering/](./PRPs/phase2-rendering/)
4. Execute PRPs that can run in parallel within the same phase
5. Use specialist agents for domain-specific work

### Phase 1 Achievements
- **Performance**: 60 FPS with 500 animated units + terrain + shadows
- **Draw Calls**: 81.7% reduction (1024 → 187)
- **Memory**: 90% of budget (1842 MB / 2048 MB)
- **Test Coverage**: >80% with 120+ unit tests
- **Legal Compliance**: 100% automated copyright detection

## 🛡️ Legal Compliance

### Clean-Room Implementation
- Zero copyrighted assets in codebase
- All code written from scratch
- Interoperability focus under DMCA Section 1201(f)
- Original assets under CC0/MIT licenses

### Content Policy
- No Blizzard assets included
- Automatic copyright scanning
- DMCA takedown process
- User-generated content moderation

## 🤝 Contributing

Please follow our Context Engineering workflow:

1. **Check PRPs/** for detailed requirements
2. **Use .claude/commands** for common tasks
3. **Run validation gates** before committing
4. **Update documentation** with code changes

### Development Workflow
```bash
# Start a new feature
/generate-prp features/your-feature.md

# Implement with AI assistance
/execute-prp PRPs/your-feature.md

# Validate implementation
npm test
npm run lint
npm run typecheck

# Update documentation
/agent documentation-manager
```

## 🧪 Testing

Edge Craft has comprehensive test coverage:

### Unit Tests (Jest)
```bash
npm test                 # Run all unit tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

### E2E Tests (Playwright)
```bash
npm run test:e2e         # Run all e2e tests
npm run test:e2e:ui      # Interactive UI mode
npm run test:e2e:debug   # Debug mode with browser
```

### All Tests
```bash
npm run test:all         # Run unit + e2e tests
```

See [e2e/README.md](./e2e/README.md) for detailed e2e testing documentation.

## 📄 License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) file for details.

## 🔗 Resources

- [Babylon.js Documentation](https://doc.babylonjs.com/)
- [StormLib Repository](https://github.com/ladislav-zezula/StormLib)
- [CascLib Repository](https://github.com/ladislav-zezula/CascLib)
- [MDX Viewer Reference](https://github.com/flowtsohg/mdx-m3-viewer)

## 🙏 Acknowledgments

- Babylon.js team for the excellent WebGL framework
- StormLib and CascLib contributors
- RTS modding community for inspiration

---

**Edge Craft** - Building the future of browser-based RTS gaming while respecting the legacy of classics.