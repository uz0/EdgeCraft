precision highp float;

// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

// Per-instance attributes
attribute vec4 instanceCornerTextures;
attribute vec4 instanceCornerVariations;
attribute vec4 instanceCornerExtended;

// Uniforms
uniform mat4 worldViewProjection;
uniform mat4 world;

// Varyings
varying vec2 vUV[4];
varying vec3 vNormal;
varying vec3 vPosition;
varying vec4 vCornerTextures;

vec2 getCell(float variation) {
  if (variation < 16.0) {
    return vec2(mod(variation, 4.0), floor(variation / 4.0));
  } else {
    variation -= 16.0;
    return vec2(4.0 + mod(variation, 4.0), floor(variation / 4.0));
  }
}

vec2 getUV(vec2 position, float variation, bool extended) {
  vec2 cell = getCell(variation);
  vec2 cellSize = vec2(extended ? 0.125 : 0.25, 0.25);
  vec2 uv_flipped = vec2(position.x, 1.0 - position.y);
  vec2 pixelSize = vec2(1.0 / 512.0, 1.0 / 256.0);

  return clamp((cell + uv_flipped) * cellSize, cell * cellSize + pixelSize, (cell + 1.0) * cellSize - pixelSize);
}

void main() {
  // Transform position
  vec4 worldPos = world * vec4(position, 1.0);
  gl_Position = worldViewProjection * vec4(position, 1.0);

  // CRITICAL FIX: Use the LOCAL position within the tile (0-1 range) not the global UV
  // The 'uv' attribute should represent position within a single tile, not across entire terrain
  // In the instanced mesh, each instance is a single tile, so uv should be 0-1 within that tile
  vec2 localTileUV = uv; // This should already be 0-1 within the tile for instanced geometry

  // Compute UV coordinates for each texture layer based on variation and extended flag
  vUV[0] = getUV(localTileUV, instanceCornerVariations.x, instanceCornerExtended.x > 0.5);
  vUV[1] = getUV(localTileUV, instanceCornerVariations.y, instanceCornerExtended.y > 0.5);
  vUV[2] = getUV(localTileUV, instanceCornerVariations.z, instanceCornerExtended.z > 0.5);
  vUV[3] = getUV(localTileUV, instanceCornerVariations.w, instanceCornerExtended.w > 0.5);

  // Transform normal
  vNormal = normalize((world * vec4(normal, 0.0)).xyz);

  // Pass world position for lighting
  vPosition = worldPos.xyz;

  // Pass per-instance texture data to fragment shader
  vCornerTextures = instanceCornerTextures;
}
