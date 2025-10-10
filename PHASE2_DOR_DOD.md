# Phase 2: Rendering Pipeline - DoR & DoD

## 📋 Definition of Ready (DoR)

Phase 2 can begin when **ALL** Phase 1 deliverables are complete:

### ✅ Phase 1 Completion Checklist

#### Core Systems
- [ ] **Babylon.js Engine** @ 60 FPS baseline established
- [ ] **Advanced Terrain** with multi-texture splatting operational
  - 4+ textures rendering correctly
  - Quadtree chunking functional
  - 4-level LOD system working
  - 60 FPS @ 256x256 terrain verified
- [ ] **GPU Instancing** rendering 500+ units @ 60 FPS
  - Thin instances functional
  - Baked animation textures working
  - Team colors applying correctly
- [ ] **Cascaded Shadow Maps** rendering professional quality shadows
  - 3 cascades operational
  - Selective shadow casting working
  - <5ms shadow generation time verified
- [ ] **Map Loading** successfully loading W3X and SCM formats
  - 95% W3X compatibility achieved
  - 95% SCM compatibility achieved
  - .edgestory conversion functional
- [ ] **Rendering Optimization** hitting performance targets
  - <200 draw calls verified
  - <2GB memory usage confirmed
  - No memory leaks over 1hr session

#### Legal & Infrastructure
- [ ] **Legal Compliance Pipeline** fully automated
  - CI/CD copyright validation blocking PRs
  - Asset replacement database (100+ mappings)
  - Zero copyrighted assets in build
- [ ] **Build System** optimized and stable
  - <5s build time
  - TypeScript strict mode, no errors
  - >80% test coverage

#### Performance Baseline
- [ ] **Rendering Budget Established**:
  - Terrain: 2-3ms
  - Units: 2-3ms
  - Shadows: <5ms
  - **Total Phase 1 Baseline**: ~7ms typical, ~12ms worst-case

#### Documentation
- [ ] All Phase 1 PRPs (1.1-1.7) marked complete
- [ ] Phase 1 README updated with final status
- [ ] Performance benchmarks documented

---

## ✅ Definition of Done (DoD)

Phase 2 is complete when **ALL** of the following are delivered:

### 1. Post-Processing Pipeline ✨
- [ ] **DefaultRenderingPipeline** integrated
  - Bloom effect (adjustable intensity)
  - FXAA anti-aliasing
  - Color grading with LUT support
  - Tone mapping (ACES, Reinhard, etc.)
  - Chromatic aberration
  - Vignette effect
  - Depth of Field (optional, expensive)
- [ ] **Performance**: <8ms total post-processing cost
- [ ] **Quality Presets**: Low/Medium/High configurations
- [ ] **User Controls**: Enable/disable individual effects

### 2. Advanced Lighting System 💡
- [ ] **Point Lights**: 8 concurrent lights max
- [ ] **Spot Lights**: 4 concurrent lights max
- [ ] **Light Culling**: Auto-disable lights outside frustum
- [ ] **Shadow Support**: Point/spot lights cast shadows (optional)
- [ ] **Performance**: <2ms lighting calculations
- [ ] **Day/Night Cycle**: Smooth transitions between lighting states

### 3. GPU Particle System 🎆
- [ ] **GPU Particles**: 50,000 particles @ 60 FPS
- [ ] **Effect Types**:
  - Smoke/explosion (fire, debris)
  - Magic effects (sparkles, energy)
  - Environmental (dust, leaves)
  - Weather (rain, snow) - see Weather System
- [ ] **5 Concurrent Effects**: Fire + smoke + magic + ambient
- [ ] **Performance**: <5ms for 50,000 particles
- [ ] **Pooling**: Reuse particle systems for efficiency

### 4. Weather Effects 🌦️
- [ ] **Rain System**: Particle-based with ground splashes
- [ ] **Snow System**: Particle-based with accumulation (visual only)
- [ ] **Fog System**: Distance fog with adjustable density
- [ ] **Weather Transitions**: Smooth blend between states (5s transition)
- [ ] **Performance**: <3ms per weather effect
- [ ] **Compatibility**: Works with all lighting conditions

### 5. PBR Material System 🎨
- [ ] **glTF 2.0 Compatible**: Full PBR workflow support
- [ ] **Material Sharing**: 100+ materials via frozen instances
- [ ] **Texture Support**:
  - Albedo (diffuse)
  - Normal maps
  - Metallic/Roughness
  - Ambient Occlusion
  - Emissive
