precision highp float;

// Varyings from vertex shader
varying vec2 vUV[4];
varying vec3 vNormal;
varying vec3 vPosition;
varying vec4 vCornerTextures;

// Individual texture samplers (up to 15 like mdx-m3-viewer)
uniform sampler2D u_tilesets_0;
uniform sampler2D u_tilesets_1;
uniform sampler2D u_tilesets_2;
uniform sampler2D u_tilesets_3;
uniform sampler2D u_tilesets_4;
uniform sampler2D u_tilesets_5;
uniform sampler2D u_tilesets_6;
uniform sampler2D u_tilesets_7;
uniform sampler2D u_tilesets_8;
uniform sampler2D u_tilesets_9;
uniform sampler2D u_tilesets_10;
uniform sampler2D u_tilesets_11;
uniform sampler2D u_tilesets_12;
uniform sampler2D u_tilesets_13;
uniform sampler2D u_tilesets_14;

uniform vec3 lightDirection;
uniform vec3 lightColor;
uniform float ambientIntensity;

vec4 sampleTileset(float tileset, vec2 uv) {
  // Texture indices are 1-based, so subtract 1 to get the array index
  int i = int(tileset - 1.0);

  if (i == 0) return texture2D(u_tilesets_0, uv);
  else if (i == 1) return texture2D(u_tilesets_1, uv);
  else if (i == 2) return texture2D(u_tilesets_2, uv);
  else if (i == 3) return texture2D(u_tilesets_3, uv);
  else if (i == 4) return texture2D(u_tilesets_4, uv);
  else if (i == 5) return texture2D(u_tilesets_5, uv);
  else if (i == 6) return texture2D(u_tilesets_6, uv);
  else if (i == 7) return texture2D(u_tilesets_7, uv);
  else if (i == 8) return texture2D(u_tilesets_8, uv);
  else if (i == 9) return texture2D(u_tilesets_9, uv);
  else if (i == 10) return texture2D(u_tilesets_10, uv);
  else if (i == 11) return texture2D(u_tilesets_11, uv);
  else if (i == 12) return texture2D(u_tilesets_12, uv);
  else if (i == 13) return texture2D(u_tilesets_13, uv);
  else if (i == 14) return texture2D(u_tilesets_14, uv);

  return vec4(1.0, 0.0, 1.0, 1.0);
}

vec4 blend(vec4 color, float tileset, vec2 uv) {
  vec4 texel = sampleTileset(tileset, uv);
  return mix(color, texel, texel.a);
}

void main() {
  vec4 color = vec4(0.0, 0.0, 0.0, 1.0);

  // Only sample if texture index is valid (> 0)
  if (vCornerTextures.x > 0.5) {
    color = sampleTileset(vCornerTextures.x, vUV[0]);
  }

  if (vCornerTextures.y > 0.5) {
    color = blend(color, vCornerTextures.y, vUV[1]);
  }

  if (vCornerTextures.z > 0.5) {
    color = blend(color, vCornerTextures.z, vUV[2]);
  }

  if (vCornerTextures.w > 0.5) {
    color = blend(color, vCornerTextures.w, vUV[3]);
  }

  // Optional lighting (currently disabled to match mdx-m3-viewer)
  // color.rgb *= clamp(dot(vNormal, -lightDirection) + 0.45, 0.0, 1.0);

  gl_FragColor = vec4(color.rgb, 1.0);
}
