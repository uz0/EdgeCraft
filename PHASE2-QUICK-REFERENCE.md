# Phase 2 Quick Reference Guide

**For:** Developers implementing Phase 2 features
**Performance Target:** 60 FPS @ Medium Preset (16ms frame budget)

---

## Quality Preset Configuration

### Code Template

```typescript
// src/engine/renderer/QualityPresetManager.ts

export enum QualityPreset {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  ULTRA = 'ultra'
}

export interface PresetConfig {
  // Post-Processing
  postProcessing: {
    fxaa: boolean;
    bloom: boolean;
    bloomKernel: number;
    sharpen: boolean;
    chromaticAberration: boolean;
    ssao: boolean;
    dof: boolean;
  };

  // Particles
  maxParticles: number;
  useGPUParticles: boolean;

  // Lighting
  maxLights: number;

  // Shadows
  shadowsEnabled: boolean;
  shadowCascades: number;
  shadowMapSize: number;

  // Materials
  usePBR: boolean;

  // Decals
  maxDecals: number;

  // RTT
  minimapResolution: number;
  minimapUpdateRate: number; // FPS
}

export const QUALITY_PRESETS: Record<QualityPreset, PresetConfig> = {
  [QualityPreset.LOW]: {
    postProcessing: {
      fxaa: true,
      bloom: false,
      bloomKernel: 0,
      sharpen: false,
      chromaticAberration: false,
      ssao: false,
      dof: false
    },
    maxParticles: 1000,
    useGPUParticles: false, // CPU fallback
    maxLights: 4,
    shadowsEnabled: false,
    shadowCascades: 0,
    shadowMapSize: 0,
    usePBR: false,
    maxDecals: 25,
    minimapResolution: 128,
    minimapUpdateRate: 15
  },

  [QualityPreset.MEDIUM]: {
    postProcessing: {
      fxaa: true,
      bloom: true,
      bloomKernel: 32, // Reduced from default 64
      sharpen: false,
      chromaticAberration: false,
      ssao: false,
      dof: false
    },
    maxParticles: 5000,
    useGPUParticles: true,
    maxLights: 8,
    shadowsEnabled: true,
    shadowCascades: 2,
    shadowMapSize: 1024,
    usePBR: true,
    maxDecals: 50,
    minimapResolution: 256,
    minimapUpdateRate: 30
  },

  [QualityPreset.HIGH]: {
    postProcessing: {
      fxaa: true,
      bloom: true,
      bloomKernel: 64,
      sharpen: true,
      chromaticAberration: true,
      ssao: false, // Still too expensive
      dof: false   // Still too expensive
    },
    maxParticles: 10000,
    useGPUParticles: true,
    maxLights: 12,
    shadowsEnabled: true,
    shadowCascades: 3,
    shadowMapSize: 2048,
    usePBR: true,
    maxDecals: 100,
    minimapResolution: 512,
    minimapUpdateRate: 30
  },

  [QualityPreset.ULTRA]: {
    postProcessing: {
      fxaa: true,
      bloom: true,
      bloomKernel: 128,
      sharpen: true,
      chromaticAberration: true,
      ssao: true,  // Only in ULTRA
      dof: true    // Only in ULTRA
    },
    maxParticles: 20000,
    useGPUParticles: true,
    maxLights: 16,
    shadowsEnabled: true,
    shadowCascades: 4,
    shadowMapSize: 4096,
    usePBR: true,
    maxDecals: 200,
    minimapResolution: 512,
    minimapUpdateRate: 60
  }
};
```

---

## Post-Processing Setup

### DefaultRenderingPipeline (Medium Preset)

