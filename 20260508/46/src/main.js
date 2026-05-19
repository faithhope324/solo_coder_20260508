import * as THREE from 'three';
import { SceneBuilder } from './scenebuilder.js';
import { MovementController } from './movementcontroller.js';
import { CollisionDetector } from './collisiondetector.js';

class App {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    
    this.sceneBuilder = null;
    this.movementController = null;
    this.collisionDetector = null;

    this.init();
    this.setupUI();
    this.animate();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.Fog(0x87CEEB, 10, 50);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 1.7, 3);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const container = document.getElementById('canvas-container');
    container.appendChild(this.renderer.domElement);

    this.sceneBuilder = new SceneBuilder(this.scene);
    const collisionMeshes = this.sceneBuilder.build();

    this.collisionDetector = new CollisionDetector();
    this.collisionDetector.setCollisionMeshes(collisionMeshes);

    this.movementController = new MovementController(this.camera, this.renderer.domElement);
    this.movementController.setCollisionDetector(this.collisionDetector);

    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupUI() {
    const startBtn = document.getElementById('start-btn');
    const startScreen = document.getElementById('start-screen');

    startBtn.addEventListener('click', () => {
      startScreen.classList.add('hidden');
      this.movementController.requestPointerLock();
    });

    this.renderer.domElement.addEventListener('click', () => {
      if (!this.movementController.isPointerLocked) {
        this.movementController.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      if (!this.movementController.isPointerLocked) {
        startScreen.classList.remove('hidden');
      }
    });
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  updateUI() {
    const pos = this.movementController.getPosition();
    const rot = this.movementController.getRotationY();
    
    document.getElementById('pos').textContent = 
      `${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}`;
    document.getElementById('rot').textContent = 
      `${((rot * 180) / Math.PI).toFixed(1)}°`;
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    
    this.movementController.update(delta);
    this.updateUI();

    this.renderer.render(this.scene, this.camera);
  }
}

new App();
