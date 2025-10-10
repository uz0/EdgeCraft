precision highp float;

// Varying
varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vWorldPosition;

// Uniforms
uniform vec3 cameraPosition;
uniform vec3 lightDirection;
uniform vec4 textureScales;

// Textures
uniform sampler2D diffuse1;
uniform sampler2D diffuse2;
uniform sampler2D diffuse3;
uniform sampler2D diffuse4;
uniform sampler2D splatmap;

void main(void) {
  // Sample splatmap for blend weights
  vec4 splat = texture2D(splatmap, vUV);

  // Sample diffuse textures with individual tiling
  vec3 color1 = texture2D(diffuse1, vUV * textureScales.x).rgb;
  vec3 color2 = texture2D(diffuse2, vUV * textureScales.y).rgb;
  vec3 color3 = texture2D(diffuse3, vUV * textureScales.z).rgb;
  vec3 color4 = texture2D(diffuse4, vUV * textureScales.w).rgb;

  // Blend textures using splatmap
  vec3 finalColor = color1 * splat.r +
                    color2 * splat.g +
                    color3 * splat.b +
                    color4 * splat.a;

  // Simple directional lighting
  float diffuseLight = max(dot(vNormal, -lightDirection), 0.0);
  finalColor *= 0.4 + diffuseLight * 0.6; // Ambient + diffuse

  gl_FragColor = vec4(finalColor, 1.0);
}
