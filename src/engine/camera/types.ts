/**
 * Camera type definitions
 */

/**
 * RTS camera configuration options
 */
export interface RTSCameraOptions {
  /** Initial camera position */
  position?: { x: number; y: number; z: number };
  /** Target position to look at */
  target?: { x: number; y: number; z: number };
  /** Camera movement speed */
  speed?: number;
  /** Camera rotation speed */
  rotationSpeed?: number;
  /** Minimum zoom distance */
  minZoom?: number;
  /** Maximum zoom distance */
  maxZoom?: number;
  /** Edge scroll threshold in pixels */
  edgeScrollThreshold?: number;
  /** Enable edge scrolling */
  enableEdgeScroll?: boolean;
  /** Enable keyboard controls */
  enableKeyboard?: boolean;
  /** Enable mouse controls */
  enableMouse?: boolean;
}

/**
 * Camera control keys configuration
 */
export interface CameraKeys {
  forward: string[];
  backward: string[];
  left: string[];
  right: string[];
  up: string[];
  down: string[];
  rotateLeft: string[];
  rotateRight: string[];
}

/**
 * Camera bounds for restricting movement
 */
export interface CameraBounds {
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
  minZ?: number;
  maxZ?: number;
}

/**
 * Camera state
 */
export interface CameraState {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  zoom: number;
  rotation: number;
}
