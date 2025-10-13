# PRP 2: Phase 2 - Advanced Rendering & Visual Effects

**Phase Name**: Advanced Rendering & Visual Effects + Complete Map Rendering
**Duration**: 4-6 weeks | **Team**: 2 developers | **Budget**: $30,000
**Status**: 🟡 **70% Complete** - Core systems implemented, critical map rendering issues identified
**Priority**: P0 - Map rendering must work for ALL 24 maps before Phase 3

**Last Updated**: October 13, 2025
**Current Sprint**: Map Rendering Fixes & Asset Expansion

---

## 🎯 Phase Overview

Phase 2 transforms Edge Craft into a production-ready RTS engine with:
1. **Professional Visual Effects** - Post-processing, particles, advanced lighting ✅ **IMPLEMENTED**
2. **Complete Map Rendering** - ALL 24 maps in `/maps` render correctly ⏳ **IN PROGRESS**
3. **Legal Asset Library** - 100% compliant texture/model replacements ⏳ **PARTIAL (37%)**

### Strategic Alignment
- **Product Vision**: Professional-quality RTS engine that renders ANY W3X/SC2/W3N map
- **Phase 2 Goal**: "Making it Beautiful AND Functional" - 60 FPS @ MEDIUM with ALL maps working
- **Why This Matters**: Cannot proceed to Phase 3 (gameplay) without reliable map rendering

### Current Reality Check (October 13, 2025)

**✅ COMPLETE (70%):**
- Post-Processing Pipeline (FXAA, Bloom, Color Grading, Tone Mapping)
- GPU Particle System (5,000 particles @ 60 FPS)
- Advanced Lighting (8 dynamic lights with culling)
- Weather Effects (Rain, Snow, Fog)
- PBR Material System
- Custom Shader Framework
- Decal System (50 texture decals)
- Minimap RTT System
- Quality Preset Manager
- Map Gallery UI

**❌ CRITICAL ISSUES (30% remaining):**
1. **Terrain Rendering**: Single texture instead of multi-texture splatmap (P0)
2. **Asset Coverage**: 60% doodads render as placeholder boxes (P0)
3. **Unit Parsing**: 99.7% parse failure (only 1/342 units rendered) (P1)
4. **Coordinate Mapping**: Units/doodads positioned off-map ✅ **FIXED Oct 13**
5. **Canvas Size**: Too small (180px viewport issue) ✅ **FIXED Oct 13**

### Investigation Summary (Deep-Dive Completed Oct 13, 2025)

**Test Map**: 3P Sentinel 01 v3.06.w3x (89×116, 10,324 tiles, 4,245 doodads, 342 units)

| Component | Expected | Actual | Status |
|-----------|----------|--------|--------|
| **Terrain** | Multi-texture (4-8 textures) | Single fallback texture | ❌ BROKEN |
| **Doodads** | 93 unique types with models | 34 mapped (37%), 56 missing (60%) | ⚠️ PARTIAL |
| **Units** | 342 units rendered | 1 unit (0.3% parse success) | ❌ BROKEN |
| **Performance** | 60 FPS @ MEDIUM | Unknown (blocked by render issues) | ⏳ PENDING |

**Visual Quality**: Currently **2/10** (should be **9/10**)

---

## 📋 Definition of Ready (DoR)

### Prerequisites to Start Phase 2 (FROM PHASE 1)

**Phase 1 Systems Complete**:
- [x] Babylon.js Engine @ 60 FPS baseline established ✅
- [x] Basic Terrain rendering operational ✅
- [x] GPU Instancing for units @ 60 FPS ✅
- [x] Cascaded Shadow Maps working ✅
- [x] Map Loading parsing W3X formats ✅
- [x] Rendering Optimization (<200 draw calls, <2GB memory) ✅
- [x] Legal Compliance Pipeline automated ✅

**Performance Baseline Established**:
- [x] Phase 1 Frame Budget: 7-12ms typical ✅
- [x] FPS: Stable 60 FPS ✅
- [x] Memory: <1.8GB ✅
- [x] Draw Calls: <200 ✅

**Infrastructure Ready**:
- [x] Build system working ✅
- [x] TypeScript strict mode, zero errors ✅
- [x] Test coverage >80% ✅

---

## ✅ Definition of Done (DoD)

### PRIMARY GOAL: ALL 24 MAPS RENDER CORRECTLY

**Success Criteria**: Every map in `/public/maps/` loads, renders all objects with legal assets, maintains 60 FPS @ MEDIUM, and passes screenshot test.

### 1. Core Visual Systems (✅ 100% COMPLETE)

