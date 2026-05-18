uniform float uTime;
uniform float uWaveAmplitude;
uniform float uWaveFrequency;
uniform float uWaveSpeed;
uniform vec2 uRipplePositions[8];
uniform float uRippleTimes[8];
uniform int uRippleCount;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vWaveHeight;

float gerstnerWave(vec2 pos, float freq, float amp, float speed, float phaseOffset) {
    return sin(pos.x * freq + uTime * speed + phaseOffset) 
         * cos(pos.y * freq * 0.7 + uTime * speed * 0.8 + phaseOffset * 1.3) 
         * amp;
}

float ripple(vec2 pos, vec2 center, float time) {
    float dist = distance(pos, center);
    float wave = sin(dist * 15.0 - time * 8.0) * exp(-dist * 0.3) * exp(-time * 0.4);
    return wave * 0.4;
}

void main() {
    vUv = uv;
    vec3 pos = position;
    
    float wave = 0.0;
    
    wave += gerstnerWave(pos.xz, uWaveFrequency, uWaveAmplitude, uWaveSpeed, 0.0);
    wave += gerstnerWave(pos.xz, uWaveFrequency * 1.5, uWaveAmplitude * 0.5, uWaveSpeed * 1.2, 1.0);
    wave += gerstnerWave(pos.xz, uWaveFrequency * 0.7, uWaveAmplitude * 0.8, uWaveSpeed * 0.9, 2.5);
    
    for (int i = 0; i < 8; i++) {
        if (i >= uRippleCount) break;
        wave += ripple(pos.xz, uRipplePositions[i], uRippleTimes[i]);
    }
    
    pos.y += wave;
    vWaveHeight = wave;
    vPosition = pos;
    
    float delta = 0.1;
    float h1 = gerstnerWave(pos.xz + vec2(delta, 0.0), uWaveFrequency, uWaveAmplitude, uWaveSpeed, 0.0);
    float h2 = gerstnerWave(pos.xz + vec2(-delta, 0.0), uWaveFrequency, uWaveAmplitude, uWaveSpeed, 0.0);
    float h3 = gerstnerWave(pos.xz + vec2(0.0, delta), uWaveFrequency, uWaveAmplitude, uWaveSpeed, 0.0);
    float h4 = gerstnerWave(pos.xz + vec2(0.0, -delta), uWaveFrequency, uWaveAmplitude, uWaveSpeed, 0.0);
    
    vec3 tangent = normalize(vec3(delta * 2.0, h1 - h2, 0.0));
    vec3 bitangent = normalize(vec3(0.0, h3 - h4, delta * 2.0));
    vec3 normal = normalize(cross(bitangent, tangent));
    
    for (int i = 0; i < 8; i++) {
        if (i >= uRippleCount) break;
        vec2 rippleCenter = uRipplePositions[i];
        float rippleTime = uRippleTimes[i];
        float d = distance(pos.xz, rippleCenter);
        if (d < 5.0) {
            float rippleFactor = exp(-d * 0.5) * exp(-rippleTime * 0.3);
            normal = normalize(normal + vec3(
                cos(d * 15.0 - rippleTime * 8.0) * (pos.x - rippleCenter.x) / max(d, 0.1) * rippleFactor * 0.1,
                1.0,
                cos(d * 15.0 - rippleTime * 8.0) * (pos.z - rippleCenter.y) / max(d, 0.1) * rippleFactor * 0.1
            ));
        }
    }
    
    vNormal = normal;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
