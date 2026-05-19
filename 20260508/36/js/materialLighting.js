import * as THREE from 'three';

export class MaterialLighting {
    constructor(scene, params = {}) {
        this.scene = scene;
        this.params = {
            surfaceColor: params.surfaceColor || 0xe94560,
            wireframe: params.wireframe !== undefined ? params.wireframe : true
        };
        
        this.materials = {};
        this.lights = {};
        this.normalHelpers = [];
        
        this.createMaterials();
        this.createLights();
    }
    
    createMaterials() {
        this.materials.solid = new THREE.MeshStandardMaterial({
            color: this.params.surfaceColor,
            metalness: 0.3,
            roughness: 0.4,
            side: THREE.DoubleSide,
            flatShading: false
        });
        
        this.materials.wireframe = new THREE.MeshBasicMaterial({
            color: this.params.surfaceColor,
            wireframe: true,
            side: THREE.DoubleSide
        });
        
        this.materials.normal = new THREE.MeshNormalMaterial({
            side: THREE.DoubleSide,
            flatShading: false
        });
    }
    
    createLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        this.lights.ambient = ambientLight;
        
        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight1.position.set(5, 10, 5);
        directionalLight1.castShadow = true;
        this.scene.add(directionalLight1);
        this.lights.directional1 = directionalLight1;
        
        const directionalLight2 = new THREE.DirectionalLight(0x4488ff, 0.4);
        directionalLight2.position.set(-5, 5, -5);
        this.scene.add(directionalLight2);
        this.lights.directional2 = directionalLight2;
        
        const pointLight = new THREE.PointLight(0xff6688, 0.5, 30);
        pointLight.position.set(0, 5, 0);
        this.scene.add(pointLight);
        this.lights.point = pointLight;
    }
    
    getMaterial(wireframe = false) {
        return wireframe ? this.materials.wireframe : this.materials.solid;
    }
    
    setWireframe(wireframe) {
        this.params.wireframe = wireframe;
        this.materials.solid.wireframe = wireframe;
        this.materials.wireframe.wireframe = wireframe;
    }
    
    setColor(hexColor) {
        this.params.surfaceColor = hexColor;
        this.materials.solid.color.setHex(hexColor);
        this.materials.wireframe.color.setHex(hexColor);
    }
    
    createNormalHelpers(geometry, parent, length = 0.3) {
        this.clearNormalHelpers();
        
        const positions = geometry.attributes.position;
        const normals = geometry.attributes.normal;
        const step = Math.max(1, Math.floor(positions.count / 200));
        
        for (let i = 0; i < positions.count; i += step) {
            const position = new THREE.Vector3(
                positions.getX(i),
                positions.getY(i),
                positions.getZ(i)
            );
            
            const normal = new THREE.Vector3(
                normals.getX(i),
                normals.getY(i),
                normals.getZ(i)
            );
            
            const arrowHelper = new THREE.ArrowHelper(
                normal,
                position,
                length,
                0x00ff00,
                length * 0.3,
                length * 0.2
            );
            
            parent.add(arrowHelper);
            this.normalHelpers.push(arrowHelper);
        }
    }
    
    updateNormalHelpers(geometry, parent, length = 0.3) {
        if (this.normalHelpers.length === 0) return;
        
        const positions = geometry.attributes.position;
        const normals = geometry.attributes.normal;
        const step = Math.max(1, Math.floor(positions.count / 200));
        
        let helperIndex = 0;
        for (let i = 0; i < positions.count && helperIndex < this.normalHelpers.length; i += step) {
            const arrowHelper = this.normalHelpers[helperIndex];
            
            const position = new THREE.Vector3(
                positions.getX(i),
                positions.getY(i),
                positions.getZ(i)
            );
            
            const normal = new THREE.Vector3(
                normals.getX(i),
                normals.getY(i),
                normals.getZ(i)
            );
            
            arrowHelper.position.copy(position);
            arrowHelper.setDirection(normal);
            arrowHelper.setLength(length, length * 0.3, length * 0.2);
            
            helperIndex++;
        }
    }
    
    clearNormalHelpers() {
        this.normalHelpers.forEach(helper => {
            helper.parent?.remove(helper);
            helper.dispose?.();
        });
        this.normalHelpers = [];
    }
    
    dispose() {
        Object.values(this.materials).forEach(material => material.dispose());
        this.clearNormalHelpers();
    }
}
