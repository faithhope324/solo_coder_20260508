import * as THREE from 'three';

export class CollisionDetector {
  constructor() {
    this.collisionBoxes = [];
    this.playerRadius = 0.3;
    this.playerHeight = 1.7;
  }

  setCollisionMeshes(meshes) {
    this.collisionBoxes = [];
    meshes.forEach(mesh => {
      const box = new THREE.Box3().setFromObject(mesh);
      this.collisionBoxes.push(box);
    });
  }

  checkCollision(position) {
    const playerBox = this.createPlayerBox(position);

    for (const box of this.collisionBoxes) {
      if (this.intersects(playerBox, box)) {
        return true;
      }
    }

    return false;
  }

  createPlayerBox(position) {
    const minX = position.x - this.playerRadius;
    const maxX = position.x + this.playerRadius;
    const minY = position.y - this.playerHeight;
    const maxY = position.y;
    const minZ = position.z - this.playerRadius;
    const maxZ = position.z + this.playerRadius;

    return new THREE.Box3(
      new THREE.Vector3(minX, minY, minZ),
      new THREE.Vector3(maxX, maxY, maxZ)
    );
  }

  intersects(box1, box2) {
    return (
      box1.min.x <= box2.max.x &&
      box1.max.x >= box2.min.x &&
      box1.min.y <= box2.max.y &&
      box1.max.y >= box2.min.y &&
      box1.min.z <= box2.max.z &&
      box1.max.z >= box2.min.z
    );
  }

  getCollisionResponse(position, velocity) {
    const response = { x: 1, z: 1 };

    const testPosX = position.clone();
    testPosX.x += velocity.x;
    if (this.checkCollision(testPosX)) {
      response.x = 0;
    }

    const testPosZ = position.clone();
    testPosZ.z += velocity.z;
    if (this.checkCollision(testPosZ)) {
      response.z = 0;
    }

    return response;
  }

  setPlayerRadius(radius) {
    this.playerRadius = radius;
  }

  setPlayerHeight(height) {
    this.playerHeight = height;
  }
}
