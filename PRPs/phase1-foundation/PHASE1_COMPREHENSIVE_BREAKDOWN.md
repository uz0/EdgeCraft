# Phase 1: Foundation - Comprehensive PRP Breakdown

## Executive Summary

This document provides a **breakthrough analysis** of Phase 1 requirements, aligning the strategic product vision with detailed technical implementation. It bridges the gap between high-level DoD requirements and actionable PRPs.

---

## 📊 Strategic Context Alignment

### From Product Requirements (Strategic Plan)
- **Vision**: WebGL-based RTS engine supporting Blizzard file formats with legal safety
- **Phase 1 Goal** (Months 1-3): Basic renderer and file loading
- **Budget**: $30,000 | **Team**: 2 developers
- **Deliverables**: Web-based model viewer, heightmap terrain display, basic camera controls

### From Technical Requirements (Definition of Done)
- **Core Engine**: Successfully loads 95% of StarCraft and Warcraft 3 maps
- **Performance**: 60 FPS with 500 units on mid-range hardware (GTX 1060/RX 580)
- **Assets**: 500+ original unit models, 200+ buildings, 1000+ textures (CC0/MIT)
- **Rendering**: Multi-texture terrain, shadow mapping, optimized instancing
- **Legal**: Zero copyrighted assets, automated validation pipeline

### Current Implementation Gap Analysis

**What Exists** (~2,700 lines):
- ✅ Engine.ts - Babylon.js initialization with optimization flags
- ✅ TerrainRenderer.ts - Basic heightmap (single texture only)
- ✅ RTSCamera.ts + CameraControls.ts - Full RTS camera system
- ✅ MPQParser.ts - MPQ header parsing (uncompressed files only)
- ✅ ModelLoader.ts - glTF 2.0 loading
- ✅ CopyrightValidator.ts - SHA-256 asset validation (not integrated)

**What's Missing** (6 critical systems):
1. ❌ **GPU Instancing System** - Required for 500+ units @ 60 FPS
2. ❌ **Advanced Terrain** - Multi-texture splatting, LOD, chunking
3. ❌ **Shadow System** - Cascaded shadow maps for quality rendering
4. ❌ **Map Loading Pipeline** - W3X/W3M/SCM/SCX parsers + converters
5. ❌ **Rendering Optimization** - Draw call reduction, frustum culling
6. ❌ **Legal Compliance Pipeline** - Automated asset validation in CI/CD

---

## 🎯 Phase 1 Complete PRP Breakdown

### Architecture: 7 Core PRPs

#### **Foundation PRPs** (Already Completed)
- ✅ **PRP 1.1**: Babylon.js Integration - DONE (merged to main)
  - Engine initialization, scene management, resource disposal
  - Basic terrain, RTS camera, MPQ parser, model loader

#### **Critical Gap PRPs** (Must Implement for DoD)

### **PRP 1.2: Advanced Terrain System**
**Priority**: 🔴 CRITICAL | **Effort**: 5 days | **Lines**: ~780

**DoD Requirements Addressed**:
- Multi-texture terrain rendering (4+ textures with splatmap)
- Terrain LOD system (4 levels: 64→32→16→8 subdivisions)
- Quadtree chunking for large maps (256x256+ terrains)
- Performance: 60 FPS on 256x256 terrain

**Technical Implementation**:
```typescript
// src/engine/terrain/AdvancedTerrainRenderer.ts
export class AdvancedTerrainRenderer {
  private chunks: Map<string, TerrainChunk>;
  private quadtree: TerrainQuadtree;
  private material: TerrainMaterial; // Custom GLSL shader

  // Multi-texture splatting with custom shader
  createSplatmapMaterial(textures: string[], splatmap: string): void {
    const shader = new BABYLON.ShaderMaterial("terrainShader", scene, {
      vertex: "terrain",
      fragment: "terrain"
    }, {
      attributes: ["position", "normal", "uv"],
      uniforms: ["worldViewProjection", "world"],
      samplers: ["diffuse1", "diffuse2", "diffuse3", "diffuse4", "splatmap"]
    });
  }

  // Quadtree chunking for streaming
  createChunks(heightmap: HeightmapData, chunkSize: number): void {
    // Divide terrain into NxN chunks
    // Each chunk has 4 LOD levels
    // Distance-based LOD switching: 100m, 200m, 400m, 800m
  }
}
```

