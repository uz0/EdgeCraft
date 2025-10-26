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
 * ```
 */

import * as BABYLON from '@babylonjs/core';
import type { RawMapData } from '../../formats/maps/types';
import { MapLoaderRegistry } from '../../formats/maps/MapLoaderRegistry';
import { W3xWarcraftTerrainRenderer } from '../terrain/W3xWarcraftTerrainRenderer';
import { InstancedUnitRenderer } from './InstancedUnitRenderer';
import { DoodadRenderer } from './DoodadRenderer';
import { QualityPresetManager } from './QualityPresetManager';
import { AssetLoader } from '../assets/AssetLoader';

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
  private assetLoader: AssetLoader;

  private w3xTerrainRenderer: W3xWarcraftTerrainRenderer | null = null;
  private unitRenderer: InstancedUnitRenderer | null = null;
  private doodadRenderer: DoodadRenderer | null = null;
  private camera: BABYLON.Camera | null = null;
  private ambientLight: BABYLON.HemisphericLight | null = null;
  private sunLight: BABYLON.DirectionalLight | null = null;

  private currentMap: RawMapData | null = null;
  private terrainHeightRange: { min: number; max: number } = { min: 0, max: 100 };

  constructor(config: MapRendererConfig) {
    this.scene = config.scene;
    this.qualityManager = config.qualityManager;
    this.config = {
      ...config,
      enableEffects: config.enableEffects ?? true,
      cameraMode: config.cameraMode ?? 'rts',
    };

    this.loaderRegistry = new MapLoaderRegistry();
    this.assetLoader = new AssetLoader(this.scene);
  }

  /**
   * Load and render a map file
   */
  public async loadMap(file: File | ArrayBuffer, extension: string): Promise<MapRenderResult> {
    const startTime = performance.now();

    try {
      // Step 0: Load asset manifest (if not already loaded)
      await this.assetLoader.loadManifest();

      // Step 1: Load map data using registry

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

      // Step 2: Render the map
      const renderStart = performance.now();
      await this.renderMap(mapData);
      const renderTimeMs = performance.now() - renderStart;

      // Note: currentMap is set inside renderMap() before rendering entities

      return {
        success: true,
        mapData,
        loadTimeMs,
        renderTimeMs,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

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

    // CRITICAL: Set currentMap BEFORE rendering entities
    // Units and doodads need access to mapData.info.dimensions for coordinate conversion
    this.currentMap = mapData;

    // Step 1: Initialize W3x terrain renderer (unified warcraft renderer)
    this.w3xTerrainRenderer = new W3xWarcraftTerrainRenderer(this.scene);
    await this.w3xTerrainRenderer.renderTerrain(mapData.terrain);

    // Store terrain height range for camera setup (use default for now)
    this.terrainHeightRange = { min: 0, max: 512 };

    // Step 1b: Render water (if present)
    // if (mapData.terrain.water) {
    //   this.renderWater(mapData.terrain);
    // }

    // Step 1c: Render cliffs (if present)
    // DISABLED: Removing all terrain rendering for step-by-step rebuild
    // if (mapData.terrain.cliffs && mapData.terrain.cliffs.length > 0) {
    //   this.renderCliffs(mapData.terrain, this.terrainHeightRange);
    // }

    // Step 2: Initialize units
    this.renderUnits(mapData.units);

    // Step 3: Initialize doodads
    await this.renderDoodads(mapData.doodads);

    // Step 4: Apply environment settings
    this.applyEnvironment(mapData.info.environment);

    // Step 5: Setup camera
    this.setupCamera(mapData.info.dimensions);

    // Step 6: Integrate Phase 2 systems (if enabled)
    if (this.config.enableEffects) {
      this.integratePhase2Systems(mapData);
    }

    // Step 7: Debug scene inspection
    this.debugSceneInspection();
  }

  /**
   * Debug: Inspect all scene meshes and log their properties
   */
  private debugSceneInspection(): void {
    // Scene info

    if (this.scene.activeCamera) {
      const cam = this.scene.activeCamera;
      // Check if camera has a target (ArcRotateCamera)
      if ('target' in cam && cam.target instanceof BABYLON.Vector3) {
      }
    }

    // Group meshes by type
    const meshGroups = new Map<string, number>();
    const visibleMeshes: BABYLON.AbstractMesh[] = [];
    const invisibleMeshes: BABYLON.AbstractMesh[] = [];

    for (const mesh of this.scene.meshes) {
      // Group by name prefix
      const prefix = mesh.name.split('_')[0] ?? 'unknown';
      meshGroups.set(prefix, (meshGroups.get(prefix) ?? 0) + 1);

      if (mesh.isVisible) {
        visibleMeshes.push(mesh);
      } else {
        invisibleMeshes.push(mesh);
      }
    }

    for (const [_prefix, _count] of meshGroups) {
    }

    // Log first 10 visible meshes in detail
    for (let i = 0; i < Math.min(10, visibleMeshes.length); i++) {
      const mesh = visibleMeshes[i];
      if (mesh) {
      }
    }

    // Terrain-specific debug
    const terrainMesh = this.scene.getMeshByName('terrain');
    if (terrainMesh) {
      if (terrainMesh.material) {
      }
    } else {
    }

    // Unit meshes debug
    const unitMeshes = this.scene.meshes.filter((m) => m.name.startsWith('unit_'));
    if (unitMeshes.length > 0) {
      for (let i = 0; i < Math.min(5, unitMeshes.length); i++) {
        const mesh = unitMeshes[i];
        if (mesh) {
        }
      }
    }

    // Doodad meshes debug
    const doodadMeshes = this.scene.meshes.filter(
      (m) => m.name.includes('doodad') || m.name.includes('tree') || m.name.includes('rock')
    );
    if (doodadMeshes.length > 0) {
      for (let i = 0; i < Math.min(5, doodadMeshes.length); i++) {
        const mesh = doodadMeshes[i];
        if (mesh) {
        }
      }
    }
  }

  /**
   * Render units
   */
  private renderUnits(units: RawMapData['units']): void {
    if (units.length === 0) {
      return;
    }

    this.unitRenderer = new InstancedUnitRenderer(this.scene, {
      enableInstancing: true,
      maxInstancesPerBuffer: 1000,
      enablePicking: false,
    });

    // Group units by type
    const unitsByType = new Map<string, typeof units>();
    for (const unit of units) {
      const typeUnits = unitsByType.get(unit.typeId) ?? [];
      typeUnits.push(unit);
      unitsByType.set(unit.typeId, typeUnits);
    }

    // Register unit types and spawn instances with placeholder meshes

    // Render units with placeholder colored cubes
    for (const [typeId, typeUnits] of unitsByType) {
      // Create placeholder mesh for this unit type (colored cube)
      const unitColor = this.getUnitColor(typeId);
      const box = BABYLON.MeshBuilder.CreateBox(`unit_${typeId}_base`, { size: 2 }, this.scene);
      const material = new BABYLON.StandardMaterial(`unit_${typeId}_mat`, this.scene);
      material.diffuseColor = unitColor;
      material.emissiveColor = unitColor.scale(0.2); // Slight glow
      box.material = material;
      box.isVisible = false; // Hide the base mesh (instances will be visible)

      // Spawn instances for each unit
      let isFirstUnit = true;
      for (const unit of typeUnits) {
        const instance = box.createInstance(
          `unit_${unit.typeId}_${unit.position.x}_${unit.position.z}`
        );
        instance.isVisible = true;
        const mapWidth = (this.currentMap?.info.dimensions.width ?? 0) * 128;
        const mapHeight = (this.currentMap?.info.dimensions.height ?? 0) * 128;

        if (isFirstUnit) {
        }

        const offsetX = unit.position.x - mapWidth / 2;
        const offsetY = unit.position.y - mapHeight / 2;

        instance.position = new BABYLON.Vector3(offsetX, offsetY, unit.position.z);

        if (isFirstUnit) {
          isFirstUnit = false;
        }

        instance.rotation.z = unit.rotation;
        const scale = unit.scale ?? { x: 1, y: 1, z: 1 };
        instance.scaling = new BABYLON.Vector3(scale.x, scale.y, scale.z);
      }
    }
  }

  /**
   * Get color for unit type (deterministic based on typeId)
   */
  private getUnitColor(typeId: string): BABYLON.Color3 {
    // Hash the typeId to get a consistent color
    let hash = 0;
    for (let i = 0; i < typeId.length; i++) {
      hash = typeId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = (hash % 360) / 360;
    const s = 0.7;
    const l = 0.6;

    // Convert HSL to RGB
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const r = hue2rgb(p, q, h + 1 / 3);
    const g = hue2rgb(p, q, h);
    const b = hue2rgb(p, q, h - 1 / 3);

    return new BABYLON.Color3(r, g, b);
  }

  /**
   * Render doodads
   */
  private async renderDoodads(doodads: RawMapData['doodads']): Promise<void> {
    try {
      if (doodads.length === 0) {
        return;
      }

      // Set maxDoodads to actual doodad count + 10% buffer for safety
      const maxDoodads = Math.ceil(doodads.length * 1.1);

      // Calculate map dimensions for coordinate conversion
      const mapWidth = (this.currentMap?.info.dimensions.width ?? 0) * 128;
      const mapHeight = (this.currentMap?.info.dimensions.height ?? 0) * 128;

      this.doodadRenderer = new DoodadRenderer(this.scene, this.assetLoader, {
        enableInstancing: true,
        enableLOD: true,
        lodDistance: 100,
        maxDoodads,
        mapWidth, // Pass map dimensions for coordinate centering
        mapHeight,
      });

      // Collect unique doodad types
      const uniqueTypes = new Set<string>();
      for (const doodad of doodads) {
        uniqueTypes.add(doodad.typeId);
      }

      // Load all doodad types in parallel
      await Promise.all(
        Array.from(uniqueTypes).map((typeId) => this.doodadRenderer!.loadDoodadType(typeId, ''))
      );

      // Add all doodads
      for (const doodad of doodads) {
        this.doodadRenderer.addDoodad(doodad);
      }

      // Build instance buffers
      this.doodadRenderer.buildInstanceBuffers();

      // Log stats
    } catch (error) {
      throw error; // Re-throw to let upstream handlers deal with it
    }
  }

  /**
   * Apply map environment settings (lighting, fog, ambient)
   */
  private applyEnvironment(environment: RawMapData['info']['environment']): void {
    const { fog } = environment;

    // Remove all existing lights to prevent accumulation
    const existingLights = this.scene.lights.slice(); // Copy array to avoid modification during iteration
    existingLights.forEach((light) => {
      light.dispose();
    });

    // Ambient light - fills in shadows
    this.ambientLight = new BABYLON.HemisphericLight(
      'ambient',
      new BABYLON.Vector3(0, 1, 0),
      this.scene
    );
    this.ambientLight.intensity = 0.8; // Moderate ambient light

    // Directional light - main light source from above for RTS visibility
    this.sunLight = new BABYLON.DirectionalLight(
      'sun',
      new BABYLON.Vector3(-0.5, -1, -0.5), // From upper-left, pointing down
      this.scene
    );
    this.sunLight.intensity = 1.2; // Strong directional light for clear visibility
    this.sunLight.diffuse = new BABYLON.Color3(1, 0.98, 0.9); // Slightly warm sunlight
    this.sunLight.specular = new BABYLON.Color3(0.3, 0.3, 0.3); // Reduced specular for less shine

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

    this.scene.clearColor = new BABYLON.Color4(0.0, 0.0, 0.0, 1.0);
  }

  /**
   * Setup camera based on map dimensions
   */
  private setupCamera(dimensions: RawMapData['info']['dimensions']): void {
    const { width, height } = dimensions;

    // W3X world coordinates: 128 units per tile
    const TILE_SIZE = 128;
    const worldWidth = width * TILE_SIZE;
    const worldHeight = height * TILE_SIZE;

    // Calculate terrain center height (for camera target)
    // Use the actual midpoint between min and max for RTS camera target
    const terrainMidHeight = (this.terrainHeightRange.min + this.terrainHeightRange.max) / 2;
    const terrainCenterY = terrainMidHeight;
    const terrainHeight = this.terrainHeightRange.max - this.terrainHeightRange.min;
    const terrainMaxHeight = this.terrainHeightRange.max;

    if (this.scene.activeCamera) {
      this.camera = this.scene.activeCamera;
      return;
    }

    if (this.config.cameraMode === 'rts') {
      // RTS camera with classic perspective (like Warcraft 3)
      // alpha: -Math.PI/2 = facing "north" (negative Z direction)
      // beta: Math.PI/5 (~36 degrees from vertical) for classic RTS angle
      // radius: Distance from target (scaled to terrain height)
      // target: Center of map at terrain center height

      // Calculate appropriate camera distance based on map size and terrain height
      const mapDiagonal = Math.sqrt(worldWidth * worldWidth + worldHeight * worldHeight);
      const heightScaleFactor = Math.max(1, terrainHeight / 4000); // Scale radius if terrain is tall
      const baseRadius = mapDiagonal * 0.06 * heightScaleFactor;

      const camera = new BABYLON.ArcRotateCamera(
        'rtsCamera',
        -Math.PI / 2, // Facing north
        Math.PI / 5, // 36° from vertical (classic RTS angle like WC3)
        baseRadius,
        new BABYLON.Vector3(0, terrainCenterY, 0), // Target at origin (centered terrain)
        this.scene
      );

      camera.lowerRadiusLimit = baseRadius * 0.3;
      camera.upperRadiusLimit = baseRadius * 2.5;

      camera.lowerBetaLimit = 0.2; // Don't allow too steep
      camera.upperBetaLimit = Math.PI / 2.2; // Don't allow below horizon

      camera.attachControl(this.scene.getEngine().getRenderingCanvas(), true);

      this.camera = camera;
    } else if (this.config.cameraMode === 'free') {
      // Free camera with enhanced controls
      // Position camera ABOVE the terrain's maximum height to see the map properly
      // CRITICAL: Camera must be above terrainMaxHeight, not based on map diagonal!
      const mapDiagonal = Math.sqrt(worldWidth * worldWidth + worldHeight * worldHeight);
      const cameraHeight = terrainMaxHeight + 500; // 500 units above highest terrain point
      const camera = new BABYLON.UniversalCamera(
        'freeCamera',
        new BABYLON.Vector3(0, cameraHeight, -mapDiagonal * 0.1), // Pull back 10% of diagonal on Z
        this.scene
      );

      camera.rotation.x = Math.PI / 6;
      camera.rotation.z = 0;

      // Set camera view frustum for large maps
      camera.minZ = 1;
      camera.maxZ = 200000; // Support very large maps

      // Enhanced movement controls
      camera.speed = 100.0; // Movement speed (WASD)
      camera.angularSensibility = 1000; // Mouse look sensitivity (lower = more sensitive)

      // Enable keyboard and mouse controls
      camera.keysUp.push(87); // W
      camera.keysDown.push(83); // S
      camera.keysLeft.push(65); // A
      camera.keysRight.push(68); // D
      camera.keysUpward.push(69); // E (move up)
      camera.keysDownward.push(81); // Q (move down)

      camera.attachControl(this.scene.getEngine().getRenderingCanvas(), true);

      // Add mouse wheel zoom (adjust camera speed)
      this.scene.onPointerObservable.add((pointerInfo) => {
        if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERWHEEL) {
          const event = pointerInfo.event as WheelEvent;
          const delta = event.deltaY;

          // Adjust camera speed based on mouse wheel
          if (delta < 0) {
            // Scroll up = speed up (zoom in feel)
            camera.speed = Math.min(camera.speed * 1.2, 20.0);
          } else {
            // Scroll down = slow down (zoom out feel)
            camera.speed = Math.max(camera.speed / 1.2, 0.5);
          }
        }
      });

      this.camera = camera;
    }

    this.scene.activeCamera = this.camera;

    if (this.camera) {
    }
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
      }
    }

    // Minimap system (initialize with map dimensions in world coordinates)
    if (systems.minimap != null) {
      const TILE_SIZE = 128;
      const worldWidth = mapData.info.dimensions.width * TILE_SIZE;
      const worldHeight = mapData.info.dimensions.height * TILE_SIZE;
      systems.minimap.setMapBounds({
        minX: -worldWidth / 2,
        maxX: worldWidth / 2,
        minZ: -worldHeight / 2,
        maxZ: worldHeight / 2,
      });
    }
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
      terrain: null,
      units: this.unitRenderer?.getStats() ?? null,
      doodads: this.doodadRenderer?.getStats() ?? null,
      phase2: this.qualityManager.getStats(),
    };
  }

  /**
   * Get the active camera
   */
  public getCamera(): BABYLON.Camera | null {
    return this.camera;
  }

  /**
   * Dispose all resources
   */
  public dispose(): void {
    if (this.w3xTerrainRenderer != null) {
      this.w3xTerrainRenderer.dispose();
      this.w3xTerrainRenderer = null;
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

    if (this.ambientLight != null) {
      this.ambientLight.dispose();
      this.ambientLight = null;
    }

    if (this.sunLight != null) {
      this.sunLight.dispose();
      this.sunLight = null;
    }

    this.assetLoader.dispose();
    this.currentMap = null;
  }
}
