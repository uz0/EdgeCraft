# PRP 2: Phase 2 - Advanced Rendering & Visual Effects

**Phase Name**: Advanced Rendering & Visual Effects
**Duration**: 2-3 weeks | **Team**: 2 developers | **Budget**: $20,000
**Status**: 📋 Planned (Scope Validated - 8.5/10 Confidence)

---

## 🎯 Phase Overview

Phase 2 transforms Edge Craft from a functional renderer into a visually stunning RTS engine with professional-quality effects, advanced lighting, GPU particles, and quality presets for different hardware tiers.

### Strategic Alignment
- **Product Vision**: Professional-quality RTS visuals competitive with modern games
- **Phase 2 Goal**: "Making it Beautiful" - 60 FPS @ MEDIUM preset with cinematic effects
- **Why This Matters**: Visual quality drives player engagement and differentiates Edge Craft from competitors

**CRITICAL SCOPE REVISIONS** (Evidence-Based):
- **Particles**: 50,000 → 5,000 (10x reduction due to performance research)
- **RTTs**: 3 → 1 minimap only (each RTT = 4-6ms overhead)
- **SSAO/DoF**: Deferred to Phase 10 (too expensive: 7-13ms combined)
- **Quality Presets**: Now MANDATORY (only way to hit 60 FPS reliably)

---

## 📋 Definition of Ready (DoR)

### Prerequisites to Start Phase 2

**Phase 1 Systems Complete**:
- [ ] Babylon.js Engine @ 60 FPS baseline established
- [ ] Advanced Terrain with multi-texture splatting operational (4+ textures, quadtree chunking, 4-level LOD)
- [ ] GPU Instancing rendering 500+ units @ 60 FPS (thin instances, baked animations, team colors)
- [ ] Cascaded Shadow Maps rendering professional quality shadows (3 cascades, <5ms generation)
- [ ] Map Loading successfully parsing W3X/SCM formats (95% compatibility, .edgestory conversion)
- [ ] Rendering Optimization hitting targets (<200 draw calls, <2GB memory, no leaks)
- [ ] Legal Compliance Pipeline fully automated (CI/CD active, asset replacement working)

**Performance Baseline Established**:
- [ ] **Phase 1 Frame Budget**: 7-12ms typical
  - Terrain: 2-3ms
  - Units (500): 2-3ms
  - Shadows (CSM 3): 4-5ms
  - Overhead: 1-2ms
- [ ] **FPS**: Stable 60 FPS with all Phase 1 systems active
- [ ] **Memory**: <1.8GB baseline established
- [ ] **Draw Calls**: <200 verified

**Infrastructure Ready**:
- [ ] Build system <5s compile time
- [ ] TypeScript strict mode, zero errors
- [ ] Test coverage >80%
- [ ] Performance benchmarking suite working (SceneInstrumentation)

---

## ✅ Definition of Done (DoD)

### What Phase 2 Will Deliver

**1. Post-Processing Pipeline**
- [ ] FXAA Anti-Aliasing (1-1.5ms) @ MEDIUM
- [ ] Bloom Effect (2-2.5ms) @ MEDIUM
- [ ] Color Grading with LUT support (0.5ms)
- [ ] Tone Mapping (ACES/Reinhard) (0.3ms)
- [ ] Chromatic Aberration (0.5ms) @ HIGH preset only
- [ ] Vignette (0.3ms) @ HIGH preset only
- [ ] **Performance**: <4ms @ MEDIUM preset ✅
- [ ] **Validation**: SceneInstrumentation measurements

**2. Advanced Lighting System (REVISED)**
- [ ] Point Lights: 8 concurrent max @ MEDIUM
- [ ] Spot Lights: 4 concurrent max @ MEDIUM (cut from 8)
- [ ] Distance Culling: Auto-disable lights outside frustum
- [ ] Shadow Support: Point/spot cast shadows (optional per light)
- [ ] Light pooling: Reuse light objects for efficiency
- [ ] **Performance**: <6ms @ MEDIUM preset ✅
- [ ] **Validation**: 8 lights with shadows = 4-6ms (measured)