**GLSL Shader** (fragment):
```glsl
// shaders/terrain.fragment.fx
precision highp float;

varying vec2 vUV;

uniform sampler2D diffuse1;  // Grass
uniform sampler2D diffuse2;  // Rock
uniform sampler2D diffuse3;  // Dirt
uniform sampler2D diffuse4;  // Snow
uniform sampler2D splatmap;  // RGBA blend weights

void main(void) {
  vec4 splat = texture2D(splatmap, vUV);

  vec3 color1 = texture2D(diffuse1, vUV * 10.0).rgb;
  vec3 color2 = texture2D(diffuse2, vUV * 10.0).rgb;
  vec3 color3 = texture2D(diffuse3, vUV * 10.0).rgb;
  vec3 color4 = texture2D(diffuse4, vUV * 10.0).rgb;

  vec3 finalColor = color1 * splat.r +
                    color2 * splat.g +
                    color3 * splat.b +
                    color4 * splat.a;

  gl_FragColor = vec4(finalColor, 1.0);
}
```

**Success Criteria**:
- [ ] 4+ textures blend seamlessly via splatmap
- [ ] 4 LOD levels switch based on camera distance
- [ ] Quadtree chunking loads/unloads chunks dynamically
- [ ] 60 FPS on 256x256 terrain with 4 textures
- [ ] Memory usage < 512MB for large terrains

---

### **PRP 1.3: GPU Instancing & Animation System**
**Priority**: 🔴 CRITICAL | **Effort**: 6 days | **Lines**: ~1,300

**DoD Requirements Addressed**:
- Render 500+ units at 60 FPS (target: 1000 units)
- Animated unit support (walk, attack, death animations)
- Unit variation (team colors, damage states)

**Technical Implementation**:

```typescript
// src/engine/rendering/InstancedUnitRenderer.ts
export class InstancedUnitRenderer {
  private unitMeshes: Map<string, BABYLON.Mesh>;
  private instanceBuffers: Map<string, Float32Array>;

  // Technique 1: Thin Instances (for variations)
  createThinInstances(unitType: string, count: number): void {
    const mesh = this.unitMeshes.get(unitType);

    const matrixBuffer = new Float32Array(count * 16); // 4x4 transform
    const colorBuffer = new Float32Array(count * 4);   // RGBA team color

    mesh.thinInstanceSetBuffer("matrix", matrixBuffer, 16);
    mesh.thinInstanceSetBuffer("color", colorBuffer, 4);
  }

  // Technique 2: Baked Animation Textures (for animated units)
  async bakeAnimations(mesh: BABYLON.Mesh): Promise<void> {
    const baker = new BABYLON.VertexAnimationBaker(scene, mesh);

    // Bake skeletal animations to texture
    const texture = await baker.bakeVertexData([
      { name: "walk", from: 0, to: 30 },
      { name: "attack", from: 31, to: 50 },
      { name: "death", from: 51, to: 70 }
    ]);

    mesh.bakedVertexAnimationManager = new BABYLON.BakedVertexAnimationManager(scene, mesh);
    mesh.bakedVertexAnimationManager.texture = texture;
  }

  // Update all instances in single pass
  updateInstances(deltaTime: number): void {
    for (const [unitType, buffer] of this.instanceBuffers) {
      // Update transforms, colors, animation states
      // Single WebGL draw call per unit type
    }
  }
}
```

**Performance Strategy**:
- **Draw Calls**: 1 per unit type (vs 1 per unit = 99% reduction)
- **Memory**: Baked animation textures ~2MB per unit type
- **CPU**: Batch update instance buffers (all units updated in ~1ms)

**Success Criteria**:
- [ ] 500 units render at 60 FPS (target: 1000+)
- [ ] Animations play smoothly via baked textures
- [ ] Team colors apply correctly per instance
- [ ] Draw calls < 50 for 500 units (vs ~500 without instancing)
- [ ] Memory usage < 100MB for unit rendering

