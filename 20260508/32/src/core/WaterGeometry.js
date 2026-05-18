import * as THREE from 'three';

export class WaterGeometry {
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

  getOriginalPositions() {
    return this.originalPositions;
  }

  dispose() {
    this.geometry.dispose();
  }
}