```typescript
// src/engine/renderer/PostProcessingManager.ts

export class PostProcessingManager {
  private pipeline: BABYLON.DefaultRenderingPipeline;

  applyPreset(preset: QualityPreset, scene: BABYLON.Scene, camera: BABYLON.Camera) {
    // Dispose existing pipeline
    if (this.pipeline) {
      this.pipeline.dispose();
    }

    const config = QUALITY_PRESETS[preset];

    if (preset === QualityPreset.LOW && !config.postProcessing.bloom) {
      // LOW: FXAA only (separate post-process, cheaper than pipeline)
      const fxaa = new BABYLON.FxaaPostProcess(
        "fxaa", 1.0, camera
      );
      return;
    }

    // MEDIUM, HIGH, ULTRA: Use DefaultRenderingPipeline
    this.pipeline = new BABYLON.DefaultRenderingPipeline(
      "defaultPipeline",
      true, // HDR
      scene,
      [camera]
    );

    // FXAA
    this.pipeline.fxaaEnabled = config.postProcessing.fxaa;

    // Bloom
    this.pipeline.bloomEnabled = config.postProcessing.bloom;
    if (config.postProcessing.bloom) {
      this.pipeline.bloomThreshold = 0.9;
      this.pipeline.bloomWeight = 0.3;
      this.pipeline.bloomKernel = config.postProcessing.bloomKernel;
      this.pipeline.bloomScale = 0.5;
    }

    // Sharpen (HIGH+)
    this.pipeline.sharpenEnabled = config.postProcessing.sharpen;
    if (config.postProcessing.sharpen) {
      this.pipeline.sharpen.edgeAmount = 0.3;
      this.pipeline.sharpen.colorAmount = 1.0;
    }

    // Chromatic Aberration (HIGH+)
    this.pipeline.chromaticAberrationEnabled = config.postProcessing.chromaticAberration;
    if (config.postProcessing.chromaticAberration) {
      this.pipeline.chromaticAberration.aberrationAmount = 30;
    }

    // SSAO (ULTRA only)
    // WARNING: 4-8ms cost!
    this.pipeline.samples = preset === QualityPreset.ULTRA ? 4 : 1;

    // Image Processing (always on for HDR)
    this.pipeline.imageProcessingEnabled = true;
    this.pipeline.imageProcessing.toneMappingEnabled = true;
    this.pipeline.imageProcessing.toneMappingType =
      BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
    this.pipeline.imageProcessing.exposure = 1.0;
    this.pipeline.imageProcessing.contrast = 1.0;
  }
}
```

**Performance:**
- LOW (FXAA only): 1ms
- MEDIUM (FXAA + Bloom): 3-4ms
- HIGH (+ Sharpen + CA): 8-10ms
- ULTRA (+ SSAO): 12-18ms

---

## GPU Particle System

### Implementation (Medium = 5,000 particles)

```typescript
// src/engine/particles/ParticleManager.ts

export class ParticleManager {
  private systems: Map<string, BABYLON.GPUParticleSystem | BABYLON.ParticleSystem>;
  private currentPreset: QualityPreset;

  createWeatherSystem(
    type: 'rain' | 'snow',
    scene: BABYLON.Scene
  ): void {
    const config = QUALITY_PRESETS[this.currentPreset];

    // Check WebGL2 support
    const useGPU = config.useGPUParticles &&
                   BABYLON.GPUParticleSystem.IsSupported;

    let system: BABYLON.GPUParticleSystem | BABYLON.ParticleSystem;

    if (useGPU) {
      // GPU Particles (WebGL2)
      system = new BABYLON.GPUParticleSystem(
        type,
        { capacity: config.maxParticles },
        scene
      );

      // Set active count (can be less than capacity)
      system.activeParticleCount = this.calculateParticleCount(type, config);
    } else {
      // CPU Fallback (WebGL1)
      system = new BABYLON.ParticleSystem(
        type,
        config.maxParticles,
        scene
      );
    }

    // Common configuration
    this.configureWeatherParticles(system, type);

    this.systems.set(type, system);
  }

  private calculateParticleCount(
    type: 'rain' | 'snow',
    config: PresetConfig
  ): number {
    // Distribute particle budget
    switch(type) {
      case 'rain':
        return Math.floor(config.maxParticles * 0.6); // 60% for rain
      case 'snow':
        return Math.floor(config.maxParticles * 0.4); // 40% for snow
    }
  }

  private configureWeatherParticles(
    system: BABYLON.GPUParticleSystem | BABYLON.ParticleSystem,
    type: 'rain' | 'snow'
  ): void {
    // Emitter
    system.emitter = BABYLON.Vector3.Zero();
    system.minEmitBox = new BABYLON.Vector3(-50, 20, -50);
    system.maxEmitBox = new BABYLON.Vector3(50, 20, 50);

    if (type === 'rain') {
      // Rain configuration
      system.particleTexture = new BABYLON.Texture(
        "textures/rain_particle.png",
        system.getScene()
      );

      system.minSize = 0.1;
      system.maxSize = 0.3;
      system.minLifeTime = 1.0;
      system.maxLifeTime = 2.0;
      system.emitRate = 1000;

      // Direction (downward)
      system.direction1 = new BABYLON.Vector3(-1, -10, -1);
      system.direction2 = new BABYLON.Vector3(1, -10, 1);

      system.gravity = new BABYLON.Vector3(0, -9.81, 0);

    } else if (type === 'snow') {
      // Snow configuration
      system.particleTexture = new BABYLON.Texture(
        "textures/snow_particle.png",
        system.getScene()
      );

      system.minSize = 0.2;
      system.maxSize = 0.5;
      system.minLifeTime = 5.0;
      system.maxLifeTime = 10.0;
      system.emitRate = 500;

      // Direction (gentle fall)
      system.direction1 = new BABYLON.Vector3(-0.5, -2, -0.5);
      system.direction2 = new BABYLON.Vector3(0.5, -2, 0.5);

      system.gravity = new BABYLON.Vector3(0, -1.0, 0);
    }

    system.start();
  }
}
```

