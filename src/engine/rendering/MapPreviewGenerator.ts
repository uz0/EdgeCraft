/**
 * Map Preview Generator - Generates thumbnail images for maps
 *
 * Renders maps in top-down orthographic view at 512x512 resolution for use in
 * map galleries and selection screens.
 *
 * @example
 * ```typescript
 * const generator = new MapPreviewGenerator();
 * const result = await generator.generatePreview(mapData);
 *
 * if (result.success) {
 *   console.log('Thumbnail generated:', result.dataUrl);
 *   // Use in <img src={result.dataUrl} />
 * }
 *
 * generator.disposeEngine();
 * ```
 */

import * as BABYLON from '@babylonjs/core';
import type { RawMapData } from '../../formats/maps/types';
import { TerrainRenderer } from '../terrain/TerrainRenderer';

export interface PreviewConfig {
  /** Output width */
  width?: number;

  /** Output height */
  height?: number;

  /** Camera distance multiplier */
  cameraDistance?: number;

  /** Include units in preview */
  includeUnits?: boolean;

  /** Output format */
  format?: 'png' | 'jpeg';

  /** JPEG quality (0-1) */
  quality?: number;
}

export interface PreviewResult {
  /** Success status */
  success: boolean;

  /** Data URL (base64) */
  dataUrl?: string;

  /** Generation time in ms */
  generationTimeMs: number;

  /** Error message */
  error?: string;
}

/**
 * Map Preview Generator
 *
 * Generates 512x512 thumbnail images for maps using top-down orthographic camera.
 */
export class MapPreviewGenerator {
  private engine: BABYLON.Engine;
  private scene: BABYLON.Scene | null = null;
  private camera: BABYLON.Camera | null = null;

  constructor(canvas?: HTMLCanvasElement) {
    // Create offscreen canvas if not provided
    const targetCanvas = canvas ?? document.createElement('canvas');
    targetCanvas.width = 512;
    targetCanvas.height = 512;

    this.engine = new BABYLON.Engine(targetCanvas, false, {
      preserveDrawingBuffer: true, // Required for screenshots
    });
  }

