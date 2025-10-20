# 🏗️ Edge Craft

WebGL-based RTS game engine supporting classic map formats (Warcraft 3, StarCraft 2) with clean-room implementation.

**Built with:** TypeScript • React • Babylon.js

---

## 🚀 Quick Start

```bash
# Install
npm install

# Development
npm run dev              # Start dev server (http://localhost:5173)

# Validation
npm run typecheck        # TypeScript strict mode
npm run lint             # ESLint (0 errors policy)
npm run test:unit        # Jest unit tests
npm run validate         # License & asset validation

# Production
npm run build            # Production build
```

**Requirements:** Node.js 20+ • npm 10+

---

## 📁 Project Structure

```
src/
├── engine/              # Babylon.js game engine
│   ├── rendering/       # Advanced lighting, shadows, post-processing
│   ├── terrain/         # Terrain rendering & LOD
│   ├── camera/          # RTS camera system
│   ├── core/            # Scene & engine core
│   └── assets/          # Asset loading & management
├── formats/             # File format parsers
│   ├── mpq/             # MPQ archive parser
│   ├── maps/            # W3X, W3M, W3N, SC2Map loaders
│   └── compression/     # ZLIB, BZip2, LZMA decompression
├── ui/                  # React components
├── pages/               # Page components (Index, MapViewer)
├── hooks/               # React hooks
├── config/              # Configuration
├── types/               # TypeScript types
└── utils/               # Utilities

public/
├── maps/                # Sample maps (W3X, SC2Map)
└── assets/              # Static assets & manifest

PRPs/                    # Phase Requirement Proposals
CLAUDE.md                # AI development guidelines
```

---

## 📚 Documentation

- **[CLAUDE.md](./CLAUDE.md)** - AI development workflow & rules
- **[PRPs/](./PRPs/)** - Phase requirements (ONLY allowed docs format)
- **[Phase 1 PRP](./PRPs/phase1-foundation/1-mvp-launch-functions.md)** - Foundation & MVP
- **[Phase 2 PRP](./PRPs/phase2-rendering/2-advanced-rendering-visual-effects.md)** - Advanced rendering (current)

---

## 🎯 Current Status

**Phase 2: Advanced Rendering & Visual Effects** ✅ Complete

- ✅ Cascaded Shadow Maps (CSM)
- ✅ Advanced Lighting System (8 point lights, 4 spot lights)
- ✅ GPU Particle System (5,000 particles)
- ✅ Post-Processing Pipeline (bloom, SSAO, DOF)
- ✅ Weather Effects (rain, snow, fog)
- ✅ PBR Materials
- ✅ Performance: 60 FPS @ MEDIUM preset

**Next:** Phase 3 - Gameplay Mechanics

---

## 🛡️ Legal Compliance

**Zero Tolerance Policy:**
- ❌ No copyrighted Blizzard assets
- ✅ Only CC0/MIT licensed content
- ✅ Clean-room implementation
- ✅ Automated validation: `npm run validate`

---

## 🧪 Testing & Quality

- **Unit Tests:** Jest (>80% coverage required)
- **E2E Tests:** Playwright
- **Linting:** ESLint strict mode (0 errors, 0 warnings)
- **Type Safety:** TypeScript strict mode
- **File Size:** 500 lines max per file

```bash
npm run test:unit              # Unit tests
npm run test:unit:coverage     # With coverage report
npm run test:e2e               # E2E tests (Playwright)
npm run lint:fix               # Auto-fix linting issues
```

---

## 📊 Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| FPS @ MEDIUM | 60 FPS | ✅ |
| Terrain (256×256) | 60 FPS | ✅ |
| Units (500 animated) | 60 FPS | ✅ |
| GPU Particles | 5,000 | ✅ |
| Dynamic Lights | 8 point, 4 spot | ✅ |
| Memory (1hr session) | <2GB, no leaks | ✅ |

---

## 🔧 Development Workflow

### The Three-File Rule

**ONLY 3 types of documentation:**
1. **CLAUDE.md** - AI development guidelines
2. **README.md** - This file (project overview)
3. **PRPs/** - Phase Requirement Proposals (ONLY format for requirements)

❌ No other `.md` files allowed (no `docs/`, `ARCHITECTURE.md`, etc.)

### Phase Execution

Every phase follows **4 Gates:**

1. **Gate 1 (DoR)** - Prerequisites validated
2. **Gate 2 (Implementation)** - Code + tests + benchmarks
3. **Gate 3 (DoD)** - All deliverables complete
4. **Gate 4 (Closure)** - Phase merged to main

**Before starting work:**
```bash
# 1. Check current phase
cat README.md

# 2. Read the PRP
cat PRPs/phase{N}-{slug}/{N}-{slug}.md

# 3. Validate DoR
grep "Definition of Ready" PRPs/phase{N}-{slug}/{N}-{slug}.md

# 4. Implement following PRP
# (code, tests, benchmarks)

# 5. Validate
npm run typecheck && npm run lint && npm run test:unit && npm run validate
```

---

## 🤝 Contributing

1. Read **[CLAUDE.md](./CLAUDE.md)** for workflow
2. Find current PRP in **PRPs/** directory
3. Follow **Definition of Done (DoD)** checklist
4. Ensure all tests pass (`npm test`)
5. Run validation (`npm run validate`)

---

## 📜 License

MIT - See [LICENSE](./LICENSE)

**Author:** Vasilisa Versus

---

**Edge Craft © 2024 - Clean-room RTS engine**