---

### **PRP 1.4: Cascaded Shadow Map System**
**Priority**: 🟡 HIGH | **Effort**: 4 days | **Lines**: ~650

**DoD Requirements Addressed**:
- Professional shadow quality for terrain and units
- Performance: Shadows for 500 units without FPS drop

**Technical Implementation**:

```typescript
// src/engine/rendering/ShadowSystem.ts
export class CascadedShadowSystem {
  private shadowGenerator: BABYLON.CascadedShadowGenerator;
  private light: BABYLON.DirectionalLight;

  initialize(scene: BABYLON.Scene): void {
    // Directional light for sun
    this.light = new BABYLON.DirectionalLight(
      "sun",
      new BABYLON.Vector3(-1, -2, -1),
      scene
    );

    // Cascaded Shadow Maps (3 cascades)
    this.shadowGenerator = new BABYLON.CascadedShadowGenerator(
      2048, // Shadow map size (1024, 2048, or 4096)
      this.light
    );

    // 3 cascades for different distances
    this.shadowGenerator.numCascades = 3;
    this.shadowGenerator.cascadeBlendPercentage = 0.1;

    // Optimization: Only important units cast shadows
    this.shadowGenerator.filteringQuality = BABYLON.ShadowGenerator.QUALITY_MEDIUM;
    this.shadowGenerator.usePercentageCloserFiltering = true;
  }

  // Only hero units and buildings cast shadows (not all 500 units)
  addShadowCaster(mesh: BABYLON.Mesh, priority: "high" | "low"): void {
    if (priority === "high") {
      this.shadowGenerator.addShadowCaster(mesh);
    }
  }
}
```

**Optimization Strategy**:
- **NOT all 500 units cast shadows** - only hero units (~20) and buildings (~50)
- **Cascade distances**: Near (0-100m), Mid (100-400m), Far (400m+)
- **Shadow map size**: 2048 (good quality/performance balance)
- **Alternative approach**: Blob shadows for non-hero units (cheap circles)

**Success Criteria**:
- [ ] Cascaded shadows with 3 distance levels
- [ ] Smooth transitions between cascades
- [ ] Only critical objects cast shadows (<100 casters)
- [ ] Performance: <5ms shadow map generation time
- [ ] No FPS drop with shadows enabled

---

### **PRP 1.5: Map Loading Architecture**
**Priority**: 🔴 CRITICAL | **Effort**: 8 days | **Lines**: ~1,900

**DoD Requirements Addressed**:
- Successfully loads 95% of Warcraft 3 maps (W3M/W3X)
- Successfully loads 95% of StarCraft 1 maps (SCM/SCX)
- Conversion to .edgestory format with 98% accuracy

**Technical Implementation**:

```typescript
// src/formats/maps/MapLoaderRegistry.ts
export class MapLoaderRegistry {
  private loaders: Map<string, IMapLoader>;

  constructor() {
    this.loaders.set(".w3x", new W3XMapLoader());
    this.loaders.set(".w3m", new W3MMapLoader());
    this.loaders.set(".scm", new SCMMapLoader());
    this.loaders.set(".scx", new SCXMapLoader());
  }

  async loadMap(file: File): Promise<GameMap> {
    const ext = this.getExtension(file.name);
    const loader = this.loaders.get(ext);

    if (!loader) {
      throw new Error(`Unsupported map format: ${ext}`);
    }

    // 1. Parse map file
    const mapData = await loader.parse(file);

    // 2. Convert to .edgestory format
    const edgeMap = await this.convertToEdgeStory(mapData);

    // 3. Replace copyrighted assets
    await this.replaceAssets(edgeMap);

    return edgeMap;
  }
}

// src/formats/maps/W3XMapLoader.ts
export class W3XMapLoader implements IMapLoader {
  async parse(file: File): Promise<RawMapData> {
    // 1. Extract MPQ archive
    const mpq = new MPQParser(await file.arrayBuffer());
    await mpq.parse();

    // 2. Read critical files
    const mapInfo = await this.parseW3I(mpq.extractFile("war3map.w3i"));
    const terrain = await this.parseW3E(mpq.extractFile("war3map.w3e"));
    const doodads = await this.parseW3D(mpq.extractFile("war3map.doo"));
    const units = await this.parseW3U(mpq.extractFile("war3mapUnits.doo"));

    // 3. Parse JASS script (basic support)
    const script = await this.parseJASS(mpq.extractFile("war3map.j"));

    return { mapInfo, terrain, doodads, units, script };
  }
}
```