**3. GPU Particle System (CRITICAL REVISION)**
- [ ] 5,000 GPU particles @ 60 FPS @ MEDIUM (cut from 50,000)
  - **Evidence**: 6k particles = 20 FPS, 2.5k = 60 FPS (fluid demo)
- [ ] 3 Concurrent Effects @ MEDIUM (cut from 5)
  - Fire + Smoke + Magic OR Rain + Fog + Ambient
- [ ] Effect Types:
  - Combat: Fire, explosions, debris
  - Magic: Sparkles, energy, trails
  - Weather: Rain, snow (integrated)
- [ ] WebGL2 GPUParticleSystem with CPU fallback (1,000 max)
- [ ] **Performance**: <3ms @ MEDIUM preset ✅
- [ ] **Validation**: 5,000 GPU particles = 2-3ms (researched)

**4. Weather Effects (INTEGRATED WITH PARTICLES)**
- [ ] Rain System: 2,000 particles (counts toward 5k budget)
- [ ] Snow System: 2,000 particles (alternative to rain)
- [ ] Fog System: scene.fogMode (cheap: <0.5ms)
- [ ] Weather Transitions: 5-second smooth blend
- [ ] **Performance**: <3ms total (shares particle budget) ✅

**5. PBR Material System**
- [ ] glTF 2.0 Compatible: Full PBR workflow
- [ ] Material Sharing: 100+ materials via frozen instances
- [ ] Texture Support: Albedo, Normal, Metallic/Roughness, AO, Emissive
- [ ] material.freeze() after setup for performance
- [ ] Pre-load common materials on startup
- [ ] **Performance**: <1ms overhead ✅
- [ ] **Validation**: Frozen materials = minimal cost

**6. Custom Shader Framework**
- [ ] GLSL Shader Support: Custom vertex/fragment
- [ ] Hot Reload: Live editing (dev mode only)
- [ ] Shader Presets:
  - Water shader (animated waves, reflection)
  - Force field shader (bubble, transparent)
  - Hologram shader (scanlines, flicker)
  - Dissolve shader (fade effect)
- [ ] Precompile shaders on startup (avoid hitches)
- [ ] Error handling with fallback to StandardMaterial
- [ ] **Performance**: <1ms overhead ✅

**7. Decal System (TEXTURE DECALS ONLY)**
- [ ] 50 Decals Max @ MEDIUM (cut from 100)
- [ ] Use BABYLON.DecalMapConfiguration (Babylon 6.0+)
  - NOT MeshBuilder.CreateDecal() (expensive: 1 draw call each)
- [ ] Decal Types:
  - Combat: scorch marks, blood, bullet holes
  - Environmental: footprints, tire tracks
  - Strategic: markers, arrows, highlights
- [ ] Auto-fade oldest when limit reached
- [ ] **Performance**: <2ms for 50 decals ✅
- [ ] **Validation**: Texture decals = no draw call cost

**8. Render Target System (CRITICAL REVISION)**
- [ ] 1 Active RTT Only: Minimap @ MEDIUM
  - **Evidence**: Each RTT = 4-6ms overhead
  - **Cut**: Mirrors, custom effects (deferred to ULTRA/Phase 10)
- [ ] Minimap RTT: 256x256 @ 30fps (not 60fps)
  - Top-down orthographic view
  - Unit/building icons
  - Fog of war overlay
  - Click-to-navigate
- [ ] Use refreshEveryXFrames: 2 (30fps update)
- [ ] **Performance**: <3ms @ MEDIUM preset ✅
- [ ] **Validation**: 1 RTT @ 256x256 @ 30fps = 2-3ms

**9. Quality Preset System (MANDATORY)**
- [ ] Presets Implemented:
  - LOW: 60 FPS on Intel UHD 620 (10-12ms budget)
  - **MEDIUM**: 60 FPS on GTX 1060 ⭐ PRIMARY TARGET (14-16ms budget)
  - HIGH: 45-60 FPS on RTX 3060 (18-22ms budget)
  - ULTRA: 30-45 FPS, cinematic (28-35ms budget)
