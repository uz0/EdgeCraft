# PRP: Map Preview and Basic Rendering

## 🎯 Goal
Implement basic map rendering with terrain, doodads, and automated map preview generation for Map Gallery UI. Focus on visual correctness, not gameplay.

**Value**: Users can browse and preview RTS maps before playing
**Goal**: Render all 6 maps correctly with terrain textures, doodads, and camera controls

---

## 📌 Status
- **State**: 🔴 Blocked
- **Created**: 2024-11-10
- **Notes**: Terrain splatmap shader, unit rendering, and doodad asset coverage blocking completion (currently ~70% complete).

## 📈 Progress
- Core rendering pipeline, camera controls, and preview generation delivered.
- Doodad rendering partially mapped (34/93 assets) with instancing and caching in place.
- Blockers tied to terrain shader parity, W3U unit parser dependency, and asset ingestion backlog.

## 🛠️ Results / Plan
- Resolve terrain splatmap shader and unit parser dependency (requires Map Format PRP deliverable).
- Expand doodad asset mappings to full coverage and bake visual regression baselines for six target maps.
- After blockers cleared, rerun performance benchmarks and finalize visual regression gating.

## ✅ Definition of Done
- [ ] Terrain multi-texture splatmap renders correctly (no single-texture fallback)
- [ ] Doodad rendering implemented (coverage target ≥90% mapped assets)
- [ ] Unit rendering enabled with ≥90% parser success rate
- [x] RTS camera controls (pan, zoom, rotate)
- [x] Map preview auto-generation
- [x] Map Gallery UI with thumbnails
- [x] E2E tests for rendering flows
- [x] Performance: ≥60 FPS @ 256×256 terrain
- [ ] All 6 benchmark maps render correctly end-to-end

## 📋 Definition of Ready
- [x] Map parsers working (W3X, W3N, SC2Map)
- [x] Babylon.js rendering engine integrated
- [x] Legal asset library available (textures, models)
- [x] Test maps available for validation

---

## 🏗️ Implementation Breakdown

**Phase 1: Core Rendering Pipeline**
- [x] Babylon.js scene setup and engine initialization
- [x] RTS camera controls (arc rotate, pan, zoom)
- [x] Basic terrain mesh generation from height maps
- [ ] **BLOCKED**: Multi-texture splatmap shader (single texture fallback)
- [x] Light system (directional + ambient)

**Phase 2: Doodad Rendering**
- [x] glTF model loader integration
- [x] Instanced mesh rendering for performance
- [x] Doodad placement from W3D data
- [x] Asset mapping system (34/93 types mapped - 37%)
- [ ] **INCOMPLETE**: Download and map remaining 56 doodad types (60% missing)

**Phase 3: Map Preview Generation**
- [x] Offscreen RTT (Render-To-Texture) at 512x512
- [x] Auto-capture camera positioning
- [x] Preview caching system
- [x] Map Gallery UI with thumbnails
- [x] Loading states and progress indicators

**Phase 4: Testing & Validation**
- [x] E2E tests with Playwright
- [x] Unit tests (>80% coverage)
- [ ] **PENDING**: Visual regression tests for 6 maps
- [x] Performance benchmarks (60 FPS achieved @ 256x256)

---

## ⏱️ Timeline

**Target Completion**: TBD (blocked by 3 critical issues)
**Current Progress**: 70%
**Phase 1 (Core Pipeline)**: 🟡 80% Complete (terrain shader blocked)
**Phase 2 (Doodads)**: 🟡 37% Complete (56 asset types missing)
**Phase 3 (Preview Gen)**: ✅ 100% Complete
**Phase 4 (Testing)**: 🟡 75% Complete (visual regression pending)

**Remaining Work**:
1. Fix terrain multi-texture splatmap (2-3 days)
2. Download and map 40-50 doodad types from Kenney.nl (4-6 hours)
3. Fix W3U unit parser for unit rendering (1-2 days)
4. Visual regression test suite for 6 maps (2 days)

---

## 📊 Success Metrics

**How do we measure success?**
- Map Rendering Accuracy: 3/6 maps render correctly ❌ **BLOCKED** (terrain textures broken)
- Doodad Coverage: 100% of doodad types mapped ❌ 37% (34/93 types)
- Unit Rendering: Units visible on maps ❌ **BLOCKED** (0.3% parser success)
- Performance: 60 FPS @ 256x256 terrain ✅ Achieved
- Preview Generation: <5s per map ✅ Achieved (avg 2.3s)
- Test Coverage: >80% unit tests ✅ Achieved (87%)

---

## 🧪 Quality Gates (AQA)

**Required checks before marking complete:**
- [x] Unit tests coverage >80%
- [x] E2E tests for Map Gallery
- [ ] **PENDING**: Visual regression tests for all 6 maps
- [x] No TypeScript errors
- [x] No ESLint warnings
- [ ] **BLOCKED**: Performance benchmarks (60 FPS not met due to placeholder rendering)

---

## 📖 User Stories

**As a** player
**I want** to see map previews in the gallery
**So that** I can choose which map to play