**File Formats to Support**:

| Format | Game | Files | Complexity | Priority |
|--------|------|-------|------------|----------|
| W3X | Warcraft 3 TFT | w3i, w3e, doo, units, j | High | P0 |
| W3M | Warcraft 3 RoC | w3i, w3e, doo, units | Medium | P0 |
| SCM | StarCraft 1 | CHK chunks | High | P1 |
| SCX | StarCraft Brood War | CHK chunks | High | P1 |

**Success Criteria**:
- [ ] W3X maps load with 95% success rate (test with 100 maps)
- [ ] SCM/SCX maps load with 95% success rate (test with 50 maps)
- [ ] Terrain converts with 98% accuracy (height, textures, cliffs)
- [ ] Units place correctly (100% accuracy)
- [ ] Map loads in <10 seconds (W3X), <5 seconds (SCM)
- [ ] All copyrighted assets replaced automatically

---

### **PRP 1.6: Rendering Pipeline Optimization**
**Priority**: 🟡 HIGH | **Effort**: 5 days | **Lines**: ~950

**DoD Requirements Addressed**:
- Maintain 60 FPS with all systems active
- Draw calls < 200 (vs typical 1000+)
- Memory usage < 2GB

**Technical Implementation**:

```typescript
// src/engine/rendering/RenderPipeline.ts
export class OptimizedRenderPipeline {
  private scene: BABYLON.Scene;
  private cullingStrategy: CullingStrategy;

  initialize(scene: BABYLON.Scene): void {
    this.scene = scene;

    // 1. Scene-level optimizations
    scene.autoClear = false;
    scene.autoClearDepthAndStencil = false;
    scene.skipPointerMovePicking = true;
    scene.freezeActiveMeshes(); // Dramatic culling improvement

    // 2. Frustum culling
    this.cullingStrategy = new FrustumCulling(scene.activeCamera);

    // 3. Occlusion culling (for buildings/large objects)
    scene.occlusionQueryAlgorithmType = BABYLON.AbstractMesh.OCCLUSION_ALGORITHM_TYPE_CONSERVATIVE;

    // 4. Material sharing
    this.enableMaterialSharing();

    // 5. Mesh merging (for static objects)
    this.mergeStaticMeshes();
  }

  // Share materials across similar meshes
  enableMaterialSharing(): void {
    const materialCache = new Map<string, BABYLON.Material>();

    this.scene.meshes.forEach(mesh => {
      const key = this.getMaterialKey(mesh.material);

      if (materialCache.has(key)) {
        mesh.material = materialCache.get(key);
      } else {
        materialCache.set(key, mesh.material);
      }
    });
  }

  // Merge static meshes (trees, rocks, doodads)
  mergeStaticMeshes(): void {
    const staticMeshes = this.scene.meshes.filter(m => m.metadata?.isStatic);

    if (staticMeshes.length > 10) {
      const merged = BABYLON.Mesh.MergeMeshes(
        staticMeshes,
        true,  // dispose source meshes
        true,  // allow 32-bit indices
        undefined,
        false, // don't merge materials (keep separate for textures)
        true   // merge multi-materials
      );
    }
  }

  // Per-frame optimization
  optimizeFrame(): void {
    // Update only visible chunks
    this.cullingStrategy.cullInvisibleChunks();

    // Skip rendering off-screen UI elements
    this.cullUIElements();

    // Adjust LOD based on performance
    if (this.scene.getEngine().getFps() < 55) {
      this.reduceLODQuality();
    }
  }
}
```

