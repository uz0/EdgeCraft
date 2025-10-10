# Phase 2: Rendering Pipeline - Comprehensive Specification

## Executive Summary

**Phase**: 2 of 12
**Name**: Advanced Rendering Pipeline
**Duration**: 6 weeks (2 developers)
**Budget**: $30,000
**Status**: Awaiting Phase 1 Completion

**Strategic Goal**: Transform Edge Craft from a basic WebGL renderer into a production-grade RTS graphics engine with modern post-processing, dynamic lighting, particle systems, and weather effects that match AAA game visual quality.

---

## Table of Contents

1. [Definition of Ready (DoR)](#definition-of-ready-dor)
2. [Definition of Done (DoD)](#definition-of-done-dod)
3. [PRP Breakdown](#prp-breakdown)
4. [Performance Targets](#performance-targets)
5. [Risk Assessment](#risk-assessment)
6. [Technical Research Summary](#technical-research-summary)
7. [Timeline & Resource Allocation](#timeline--resource-allocation)

---

## Definition of Ready (DoR)

### What Phase 1 MUST Deliver

Phase 2 can only begin when Phase 1 provides the following verified capabilities:

#### 1. Rendering Foundation ✅ Required
- [ ] **Babylon.js Engine**: Stable 60 FPS with basic scene (PRP 1.1)
- [ ] **Advanced Terrain**: Multi-texture splatting with 4-level LOD working (PRP 1.2)
- [ ] **GPU Instancing**: 500+ units rendering at 60 FPS with thin instances (PRP 1.3)
- [ ] **Cascaded Shadows**: 3-cascade shadow maps functional (PRP 1.4)
- [ ] **Draw Call Budget**: Proven <200 draw calls in full scene (PRP 1.6)

#### 2. Asset Pipeline ✅ Required
- [ ] **glTF Loader**: Can load and render glTF 2.0 models (PRP 1.1)
- [ ] **Texture System**: Texture loading and caching working (PRP 1.1)
- [ ] **Material System**: StandardMaterial functional (PRP 1.1)

#### 3. Map Loading ✅ Required
- [ ] **W3X Parser**: Can extract terrain data from W3X maps (PRP 1.5)
- [ ] **SCM Parser**: Can extract terrain data from SCM maps (PRP 1.5)
- [ ] **.edgestory Format**: Conversion pipeline functional (PRP 1.5)

#### 4. Performance Baseline ✅ Required
- [ ] **60 FPS Proven**: Sustained 60 FPS with:
  - 256x256 terrain with multi-texture
  - 500 instanced units
  - Cascaded shadows enabled
  - <2GB memory usage
  - <200 draw calls

#### 5. Legal Compliance ✅ Required
- [ ] **Copyright Validation**: Automated asset scanning working (PRP 1.7)
- [ ] **CI/CD Pipeline**: Pre-commit hooks preventing copyrighted assets (PRP 1.7)
- [ ] **Asset Database**: Replacement mappings for 100+ Blizzard assets (PRP 1.7)

#### 6. Development Infrastructure ✅ Required
- [ ] **Build System**: Rolldown/Vite working with <5s rebuild (PRP 0.3)
- [ ] **TypeScript**: Strict mode enabled, all Phase 1 code passing (PRP 0.2)
- [ ] **Testing**: Jest functional, Phase 1 tests passing at >80% coverage (PRP 0.4)
- [ ] **Performance Monitoring**: FPS counter, memory profiler, GPU metrics (PRP 0.13)

#### 7. Documentation ✅ Required
- [ ] **Rendering API Docs**: JSDoc for all Phase 1 rendering classes
- [ ] **Performance Benchmarks**: Documented baseline metrics
- [ ] **Architecture Docs**: Engine structure clearly documented

### Verification Checklist

Before starting Phase 2, run these validation commands:

```bash
# Performance validation
npm run benchmark -- phase1-full-system
# Expected: 60 FPS, <200 draw calls, <2GB memory

# Unit tests
npm run test:phase1
# Expected: All tests pass, >80% coverage

# Integration tests
npm run test:integration -- map-loading
# Expected: W3X and SCM maps load successfully

# Legal compliance
npm run validate-assets
# Expected: Zero copyrighted assets detected

# TypeScript
npm run typecheck
# Expected: Zero errors

# Build
npm run build
# Expected: Success, <5s build time
```

---

## Definition of Done (DoD)

### What Phase 2 MUST Deliver

#### 1. Post-Processing Effects 🎨

**Feature**: DefaultRenderingPipeline with full effect suite

- [ ] **Bloom Effect**: Configurable intensity, threshold, kernel size
  - Quality modes: Low (mobile), Medium (desktop), High (enthusiast)
  - Performance: <2ms overhead at Medium quality
  - Controls: Intensity (0-2.0), Threshold (0-1.0), Kernel (16-256)

- [ ] **FXAA Anti-Aliasing**: Fast approximate anti-aliasing
  - Performance: <1ms overhead
  - Toggle-able for performance vs quality
  - Comparable quality to 2x MSAA

- [ ] **Color Grading**: LUT-based color correction
  - Support 16x16x16 and 32x32x32 LUT textures
  - Pre-made LUTs: Warm, Cool, Desaturated, High Contrast
  - Custom LUT loading via texture upload
  - <0.5ms overhead

- [ ] **Tone Mapping**: HDR to LDR conversion
  - Operators: Standard, ACES, Reinhard, Hable (Uncharted 2)
  - Exposure control (-2.0 to +2.0 EV)
  - <0.3ms overhead

- [ ] **Depth of Field**: Bokeh blur for focal depth
  - Focus distance and aperture controls
  - Circle of confusion calculation
  - Quality modes: Low (fast), High (cinematic)
  - <3ms overhead at Low quality

- [ ] **Chromatic Aberration**: RGB channel separation
  - Radial aberration from screen center
  - Intensity control (0-100)
  - <0.3ms overhead

- [ ] **Vignette**: Screen edge darkening
  - Customizable size, intensity, color
  - <0.2ms overhead

**Performance Target**: Full pipeline enabled <8ms (120 FPS overhead budget)

**Test Requirements**:
```typescript
// Test coverage required
describe('PostProcessingPipeline', () => {
  it('maintains 60 FPS with all effects enabled');
  it('degrades gracefully on low-end hardware');
  it('allows per-effect toggling');
  it('preserves GUI rendering (no double-apply)');
});
```

#### 2. Advanced Lighting System 💡

**Feature**: Dynamic multi-light system beyond basic hemisphere

- [ ] **Point Lights**: Omnidirectional light sources
  - Up to 8 simultaneous point lights
  - Range and intensity controls
  - Attenuation: Inverse square distance
  - Performance: <0.5ms per 4 lights

- [ ] **Spot Lights**: Directional cone lights
  - Up to 4 simultaneous spot lights
  - Angle, exponent, range controls
  - Cookie texture support (projected patterns)
  - Performance: <0.8ms per 2 lights

- [ ] **Directional Lights**: Infinite distance (sun/moon)
  - Already implemented via cascaded shadows (Phase 1)
  - Extend with color temperature control
  - Day/night transition support

- [ ] **Ambient Light Enhancement**:
  - Ambient color per-scene
  - Hemisphere split (ground vs sky color)
  - Indirect lighting approximation

- [ ] **Light Manager**:
  - Automatic light culling (closest 8 point + 4 spot)
  - Light importance scoring (brightness × screen size)
  - Per-frame light budget enforcement
  - Dynamic light pool allocation

**Performance Target**: 8 point + 4 spot lights @ <2ms overhead

**Test Requirements**:
```typescript
describe('LightingSystem', () => {
  it('culls distant lights automatically');
  it('prioritizes bright lights near camera');
  it('supports dynamic light creation/removal');
  it('maintains performance with max lights');
});
```

#### 3. GPU Particle Systems 🎆

**Feature**: High-performance particle effects using WebGL2 transform feedback

- [ ] **GPUParticleSystem**: 10,000+ particles per system
  - Lifetime control (min/max)
  - Emission rate and bursts
  - Billboard rendering (camera-facing)
  - Texture atlas support (animated sprites)
  - Color over lifetime (gradient)
  - Size over lifetime (growth/shrink)
  - Velocity and gravity
  - Performance: 10,000 particles @ <1ms

- [ ] **Particle Pool Manager**:
  - Reuse particle systems (object pooling)
  - Pre-warm pools for common effects
  - Automatic cleanup of finished systems

- [ ] **Built-in Effect Presets**:
  - Fire (orange/yellow upward flames)
  - Smoke (gray/white billowing)
  - Sparks (small bright fast particles)
  - Dust (slow brown/tan particles)
  - Magic (customizable colorful effects)

- [ ] **Fallback Support**:
  - Detect WebGL2 support
  - Fall back to CPU ParticleSystem if unavailable
  - Reduce max particles on fallback (1,000 vs 10,000)

**Performance Target**: 5 concurrent effects (50,000 particles) @ <5ms

**Test Requirements**:
```typescript
describe('ParticleSystem', () => {
  it('supports 10,000 GPU particles at 60 FPS');
  it('falls back to CPU particles on WebGL1');
  it('pools and reuses particle systems');
  it('cleans up finished effects');
});
```

#### 4. Weather Effects System ⛈️

**Feature**: Atmospheric weather with rain, snow, and fog

- [ ] **Rain System**:
  - Particle-based raindrops (GPU particles)
  - Splash particles on ground impact
  - Configurable intensity (light, medium, heavy)
  - Wind direction and strength
  - Performance: <2ms for heavy rain

- [ ] **Snow System**:
  - Floating snowflake particles
  - Slower fall speed vs rain
  - Gentle drift motion (sine wave)
  - Accumulation effect (future: decals)
  - Performance: <1.5ms for heavy snow

- [ ] **Fog System**:
  - Exponential fog mode (density-based)
  - Linear fog mode (near/far planes)
  - Volumetric fog approximation
  - Time-of-day color tinting
  - Performance: <0.3ms overhead

- [ ] **Weather Manager**:
  - Smooth transitions between weather states
  - Blend multiple weather types (rain + fog)
  - Time-of-day integration
  - Audio integration hooks (for Phase 10)

**Performance Target**: Combined weather (rain + fog) @ <3ms

**Test Requirements**:
```typescript
describe('WeatherSystem', () => {
  it('transitions smoothly between weather types');
  it('maintains performance during heavy rain');
  it('combines fog with particle weather');
  it('respects particle budget limits');
});
```

#### 5. PBR Material System 🎨

**Feature**: Physically-based rendering for realistic materials

- [ ] **PBRMetallicRoughnessMaterial**:
  - Albedo/Base Color texture
  - Metallic-Roughness texture (packed)
  - Normal map support
  - Ambient Occlusion texture
  - Emissive texture
  - glTF 2.0 compatibility

- [ ] **Material Presets**:
  - Metal (high metallic, low roughness)
  - Wood (low metallic, medium roughness)
  - Stone (low metallic, high roughness)
  - Fabric (low metallic, varied roughness)
  - Glass (high metallic, low roughness, refractive)

- [ ] **Performance Optimizations**:
  - Material instance sharing
  - Shader code caching
  - LOD-based material swapping (simple materials at distance)
  - Freeze materials after creation

- [ ] **Shader Variants**:
  - Support with/without each texture type
  - Generate minimal shader code per variant
  - Runtime shader compilation caching

**Performance Target**: 100+ PBR materials @ <5ms material overhead

**Test Requirements**:
```typescript
describe('PBRMaterialSystem', () => {
  it('loads glTF PBR materials correctly');
  it('supports all texture types');
  it('shares material instances efficiently');
  it('maintains performance with 100+ materials');
});
```

#### 6. Decal System 🎯

**Feature**: Projected decals for terrain details and effects

- [ ] **Mesh Decal System**:
  - Project texture onto mesh surface
  - Configurable size, rotation, opacity
  - Normal map decals (detail enhancement)
  - Depth-based clipping

- [ ] **Performance Optimizations**:
  - Decal pooling (max 100 active decals)
  - Automatic old decal removal (FIFO)
  - Instanced decal rendering (same texture)
  - Distance-based fade-out

- [ ] **Built-in Decal Types**:
  - Scorch marks (black circular)
  - Blood splatter (red irregular)
  - Footprints (unit tracks)
  - Magic circles (abilities)
  - Generic dirt/damage

- [ ] **Optimization Strategy**:
  - Due to mesh creation overhead, limit to 100 decals max
  - Use texture atlasing for batch rendering
  - Consider deferred decal technique (future Phase 11 optimization)

**Performance Target**: 50 active decals @ <5ms overhead (10 draw calls)

**Note**: Decals are intentionally limited due to performance. Each decal = 1 mesh + 1 draw call. For high-frequency effects (bullet holes), use texture splatting on terrain instead.

**Test Requirements**:
```typescript
describe('DecalSystem', () => {
  it('creates decals on terrain mesh');
  it('limits decals to max pool size');
  it('removes old decals automatically');
  it('instances decals with same texture');
});
```

#### 7. Render Target & Multi-Pass System 🎬

**Feature**: Render-to-texture for advanced effects and optimization

- [ ] **RenderTargetTexture (RTT) Support**:
  - Render scene to texture
  - Configurable resolution (power of 2)
  - Depth buffer support
  - Manual or automatic refresh

- [ ] **Use Cases Implemented**:
  - **Minimap Rendering**: Top-down view to RTT
  - **Mirror/Portal Surfaces**: Reflected scene
  - **Dynamic Shadows**: Shadow map generation (already in Phase 1)
  - **Post-Process Input**: Scene texture for effects

- [ ] **Multi-Pass Manager**:
  - Orchestrate multiple RTT renders
  - Ping-pong buffers for iterative effects
  - Depth pre-pass for optimization
  - Geometry buffer (deferred rendering prep)

- [ ] **Performance Optimizations**:
  - Freeze materials before RTT swap (avoid resync)
  - Downscale RTT resolution for distant views
  - Cull unnecessary render passes
  - Share RTT between similar effects

**Performance Target**: 3 active RTTs @ <5ms overhead

**Test Requirements**:
```typescript
describe('RenderTargetSystem', () => {
  it('renders scene to texture correctly');
  it('supports multiple active RTTs');
  it('maintains performance with RTTs');
  it('handles RTT resolution scaling');
});
```

#### 8. Custom Shader System 🔧

**Feature**: Hot-reloadable custom shader pipeline for advanced effects

- [ ] **ShaderMaterial Framework**:
  - GLSL vertex + fragment shader support
  - Uniform passing from TypeScript
  - Attribute mapping (position, uv, normal, etc.)
  - Shader compilation error handling

- [ ] **Hot Reload Support**:
  - Watch shader files for changes
  - Recompile and swap on save
  - Developer-friendly error messages
  - Fallback to default shader on error

- [ ] **Built-in Custom Shaders**:
  - Terrain multi-texture (already in Phase 1)
  - Water surface (animated waves, reflections)
  - Force field (distortion, opacity pulse)
  - Hologram (scan lines, flicker)

- [ ] **Shader Library Integration**:
  - BABYLON.Effect.ShadersStore registration
  - Include system for shared shader code
  - Shader variant generation

**Performance Target**: Custom shaders perform equivalent to built-in materials

**Test Requirements**:
```typescript
describe('CustomShaderSystem', () => {
  it('compiles custom shaders successfully');
  it('hot-reloads shaders during development');
  it('handles shader compilation errors gracefully');
  it('passes uniforms correctly from TypeScript');
});
```

---

### Phase 2 Deliverables Summary

**Files Created**: ~35 TypeScript files, ~15 test files, ~10 shader files
**Total Lines**: ~6,500 lines of code
**Test Coverage**: >80% for all new modules
**Documentation**: JSDoc for all public APIs

**Performance Guarantee**: Full Phase 2 systems enabled:
- 60 FPS with all post-processing effects
- 8 point + 4 spot lights
- 50,000 particles (5 concurrent effects)
- Weather effects (rain + fog)
- 50 active decals
- 3 active render targets
- 100+ PBR materials

**Budget**: <25ms total rendering time (40 FPS minimum worst-case)

---

## PRP Breakdown

### Overview Table

| ID | PRP Name | Effort | Priority | Parallelizable | Dependencies |
|----|----------|--------|----------|----------------|--------------|
| **2.1** | Post-Processing Pipeline | 6 days | 🔴 Critical | ✅ Yes | Phase 1 complete |
| **2.2** | Advanced Lighting System | 5 days | 🔴 Critical | ✅ Yes | Phase 1 complete |
| **2.3** | GPU Particle System | 5 days | 🟡 High | ✅ Yes | Phase 1 complete |
| **2.4** | Weather Effects | 4 days | 🟡 High | ⚠️ Partial | 2.3 (particles) |
| **2.5** | PBR Material System | 5 days | 🟡 High | ✅ Yes | Phase 1 complete |
| **2.6** | Custom Shader Framework | 4 days | 🟢 Medium | ✅ Yes | Phase 1 complete |
| **2.7** | Decal System | 3 days | 🟢 Medium | ✅ Yes | Phase 1 complete |
| **2.8** | Render Target System | 4 days | 🟡 High | ✅ Yes | Phase 1 complete |
| **2.9** | Rendering Performance Tuning | 3 days | 🔴 Critical | ❌ No | All PRPs done |
| **2.10** | Phase 2 Integration Tests | 2 days | 🔴 Critical | ❌ No | All PRPs done |

**Total Effort**: 41 developer-days (~8.5 weeks solo, ~4.5 weeks with 2 devs)
**Parallelization Factor**: 85% of work can be done in parallel

---

### PRP 2.1: Post-Processing Pipeline

**File**: `2.1-post-processing-pipeline.md`
**Effort**: 6 days | **Lines**: ~1,200 | **Priority**: 🔴 Critical

#### What It Adds
- Babylon.js DefaultRenderingPipeline integration
- Bloom, FXAA, color grading, tone mapping, DoF, chromatic aberration, vignette
- Quality preset system (Low/Medium/High)
- Per-effect toggle controls
- GUI integration for runtime tweaking

#### Implementation Plan
```
src/engine/rendering/
├── PostProcessingManager.ts       # Pipeline orchestration (300 lines)
├── PostProcessEffects.ts          # Effect configurations (200 lines)
├── PostProcessPresets.ts          # Quality presets (150 lines)
└── types.ts                       # Type definitions (50 lines)

src/engine/rendering/effects/
├── BloomEffect.ts                 # Bloom wrapper (100 lines)
├── ColorGradingEffect.ts          # LUT-based grading (120 lines)
├── DepthOfFieldEffect.ts          # DoF implementation (150 lines)
└── types.ts                       # Effect-specific types (80 lines)

tests/rendering/
├── PostProcessingManager.test.ts  # Unit tests (150 lines)
└── effects/                       # Per-effect tests (200 lines)
```

#### Key Technical Details
- Use `scene.postProcessRenderPipelineManager` for management
- Create `DefaultRenderingPipeline` instance per scene
- Handle GUI special case (avoid double-apply)
- Implement quality scaling for mobile/desktop

#### Performance Budget
- Bloom: <2ms (Medium quality)
- FXAA: <1ms
- Color Grading: <0.5ms
- Tone Mapping: <0.3ms
- DoF: <3ms (Low quality)
- Others: <0.5ms each
- **Total**: <8ms all effects enabled

#### Success Criteria
- [ ] All 7 post-processing effects functional
- [ ] Quality presets switch without flicker
- [ ] Performance stays within budget
- [ ] GUI renders correctly (not double-processed)
- [ ] >80% test coverage

---

### PRP 2.2: Advanced Lighting System

**File**: `2.2-advanced-lighting-system.md`
**Effort**: 5 days | **Lines**: ~900 | **Priority**: 🔴 Critical

#### What It Adds
- Point light system (up to 8)
- Spot light system (up to 4)
- Light manager with automatic culling
- Light importance scoring
- Ambient light enhancement

#### Implementation Plan
```
src/engine/lighting/
├── LightManager.ts                # Central light management (350 lines)
├── PointLight.ts                  # Point light wrapper (120 lines)
├── SpotLight.ts                   # Spot light wrapper (150 lines)
├── LightCuller.ts                 # Distance/importance culling (180 lines)
└── types.ts                       # Type definitions (100 lines)

tests/lighting/
├── LightManager.test.ts           # Unit tests (150 lines)
├── LightCuller.test.ts            # Culling tests (100 lines)
└── integration.test.ts            # Full system test (150 lines)
```

#### Key Technical Details
- Use `BABYLON.PointLight` and `BABYLON.SpotLight`
- Implement custom culling before Babylon's internal culling
- Score lights by: `brightness * screenSizeOfInfluenceArea`
- Update light pool every frame for dynamic scenes
- Support cookie textures via `projectionTexture` property

#### Performance Budget
- Point lights: <0.5ms per 4 lights
- Spot lights: <0.8ms per 2 lights
- Culling overhead: <0.2ms
- **Total**: <2ms for 8 point + 4 spot

#### Success Criteria
- [ ] 8 point lights @ 60 FPS
- [ ] 4 spot lights @ 60 FPS
- [ ] Automatic culling working
- [ ] Cookie texture projection working
- [ ] >80% test coverage

---

### PRP 2.3: GPU Particle System

**File**: `2.3-gpu-particle-system.md`
**Effort**: 5 days | **Lines**: ~1,100 | **Priority**: 🟡 High

#### What It Adds
- GPUParticleSystem wrapper (WebGL2)
- CPU ParticleSystem fallback (WebGL1)
- Particle pool manager
- Built-in effect presets (fire, smoke, sparks, dust, magic)
- Texture atlas support

#### Implementation Plan
```
src/engine/particles/
├── ParticleManager.ts             # Pool and system management (300 lines)
├── GPUParticleEffect.ts           # GPU particle wrapper (250 lines)
├── ParticleEffectPresets.ts       # Built-in effects (200 lines)
├── ParticlePool.ts                # Object pooling (150 lines)
└── types.ts                       # Type definitions (100 lines)

assets/particles/
├── fire_atlas.png                 # Fire sprite sheet
├── smoke_atlas.png                # Smoke sprite sheet
└── sparks_atlas.png               # Sparks sprite sheet

tests/particles/
├── ParticleManager.test.ts        # Unit tests (150 lines)
├── GPUParticleEffect.test.ts      # GPU tests (100 lines)
└── performance.test.ts            # 10k particle test (100 lines)
```

#### Key Technical Details
- Check `BABYLON.GPUParticleSystem.IsSupported` for WebGL2
- Use `randomTextureSize: 4096` for better performance
- Implement pool with `acquire()` and `release()` pattern
- Pre-warm pools on scene load
- Use texture atlases for animated sprites (4x4 grid = 16 frames)

#### Performance Budget
- 10,000 GPU particles: <1ms
- 5 concurrent effects (50k particles): <5ms
- Pool overhead: <0.1ms
- **Total**: <5ms for typical RTS battle scene

#### Success Criteria
- [ ] 10,000 GPU particles @ 60 FPS
- [ ] Fallback to CPU particles works
- [ ] Pool reuses systems correctly
- [ ] All 5 presets working
- [ ] >80% test coverage

---

### PRP 2.4: Weather Effects System

**File**: `2.4-weather-effects-system.md`
**Effort**: 4 days | **Lines**: ~850 | **Priority**: 🟡 High

#### What It Adds
- Rain system (GPU particles)
- Snow system (GPU particles)
- Fog system (scene fog modes)
- Weather manager for transitions
- Time-of-day integration

#### Implementation Plan
```
src/engine/weather/
├── WeatherManager.ts              # Central weather control (300 lines)
├── RainEffect.ts                  # Rain implementation (180 lines)
├── SnowEffect.ts                  # Snow implementation (150 lines)
├── FogEffect.ts                   # Fog control (120 lines)
└── types.ts                       # Type definitions (100 lines)

tests/weather/
├── WeatherManager.test.ts         # Unit tests (150 lines)
├── integration.test.ts            # Weather transitions (100 lines)
└── performance.test.ts            # Combined weather perf (100 lines)
```

#### Key Technical Details
- Rain: Vertical particles with high velocity, splash on impact
- Snow: Slow particles with sine wave drift
- Fog: Use `BABYLON.Scene.fogMode = BABYLON.Scene.FOGMODE_EXP`
- Transition: Lerp between weather states over 5 seconds
- Wind: Apply force vector to particle velocity

#### Performance Budget
- Rain (heavy): <2ms
- Snow (heavy): <1.5ms
- Fog: <0.3ms
- Manager overhead: <0.2ms
- **Total**: <3ms for rain + fog (worst case)

#### Success Criteria
- [ ] All 3 weather types working
- [ ] Smooth transitions (no pop)
- [ ] Combined weather @ 60 FPS
- [ ] Wind direction affects particles
- [ ] >80% test coverage

---

### PRP 2.5: PBR Material System

**File**: `2.5-pbr-material-system.md`
**Effort**: 5 days | **Lines**: ~1,000 | **Priority**: 🟡 High

#### What It Adds
- PBRMetallicRoughnessMaterial support
- Material presets (metal, wood, stone, fabric, glass)
- Material instance sharing
- LOD-based material swapping
- glTF 2.0 material loading

#### Implementation Plan
```
src/engine/materials/
├── PBRMaterialManager.ts          # Material orchestration (300 lines)
├── PBRMaterialPresets.ts          # Built-in presets (200 lines)
├── MaterialInstanceCache.ts       # Instance sharing (150 lines)
├── MaterialLOD.ts                 # LOD material swap (150 lines)
└── types.ts                       # Type definitions (100 lines)

assets/materials/
├── presets/                       # Preset textures
│   ├── metal_albedo.png
│   ├── metal_metallic_roughness.png
│   ├── wood_albedo.png
│   └── ... (5 presets × 4 textures)

tests/materials/
├── PBRMaterialManager.test.ts     # Unit tests (150 lines)
├── MaterialInstanceCache.test.ts  # Caching tests (100 lines)
└── glTF_integration.test.ts       # glTF loading (150 lines)
```

#### Key Technical Details
- Use `BABYLON.PBRMetallicRoughnessMaterial`
- Share instances via hash of texture URLs + properties
- Freeze materials after creation: `material.freeze()`
- LOD: Swap to StandardMaterial at >500m distance
- glTF: Load via `@babylonjs/loaders`, materials auto-created

#### Performance Budget
- Material overhead: <5ms for 100+ materials (via sharing)
- Swap time: <0.1ms per material (frozen materials)
- **Total**: Negligible once cached

#### Success Criteria
- [ ] All 5 presets working
- [ ] glTF materials load correctly
- [ ] Instance sharing reduces memory
- [ ] LOD swap improves performance
- [ ] >80% test coverage

---

### PRP 2.6: Custom Shader Framework

**File**: `2.6-custom-shader-framework.md`
**Effort**: 4 days | **Lines**: ~900 | **Priority**: 🟢 Medium

#### What It Adds
- ShaderMaterial creation utilities
- Hot reload support (development)
- Shader error handling
- Built-in custom shaders (water, force field, hologram)
- Shader library integration

#### Implementation Plan
```
src/engine/shaders/
├── ShaderManager.ts               # Shader compilation (250 lines)
├── ShaderHotReload.ts             # Dev hot reload (180 lines)
├── ShaderLibrary.ts               # Shared code includes (150 lines)
└── types.ts                       # Type definitions (80 lines)

src/engine/shaders/custom/
├── WaterShader.ts                 # Animated water (120 lines)
├── ForceFieldShader.ts            # Force field effect (100 lines)
├── HologramShader.ts              # Hologram effect (100 lines)
└── index.ts                       # Exports (20 lines)

assets/shaders/
├── water.vertex.fx                # Water vertex shader
├── water.fragment.fx              # Water fragment shader
├── forcefield.vertex.fx
├── forcefield.fragment.fx
├── hologram.vertex.fx
└── hologram.fragment.fx

tests/shaders/
├── ShaderManager.test.ts          # Compilation tests (120 lines)
├── CustomShaders.test.ts          # Shader tests (100 lines)
└── HotReload.test.ts              # Dev tests (80 lines)
```

#### Key Technical Details
- Register shaders in `BABYLON.Effect.ShadersStore`
- Use `fs.watch()` for hot reload (dev only)
- Validate shader compilation before swap
- Provide fallback to default material on error
- Support `#include` for shared code (noise, lighting, etc.)

#### Performance Budget
- Shader compilation: One-time cost <100ms per shader
- Runtime: Equivalent to built-in materials
- Hot reload: Dev only, no production impact

#### Success Criteria
- [ ] All 3 custom shaders working
- [ ] Hot reload works in dev mode
- [ ] Errors display helpful messages
- [ ] Shader library includes functional
- [ ] >80% test coverage

---

### PRP 2.7: Decal System

**File**: `2.7-decal-system.md`
**Effort**: 3 days | **Lines**: ~650 | **Priority**: 🟢 Medium

#### What It Adds
- Mesh decal projection
- Decal pooling (max 100)
- Built-in decal types (scorch, blood, footprint, magic circle, dirt)
- Automatic old decal removal (FIFO)
- Texture atlas batching

#### Implementation Plan
```
src/engine/decals/
├── DecalManager.ts                # Pool and placement (280 lines)
├── DecalProjector.ts              # Mesh projection (180 lines)
├── DecalPresets.ts                # Built-in decal types (120 lines)
└── types.ts                       # Type definitions (70 lines)

assets/decals/
├── scorch.png                     # Scorch mark texture
├── blood.png                      # Blood splatter texture
├── footprint.png                  # Footprint texture
├── magic_circle.png               # Magic circle texture
└── dirt.png                       # Dirt texture

tests/decals/
├── DecalManager.test.ts           # Unit tests (120 lines)
├── DecalProjector.test.ts         # Projection tests (80 lines)
└── performance.test.ts            # 100 decal test (100 lines)
```

#### Key Technical Details
- Use `BABYLON.MeshBuilder.CreateDecal()`
- Pool size: 100 decals max (performance constraint)
- FIFO removal: Remove oldest when pool full
- Atlas batching: Same texture = instance rendering
- Distance fade: Opacity *= (1 - distance/maxDistance)

#### Performance Budget
- 50 active decals: <5ms (10 draw calls via instancing)
- Projection time: <2ms per decal creation
- **Total**: <5ms overhead typical case

**Known Limitation**: Decals are expensive (1 mesh each). For high-frequency effects, use texture splatting instead.

#### Success Criteria
- [ ] Decals project onto terrain correctly
- [ ] Pool enforces 100 max limit
- [ ] Old decals removed automatically
- [ ] Texture atlas reduces draw calls
- [ ] >80% test coverage

---

### PRP 2.8: Render Target & Multi-Pass System

**File**: `2.8-render-target-multi-pass.md`
**Effort**: 4 days | **Lines**: ~850 | **Priority**: 🟡 High

#### What It Adds
- RenderTargetTexture management
- Multi-pass rendering orchestration
- Use cases: Minimap, mirrors, portals
- Ping-pong buffer support
- Performance optimizations

#### Implementation Plan
```
src/engine/rendering/
├── RenderTargetManager.ts         # RTT orchestration (300 lines)
├── MultiPassRenderer.ts           # Multi-pass logic (250 lines)
├── MinimapRenderer.ts             # Minimap use case (180 lines)
└── types.ts                       # Type definitions (120 lines)

tests/rendering/
├── RenderTargetManager.test.ts    # Unit tests (150 lines)
├── MultiPassRenderer.test.ts      # Multi-pass tests (120 lines)
└── performance.test.ts            # RTT performance (100 lines)
```

#### Key Technical Details
- Create RTT: `new BABYLON.RenderTargetTexture(name, size, scene)`
- Freeze materials before render: Avoid CPU resync overhead
- Downscale RTT: Use 512x512 for minimap instead of full res
- Ping-pong: Two RTTs, swap input/output each pass
- Render list: Control which meshes render to RTT

#### Performance Budget
- 1 RTT: <1.5ms per render
- 3 RTTs: <5ms total (minimap + 2 effects)
- Material freeze overhead: <0.1ms

#### Success Criteria
- [ ] RTT renders scene correctly
- [ ] Minimap implementation working
- [ ] Multi-pass ping-pong functional
- [ ] Performance within budget
- [ ] >80% test coverage

---

### PRP 2.9: Rendering Performance Tuning

**File**: `2.9-rendering-performance-tuning.md`
**Effort**: 3 days | **Lines**: ~500 | **Priority**: 🔴 Critical

#### What It Adds
- End-to-end performance profiling
- Bottleneck identification and fixes
- Quality preset system integration
- Mobile/low-end device support
- Performance regression tests

#### Implementation Plan
```
src/engine/performance/
├── RenderingProfiler.ts           # Performance measurement (200 lines)
├── QualityPresets.ts              # Auto quality scaling (180 lines)
└── types.ts                       # Type definitions (80 lines)

tests/performance/
├── phase2_full_system.test.ts     # Full system benchmark (150 lines)
├── quality_scaling.test.ts        # Preset tests (100 lines)
└── regression.test.ts             # Performance regression (120 lines)
```

#### Key Technical Details
- Use `scene.getEngine().getFps()` and `getDeltaTime()`
- Profile via `performance.mark()` and `performance.measure()`
- Auto quality: Drop effects if FPS <45 for 3 seconds
- Presets: Low (mobile), Medium (desktop), High (enthusiast), Ultra (overkill)

#### Performance Budget
- **Target**: 60 FPS all systems enabled (Medium preset)
- **Minimum**: 40 FPS worst-case (Low preset fallback)
- **Enthusiast**: 120 FPS on high-end hardware (High preset)

#### Success Criteria
- [ ] Full Phase 2 @ 60 FPS (Medium preset)
- [ ] Auto quality scaling working
- [ ] All systems profiled and documented
- [ ] Regression tests prevent future slowdowns
- [ ] >80% test coverage

---

### PRP 2.10: Phase 2 Integration Tests

**File**: `2.10-phase2-integration-tests.md`
**Effort**: 2 days | **Lines**: ~600 | **Priority**: 🔴 Critical

#### What It Adds
- End-to-end integration tests
- Visual regression tests (screenshot comparison)
- Performance benchmark suite
- Compatibility tests (WebGL1 vs WebGL2)
- Documentation and examples

#### Implementation Plan
```
tests/integration/phase2/
├── full_scene.test.ts             # All systems together (200 lines)
├── visual_regression.test.ts      # Screenshot tests (150 lines)
├── webgl_compatibility.test.ts    # WebGL1/2 tests (150 lines)
└── benchmark_suite.ts             # Performance suite (200 lines)

examples/phase2/
├── showcase.html                  # Visual showcase page
└── performance_test.html          # Interactive perf test
```

#### Key Technical Details
- Use `jest-image-snapshot` for visual regression
- Capture screenshots at 1920x1080 resolution
- Compare with baseline screenshots
- Allow 1% pixel difference threshold
- Run benchmarks on standardized hardware specs

#### Success Criteria
- [ ] All integration tests passing
- [ ] Visual regression tests working
- [ ] Benchmark suite runs successfully
- [ ] WebGL1 fallbacks verified
- [ ] Examples showcase all features

---

## Performance Targets

### Frame Time Budget (60 FPS = 16.67ms)

| System | Budget | Typical | Peak | Notes |
|--------|--------|---------|------|-------|
| **Phase 1 Baseline** | 8ms | 7ms | 10ms | Terrain + units + shadows |
| **Post-Processing** | 8ms | 5ms | 8ms | All effects Medium quality |
| **Advanced Lighting** | 2ms | 1.5ms | 2ms | 8 point + 4 spot lights |
| **GPU Particles** | 5ms | 3ms | 5ms | 50k particles (5 effects) |
| **Weather** | 3ms | 2ms | 3ms | Rain + fog |
| **PBR Materials** | 5ms | 3ms | 5ms | 100+ materials via sharing |
| **Decals** | 5ms | 3ms | 5ms | 50 decals instanced |
| **Render Targets** | 5ms | 3ms | 5ms | 3 active RTTs |
| **Other** | 2ms | 1ms | 2ms | GUI, picking, misc |
| **TOTAL** | **43ms** | **28.5ms** | **45ms** | - |

**Analysis**:
- **Typical Case**: 28.5ms = 35 FPS (below 60 FPS target) ⚠️
- **Optimization Required**: Yes
- **Strategy**: Quality presets + auto-scaling

### Quality Preset System

To achieve 60 FPS, implement automatic quality scaling:

#### Low Preset (Mobile / Integrated GPU)
- **Target**: 40 FPS minimum
- Post-Processing: FXAA only
- Lighting: 4 point lights max
- Particles: 5k max, CPU fallback
- Weather: Fog only (no particles)
- Materials: StandardMaterial instead of PBR
- Decals: 20 max
- RTTs: 1 max (minimap only, 256x256)
- **Estimated**: ~15ms overhead = 43 FPS total

#### Medium Preset (Desktop / Dedicated GPU)
- **Target**: 60 FPS
- Post-Processing: Bloom + FXAA + Tone Mapping + Vignette
- Lighting: 8 point + 2 spot lights
- Particles: 25k max (3 effects)
- Weather: Light rain + fog
- Materials: PBR with LOD swap >500m
- Decals: 50 max
- RTTs: 2 max (minimap + 1 effect)
- **Estimated**: ~20ms overhead = 56 FPS total

#### High Preset (Enthusiast / High-end GPU)
- **Target**: 90 FPS
- Post-Processing: All effects enabled
- Lighting: 8 point + 4 spot lights
- Particles: 50k max (5 effects)
- Weather: Heavy rain + snow + fog
- Materials: Full PBR everywhere
- Decals: 100 max
- RTTs: 3 max
- **Estimated**: ~28ms overhead = 35 FPS (need Phase 11 optimizations)

### Memory Budget

| System | Budget | Typical | Peak | Notes |
|--------|--------|---------|------|-------|
| **Phase 1 Baseline** | 1.5GB | 1.2GB | 1.5GB | Terrain + models + textures |
| **Post-Processing** | 200MB | 100MB | 200MB | RTT buffers for effects |
| **Particles** | 100MB | 50MB | 100MB | GPU buffers + textures |
| **PBR Textures** | 300MB | 200MB | 300MB | 5 texture types × 20 materials |
| **Decals** | 50MB | 30MB | 50MB | 100 decal meshes |
| **RTTs** | 150MB | 100MB | 150MB | 3× 1024x1024 RGBA + depth |
| **Other** | 100MB | 50MB | 100MB | Shaders, misc |
| **TOTAL** | **2.4GB** | **1.73GB** | **2.4GB** | Within 4GB browser limit |

### Draw Call Budget

| System | Draw Calls | Notes |
|--------|------------|-------|
| **Phase 1 Baseline** | 150 | Terrain chunks + instanced units + shadows |
| **Post-Processing** | 10 | 1 per effect pass |
| **Lighting** | 0 | Handled in material shaders |
| **Particles** | 5 | 1 per effect (GPU particles) |
| **Decals** | 10 | 50 decals → 10 via instancing |
| **RTTs** | 150×3 | 3 RTTs × scene draw calls (worst case) |
| **TOTAL** | **625** | Exceeds budget! Need optimization |

**Draw Call Optimization Strategy**:
- **RTT Optimization**: Only render subset of scene to RTTs (not full 150)
  - Minimap: Render terrain + units only = ~50 draw calls
  - Effects: Render specific meshes only = ~20 draw calls
  - Revised RTT total: ~100 draw calls
- **Particle Instancing**: Batch all same-type particles = 5 → 3
- **Decal Atlasing**: Better instancing = 10 → 5
- **Revised Total**: 150 + 10 + 3 + 5 + 100 = **268 draw calls** ✅

### Network Bandwidth (for Phase 9 Multiplayer)

Phase 2 has minimal network impact:
- Particle sync: Position only, no particle data
- Light sync: Position + intensity
- Weather sync: Current state enum (4 bytes)
- **Total**: <100 bytes/second additional

---

## Risk Assessment

### High-Risk Items 🔴

#### 1. Performance Budget Exceeded
**Risk**: Combined Phase 1 + Phase 2 systems exceed 16.67ms frame time, causing <60 FPS

**Likelihood**: High (initial estimates show 28ms typical)
**Impact**: Critical (fails DoD requirement)
**Mitigation**:
- Implement quality preset system from day 1
- Profile continuously during development
- Have fallback implementations ready (e.g., CPU particles)
- Consider deferred rendering for Phase 11 if needed

**Contingency Plan**:
- If FPS <60 at Medium preset, drop to Low preset by default
- Document as "requires high-end GPU for Medium preset"
- Prioritize Phase 11 optimization work

#### 2. Draw Call Budget Exceeded
**Risk**: RTTs multiply draw calls, causing GPU bottleneck

**Likelihood**: Medium (RTTs are expensive)
**Impact**: High (performance degradation)
**Mitigation**:
- Render minimal meshes to RTTs (not full scene)
- Downscale RTT resolution (512x512 instead of 1024x1024)
- Limit active RTTs to 2 (minimap + 1 effect max)
- Use RTT refresh rate throttling (update every 2-3 frames)

**Contingency Plan**:
- Disable RTT effects on Low preset
- Minimap only on Medium preset
- Full RTT features on High preset only

#### 3. WebGL2 Unavailability
**Risk**: GPU particles require WebGL2, but user has WebGL1 browser

**Likelihood**: Low (WebGL2 support >95% as of 2025)
**Impact**: Medium (degraded particle quality)
**Mitigation**:
- Detect WebGL2 with `BABYLON.GPUParticleSystem.IsSupported`
- Automatic fallback to CPU `ParticleSystem`
- Reduce particle count on fallback (10k → 1k)

**Contingency Plan**:
- Display message: "For best performance, use a WebGL2-compatible browser"
- Disable weather effects entirely on WebGL1 (too expensive)

---

### Medium-Risk Items 🟡

#### 4. PBR Material Complexity
**Risk**: PBR materials slower than StandardMaterial, causing performance issues

**Likelihood**: Medium
**Impact**: Medium
**Mitigation**:
- Use material LOD system (PBR near, Standard far)
- Share material instances aggressively
- Freeze materials after creation
- Measure performance with 100+ materials during dev

**Contingency Plan**:
- Disable PBR on Low preset (use StandardMaterial only)
- Reduce texture resolution (2048 → 1024)

#### 5. Decal System Limitations
**Risk**: 100 decal limit insufficient for large battles

**Likelihood**: Medium
**Impact**: Low (visual quality, not critical)
**Mitigation**:
- Document limitation clearly
- Provide alternative (texture splatting) for high-frequency effects
- Implement smart prioritization (keep important decals, remove unimportant)

**Contingency Plan**:
- Research deferred decal technique for Phase 11
- Consider decal texture atlas on terrain (bake decals into terrain texture)

#### 6. Shader Compilation Stutter
**Risk**: First-time shader compilation causes frame drop

**Likelihood**: High
**Impact**: Low (one-time stutter)
**Mitigation**:
- Pre-compile shaders during loading screen
- Use shader cache (browser built-in)
- Provide loading progress for shader compilation

**Contingency Plan**:
- Display "Compiling shaders..." message
- Pre-warm all shader variants on startup

---

### Low-Risk Items 🟢

#### 7. Browser Compatibility
**Risk**: Post-processing or particles behave differently on Chrome vs Firefox vs Safari

**Likelihood**: Low (Babylon.js handles this)
**Impact**: Low
**Mitigation**:
- Test on all major browsers during development
- Use Babylon.js built-in compatibility layers
- Avoid browser-specific WebGL extensions

**Contingency Plan**:
- Document known browser issues
- Provide browser-specific workarounds if needed

#### 8. Mobile Performance
**Risk**: Phase 2 systems too heavy for mobile devices

**Likelihood**: High
**Impact**: Low (mobile is stretch goal, not primary target)
**Mitigation**:
- Low preset designed for mobile
- Disable expensive features (PBR, many particles, etc.)
- Test on iPad/Surface devices (not phones)

**Contingency Plan**:
- Document "Desktop/Tablet only, phone support in future"
- Provide mobile-specific ultra-low preset if needed

---

### Risk Mitigation Summary

**Overall Phase 2 Risk Level**: 🟡 Medium-High

**Key Success Factors**:
1. ✅ Quality preset system implemented from start
2. ✅ Continuous performance profiling during development
3. ✅ Fallback implementations ready (CPU particles, Standard materials)
4. ✅ Clear documentation of limitations and requirements

**Go/No-Go Criteria**:
- ✅ Must achieve 60 FPS on Medium preset with test scene
- ✅ Must have 40 FPS fallback on Low preset
- ⚠️ High preset may run <60 FPS (acceptable, documented)

---

## Technical Research Summary

### Babylon.js Capabilities (2025)

#### Post-Processing (Researched)
- **DefaultRenderingPipeline**: Mature, production-ready
- **Performance**: Bloom ~2ms, FXAA ~1ms, others <1ms each
- **Gotcha**: GUI renders separately, avoid double-apply
- **Best Practice**: Use quality presets, disable effects on low-end devices

#### GPU Particles (Researched)
- **GPUParticleSystem**: WebGL2 transform feedback, very efficient
- **Capacity**: 1,000,000+ particles supported
- **Performance**: 10,000 particles <1ms
- **Optimization**: Set `randomTextureSize: 4096` (default 16K wastes memory)
- **Fallback**: Auto-detect WebGL2, fall back to CPU ParticleSystem

#### PBR Materials (Researched)
- **PBRMetallicRoughnessMaterial**: glTF 2.0 compatible
- **Performance**: Comparable to StandardMaterial when frozen
- **Optimization**: Freeze materials, share instances, use LOD swapping
- **Gotcha**: Material swapping is expensive, freeze before swapping

#### Weather Effects (Researched)
- **Rain**: ParticleSystem with high velocity, splash particles
- **Snow**: Slow particles with drift (sine wave)
- **Fog**: Built-in `scene.fogMode` (FOGMODE_EXP, FOGMODE_LINEAR, FOGMODE_EXP2)
- **Community**: Many examples on forum (rain shader, snow demo)

#### Decals (Researched)
- **System**: `MeshBuilder.CreateDecal()` projects onto mesh
- **Performance**: Expensive! 1 mesh + 1 draw call per decal
- **Limitation**: Mesh creation overhead, stuttering if many created quickly
- **Best Practice**: Pool decals, limit to 100 max, use instancing for same texture
- **Alternative**: Deferred decals (future optimization)

#### Render Targets (Researched)
- **RenderTargetTexture**: Mature, widely used
- **Multi-Pass**: Ping-pong buffers supported
- **Performance**: ~1.5ms per RTT render
- **Optimization**: Freeze materials before render, downscale resolution
- **Gotcha**: Material swapping is expensive (CPU resync)

#### Babylon.js 8.0 (2025)
- **WebGPU Support**: WGSL shaders available, 2x smaller bundle
- **Performance**: Major optimizations in v8.0 release
- **Compatibility**: GLSL and WGSL shaders for both WebGL and WebGPU

---

## Timeline & Resource Allocation

### 6-Week Development Plan (2 Developers)

#### Week 1: Core Post-Processing & Lighting (Parallel)
**Dev 1**: PRP 2.1 - Post-Processing Pipeline (Part 1)
- DefaultRenderingPipeline integration
- Bloom, FXAA, Color Grading
- Quality preset system

**Dev 2**: PRP 2.2 - Advanced Lighting System
- Point light implementation
- Spot light implementation
- Light manager and culling

**Milestone**: Post-processing working, 8 lights @ 60 FPS

---

#### Week 2: Complete Post-Processing, Start Particles (Parallel)
**Dev 1**: PRP 2.1 - Post-Processing Pipeline (Part 2)
- Tone Mapping, DoF, Chromatic Aberration, Vignette
- GUI integration
- Performance tuning

**Dev 2**: PRP 2.3 - GPU Particle System (Part 1)
- GPUParticleSystem wrapper
- CPU fallback implementation
- Particle pool manager

**Milestone**: All post-processing effects functional, particle foundation ready

---

#### Week 3: Particles & Weather (Parallel)
**Dev 1**: PRP 2.3 - GPU Particle System (Part 2)
- Built-in effect presets (fire, smoke, sparks, dust, magic)
- Texture atlas support
- Performance testing (10k particles)

**Dev 2**: PRP 2.4 - Weather Effects System
- Rain and snow implementation
- Fog system
- Weather manager and transitions

**Milestone**: Particle effects and weather working

---

#### Week 4: PBR & Shaders (Parallel)
**Dev 1**: PRP 2.5 - PBR Material System
- PBRMetallicRoughnessMaterial integration
- Material presets (metal, wood, stone, fabric, glass)
- Material instance caching and LOD

**Dev 2**: PRP 2.6 - Custom Shader Framework
- ShaderMaterial utilities
- Hot reload system (dev)
- Custom shaders (water, force field, hologram)

**Milestone**: PBR materials working, custom shaders functional

---

#### Week 5: Decals, RTTs, and Performance (Parallel → Sequential)
**Dev 1**: PRP 2.7 - Decal System (Days 1-3)
- Decal projection and pooling
- Built-in decal types
- Performance optimization

**Dev 2**: PRP 2.8 - Render Target & Multi-Pass (Days 1-4)
- RenderTargetTexture management
- Multi-pass renderer
- Minimap implementation

**Both Devs**: PRP 2.9 - Rendering Performance Tuning (Days 4-5)
- End-to-end profiling
- Bottleneck fixes
- Quality preset integration

**Milestone**: All systems implemented, performance tuned to 60 FPS

---

#### Week 6: Integration Testing & Documentation (Sequential)
**Both Devs**: PRP 2.10 - Phase 2 Integration Tests (Days 1-2)
- Full scene integration tests
- Visual regression tests
- Benchmark suite
- WebGL1/2 compatibility tests

**Both Devs**: Documentation & Finalization (Days 3-5)
- JSDoc completion
- Example scenes
- Performance documentation
- Phase 2 review and signoff

**Milestone**: Phase 2 complete, all tests passing, documentation complete

---

### Parallelization Efficiency

**Weeks 1-4**: 100% parallel (2 devs working independently)
**Week 5**: 60% parallel (Days 1-3), 40% sequential (Days 4-5)
**Week 6**: 100% sequential (both devs on integration)

**Effective Parallelization**: 85%

---

### Budget Breakdown

**2 Senior Developers @ $2,500/week × 6 weeks = $30,000**

| Week | Dev 1 | Dev 2 | Cost |
|------|-------|-------|------|
| 1 | Post-Processing (1/2) | Lighting | $5,000 |
| 2 | Post-Processing (2/2) | Particles (1/2) | $5,000 |
| 3 | Particles (2/2) | Weather | $5,000 |
| 4 | PBR Materials | Custom Shaders | $5,000 |
| 5 | Decals + Perf Tuning | RTTs + Perf Tuning | $5,000 |
| 6 | Integration + Docs | Integration + Docs | $5,000 |
| **Total** | | | **$30,000** |

---

### Dependencies & Blockers

**Blocked By**:
- Phase 1 completion (all PRPs 1.1-1.7 done)

**Blocks**:
- Phase 3: Terrain System (depends on weather effects for dynamic terrain)
- Phase 7: UI Framework (depends on post-processing for UI effects)
- Phase 10: Advanced Features (depends on particles for abilities)

**External Dependencies**:
- Babylon.js 7.0+ (already in package.json)
- WebGL2 browser support (>95% as of 2025, acceptable)
- GPU with 2GB+ VRAM (reasonable for target audience)

---

### Success Metrics

**Performance** (Critical):
- [ ] 60 FPS with all systems enabled (Medium preset)
- [ ] 40 FPS minimum fallback (Low preset)
- [ ] <200 draw calls in typical scene (revised budget: <300)
- [ ] <2.5GB memory usage

**Quality** (High):
- [ ] All 7 post-processing effects functional
- [ ] 8 point + 4 spot lights working
- [ ] 50,000 GPU particles @ 60 FPS
- [ ] Weather effects (rain, snow, fog) working
- [ ] PBR materials matching glTF 2.0 spec

**Testing** (Critical):
- [ ] >80% test coverage for all new code
- [ ] All integration tests passing
- [ ] Visual regression tests passing
- [ ] WebGL1 fallback verified
- [ ] Performance benchmarks documented

**Documentation** (High):
- [ ] JSDoc for all public APIs
- [ ] Performance guide created
- [ ] Example scenes provided
- [ ] Known limitations documented

---

## Next Steps

### Before Starting Phase 2

1. **Complete Phase 1**: Verify all Phase 1 PRPs (1.1-1.7) are done
2. **Run DoR Checklist**: Ensure all DoR requirements met
3. **Review Research**: All devs read this specification
4. **Set Up Infrastructure**:
   - Install Babylon.js 7.0+ (if not already)
   - Configure shader hot-reload in dev environment
   - Prepare test assets (particle textures, PBR materials)
5. **Kick-off Meeting**: Assign PRPs to developers, align on timeline

### Week 1 Kickoff Actions

**Dev 1** (Post-Processing):
- Read PRP 2.1 specification
- Research Babylon.js DefaultRenderingPipeline docs
- Create `src/engine/rendering/PostProcessingManager.ts`
- Set up quality preset system

**Dev 2** (Lighting):
- Read PRP 2.2 specification
- Research Babylon.js PointLight/SpotLight docs
- Create `src/engine/lighting/LightManager.ts`
- Implement light culling algorithm

**Both**:
- Daily sync meeting (15 min)
- Commit to feature branches
- Run tests before each commit

---

## Appendix: Reference Documentation

### Babylon.js Documentation
- DefaultRenderingPipeline: https://doc.babylonjs.com/features/featuresDeepDive/postProcesses/defaultRenderingPipeline
- GPU Particles: https://doc.babylonjs.com/features/featuresDeepDive/particles/particle_system/gpu_particles/
- PBR Materials: https://doc.babylonjs.com/features/featuresDeepDive/materials/using/introToPBR
- Decals: https://doc.babylonjs.com/features/featuresDeepDive/mesh/decals
- Render Targets: https://doc.babylonjs.com/features/featuresDeepDive/postProcesses/renderTargetTextureMultiPass

### Community Resources
- Babylon.js Forum: https://forum.babylonjs.com/
- Babylon.js Playground: https://playground.babylonjs.com/
- Babylon.js Medium Blog: https://babylonjs.medium.com/

### Performance Optimization
- Optimize Your Scene: https://doc.babylonjs.com/features/featuresDeepDive/scene/optimize_your_scene
- GPU Gems (NVIDIA): https://developer.nvidia.com/gpugems/
- WebGL Fundamentals: https://webglfundamentals.org/

---

## Document Version

**Version**: 1.0
**Date**: 2025-10-10
**Author**: babylon-renderer agent
**Status**: Ready for Review

**Changelog**:
- v1.0 (2025-10-10): Initial comprehensive specification
  - Defined DoR with Phase 1 requirements
  - Defined DoD with 8 major deliverables
  - Researched Babylon.js capabilities (2025)
  - Created 10 PRP breakdown with effort estimates
  - Established performance targets and budgets
  - Assessed risks and mitigations
  - Planned 6-week timeline with 2 developers

---

**This document is ready for Phase 2 execution upon Phase 1 completion.**
