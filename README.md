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
├── PRPs/              # Project Requirement Proposals (ONLY place for requirements docs)
└── tests/             # Test suites
```

## 🧪 Testing

**Test Coverage**: 170+ test cases, > 95% code coverage

### Test Suites
```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test suites
npm test -- MapPreviewExtractor.comprehensive
npm test -- MapPreviewGenerator.comprehensive
npm test -- TGADecoder.comprehensive
npm test -- AllMapsPreviewValidation

# Run map preview tests
npm test -- --testPathPattern="MapPreview|AllMapsPreview|TGADecoder"
```

### Test Coverage by Component
- **MapPreviewExtractor**: 100% (40+ tests) - Embedded/generated preview extraction
- **MapPreviewGenerator**: 100% (30+ tests) - Babylon.js terrain rendering
- **TGADecoder**: 100% (25+ tests) - TGA format decoding
- **Integration**: 72+ tests across all 6 maps (1 W3X, 2 W3M, 3 SC2)
- **Visual Validation**: Browser-based Chrome DevTools tests

See [PRPs/map-preview-and-basic-rendering.md](PRPs/map-preview-and-basic-rendering.md) for detailed test specifications.

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

Edge Craft follows a phased development roadmap with detailed PRPs (Phase Requirement Proposals). See the PRPs/ directory for all phase documentation.

### Current Phase: Phase 2 - Advanced Rendering & Visual Effects
**Status**: 🔴 **BLOCKED** - Map file extraction broken
**PRIMARY GOAL**: ALL 24 MAPS (14 w3x, 7 w3n, 3 SC2Map) RENDER CORRECTLY

**✅ Rendering Systems Complete (70%)**:
- Post-Processing Pipeline (FXAA, Bloom, Color Grading, Tone Mapping)
- Advanced Lighting System (8 lights @ MEDIUM, distance culling)
- GPU Particle System (5,000 particles @ 60 FPS)
- Weather Effects (Rain, Snow, Fog with smooth transitions)
- PBR Material System (glTF 2.0 compatible)
- Custom Shader Framework (Water, Force Field, Hologram, Dissolve)
- Decal System (50 texture decals @ MEDIUM)
- Minimap RTT (256x256 @ 30fps)
- Quality Preset System (LOW/MEDIUM/HIGH/ULTRA)
- Map Gallery UI (Browse and load 6 maps)
- Map Viewer App (Integrated rendering with Phase 2 effects)
- Legal Asset Library (PRP 2.12: 19 terrain textures, 33 doodad models)

**🔴 CRITICAL BLOCKERS** (P0 - Validation discovered Oct 14, 2025):
1. **MPQ Multi-Compression Support** (P0) - Maps cannot extract critical files
   - Missing: SPARSE (0x20), ADPCM_MONO (0x40), ADPCM_STEREO (0x80) decompression
   - Impact: 3/3 maps tested fail extraction → placeholder data (0 doodads, 0 units)
   - Files: `src/formats/mpq/MPQParser.ts`, `decompressors/`
   - Solution: Implement missing decompressors or integrate StormJS fallback
   - ETA: 3-5 days

2. **Huffman Decompression Bug** (P0) - war3map.w3i extraction fails
   - Error: "Invalid distance in Huffman stream"
   - Impact: Cannot load map info (dimensions, tileset, players)
   - File: `src/formats/mpq/decompressors/HuffmanDecompressor.ts:112`
   - Solution: Fix Huffman stream parsing logic, add bounds checking
   - ETA: 1-2 days

**⚠️ Cannot Validate Phase 2 Systems**:
- ❌ Multi-texture terrain (no terrain data extracted from war3map.w3e)
- ❌ 97% doodad coverage (no doodad data extracted from war3map.doo)
- ❌ Unit parser success rate (no unit data extracted from war3mapUnits.doo)
- ❌ Performance targets (FPS meaningless on empty placeholder terrain)

**Status**: Phase 2 validation HALTED until MPQ decompression blockers resolved

**Validation Report**: See `PRPs/phase2-rendering/2.13-complete-map-validation-closure.md` for detailed findings

**Next Steps**: Create PRP 2.14 "MPQ Multi-Compression Support", resolve blockers, re-run validation

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
1. Review PRPs/ directory for detailed phase information
2. Check current phase status in README.md
3. Review active PRPs:
   - [Map Format Parsers and Loaders](PRPs/map-format-parsers-and-loaders.md)
   - [Map Preview and Basic Rendering](PRPs/map-preview-and-basic-rendering.md)
   - [Bootstrap Development Environment](PRPs/bootstrap-development-environment.md)
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

## ⚠️ Known Issues & Future Work

### W3U Parser (war3mapUnits.doo) - Reforged Format Limitation

**Current Status**: Custom parser achieves 2.3% success rate (8/342 units) due to Reforged format incompatibility.

**Issue**: Blizzard added skinId field (4 bytes) + padding (12 bytes) in Warcraft 3 v1.32 Reforged **WITHOUT incrementing version number**. Both our custom parser and the popular `wc3maptranslator` library (v4.0.4) fail with the same error:

```
RangeError: The value of "offset" is out of range. It must be >= 0 and <= 38766. Received 38769
```

**Current Solution**:
- Integrated `wc3maptranslator` library with fallback to custom W3UParser
- Custom parser improved with:
  - Enhanced Reforged format detection (16-byte alignment check)
  - Opportunistic skinId reading with validation
  - Graceful handling of trailing fields

**Recommended Future Work** (P1 - Post Phase 2):
1. **Fork wc3maptranslator**: Create `@edgecraft/wc3maptranslator` fork
   - Add Reforged skinId support (4 bytes)
   - Add Reforged padding handling (12 bytes)
   - Submit upstream PR to `wc3maptranslator` maintainers
2. **Test with multiple Reforged maps**: Validate fix across various map versions
3. **Update integration**: Switch W3XMapLoader to use forked library

**Files**:
- `src/formats/maps/w3x/W3UParser.ts` - Custom parser (improved but still limited)
- `src/formats/maps/w3x/W3XMapLoader.ts:180-215` - Integration code
- `node_modules/wc3maptranslator` - External library (also fails on Reforged)

**Impact**: Units in Reforged maps render as placeholder boxes until parser is fixed. Game is still playable but with limited visual fidelity.

---

## 🔗 Resources

- [Babylon.js Documentation](https://doc.babylonjs.com/)
- [StormLib Repository](https://github.com/ladislav-zezula/StormLib)
- [CascLib Repository](https://github.com/ladislav-zezula/CascLib)
- [MDX Viewer Reference](https://github.com/flowtsohg/mdx-m3-viewer)
- [wc3maptranslator](https://github.com/ChiefOfGxBxL/WC3MapTranslator) - W3X format parser (needs Reforged fix)

## 🙏 Acknowledgments

- Babylon.js team for the excellent WebGL framework
- StormLib and CascLib contributors
- RTS modding community for inspiration

---

**Edge Craft** - Building the future of browser-based RTS gaming while respecting the legacy of classics.