**Performance Targets**:
- **Draw Calls**: < 200 (achieved via instancing, merging, culling)
- **CPU Time**: < 10ms per frame (6ms rendering, 4ms game logic)
- **Memory**: < 2GB total (1GB textures, 500MB geometry, 500MB other)
- **FPS**: 60 stable (allow drops to 55 on complex scenes)

**Success Criteria**:
- [ ] Draw calls reduced by 80% (from ~1000 to <200)
- [ ] 60 FPS maintained with 500 units + terrain + shadows
- [ ] Memory usage < 2GB over 1-hour session (no leaks)
- [ ] Scene.freezeActiveMeshes() improves FPS by 20%+
- [ ] Frustum culling removes 50%+ objects from render

---

### **PRP 1.7: Automated Legal Compliance Pipeline**
**Priority**: 🔴 CRITICAL | **Effort**: 3 days | **Lines**: ~650

**DoD Requirements Addressed**:
- Zero copyrighted assets in output
- 100% asset license attribution
- Automated validation in CI/CD

**Technical Implementation**:

```typescript
// src/assets/validation/CompliancePipeline.ts
export class LegalCompliancePipeline {
  private validator: CopyrightValidator;
  private assetDB: AssetReplacementDatabase;

  async validateAndReplace(asset: ArrayBuffer, metadata: AssetMetadata): Promise<ValidatedAsset> {
    // 1. Compute SHA-256 hash
    const hash = await this.computeHash(asset);

    // 2. Check against blacklist (known Blizzard assets)
    if (this.isBlacklisted(hash)) {
      console.warn(`Rejected copyrighted asset: ${metadata.name}`);
      return await this.findReplacement(metadata);
    }

    // 3. Check embedded metadata for copyright
    const embeddedMeta = await this.extractMetadata(asset);
    if (this.containsCopyright(embeddedMeta)) {
      console.warn(`Asset contains copyright metadata: ${metadata.name}`);
      return await this.findReplacement(metadata);
    }

    // 4. Visual similarity check (for textures/models)
    if (metadata.type === "texture" || metadata.type === "model") {
      const similarity = await this.checkVisualSimilarity(asset, metadata);
      if (similarity > 0.95) { // 95% similar to copyrighted asset
        console.warn(`Asset visually similar to copyrighted content: ${metadata.name}`);
        return await this.findReplacement(metadata);
      }
    }

    // 5. License validation
    if (!this.hasValidLicense(metadata)) {
      throw new Error(`Asset missing valid license: ${metadata.name}`);
    }

    return { asset, metadata, validated: true };
  }

  // Asset replacement database
  async findReplacement(metadata: AssetMetadata): Promise<ValidatedAsset> {
    const replacement = await this.assetDB.findReplacement({
      type: metadata.type,
      category: metadata.category,
      tags: metadata.tags
    });

    if (!replacement) {
      throw new Error(`No legal replacement found for: ${metadata.name}`);
    }

    return {
      asset: replacement.buffer,
      metadata: {
        ...replacement.metadata,
        originalName: metadata.name,
        replacedDueToCopyright: true
      },
      validated: true
    };
  }
}

// CI/CD Integration (GitHub Actions)
// .github/workflows/validate-assets.yml
```

**Asset Replacement Database Schema**:
```typescript
interface AssetMapping {
  original: {
    hash: string;           // SHA-256 of copyrighted asset
    name: string;           // "Footman", "Marine", etc.
    game: "wc3" | "sc1" | "sc2";
  };
  replacement: {
    path: string;           // "assets/units/edge_footman.gltf"
    license: "CC0" | "MIT"; // Legal license
    source: string;         // Attribution URL
    visualSimilarity: number; // 0.0 - 1.0 (how similar visually)
  };
}
```

**CI/CD Workflow**:
1. Pre-commit hook runs asset validation
2. GitHub Actions validates all assets in PR
3. Build fails if copyrighted assets detected
4. Asset attribution file auto-generated

**Success Criteria**:
- [ ] 100% of copyrighted assets auto-rejected
- [ ] CI/CD pipeline fails on copyright violations
- [ ] Asset replacement database covers 100+ unit types
- [ ] License attribution file auto-generated
- [ ] Visual similarity detection catches >90% violations

