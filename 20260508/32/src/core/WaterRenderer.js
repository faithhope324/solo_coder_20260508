import * as THREE from 'three';

export class WaterRenderer {
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
    window.addEventListener('resize', this.onResize.bind(this));
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  addObject(object) {
    this.scene.add(object);
  }

  removeObject(object) {
    this.scene.remove(object);
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

  stopAnimationLoop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
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
    this.stopAnimationLoop();
    this.renderer.dispose();
  }
}
