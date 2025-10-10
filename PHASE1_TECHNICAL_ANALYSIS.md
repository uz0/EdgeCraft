# Phase 1 Technical Analysis: Rendering & Performance Requirements

## Executive Summary

This document analyzes the current Edge Craft implementation against Phase 1 Definition of Done (DoD) requirements, identifies technical gaps, and proposes detailed PRPs to achieve the strategic goals of a high-performance RTS rendering engine.

**Current Status**: ~2,700 lines of TypeScript code implementing basic Babylon.js infrastructure
**Target**: Production-ready RTS renderer meeting 60 FPS @ 500 units with 95% map compatibility

---

## 1. Gap Analysis

### 1.1 What's Already Implemented ✅

#### Core Engine (177 lines)
- **Location**: `/Users/dcversus/conductor/edgecraft/.conductor/doha/src/engine/core/Engine.ts`
- **Status**: Basic Babylon.js wrapper with scene management
- **Capabilities**:
  - Engine initialization with optimization flags
  - Render loop with FPS/delta time tracking
  - Window resize handling
  - WebGL context loss recovery
  - Resource disposal lifecycle

**Quality**: Well-structured, follows Babylon.js best practices with `autoClear: false` optimization

#### Terrain System (193 lines)
- **Location**: `/Users/dcversus/conductor/edgecraft/.conductor/doha/src/engine/terrain/TerrainRenderer.ts`
- **Status**: Basic heightmap terrain rendering
- **Capabilities**:
  - Heightmap-based terrain generation
  - Single texture application
  - Flat terrain creation (testing)
  - Height queries via raycasting
  - Static optimization with `freezeWorldMatrix()`

**Limitations**: Single texture only, no LOD, no chunking, no multi-texture splatting

#### Camera System (133 lines + 258 lines controls)
- **Location**: `/Users/dcversus/conductor/edgecraft/.conductor/doha/src/engine/camera/RTSCamera.ts`
- **Status**: Functional RTS camera with comprehensive controls
- **Capabilities**:
  - WASD keyboard movement
  - Edge scrolling (50px threshold)
  - Mouse wheel zoom
  - Camera bounds enforcement
  - Smooth focus transitions
  - Proper RTS viewing angle (30° down)

**Quality**: Production-ready, includes proper delta time normalization

#### File Format Support (265 lines)
- **Location**: `/Users/dcversus/conductor/edgecraft/.conductor/doha/src/formats/mpq/MPQParser.ts`
- **Status**: Basic MPQ parsing (uncompressed/unencrypted only)
- **Capabilities**:
  - MPQ header validation
  - Hash table reading
  - Block table parsing
  - File extraction (basic)

**Limitations**: No compression support, no encryption, simplified hash algorithm

#### Asset Loading (157 lines)
- **Location**: `/Users/dcversus/conductor/edgecraft/.conductor/doha/src/assets/ModelLoader.ts`
- **Status**: Basic glTF loading
- **Capabilities**:
  - glTF 2.0 import
  - Transform application (scale, position, rotation)
  - Shadow configuration hooks
  - Basic primitive creation

**Limitations**: No model instancing, no LOD support, no animation optimization

### 1.2 Critical Gaps Preventing Phase 1 DoD ❌

#### Gap 1: Performance - 60 FPS @ 500 Units
**Current State**: No unit rendering, no performance testing
**Required**:
- GPU instancing for identical units
- Baked vertex animation textures for animated units
- Scene freezing (`scene.freezeActiveMeshes()`)
- Draw call batching
- Proper materials with shared instances

**Impact**: Cannot meet core performance requirement

#### Gap 2: Terrain - Multi-Texture Splatting
**Current State**: Single texture only
**Required**:
- Custom shader with 4+ texture channels
- Splatmap (mixmap) support
- Triplanar mapping for cliffs
- UV scaling and tiling
- TerrainMaterial or custom GLSL shader

**Impact**: Cannot render realistic RTS terrain

#### Gap 3: Terrain - LOD & Chunking
**Current State**: Single monolithic mesh
**Required**:
- Quadtree-based terrain chunking
- Distance-based LOD levels (3-5 levels)
- Seamless LOD transitions
- Chunk streaming/unloading
- Frustum culling per chunk

**Impact**: Cannot handle large maps (256x256+)

