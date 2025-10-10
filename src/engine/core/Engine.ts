/**
 * Edge Craft Engine - Core Babylon.js wrapper
 *
 * Provides a clean abstraction over Babylon.js engine functionality
 * with proper resource management and performance optimization.
 */

import * as BABYLON from '@babylonjs/core';
import type { EngineOptions, EngineState, IEngineCore } from './types';
import { OptimizedRenderPipeline, QualityPreset } from '../rendering';

/**
 * Main Edge Craft engine class
 *
 * Manages Babylon.js engine lifecycle, scene rendering, and resource cleanup.
 *
 * @example
 * ```typescript
 * const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
 * const engine = new EdgeCraftEngine(canvas);
 * engine.startRenderLoop();
 * ```
 */
export class EdgeCraftEngine implements IEngineCore {
  private _engine: BABYLON.Engine;
  private _scene: BABYLON.Scene;
  private _canvas: HTMLCanvasElement;
  private _state: EngineState;
  private _isRunning: boolean = false;
  private _renderPipeline?: OptimizedRenderPipeline;

  constructor(canvas: HTMLCanvasElement, options?: EngineOptions) {
    this._canvas = canvas;

    // Initialize Babylon.js engine with optimizations
    this._engine = new BABYLON.Engine(canvas, options?.antialias ?? true, {
      preserveDrawingBuffer: options?.preserveDrawingBuffer ?? true,
      stencil: options?.stencil ?? true,
      adaptToDeviceRatio: options?.adaptToDeviceRatio ?? true,
    });

    // Create scene
    this._scene = new BABYLON.Scene(this._engine);

    // Initialize state
    this._state = {
      isRunning: false,
      fps: 0,
      deltaTime: 0,
    };

    this.setupScene();
    this.setupEventHandlers();
  }

  /**
   * Setup initial scene configuration
   */
  private setupScene(): void {
    // Performance optimizations for RTS games
    this._scene.autoClear = false;
    this._scene.autoClearDepthAndStencil = false;

    // Basic lighting
    const light = new BABYLON.HemisphericLight(
      'mainLight',
      new BABYLON.Vector3(0, 1, 0),
      this._scene
    );
    light.intensity = 0.7;

    // Ambient light for better visibility
    this._scene.ambientColor = new BABYLON.Color3(0.3, 0.3, 0.3);
  }

  /**
   * Initialize optimized rendering pipeline
   */
  public async initializeRenderPipeline(): Promise<void> {
    if (this._renderPipeline) {
      console.warn('Render pipeline already initialized');
      return;
    }

    this._renderPipeline = new OptimizedRenderPipeline(this._scene);
    await this._renderPipeline.initialize({
      enableMaterialSharing: true,
      enableMeshMerging: true,
      enableCulling: true,
      enableDynamicLOD: true,
      targetFPS: 60,
      initialQuality: QualityPreset.HIGH,
    });

    console.log('Optimized render pipeline initialized');
  }

  /**
   * Get render pipeline instance
   */
  public get renderPipeline(): OptimizedRenderPipeline | undefined {
    return this._renderPipeline;
  }

  /**
   * Setup event handlers for window resize and context loss
   */
  private setupEventHandlers(): void {
    window.addEventListener('resize', () => {
      this.resize();
    });

    // Handle WebGL context loss
    this._canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      console.warn('WebGL context lost');
      this.stopRenderLoop();
    });

    this._canvas.addEventListener('webglcontextrestored', () => {
      console.log('WebGL context restored');
      if (this._state.isRunning) {
        this.startRenderLoop();
      }
    });
  }

  /**
   * Start the rendering loop
   */
  public startRenderLoop(): void {
    if (this._isRunning) {
      console.warn('Render loop already running');
      return;
    }

    this._isRunning = true;
    this._state.isRunning = true;

    this._engine.runRenderLoop(() => {
      // Update state
      this._state.fps = this._engine.getFps();
      this._state.deltaTime = this._engine.getDeltaTime();

      // Render scene
      this._scene.render();
    });
  }

  /**
   * Stop the rendering loop
   */
  public stopRenderLoop(): void {
    this._isRunning = false;
    this._state.isRunning = false;
    this._engine.stopRenderLoop();
  }

  /**
   * Handle canvas resize
   */
  public resize(): void {
    this._engine.resize();
  }

  /**
   * Get current engine state
   */
  public getState(): Readonly<EngineState> {
    return { ...this._state };
  }

  /**
   * Get the Babylon.js engine instance
   */
  public get engine(): BABYLON.Engine {
    return this._engine;
  }

  /**
   * Get the Babylon.js scene instance
   */
  public get scene(): BABYLON.Scene {
    return this._scene;
  }

  /**
   * Get the canvas element
   */
  public get canvas(): HTMLCanvasElement {
    return this._canvas;
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.stopRenderLoop();

    // Dispose render pipeline
    if (this._renderPipeline) {
      this._renderPipeline.dispose();
    }

    // Dispose scene and all its resources
    this._scene.dispose();

    // Dispose engine
    this._engine.dispose();

    console.log('Edge Craft engine disposed');
  }
}