**Performance Budget:**
- 1,000 particles (LOW, CPU): 1-2ms
- 5,000 particles (MEDIUM, GPU): 2-3ms
- 10,000 particles (HIGH, GPU): 4-6ms

---

## Advanced Lighting with Culling

### Distance-Based Light Management

```typescript
// src/engine/lighting/LightingManager.ts

export class LightingManager {
  private allLights: BABYLON.Light[] = [];
  private activeLights: BABYLON.Light[] = [];
  private maxLights: number;

  constructor(private scene: BABYLON.Scene, preset: QualityPreset) {
    this.maxLights = QUALITY_PRESETS[preset].maxLights;
  }

  addLight(light: BABYLON.Light): void {
    light.setEnabled(false); // Start disabled
    this.allLights.push(light);
  }

  update(cameraPosition: BABYLON.Vector3): void {
    // Sort lights by distance to camera
    const sorted = this.allLights
      .filter(l => l instanceof BABYLON.PointLight || l instanceof BABYLON.SpotLight)
      .map(l => ({
        light: l,
        distance: BABYLON.Vector3.Distance(
          (l as BABYLON.PointLight).position,
          cameraPosition
        )
      }))
      .sort((a, b) => a.distance - b.distance);

    // Enable closest N lights
    this.activeLights = sorted.slice(0, this.maxLights).map(l => l.light);
    this.activeLights.forEach(l => l.setEnabled(true));

    // Disable far lights
    sorted.slice(this.maxLights).forEach(l => l.light.setEnabled(false));
  }

  // For materials that support it
  setMaxSimultaneousLights(material: BABYLON.PBRMaterial): void {
    material.maxSimultaneousLights = this.maxLights;
  }
}
```

**Performance:**
- 4 lights: 1ms
- 8 lights: 4-6ms (MEDIUM target)
- 12 lights: 6-8ms (HIGH)

---

## Cascaded Shadow Maps

### Quality-Gated Shadows