**Post-Processing Pipeline** ✅
- [x] FXAA Anti-Aliasing (1-1.5ms) @ MEDIUM
- [x] Bloom Effect (2-2.5ms) @ MEDIUM
- [x] Color Grading with LUT support (0.5ms)
- [x] Tone Mapping (ACES/Reinhard) (0.3ms)
- [x] Chromatic Aberration (0.5ms) @ HIGH
- [x] Vignette (0.3ms) @ HIGH
- [x] **Implementation**: `src/engine/rendering/PostProcessingPipeline.ts` (386 lines)

**Advanced Lighting System** ✅
- [x] Point Lights: 8 concurrent max @ MEDIUM
- [x] Spot Lights: 4 concurrent max @ MEDIUM
- [x] Distance Culling: Auto-disable lights outside frustum
- [x] Shadow Support: Point/spot cast shadows
- [x] Light pooling for efficiency
- [x] **Implementation**: `src/engine/rendering/AdvancedLightingSystem.ts` (480 lines)

**GPU Particle System** ✅
- [x] 5,000 GPU particles @ 60 FPS @ MEDIUM
- [x] 3 Concurrent Effects @ MEDIUM
- [x] Effect Types (Combat/Magic/Weather)
- [x] WebGL2 GPUParticleSystem with CPU fallback (1,000 max)
- [x] **Implementation**: `src/engine/rendering/GPUParticleSystem.ts` (479 lines)

**Weather Effects** ✅
- [x] Rain System: 2,000 particles
- [x] Snow System: 2,000 particles
- [x] Fog System: scene.fogMode
- [x] Weather Transitions: 5-second smooth blend
- [x] **Implementation**: `src/engine/rendering/WeatherSystem.ts` (410 lines)

**PBR Material System** ✅
- [x] glTF 2.0 Compatible PBR workflow
- [x] Material Sharing: 100+ materials via frozen instances
- [x] Texture Support: Albedo, Normal, Metallic/Roughness, AO, Emissive
- [x] material.freeze() for performance
- [x] **Implementation**: `src/engine/rendering/PBRMaterialSystem.ts` (382 lines)

**Custom Shader Framework** ✅
- [x] GLSL Shader Support
- [x] Hot Reload (dev mode)
- [x] Shader Presets (Water, Force Field, Hologram, Dissolve)
- [x] Precompile shaders on startup
- [x] Error handling with StandardMaterial fallback
- [x] **Implementation**: `src/engine/rendering/CustomShaderSystem.ts` (577 lines)

**Decal System** ✅
- [x] 50 Decals Max @ MEDIUM
- [x] Texture-based decal implementation (projected quads)
- [x] Decal Types (Combat/Environmental/Strategic)
- [x] Auto-fade oldest when limit reached
- [x] **Implementation**: `src/engine/rendering/DecalSystem.ts` (379 lines)

**Render Target System (Minimap)** ✅
- [x] Minimap RTT: 256x256 @ 30fps
- [x] Top-down orthographic view
- [x] Unit/building icons
- [x] Fog of war overlay
- [x] Click-to-navigate
- [x] **Implementation**: `src/engine/rendering/MinimapSystem.ts` (347 lines)

**Quality Preset System** ✅
- [x] Presets: LOW/MEDIUM/HIGH/ULTRA
- [x] Auto-Detection: Hardware capability detection
- [x] FPS Monitoring: Auto-downgrade on performance drop
- [x] Safari Forced LOW: 60% slower than Chrome
- [x] User Override: Manual quality selection
- [x] **Implementation**: `src/engine/rendering/QualityPresetManager.ts` (552 lines)

---

### 2. Map Rendering Core (⏳ 40% COMPLETE - CRITICAL WORK REQUIRED)

#### 2.1 Terrain Multi-Texture Splatmap (❌ BROKEN - P0)

**Current Status**: SINGLE texture fallback (terrain_grass_light) for entire map
**Required**: Multi-texture blending using W3E groundTextureIds array

**Problem**:
```typescript
// ❌ WRONG (current): W3XMapLoader.ts:272
textures: [
  {
    id: w3e.tileset,  // "A" - NOT a valid texture ID!
    path: tilesetPath,
    blendMap: textureIndices,
  },
],
```

**Solution Required**:
- [ ] Modify `W3XMapLoader.convertTerrain()` to pass `groundTextureIds` array
- [ ] Update `TerrainRenderer` to accept array of texture IDs
- [ ] Implement splatmap shader with 4-8 texture samplers
- [ ] Use `textureIndices` (already extracted) for per-vertex blending
- [ ] Create texture atlas (2048×2048) for single draw call
- [ ] Test with all W3X maps (each uses different tileset)

**Files to Modify**:
- `src/formats/maps/w3x/W3XMapLoader.ts` - Line 270-278
- `src/engine/terrain/TerrainRenderer.ts` - Add multi-texture support
- `src/engine/terrain/shaders/terrain.vertex.glsl` - Add texture index attribute
- `src/engine/terrain/shaders/terrain.fragment.glsl` - Implement splatmap blending

