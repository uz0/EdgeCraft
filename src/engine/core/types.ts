/**
 * Core type definitions for the Edge Craft engine
 */

import type * as BABYLON from '@babylonjs/core';

/**
 * Engine configuration options
 */
export interface EngineOptions {
  /** Enable antialiasing */
  antialias?: boolean;
  /** Preserve drawing buffer for screenshots */
  preserveDrawingBuffer?: boolean;
  /** Enable stencil buffer */
  stencil?: boolean;
  /** Enable adaptive device pixel ratio */
  adaptToDeviceRatio?: boolean;
}

/**
 * Scene configuration options
 */
export interface SceneOptions {
  /** Enable automatic scene clearing */
  autoClear?: boolean;
  /** Enable automatic depth/stencil clearing */
  autoClearDepthAndStencil?: boolean;
  /** Enable frustum culling */
  frustumCulling?: boolean;
}

/**
 * Engine state
 */
export interface EngineState {
  /** Is the engine running */
  isRunning: boolean;
  /** Current FPS */
  fps: number;
  /** Delta time in milliseconds */
  deltaTime: number;
}

/**
 * Scene lifecycle callbacks
 */
export interface SceneCallbacks {
  /** Called before scene render */
  onBeforeRender?: () => void;
  /** Called after scene render */
  onAfterRender?: () => void;
  /** Called on scene ready */
  onReady?: () => void;
}

/**
 * Engine events
 */
export enum EngineEvent {
  RESIZE = 'resize',
  DISPOSE = 'dispose',
  CONTEXT_LOST = 'contextLost',
  CONTEXT_RESTORED = 'contextRestored',
}

/**
 * Base engine interface
 */
export interface IEngineCore {
  readonly engine: BABYLON.Engine;
  readonly scene: BABYLON.Scene;
  readonly canvas: HTMLCanvasElement;

  startRenderLoop(): void;
  stopRenderLoop(): void;
  resize(): void;
  dispose(): void;
}