#### Gap 4: Shadow System - Performance @ Scale
**Current State**: No shadow implementation
**Required**:
- Shadow generator with optimized settings
- Cascaded Shadow Maps (CSM) for large scenes
- Static shadow optimization flags
- Shadow map size tuning (1024-2048, not 4096)
- Soft shadow filters (Poisson/Exponential)

**Impact**: Cannot render professional-quality scenes

#### Gap 5: Model Instancing System
**Current State**: Individual mesh loading only
**Required**:
- Thin instance system for unit variations
- Material sharing across instances
- Instance buffer management
- Baked animation texture support
- Instance culling

**Impact**: Cannot render 500+ units efficiently

#### Gap 6: Rendering Pipeline Optimization
**Current State**: Basic render loop
**Required**:
- Scene optimizer configuration
- Hardware scaling options
- Render queue prioritization
- Material compilation caching
- Sprite/billboard system for distant units

**Impact**: Suboptimal performance on mid-range hardware

#### Gap 7: Map Loading Architecture
**Current State**: No map loading system
**Required**:
- Progressive loading with streaming
- W3M/W3X file format parser
- SCM/SCX file format parser
- Terrain data extraction
- Unit placement parsing
- Doodad (decoration) loading

**Impact**: Cannot achieve 95% map compatibility

#### Gap 8: Asset Validation Pipeline
**Current State**: Basic copyright validator exists (untested)
**Required**:
- SHA-256 hash validation
- Metadata extraction and checking
- Automated rejection of copyrighted content
- Asset replacement mapping
- Validation in CI/CD pipeline

**Impact**: Legal compliance risk

---

## 2. Babylon.js Best Practices for RTS Rendering

### 2.1 Unit Rendering Strategy

#### Instancing Hierarchy
```typescript
// For identical units (same mesh, same material)
const original = await loader.loadGLTF('/models/', 'unit.gltf');
const instances = [];
for (let i = 0; i < 500; i++) {
  const instance = original.rootMesh.createInstance(`unit_${i}`);
  instance.position = getUnitPosition(i);
  instances.push(instance);
}
```

#### Thin Instances for Variations
```typescript
// For units with different colors/states (same geometry)
const mesh = await loader.loadGLTF('/models/', 'unit.gltf');
const bufferMatrices = new Float32Array(500 * 16); // 16 floats per matrix
const bufferColors = new Float32Array(500 * 4);    // 4 floats per color

mesh.rootMesh.thinInstanceSetBuffer("matrix", bufferMatrices, 16);
mesh.rootMesh.thinInstanceSetBuffer("color", bufferColors, 4);
```

#### Baked Animation Textures
```typescript
// For 1000+ animated units
const skeleton = mesh.skeletons[0];
skeleton.enableBlending(0.1);

// Enable baked vertex animation
mesh.rootMesh.bakedVertexAnimationManager = new BABYLON.VertexAnimationBaker(
  scene,
  mesh.rootMesh
);
await mesh.rootMesh.bakedVertexAnimationManager.bakeVertexData(
  skeleton.getAnimationRange("walk")
);

// Use thin instances with animation texture
mesh.rootMesh.thinInstanceSetBuffer(
  "bakedVertexAnimationSettingsInstanced",
  animationBuffer,
  4
);
```

**Performance Target**: 1000+ units @ 60 FPS on GTX 1060 / M1

### 2.2 Terrain LOD System

#### Quadtree Chunking Implementation
```typescript
class TerrainQuadtree {
  private readonly MAX_DEPTH = 5;
  private readonly CHUNK_SIZE = 64;

  generateChunks(heightmap: Float32Array, width: number): TerrainChunk[] {
    const chunks: TerrainChunk[] = [];

    for (let z = 0; z < width; z += this.CHUNK_SIZE) {
      for (let x = 0; x < width; x += this.CHUNK_SIZE) {
        chunks.push(this.createChunk(x, z, this.CHUNK_SIZE, heightmap));
      }
    }

    return chunks;
  }

  createChunk(x: number, z: number, size: number, heightmap: Float32Array): TerrainChunk {
    const lodLevels = [
      { distance: 100, subdivisions: 64 },  // High detail
      { distance: 200, subdivisions: 32 },  // Medium detail
      { distance: 400, subdivisions: 16 },  // Low detail
      { distance: 800, subdivisions: 8 },   // Very low detail
    ];

    return new TerrainChunk(x, z, size, heightmap, lodLevels);
  }
}

class TerrainChunk {
  private meshes: BABYLON.Mesh[] = [];
  private currentLOD: number = 0;

  updateLOD(cameraPosition: BABYLON.Vector3): void {
    const distance = BABYLON.Vector3.Distance(
      cameraPosition,
      this.centerPosition
    );

    let targetLOD = 0;
    for (let i = 0; i < this.lodLevels.length; i++) {
      if (distance > this.lodLevels[i].distance) {
        targetLOD = i;
      }
    }

    if (targetLOD !== this.currentLOD) {
      this.switchLOD(targetLOD);
    }
  }
}
```

