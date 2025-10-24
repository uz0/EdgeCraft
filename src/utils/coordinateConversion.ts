/**
 * Coordinate System Conversion Utilities
 *
 * mdx-m3-viewer uses Z-up (WebGL/Warcraft 3 standard):
 *   X = horizontal (east-west)
 *   Y = depth (north-south)
 *   Z = vertical (up-down)
 *   Up vector: [0, 0, 1]
 *
 * Babylon.js uses Y-up (3D graphics standard):
 *   X = horizontal (east-west)
 *   Y = vertical (up-down)
 *   Z = depth (north-south)
 *   Up vector: [0, 1, 0]
 *
 * Conversion: [mdx_x, mdx_y, mdx_z] -> [babylon_x, babylon_y, babylon_z]
 *             [x, y, z] -> [x, z, y]
 *
 * This is equivalent to a 90° rotation around the X-axis:
 * - X stays the same
 * - Y becomes Z
 * - Z becomes Y (with sign flip for proper handedness)
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export function mdxToBabylon(mdxPosition: [number, number, number]): Vector3 {
  const [x, y, z] = mdxPosition;
  return {
    x: x,
    y: z,
    z: y,
  };
}

export function babylonToMdx(babylonPosition: Vector3): [number, number, number] {
  return [babylonPosition.x, babylonPosition.z, babylonPosition.y];
}

export const MDX_UP_VECTOR = [0, 0, 1] as const;
export const BABYLON_UP_VECTOR = [0, 1, 0] as const;