**Definition of Done**:
- [ ] All W3X maps render with correct multi-texture terrain
- [ ] Texture blending smooth at tile boundaries
- [ ] Performance: <3ms for terrain rendering @ MEDIUM
- [ ] Visual test: 3P Sentinel shows grass/dirt/rock/cliff textures correctly

**ETA**: 2-3 days (P0)

#### 2.2 Asset Library Expansion (⚠️ PARTIAL - P0)

**Current Coverage**: 34/93 doodad types mapped (37%)
**Required**: 90%+ coverage for professional quality

**Phase 2.12 Legal Asset Library Status**:
- [x] **Terrain Textures**: 19 types, 57 files (CC0 from Polyhaven) ✅ COMPLETE
- [x] **Doodad Models**: 33 models (26 Kenney.nl, 7 procedural) ✅ PARTIAL
- [ ] **Missing Doodads**: 56 types need models (60% of 3P Sentinel map)

**Missing Doodad Breakdown** (3P Sentinel 01 v3.06.w3x):
```
Trees (10): ASx0 ASx2 ATwf COlg CTtc LOtr LOth LTe1 LTe3 LTbs
Rocks (12): AOsk AOsr COhs LOrb LOsh LOca LOcg LTcr ZPsh ZZdt ...
Plants (15): APbs APms ASr1 ASv3 AWfs DTg1 DTg3 NWfb NWfp NWpa ...
Structures (11): AOhs AOks AOla AOlg DRfc NOft NOfp NWsd OTis ...
Misc (8): DSp9 LOtz LOwr LTlt LTs5 LTs8 YTlb YTpb Ytlc
```

**Solution: Kenney Asset Pack Expansion**:
- [ ] Download Kenney.nl asset packs (CC0 1.0 Universal, FREE):
  - [ ] Nature Kit (150+ models) - trees, rocks, plants
  - [ ] Platformer Kit (120+ models) - structures, props
  - [ ] Dungeon Kit (80+ models) - cave, underground
- [ ] Add 40-50 new GLB models to `public/assets/models/doodads/`
- [ ] Map W3X IDs in `src/engine/assets/AssetMap.ts` (W3X_DOODAD_MAP)
- [ ] Use variations: rotate, scale, color-shift for similar types
- [ ] Test rendering with 3P Sentinel map (should see real models, not boxes)

**Definition of Done**:
- [ ] 90%+ doodad types have real models (10% placeholder acceptable)
- [ ] All common types (trees, rocks, bushes) have models
- [ ] 3P Sentinel map visually correct (trees look like trees, not boxes)
- [ ] Legal compliance: All assets CC0/MIT/Public Domain, documented

**ETA**: 4-6 hours (manual download + mapping) (P0)

#### 2.3 Unit Parser Fix (❌ BROKEN - P1)

**Current Status**: 1/342 units parsed (0.3% success rate)
**Error**: `RangeError: Offset is outside the bounds of the DataView`

**Problem**:
```
[W3UParser] Failed to parse unit 2/342: RangeError: Offset is outside bounds
[W3UParser] Insufficient buffer for unit 3/342, stopping parse
```

**Root Causes**:
1. Incorrect struct size calculation (unit data is variable-length)
2. Version-specific field differences (map uses newer W3U format)
3. Missing optional field handling (inventory, abilities, hero stats)

**Solution Required**:
- [ ] Compare W3U parser with HiveWorkshop format documentation
- [ ] Add version detection: `if (version >= 28) { ... }`
- [ ] Implement try-catch-continue for optional fields
- [ ] Test with multiple maps:
  - [ ] 3P Sentinel 01 (332 units expected)
  - [ ] EchoIslesAlltherandom.w3x (small, simple)
  - [ ] Legion_TD (custom units)

**Files to Modify**:
- `src/formats/maps/w3x/W3UParser.ts` - Lines 50-250 (unit parsing loop)

**Definition of Done**:
- [ ] 95%+ unit parse success rate across all W3X maps
- [ ] Units render as colored placeholder cubes (full models in Phase 3)
- [ ] Parse errors logged but non-fatal (skip bad units, continue)
- [ ] Unit count matches World Editor for test maps

**ETA**: 1-2 days (P1)

#### 2.4 Coordinate Mapping Fix (✅ FIXED Oct 13)

**Status**: ✅ COMPLETE
**Fix**: Negate Y coordinate when converting to Babylon.js Z axis
**Commit**: `0820158` - "fix(rendering): correct W3X coordinate mapping and canvas size"

**Before**: Units/doodads at Z=-4367.8 (way off map)
**After**: Units/doodads within 0-116 map bounds

**Files Modified**:
- `src/engine/rendering/MapRendererCore.ts:475` - Unit positioning
- `src/engine/rendering/DoodadRenderer.ts:227` - Doodad positioning

---