**Performance Target**: 256x256 terrain @ 60 FPS with camera movement

### 2.3 Multi-Texture Terrain Splatting

#### Custom Terrain Shader
```glsl
// Fragment Shader (terrain-splat.fragment.glsl)
precision highp float;

// Textures
uniform sampler2D textureSampler0;  // Grass
uniform sampler2D textureSampler1;  // Rock
uniform sampler2D textureSampler2;  // Dirt
uniform sampler2D textureSampler3;  // Snow
uniform sampler2D mixMapSampler;     // RGBA splatmap

// Varyings
varying vec2 vUV;

void main(void) {
  // Sample splatmap (R=grass, G=rock, B=dirt, A=snow)
  vec4 blend = texture2D(mixMapSampler, vUV);

  // Sample terrain textures with tiling
  vec2 tiledUV = vUV * 20.0; // Tile 20x
  vec4 grass = texture2D(textureSampler0, tiledUV);
  vec4 rock = texture2D(textureSampler1, tiledUV);
  vec4 dirt = texture2D(textureSampler2, tiledUV);
  vec4 snow = texture2D(textureSampler3, tiledUV);

  // Blend based on splatmap
  vec4 color = grass * blend.r +
               rock * blend.g +
               dirt * blend.b +
               snow * blend.a;

  gl_FragColor = color;
}
```

#### TypeScript Implementation
```typescript
class TerrainSplatMaterial {
  createMaterial(scene: BABYLON.Scene): BABYLON.ShaderMaterial {
    BABYLON.Effect.ShadersStore["terrainSplatVertexShader"] = vertexShader;
    BABYLON.Effect.ShadersStore["terrainSplatFragmentShader"] = fragmentShader;

    const material = new BABYLON.ShaderMaterial("terrainSplat", scene, {
      vertex: "terrainSplat",
      fragment: "terrainSplat",
    }, {
      attributes: ["position", "normal", "uv"],
      uniforms: ["world", "worldView", "worldViewProjection", "view", "projection"],
      samplers: [
        "textureSampler0", "textureSampler1",
        "textureSampler2", "textureSampler3",
        "mixMapSampler"
      ]
    });

    // Assign textures
    material.setTexture("textureSampler0", grassTexture);
    material.setTexture("textureSampler1", rockTexture);
    material.setTexture("textureSampler2", dirtTexture);
    material.setTexture("textureSampler3", snowTexture);
    material.setTexture("mixMapSampler", splatmapTexture);

    return material;
  }
}
```

**Alternative**: Use `@babylonjs/materials` TerrainMaterial for faster implementation

### 2.4 Shadow Optimization for 500+ Units

#### Cascaded Shadow Maps Setup
```typescript
class ShadowSystem {
  setupShadows(scene: BABYLON.Scene, light: BABYLON.DirectionalLight): void {
    // Use cascaded shadow maps for large scenes
    const shadowGenerator = new BABYLON.CascadedShadowGenerator(1024, light);

    // Optimization flags
    shadowGenerator.usePercentageCloserFiltering = true;
    shadowGenerator.filteringQuality = BABYLON.ShadowGenerator.QUALITY_MEDIUM;
    shadowGenerator.bias = 0.001;

    // CSM-specific settings
    shadowGenerator.numCascades = 3;
    shadowGenerator.stabilizeCascades = true;
    shadowGenerator.lambda = 0.9; // Blend between linear/logarithmic

    // Auto-compute shadow bounds for optimal frustum
    light.autoCalcShadowZBounds = true;

    // Static shadow optimization (new feature request)
    shadowGenerator.enableSoftTransparentShadow = false; // Performance

    return shadowGenerator;
  }

  optimizeForUnits(
    shadowGenerator: BABYLON.CascadedShadowGenerator,
    units: BABYLON.Mesh[]
  ): void {
    // Add only hero units to shadow casters (not all 500)
    const heroUnits = units.filter(u => u.metadata?.isHero);
    shadowGenerator.addShadowCaster(heroUnits);

    // All units receive shadows
    units.forEach(u => u.receiveShadows = true);
  }
}
```