**Acceptance Criteria:**
- [x] Map Gallery shows all available maps
- [x] Click map to view full preview
- [ ] **INCOMPLETE**: Preview shows correct terrain textures (single texture fallback)
- [x] Preview shows doodads (37% coverage)
- [ ] **BLOCKED**: Preview shows units (parser broken)
- [x] Camera controls work smoothly

---

## 🔬 Research / Related Materials

**Technical Context:**
- [Babylon.js Terrain](https://doc.babylonjs.com/features/featuresDeepDive/mesh/creation/set/ground)
- [Babylon.js Materials](https://doc.babylonjs.com/features/featuresDeepDive/materials/using/introduction)
- [glTF 2.0 Models](https://www.khronos.org/gltf/)
- [Kenney.nl Assets](https://www.kenney.nl/) - Legal CC0 assets

**High-Level Design:**
- **Architecture**: Separate rendering from game logic
- **Terrain**: Height map + multi-texture splatmap (NEEDS FIX)
- **Doodads**: Instanced mesh rendering with glTF models
- **Camera**: RTS-style arc rotate camera
- **Preview**: Offscreen RTT (512x512) with auto-capture

**Code References:**
- `src/engine/rendering/MapRendererCore.ts:154` - Main renderer
- `src/engine/terrain/TerrainRenderer.ts:87` - Terrain rendering
- `src/engine/rendering/DoodadRenderer.ts:125` - Doodad rendering
- `src/engine/rendering/MapPreviewGenerator.ts:98` - Preview generation
- `src/ui/MapGallery.tsx:145` - Gallery UI
- `src/engine/assets/AssetMap.ts` - Asset mappings

**Known Issues:**
- `W3XMapLoader.ts:272` - Passes tileset "A" instead of texture array
- `W3UParser.ts` - 99.7% parsing failure (offset errors)
- Asset coverage: 56/93 doodad types missing (60%)

---

## 📊 Progress Tracking

| Date       | Role        | Change Made                                    | Status      |
|------------|-------------|------------------------------------------------|-------------|
| 2024-11-10 | Developer   | Terrain renderer implementation                | Complete    |
| 2024-11-12 | Developer   | Doodad renderer with instancing                | Complete    |
| 2024-11-15 | Developer   | RTS camera controls                            | Complete    |
| 2024-11-18 | Developer   | Map preview auto-generation                    | Complete    |
| 2024-11-20 | Developer   | Map Gallery UI                                 | Complete    |
| 2024-11-22 | Developer   | Legal asset library (19 textures, 33 models)   | Complete    |
| 2024-12-01 | AQA         | E2E tests for Map Gallery                      | Complete    |
| 2024-12-05 | Developer   | Tested 6 maps - identified 3 critical issues  | In Progress |
| 2024-12-10 | Developer   | Performance optimization (60 FPS achieved)     | Complete    |
| 2025-01-15 | Developer   | Visual regression test framework (Playwright)  | Complete    |

**Current Blockers**:
1. **P0 CRITICAL**: Terrain multi-texture splatmap broken (single texture fallback)
2. **P0 CRITICAL**: 56/93 doodad types missing (60% render as white boxes)
3. **P1 MAJOR**: W3U unit parser 99.7% failure rate

**Next Steps**:
1. Fix `W3XMapLoader.ts:272` to pass texture array instead of tileset letter
2. Download Kenney.nl asset packs and map 40-50 doodad types
3. Rewrite W3U parser to handle offset errors

---

## 🧪 Testing Evidence

**Unit Tests:**
- `src/engine/terrain/TerrainRenderer.unit.ts` - ✅ Passing
- `src/engine/rendering/DoodadRenderer.unit.ts` - ✅ Passing
- `src/engine/rendering/MapPreviewGenerator.unit.ts` - ✅ Passing
- `src/ui/MapGallery.unit.tsx` - ✅ Passing (19 tests)
- Coverage: 87%

**E2E Tests:**
- `tests/MapGallery.test.ts` - ✅ Passing
- `tests/OpenMap.test.ts` - ✅ Passing
- Scenarios: Gallery navigation, map preview generation

**Visual Regression:**
- Framework: Playwright image snapshots
- Maps tested: 3 (need 24)
- Status: ⚠️ Incomplete

**Performance:**
- Terrain rendering: 60 FPS @ 256x256
- Doodad rendering: 60 FPS @ 500 instances
- Memory: <2GB, no leaks
- Draw calls: <200

---

## 📈 Review & Approval

**Code Review:**
- Rendering architecture reviewed
- Performance validated
- Known issues documented
- Status: ⚠️ Partial approval (blockers prevent completion)

**Final Sign-Off:**
- Date: Pending
- Status: 🟡 In Progress (70% complete)
- Blockers: 3 critical issues preventing full map rendering

---

## 🚪 Exit Criteria

**What signals work is DONE?**
- [ ] **All 6 maps render with correct terrain textures** (P0 blocker)
- [ ] **60% → 100% doodad coverage** (download and map 56 missing types)
- [ ] **Unit rendering functional** (depends on W3U parser rewrite)
- [x] 60 FPS performance maintained
- [x] Map preview generation working (<5s per map)
- [ ] **Visual regression test suite for 6 maps**
- [x] Code review approved (partial - pending blockers resolution)
- [ ] **PRP status updated to ✅ Complete** (blocked by 3 critical issues)
