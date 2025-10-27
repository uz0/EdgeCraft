precision highp float;

attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
attribute vec4 matricesIndices;
attribute vec4 matricesWeights;
attribute vec4 world0;
attribute vec4 world1;
attribute vec4 world2;
attribute vec4 world3;
attribute float instanceTexture;

uniform mat4 worldViewProjection;
uniform mat4 view;
uniform mat4 projection;
uniform sampler2D heightMap;
uniform vec2 pixel;
uniform vec2 centerOffset;

varying vec3 v_normal;
varying vec2 v_uv;
varying float v_texture;
varying vec3 v_position;

void main() {
  mat4 instanceWorld = mat4(world0, world1, world2, world3);
  vec3 instancePosition = instanceWorld[3].xyz;

  vec2 halfPixel = pixel * 0.5;
  vec2 corner = floor((vec2(instancePosition.x, instancePosition.z) - vec2(1.0, 0.0) - centerOffset.xy) / 128.0);

  float bottomLeft = texture2D(heightMap, corner * pixel + halfPixel).a;
  float bottomRight = texture2D(heightMap, (corner + vec2(1.0, 0.0)) * pixel + halfPixel).a;
  float topLeft = texture2D(heightMap, (corner + vec2(0.0, 1.0)) * pixel + halfPixel).a;
  float topRight = texture2D(heightMap, (corner + vec2(1.0, 1.0)) * pixel + halfPixel).a;

  float bottom = mix(bottomRight, bottomLeft, -position.x / 128.0);
  float top = mix(topRight, topLeft, -position.y / 128.0);
  float height = mix(bottom, top, position.z / 128.0);

  vec3 worldPosition = position + vec3(instancePosition.x, instancePosition.y + height * 128.0, instancePosition.z);

  v_normal = normal;
  v_uv = uv;
  v_texture = instanceTexture;
  v_position = worldPosition;

  gl_Position = projection * view * vec4(worldPosition, 1.0);
}