**Performance Target**: Shadows for 50 units @ 60 FPS (not all 500)

### 2.5 Scene Optimization Pipeline

#### Performance Optimization Configuration
```typescript
class SceneOptimizer {
  optimize(scene: BABYLON.Scene, engine: BABYLON.Engine): void {
    // 1. Request high-performance GPU
    if (engine instanceof BABYLON.WebGPUEngine) {
      // Already set in engine creation
    }

    // 2. Freeze active meshes after initial load
    scene.freezeActiveMeshes();

    // 3. Configure scene optimizer
    const options = BABYLON.SceneOptimizerOptions.ModerateDegradationAllowed();
    options.targetFrameRate = 60;
    options.trackerDuration = 2000;

    const optimizer = new BABYLON.SceneOptimizer(scene, options);
    optimizer.start();

    // 4. Hardware scaling for lower-end devices
    if (this.detectLowEndDevice()) {
      engine.setHardwareScalingLevel(1.5); // Render at 2/3 resolution
    }

    // 5. Disable features for performance
    scene.skipPointerMovePicking = true;
    scene.autoClear = false;
    scene.autoClearDepthAndStencil = false;
    scene.blockMaterialDirtyMechanism = true;
  }

  private detectLowEndDevice(): boolean {
    const gl = document.createElement('canvas').getContext('webgl');
    const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info');
    const renderer = gl?.getParameter(debugInfo?.UNMASKED_RENDERER_WEBGL);

    // Check for integrated graphics
    return renderer?.includes('Intel') || renderer?.includes('Integrated');
  }
}
```

---

## 3. Detailed PRP Breakdown

### PRP 1.2: Advanced Terrain System (HIGH PRIORITY)

**Title**: Multi-Texture Splatting with LOD and Chunking

**Technical Requirements**:
1. Quadtree terrain chunking (64x64 base chunks)
2. 4-level LOD system (64, 32, 16, 8 subdivisions)
3. Multi-texture splatting shader (4 textures + splatmap)
4. Frustum culling per chunk
5. Chunk streaming based on camera distance

**Implementation Files**:
- `/src/engine/terrain/TerrainChunkSystem.ts` (300 lines)
- `/src/engine/terrain/TerrainLODManager.ts` (200 lines)
- `/src/engine/terrain/shaders/terrain-splat.vertex.glsl` (50 lines)
- `/src/engine/terrain/shaders/terrain-splat.fragment.glsl` (80 lines)
- `/src/engine/terrain/TerrainSplatMaterial.ts` (150 lines)

**Performance Targets**:
- 256x256 terrain @ 60 FPS
- Max 4GB memory for heightmap + textures
- LOD transitions within 100ms
- Chunk load/unload within 50ms

**Testing Requirements**:
- Unit tests for quadtree generation
- Integration tests for LOD switching
- Performance benchmarks for 256x256 terrain
- Visual tests for texture blending

**Validation**:
```bash
npm run test -- terrain-chunk-system
npm run benchmark -- terrain-lod
```

### PRP 1.3: GPU Instancing & Animation System (HIGH PRIORITY)

**Title**: High-Performance Unit Rendering with Instancing

**Technical Requirements**:
1. Mesh instance system for identical units
2. Thin instance system for color variations
3. Baked vertex animation texture support
4. Animation state management per instance
5. Instance buffer updates (position, rotation, color)

**Implementation Files**:
- `/src/engine/rendering/InstanceManager.ts` (400 lines)
- `/src/engine/rendering/ThinInstanceManager.ts` (300 lines)
- `/src/engine/rendering/AnimationBaker.ts` (250 lines)
- `/src/engine/rendering/UnitRenderer.ts` (350 lines)

**Performance Targets**:
- 1000 units @ 60 FPS (static)
- 500 units @ 60 FPS (animated)
- Instance buffer update < 5ms
- Animation texture size < 50MB per unit type

**API Design**:
```typescript
class UnitRenderer {
  // Create 500 marines
  async renderUnits(scene: BABYLON.Scene): Promise<void> {
    const model = await this.loader.loadGLTF('/units/', 'marine.gltf');

    // Use thin instances for color variations
    const thinInstanceManager = new ThinInstanceManager(model.rootMesh);

    for (let i = 0; i < 500; i++) {
      thinInstanceManager.addInstance({
        position: getPosition(i),
        rotation: getRotation(i),
        color: getTeamColor(i),
        animationFrame: 0
      });
    }

    // Bake animation for instanced playback
    await this.animationBaker.bakeAnimation(
      model.skeletons[0],
      "walk",
      thinInstanceManager
    );
  }
}
```