---

## 📅 Implementation Timeline (6 Weeks)

### **Week 1-2: Foundation & Terrain** (Parallel)
**Team Split**:
- **Dev 1**: PRP 1.2 - Advanced Terrain System
  - Multi-texture splatting shader
  - Quadtree chunking
  - LOD system

- **Dev 2**: PRP 1.3 - GPU Instancing (Part 1)
  - Thin instances setup
  - Instance buffer management
  - Basic unit rendering

**Deliverables**:
- ✅ 256x256 terrain with 4 textures @ 60 FPS
- ✅ 100 units rendering via thin instances

### **Week 3-4: Performance & Content** (Parallel)
**Team Split**:
- **Dev 1**: PRP 1.3 - GPU Instancing (Part 2)
  - Baked animation textures
  - Animation playback system
  - Team color variations

- **Dev 2**: PRP 1.5 - Map Loading (Part 1)
  - W3X map parser (w3i, w3e, doo, units)
  - MPQ compression support
  - Basic map conversion

**Deliverables**:
- ✅ 500 animated units @ 60 FPS
- ✅ W3X maps load successfully

### **Week 5: Advanced Systems** (Parallel)
**Team Split**:
- **Dev 1**: PRP 1.4 - Cascaded Shadows
  - Shadow generator setup
  - 3-cascade implementation
  - Optimization for 500 units

- **Dev 2**: PRP 1.5 - Map Loading (Part 2)
  - SCM/SCX parser
  - .edgestory converter
  - Asset replacement integration

**Deliverables**:
- ✅ Professional shadow quality
- ✅ SCM/SCX map support
- ✅ .edgestory format working

### **Week 6: Optimization & Legal** (Sequential)
**Both Devs**:
- **Days 1-3**: PRP 1.6 - Rendering Pipeline Optimization
  - Draw call reduction
  - Material sharing
  - Mesh merging

- **Days 4-5**: PRP 1.7 - Legal Compliance Pipeline
  - CI/CD integration
  - Asset database setup
  - Automated validation

**Deliverables**:
- ✅ <200 draw calls achieved
- ✅ Automated copyright validation
- ✅ All DoD criteria met

---

## ✅ Definition of Done Validation

### Core Engine Requirements
- [x] Babylon.js scene renders at 60 FPS
- [x] Engine lifecycle (init/update/dispose) working
- [x] Resource management (no memory leaks)

### Terrain System
- [ ] Multi-texture splatting (4+ textures) ← **PRP 1.2**
- [ ] Quadtree chunking with streaming ← **PRP 1.2**
- [ ] 4-level LOD system ← **PRP 1.2**
- [ ] 60 FPS on 256x256 terrain ← **PRP 1.2**

### Unit Rendering
- [ ] 500 units @ 60 FPS ← **PRP 1.3**
- [ ] Animated units via baked textures ← **PRP 1.3**
- [ ] Team color variations ← **PRP 1.3**
- [ ] <50 draw calls for 500 units ← **PRP 1.3 + 1.6**

### Shadow System
- [ ] Cascaded shadow maps (3 cascades) ← **PRP 1.4**
- [ ] Shadows for terrain and key units ← **PRP 1.4**
- [ ] <5ms shadow generation time ← **PRP 1.4**

### Map Loading
- [ ] 95% W3X map compatibility ← **PRP 1.5**
- [ ] 95% SCM/SCX map compatibility ← **PRP 1.5**
- [ ] <10s load time for W3X ← **PRP 1.5**
- [ ] Conversion to .edgestory format ← **PRP 1.5**

### Performance
- [ ] 60 FPS with all systems active ← **PRP 1.6**
- [ ] Draw calls < 200 ← **PRP 1.6**
- [ ] Memory usage < 2GB ← **PRP 1.6**
- [ ] No memory leaks over 1hr ← **PRP 1.6**

