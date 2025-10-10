precision highp float;

// Varyings (inputs from vertex shader)
varying vec2 vUV;
varying vec3 vNormal;
varying vec4 vColor;
varying vec3 vPositionW;

// Uniforms
uniform sampler2D diffuseTexture;
uniform vec3 lightDirection;
uniform vec3 cameraPosition;
uniform float ambientIntensity;
uniform float diffuseIntensity;
uniform float specularIntensity;
uniform float specularPower;

/**
 * Calculates diffuse lighting contribution
 */
float calculateDiffuse(vec3 normal, vec3 lightDir) {
    return max(dot(normal, -lightDir), 0.0);
}

/**
 * Calculates specular lighting contribution (Blinn-Phong)
 */
float calculateSpecular(vec3 normal, vec3 lightDir, vec3 viewDir, float power) {
    vec3 halfVector = normalize(-lightDir + viewDir);
    return pow(max(dot(normal, halfVector), 0.0), power);
}

void main(void) {
    // Sample base texture
    vec4 baseColor = texture2D(diffuseTexture, vUV);

    // Apply team color tint
    // Mix base color with team color (50% blend controlled by alpha)
    vec3 tintedColor = mix(baseColor.rgb, vColor.rgb, vColor.a * 0.5);

    // Normalize interpolated normal
    vec3 normal = normalize(vNormal);

    // Calculate view direction
    vec3 viewDirection = normalize(cameraPosition - vPositionW);

    // Ambient lighting (base illumination)
    vec3 ambient = tintedColor * (ambientIntensity > 0.0 ? ambientIntensity : 0.3);

    // Diffuse lighting (directional light)
    float diffuseFactor = calculateDiffuse(normal, lightDirection);
    vec3 diffuse = tintedColor * diffuseFactor * (diffuseIntensity > 0.0 ? diffuseIntensity : 0.7);

    // Specular lighting (highlights)
    float specularFactor = calculateSpecular(
        normal,
        lightDirection,
        viewDirection,
        specularPower > 0.0 ? specularPower : 32.0
    );
    vec3 specular = vec3(1.0) * specularFactor * (specularIntensity > 0.0 ? specularIntensity : 0.3);

    // Combine lighting components
    vec3 finalColor = ambient + diffuse + specular;

    // Output final color
    gl_FragColor = vec4(finalColor, baseColor.a);
}
