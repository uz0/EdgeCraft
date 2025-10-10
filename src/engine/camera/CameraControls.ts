/**
 * Camera Controls - Handles input for RTS camera
 */

import * as BABYLON from '@babylonjs/core';
import type { CameraKeys, CameraBounds, RTSCameraOptions } from './types';

/**
 * Camera controls handler for RTS-style input
 *
 * Handles keyboard, mouse, and edge scrolling for camera movement
 */
export class CameraControls {
  private camera: BABYLON.Camera;
  private canvas: HTMLCanvasElement;
  private scene: BABYLON.Scene;

  // Input state
  private pressedKeys: Set<string> = new Set();
  private mousePosition: { x: number; y: number } = { x: 0, y: 0 };

  // Configuration
  private speed: number;
  private edgeScrollThreshold: number;
  private enableEdgeScroll: boolean;
  private enableKeyboard: boolean;
  private enableMouse: boolean;

  // Camera bounds
  private bounds?: CameraBounds;

  // Key mappings
  private keys: CameraKeys = {
    forward: ['w', 'W', 'ArrowUp'],
    backward: ['s', 'S', 'ArrowDown'],
    left: ['a', 'A', 'ArrowLeft'],
    right: ['d', 'D', 'ArrowRight'],
    up: ['q', 'Q'],
    down: ['e', 'E'],
    rotateLeft: ['z', 'Z'],
    rotateRight: ['c', 'C'],
  };

  constructor(camera: BABYLON.Camera, canvas: HTMLCanvasElement, options: RTSCameraOptions = {}) {
    this.camera = camera;
    this.canvas = canvas;
    this.scene = camera.getScene();

    // Set configuration
    this.speed = options.speed ?? 0.5;
    this.edgeScrollThreshold = options.edgeScrollThreshold ?? 50;
    this.enableEdgeScroll = options.enableEdgeScroll ?? true;
    this.enableKeyboard = options.enableKeyboard ?? true;
    this.enableMouse = options.enableMouse ?? true;

    this.setupEventListeners();
  }

  /**
   * Setup event listeners for input
   */
  private setupEventListeners(): void {
    if (this.enableKeyboard) {
      window.addEventListener('keydown', this.onKeyDown);
      window.addEventListener('keyup', this.onKeyUp);
    }

    if (this.enableMouse || this.enableEdgeScroll) {
      this.canvas.addEventListener('mousemove', this.onMouseMove);
      this.canvas.addEventListener('wheel', this.onWheel);
    }

    // Add update loop
    this.scene.onBeforeRenderObservable.add(this.update);
  }