### 3. All 24 Maps Validated (❌ 0% COMPLETE - REQUIRES ABOVE FIXES)

**PRIMARY DELIVERABLE**: Every map must render correctly with screenshot test

#### 3.1 Warcraft 3 Maps (.w3x) - 14 maps

**Test Requirements**:
- [ ] Loads without errors
- [ ] Terrain renders with multi-texture splatmap (not single color)
- [ ] 90%+ doodads render as real models (not placeholder boxes)
- [ ] Units render as colored cubes (positioned correctly on map)
- [ ] 60 FPS @ MEDIUM preset
- [ ] Screenshot test passes (visual regression detection)

**Maps**:
- [ ] **3P Sentinel 01 v3.06.w3x** (10 MB, 89×116) - PRIMARY TEST MAP
- [ ] **3P Sentinel 02 v3.06.w3x** (16 MB, similar to 01)
- [ ] **3P Sentinel 03 v3.07.w3x** (12 MB, updated version)
- [ ] **3P Sentinel 04 v3.05.w3x** (9.5 MB)
- [ ] **3P Sentinel 05 v3.02.w3x** (19 MB, larger)
- [ ] **3P Sentinel 06 v3.03.w3x** (19 MB, larger)
- [ ] **3P Sentinel 07 v3.02.w3x** (27 MB) ⚠️ LARGEST W3X
- [ ] **3pUndeadX01v2.w3x** (18 MB, custom campaign)
- [ ] **EchoIslesAlltherandom.w3x** (109 KB, small, simple) - QUICK TEST
- [ ] **Footmen Frenzy 1.9f.w3x** (221 KB, small, custom) - QUICK TEST
- [ ] **Legion_TD_11.2c-hf1_TeamOZE.w3x** (15 MB, tower defense)
- [ ] **Unity_Of_Forces_Path_10.10.25.w3x** (4.0 MB, medium)
- [ ] **qcloud_20013247.w3x** (7.9 MB, medium)
- [ ] **ragingstream.w3x** (200 KB, small) - QUICK TEST

**Validation Script**:
```bash
npm run test:maps -- --format w3x
# Expected: 14/14 PASSED
```

#### 3.2 Warcraft 3 Campaigns (.w3n) - 7 campaigns

**Test Requirements** (SAME as W3X + campaign-specific):
- [ ] Multi-chapter loading works
- [ ] Chapter transitions smooth
- [ ] Campaign data (story, heroes) parsed correctly

**Campaigns**:
- [ ] **BurdenOfUncrowned.w3n** (320 MB, 8 chapters)
- [ ] **HorrorsOfNaxxramas.w3n** (433 MB, 9 chapters)
- [ ] **JudgementOfTheDead.w3n** (923 MB, 25 chapters) ⚠️ LARGEST FILE
- [ ] **SearchingForPower.w3n** (74 MB, 6 chapters)
- [ ] **TheFateofAshenvaleBySvetli.w3n** (316 MB, 10 chapters)
- [ ] **War3Alternate1 - Undead.w3n** (106 MB, 8 chapters)
- [ ] **Wrath of the Legion.w3n** (57 MB, 5 chapters)

**Validation Script**:
```bash
npm run test:maps -- --format w3n
# Expected: 7/7 PASSED (all chapters)
```

#### 3.3 StarCraft 2 Maps (.SC2Map) - 3 maps

**Test Requirements** (DIFFERENT asset library):
- [ ] SC2 format parsing works
- [ ] SC2-specific terrain textures loaded
- [ ] SC2 doodad models (different from W3X)
- [ ] 60 FPS @ MEDIUM

**Status**: ⚠️ **SC2 ASSET LIBRARY NOT STARTED**

**Maps**:
- [ ] **Aliens Binary Mothership.SC2Map** (3.3 MB)
- [ ] **Ruined Citadel.SC2Map** (800 KB)
- [ ] **TheUnitTester7.SC2Map** (879 KB)

**SC2 Asset Requirements** (NEW WORK):
- [ ] 15-20 terrain textures (SC2-specific)
- [ ] 50-100 doodad models (SC2-specific, DIFFERENT from W3X)
- [ ] SC2 unit models (different from W3X)

**Decision**: 🔄 **DEFER SC2 to Phase 2.1** (optional stretch goal)
**Justification**: W3X maps are priority, SC2 requires entirely separate asset library

**ETA (if included)**: 2-3 weeks additional (P2)

#### 3.4 Screenshot Tests (❌ NOT STARTED)

**Requirement**: Automated visual regression testing for ALL 24 maps

**Implementation**:
- [ ] Playwright E2E test suite created
- [ ] Test loads each map, waits for render complete
- [ ] Takes screenshot (1920×1080 canvas)
- [ ] Compares against baseline (pixel diff threshold <2%)
- [ ] Fails CI/CD if visual regression detected