**Testing Requirements**:
- Stress test with 1000 units
- Memory leak detection (1 hour test)
- Animation synchronization tests
- Draw call counting (target: < 100 for 500 units)

### PRP 1.4: Optimized Shadow System (MEDIUM PRIORITY)

**Title**: Cascaded Shadow Maps for RTS Scale

**Technical Requirements**:
1. Cascaded Shadow Map implementation (3 cascades)
2. Shadow map size optimization (1024-2048)
3. Static shadow caching for terrain
4. Selective shadow casting (hero units only)
5. Soft shadow filters (Poisson sampling)

**Implementation Files**:
- `/src/engine/lighting/ShadowSystem.ts` (300 lines)
- `/src/engine/lighting/CascadedShadowConfig.ts` (150 lines)
- `/src/engine/lighting/ShadowOptimizer.ts` (200 lines)

**Performance Targets**:
- CSM for 50 units @ 60 FPS
- Shadow map update < 8ms
- 3 cascades with smooth blending
- Auto frustum optimization

**Configuration**:
```typescript
interface ShadowConfig {
  mapSize: 1024 | 2048 | 4096;
  numCascades: 2 | 3 | 4;
  filterQuality: 'low' | 'medium' | 'high';
  staticOptimization: boolean;
  maxShadowCasters: number; // Limit to prevent performance drop
}
```

### PRP 1.5: Map Loading Architecture (HIGH PRIORITY)

**Title**: W3M/W3X and SC Map Format Support

**Technical Requirements**:
1. W3M/W3X file parser (War3Map.w3e, War3Map.j)
2. SCM/SCX file parser (CHK format)
3. Terrain data extraction and conversion
4. Unit placement parsing
5. Doodad (decoration) extraction
6. Progressive loading with chunks

**Implementation Files**:
- `/src/formats/w3/W3MapParser.ts` (500 lines)
- `/src/formats/sc/SCMapParser.ts` (500 lines)
- `/src/formats/converters/TerrainConverter.ts` (300 lines)
- `/src/formats/converters/UnitConverter.ts` (200 lines)
- `/src/engine/loading/MapLoader.ts` (400 lines)

**Map Compatibility Targets**:
- 95% of W3 maps load successfully
- 95% of SC maps load successfully
- Terrain accuracy > 98%
- Unit placement accuracy > 99%

**Progressive Loading**:
```typescript
class MapLoader {
  async loadMap(mapPath: string): Promise<GameMap> {
    // Phase 1: Load metadata (100ms)
    const metadata = await this.loadMetadata(mapPath);

    // Phase 2: Load terrain (2-5s for 256x256)
    const terrain = await this.loadTerrainProgressive(metadata);

    // Phase 3: Load units (1-2s)
    const units = await this.loadUnits(metadata);

    // Phase 4: Load doodads (1-2s)
    const doodads = await this.loadDoodads(metadata);

    return { terrain, units, doodads };
  }
}
```

**Validation**:
- Test with 100 sample W3 maps
- Test with 100 sample SC maps
- Measure load times (target: < 10s)
- Verify rendering accuracy

### PRP 1.6: Rendering Pipeline Optimization (MEDIUM PRIORITY)

**Title**: Scene Optimizer and Performance Monitoring

**Technical Requirements**:
1. Scene optimizer configuration
2. Hardware scaling for low-end devices
3. FPS monitoring and adaptive quality
4. Draw call minimization strategies
5. Material compilation caching

**Implementation Files**:
- `/src/engine/optimization/SceneOptimizer.ts` (300 lines)
- `/src/engine/optimization/PerformanceMonitor.ts` (200 lines)
- `/src/engine/optimization/QualityScaler.ts` (250 lines)
- `/src/engine/rendering/RenderQueue.ts` (200 lines)

**Performance Features**:
- Auto-detect GPU capabilities
- Scale rendering resolution dynamically
- Disable expensive features on low-end devices
- Track frame time budget (16.67ms for 60 FPS)

