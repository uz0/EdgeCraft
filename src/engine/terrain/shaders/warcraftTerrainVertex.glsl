precision highp float;

uniform mat4 worldViewProjection;
uniform sampler2D heightMap;
uniform vec2 mapSize;
uniform vec2 centerOffset;
uniform bool extended[14];
uniform float baseTileset;

attribute vec2 position;
attribute float instanceID;
attribute vec4 textures;
attribute vec4 variations;

varying vec4 vTilesets;
varying vec2 vUV[4];
varying vec3 vNormal;

vec2 getCell(float variation) {
  if (variation < 16.0) {
    return vec2(mod(variation, 4.0), floor(variation / 4.0));
  } else {
    variation -= 16.0;
    return vec2(4.0 + mod(variation, 4.0), floor(variation / 4.0));
  }
}

vec2 getUV(vec2 pos, bool isExtended, float variation) {
  vec2 cell = getCell(variation);
  vec2 cellSize = vec2(isExtended ? 0.125 : 0.25, 0.25);
  vec2 uv = vec2(pos.x, 1.0 - pos.y);
  vec2 pixelSize = vec2(1.0 / 512.0, 1.0 / 256.0);

  return clamp(
    (cell + uv) * cellSize,
    cell * cellSize + pixelSize,
    (cell + 1.0) * cellSize - pixelSize
  );
}

void main() {
  vec4 adjustedTextures = textures - baseTileset;

  if (adjustedTextures[0] > 0.0 || adjustedTextures[1] > 0.0 ||
      adjustedTextures[2] > 0.0 || adjustedTextures[3] > 0.0) {
    vTilesets = adjustedTextures;

    vUV[0] = getUV(position, extended[int(adjustedTextures[0]) - 1], variations[0]);
    vUV[1] = getUV(position, extended[int(adjustedTextures[1]) - 1], variations[1]);
    vUV[2] = getUV(position, extended[int(adjustedTextures[2]) - 1], variations[2]);
    vUV[3] = getUV(position, extended[int(adjustedTextures[3]) - 1], variations[3]);

    vec2 corner = vec2(mod(instanceID, mapSize.x), floor(instanceID / mapSize.x));
    vec2 base = corner + position;
    float height = texture2D(heightMap, base / mapSize).a;

    float hL = texture2D(heightMap, (base - vec2(1.0, 0.0)) / mapSize).a;
    float hR = texture2D(heightMap, (base + vec2(1.0, 0.0)) / mapSize).a;
    float hD = texture2D(heightMap, (base - vec2(0.0, 1.0)) / mapSize).a;
    float hU = texture2D(heightMap, (base + vec2(0.0, 1.0)) / mapSize).a;

    vNormal = normalize(vec3(hL - hR, hD - hU, 2.0));

    gl_Position = worldViewProjection * vec4(
      base.x * 128.0 + centerOffset.x,
      base.y * 128.0 + centerOffset.y,
      height * 128.0,
      1.0
    );
  } else {
    vTilesets = vec4(0.0);
    vUV[0] = vec2(0.0);
    vUV[1] = vec2(0.0);
    vUV[2] = vec2(0.0);
    vUV[3] = vec2(0.0);
    vNormal = vec3(0.0);
    gl_Position = vec4(0.0);
  }
}