### Legal Compliance
- [ ] Automated asset validation ← **PRP 1.7**
- [ ] CI/CD copyright checks ← **PRP 1.7**
- [ ] Asset replacement database ← **PRP 1.7**
- [ ] Zero copyrighted assets ← **PRP 1.7**

---

## 🎯 Success Metrics & Testing

### Performance Benchmarks
```bash
# Terrain rendering
npm run benchmark -- terrain-lod
# Expected: 60 FPS with 256x256 terrain, 4 textures, 4 LOD levels

# Unit rendering
npm run benchmark -- unit-instancing
# Expected: 60 FPS with 500 animated units

# Map loading
npm run benchmark -- map-loading
# Expected: W3X in <10s, SCM in <5s

# Full system
npm run benchmark -- full-system
# Expected: 60 FPS with terrain + 500 units + shadows
```

### Compatibility Testing
```bash
# Test with real maps
npm run test:maps -- --format w3x --count 100
# Expected: 95% success rate

npm run test:maps -- --format scm --count 50
# Expected: 95% success rate
```

### Legal Compliance Testing
```bash
# Copyright validation
npm run test:copyright
# Expected: 100% detection of test copyrighted assets

# Asset replacement
npm run test:asset-replacement
# Expected: All copyrighted assets replaced with legal alternatives
```

---

## 📦 Dependencies & Infrastructure

### NPM Packages to Add
```json
{
  "dependencies": {
    "@babylonjs/core": "^7.0.0",
    "@babylonjs/loaders": "^7.0.0",
    "@babylonjs/materials": "^7.0.0",      // For terrain materials
    "pako": "^2.1.0",                       // zlib decompression for MPQ
    "bzip2": "^0.1.0"                       // bzip2 for MPQ
  },
  "devDependencies": {
    "benchmark": "^2.1.4",                  // Performance testing
    "@types/benchmark": "^2.1.5"
  }
}
```

### Test Data Repository
- 100+ W3X maps (various versions, sizes, features)
- 50+ SCM/SCX maps (melee and custom)
- Test asset database with known copyrighted hashes
- Legal replacement assets (CC0/MIT licensed)

### CI/CD Updates
```yaml
# .github/workflows/phase1-validation.yml
name: Phase 1 Validation

on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - name: Run Performance Benchmarks
        run: npm run benchmark
      - name: Check FPS Targets
        run: |
          if [ "$FPS" -lt 60 ]; then
            echo "Performance regression detected"
            exit 1
          fi

  copyright:
    runs-on: ubuntu-latest
    steps:
      - name: Validate Assets
        run: npm run test:copyright
      - name: Check for Violations
        run: |
          if [ "$VIOLATIONS" -gt 0 ]; then
            echo "Copyright violations detected"
            exit 1
          fi

  compatibility:
    runs-on: ubuntu-latest
    steps:
      - name: Test Map Loading
        run: npm run test:maps
      - name: Check Success Rate
        run: |
          if [ "$SUCCESS_RATE" -lt 95 ]; then
            echo "Map compatibility below 95%"
            exit 1
          fi
```

---

## 🚨 Risk Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Performance <60 FPS | Medium | High | Early profiling, WebAssembly fallback for critical paths |
| MPQ encryption keys unknown | Low | Medium | Support common keys, document unsupported files |
| JASS script complexity | High | Low | Phase 1: Basic parsing only, full implementation in Phase 6 |
| Asset replacement gaps | Medium | High | Crowdsource community assets, placeholder system |
| Shadow performance cost | Medium | Medium | Only hero units cast shadows, blob shadows for others |

### Legal Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Asset similarity lawsuit | Low | Critical | Visual similarity <70% threshold, legal review |
| Map conversion copyright | Low | High | Clean-room implementation, interoperability defense |
| Missed copyrighted assets | Medium | High | Automated CI/CD validation, community reporting |

### Project Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Scope creep | High | Medium | Strict phase boundaries, PRP-based development |
| 6-week timeline too aggressive | Medium | Medium | Prioritize P0 PRPs (1.2, 1.3, 1.5, 1.7), defer shadows |
| Testing infrastructure delays | Low | Low | Use existing test framework, add benchmarks incrementally |

---

