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

  private terrainRenderer: TerrainRenderer | null = null;
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

    console.log('MapRendererCore initialized');
  }

  /**
   * Load and render a map file
   */
  public async loadMap(file: File | ArrayBuffer, extension: string): Promise<MapRenderResult> {
    const startTime = performance.now();

    try {
      // Step 0: Load asset manifest (if not already loaded)
      console.log('Loading asset manifest...');
      await this.assetLoader.loadManifest();

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

      // Note: currentMap is set inside renderMap() before rendering entities

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

    // CRITICAL: Set currentMap BEFORE rendering entities
    // Units and doodads need access to mapData.info.dimensions for coordinate conversion
    this.currentMap = mapData;

    // Step 1: Initialize terrain
    await this.renderTerrain(mapData.terrain);

    // Store terrain height range for camera setup
    this.terrainHeightRange = {
      min: this.terrainRenderer?.getMesh()?.getBoundingInfo().minimum.y ?? 0,
      max: this.terrainRenderer?.getMesh()?.getBoundingInfo().maximum.y ?? 100,
    };

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

    console.log('Map rendering complete');

    // Step 7: Debug scene inspection
    this.debugSceneInspection();
  }

  /**
   * Debug: Inspect all scene meshes and log their properties
   */
  private debugSceneInspection(): void {
    console.log('\n========== SCENE DEBUG INSPECTION ==========');

    // Scene info
    console.log(`[DEBUG] Scene meshes: ${this.scene.meshes.length} total`);
    console.log(`[DEBUG] Active camera: ${this.scene.activeCamera?.name ?? 'none'}`);

    if (this.scene.activeCamera) {
      const cam = this.scene.activeCamera;
      console.log(
        `[DEBUG] Camera position: (${cam.position.x.toFixed(2)}, ${cam.position.y.toFixed(2)}, ${cam.position.z.toFixed(2)})`
      );
      // Check if camera has a target (ArcRotateCamera)
      if ('target' in cam && cam.target instanceof BABYLON.Vector3) {
        const target = cam.target;
        console.log(
          `[DEBUG] Camera target: (${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)})`
        );
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

    console.log('\n[DEBUG] Mesh groups:');
    for (const [prefix, count] of meshGroups) {
      console.log(`  - ${prefix}: ${count} meshes`);
    }

    console.log(`\n[DEBUG] Visible meshes: ${visibleMeshes.length}/${this.scene.meshes.length}`);
    console.log(`[DEBUG] Invisible meshes: ${invisibleMeshes.length}/${this.scene.meshes.length}`);

    // Log first 10 visible meshes in detail
    console.log('\n[DEBUG] Sample visible meshes (first 10):');
    for (let i = 0; i < Math.min(10, visibleMeshes.length); i++) {
      const mesh = visibleMeshes[i];
      if (mesh) {
        const mat = mesh.material;
        console.log(
          `  [${i}] ${mesh.name}: ` +
            `pos=(${mesh.position.x.toFixed(1)}, ${mesh.position.y.toFixed(1)}, ${mesh.position.z.toFixed(1)}), ` +
            `scale=(${mesh.scaling.x.toFixed(2)}, ${mesh.scaling.y.toFixed(2)}, ${mesh.scaling.z.toFixed(2)}), ` +
            `material=${mat?.name ?? 'none'}, ` +
            `vertices=${mesh.getTotalVertices()}`
        );
      }
    }

    // Terrain-specific debug
    const terrainMesh = this.scene.getMeshByName('terrain');
    if (terrainMesh) {
      console.log('\n[DEBUG] TERRAIN MESH:');
      console.log(`  Name: ${terrainMesh.name}`);
      console.log(
        `  Position: (${terrainMesh.position.x}, ${terrainMesh.position.y}, ${terrainMesh.position.z})`
      );
      console.log(
        `  Scaling: (${terrainMesh.scaling.x}, ${terrainMesh.scaling.y}, ${terrainMesh.scaling.z})`
      );
      console.log(`  Visible: ${terrainMesh.isVisible}`);
      console.log(`  Vertices: ${terrainMesh.getTotalVertices()}`);
      console.log(`  Material: ${terrainMesh.material?.name ?? 'none'}`);

      if (terrainMesh.material) {
        const mat = terrainMesh.material as BABYLON.StandardMaterial;
        console.log(`  Material diffuseColor: ${mat.diffuseColor?.toString() ?? 'none'}`);
        console.log(`  Material diffuseTexture: ${mat.diffuseTexture?.name ?? 'none'}`);
        console.log(`  Material alpha: ${mat.alpha}`);
      }

      const bbox = terrainMesh.getBoundingInfo().boundingBox;
      console.log(
        `  BoundingBox min: (${bbox.minimumWorld.x.toFixed(1)}, ${bbox.minimumWorld.y.toFixed(1)}, ${bbox.minimumWorld.z.toFixed(1)})`
      );
      console.log(
        `  BoundingBox max: (${bbox.maximumWorld.x.toFixed(1)}, ${bbox.maximumWorld.y.toFixed(1)}, ${bbox.maximumWorld.z.toFixed(1)})`
      );
    } else {
      console.log('\n[DEBUG] TERRAIN MESH: NOT FOUND!');
    }

    // Unit meshes debug
    const unitMeshes = this.scene.meshes.filter((m) => m.name.startsWith('unit_'));
    console.log(`\n[DEBUG] Unit meshes: ${unitMeshes.length} total`);
    if (unitMeshes.length > 0) {
      console.log('[DEBUG] First 5 unit meshes:');
      for (let i = 0; i < Math.min(5, unitMeshes.length); i++) {
        const mesh = unitMeshes[i];
        if (mesh) {
          console.log(
            `  [${i}] ${mesh.name}: pos=(${mesh.position.x.toFixed(1)}, ${mesh.position.y.toFixed(1)}, ${mesh.position.z.toFixed(1)}), visible=${mesh.isVisible}`
          );
        }
      }
    }

    // Doodad meshes debug
    const doodadMeshes = this.scene.meshes.filter(
      (m) => m.name.includes('doodad') || m.name.includes('tree') || m.name.includes('rock')
    );
    console.log(`\n[DEBUG] Doodad meshes: ${doodadMeshes.length} total`);
    if (doodadMeshes.length > 0) {
      console.log('[DEBUG] First 5 doodad meshes:');
      for (let i = 0; i < Math.min(5, doodadMeshes.length); i++) {
        const mesh = doodadMeshes[i];
        if (mesh) {
          console.log(
            `  [${i}] ${mesh.name}: pos=(${mesh.position.x.toFixed(1)}, ${mesh.position.y.toFixed(1)}, ${mesh.position.z.toFixed(1)}), visible=${mesh.isVisible}`
          );
        }
      }
    }

    console.log('\n========== END SCENE DEBUG ==========\n');
  }

  /**
   * Render terrain
   */
  private async renderTerrain(terrain: RawMapData['terrain']): Promise<void> {
    this.terrainRenderer = new TerrainRenderer(this.scene, this.assetLoader);

    // Convert heightmap Float32Array to a data URL for TerrainRenderer
    const {
      url: heightmapUrl,
      minHeight,
      maxHeight,
    } = this.createHeightmapDataUrl(terrain.heightmap, terrain.width, terrain.height);

    // Check if we have multi-texture terrain (W3X maps with groundTextureIds)
    const hasMultiTexture =
      terrain.textures.length > 1 && terrain.textures[0]?.blendMap !== undefined;

    if (hasMultiTexture) {
      // Multi-texture splatmap rendering (W3X maps with 4-8 textures)
      const textureIds = terrain.textures.map((t) => t.id);
      const blendMap = terrain.textures[0]?.blendMap;

      if (!blendMap) {
        throw new Error('[MapRendererCore] BlendMap is required for multi-texture terrain');
      }

      console.log(
        `[MapRendererCore] Loading multi-texture terrain: ${terrain.width}x${terrain.height}, ` +
          `textures: [${textureIds.join(', ')}], ` +
          `blendMap size: ${blendMap.length}, ` +
          `height range: [${minHeight.toFixed(1)}, ${maxHeight.toFixed(1)}]`
      );

      // W3X world coordinates: 128 units per tile
      const TILE_SIZE = 128;
      const result = await this.terrainRenderer.loadHeightmapMultiTexture(heightmapUrl, {
        width: terrain.width * TILE_SIZE, // World dimensions for mesh
        height: terrain.height * TILE_SIZE,
        splatmapWidth: terrain.width, // Tile dimensions for splatmap (1 pixel per tile)
        splatmapHeight: terrain.height,
        subdivisions: Math.min(128, Math.max(32, terrain.width / 4)),
        minHeight, // Use actual heightmap min
        maxHeight, // Use actual heightmap max
        textureIds,
        blendMap,
      });

      if ('error' in result) {
        console.error('[MapRendererCore] Failed to load multi-texture terrain:', result.error);
        throw new Error(`Multi-texture terrain loading failed: ${result.error}`);
      }

      console.log('[MapRendererCore] Multi-texture terrain loaded successfully');
    } else {
      // Single texture rendering (fallback or simple maps)
      const textureId = terrain.textures.length > 0 ? terrain.textures[0]?.id : undefined;

      console.log(
        `[MapRendererCore] Loading single-texture terrain: ${terrain.width}x${terrain.height}, ` +
          `heightmap data URL length: ${heightmapUrl.length}, textureId: ${textureId ?? 'none'}, ` +
          `height range: [${minHeight.toFixed(1)}, ${maxHeight.toFixed(1)}]`
      );

      // W3X world coordinates: 128 units per tile
      const TILE_SIZE = 128;
      const result = await this.terrainRenderer.loadHeightmap(heightmapUrl, {
        width: terrain.width * TILE_SIZE,
        height: terrain.height * TILE_SIZE,
        subdivisions: Math.min(128, Math.max(32, terrain.width / 4)),
        minHeight, // Use actual heightmap min
        maxHeight, // Use actual heightmap max
        textureId,
      });

      if ('error' in result) {
        console.error(`[MapRendererCore] Terrain loading failed: ${result.error}`);
        throw new Error(`Terrain loading failed: ${result.error}`);
      }

      console.log(
        `[MapRendererCore] Terrain rendered successfully: ${terrain.width}x${terrain.height}, ` +
          `mesh: ${result.mesh?.name ?? 'unknown'}`
      );
    }
  }

  /**
   * Convert heightmap Float32Array to data URL
   * @returns Object with url (data URL), minHeight, and maxHeight
   */
  private createHeightmapDataUrl(
    heightmap: Float32Array,
    width: number,
    height: number
  ): { url: string; minHeight: number; maxHeight: number } {
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

    const range = maxHeight - minHeight;

    // Handle flat terrain (when all heights are the same)
    if (range === 0) {
      console.warn(
        `[MapRendererCore] Flat terrain detected (all heights = ${minHeight}), using mid-gray (127) for visibility`
      );
      // Use mid-gray (127) for flat terrain so it renders at mid-height
      for (let i = 0; i < heightmap.length; i++) {
        const idx = i * 4;
        imageData.data[idx] = 127; // R
        imageData.data[idx + 1] = 127; // G
        imageData.data[idx + 2] = 127; // B
        imageData.data[idx + 3] = 255; // A
      }
    } else {
      // Normal heightmap with variation
      for (let i = 0; i < heightmap.length; i++) {
        const normalizedHeight = ((heightmap[i] ?? 0) - minHeight) / range;
        const grayscale = Math.floor(normalizedHeight * 255);

        const idx = i * 4;
        imageData.data[idx] = grayscale; // R
        imageData.data[idx + 1] = grayscale; // G
        imageData.data[idx + 2] = grayscale; // B
        imageData.data[idx + 3] = 255; // A
      }
    }

    ctx.putImageData(imageData, 0, 0);

    return {
      url: canvas.toDataURL('image/png'),
      minHeight,
      maxHeight,
    };
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

    // Register unit types and spawn instances with placeholder meshes
    console.log(`Found ${unitsByType.size} unique unit types`);

    // Render units with placeholder colored cubes
    for (const [typeId, typeUnits] of unitsByType) {
      // Create placeholder mesh for this unit type (colored cube)
      const unitColor = this.getUnitColor(typeId);
      const box = BABYLON.MeshBuilder.CreateBox(`unit_${typeId}_base`, { size: 2 }, this.scene);
      const material = new BABYLON.StandardMaterial(`unit_${typeId}_mat`, this.scene);
      material.diffuseColor = unitColor;
      material.emissiveColor = unitColor.scale(0.2); // Slight glow
      box.material = material;
      box.isVisible = false; // Hide the base mesh

      // Spawn instances for each unit
      let isFirstUnit = true;
      for (const unit of typeUnits) {
        const instance = box.createInstance(
          `unit_${unit.typeId}_${unit.position.x}_${unit.position.z}`
        );
        // W3X to Babylon.js coordinate mapping:
        // W3X: X=right, Y=forward, Z=up
        // Babylon: X=right, Y=up, Z=forward
        // Therefore: Babylon.X = W3X.X, Babylon.Y = W3X.Z, Babylon.Z = -W3X.Y (negated)
        //
        // IMPORTANT: W3X uses absolute world coordinates (0 to mapWidth/mapHeight),
        // but Babylon.js CreateGroundFromHeightMap centers terrain at origin (0, 0, 0).
        // Therefore, we must subtract half the map dimensions to align entities with terrain.
        const mapWidth = (this.currentMap?.info.dimensions.width ?? 0) * 128;
        const mapHeight = (this.currentMap?.info.dimensions.height ?? 0) * 128;

        if (isFirstUnit) {
          console.log(
            `[MapRendererCore] 🔍 UNIT COORDINATE DEBUG - First unit: ` +
              `raw W3X pos=(${unit.position.x.toFixed(1)}, ${unit.position.y.toFixed(1)}, ${unit.position.z.toFixed(1)}), ` +
              `mapWidth=${mapWidth}, mapHeight=${mapHeight}`
          );
        }

        instance.position = new BABYLON.Vector3(
          unit.position.x - mapWidth / 2, // Center X (offset from corner to center)
          unit.position.z + 1, // Height + 1 to sit above terrain
          -(unit.position.y - mapHeight / 2) // Center Z and negate
        );

        if (isFirstUnit) {
          console.log(
            `[MapRendererCore] 🔍 UNIT COORDINATE DEBUG - After offset: ` +
              `Babylon pos=(${instance.position.x.toFixed(1)}, ${instance.position.y.toFixed(1)}, ${instance.position.z.toFixed(1)})`
          );
          isFirstUnit = false;
        }

        instance.rotation.y = unit.rotation;
        // Handle optional scale (default to 1,1,1 if undefined)
        const scale = unit.scale ?? { x: 1, y: 1, z: 1 };
        instance.scaling = new BABYLON.Vector3(scale.x, scale.z, scale.y);
      }
    }
    console.log(`[MapRendererCore] Rendered ${units.length} units as placeholder cubes`);
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
    if (doodads.length === 0) {
      console.log('No doodads to render');
      return;
    }

    // Set maxDoodads to actual doodad count + 10% buffer for safety
    const maxDoodads = Math.ceil(doodads.length * 1.1);

    // Calculate map dimensions for coordinate conversion
    const mapWidth = (this.currentMap?.info.dimensions.width ?? 0) * 128;
    const mapHeight = (this.currentMap?.info.dimensions.height ?? 0) * 128;

    console.log(
      `[MapRendererCore] 🔍 COORDINATE DEBUG - Map dimensions: ` +
        `tiles=${this.currentMap?.info.dimensions.width}x${this.currentMap?.info.dimensions.height}, ` +
        `world units=${mapWidth}x${mapHeight}`
    );

    this.doodadRenderer = new DoodadRenderer(this.scene, this.assetLoader, {
      enableInstancing: true,
      enableLOD: true,
      lodDistance: 100,
      maxDoodads,
      mapWidth, // Pass map dimensions for coordinate centering
      mapHeight,
    });

    console.log(`Rendering ${doodads.length} doodads (limit: ${maxDoodads})...`);

    // Collect unique doodad types
    const uniqueTypes = new Set<string>();
    for (const doodad of doodads) {
      uniqueTypes.add(doodad.typeId);
    }

    // Load all doodad types in parallel
    console.log(`Loading ${uniqueTypes.size} unique doodad types...`);
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

    // Remove all existing lights to prevent accumulation
    const existingLights = this.scene.lights.slice(); // Copy array to avoid modification during iteration
    existingLights.forEach((light) => {
      console.log(`[MapRendererCore] Disposing existing light: ${light.name}`);
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

    console.log(
      `[MapRendererCore] Lighting created: ambient=${this.ambientLight.intensity}, sun=${this.sunLight.intensity}`
    );

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

    // W3X world coordinates: 128 units per tile
    const TILE_SIZE = 128;
    const worldWidth = width * TILE_SIZE;
    const worldHeight = height * TILE_SIZE;

    // Calculate terrain center height (for camera target)
    const terrainCenterY = (this.terrainHeightRange.min + this.terrainHeightRange.max) / 2;
    const terrainHeight = this.terrainHeightRange.max - this.terrainHeightRange.min;

    console.log(
      `[MapRendererCore] 📷 Camera Setup - Terrain height: [${this.terrainHeightRange.min.toFixed(1)}, ${this.terrainHeightRange.max.toFixed(1)}], ` +
        `center: ${terrainCenterY.toFixed(1)}, range: ${terrainHeight.toFixed(1)}`
    );

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

      console.log(
        `[MapRendererCore] 📷 RTS Camera: radius=${baseRadius.toFixed(1)}, ` +
          `target=(0, ${terrainCenterY.toFixed(1)}, 0), ` +
          `limits=[${camera.lowerRadiusLimit.toFixed(1)}, ${camera.upperRadiusLimit.toFixed(1)}]`
      );
    } else if (this.config.cameraMode === 'free') {
      // Free camera
      const camera = new BABYLON.UniversalCamera(
        'freeCamera',
        new BABYLON.Vector3(0, terrainCenterY + 100, 0),
        this.scene
      );
      camera.setTarget(new BABYLON.Vector3(0, terrainCenterY, 0));
      camera.attachControl(this.scene.getEngine().getRenderingCanvas(), true);
      this.camera = camera;

      console.log(
        `[MapRendererCore] 📷 Free Camera: position=(0, ${(terrainCenterY + 100).toFixed(1)}, 0), ` +
          `target=(0, ${terrainCenterY.toFixed(1)}, 0)`
      );
    }

    this.scene.activeCamera = this.camera;

    if (this.camera) {
      const cam = this.camera as BABYLON.ArcRotateCamera;
      console.log(
        `Camera initialized: mode=${this.config.cameraMode}, ` +
          `target=${cam.target?.toString() ?? 'N/A'}, ` +
          `radius=${cam.radius ?? 'N/A'}, ` +
          `alpha=${cam.alpha ?? 'N/A'}, ` +
          `beta=${cam.beta ?? 'N/A'}`
      );
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
        console.log(`Weather set: ${weatherType}`);
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

    console.log('MapRendererCore disposed');
  }
}