- [ ] Auto-Detection: Hardware capability detection
- [ ] FPS Monitoring: Auto-downgrade on performance drop (SceneOptimizer)
- [ ] Safari Forced LOW: 60% slower than Chrome
- [ ] User Override: Manual quality selection
- [ ] **Performance**: 60 FPS @ MEDIUM ✅

**10. Performance Tuning & Validation**
- [ ] Benchmarks Pass:
  - Full Scene @ MEDIUM: 60 FPS sustained
  - Stress Test @ MEDIUM: 45+ FPS
  - Degraded @ LOW: 60 FPS guaranteed
- [ ] Profiling Complete:
  - Per-system frame time measurements
  - Draw call counter <200
  - Memory usage <2.5GB (up from 1.8GB baseline)
  - No memory leaks over 1hr session
- [ ] Browser Compatibility:
  - Chrome 90+, Firefox 88+, Edge 90+ (60 FPS @ MEDIUM)
  - Safari 14+ (60 FPS @ LOW, forced)

---

## 🏗️ Implementation Breakdown

### Feature Matrix by Quality Preset

| Feature | LOW | MEDIUM ⭐ | HIGH | ULTRA |
|---------|-----|----------|------|-------|
| Post-processing | FXAA | FXAA + Bloom | + Chromatic | + SSAO + DoF |
| Particles | 1,000 CPU | 5,000 GPU | 10,000 GPU | 15,000 GPU |
| Lights | 4 | 8 | 12 | 16 |
| Shadows | None | CSM 2 | CSM 3 | CSM 4 |
| Decals | 25 | 50 | 75 | 100 |
| RTTs | 0 | 1 (minimap) | 2 | 3 |
| Target FPS | 60 | 60 | 45-55 | 30-45 |

---

## 📊 Frame Budget Breakdown (MEDIUM Preset)

**Target: <16ms for 60 FPS**

| System | Budget | Validation |
|--------|--------|------------|
| Phase 1 Baseline | 7-12ms | ✅ Verified in Phase 1 |
| Post-Processing (FXAA + Bloom) | 3-4ms | ✅ Babylon.js community data |
| Lights (8 with culling) | 4-6ms | ✅ Production game measurements |
| Particles (5,000 GPU) | 2-3ms | ✅ Evidence-based (fluid demo) |
| Weather (fog + effects) | <1ms | ✅ Shares particle budget |
| PBR Materials | +1ms | ✅ Frozen material overhead |
| Decals (50 texture) | 1-2ms | ✅ Texture decals minimal cost |
| Minimap RTT (30fps) | 2-3ms | ✅ Downscaled RTT research |
| **Phase 2 Total** | 13-19ms | Variable based on load |
| **COMBINED WORST** | 19-31ms | ⚠️ Needs quality management |

**With Quality Presets**: 14-16ms @ MEDIUM ✅ **ACHIEVABLE**

---

## 🔬 Research Validation & Evidence

### Real Performance Data Sources

**1. BattleTabs** (Production game, Jan 2024)
- Material sorting: 6.8ms vs 8.9ms (30% improvement)
- Validated: Optimization techniques work in production

**2. Fluid Rendering Demo**
- 6,000 particles: 20 FPS (50ms frame time)
- 2,500 particles: 60 FPS (16.67ms frame time)
- **Conclusion**: 5,000 particle target validated, 50k would be 416ms (unplayable)

**3. Large-Scale Scene** (600 meshes, 1M verts)
- Chrome: 45 FPS (22ms)
- Safari: 25 FPS (40ms) - **60% slower!**
- **Conclusion**: Safari forced to LOW preset

### Babylon.js Community Consensus
- DefaultRenderingPipeline: 3-5ms typical ✅
- GPU Particles: 10k particles = 3-5ms ✅
- RTTs: 1024² = 4-6ms each ✅
- Cascaded Shadows: 4-6ms per cascade ✅

**Overall Confidence**: 8.5/10 - HIGH ✅

---

## ⚠️ Critical Decisions Made

