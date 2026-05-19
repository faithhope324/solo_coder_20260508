import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MobiusGeometry } from './mobiusGeometry.js';
import { MaterialLighting } from './materialLighting.js';
import { ControlPanel } from './controls.js';

class MobiusViewer {
    constructor() {
        this.container = document.getElementById('canvas-container');
        
        this.params = {
            autoRotate: true,
            rotationSpeed: 0.5,
            showNormals: false,
            normalLength: 0.3
        };
        
        this.init();
        this.setupControls();
        this.createMobiusStrip();
        this.setupEventListeners();
        this.animate();
        
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        this.scene.fog = new THREE.Fog(0x1a1a2e, 15, 50);
        
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(10, 8, 10);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.05;
        this.orbitControls.minDistance = 3;
        this.orbitControls.maxDistance = 50;
        
        this.materialLighting = new MaterialLighting(this.scene);
        
        this.addGridHelper();
    }
    
    addGridHelper() {
        const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x333333);
        gridHelper.position.y = -5;
        this.scene.add(gridHelper);
    }
    
    createMobiusStrip() {
        this.mobiusGeometry = new MobiusGeometry();
        
        this.mobiusGroup = new THREE.Group();
        this.scene.add(this.mobiusGroup);
        
        const material = this.materialLighting.getMaterial(true);
        this.mobiusMesh = new THREE.Mesh(this.mobiusGeometry.geometry, material);
        this.mobiusMesh.castShadow = true;
        this.mobiusMesh.receiveShadow = true;
        this.mobiusGroup.add(this.mobiusMesh);
        
        this.updateVertexCount();
    }
    
    setupControls() {
        this.controls = new ControlPanel();
        
        this.controls.on('geometryChange', (params) => {
            this.mobiusGeometry.updateParams(params);
            this.mobiusMesh.geometry = this.mobiusGeometry.geometry;
            this.updateVertexCount();
            
            if (this.params.showNormals) {
                this.materialLighting.updateNormalHelpers(
                    this.mobiusGeometry.geometry,
                    this.mobiusGroup,
                    this.params.normalLength
                );
            }
        });
        
        this.controls.on('wireframeChange', (wireframe) => {
            this.mobiusMesh.material = this.materialLighting.getMaterial(wireframe);
        });
        
        this.controls.on('showNormalsChange', (show) => {
            this.params.showNormals = show;
            if (show) {
                this.materialLighting.createNormalHelpers(
                    this.mobiusGeometry.geometry,
                    this.mobiusGroup,
                    this.params.normalLength
                );
            } else {
                this.materialLighting.clearNormalHelpers();
            }
        });
        
        this.controls.on('autoRotateChange', (autoRotate) => {
            this.params.autoRotate = autoRotate;
        });
        
        this.controls.on('colorChange', (color) => {
            this.materialLighting.setColor(parseInt(color.replace('#', ''), 16));
        });
        
        this.controls.on('normalLengthChange', (length) => {
            this.params.normalLength = length;
            if (this.params.showNormals) {
                this.materialLighting.updateNormalHelpers(
                    this.mobiusGeometry.geometry,
                    this.mobiusGroup,
                    length
                );
            }
        });
        
        this.controls.on('rotationSpeedChange', (speed) => {
            this.params.rotationSpeed = speed;
        });
        
        this.controls.on('reset', () => {
            this.params.autoRotate = true;
            this.params.rotationSpeed = 0.5;
            this.params.showNormals = false;
            this.params.normalLength = 0.3;
        });
    }
    
    setupEventListeners() {
        this.onWindowResize();
    }
    
    updateVertexCount() {
        const count = this.mobiusGeometry.getVertexCount();
        if (this.controls) {
            this.controls.setVertexCount(count);
        }
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.params.autoRotate && this.mobiusGroup) {
            this.mobiusGroup.rotation.y += 0.005 * this.params.rotationSpeed;
            this.mobiusGroup.rotation.x += 0.002 * this.params.rotationSpeed;
        }
        
        if (this.materialLighting.lights.point) {
            const time = Date.now() * 0.001;
            this.materialLighting.lights.point.position.x = Math.sin(time) * 8;
            this.materialLighting.lights.point.position.z = Math.cos(time) * 8;
        }
        
        this.orbitControls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    dispose() {
        this.mobiusGeometry.dispose();
        this.materialLighting.dispose();
        this.renderer.dispose();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MobiusViewer();
});
