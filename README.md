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

Edge Craft follows a comprehensive 12-phase development roadmap with 180+ detailed PRPs (Project Requirement Proposals). See [ROADMAP.md](./ROADMAP.md) for the complete development plan.

### Current Phase: Phase 0 - Project Bootstrap
Setting up development environment, build system, and foundational tooling.

### Phase Overview
| Phase | Name | PRPs | Status |
|-------|------|------|--------|
| **0** | Project Bootstrap | 15 | 🟡 In Progress |
| **1** | Core Engine Foundation | 18 | ⏳ Pending |
| **2** | Rendering Pipeline | 16 | ⏳ Pending |
| **3** | Terrain System | 14 | ⏳ Pending |
| **4** | Asset Pipeline | 12 | ⏳ Pending |
| **5** | File Format Support | 15 | ⏳ Pending |
| **6** | Game Logic Core | 16 | ⏳ Pending |
| **7** | UI Framework | 14 | ⏳ Pending |
| **8** | Editor Tools | 18 | ⏳ Pending |
| **9** | Multiplayer Infrastructure | 17 | ⏳ Pending |
| **10** | Advanced Features | 15 | ⏳ Pending |
| **11** | Polish & Optimization | 12 | ⏳ Pending |

### Getting Started with Development
1. Review [ROADMAP.md](./ROADMAP.md) for detailed phase information
2. Check PRPs in `PRPs/phase0-bootstrap/` for current tasks
3. Execute PRPs that can run in parallel within the same phase
4. Use specialist agents for domain-specific work

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