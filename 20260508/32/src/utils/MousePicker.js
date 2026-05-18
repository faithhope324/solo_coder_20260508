import * as THREE from 'three';

export class MousePicker {
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

  setPlaneNormal(normal) {
    this.plane.normal.copy(normal);
  }

  setPlaneConstant(constant) {
    this.plane.constant = constant;
  }
}