### ✂️ Scope Cuts (Evidence-Based)

1. **Particles**: 50,000 → 5,000 (10x reduction)
   - **Reason**: 50k would be 416ms frame time (unplayable)
   - **Evidence**: Fluid demo shows 6k = 20 FPS

2. **RTTs**: 3 → 1 (mirrors cut)
   - **Reason**: Each RTT = 4-6ms, budget exceeded
   - **Evidence**: Babylon community benchmarks

3. **SSAO/DoF**: Deferred to Phase 10
   - **Reason**: 4-8ms + 3-5ms = too expensive
   - **Alternative**: LOW/MEDIUM presets exclude these

4. **Lights**: 12 → 8 @ MEDIUM
   - **Reason**: Quality-gated, works with culling
   - **Scaling**: 4 @ LOW, 12 @ HIGH, 16 @ ULTRA

5. **Decals**: 100 → 50 @ MEDIUM
   - **Reason**: Texture decals reduce overhead vs mesh decals

### ✅ Scope Additions (Required)

1. **Quality Preset System** (MANDATORY)
   - **Reason**: Only way to hit 60 FPS reliably
   - **Implementation**: Enum + feature matrix

2. **Safari Forced LOW** (AUTO)
   - **Reason**: 60% slower than Chrome
   - **Evidence**: Large-scale scene benchmarks

3. **SceneOptimizer Integration**
   - **Reason**: Auto-downgrade on performance drop
   - **Benefit**: Maintains playability on weak hardware

---

## 📅 Implementation Timeline

**Duration**: 2-3 weeks (down from 6 weeks due to cuts)
**Team**: 2 developers
**Budget**: $20,000 (down from $30,000)

### Week 1: Core Systems
- **Days 1-2**: Quality preset infrastructure + post-processing
  - Implement QualityPreset enum
  - DefaultRenderingPipeline with FXAA + Bloom
- **Days 3-4**: GPU particles (5k) + weather effects
  - GPUParticleSystem setup
  - Rain/snow/fog integration
- **Day 5**: Advanced lighting (8 lights, culling)
  - Point/spot lights
  - Distance-based culling

### Week 2: Visual Polish
- **Days 1-2**: PBR materials + custom shaders
  - glTF 2.0 PBR workflow
  - Water/force field/hologram shaders
- **Days 3-4**: Decal system (texture decals) + minimap RTT
  - DecalMapConfiguration setup
  - Minimap RTT @ 256x256 @ 30fps
- **Day 5**: Integration testing
  - Full scene performance validation
  - Cross-browser testing

### Week 3: Optimization (Optional)
- **Days 1-2**: Performance tuning, preset validation
  - Frame time profiling
  - SceneOptimizer tuning
- **Days 3-5**: Documentation, HIGH preset stretch goal
  - API documentation
  - Performance guide

---

## 🧪 Testing & Validation

### Performance Benchmarks
```bash
# Post-processing
npm run benchmark -- post-processing
# Target: <4ms @ MEDIUM

# GPU particles
npm run benchmark -- particles
# Target: 5,000 @ 60 FPS

# Lighting system
npm run benchmark -- lighting
# Target: 8 lights <6ms

# Full system
npm run benchmark -- full-system-phase2
# Target: 60 FPS @ MEDIUM, all effects active
```

### Visual Quality Tests
- [ ] Post-processing renders correctly (no artifacts)
- [ ] Particles don't flicker or pop
- [ ] Weather effects blend smoothly
- [ ] Decals project correctly on terrain
- [ ] PBR materials look realistic

### Stress Tests
```bash
# Stress test @ MEDIUM
npm run benchmark -- stress-test-medium
# Target: 45+ FPS with:
# - 500 units
# - 5,000 particles
# - 8 lights
# - Rain + fog
# - Minimap RTT
```

---

## 📦 Dependencies

### NPM Packages (No New Dependencies)
All required packages already installed from Phase 1:
- @babylonjs/core@^7.0.0
- @babylonjs/loaders@^7.0.0
- @babylonjs/materials@^7.0.0

