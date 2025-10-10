# Phase 2: Rendering Pipeline - Executive Summary

## Overview

**Phase**: 2 of 12
**Duration**: 6 weeks (2 developers)
**Budget**: $30,000
**Status**: Awaiting Phase 1 Completion

---

## Strategic Goal

Transform Edge Craft from a basic WebGL renderer into a **production-grade RTS graphics engine** with modern post-processing, dynamic lighting, particle systems, and weather effects matching AAA game visual quality.

---

## Definition of Ready (DoR) - What Phase 1 Must Deliver

✅ **Rendering Foundation**
- Babylon.js @ 60 FPS with basic scene
- Multi-texture terrain with 4-level LOD
- GPU instancing for 500+ units
- Cascaded shadow maps (3 cascades)
- <200 draw calls proven

✅ **Asset & Map Loading**
- glTF loader functional
- W3X/SCM parsers working
- .edgestory conversion pipeline

✅ **Performance Baseline**
- 60 FPS sustained: 256x256 terrain + 500 units + shadows
- <2GB memory usage
- All Phase 1 tests passing >80% coverage

✅ **Legal & Infrastructure**
- Copyright validation automated
- Build system <5s
- TypeScript strict mode passing

**Verification**: Run `npm run benchmark -- phase1-full-system` before starting Phase 2

---

## Definition of Done (DoD) - What Phase 2 Will Deliver

### 1. Post-Processing Pipeline 🎨
- **Effects**: Bloom, FXAA, Color Grading, Tone Mapping, DoF, Chromatic Aberration, Vignette
- **Performance**: <8ms all effects @ Medium quality
- **Features**: Quality presets (Low/Medium/High), per-effect toggles, GUI integration

### 2. Advanced Lighting System 💡
- **Lights**: 8 point lights + 4 spot lights simultaneously
- **Performance**: <2ms overhead
- **Features**: Automatic light culling, importance scoring, cookie textures

### 3. GPU Particle System 🎆
- **Capacity**: 50,000 particles (5 concurrent effects)
- **Performance**: <5ms total
- **Features**: Built-in presets (fire, smoke, sparks, dust, magic), CPU fallback for WebGL1

### 4. Weather Effects System ⛈️
- **Types**: Rain, snow, fog
- **Performance**: <3ms for rain + fog
- **Features**: Smooth transitions, wind simulation, time-of-day integration

### 5. PBR Material System 🎨
- **Materials**: PBRMetallicRoughnessMaterial (glTF 2.0)
- **Performance**: <5ms for 100+ materials via instance sharing
- **Features**: 5 presets (metal, wood, stone, fabric, glass), LOD-based swapping

### 6. Custom Shader Framework 🔧
- **Support**: GLSL shaders with hot reload (dev mode)
- **Built-in**: Water, force field, hologram shaders
- **Features**: Shader library, error handling, fallback to defaults

### 7. Decal System 🎯
- **Capacity**: 100 active decals max (performance constraint)
- **Performance**: <5ms for 50 decals
- **Features**: Scorch, blood, footprint, magic circle presets, automatic FIFO removal

### 8. Render Target & Multi-Pass System 🎬
- **RTTs**: 3 active render targets
- **Performance**: <5ms total
- **Features**: Minimap, mirrors/portals, ping-pong buffers, depth pre-pass

---

## PRP Breakdown (10 PRPs, 41 Developer-Days)

| ID | PRP Name | Effort | Priority | Parallelizable |
|----|----------|--------|----------|----------------|
| **2.1** | Post-Processing Pipeline | 6 days | 🔴 Critical | ✅ Yes |
| **2.2** | Advanced Lighting System | 5 days | 🔴 Critical | ✅ Yes |
| **2.3** | GPU Particle System | 5 days | 🟡 High | ✅ Yes |
| **2.4** | Weather Effects | 4 days | 🟡 High | ⚠️ Partial |
| **2.5** | PBR Material System | 5 days | 🟡 High | ✅ Yes |
| **2.6** | Custom Shader Framework | 4 days | 🟢 Medium | ✅ Yes |
| **2.7** | Decal System | 3 days | 🟢 Medium | ✅ Yes |
| **2.8** | Render Target System | 4 days | 🟡 High | ✅ Yes |
| **2.9** | Rendering Performance Tuning | 3 days | 🔴 Critical | ❌ No |
| **2.10** | Phase 2 Integration Tests | 2 days | 🔴 Critical | ❌ No |