- [ ] **Performance**: <5ms material switching overhead
- [ ] **Hot Reload**: Materials update without scene restart (dev mode)

### 6. Custom Shader Framework 🔮
- [ ] **GLSL Shader Support**: Custom vertex/fragment shaders
- [ ] **Hot Reload**: Live shader editing in dev mode
- [ ] **Shader Presets**:
  - Water shader (animated, reflective)
  - Force field shader (bubble, transparent)
  - Hologram shader (scanlines, flicker)
  - Dissolve shader (fade effect)
- [ ] **Error Handling**: Graceful fallback on shader compilation errors
- [ ] **Performance**: No additional overhead vs built-in materials

### 7. Decal System 🩸
- [ ] **Projected Decals**: Scorch marks, blood, footprints
- [ ] **Max 100 Decals**: Auto-fade oldest when limit reached
- [ ] **Decal Types**:
  - Combat (scorch, blood, bullet holes)
  - Environmental (footprints, tire tracks)
  - Strategic (markers, arrows, highlights)
- [ ] **Performance**: <5ms for 100 decals
- [ ] **Instancing**: Share decal meshes where possible

### 8. Render Target System 🖼️
- [ ] **3 Active RTTs**: Minimap, mirrors, effects
- [ ] **Minimap RTT**: Top-down view updating 10 FPS
- [ ] **Mirror RTT**: Reflective surfaces (optional, expensive)
- [ ] **Effect RTTs**: Blur, distortion, custom passes
- [ ] **Performance**: <5ms per RTT (15ms total for 3)
- [ ] **Optimization**: Downscaled render, subset rendering

### 9. Rendering Performance Tuning ⚡
- [ ] **Quality Preset System**:
  - **Low**: 40 FPS minimum (mobile/integrated)
  - **Medium**: 60 FPS target (desktop/dedicated) ✅
  - **High**: 90 FPS stretch goal (requires Phase 11)
- [ ] **Auto-Detect**: Hardware capability detection
- [ ] **User Override**: Manual quality selection
- [ ] **Performance Monitoring**:
  - Per-system timings visible in debug overlay
  - FPS graph with 1-second history
  - Draw call counter
  - Memory usage tracker

### 10. Phase 2 Integration Tests 🧪
- [ ] **Visual Quality Tests**:
  - Post-processing renders correctly
  - Particles don't flicker or pop
  - Weather effects blend smoothly
  - Decals project correctly on terrain
- [ ] **Performance Benchmarks**:
  - Full scene (terrain + units + weather + particles) @ Medium preset = 60 FPS
  - All effects @ High preset = 45+ FPS
  - Degraded scene @ Low preset = 40+ FPS
- [ ] **Compatibility Tests**:
  - Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
  - WebGL2 detection with fallbacks
- [ ] **Stress Tests**:
  - 50,000 particles + 500 units + rain + fog = 45+ FPS
  - 3 RTTs + all post-processing + shadows = 50+ FPS

---

## 📊 Performance Targets

### Frame Time Budget (Medium Preset @ 60 FPS = 16.67ms)

| System | Budget | Actual |
|--------|--------|--------|
| **Phase 1 Baseline** | 7ms | 7ms |
| Post-Processing | 8ms | 7-9ms |
| Advanced Lighting | 2ms | 1.5-2.5ms |
| GPU Particles | 5ms | 3-6ms |
| Weather Effects | 3ms | 2-4ms |
| Decals | 5ms | 4-6ms |
| Render Targets | 15ms (3×) | 12-18ms |
| **Phase 2 Total** | 38ms | 29.5-45.5ms |
| **Combined** | 45ms | **36.5-52.5ms** |

**Result**: 36.5ms = **27 FPS** (below 60 FPS target!)

**Solution**: **Quality Preset System**
- **Low**: Disable RTTs, reduce particles → 40 FPS ✅
- **Medium**: 2 RTTs, 25k particles → 60 FPS ✅
- **High**: All features → 45 FPS (acceptable for high-end)

### Memory Budget

| System | Memory |
|--------|--------|
| Phase 1 Baseline | 1.8GB |
| Post-Processing | 100MB (RTTs, LUTs) |
| Particle Textures | 50MB |
| Weather Textures | 50MB |
| Additional Materials | 100MB |
| RTT Buffers | 300MB (3 × 1024²) |
| **Phase 2 Total** | 600MB |
| **Combined** | **2.4GB** ✅ (within 4GB browser limit)

