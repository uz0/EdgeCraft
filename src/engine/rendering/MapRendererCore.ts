/**
 * Map Renderer Core - Unified Map Rendering Orchestrator
 *
 * Orchestrates all rendering systems (terrain, units, doodads, Phase 2 effects)
 * to render maps loaded from any format (W3X, W3N, SC2Map).
 *
 * Core Responsibility: Transform RawMapData → Rendered Babylon.js Scene
 *
 * @example
 * ```typescript
 * const renderer = new MapRendererCore({
 *   scene,
 *   qualityManager,
 *   enableEffects: true,
 *   cameraMode: 'rts',
 * });
 *
 * const result = await renderer.loadMap(file, '.w3x');
 * console.log(`Loaded in ${result.loadTimeMs}ms, rendered in ${result.renderTimeMs}ms`);
 * ```
 */

import * as BABYLON from '@babylonjs/core';
import type { RawMapData } from '../../formats/maps/types';
import { MapLoaderRegistry } from '../../formats/maps/MapLoaderRegistry';
import { TerrainRenderer } from '../terrain/TerrainRenderer';
import { InstancedUnitRenderer } from './InstancedUnitRenderer';
import { DoodadRenderer } from './DoodadRenderer';
import { QualityPresetManager } from './QualityPresetManager';

/**
 * Map renderer configuration
 */
export interface MapRendererConfig {
  /** Babylon.js scene */
  scene: BABYLON.Scene;

  /** Quality preset manager */
  qualityManager: QualityPresetManager;

  /** Enable Phase 2 effects */
  enableEffects?: boolean;

  /** Camera mode */
  cameraMode?: 'rts' | 'free' | 'cinematic';
}

/**
 * Map render result
 */
export interface MapRenderResult {
  success: boolean;
  mapData?: RawMapData;
  loadTimeMs: number;
  renderTimeMs: number;
  error?: string;
}

/**
 * Map Renderer Core
 *
 * Orchestrates terrain, units, and Phase 2 systems to render complete maps.
 */
export class MapRendererCore {
  private scene: BABYLON.Scene;
  private qualityManager: QualityPresetManager;
  private config: Required<MapRendererConfig>;
  private loaderRegistry: MapLoaderRegistry;

  private terrainRenderer: TerrainRenderer | null = null;
  private unitRenderer: InstancedUnitRenderer | null = null;
  private doodadRenderer: DoodadRenderer | null = null;
  private camera: BABYLON.Camera | null = null;

  private currentMap: RawMapData | null = null;

  constructor(config: MapRendererConfig) {
    this.scene = config.scene;
    this.qualityManager = config.qualityManager;
    this.config = {
      ...config,
      enableEffects: config.enableEffects ?? true,
      cameraMode: config.cameraMode ?? 'rts',
    };

    this.loaderRegistry = new MapLoaderRegistry();

    console.log('MapRendererCore initialized');
  }

