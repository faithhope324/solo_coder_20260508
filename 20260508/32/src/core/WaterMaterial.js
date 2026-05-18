import * as THREE from 'three';

import vertexShader from '../shaders/water.vert.glsl?raw';
import fragmentShader from '../shaders/water.frag.glsl?raw';

export class WaterMaterial {
  constructor() {
    this.uniforms = {
      uTime: { value: 0 },
      uWaveAmplitude: { value: 0.3 },
      uWaveFrequency: { value: 0.5 },
      uWaveSpeed: { value: 1.0 },
      uWaterColor: { value: new THREE.Color('#1e3a5f') },
      uDeepColor: { value: new THREE.Color('#0a1628') },
      uSkyColor: { value: new THREE.Color('#87ceeb') },
      uSpecularColor: { value: new THREE.Color('#ffffff') },
      uLightDirection: { value: new THREE.Vector3(0.5, 1.0, 0.5).normalize() },
      uRipplePositions: { value: new Array(8).fill(new THREE.Vector2(0, 0)) },
      uRippleTimes: { value: new Array(8).fill(0) },
      uRippleCount: { value: 0 }
    };

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      side: THREE.DoubleSide
    });
  }

  getMaterial() {
    return this.material;
  }

  updateTime(time) {
    this.uniforms.uTime.value = time;
  }

  updateRipples(ripples) {
    const count = Math.min(ripples.length, 8);
    this.uniforms.uRippleCount.value = count;
    
    for (let i = 0; i < count; i++) {
      const ripple = ripples[i];
      this.uniforms.uRipplePositions.value[i].set(ripple.position.x, ripple.position.z);
      this.uniforms.uRippleTimes.value[i] = ripple.age;
    }
  }

  setWaveParams(amplitude, frequency, speed) {
    this.uniforms.uWaveAmplitude.value = amplitude;
    this.uniforms.uWaveFrequency.value = frequency;
    this.uniforms.uWaveSpeed.value = speed;
  }

  dispose() {
    this.material.dispose();
  }
}
