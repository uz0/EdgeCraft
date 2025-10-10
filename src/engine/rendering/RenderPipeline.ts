/**
 * Optimized Render Pipeline - Main rendering optimization system
 *
 * Orchestrates all optimization strategies:
 * - Material sharing (70% reduction)
 * - Mesh merging (50% reduction)
 * - Advanced culling (50% object removal)
 * - Dynamic LOD (quality adjustment)
 *
 * Target: <200 draw calls, 60 FPS, <2GB memory
 */

import * as BABYLON from '@babylonjs/core';
import { MaterialCache } from './MaterialCache';
import { CullingStrategy } from './CullingStrategy';
import { DrawCallOptimizer } from './DrawCallOptimizer';
import type {
  RenderPipelineOptions,
  RenderPipelineState,
  PerformanceMetrics,
  OptimizationStats,
} from './types';
import { QualityPreset } from './types';

/**
 * Main rendering optimization pipeline
 *
 * @example
 * ```typescript
 * const pipeline = new OptimizedRenderPipeline(scene);
 * await pipeline.initialize({
 *   enableMaterialSharing: true,
 *   enableMeshMerging: true,
 *   enableCulling: true,
 *   enableDynamicLOD: true,
 *   targetFPS: 60,
 * });
 *
 * // In render loop
 * pipeline.optimizeFrame();
 *
 * // Get stats
 * const stats = pipeline.getStats();
 * console.log(`Draw calls: ${stats.performance.drawCalls}, FPS: ${stats.performance.fps}`);
 * ```
 */
export class OptimizedRenderPipeline {
  private scene: BABYLON.Scene;
  private engine: BABYLON.AbstractEngine;
  private materialCache: MaterialCache;
  private cullingStrategy: CullingStrategy;
  private drawCallOptimizer: DrawCallOptimizer;

  private state: RenderPipelineState;
  private options: Required<RenderPipelineOptions>;

  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
    this.engine = scene.getEngine();

    // Initialize sub-systems
    this.materialCache = new MaterialCache(scene);
    this.cullingStrategy = new CullingStrategy(scene);
    this.drawCallOptimizer = new DrawCallOptimizer(scene);

    // Initialize default options
    this.options = {
      enableMaterialSharing: true,
      enableMeshMerging: true,
      enableCulling: true,
      enableDynamicLOD: true,
      targetFPS: 60,
      initialQuality: QualityPreset.HIGH,
    };