**Test File**:
```typescript
// tests/e2e/map-screenshots.spec.ts
describe('Map Visual Regression', () => {
  for (const map of ALL_24_MAPS) {
    test(`${map.name} renders correctly`, async ({ page }) => {
      await page.goto('/');
      await page.click(`[data-map="${map.name}"]`);
      await page.waitForSelector('.babylon-canvas.loaded');
      await expect(page).toHaveScreenshot(`${map.name}.png`, {
        maxDiffPixels: 1000, // 2% tolerance
      });
    });
  }
});
```

**Definition of Done**:
- [ ] All 24 maps have baseline screenshots
- [ ] CI/CD runs screenshot tests on every PR
- [ ] Visual regressions block merge
- [ ] Test execution time <10 minutes

**ETA**: 2 days (after map rendering fixes complete) (P1)

---

### 4. Performance Requirements (⏳ BLOCKED BY RENDERING FIXES)

**Cannot validate until terrain/assets/units render correctly**

**Target**: 60 FPS @ MEDIUM preset (<16ms frame time)

- [ ] Full Scene @ MEDIUM: 60 FPS sustained
- [ ] Stress Test @ MEDIUM: 45+ FPS (500 units, 5k particles, 8 lights, weather)
- [ ] Degraded @ LOW: 60 FPS guaranteed
- [ ] <300 draw calls per map (updated from <200 for RTT overhead)
- [ ] <2.5GB memory usage per map
- [ ] Load times:
  - [ ] <15s for maps <100MB
  - [ ] <60s for maps 100-500MB
  - [ ] <120s for 923MB file (JudgementOfTheDead.w3n)

**Validation Method**:
```bash
npm run benchmark -- --map "3P Sentinel 01" --preset MEDIUM
# Expected: 60 FPS avg, <16ms frame time
```

---

### 5. Documentation & Quality (⏳ PARTIAL)

- [x] Implementation documentation for core systems ✅
- [x] Browser validation checklist created ✅
- [ ] User guide: How to use map gallery
- [ ] User guide: Quality preset selection
- [ ] User guide: Performance troubleshooting
- [ ] API documentation for new rendering systems
- [ ] Asset contribution guide (for community models)

---

## 🏗️ Implementation Breakdown

### Completed Systems (✅ 70%)

**Core Rendering (Phase 2.1-2.6)** ✅
- PostProcessingPipeline.ts (386 lines)
- AdvancedLightingSystem.ts (480 lines)
- GPUParticleSystem.ts (479 lines)
- WeatherSystem.ts (410 lines)
- PBRMaterialSystem.ts (382 lines)
- CustomShaderSystem.ts (577 lines)
- DecalSystem.ts (379 lines)
- MinimapSystem.ts (347 lines)
- QualityPresetManager.ts (552 lines)

**Map Loading (Phase 2.7-2.11)** ✅
- MapGallery.tsx (342 lines) - UI component
- MapRendererCore.ts (742 lines) - Core map renderer
- SC2MapLoader.ts (589 lines) - StarCraft 2 support
- W3NCampaignLoader.ts (423 lines) - Campaign support
- MapPreviewGenerator.ts (387 lines) - Thumbnail generation

**Asset System (Phase 2.12)** ⚠️ PARTIAL
- AssetLoader.ts (161 lines) - Asset loading/caching ✅
- AssetMap.ts (151 lines) - ID mapping ✅
- manifest.json - 90 assets (57 textures, 33 models) ✅
- MISSING: 56 doodad models (60% coverage gap) ❌

### Critical Remaining Work (❌ 30%)

#### Priority 0 (MUST COMPLETE - Blocking Phase 3)

**1. Multi-Texture Terrain Splatmap** (2-3 days)
- Modify W3XMapLoader to pass groundTextureIds array
- Implement splatmap shader (4-8 texture samplers)
- Create texture atlas for performance
- Test with all W3X maps

**2. Asset Library Expansion** (4-6 hours)
- Download Kenney.nl asset packs (Nature, Platformer, Dungeon)
- Add 40-50 new GLB models
- Map 56 missing W3X doodad IDs
- Test 3P Sentinel map visual quality

**3. Unit Parser Fix** (1-2 days)
- Debug W3U parser offset errors
- Add version detection and optional field handling
- Test with 3P Sentinel (332 units expected)
- Validate across all W3X maps

**4. Map Validation Suite** (2 days)
- Create Playwright screenshot tests for all 24 maps
- Generate baseline screenshots
- Add to CI/CD pipeline
- Document test execution

#### Priority 1 (Should Complete)

**5. Performance Validation** (1 day)
- Run benchmarks on all 24 maps
- Measure frame time, draw calls, memory
- Generate performance report
- Optimize bottlenecks

**6. Documentation** (1 day)
- User guide for map gallery
- Asset contribution guide
- Performance troubleshooting guide

