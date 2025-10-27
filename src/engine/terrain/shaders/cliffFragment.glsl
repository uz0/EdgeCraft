precision highp float;

uniform sampler2D u_texture1;
uniform sampler2D u_texture2;

varying vec3 v_normal;
varying vec2 v_uv;
varying float v_texture;
varying vec3 v_position;

vec4 sampleCliffTexture(float textureIndex, vec2 uv) {
  int i = int(textureIndex + 0.1);

  if (i == 0) {
    return texture2D(u_texture1, uv);
  } else {
    return texture2D(u_texture2, uv);
  }
}

void main() {
  vec4 color = sampleCliffTexture(v_texture, v_uv);
  gl_FragColor = color;
}