```typescript
// src/engine/shadows/ShadowManager.ts

export class ShadowManager {
  private shadowGenerator: BABYLON.CascadedShadowGenerator;

  createShadows(
    light: BABYLON.DirectionalLight,
    preset: QualityPreset
  ): void {
    const config = QUALITY_PRESETS[preset];

    if (!config.shadowsEnabled) {
      return; // No shadows for LOW preset
    }

    this.shadowGenerator = new BABYLON.CascadedShadowGenerator(
      config.shadowMapSize,
      light
    );

    // Cascade configuration
    this.shadowGenerator.numCascades = config.shadowCascades;

    // MEDIUM: 2 cascades, no auto depth
    // HIGH: 3 cascades, with auto depth (expensive!)
    this.shadowGenerator.autoCalcDepthBounds =
      (preset === QualityPreset.HIGH || preset === QualityPreset.ULTRA);

    // Cascade blending
    this.shadowGenerator.cascadeBlendPercentage = 0.1;

    // Stabilization
    this.shadowGenerator.stabilizeCascades = true;

    // Filter quality
    if (preset === QualityPreset.HIGH || preset === QualityPreset.ULTRA) {
      this.shadowGenerator.usePercentageCloserFiltering = true;
      this.shadowGenerator.filteringQuality =
        BABYLON.ShadowGenerator.QUALITY_HIGH;
    } else {
      this.shadowGenerator.useBlurExponentialShadowMap = true;
      this.shadowGenerator.blurScale = 2;
    }
  }

  addShadowCaster(mesh: BABYLON.Mesh): void {
    if (this.shadowGenerator) {
      this.shadowGenerator.addShadowCaster(mesh);
    }
  }
}
```

**Performance:**
- No shadows (LOW): 0ms
- 2 cascades (MEDIUM): 4-5ms
- 3 cascades (HIGH): 6-8ms
- 4 cascades (ULTRA): 8-12ms

---

## Texture Decals (Babylon.js 6.0+)

### Efficient Decal System

```typescript
// src/engine/decals/DecalManager.ts

export class DecalManager {
  private decals: Map<string, BABYLON.DecalMapConfiguration> = new Map();
  private maxDecals: number;

  constructor(preset: QualityPreset) {
    this.maxDecals = QUALITY_PRESETS[preset].maxDecals;
  }

  // IMPORTANT: Use Texture Decals, NOT mesh decals!
  // Mesh decals create new meshes (1 draw call each)
  // Texture decals project through UV space (no extra draw calls)

  applyDecal(
    targetMesh: BABYLON.Mesh,
    position: BABYLON.Vector3,
    normal: BABYLON.Vector3,
    size: BABYLON.Vector2,
    texture: BABYLON.Texture
  ): string {
    // Check budget
    if (this.decals.size >= this.maxDecals) {
      this.removeOldestDecal();
    }

    const decalId = `decal_${Date.now()}`;

    // Use DecalMap (v6.0+ feature)
    const material = targetMesh.material as BABYLON.PBRMaterial;

    if (!material.decalMap) {
      material.decalMap = new BABYLON.DecalMapConfiguration(material);
    }

    material.decalMap.addDecal({
      position: position,
      normal: normal,
      size: size,
      texture: texture,
      angle: 0
    });

    this.decals.set(decalId, material.decalMap);

    return decalId;
  }

  private removeOldestDecal(): void {
    const oldest = this.decals.keys().next().value;
    if (oldest) {
      this.decals.delete(oldest);
    }
  }
}
```

**Performance:**
- 25 decals (LOW): 0.5-1ms
- 50 decals (MEDIUM): 1-2ms
- 100 decals (HIGH): 2-3ms

**DO NOT use MeshBuilder.CreateDecal()** - creates new meshes!

---

## Minimap RTT (Single Render Target)

### Efficient Minimap Rendering