  /**
   * Generate thumbnail for a map
   */
  public async generatePreview(
    mapData: RawMapData,
    config?: PreviewConfig
  ): Promise<PreviewResult> {
    const startTime = performance.now();

    const finalConfig: Required<PreviewConfig> = {
      width: config?.width ?? 512,
      height: config?.height ?? 512,
      cameraDistance: config?.cameraDistance ?? 1.5,
      includeUnits: config?.includeUnits ?? false,
      format: config?.format ?? 'png',
      quality: config?.quality ?? 0.8,
    };

    try {
      // Step 1: Create temporary scene
      this.scene = new BABYLON.Scene(this.engine);
      this.scene.clearColor = new BABYLON.Color4(0.3, 0.4, 0.5, 1.0);

      // Step 2: Setup orthographic camera (top-down)
      const { width, height } = mapData.info.dimensions;
      const maxDim = Math.max(width, height);

      this.camera = new BABYLON.ArcRotateCamera(
        'previewCamera',
        0,
        0, // Top-down (angle = 0)
        maxDim * finalConfig.cameraDistance,
        new BABYLON.Vector3(width / 2, 0, height / 2),
        this.scene
      );

      this.camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
      this.camera.orthoLeft = -maxDim / 2;
      this.camera.orthoRight = maxDim / 2;
      this.camera.orthoTop = maxDim / 2;
      this.camera.orthoBottom = -maxDim / 2;

      // Step 3: Render terrain using existing API
      const terrainRenderer = new TerrainRenderer(this.scene);
      const heightmapUrl = this.createHeightmapDataUrl(
        mapData.terrain.heightmap,
        mapData.terrain.width,
        mapData.terrain.height
      );

      // For preview generation, don't use textures - they often don't exist
      // Use solid color material instead for faster, more reliable preview generation
      await terrainRenderer.loadHeightmap(heightmapUrl, {
        width: mapData.terrain.width,
        height: mapData.terrain.height,
        subdivisions: Math.min(64, Math.max(16, mapData.terrain.width / 8)), // Lower detail for preview
        maxHeight: 100,
        textures: [], // Empty - use default color material
      });

      // Step 4: Optional - render units
      if (finalConfig.includeUnits && mapData.units.length > 0) {
        // Simple unit markers (colored spheres)
        for (const unit of mapData.units.slice(0, 100)) {
          // Limit to 100 for performance
          const marker = BABYLON.MeshBuilder.CreateSphere(
            `unit_${unit.id}`,
            { diameter: 2 },
            this.scene
          );
          marker.position = new BABYLON.Vector3(unit.position.x, 1, unit.position.z);

          const mat = new BABYLON.StandardMaterial(`mat_${unit.id}`, this.scene);
          mat.diffuseColor = BABYLON.Color3.Red();
          marker.material = mat;
        }
      }

      // Step 5: Render one frame
      this.scene.render();

      // Step 6: Capture screenshot
      if (this.camera === null) {
        throw new Error('Camera not initialized');
      }

      const mimeType = finalConfig.format === 'png' ? 'image/png' : 'image/jpeg';
      const dataUrl = await new Promise<string>((resolve, reject) => {
        try {
          BABYLON.Tools.CreateScreenshotUsingRenderTarget(
            this.engine,
            this.camera!,
            {
              width: finalConfig.width,
              height: finalConfig.height,
              precision: 1,
            },
            (data) => resolve(data),
            mimeType,
            1, // samples
            false, // antialiasing
            undefined, // fileName
            false, // renderSprites
            false, // enableStencilBuffer
            false, // useLayerMask
            finalConfig.quality
          );
        } catch (error) {
          reject(error);
        }
      });

      // Cleanup
      terrainRenderer.dispose();
      this.dispose();

      const generationTimeMs = performance.now() - startTime;

      return {
        success: true,
        dataUrl,
        generationTimeMs,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Preview generation failed:', errorMsg);

      this.dispose();

      return {
        success: false,
        generationTimeMs: performance.now() - startTime,
        error: errorMsg,
      };
    }
  }

  /**
   * Generate previews for multiple maps
   */
  public async generateBatch(
    maps: Array<{ id: string; mapData: RawMapData }>,
    config?: PreviewConfig,
    onProgress?: (current: number, total: number) => void
  ): Promise<Map<string, PreviewResult>> {
    const results = new Map<string, PreviewResult>();

    for (let i = 0; i < maps.length; i++) {
      const map = maps[i];
      if (!map) continue;

      const { id, mapData } = map;

      console.log(`Generating preview ${i + 1}/${maps.length}: ${id}`);
      const result = await this.generatePreview(mapData, config);
      results.set(id, result);

      if (onProgress) {
        onProgress(i + 1, maps.length);
      }
    }

    return results;
  }

  /**
   * Save preview to file (Node.js only)
   */
  public async saveToFile(dataUrl: string, filePath: string): Promise<void> {
    if (typeof window !== 'undefined') {
      throw new Error('saveToFile() only works in Node.js environment');
    }

    const fs = await import('fs/promises');
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    await fs.writeFile(filePath, buffer);
  }

  /**
   * Convert heightmap Float32Array to data URL
   * (Same logic as MapRendererCore)
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

    // Return data URL
    return canvas.toDataURL();
  }

  /**
   * Dispose scene resources
   */
  private dispose(): void {
    if (this.scene) {
      this.scene.dispose();
      this.scene = null;
    }

    if (this.camera) {
      this.camera.dispose();
      this.camera = null;
    }
  }

  /**
   * Dispose engine (call when done with generator)
   */
  public disposeEngine(): void {
    this.engine.dispose();
  }
}
