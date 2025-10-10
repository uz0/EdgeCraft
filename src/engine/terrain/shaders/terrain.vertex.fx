precision highp float;

// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

// Uniforms
uniform mat4 worldViewProjection;
uniform mat4 world;
uniform mat4 view;

// Varying
varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main(void) {
  gl_Position = worldViewProjection * vec4(position, 1.0);

  vUV = uv;
  vNormal = normalize((world * vec4(normal, 0.0)).xyz);
  vWorldPosition = (world * vec4(position, 1.0)).xyz;
}