```typescript
// src/engine/minimap/MinimapManager.ts

export class MinimapManager {
  private rtt: BABYLON.RenderTargetTexture;
  private minimapCamera: BABYLON.FreeCamera;
  private updateInterval: number;
  private frameCounter: number = 0;

  constructor(
    scene: BABYLON.Scene,
    preset: QualityPreset
  ) {
    const config = QUALITY_PRESETS[preset];

    // Create render target texture
    this.rtt = new BABYLON.RenderTargetTexture(
      "minimap",
      config.minimapResolution,
      scene,
      false // No mipmaps
    );

    // Orthographic camera for top-down view
    this.minimapCamera = new BABYLON.FreeCamera(
      "minimapCamera",
      new BABYLON.Vector3(0, 100, 0), // High above terrain
      scene
    );
    this.minimapCamera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
    this.minimapCamera.orthoTop = 50;
    this.minimapCamera.orthoBottom = -50;
    this.minimapCamera.orthoLeft = -50;
    this.minimapCamera.orthoRight = 50;
    this.minimapCamera.rotation.x = Math.PI / 2; // Look down

    // Set render list (only terrain + units, no UI)
    this.rtt.renderList = this.getMinimapMeshes(scene);

    // Active camera for RTT
    this.rtt.activeCamera = this.minimapCamera;

    // Update rate (don't update every frame!)
    this.updateInterval = Math.floor(60 / config.minimapUpdateRate);

    // Optimize: refresh rate
    this.rtt.refreshRate = this.updateInterval;
  }

  private getMinimapMeshes(scene: BABYLON.Scene): BABYLON.AbstractMesh[] {
    // Only render terrain, units, buildings (no particles, no UI)
    return scene.meshes.filter(m =>
      m.metadata?.minimapVisible === true
    );
  }

  update(): void {
    // Manual update control for finer control
    this.frameCounter++;
    if (this.frameCounter >= this.updateInterval) {
      this.rtt.render();
      this.frameCounter = 0;
    }
  }

  getTexture(): BABYLON.RenderTargetTexture {
    return this.rtt;
  }

  dispose(): void {
    this.rtt.dispose();
    this.minimapCamera.dispose();
  }
}
```

**Performance:**
- 128x128 @ 15fps (LOW): 1-2ms
- 256x256 @ 30fps (MEDIUM): 2-3ms
- 512x512 @ 30fps (HIGH): 4-6ms

**DO NOT create multiple RTTs** - stick to minimap only!

---

## Performance Monitoring

### SceneInstrumentation Setup

```typescript
// src/engine/diagnostics/PerformanceMonitor.ts

export class PerformanceMonitor {
  private instrumentation: BABYLON.SceneInstrumentation;
  private fpsHistory: number[] = [];
  private warningThreshold = 55; // Below 55 FPS = warning

  constructor(private scene: BABYLON.Scene) {
    this.instrumentation = new BABYLON.SceneInstrumentation(scene);

    // Enable all counters
    this.instrumentation.captureFrameTime = true;
    this.instrumentation.captureRenderTime = true;
    this.instrumentation.captureRenderTargetsRenderTime = true;
    this.instrumentation.captureParticlesRenderTime = true;
    this.instrumentation.captureActiveMeshesEvaluationTime = true;
    this.instrumentation.captureGPUFrameTime = true;
  }

  getMetrics(): PerformanceMetrics {
    const fps = this.scene.getEngine().getFps();

    return {
      fps: fps,
      frameTime: this.instrumentation.frameTimeCounter.current,
      renderTime: this.instrumentation.renderTimeCounter.current,
      rttTime: this.instrumentation.renderTargetsRenderTimeCounter.current,
      particleTime: this.instrumentation.particlesRenderTimeCounter.current,
      meshEvalTime: this.instrumentation.activeMeshesEvaluationTimeCounter.current,
      drawCalls: this.instrumentation.drawCallsCounter.current,
      totalVertices: this.scene.getTotalVertices(),
      activeMeshes: this.scene.getActiveMeshes().length
    };
  }

  checkPerformance(): PerformanceStatus {
    const fps = this.scene.getEngine().getFps();
    this.fpsHistory.push(fps);

    if (this.fpsHistory.length > 60) {
      this.fpsHistory.shift();
    }

    const avgFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;

    if (avgFPS < this.warningThreshold) {
      return {
        status: 'WARNING',
        message: `FPS below threshold: ${avgFPS.toFixed(1)}`,
        suggestQualityDowngrade: true
      };
    }

    return {
      status: 'OK',
      message: `Performance good: ${avgFPS.toFixed(1)} FPS`,
      suggestQualityDowngrade: false
    };
  }

  logDetailedMetrics(): void {
    const metrics = this.getMetrics();
    console.log('=== Performance Metrics ===');
    console.log(`FPS: ${metrics.fps.toFixed(1)}`);
    console.log(`Frame Time: ${metrics.frameTime.toFixed(2)}ms`);
    console.log(`  Render Time: ${metrics.renderTime.toFixed(2)}ms`);
    console.log(`  RTT Time: ${metrics.rttTime.toFixed(2)}ms`);
    console.log(`  Particle Time: ${metrics.particleTime.toFixed(2)}ms`);
    console.log(`  Mesh Eval Time: ${metrics.meshEvalTime.toFixed(2)}ms`);
    console.log(`Draw Calls: ${metrics.drawCalls}`);
    console.log(`Active Meshes: ${metrics.activeMeshes}`);
    console.log(`Total Vertices: ${metrics.totalVertices}`);
  }
}
```