**Quality Levels**:
```typescript
enum QualityLevel {
  ULTRA = {
    shadowMapSize: 2048,
    terrainSubdivisions: 64,
    postProcessing: true,
    particleCount: 1000,
    hardwareScaling: 1.0
  },
  HIGH = {
    shadowMapSize: 1024,
    terrainSubdivisions: 32,
    postProcessing: true,
    particleCount: 500,
    hardwareScaling: 1.0
  },
  MEDIUM = {
    shadowMapSize: 1024,
    terrainSubdivisions: 16,
    postProcessing: false,
    particleCount: 250,
    hardwareScaling: 1.2
  },
  LOW = {
    shadowMapSize: 512,
    terrainSubdivisions: 8,
    postProcessing: false,
    particleCount: 100,
    hardwareScaling: 1.5
  }
}
```

### PRP 1.7: Asset Validation & CI Integration (HIGH PRIORITY)

**Title**: Automated Copyright Compliance Pipeline

**Technical Requirements**:
1. SHA-256 hash database of copyrighted assets
2. Metadata extraction from models/textures
3. Automated rejection in CI/CD
4. Asset replacement mapping system
5. Legal compliance reporting

**Implementation Files**:
- `/src/assets/validation/HashValidator.ts` (200 lines)
- `/src/assets/validation/MetadataScanner.ts` (150 lines)
- `/scripts/validate-legal.ts` (300 lines)
- `/scripts/asset-replacement-map.json` (data file)

**CI/CD Integration**:
```yaml
# .github/workflows/asset-validation.yml
name: Asset Validation
on: [push, pull_request]
jobs:
  validate-assets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Validate Assets
        run: npm run validate:legal
      - name: Check for Copyright Violations
        run: |
          if grep -r "Blizzard\|©.*Blizzard" public/assets/; then
            echo "Copyright violation detected!"
            exit 1
          fi
```

---

## 4. Performance Optimization Strategies

### 4.1 Draw Call Minimization

**Target**: < 200 draw calls for 500 units + terrain

**Techniques**:
1. **Material Sharing**: All units of same type use same material instance
2. **Mesh Merging**: Static doodads merged into single mesh per chunk
3. **GPU Instancing**: Units rendered with single draw call per type
4. **Texture Atlasing**: Combine small textures into atlases (2048x2048)
5. **Frozen Meshes**: Static objects frozen with `freezeWorldMatrix()`

### 4.2 Memory Management

**Target**: < 2GB for large maps

**Techniques**:
1. **Texture Compression**: Use basis universal or compressed textures
2. **Progressive Loading**: Load visible chunks only
3. **LOD Unloading**: Unload highest LOD when beyond distance
4. **Model Pooling**: Reuse mesh instances instead of creating new
5. **Garbage Collection**: Explicit disposal of unused resources

**Implementation**:
```typescript
class ResourceManager {
  private textureCache = new Map<string, BABYLON.Texture>();
  private meshPool = new Map<string, BABYLON.Mesh[]>();

  async getTexture(url: string): Promise<BABYLON.Texture> {
    if (this.textureCache.has(url)) {
      return this.textureCache.get(url)!;
    }

    const texture = new BABYLON.Texture(url, this.scene);
    this.textureCache.set(url, texture);
    return texture;
  }

  acquireMesh(type: string): BABYLON.Mesh | null {
    const pool = this.meshPool.get(type) || [];
    return pool.pop() || null;
  }

  releaseMesh(type: string, mesh: BABYLON.Mesh): void {
    mesh.setEnabled(false);
    const pool = this.meshPool.get(type) || [];
    pool.push(mesh);
    this.meshPool.set(type, pool);
  }
}
```

### 4.3 Rendering Pipeline

**Optimization Passes**:
1. **Early Culling**: Frustum + occlusion culling before render
2. **Z-Sorting**: Render opaque front-to-back, transparent back-to-front
3. **State Batching**: Group by material to minimize state changes
4. **Lazy Compilation**: Compile shaders on demand, cache results

---

## 5. Implementation Priority & Timeline

### Week 1-2: Critical Path
1. **PRP 1.2**: Advanced Terrain System (highest priority)
   - Multi-texture splatting
   - LOD system
   - Chunking

2. **PRP 1.3**: GPU Instancing & Animation (parallel)
   - Instance manager
   - Animation baking

### Week 3-4: Map Loading
3. **PRP 1.5**: Map Loading Architecture
   - W3M/W3X parser
   - SCM/SCX parser
   - Conversion pipeline