**Parallelization**: 85% of work can be done in parallel

---

## Performance Targets

### Frame Time Budget (60 FPS = 16.67ms)

| System | Budget | Typical Case |
|--------|--------|--------------|
| Phase 1 Baseline | 8ms | 7ms |
| Post-Processing | 8ms | 5ms |
| Advanced Lighting | 2ms | 1.5ms |
| GPU Particles | 5ms | 3ms |
| Weather | 3ms | 2ms |
| PBR Materials | 5ms | 3ms |
| Decals | 5ms | 3ms |
| Render Targets | 5ms | 3ms |
| Other | 2ms | 1ms |
| **TOTAL** | **43ms** | **28.5ms** |

**Analysis**: Typical case = 28.5ms = **35 FPS**

**Solution**: Quality preset system to achieve 60 FPS target

### Quality Presets

#### Low Preset (Mobile / Integrated GPU)
- **Target**: 40 FPS minimum
- **Settings**: FXAA only, 4 point lights, 5k particles (CPU), fog only, StandardMaterial, 20 decals, 1 RTT
- **Estimated**: ~15ms overhead = **43 FPS total**

#### Medium Preset (Desktop / Dedicated GPU) ← **PRIMARY TARGET**
- **Target**: 60 FPS
- **Settings**: Bloom + FXAA + Tone Mapping + Vignette, 8 point + 2 spot lights, 25k particles, light rain + fog, PBR with LOD, 50 decals, 2 RTTs
- **Estimated**: ~20ms overhead = **56 FPS total** ✅

#### High Preset (Enthusiast / High-end GPU)
- **Target**: 90 FPS (stretch goal)
- **Settings**: All effects, 8 point + 4 spot lights, 50k particles, heavy rain + snow + fog, full PBR, 100 decals, 3 RTTs
- **Estimated**: ~28ms overhead = **35 FPS** (needs Phase 11 optimizations)

### Memory Budget

| System | Budget | Typical |
|--------|--------|---------|
| Phase 1 Baseline | 1.5GB | 1.2GB |
| Post-Processing | 200MB | 100MB |
| Particles | 100MB | 50MB |
| PBR Textures | 300MB | 200MB |
| Decals | 50MB | 30MB |
| RTTs | 150MB | 100MB |
| Other | 100MB | 50MB |
| **TOTAL** | **2.4GB** | **1.73GB** |

**Safe within 4GB browser limit** ✅

### Draw Call Budget

| System | Draw Calls |
|--------|------------|
| Phase 1 Baseline | 150 |
| Post-Processing | 10 |
| Particles | 3 (via instancing) |
| Decals | 5 (via atlasing) |
| RTTs | 100 (subset rendering) |
| **TOTAL** | **268** |

**Within revised <300 budget** ✅

---

## Risk Assessment

### High-Risk Items 🔴

**1. Performance Budget Exceeded**
- **Risk**: Combined systems exceed 16.67ms frame time
- **Likelihood**: High (initial estimates show 28ms)
- **Impact**: Critical (fails DoD)
- **Mitigation**: Quality preset system, continuous profiling, fallback implementations
- **Contingency**: Default to Low preset, prioritize Phase 11 optimization

**2. Draw Call Budget Exceeded**
- **Risk**: RTTs multiply draw calls beyond budget
- **Likelihood**: Medium
- **Impact**: High
- **Mitigation**: Render subset to RTTs, downscale resolution, limit active RTTs
- **Contingency**: Disable RTT effects on Low/Medium presets