#### Priority 2 (Optional Stretch Goals)

**7. SC2 Asset Library** (2-3 weeks)
- Download SC2-specific textures/models
- Create SC2_TERRAIN_MAP and SC2_DOODAD_MAP
- Test 3 SC2 maps
- **Decision**: Defer to Phase 2.1 if time constrained

---

## 📅 Implementation Timeline (REVISED)

**Original**: 2-3 weeks (assumed systems only)
**Revised**: 4-6 weeks (includes map rendering completion)

### Week 1: Core Systems (COMPLETED ✅)
- Days 1-5: All Phase 2 rendering systems implemented

### Week 2: Map Loading & Gallery (COMPLETED ✅)
- Days 1-5: MapGallery UI, map loaders, preview generation

### Week 3: CURRENT SPRINT - Critical Fixes (IN PROGRESS ⏳)
- **Days 1-2**: Multi-texture terrain splatmap implementation
  - Modify W3XMapLoader.convertTerrain()
  - Implement splatmap shader
  - Test with 3P Sentinel map
- **Days 3-4**: Asset library expansion
  - Download Kenney asset packs
  - Map 40-50 new doodad types
  - Visual quality validation
- **Day 5**: Unit parser fix
  - Debug W3U parser
  - Add version detection
  - Test parse success rate

### Week 4: Map Validation & Testing
- **Days 1-2**: Screenshot test implementation
  - Create Playwright test suite
  - Generate baseline screenshots for all 24 maps
  - Add to CI/CD
- **Days 3-4**: Performance validation
  - Benchmark all 24 maps
  - Optimize bottlenecks
  - Generate performance report
- **Day 5**: Documentation & final validation

### Weeks 5-6: Buffer / SC2 Stretch Goal (OPTIONAL)
- **Option A**: SC2 asset library (if time permits)
- **Option B**: Advanced polish (LOD system, texture atlas optimization)
- **Option C**: Buffer for unexpected issues

---

## 🧪 Testing & Validation

### Manual Testing Checklist

**Map Rendering (PRIMARY)**:
```bash
# 1. Start dev server
npm run dev

# 2. Open browser to http://localhost:5173
# 3. Verify map gallery shows all 24 maps with thumbnails
# 4. Click "3P Sentinel 01 v3.06.w3x"
# 5. Verify:
#    - Terrain shows multiple textures (grass, dirt, rock, not single color)
#    - Trees look like trees (not white boxes)
#    - Rocks look like rocks (not white boxes)
#    - Units visible as colored cubes (positioned on map, not floating)
#    - 60 FPS shown in stats overlay
#    - Canvas fills viewport (not tiny)
# 6. Repeat for all 24 maps
```

### Automated Testing

**Unit Tests** (Current: 80% coverage):
```bash
npm test
# Expected: All tests pass
```

**E2E Screenshot Tests** (NEW):
```bash
npm run test:e2e
# Expected: 24/24 maps render correctly, screenshot diffs <2%
```

**Performance Benchmarks**:
```bash
npm run benchmark -- --all-maps --preset MEDIUM
# Expected: All maps 60 FPS @ MEDIUM, <16ms frame time
```

**Asset Validation**:
```bash
npm run assets:validate
# Expected: 90 assets, 100% CC0/MIT/Public Domain, no copyright violations
```

---

## 📊 Success Metrics

### Quantitative Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Maps Rendering Correctly** | 24/24 (100%) | 0/24 (0%) | ❌ BLOCKED |
| **Terrain Quality** | Multi-texture splatmap | Single fallback texture | ❌ BROKEN |
| **Doodad Asset Coverage** | 90%+ real models | 37% (34/93) | ⚠️ PARTIAL |
| **Unit Parse Success** | 95%+ | 0.3% (1/342) | ❌ BROKEN |
| **FPS @ MEDIUM** | 60 sustained | Unknown | ⏳ PENDING |
| **Frame Time @ MEDIUM** | <16ms | Unknown | ⏳ PENDING |
| **Memory Usage** | <2.5GB | ~1.8GB (baseline) | ✅ ON TRACK |
| **Draw Calls** | <300 | ~200 (baseline) | ✅ ON TRACK |
| **Screenshot Tests** | 24/24 pass | 0/24 (not created) | ❌ NOT STARTED |

### Qualitative Targets

- [ ] **Visual Quality**: Maps look visually correct and professional (9/10 rating)
- [ ] **Performance**: Smooth 60 FPS on GTX 1060 @ MEDIUM preset
- [ ] **Reliability**: Maps load consistently without errors
- [ ] **Legal Compliance**: 100% CC0/MIT/Public Domain assets, zero copyright violations
- [ ] **User Experience**: Map gallery intuitive, fast loading, responsive

---

## 🚨 Risk Assessment

### Critical Risks (🔴 HIGH)

