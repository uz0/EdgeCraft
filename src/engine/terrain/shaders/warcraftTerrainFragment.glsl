precision highp float;

uniform sampler2D tilesets[15];

varying vec4 vTilesets;
varying vec2 vUV[4];
varying vec3 vNormal;

const vec3 lightDirection = normalize(vec3(-0.3, -0.3, 0.25));

vec4 sampleTexture(float tileset, vec2 uv) {
  int i = int(tileset - 0.6);

  if (i == 0) return texture2D(tilesets[0], uv);
  else if (i == 1) return texture2D(tilesets[1], uv);
  else if (i == 2) return texture2D(tilesets[2], uv);
  else if (i == 3) return texture2D(tilesets[3], uv);
  else if (i == 4) return texture2D(tilesets[4], uv);
  else if (i == 5) return texture2D(tilesets[5], uv);
  else if (i == 6) return texture2D(tilesets[6], uv);
  else if (i == 7) return texture2D(tilesets[7], uv);
  else if (i == 8) return texture2D(tilesets[8], uv);
  else if (i == 9) return texture2D(tilesets[9], uv);
  else if (i == 10) return texture2D(tilesets[10], uv);
  else if (i == 11) return texture2D(tilesets[11], uv);
  else if (i == 12) return texture2D(tilesets[12], uv);
  else if (i == 13) return texture2D(tilesets[13], uv);
  else if (i == 14) return texture2D(tilesets[14], uv);

  return vec4(0.0);
}

vec4 blend(vec4 color, float tileset, vec2 uv) {
  vec4 texel = sampleTexture(tileset, uv);
  return mix(color, texel, texel.a);
}

void main() {
  vec4 color = sampleTexture(vTilesets[0], vUV[0]);

  if (vTilesets[1] > 0.5) {
    color = blend(color, vTilesets[1], vUV[1]);
  }

  if (vTilesets[2] > 0.5) {
    color = blend(color, vTilesets[2], vUV[2]);
  }

  if (vTilesets[3] > 0.5) {
    color = blend(color, vTilesets[3], vUV[3]);
  }

  gl_FragColor = vec4(color.rgb, 1.0);
}