  /**
   * Load and render a map file
   */
  public async loadMap(file: File | ArrayBuffer, extension: string): Promise<MapRenderResult> {
    const startTime = performance.now();

    try {
      // Step 1: Load map data using registry
      console.log(`Loading map (${extension})...`);

      let mapLoadResult;
      if (file instanceof File) {
        mapLoadResult = await this.loaderRegistry.loadMap(file, {
          convertToEdgeStory: false, // We just need the raw map data
          validateAssets: false, // Skip asset validation for now
        });
      } else {
        mapLoadResult = await this.loaderRegistry.loadMapFromBuffer(file, extension, {
          convertToEdgeStory: false,
          validateAssets: false,
        });
      }

      const mapData = mapLoadResult.rawMap;
      const loadTimeMs = performance.now() - startTime;

      console.log(
        `Map loaded: ${mapData.info.name} (${mapData.terrain.width}x${mapData.terrain.height})`
      );

      // Step 2: Render the map
      console.log('Rendering map...');
      const renderStart = performance.now();
      await this.renderMap(mapData);
      const renderTimeMs = performance.now() - renderStart;

      this.currentMap = mapData;

      console.log(
        `Map rendered successfully in ${renderTimeMs.toFixed(2)}ms (total: ${(loadTimeMs + renderTimeMs).toFixed(2)}ms)`
      );

      return {
        success: true,
        mapData,
        loadTimeMs,
        renderTimeMs,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Map loading failed:', errorMsg);

      return {
        success: false,
        loadTimeMs: performance.now() - startTime,
        renderTimeMs: 0,
        error: errorMsg,
      };
    }
  }

  /**
   * Render a loaded map
   */
  private async renderMap(mapData: RawMapData): Promise<void> {
    // Dispose previous map
    this.dispose();

    // Step 1: Initialize terrain
    await this.renderTerrain(mapData.terrain);

    // Step 2: Initialize units
    this.renderUnits(mapData.units);

    // Step 3: Initialize doodads
    this.renderDoodads(mapData.doodads);

    // Step 4: Apply environment settings
    this.applyEnvironment(mapData.info.environment);

    // Step 5: Setup camera
    this.setupCamera(mapData.info.dimensions);

    // Step 6: Integrate Phase 2 systems (if enabled)
    if (this.config.enableEffects) {
      this.integratePhase2Systems(mapData);
    }

    console.log('Map rendering complete');
  }

  /**
   * Render terrain
   */
  private async renderTerrain(terrain: RawMapData['terrain']): Promise<void> {
    this.terrainRenderer = new TerrainRenderer(this.scene);

    // Convert heightmap Float32Array to a data URL for TerrainRenderer
    const heightmapUrl = this.createHeightmapDataUrl(
      terrain.heightmap,
      terrain.width,
      terrain.height
    );

    // Determine texture URLs
    const textureUrls =
      terrain.textures.length > 0 &&
      terrain.textures[0]?.path != null &&
      terrain.textures[0].path !== ''
        ? [terrain.textures[0].path]
        : [];

    await this.terrainRenderer.loadHeightmap(heightmapUrl, {
      width: terrain.width,
      height: terrain.height,
      subdivisions: Math.min(128, Math.max(32, terrain.width / 4)),
      maxHeight: 100, // Default max height
      textures: textureUrls,
    });

    console.log(`Terrain rendered: ${terrain.width}x${terrain.height}`);
  }

  /**
   * Convert heightmap Float32Array to data URL
   */
  private createHeightmapDataUrl(heightmap: Float32Array, width: number, height: number): string {
    // Create canvas to encode heightmap as image
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (ctx == null) {
      throw new Error('Failed to get canvas 2D context');
    }

    // Create ImageData
    const imageData = ctx.createImageData(width, height);

    // Convert heightmap to grayscale (0-255)
    let minHeight = Infinity;
    let maxHeight = -Infinity;

    for (let i = 0; i < heightmap.length; i++) {
      minHeight = Math.min(minHeight, heightmap[i] ?? 0);
      maxHeight = Math.max(maxHeight, heightmap[i] ?? 0);
    }

    console.log(
      `[MapRendererCore] Heightmap stats: min=${minHeight}, max=${maxHeight}, total=${heightmap.length}`
    );

    const range = maxHeight - minHeight || 1;

    for (let i = 0; i < heightmap.length; i++) {
      const normalizedHeight = ((heightmap[i] ?? 0) - minHeight) / range;
      const grayscale = Math.floor(normalizedHeight * 255);

      const idx = i * 4;
      imageData.data[idx] = grayscale; // R
      imageData.data[idx + 1] = grayscale; // G
      imageData.data[idx + 2] = grayscale; // B
      imageData.data[idx + 3] = 255; // A
    }

    ctx.putImageData(imageData, 0, 0);

    return canvas.toDataURL('image/png');
  }

  /**
   * Render units
   */
  private renderUnits(units: RawMapData['units']): void {
    this.unitRenderer = new InstancedUnitRenderer(this.scene, {
      enableInstancing: true,
      maxInstancesPerBuffer: 1000,
      enablePicking: false,
    });

    console.log(`Rendering ${units.length} units...`);

    // Group units by type
    const unitsByType = new Map<string, typeof units>();
    for (const unit of units) {
      const typeUnits = unitsByType.get(unit.typeId) ?? [];
      typeUnits.push(unit);
      unitsByType.set(unit.typeId, typeUnits);
    }

    // Register unit types and spawn instances
    // Note: For now, we skip actual mesh loading since we don't have unit models
    // This will be handled when actual unit models are available
    console.log(`Found ${unitsByType.size} unique unit types`);

    // TODO: When unit models are available:
    // for (const [typeId, typeUnits] of unitsByType) {
    //   await this.unitRenderer.registerUnitType(typeId, meshUrl, animations);
    //   for (const unit of typeUnits) {
    //     this.unitRenderer.spawnUnit(
    //       typeId,
    //       new BABYLON.Vector3(unit.position.x, unit.position.y, unit.position.z),
    //       new BABYLON.Color3(1, 1, 1),
    //       unit.rotation
    //     );
    //   }
    // }
  }

  /**
   * Render doodads
   */
  private renderDoodads(doodads: RawMapData['doodads']): void {
    if (doodads.length === 0) {
      console.log('No doodads to render');
      return;
    }

    this.doodadRenderer = new DoodadRenderer(this.scene, {
      enableInstancing: true,
      enableLOD: true,
      lodDistance: 100,
      maxDoodads: 2000,
    });

    console.log(`Rendering ${doodads.length} doodads...`);

    // Add all doodads
    for (const doodad of doodads) {
      this.doodadRenderer.addDoodad(doodad);
    }

    // Build instance buffers
    this.doodadRenderer.buildInstanceBuffers();

    // Log stats
    const stats = this.doodadRenderer.getStats();
    console.log(
      `Doodads rendered: ${stats.totalDoodads} instances, ${stats.typesLoaded} types, ${stats.drawCalls} draw calls`
    );
  }

  /**
   * Apply map environment settings (lighting, fog, ambient)
   */
  private applyEnvironment(environment: RawMapData['info']['environment']): void {
    const { tileset, fog } = environment;

    // Ambient light
    const ambientLight = new BABYLON.HemisphericLight(
      'ambient',
      new BABYLON.Vector3(0, 1, 0),
      this.scene
    );
    ambientLight.intensity = 0.6;

    // Fog (if specified)
    if (fog != null) {
      this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
      this.scene.fogDensity = fog.density;
      this.scene.fogColor = new BABYLON.Color3(
        fog.color.r / 255,
        fog.color.g / 255,
        fog.color.b / 255
      );
    }

    // Background color (based on tileset)
    const tilesetColors: Record<string, BABYLON.Color3> = {
      ashenvale: new BABYLON.Color3(0.2, 0.3, 0.2),
      barrens: new BABYLON.Color3(0.4, 0.3, 0.2),
      felwood: new BABYLON.Color3(0.1, 0.2, 0.1),
      dungeon: new BABYLON.Color3(0.1, 0.1, 0.1),
      default: new BABYLON.Color3(0.3, 0.4, 0.5),
    };

    const tilesetColor =
      tilesetColors[tileset.toLowerCase()] ??
      tilesetColors['default'] ??
      new BABYLON.Color3(0.3, 0.4, 0.5);

    this.scene.clearColor = new BABYLON.Color4(tilesetColor.r, tilesetColor.g, tilesetColor.b, 1.0);

    console.log(`Environment applied: tileset=${tileset}, fog=${fog != null}`);
  }

  /**
   * Setup camera based on map dimensions
   */
  private setupCamera(dimensions: RawMapData['info']['dimensions']): void {
    const { width, height } = dimensions;

    if (this.config.cameraMode === 'rts') {
      // RTS camera with bounds
      const camera = new BABYLON.ArcRotateCamera(
        'rtsCamera',
        -Math.PI / 2,
        Math.PI / 4,
        width * 0.8,
        new BABYLON.Vector3(width / 2, 0, height / 2),
        this.scene
      );

      camera.lowerRadiusLimit = width * 0.3;
      camera.upperRadiusLimit = width * 1.5;
      camera.lowerBetaLimit = 0.1;
      camera.upperBetaLimit = Math.PI / 2.2;

      camera.attachControl(this.scene.getEngine().getRenderingCanvas(), true);
      this.camera = camera;
    } else if (this.config.cameraMode === 'free') {
      // Free camera
      const camera = new BABYLON.UniversalCamera(
        'freeCamera',
        new BABYLON.Vector3(width / 2, 50, height / 2),
        this.scene
      );
      camera.setTarget(new BABYLON.Vector3(width / 2, 0, height / 2));
      camera.attachControl(this.scene.getEngine().getRenderingCanvas(), true);
      this.camera = camera;
    }

    this.scene.activeCamera = this.camera;

    console.log(`Camera initialized: mode=${this.config.cameraMode}`);
  }

  /**
   * Integrate Phase 2 systems with map data
   */
  private integratePhase2Systems(mapData: RawMapData): void {
    const systems = this.qualityManager.getSystems();

    // Weather system (if map specifies weather)
    if (mapData.info.environment.weather != null && systems.weather != null) {
      const weatherType = mapData.info.environment.weather.toLowerCase();
      if (['rain', 'snow', 'fog', 'storm'].includes(weatherType)) {
        systems.weather.setWeather({
          type: weatherType as 'rain' | 'snow' | 'fog' | 'storm',
          intensity: 0.7,
        });
        console.log(`Weather set: ${weatherType}`);
      }
    }

    // Minimap system (initialize with map dimensions)
    if (systems.minimap != null) {
      systems.minimap.setMapBounds({
        minX: 0,
        maxX: mapData.info.dimensions.width,
        minZ: 0,
        maxZ: mapData.info.dimensions.height,
      });
      console.log('Minimap bounds updated');
    }

    console.log('Phase 2 systems integrated');
  }

  /**
   * Get current map data
   */
  public getCurrentMap(): RawMapData | null {
    return this.currentMap;
  }

  /**
   * Get rendering statistics
   */
  public getStats(): {
    terrain: unknown;
    units: unknown;
    doodads: unknown;
    phase2: unknown;
  } {
    return {
      terrain: this.terrainRenderer?.getLoadStatus() ?? null,
      units: this.unitRenderer?.getStats() ?? null,
      doodads: this.doodadRenderer?.getStats() ?? null,
      phase2: this.qualityManager.getStats(),
    };
  }

  /**
   * Dispose all resources
   */
  public dispose(): void {
    if (this.terrainRenderer != null) {
      this.terrainRenderer.dispose();
      this.terrainRenderer = null;
    }

    if (this.unitRenderer != null) {
      this.unitRenderer.dispose();
      this.unitRenderer = null;
    }

    if (this.doodadRenderer != null) {
      this.doodadRenderer.dispose();
      this.doodadRenderer = null;
    }

    if (this.camera != null) {
      this.camera.dispose();
      this.camera = null;
    }

    this.currentMap = null;

    console.log('MapRendererCore disposed');
  }
}