  /**
   * Remove event listeners
   */
  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.scene.onBeforeRenderObservable.removeCallback(this.update);
  }

  /**
   * Keyboard down handler
   */
  private onKeyDown = (event: KeyboardEvent): void => {
    this.pressedKeys.add(event.key);
  };

  /**
   * Keyboard up handler
   */
  private onKeyUp = (event: KeyboardEvent): void => {
    this.pressedKeys.delete(event.key);
  };

  /**
   * Mouse move handler
   */
  private onMouseMove = (event: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.mousePosition.x = event.clientX - rect.left;
    this.mousePosition.y = event.clientY - rect.top;
  };

  /**
   * Mouse wheel handler for zooming
   */
  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();

    const zoomSpeed = 2;
    const delta = event.deltaY > 0 ? zoomSpeed : -zoomSpeed;

    // Move camera forward/backward
    const forward = this.camera.getDirection(BABYLON.Axis.Z);
    this.camera.position.addInPlace(forward.scale(delta));
  };

  /**
   * Update camera based on input
   */
  private update = (): void => {
    this.handleKeyboardMovement();
    if (this.enableEdgeScroll) {
      this.handleEdgeScrolling();
    }
  };

  /**
   * Handle keyboard movement
   */
  private handleKeyboardMovement(): void {
    if (!this.enableKeyboard) return;

    const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;
    const moveSpeed = this.speed * deltaTime * 60; // Normalize to 60 FPS

    // Forward/Backward
    if (this.isAnyKeyPressed(this.keys.forward)) {
      const forward = this.camera.getDirection(BABYLON.Axis.Z);
      forward.y = 0; // Keep horizontal
      this.camera.position.addInPlace(forward.normalize().scale(moveSpeed));
    }
    if (this.isAnyKeyPressed(this.keys.backward)) {
      const forward = this.camera.getDirection(BABYLON.Axis.Z);
      forward.y = 0; // Keep horizontal
      this.camera.position.subtractInPlace(forward.normalize().scale(moveSpeed));
    }

    // Left/Right
    if (this.isAnyKeyPressed(this.keys.left)) {
      const right = this.camera.getDirection(BABYLON.Axis.X);
      right.y = 0; // Keep horizontal
      this.camera.position.subtractInPlace(right.normalize().scale(moveSpeed));
    }
    if (this.isAnyKeyPressed(this.keys.right)) {
      const right = this.camera.getDirection(BABYLON.Axis.X);
      right.y = 0; // Keep horizontal
      this.camera.position.addInPlace(right.normalize().scale(moveSpeed));
    }

    // Up/Down (vertical movement)
    if (this.isAnyKeyPressed(this.keys.up)) {
      this.camera.position.y += moveSpeed;
    }
    if (this.isAnyKeyPressed(this.keys.down)) {
      this.camera.position.y -= moveSpeed;
    }

    this.applyBounds();
  }

  /**
   * Handle edge scrolling
   */
  private handleEdgeScrolling(): void {
    const threshold = this.edgeScrollThreshold;
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;
    const scrollSpeed = this.speed * deltaTime * 60;

    // Left edge
    if (this.mousePosition.x < threshold) {
      const right = this.camera.getDirection(BABYLON.Axis.X);
      right.y = 0;
      this.camera.position.subtractInPlace(right.normalize().scale(scrollSpeed));
    }

    // Right edge
    if (this.mousePosition.x > canvasWidth - threshold) {
      const right = this.camera.getDirection(BABYLON.Axis.X);
      right.y = 0;
      this.camera.position.addInPlace(right.normalize().scale(scrollSpeed));
    }

    // Top edge
    if (this.mousePosition.y < threshold) {
      const forward = this.camera.getDirection(BABYLON.Axis.Z);
      forward.y = 0;
      this.camera.position.addInPlace(forward.normalize().scale(scrollSpeed));
    }

    // Bottom edge
    if (this.mousePosition.y > canvasHeight - threshold) {
      const forward = this.camera.getDirection(BABYLON.Axis.Z);
      forward.y = 0;
      this.camera.position.subtractInPlace(forward.normalize().scale(scrollSpeed));
    }

    this.applyBounds();
  }

  /**
   * Check if any key in array is pressed
   */
  private isAnyKeyPressed(keys: string[]): boolean {
    return keys.some((key) => this.pressedKeys.has(key));
  }

  /**
   * Apply camera bounds
   */
  private applyBounds(): void {
    if (!this.bounds) return;

    const pos = this.camera.position;

    if (this.bounds.minX !== undefined) pos.x = Math.max(pos.x, this.bounds.minX);
    if (this.bounds.maxX !== undefined) pos.x = Math.min(pos.x, this.bounds.maxX);
    if (this.bounds.minY !== undefined) pos.y = Math.max(pos.y, this.bounds.minY);
    if (this.bounds.maxY !== undefined) pos.y = Math.min(pos.y, this.bounds.maxY);
    if (this.bounds.minZ !== undefined) pos.z = Math.max(pos.z, this.bounds.minZ);
    if (this.bounds.maxZ !== undefined) pos.z = Math.min(pos.z, this.bounds.maxZ);
  }

  /**
   * Set camera movement bounds
   */
  public setBounds(bounds: CameraBounds): void {
    this.bounds = bounds;
  }

  /**
   * Remove camera bounds
   */
  public clearBounds(): void {
    this.bounds = undefined;
  }
}
