/**
 * RTS Camera - Real-Time Strategy game camera implementation
 */

import * as BABYLON from '@babylonjs/core';
import { CameraControls } from './CameraControls';
import type { RTSCameraOptions, CameraState, CameraBounds } from './types';

/**
 * RTS-style camera with keyboard, mouse, and edge scrolling controls
 *
 * @example
 * ```typescript
 * const camera = new RTSCamera(scene, canvas, {
 *   position: { x: 50, y: 50, z: -50 },
 *   speed: 1.0
 * });
 * ```
 */
export class RTSCamera {
  private camera: BABYLON.UniversalCamera;
  private controls: CameraControls;

  constructor(scene: BABYLON.Scene, canvas: HTMLCanvasElement, options: RTSCameraOptions = {}) {
    // Create camera with initial position
    const initialPos = options.position ?? { x: 50, y: 50, z: -50 };
    this.camera = new BABYLON.UniversalCamera(
      'RTSCamera',
      new BABYLON.Vector3(initialPos.x, initialPos.y, initialPos.z),
      scene
    );

    // Set target
    const target = options.target ?? { x: 0, y: 0, z: 0 };
    this.camera.setTarget(new BABYLON.Vector3(target.x, target.y, target.z));

    // RTS-style angle (looking down at 30-45 degrees)
    this.camera.rotation.x = Math.PI / 6; // 30 degrees

    // Disable default controls - we'll use our custom controls
    this.camera.inputs.clear();

    // Create custom controls
    this.controls = new CameraControls(this.camera, canvas, options);

    // Set this as the active camera
    scene.activeCamera = this.camera;
  }

  /**
   * Get the Babylon.js camera instance
   */
  public getCamera(): BABYLON.UniversalCamera {
    return this.camera;
  }

  /**
   * Get current camera state
   */
  public getState(): CameraState {
    return {
      position: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z,
      },
      target: {
        x: this.camera.target.x,
        y: this.camera.target.y,
        z: this.camera.target.z,
      },
      zoom: this.camera.position.length(),
      rotation: this.camera.rotation.y,
    };
  }

  /**
   * Set camera position
   */
  public setPosition(x: number, y: number, z: number): void {
    this.camera.position.set(x, y, z);
  }

  /**
   * Set camera target
   */
  public setTarget(x: number, y: number, z: number): void {
    this.camera.setTarget(new BABYLON.Vector3(x, y, z));
  }

  /**
   * Set camera bounds
   */
  public setBounds(bounds: CameraBounds): void {
    this.controls.setBounds(bounds);
  }

  /**
   * Clear camera bounds
   */
  public clearBounds(): void {
    this.controls.clearBounds();
  }

  /**
   * Focus camera on a specific point
   */
  public focusOn(x: number, _y: number, z: number, animated: boolean = false): void {
    if (animated) {
      // Smooth camera transition
      BABYLON.Animation.CreateAndStartAnimation(
        'cameraFocus',
        this.camera,
        'position',
        60,
        60,
        this.camera.position,
        new BABYLON.Vector3(x, this.camera.position.y, z),
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
      );
    } else {
      this.setPosition(x, this.camera.position.y, z);
    }
  }

  /**
   * Dispose camera and controls
   */
  public dispose(): void {
    this.controls.dispose();
    this.camera.dispose();
  }
}
