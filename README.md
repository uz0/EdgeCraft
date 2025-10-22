# 🏗️ Edge Craft

WebGL-based RTS game engine supporting classic map formats (Warcraft 3, StarCraft 2) with clean-room implementation.

**Built with:** TypeScript • React • Babylon.js

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

## 📚 Documentation

- **[CLAUDE.md](./CLAUDE.md)** - AI development workflow & rules
- **[PRPs/](./PRPs/)** - Product requirements

## 🛡️ Legal Compliance

**Zero Tolerance Policy:**
- ❌ No copyrighted assets
- ✅ Only CC0/MIT licensed content
- ✅ Clean-room implementation
- ✅ Automated validation: `npm run validate`

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

## 🤝 Contributing

1. Read **[CLAUDE.md](./CLAUDE.md)** for workflow
2. Find current PRP in **PRPs/** directory
3. Follow **Definition of Done (DoD)** checklist
4. Ensure all tests pass (`npm test`)
5. Run validation (`npm run validate`)


## 🙏 Credits

### Asset Authors

**Terrain Textures:**
- [Poly Haven](https://polyhaven.com) - CC0 terrain textures (grass, dirt, rock, snow, ice, lava, etc.)

**3D Models:**
- [Quaternius](https://quaternius.com) - CC0 doodad models (trees, rocks, plants)
- [Kenney](https://kenney.nl) - CC0 structural models (crates, fences, buildings)

### Technical Resources

**Map Format Specifications:**
- [ChiefOfGxBxL](https://github.com/ChiefOfGxBxL) - WC3 Map Specification ([WC3MapSpecification](https://github.com/ChiefOfGxBxL/WC3MapSpecification))
- [Luashine](https://github.com/Luashine) - v12 Reforged terrain format discovery ([PR #11](https://github.com/ChiefOfGxBxL/WC3MapSpecification/pull/11))

**Libraries:**
- [Babylon.js](https://www.babylonjs.com) - 3D rendering engine (Apache 2.0)
- [React](https://reactjs.org) - UI framework (MIT)
- [TypeScript](https://www.typescriptlang.org) - Type-safe JavaScript (Apache 2.0)

See full attribution in asset manifest: `public/assets/manifest.json`

## 📜 License

**GNU Affero General Public License v3.0 (AGPL-3.0)**

Copyright (C) 2024 Vasilisa Versus

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, version 3.

**Key Requirements:**
- ✅ Must preserve copyright and author attribution
- ✅ Must provide source code to network users
- ✅ Must release modifications under AGPL-3.0
- ✅ Cannot use in proprietary software

See [LICENSE](./LICENSE) for full text.