---

## Automatic Quality Adjustment

### SceneOptimizer Integration

```typescript
// src/engine/optimization/AutoQualityManager.ts

export class AutoQualityManager {
  private targetFPS = 60;
  private optimizer: BABYLON.SceneOptimizer;

  constructor(
    private scene: BABYLON.Scene,
    private qualityManager: QualityPresetManager,
    initialPreset: QualityPreset
  ) {
    this.startOptimizer(initialPreset);
  }

  private startOptimizer(preset: QualityPreset): void {
    // Get appropriate degradation level
    let options: BABYLON.SceneOptimizerOptions;

    switch(preset) {
      case QualityPreset.HIGH:
      case QualityPreset.ULTRA:
        options = BABYLON.SceneOptimizerOptions.HighDegradationAllowed();
        break;
      case QualityPreset.MEDIUM:
        options = BABYLON.SceneOptimizerOptions.ModerateDegradationAllowed();
        break;
      case QualityPreset.LOW:
        options = BABYLON.SceneOptimizerOptions.LowDegradationAllowed();
        break;
    }

    // Set target FPS
    options.targetFrameRate = this.targetFPS;

    // Start optimizer
    this.optimizer = BABYLON.SceneOptimizer.OptimizeAsync(
      this.scene,
      options,
      () => {
        console.log('SceneOptimizer: Target FPS achieved');
      },
      () => {
        console.warn('SceneOptimizer: Could not reach target FPS');
        this.handleOptimizationFailure();
      }
    );
  }

  private handleOptimizationFailure(): void {
    // Downgrade quality preset
    const currentPreset = this.qualityManager.getCurrentPreset();

    if (currentPreset === QualityPreset.HIGH) {
      this.qualityManager.setPreset(QualityPreset.MEDIUM);
    } else if (currentPreset === QualityPreset.MEDIUM) {
      this.qualityManager.setPreset(QualityPreset.LOW);
    } else {
      console.error('Already at LOW preset, cannot optimize further');
    }
  }

  stop(): void {
    if (this.optimizer) {
      this.optimizer.stop();
    }
  }
}
```

---

## Performance Checklist

### Before Shipping Phase 2

- [ ] **MEDIUM preset hits 60 FPS** on GTX 1060
- [ ] **Frame time <16ms** measured via SceneInstrumentation
- [ ] **Draw calls <200** (check via instrumentation)
- [ ] **Memory <2GB** after 1 hour session
- [ ] **No memory leaks** (Chrome DevTools heap snapshot)
- [ ] **Particle count** tested (5k = 60 FPS confirmed)
- [ ] **Safari tested** (force LOW if <45 FPS)
- [ ] **WebGL1 fallback** works (CPU particles)
- [ ] **Quality presets** switch at runtime
- [ ] **SceneOptimizer** auto-downgrades when needed
- [ ] **Shader precompilation** prevents hitches
- [ ] **All resources disposed** properly (no leaks)

---

## Common Pitfalls

### AVOID THESE MISTAKES

**1. Using Mesh Decals Instead of Texture Decals**
```typescript
// ❌ BAD: Creates new mesh for each decal
const decal = BABYLON.MeshBuilder.CreateDecal("decal", mesh, {
  position: pos,
  normal: normal,
  size: new BABYLON.Vector3(1, 1, 1)
});
// Result: 100 decals = 100 draw calls = PERFORMANCE DEATH

// ✅ GOOD: Use Texture Decals (v6.0+)
material.decalMap.addDecal({
  position: pos,
  normal: normal,
  size: size,
  texture: texture
});
// Result: 100 decals = 0 extra draw calls
```

