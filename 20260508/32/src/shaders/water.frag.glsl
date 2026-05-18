uniform vec3 uWaterColor;
uniform vec3 uDeepColor;
uniform vec3 uSkyColor;
uniform vec3 uSpecularColor;
uniform vec3 uLightDirection;
uniform float uTime;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vWaveHeight;

void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vPosition);
    vec3 lightDir = normalize(uLightDirection);
    
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);
    
    vec3 reflectDir = reflect(-viewDir, normal);
    float specular = pow(max(dot(reflectDir, lightDir), 0.0), 64.0);
    vec3 specularEffect = uSpecularColor * specular * 1.5;
    
    float depthFactor = smoothstep(-1.0, 1.0, vWaveHeight);
    vec3 waterBase = mix(uDeepColor, uWaterColor, depthFactor * 0.5 + 0.25);
    
    float skyReflection = fresnel * 0.8;
    vec3 skyEffect = uSkyColor * skyReflection;
    
    float diffuse = max(dot(normal, lightDir), 0.0) * 0.3 + 0.7;
    vec3 diffuseEffect = waterBase * diffuse;
    
    vec3 finalColor = diffuseEffect + skyEffect + specularEffect;
    
    float foam = smoothstep(0.3, 0.6, vWaveHeight) * 0.2;
    finalColor = mix(finalColor, vec3(1.0), foam);
    
    gl_FragColor = vec4(finalColor, 0.95);
}