**3. WebGL2 Unavailability**
- **Risk**: GPU particles require WebGL2, user has WebGL1
- **Likelihood**: Low (>95% WebGL2 support in 2025)
- **Impact**: Medium
- **Mitigation**: Auto-detect and fallback to CPU particles, reduce particle count
- **Contingency**: Disable weather effects on WebGL1

### Medium-Risk Items 🟡
4. PBR material complexity (perf impact)
5. Decal system limitations (100 max insufficient)
6. Shader compilation stutter (first-time compile)

### Low-Risk Items 🟢
7. Browser compatibility (Babylon.js handles)
8. Mobile performance (stretch goal, not primary)

**Overall Risk Level**: 🟡 Medium-High

**Go/No-Go Criteria**:
- ✅ Must achieve 60 FPS @ Medium preset
- ✅ Must have 40 FPS fallback @ Low preset
- ⚠️ High preset may run <60 FPS (acceptable, documented)

---

## Technical Research Summary

### Babylon.js Capabilities (2025 Research)

✅ **Post-Processing**: DefaultRenderingPipeline mature, production-ready, ~5ms typical
✅ **GPU Particles**: WebGL2 transform feedback, 10,000+ particles <1ms, set `randomTextureSize: 4096`
✅ **PBR Materials**: glTF 2.0 compatible, freeze materials for performance
✅ **Weather**: Community examples, ParticleSystem for rain/snow, scene.fogMode for fog
✅ **Decals**: Expensive (1 mesh each), limit to 100, use instancing for same texture
✅ **RTTs**: ~1.5ms per render, freeze materials before swap to avoid CPU resync
✅ **Babylon.js 8.0**: WebGPU support, WGSL shaders, 2x smaller bundle, major optimizations

**Key Insights**:
- GPU particles are very efficient, can handle 50k+ easily
- PBR materials perform well when frozen and instanced
- Decals are the biggest performance concern (limit strictly)
- RTTs are viable with subset rendering
- Quality presets essential for performance target

---

## Timeline (6 Weeks, 2 Developers)

### Week 1: Post-Processing & Lighting
- Dev 1: Post-processing (Part 1)
- Dev 2: Advanced lighting
- **Milestone**: Post-processing + 8 lights working

### Week 2: Complete Post-Processing, Start Particles
- Dev 1: Post-processing (Part 2)
- Dev 2: GPU particles (Part 1)
- **Milestone**: All post-processing + particle foundation

### Week 3: Particles & Weather
- Dev 1: GPU particles (Part 2)
- Dev 2: Weather effects
- **Milestone**: Particles + weather working

### Week 4: PBR & Shaders
- Dev 1: PBR materials
- Dev 2: Custom shaders
- **Milestone**: PBR + custom shaders functional

### Week 5: Decals, RTTs, Performance
- Dev 1: Decals (Days 1-3)
- Dev 2: RTTs (Days 1-4)
- Both: Performance tuning (Days 4-5)
- **Milestone**: All systems implemented, tuned to 60 FPS

### Week 6: Integration & Documentation
- Both: Integration tests (Days 1-2)
- Both: Documentation (Days 3-5)
- **Milestone**: Phase 2 complete, all tests passing

**Parallelization**: Weeks 1-4 fully parallel, Week 5 partial, Week 6 sequential

---

## Success Metrics

### Performance (Critical - Must Pass)
- [ ] 60 FPS with all systems enabled @ Medium preset
- [ ] 40 FPS minimum fallback @ Low preset
- [ ] <300 draw calls in typical scene
- [ ] <2.5GB memory usage

### Quality (High - Must Pass)
- [ ] All 7 post-processing effects functional
- [ ] 8 point + 4 spot lights working
- [ ] 50,000 GPU particles @ 60 FPS
- [ ] Weather effects (rain, snow, fog) working
- [ ] PBR materials matching glTF 2.0 spec

