import * as THREE from 'three';

const vertexShader = `
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
`;

const fragmentShader = `
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
`;

class WaterGeometry {
  constructor(width = 40, height = 40, segments = 128) {
    this.width = width;
    this.height = height;
    this.segments = segments;
    this.createGeometry();
  }

  createGeometry() {
    this.geometry = new THREE.PlaneGeometry(
      this.width,
      this.height,
      this.segments,
      this.segments
    );
    this.geometry.rotateX(-Math.PI / 2);
    this.originalPositions = new Float32Array(
      this.geometry.attributes.position.array.length
    );
    this.originalPositions.set(this.geometry.attributes.position.array);
  }

  getGeometry() {
    return this.geometry;
  }

  dispose() {
    this.geometry.dispose();
  }
}

class WaterMaterial {
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

  dispose() {
    this.material.dispose();
  }
}

class RippleSystem {
  constructor(maxRipples = 8, lifespan = 6.0) {
    this.maxRipples = maxRipples;
    this.lifespan = lifespan;
    this.ripples = [];
  }

  addRipple(position) {
    const ripple = {
      position: position.clone(),
      age: 0,
      maxAge: this.lifespan
    };

    if (this.ripples.length >= this.maxRipples) {
      this.ripples.shift();
    }
    
    this.ripples.push(ripple);
  }

  update(deltaTime) {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      this.ripples[i].age += deltaTime;
      
      if (this.ripples[i].age >= this.ripples[i].maxAge) {
        this.ripples.splice(i, 1);
      }
    }
  }

  getActiveRipples() {
    return this.ripples;
  }
}

class MousePicker {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  }

  getIntersection(event) {
    const rect = this.domElement.getBoundingClientRect();
    
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const intersection = new THREE.Vector3();
    const result = this.raycaster.ray.intersectPlane(this.plane, intersection);
    
    return result ? intersection : null;
  }
}

class WaterRenderer {
  constructor(container) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.animationId = null;
    this.fpsCounter = {
      frames: 0,
      lastTime: performance.now(),
      element: null
    };

    this.onResize = this.onResize.bind(this);

    this.init();
    this.setupLights();
    this.setupEventListeners();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0a1628');
    this.scene.fog = new THREE.Fog('#0a1628', 20, 60);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 15, 25);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.container.appendChild(this.renderer.domElement);

    this.fpsCounter.element = document.getElementById('fps');
  }

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 20, 10);
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x87ceeb, 0.3);
    fillLight.position.set(-10, 10, -10);
    this.scene.add(fillLight);
  }

  setupEventListeners() {
    window.addEventListener('resize', this.onResize);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  addObject(object) {
    this.scene.add(object);
  }

  startAnimationLoop(callback) {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      
      const deltaTime = this.clock.getDelta();
      const elapsedTime = this.clock.getElapsedTime();

      this.updateFPS();

      if (callback) {
        callback(deltaTime, elapsedTime);
      }

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  updateFPS() {
    this.fpsCounter.frames++;
    const now = performance.now();
    
    if (now - this.fpsCounter.lastTime >= 1000) {
      if (this.fpsCounter.element) {
        this.fpsCounter.element.textContent = `FPS: ${this.fpsCounter.frames}`;
      }
      this.fpsCounter.frames = 0;
      this.fpsCounter.lastTime = now;
    }
  }

  getCamera() {
    return this.camera;
  }

  getDomElement() {
    return this.renderer.domElement;
  }

  dispose() {
    window.removeEventListener('resize', this.onResize);
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.renderer.dispose();
  }
}

class App {
  constructor() {
    this.container = document.getElementById('app');
    
    this.onClick = this.onClick.bind(this);
    this.update = this.update.bind(this);
    
    this.init();
    this.setupWater();
    this.setupInteraction();
    this.hideLoading();
    this.start();
  }

  init() {
    this.renderer = new WaterRenderer(this.container);
  }

  setupWater() {
    this.waterGeometry = new WaterGeometry(80, 80, 256);
    this.waterMaterial = new WaterMaterial();
    
    this.waterMesh = new THREE.Mesh(
      this.waterGeometry.getGeometry(),
      this.waterMaterial.getMaterial()
    );
    
    this.renderer.addObject(this.waterMesh);
    this.rippleSystem = new RippleSystem(8, 8.0);
  }

  setupInteraction() {
    this.mousePicker = new MousePicker(
      this.renderer.getCamera(),
      this.renderer.getDomElement()
    );
    
    this.renderer.getDomElement().addEventListener(
      'click',
      this.onClick
    );
  }

  onClick(event) {
    const intersection = this.mousePicker.getIntersection(event);
    
    if (intersection) {
      const halfWidth = 40;
      const halfHeight = 40;
      
      if (
        intersection.x >= -halfWidth &&
        intersection.x <= halfWidth &&
        intersection.z >= -halfHeight &&
        intersection.z <= halfHeight
      ) {
        this.rippleSystem.addRipple(intersection);
      }
    }
  }

  update(deltaTime, elapsedTime) {
    this.rippleSystem.update(deltaTime);
    this.waterMaterial.updateTime(elapsedTime);
    this.waterMaterial.updateRipples(this.rippleSystem.getActiveRipples());
  }

  hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'none';
    }
  }

  start() {
    this.renderer.startAnimationLoop(this.update);
  }

  dispose() {
    this.renderer.getDomElement().removeEventListener(
      'click',
      this.onClick
    );
    this.waterGeometry.dispose();
    this.waterMaterial.dispose();
    this.renderer.dispose();
  }
}

const app = new App();

window.addEventListener('beforeunload', () => {
  app.dispose();
});