    // Initialize state
    this.state = {
      isInitialized: false,
      isFrozen: false,
      lodState: {
        currentQuality: QualityPreset.HIGH,
        targetFPS: 60,
        fpsSamples: [],
        lastAdjustmentTime: 0,
        adjustmentCooldown: 2000, // 2 seconds
      },
      stats: this.createEmptyStats(),
    };
  }

  /**
   * Initialize the rendering pipeline with optimizations
   */
  public initialize(options?: RenderPipelineOptions): void {
    // Merge options
    if (options != null) {
      this.options = { ...this.options, ...options };
      if (options.initialQuality != null) {
        this.state.lodState.currentQuality = options.initialQuality;
      }
      if (options.targetFPS != null && options.targetFPS > 0) {
        this.state.lodState.targetFPS = options.targetFPS;
      }
    }

    console.log('Initializing optimized render pipeline...');

    // 1. Scene-level optimizations
    this.applySceneOptimizations();

    // 2. Material sharing
    if (this.options.enableMaterialSharing) {
      console.log('Optimizing materials...');
      this.materialCache.optimizeMeshMaterials();
      const materialStats = this.materialCache.getStats();
      console.log(
        `Material sharing: ${materialStats.originalCount} → ${materialStats.sharedCount} (${materialStats.reductionPercent}% reduction)`
      );
    }

    // 3. Mesh merging for static objects
    if (this.options.enableMeshMerging) {
      console.log('Merging static meshes...');
      const mergeResult = this.drawCallOptimizer.mergeStaticMeshes();
      console.log(
        `Mesh merging: ${mergeResult.sourceCount} meshes, saved ${mergeResult.drawCallsSaved} draw calls`
      );
    }

    // 4. Advanced culling
    if (this.options.enableCulling) {
      console.log('Enabling advanced culling...');
      this.cullingStrategy.enable();
    }

    // 5. Freeze active meshes for performance
    this.freezeActiveMeshes();

    // 6. Register frame optimization callback
    this.scene.onBeforeRenderObservable.add(() => {
      this.optimizeFrame();
    });

    this.state.isInitialized = true;
    console.log('Render pipeline initialized successfully');

    // Log initial stats
    this.updateStats();
    console.log('Initial performance:', this.state.stats.performance);
  }

  /**
   * Apply scene-level optimizations
   */
  private applySceneOptimizations(): void {
    // Disable auto-clear (already done in Engine.ts, but ensure it's set)
    this.scene.autoClear = false;
    this.scene.autoClearDepthAndStencil = false;

    // Skip pointer move picking for better performance
    this.scene.skipPointerMovePicking = true;

    // Optimize picking
    this.scene.constantlyUpdateMeshUnderPointer = false;

    // Use hardware scaling for better performance
    if (this.engine.getHardwareScalingLevel() > 1) {
      this.engine.setHardwareScalingLevel(1);
    }

    // Disable unnecessary features
    this.scene.audioEnabled = false;
    this.scene.proceduralTexturesEnabled = false;

    console.log('Scene-level optimizations applied');
  }

  /**
   * Freeze active meshes for huge performance gain
   */
  private freezeActiveMeshes(): void {
    // Mark static meshes
    for (const mesh of this.scene.meshes) {
      const metadata = mesh.metadata as Record<string, unknown> | null | undefined;
      if (
        metadata != null &&
        typeof metadata === 'object' &&
        'isStatic' in metadata &&
        metadata.isStatic === true
      ) {
        mesh.freezeWorldMatrix();
      }
    }

    // Freeze active meshes list (20-40% FPS improvement!)
    this.scene.freezeActiveMeshes();
    this.state.isFrozen = true;

    console.log('Active meshes frozen');
  }

  /**
   * Unfreeze active meshes (for dynamic scenes)
   */
  public unfreezeActiveMeshes(): void {
    this.scene.unfreezeActiveMeshes();
    this.state.isFrozen = false;
  }

  /**
   * Optimize each frame (dynamic LOD, etc.)
   */
  public optimizeFrame(): void {
    if (!this.state.isInitialized) {
      return;
    }

    // Dynamic LOD adjustment
    if (this.options.enableDynamicLOD) {
      this.adjustQualityBasedOnFPS();
    }

    // Update stats periodically (every 60 frames)
    if (this.engine.frameId % 60 === 0) {
      this.updateStats();
    }
  }

  /**
   * Adjust quality preset based on FPS
   */
  private adjustQualityBasedOnFPS(): void {
    const fps = this.engine.getFps();
    const now = Date.now();

    // Add FPS sample
    this.state.lodState.fpsSamples.push(fps);
    if (this.state.lodState.fpsSamples.length > 10) {
      this.state.lodState.fpsSamples.shift();
    }

    // Check if enough time has passed since last adjustment
    if (now - this.state.lodState.lastAdjustmentTime < this.state.lodState.adjustmentCooldown) {
      return;
    }

    // Calculate average FPS
    const avgFPS =
      this.state.lodState.fpsSamples.reduce((a, b) => a + b, 0) /
      this.state.lodState.fpsSamples.length;

    const targetFPS = this.state.lodState.targetFPS;
    const currentQuality = this.state.lodState.currentQuality;

    // Reduce quality if FPS is too low
    if (avgFPS < targetFPS - 5) {
      if (currentQuality === QualityPreset.ULTRA) {
        this.setQualityPreset(QualityPreset.HIGH);
      } else if (currentQuality === QualityPreset.HIGH) {
        this.setQualityPreset(QualityPreset.MEDIUM);
      } else if (currentQuality === QualityPreset.MEDIUM) {
        this.setQualityPreset(QualityPreset.LOW);
      }
    }

    // Increase quality if FPS is high enough
    else if (avgFPS > targetFPS + 3) {
      if (currentQuality === QualityPreset.LOW) {
        this.setQualityPreset(QualityPreset.MEDIUM);
      } else if (currentQuality === QualityPreset.MEDIUM) {
        this.setQualityPreset(QualityPreset.HIGH);
      } else if (currentQuality === QualityPreset.HIGH) {
        this.setQualityPreset(QualityPreset.ULTRA);
      }
    }
  }

  /**
   * Set quality preset
   */
  public setQualityPreset(quality: QualityPreset): void {
    if (quality === this.state.lodState.currentQuality) {
      return;
    }

    console.log(`Adjusting quality: ${this.state.lodState.currentQuality} → ${quality}`);

    this.state.lodState.currentQuality = quality;
    this.state.lodState.lastAdjustmentTime = Date.now();

    // Apply quality settings
    switch (quality) {
      case QualityPreset.LOW:
        this.engine.setHardwareScalingLevel(2);
        this.scene.shadowsEnabled = false;
        break;

      case QualityPreset.MEDIUM:
        this.engine.setHardwareScalingLevel(1.5);
        this.scene.shadowsEnabled = true;
        break;

      case QualityPreset.HIGH:
        this.engine.setHardwareScalingLevel(1);
        this.scene.shadowsEnabled = true;
        break;

      case QualityPreset.ULTRA:
        this.engine.setHardwareScalingLevel(1);
        this.scene.shadowsEnabled = true;
        this.scene.particlesEnabled = true;
        break;
    }
  }

  /**
   * Update performance statistics
   */
  private updateStats(): void {
    const engine = this.engine;
    const scene = this.scene;

    // Performance metrics
    const performance: PerformanceMetrics = {
      fps: engine.getFps(),
      frameTimeMs: engine.getDeltaTime(),
      drawCalls: (engine as BABYLON.Engine)._drawCalls?.current ?? 0,
      totalVertices: scene.getTotalVertices(),
      activeMeshes: scene.getActiveMeshes().length,
      totalMeshes: scene.meshes.length,
      totalMaterials: scene.materials.length,
      memoryUsageMB: this.estimateMemoryUsage(),
      textureMemoryMB: this.estimateTextureMemory(),
    };

    // Material sharing stats
    const materialStats = this.materialCache.getStats();

    // Mesh merging stats
    const meshStats = this.drawCallOptimizer.getStats();

    // Culling stats
    const cullingStats = this.cullingStrategy.getStats();

    // Update state
    this.state.stats = {
      materialSharing: {
        originalCount: materialStats.originalCount,
        sharedCount: materialStats.sharedCount,
        reductionPercent: materialStats.reductionPercent,
      },
      meshMerging: {
        originalCount: meshStats.originalMeshCount,
        mergedCount: meshStats.mergedMeshCount,
        drawCallsSaved: meshStats.currentMeshCount - meshStats.originalMeshCount,
      },
      culling: cullingStats,
      performance,
    };
  }

  /**
   * Estimate memory usage (rough approximation)
   */
  private estimateMemoryUsage(): number {
    // This is a rough estimate
    // Real memory usage tracking requires performance.memory API
    let memoryMB = 0;

    // Geometry memory
    memoryMB += (this.scene.getTotalVertices() * 32) / (1024 * 1024); // ~32 bytes per vertex

    // Material memory
    memoryMB += this.scene.materials.length * 0.1; // ~100KB per material

    return Math.round(memoryMB);
  }

  /**
   * Estimate texture memory usage
   */
  private estimateTextureMemory(): number {
    let memoryMB = 0;

    for (const texture of this.scene.textures) {
      if (texture instanceof BABYLON.Texture) {
        const size = texture.getSize();
        // Assume RGBA (4 bytes per pixel)
        memoryMB += (size.width * size.height * 4) / (1024 * 1024);
      }
    }

    return Math.round(memoryMB);
  }

  /**
   * Get optimization statistics
   */
  public getStats(): Readonly<OptimizationStats> {
    return JSON.parse(JSON.stringify(this.state.stats)) as OptimizationStats;
  }

  /**
   * Get current state
   */
  public getState(): Readonly<RenderPipelineState> {
    return JSON.parse(JSON.stringify(this.state)) as RenderPipelineState;
  }

  /**
   * Create empty stats object
   */
  private createEmptyStats(): OptimizationStats {
    return {
      materialSharing: {
        originalCount: 0,
        sharedCount: 0,
        reductionPercent: 0,
      },
      meshMerging: {
        originalCount: 0,
        mergedCount: 0,
        drawCallsSaved: 0,
      },
      culling: {
        totalObjects: 0,
        visibleObjects: 0,
        frustumCulled: 0,
        occlusionCulled: 0,
        cullingTimeMs: 0,
      },
      performance: {
        fps: 0,
        frameTimeMs: 0,
        drawCalls: 0,
        totalVertices: 0,
        activeMeshes: 0,
        totalMeshes: 0,
        totalMaterials: 0,
        memoryUsageMB: 0,
        textureMemoryMB: 0,
      },
    };
  }

  /**
   * Dispose of the render pipeline
   */
  public dispose(): void {
    this.scene.unfreezeActiveMeshes();
    this.materialCache.clear();
    this.drawCallOptimizer.clear();
    console.log('Render pipeline disposed');
  }
}
