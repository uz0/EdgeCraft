precision highp float;

// Standard vertex attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

// Instance attributes (from thin instances)
attribute mat4 matrix;           // Transform matrix per instance
attribute vec4 color;             // Team color per instance
attribute vec4 animData;          // [animIndex, animTime, blend, reserved]

// Uniforms
uniform mat4 viewProjection;
uniform mat4 view;
uniform sampler2D bakedAnimationTexture;
uniform float bakedAnimationTextureSize;

// Varyings (outputs to fragment shader)
varying vec2 vUV;
varying vec3 vNormal;
varying vec4 vColor;
varying vec3 vPositionW;

/**
 * Samples the baked animation texture to get animated vertex position
 * @param basePosition - Original vertex position
 * @param animIndex - Animation index
 * @param animTime - Current animation time
 * @returns Animated position
 */
vec3 getAnimatedPosition(vec3 basePosition, float animIndex, float animTime) {
    // Calculate texture coordinates for animation sampling
    // Use 30 FPS for animation playback
    float frame = animTime * 30.0;

    // U coordinate: animation index + frame progress
    float u = (animIndex + fract(frame)) / bakedAnimationTextureSize;

    // V coordinate: vertex index in texture
    float v = float(gl_VertexID) / bakedAnimationTextureSize;

    // Sample the baked animation texture
    vec4 animatedPos = texture2D(bakedAnimationTexture, vec2(u, v));

    // Return animated position (or base position if no animation)
    return animatedPos.xyz;
}

void main(void) {
    // Get animated position from baked texture
    vec3 animatedPosition = position; // Default to base position

    // Apply animation if baked texture is available
    if (bakedAnimationTextureSize > 0.0) {
        animatedPosition = getAnimatedPosition(
            position,
            animData.x,  // animation index
            animData.y   // animation time
        );
    }

    // Apply instance transform matrix
    vec4 worldPosition = matrix * vec4(animatedPosition, 1.0);

    // Calculate final position in clip space
    gl_Position = viewProjection * worldPosition;

    // Pass data to fragment shader
    vUV = uv;
    vPositionW = worldPosition.xyz;

    // Transform normal to world space
    vNormal = normalize((matrix * vec4(normal, 0.0)).xyz);

    // Pass team color to fragment shader
    vColor = color;
}