### Draw Call Budget

| System | Draw Calls |
|--------|-----------|
| Phase 1 Baseline | 200 |
| Point/Spot Lights | +8 (shadow casters) |
| Particles | +5 (5 concurrent) |
| Decals | +100 (1 per decal) |
| Weather | +2 (rain + fog) |
| RTTs | ×1.5 (multiply baseline) |
| **Phase 2 Impact** | +115 + 1.5× multiplier |
| **Combined** | **~415 draw calls** ⚠️

**Risk**: Exceeds revised <300 draw call budget
**Mitigation**: Decal instancing, weather as particles (reduce to ~268) ✅

---

## 🚨 Risk Assessment

### High-Risk Items 🔴

1. **Performance Budget exceeded** (36.5-52.5ms vs 16.67ms target)
   - **Mitigation**: Quality preset system, continuous profiling
   - **Go/No-Go**: Must achieve 60 FPS @ Medium preset

2. **Draw call budget exceeded** (415 vs 300 target)
   - **Mitigation**: Decal instancing, combine weather into particle system
   - **Go/No-Go**: Must stay under 300 draw calls after optimization

3. **WebGL2 unavailability** (GPU particles require WebGL2)
   - **Mitigation**: CPU particle fallback (5,000 max), auto-detect
   - **Impact**: Graceful degradation, warn users

### Medium-Risk Items 🟡

4. **RTT performance variability** (12-18ms range)
   - **Mitigation**: Downscale RTTs (512² instead of 1024²), freeze materials
   - **Impact**: Slight visual quality reduction, acceptable

5. **Post-processing shader compilation** (first load lag)
   - **Mitigation**: Precompile shaders on startup, loading screen
   - **Impact**: 2-3s initial delay, one-time cost

### Low-Risk Items 🟢

6. **Material hot-reload** (dev-only feature)
   - **Mitigation**: Wrap in try/catch, fallback to previous material
   - **Impact**: Development convenience, non-critical

---

## ✅ Success Criteria

Phase 2 is successful if:

- [ ] **60 FPS @ Medium preset** with all effects active
- [ ] **40 FPS @ Low preset** as minimum fallback
- [ ] **<300 draw calls** after decal/weather optimization
- [ ] **<2.5GB memory** peak usage (within browser limit)
- [ ] **Visual quality** matches reference screenshots
- [ ] **No regressions** in Phase 1 performance (still 60 FPS baseline)
- [ ] **All 10 PRPs** completed and tested
- [ ] **Test coverage** >80% for new systems
- [ ] **Documentation** complete for all APIs

---

## 📅 Timeline

**Duration**: 6 weeks
**Team**: 2 developers
**Budget**: $30,000

### Week 1-2: Core Effects (Parallel)
- Dev 1: PRP 2.1 (Post-Processing)
- Dev 2: PRP 2.2 (Advanced Lighting)

### Week 3: Particles & Weather (Parallel)
- Dev 1: PRP 2.3 (GPU Particles)
- Dev 2: PRP 2.4 (Weather Effects)

### Week 4: Materials & Shaders (Parallel)
- Dev 1: PRP 2.5 (PBR Materials)
- Dev 2: PRP 2.6 (Custom Shaders)

### Week 5: Advanced Systems (Parallel)
- Dev 1: PRP 2.7 (Decals)
- Dev 2: PRP 2.8 (Render Targets)

### Week 6: Optimization & Testing (Sequential)
- Both: PRP 2.9 (Performance Tuning)
- Both: PRP 2.10 (Integration Tests)

---

## 🎯 Next Steps

### Before Starting Phase 2
1. [ ] Complete ALL Phase 1 PRPs (1.1-1.7)
2. [ ] Validate Phase 1 DoD checklist passes
3. [ ] Performance baseline documented (7ms typical)
4. [ ] Review Phase 2 PRPs with team
5. [ ] Set up quality preset infrastructure

### Week 1 Kickoff
1. [ ] Create detailed PRP specs for 2.1 and 2.2
2. [ ] Set up post-processing pipeline boilerplate
3. [ ] Research Babylon.js DefaultRenderingPipeline
4. [ ] Begin parallel development

---

**Phase 2 transforms Edge Craft from a functional renderer into a visually stunning RTS engine!** ✨