### Week 5-6: Polish & Optimization
4. **PRP 1.4**: Shadow System (can be delayed)
5. **PRP 1.6**: Rendering Pipeline Optimization
6. **PRP 1.7**: Asset Validation

### Parallel Activities (All Weeks)
- Unit testing for each component
- Performance benchmarking
- Documentation updates

---

## 6. Success Metrics & Validation

### Performance Benchmarks

| Metric | Target | Measurement |
|--------|--------|-------------|
| FPS @ 500 units | 60 FPS | `npm run benchmark -- unit-rendering` |
| Terrain render (256x256) | 60 FPS | `npm run benchmark -- terrain-lod` |
| Map load time | < 10s | `npm run benchmark -- map-loading` |
| Memory usage (large map) | < 2GB | Chrome DevTools Memory Profiler |
| Draw calls | < 200 | Babylon Inspector |
| Shadow update time | < 8ms | Performance.now() in render loop |

### Compatibility Testing

```typescript
interface CompatibilityTest {
  mapCount: number;      // 100 W3 + 100 SC maps
  successRate: number;   // > 95%
  terrainAccuracy: number; // > 98%
  unitAccuracy: number;   // > 99%
}
```

### Code Quality Gates

```bash
# All must pass before PRP completion
npm run typecheck:strict     # No TypeScript errors
npm run test:coverage        # > 80% coverage
npm run lint                 # No ESLint errors
npm run validate:legal       # No copyright violations
npm run benchmark            # All performance targets met
```

---

## 7. Risk Assessment

### High Risk
1. **Performance @ 500 Units**: May require WebGPU fallback or reduced unit count
   - **Mitigation**: Implement progressive quality scaling, target 60 FPS @ 300 units minimum

2. **Map Compatibility 95%**: Some maps use custom scripts/triggers
   - **Mitigation**: Focus on terrain/units first, defer script support to Phase 2

### Medium Risk
3. **Shadow Performance**: CSM can be expensive on integrated graphics
   - **Mitigation**: Disable shadows on low-end devices, use baked lightmaps

4. **Memory Constraints**: Large maps may exceed 2GB
   - **Mitigation**: Implement aggressive chunk unloading, texture compression

### Low Risk
5. **Shader Compilation**: Some devices may have slow shader compilation
   - **Mitigation**: Pre-compile shaders, cache compilation results

---

## 8. Recommended PRP Execution Order

### Phase 1A (Weeks 1-2) - Foundation
```
PRP 1.2: Advanced Terrain System ────┐
                                      ├──> Enable basic map rendering
PRP 1.3: GPU Instancing System  ─────┘
```

### Phase 1B (Weeks 3-4) - Content Pipeline
```
PRP 1.5: Map Loading Architecture ───> Achieve 95% compatibility
PRP 1.7: Asset Validation ───────────> Legal compliance
```

### Phase 1C (Weeks 5-6) - Optimization
```
PRP 1.4: Shadow System ──────────┐
                                 ├──> Polish rendering quality
PRP 1.6: Performance Optimizer ──┘
```

---

## 9. File Structure for New Components

```
src/engine/
├── rendering/
│   ├── InstanceManager.ts          # PRP 1.3
│   ├── ThinInstanceManager.ts      # PRP 1.3
│   ├── AnimationBaker.ts           # PRP 1.3
│   ├── UnitRenderer.ts             # PRP 1.3
│   ├── RenderQueue.ts              # PRP 1.6
│   └── types.ts
├── terrain/
│   ├── TerrainChunkSystem.ts       # PRP 1.2
│   ├── TerrainLODManager.ts        # PRP 1.2
│   ├── TerrainSplatMaterial.ts     # PRP 1.2
│   ├── shaders/
│   │   ├── terrain-splat.vertex.glsl
│   │   └── terrain-splat.fragment.glsl
│   └── types.ts
├── lighting/
│   ├── ShadowSystem.ts             # PRP 1.4
│   ├── CascadedShadowConfig.ts     # PRP 1.4
│   └── types.ts
├── optimization/
│   ├── SceneOptimizer.ts           # PRP 1.6
│   ├── PerformanceMonitor.ts       # PRP 1.6
│   ├── QualityScaler.ts            # PRP 1.6
│   └── types.ts
├── loading/
│   ├── MapLoader.ts                # PRP 1.5
│   ├── ProgressiveLoader.ts        # PRP 1.5
│   └── types.ts

src/formats/
├── w3/
│   ├── W3MapParser.ts              # PRP 1.5
│   ├── W3TerrainParser.ts          # PRP 1.5
│   ├── W3UnitParser.ts             # PRP 1.5
│   └── types.ts
├── sc/
│   ├── SCMapParser.ts              # PRP 1.5
│   ├── CHKParser.ts                # PRP 1.5
│   └── types.ts
├── converters/
│   ├── TerrainConverter.ts         # PRP 1.5
│   ├── UnitConverter.ts            # PRP 1.5
│   └── types.ts

src/assets/validation/
├── HashValidator.ts                # PRP 1.7
├── MetadataScanner.ts              # PRP 1.7
├── AssetReplacer.ts                # PRP 1.7
└── types.ts

tests/
├── rendering/
│   ├── InstanceManager.test.ts
│   ├── AnimationBaker.test.ts
│   └── performance.bench.ts
├── terrain/
│   ├── TerrainChunkSystem.test.ts
│   ├── TerrainLODManager.test.ts
│   └── terrain-rendering.bench.ts
├── formats/
│   ├── W3MapParser.test.ts
│   ├── SCMapParser.test.ts
│   └── map-loading.bench.ts
```

