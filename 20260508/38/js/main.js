import { Gallery } from './gallery.js';
import { CameraController } from './camera.js';
import { InteractionManager } from './interaction.js';
import { Modal } from './modal.js';

class App {
    constructor() {
        this.container = document.getElementById('container');
        this.loadingElement = document.getElementById('loading');
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        this.gallery = null;
        this.cameraController = null;
        this.interactionManager = null;
        this.modal = null;
        
        this.particles = null;
        
        this.init();
    }

    init() {
        this.setupThreeJS();
        this.createGallery();
        this.createParticles();
        this.setupLights();
        this.setupControllers();
        
        window.addEventListener('resize', () => this.onWindowResize());
        
        this.animate();
    }

    setupThreeJS() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x0a0a1a, 20, 50);
        
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        this.container.appendChild(this.renderer.domElement);
    }

    createGallery() {
        this.gallery = new Gallery(this.scene);
        
        this.gallery.loadTextures().then(() => {
            this.hideLoading();
        });
    }

    createParticles() {
        const particleCount = 500;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        const color = new THREE.Color();
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            const radius = 20 + Math.random() * 30;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = (Math.random() - 0.5) * 40;
            positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
            
            color.setHSL(0.6 + Math.random() * 0.3, 0.5, 0.5 + Math.random() * 0.3);
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(10, 20, 10);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        this.scene.add(mainLight);
        
        const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
        fillLight.position.set(-10, 10, -10);
        this.scene.add(fillLight);
        
        const rimLight = new THREE.DirectionalLight(0xff4466, 0.4);
        rimLight.position.set(0, -10, 20);
        this.scene.add(rimLight);
        
        const centerLight = new THREE.PointLight(0xe94560, 1, 30);
        centerLight.position.set(0, 0, 0);
        this.scene.add(centerLight);
    }

    setupControllers() {
        this.cameraController = new CameraController(this.camera, this.container);
        this.modal = new Modal();
        this.interactionManager = new InteractionManager(
            this.camera,
            this.gallery,
            this.cameraController,
            this.modal
        );
    }

    hideLoading() {
        setTimeout(() => {
            this.loadingElement.classList.add('hidden');
        }, 500);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.cameraController) {
            this.cameraController.update();
        }
        
        if (this.particles) {
            this.particles.rotation.y += 0.0003;
            this.particles.rotation.x += 0.0001;
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new App();
});