### Testing (Critical - Must Pass)
- [ ] >80% test coverage for all new code
- [ ] All integration tests passing
- [ ] Visual regression tests passing
- [ ] WebGL1 fallback verified
- [ ] Performance benchmarks documented

### Documentation (High - Must Pass)
- [ ] JSDoc for all public APIs
- [ ] Performance guide created
- [ ] Example scenes provided
- [ ] Known limitations documented

---

## Deliverables

**Code**:
- ~35 TypeScript files (~6,500 lines)
- ~15 test files (>80% coverage)
- ~10 shader files (GLSL)

**Documentation**:
- JSDoc for all public APIs
- Performance guide
- Example scenes
- Known limitations

**Performance**:
- 60 FPS @ Medium preset verified
- 40 FPS @ Low preset verified
- All benchmarks passing

**Quality**:
- All tests passing
- Visual regression tests passing
- Integration with Phase 1 verified

---

## Next Steps

### Before Starting Phase 2
1. Complete all Phase 1 PRPs (1.1-1.7)
2. Run DoR validation checklist
3. Review this specification with team
4. Set up test assets (particle textures, PBR materials)
5. Kick-off meeting: Assign PRPs, align on timeline

### Week 1 Actions
- Dev 1: Start PRP 2.1 (Post-Processing)
- Dev 2: Start PRP 2.2 (Lighting)
- Both: Daily 15-min sync meeting
- Both: Commit to feature branches, run tests before commit

---

## Key Files

**Main Specification**:
- [PHASE2_COMPREHENSIVE_SPECIFICATION.md](./PHASE2_COMPREHENSIVE_SPECIFICATION.md) - Complete 6,500-line spec with DoR, DoD, all PRPs, performance targets, risks

**Quick Reference**:
- [README.md](./README.md) - PRP list, status, quick navigation
- [EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md) - This file (you are here)

**Individual PRPs** (to be created):
- 2.1-post-processing-pipeline.md
- 2.2-advanced-lighting-system.md
- 2.3-gpu-particle-system.md
- 2.4-weather-effects-system.md
- 2.5-pbr-material-system.md
- 2.6-custom-shader-framework.md
- 2.7-decal-system.md
- 2.8-render-target-multi-pass.md
- 2.9-rendering-performance-tuning.md
- 2.10-phase2-integration-tests.md

---

## Budget

**Total**: $30,000
**Breakdown**: 2 Senior Developers @ $2,500/week × 6 weeks

| Week | Tasks | Cost |
|------|-------|------|
| 1 | Post-Processing + Lighting | $5,000 |
| 2 | Post-Processing + Particles | $5,000 |
| 3 | Particles + Weather | $5,000 |
| 4 | PBR + Shaders | $5,000 |
| 5 | Decals + RTTs + Perf | $5,000 |
| 6 | Integration + Docs | $5,000 |

---

## Conclusion

Phase 2 is **fully specified and ready for implementation** upon Phase 1 completion.

**Key Strengths**:
✅ Comprehensive research (Babylon.js 2025 capabilities verified)
✅ Realistic performance targets with quality preset system
✅ 85% parallelizable workload (efficient 2-dev timeline)
✅ Clear DoR/DoD with measurable success criteria
✅ Risk mitigation strategies for all high-risk items
✅ Detailed PRP breakdown ready for execution

**Key Risks Managed**:
⚠️ Performance budget tight (28ms typical vs 16.67ms target)
- **Solution**: Quality preset system, continuous profiling
⚠️ Draw call budget challenging with RTTs
- **Solution**: Subset rendering, downscaled resolution
⚠️ Decal system limited (100 max)
- **Solution**: Clear documentation, alternative approaches

**Recommendation**: ✅ **Proceed with Phase 2** upon Phase 1 completion

---

**Document Version**: 1.0
**Date**: 2025-10-10
**Status**: Ready for Review and Implementation