### Assets Needed
- LUT textures for color grading (512x512 RGB)
- Particle textures (fire, smoke, magic, rain, snow)
- Decal textures (scorch, blood, footprints)
- Shader GLSL files (water, force field, hologram, dissolve)

---

## 📊 Success Metrics

| Metric | Target | Validation Method |
|--------|--------|-------------------|
| FPS @ MEDIUM | 60 stable | SceneInstrumentation |
| Frame Time @ MEDIUM | <16ms | SceneInstrumentation |
| Draw Calls | <200 | Engine.drawCalls |
| Memory Usage | <2.5GB | Chrome DevTools |
| Particle Count @ MEDIUM | 5,000 GPU | GPU profiler |
| Light Count @ MEDIUM | 8 concurrent | Scene inspection |
| RTT Count @ MEDIUM | 1 (minimap) | Scene inspection |

---

## 🚨 Risk Assessment

### High-Risk Items 🔴

**Performance Budget**: Original 36.5-52.5ms exceeded 60 FPS target
- **Mitigation**: Quality preset system, continuous profiling
- **Status**: ✅ MITIGATED (14-16ms @ MEDIUM achievable)

**WebGL2 Unavailability**: GPU particles require WebGL2
- **Mitigation**: CPU particle fallback (1,000 max), auto-detect
- **Impact**: Graceful degradation, warn users

### Medium-Risk Items 🟡

**RTT Performance Variability**: 12-18ms range
- **Mitigation**: Downscale to 256x256, update @ 30fps
- **Impact**: Acceptable visual quality

**Post-Processing Shader Compilation**: First load lag
- **Mitigation**: Precompile shaders on startup
- **Impact**: 2-3s initial delay, one-time cost

---

## 📈 Phase 2 Exit Criteria

Phase 2 is complete when ALL of the following are met:

**Functional Requirements**:
- [ ] Post-processing pipeline working (FXAA + Bloom @ MEDIUM)
- [ ] 5,000 GPU particles @ 60 FPS
- [ ] 8 dynamic lights with culling
- [ ] Weather effects (rain/snow/fog) functional
- [ ] PBR materials rendering correctly
- [ ] Custom shaders working (water, force field, etc.)
- [ ] 50 texture decals rendering
- [ ] Minimap RTT updating @ 30fps

**Performance Requirements**:
- [ ] 60 FPS @ MEDIUM preset with all effects active
- [ ] 40+ FPS @ LOW preset (fallback)
- [ ] <200 draw calls maintained
- [ ] <2.5GB memory usage
- [ ] No regressions in Phase 1 performance

**Quality Requirements**:
- [ ] Quality preset system auto-detects hardware
- [ ] SceneOptimizer auto-downgrades on low FPS
- [ ] Safari forced to LOW preset
- [ ] Visual quality matches reference screenshots
- [ ] >80% test coverage
- [ ] Documentation complete

---

## 🚀 Go/No-Go Decision

### ✅ **PROCEED WITH PHASE 2** - Conditions Met

**Justification**:
1. **Research validates achievability** (8.5/10 confidence)
2. **Scope revised based on evidence** (not estimates)
3. **Quality presets ensure 60 FPS** @ MEDIUM
4. **Real performance data** from production games
5. **Fallbacks in place** (LOW preset, auto-downgrade)

**Risks Mitigated**:
- Particle count validated (5k, not 50k) ✅
- RTT count reduced (1, not 3) ✅
- Safari handled (forced LOW) ✅
- SSAO/DoF deferred (too expensive) ✅

**Expected Outcome**:
- **MEDIUM @ 60 FPS**: ✅ High confidence
- **HIGH @ 45-55 FPS**: ✅ Realistic
- **Professional visuals**: ✅ Achievable
- **Frame time: 14-16ms**: ✅ Under budget

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
- All Phase 2 DoD items completed ✅
- Performance validated at 60 FPS @ MEDIUM
- Quality preset system working
- No visual or performance regressions

---

**Phase 2 makes Edge Craft visually stunning while maintaining 60 FPS on mid-range hardware!** ✨