**1. Map Rendering Completion Timeline** 🔴
- **Risk**: Multi-texture splatmap + asset expansion takes longer than estimated
- **Impact**: Phase 3 (gameplay) delayed, project timeline at risk
- **Mitigation**:
  - Focus on W3X maps only (24 maps, defer SC2 to Phase 2.1)
  - Use Kenney assets (CC0, fast download, no modeling required)
  - Implement basic splatmap (4 textures), optimize later
- **Contingency**: Accept 80% doodad coverage if 90% not achievable in time

**2. Unit Parser Complexity** 🔴
- **Risk**: W3U format more complex than expected, fix takes >2 days
- **Impact**: Units not visible, maps feel empty
- **Mitigation**:
  - Keep colored cube placeholders (acceptable for Phase 2)
  - Full unit models deferred to Phase 3 anyway
  - Focus on parse success rate, not visual quality
- **Contingency**: Ship Phase 2 with unit parsing at 80%+ (acceptable)

**3. Performance Degradation** 🟡
- **Risk**: Multi-texture terrain + full asset coverage drops FPS below 60 @ MEDIUM
- **Impact**: Quality preset system invalidated
- **Mitigation**:
  - Texture atlas reduces draw calls (single draw call for terrain)
  - LOD system for doodads (Phase 3 feature)
  - Auto-downgrade to LOW if FPS drops
- **Contingency**: Adjust MEDIUM preset definition (reduce lights, particles)

### Medium Risks (🟡 MODERATE)

**4. Screenshot Test Flakiness** 🟡
- **Risk**: Pixel diff tests too sensitive, false positives common
- **Impact**: CI/CD blocks legitimate changes
- **Mitigation**:
  - 2% pixel diff tolerance (1000 pixels at 1920×1080)
  - Generate multiple baseline screenshots, use median
  - Allow manual approval for "expected" visual changes
- **Contingency**: Reduce to smoke tests only (load map, no crash)

**5. SC2 Asset Library Scope Creep** 🟡
- **Risk**: SC2 maps require entirely different asset library (2-3 weeks)
- **Impact**: Timeline extended, budget exceeded
- **Mitigation**:
  - **DECISION**: Defer SC2 to Phase 2.1 (optional)
  - Focus on 21 W3X/W3N maps first
  - SC2 can be added post-Phase 2 without blocking Phase 3
- **Contingency**: Ship Phase 2 with W3X/W3N only (SC2 in Phase 2.1)

---

## 📈 Phase 2 Exit Criteria

Phase 2 is **COMPLETE** when ALL of the following are met:

### 1. Core Systems (✅ COMPLETE)
- [x] All 9 rendering systems implemented and integrated ✅

### 2. Map Rendering (❌ INCOMPLETE - CRITICAL)
- [ ] **Multi-texture terrain** working for all W3X maps
- [ ] **90%+ doodad coverage** with real models (not placeholder boxes)
- [ ] **95%+ unit parse success** across all W3X maps
- [ ] **Coordinate mapping** correct (units/doodads on map, not floating) ✅ FIXED

### 3. All Maps Validated (❌ INCOMPLETE - PRIMARY DELIVERABLE)
- [ ] **14 W3X maps** load and render correctly (60 FPS @ MEDIUM)
- [ ] **7 W3N campaigns** load and render correctly (all chapters)
- [ ] **3 SC2 maps** (OPTIONAL - defer to Phase 2.1 if time constrained)
- [ ] **24/24 screenshot tests** pass (visual regression detection)

### 4. Performance (⏳ PENDING)
- [ ] **60 FPS @ MEDIUM** sustained for all maps
- [ ] **<16ms frame time** @ MEDIUM
- [ ] **<300 draw calls** per map
- [ ] **<2.5GB memory** per map
- [ ] **Load times** meet targets (<15s/<60s/<120s)

### 5. Quality (⏳ PARTIAL)
- [x] Quality preset system working ✅
- [x] Browser compatibility validated ✅
- [ ] >80% test coverage (Phase 2 systems need comprehensive tests)
- [ ] User documentation complete
- [ ] Asset contribution guide published

---

## 🚀 Go/No-Go Decision

### Current Status: 🟡 **CONDITIONAL GO**

**Completed (70%)**:
- ✅ All core rendering systems implemented
- ✅ Map gallery UI functional
- ✅ Coordinate mapping fixed
- ✅ Canvas size fixed
- ✅ Quality preset system working
- ✅ Asset loading/caching system working

**Critical Remaining (30%)**:
- ❌ Multi-texture terrain splatmap (P0)
- ❌ Asset library expansion (P0)
- ❌ Unit parser fix (P1)
- ❌ Map validation suite (P1)

**Decision**: ✅ **PROCEED WITH CRITICAL FIXES**