## 🎓 Key Learnings & Best Practices

### Babylon.js Optimization Patterns
1. **Always use thin instances** for >10 similar objects
2. **Freeze active meshes** when scene becomes static (`scene.freezeActiveMeshes()`)
3. **Disable auto-clear** for extra FPS (`scene.autoClear = false`)
4. **Use cascaded shadows**, NOT regular shadow maps
5. **Bake animations** for repeated units (walk, attack cycles)

### RTS-Specific Architecture
1. **Quadtree chunking** is essential for large terrains
2. **LOD switching** should be distance-based with hysteresis
3. **Shadow optimization**: Only heroes + buildings cast shadows
4. **Draw call budget**: <200 is achievable with instancing + merging

### Legal Compliance
1. **Automate everything** - manual checks will fail
2. **CI/CD enforcement** - block merges with violations
3. **Visual similarity** - use perceptual hashing, not exact match
4. **Attribution tracking** - auto-generate license files

---

## 📚 References & Documentation

### Babylon.js Resources
- [Thin Instances Documentation](https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/thinInstances)
- [Vertex Animation Baker](https://doc.babylonjs.com/features/featuresDeepDive/mesh/bonesSkeletons/boneAnimation#baked-vertex-animation)
- [Cascaded Shadow Maps](https://doc.babylonjs.com/features/featuresDeepDive/lights/shadows_csm)
- [Scene Optimization](https://doc.babylonjs.com/features/featuresDeepDive/scene/optimize_your_scene)

### File Format Specifications
- [MPQ Format](https://github.com/ladislav-zezula/StormLib/wiki/MPQ-Introduction)
- [W3X Structure](http://www.wc3c.net/tools/specs/)
- [SCM/SCX CHK Format](http://www.staredit.net/wiki/index.php/Scenario.chk)

### Legal References
- [DMCA Section 1201(f)](https://www.copyright.gov/title17/92chap12.html) - Reverse Engineering for Interoperability
- [Sega v. Accolade](https://en.wikipedia.org/wiki/Sega_v._Accolade) - Reverse Engineering Case Law

---

## 🎯 Next Steps

### Immediate Actions (This Week)
1. **Review this breakdown** with team
2. **Set up test data repository** (100 W3X maps, 50 SCM maps)
3. **Create asset replacement database** (start with 20 common units)
4. **Install new dependencies** (`pako`, `bzip2`, `@babylonjs/materials`)
5. **Fix Jest configuration** (tests currently not running)

### Start Development (Week 1)
1. **Dev 1**: Begin PRP 1.2 (Advanced Terrain)
   - Create custom GLSL shader
   - Implement quadtree chunking
   - Add LOD system

2. **Dev 2**: Begin PRP 1.3 (GPU Instancing)
   - Set up thin instance system
   - Create instance buffer manager
   - Test with 100 units

### Milestone Checkpoints
- **End of Week 2**: Terrain + 100 units working
- **End of Week 4**: 500 animated units + W3X maps loading
- **End of Week 6**: All DoD criteria met, ready for Phase 2

---

## 📊 Budget Allocation

**Total Budget**: $30,000
**Team**: 2 Senior Developers @ $2,500/week each

| Week | Tasks | Dev 1 Cost | Dev 2 Cost | Total |
|------|-------|-----------|-----------|-------|
| 1-2 | Terrain + Instancing (Part 1) | $5,000 | $5,000 | $10,000 |
| 3-4 | Animation + Map Loading | $5,000 | $5,000 | $10,000 |
| 5 | Shadows + Map Formats | $2,500 | $2,500 | $5,000 |
| 6 | Optimization + Legal | $2,500 | $2,500 | $5,000 |
| **Total** | | **$15,000** | **$15,000** | **$30,000** |

**Contingency**: $0 (budget exactly met)
**Alternative**: If over budget, defer PRP 1.4 (shadows) to Phase 2

---

This comprehensive breakdown provides everything needed to execute Phase 1 successfully, meeting all DoD requirements while staying within budget and timeline constraints. The PRPs are detailed, actionable, and aligned with both strategic product vision and technical implementation reality.