**2. Not Precompiling Shaders**
```typescript
// ❌ BAD: Shaders compile on first frame = hitch
scene.render(); // First frame hitches for 100ms+

// ✅ GOOD: Precompile on load
scene.materials.forEach(material => {
  material.forceCompilation(scene);
});
// Wait for compilation before starting game
```

**3. Updating RTT Every Frame**
```typescript
// ❌ BAD: Minimap renders every frame
rtt.refreshRate = BABYLON.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
scene.onBeforeRenderObservable.add(() => {
  rtt.render(); // Renders every frame = expensive!
});

// ✅ GOOD: Update at lower rate (30fps for minimap)
rtt.refreshRate = 2; // Every 2 frames = 30fps
```

**4. Not Disposing Babylon.js Resources**
```typescript
// ❌ BAD: Memory leak
particleSystem.stop();
// Particles stopped but still in memory!

// ✅ GOOD: Proper cleanup
particleSystem.dispose();
material.dispose();
mesh.dispose();
texture.dispose();
```

**5. Too Many Active Lights**
```typescript
// ❌ BAD: All lights always enabled
lights.forEach(l => l.setEnabled(true));
// Result: Material shader complexity explodes

// ✅ GOOD: Distance-based culling
updateLights(cameraPosition);
// Only enable closest 8 lights
```

---

## Quick Performance Math

### Frame Budget Breakdown (MEDIUM Preset)

| System | Budget | Notes |
|--------|--------|-------|
| Phase 1 Baseline | 6-8ms | Scene + terrain + 500 units |
| Post-Processing | 3-4ms | FXAA + Bloom (kernel 32) |
| GPU Particles | 2-3ms | 5,000 particles (weather) |
| Lighting | 1-2ms | 4 more lights (8 total) |
| Shadows | 4-5ms | CSM 2 cascades |
| Decals | 1-2ms | 50 texture decals |
| Minimap RTT | 2-3ms | 256x256 @ 30fps |
| PBR Overhead | +1ms | vs Standard materials |
| **TOTAL** | **14-16ms** | ✅ **Under 16.67ms budget** |

**Safety margin:** 0.67-2.67ms

---

## Testing Commands

### Performance Testing

```bash
# Start dev server with performance overlay
npm run dev -- --performance

# Run performance benchmarks
npm run benchmark

# Run 1-hour stress test
npm run test:stress
```

### Manual Testing

```typescript
// In browser console:

// Check current FPS
console.log(scene.getEngine().getFps());

// Check frame time
console.log(scene.getInstrumentation().frameTimeCounter.current);

// Check draw calls
console.log(scene.getInstrumentation().drawCallsCounter.current);

// Switch quality preset at runtime
window.qualityManager.setPreset('high');

// Log detailed metrics
window.performanceMonitor.logDetailedMetrics();
```

---

## Resources

**Babylon.js Documentation:**
- DefaultRenderingPipeline: https://doc.babylonjs.com/features/featuresDeepDive/postProcesses/defaultRenderingPipeline
- GPU Particles: https://doc.babylonjs.com/features/featuresDeepDive/particles/particle_system/gpu_particles/
- SceneOptimizer: https://doc.babylonjs.com/features/featuresDeepDive/scene/sceneOptimizer
- Cascaded Shadows: https://doc.babylonjs.com/features/featuresDeepDive/lights/shadows_csm

**Performance Case Studies:**
- BattleTabs Optimization: https://mikecann.blog/posts/improving-performance-in-babylonjs
- Large-Scale Scene: https://joepavitt.medium.com/optimizing-a-large-scale-babylon-js-scene-9466bb715e15

**Full Research:**
- Phase 2 Research Report: `/Users/dcversus/conductor/edgecraft/.conductor/doha/PHASE2-RESEARCH-REPORT.md`
- Executive Summary: `/Users/dcversus/conductor/edgecraft/.conductor/doha/PHASE2-EXECUTIVE-SUMMARY.md`

---

**Last Updated:** 2025-10-10
**Author:** babylon-renderer agent