**Justification**:
1. Core systems proven working (70% complete)
2. Remaining work clearly scoped and achievable
3. Fixes address root causes identified in deep investigation
4. 4-6 week timeline realistic for completion
5. W3X maps prioritized (SC2 deferred to Phase 2.1)

**Risks Accepted**:
- May ship with 80-90% doodad coverage (vs 100%)
- SC2 maps deferred to Phase 2.1 (optional stretch goal)
- Unit models remain placeholder cubes (full models in Phase 3)

**Expected Outcome**:
- **Visual Quality**: 2/10 → 9/10 (terrain + assets fix)
- **Map Rendering**: 0/24 → 21/24 (W3X/W3N working, SC2 optional)
- **Performance**: Maintain 60 FPS @ MEDIUM
- **Timeline**: 4-6 weeks (2-3 weeks remaining)

---

## 🎯 What's Next: Phase 3

After Phase 2 completion, Phase 3 will add:
- Unit selection and control
- Resource gathering and economy
- Building placement and construction
- A* pathfinding system
- Combat mechanics
- Basic AI opponent

**Phase 3 Start Prerequisites** (Phase 2 DoD = Phase 3 DoR):
- **MUST HAVE**:
  - All W3X/W3N maps render correctly ✅
  - 90%+ asset coverage ✅
  - 60 FPS @ MEDIUM validated ✅
  - Screenshot tests passing ✅
- **NICE TO HAVE**:
  - SC2 maps working (can be added in Phase 2.1)
  - 100% doodad coverage (80-90% acceptable)

---

## 📚 Asset Library Status (PRP 2.12 Integration)

### Current Assets (✅ DELIVERED)

**Terrain Textures** (19 types, 57 files):
- Source: Polyhaven.com (CC0 1.0 Universal)
- Resolution: 2048×2048 (diffuse, normal, roughness)
- Format: JPG (optimized)
- Coverage: 100% of common W3X terrain types ✅

**Doodad Models** (33 models):
- Source: Kenney.nl (26 models, CC0) + Procedural (7 models, original)
- Format: GLB (glTF 2.0 binary)
- Polygon Count: 200-5,000 triangles
- Coverage: 37% of 3P Sentinel map (34/93 types) ⚠️

**Legal Compliance** ✅:
- 100% CC0 1.0 Universal / MIT / Public Domain
- Documented in asset manifest
- SHA-256 verified
- CI/CD validation automated

### Required Assets (❌ MISSING)

**Doodad Models** (56 types needed):
```
Trees (10): ASx0, ASx2, ATwf, COlg, CTtc, LOtr, LOth, LTe1, LTe3, LTbs
Rocks (12): AOsk, AOsr, COhs, LOrb, LOsh, LOca, LOcg, LTcr, ZPsh, ZZdt, etc.
Plants (15): APbs, APms, ASr1, ASv3, AWfs, DTg1, DTg3, NWfb, NWfp, NWpa, etc.
Structures (11): AOhs, AOks, AOla, AOlg, DRfc, NOft, NOfp, NWsd, OTis, ZPfw, LWw0
Misc (8): DSp9, LOtz, LOwr, LTlt, LTs5, LTs8, YTlb, YTpb, Ytlc
```

**Solution**: Kenney.nl asset packs (ETA: 4-6 hours manual work)
- Download Nature Kit, Platformer Kit, Dungeon Kit (CC0, FREE)
- Add 40-50 GLB models to `public/assets/models/doodads/`
- Map IDs in `AssetMap.ts` (W3X_DOODAD_MAP)

**SC2 Assets** (OPTIONAL - Phase 2.1):
- 15-20 terrain textures (SC2-specific)
- 50-100 doodad models (SC2-specific, different from W3X)
- Decision: DEFER to Phase 2.1 (W3X priority)

---

## 📝 Recent Changes & Fixes

### October 13, 2025 - Deep Investigation & Fixes

**Commits**:
- `0820158` - fix(rendering): correct W3X coordinate mapping and canvas size
- `481a8fe` - docs: comprehensive rendering investigation report (DELETED, consolidated into PRP)

**Fixes Applied** ✅:
1. **Coordinate Mapping**: Units/doodads now correctly positioned (negate Y for Babylon Z axis)
2. **Canvas Size**: Increased from 250px to 180px offset (larger viewport)

**Issues Identified** ❌:
1. **Terrain**: Single texture instead of multi-texture splatmap (P0)
2. **Assets**: 60% doodads render as placeholder boxes (P0)
3. **Units**: 99.7% parse failure (P1)

**Investigation Report**: Findings consolidated into this PRP (scattered docs deleted)

---

**Phase 2 will make Edge Craft a production-ready RTS engine with professional visuals AND complete map rendering!** 🚀✨

**Next Steps**: Complete critical fixes (terrain, assets, units) → validate all 24 maps → ship Phase 2 → start Phase 3 gameplay.