**Estimated Lines of Code**: ~6,000 lines (2.2x current codebase)

---

## 10. Conclusion & Next Steps

### Current State Assessment
- **Strengths**: Solid foundation with well-structured core systems
- **Gaps**: Missing RTS-scale optimizations and map loading pipeline
- **Code Quality**: Good (strict TypeScript, proper disposal patterns)

### Critical Path to Phase 1 DoD
1. ✅ Complete PRP 1.2 (Terrain LOD + Splatting) - **2 weeks**
2. ✅ Complete PRP 1.3 (GPU Instancing) - **2 weeks** (parallel)
3. ✅ Complete PRP 1.5 (Map Loading) - **2 weeks**
4. ✅ Complete PRP 1.7 (Asset Validation) - **1 week** (parallel)
5. ✅ Complete PRP 1.4 + 1.6 (Optimization) - **1 week**

**Total Timeline**: 6 weeks with 2 developers

### Validation Checklist
```bash
# Phase 1 completion validation
npm run test:coverage              # > 80% coverage
npm run benchmark -- all           # All targets met
npm run validate:legal             # No violations
npm run test:compatibility         # 95% maps load
node scripts/check-dod.js          # Automated DoD validation
```

### Recommended Immediate Action
**Start with PRP 1.2** (Advanced Terrain System) as it unlocks map rendering and is the most complex component. Execute PRP 1.3 (GPU Instancing) in parallel to maximize team velocity.

---

## Appendix A: Babylon.js 7.0 Feature Checklist

Features to leverage from Babylon.js 7.0:
- ✅ Thin instances with custom buffers
- ✅ Baked vertex animation textures
- ✅ Cascaded Shadow Maps
- ✅ Scene optimizer with auto-scaling
- ✅ Hardware scaling API
- ✅ Frozen active meshes
- ✅ WebGPU support (future)
- ⚠️ Node Material Editor (evaluate vs custom shaders)

## Appendix B: Performance Testing Script

```typescript
// tests/performance/phase1-validation.bench.ts
import { performance } from 'perf_hooks';

describe('Phase 1 Performance Validation', () => {
  it('renders 500 units @ 60 FPS', async () => {
    const engine = new EdgeCraftEngine(canvas, {
      powerPreference: 'high-performance'
    });

    const unitRenderer = new UnitRenderer(engine.scene);
    await unitRenderer.loadUnits('marine', 500);

    const fps = await measureFPS(engine, 10000); // 10 second test
    expect(fps).toBeGreaterThanOrEqual(59);
  });

  it('renders 256x256 terrain @ 60 FPS', async () => {
    const terrain = new AdvancedTerrainSystem(scene);
    await terrain.loadHeightmap('/test-assets/terrain-256.png', {
      width: 256,
      height: 256,
      lodLevels: 4,
      chunking: true
    });

    const fps = await measureFPS(engine, 10000);
    expect(fps).toBeGreaterThanOrEqual(59);
  });

  it('loads W3 map in < 10 seconds', async () => {
    const start = performance.now();
    const map = await mapLoader.loadW3Map('/test-maps/test.w3x');
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10000);
    expect(map.terrain).toBeDefined();
    expect(map.units.length).toBeGreaterThan(0);
  });
});
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-10
**Author**: Babylon Renderer Agent
**Status**: Ready for PRP Generation
