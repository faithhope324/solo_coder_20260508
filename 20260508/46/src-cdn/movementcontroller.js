import * as THREE from 'three';

export class MovementController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.moveSpeed = 5;
    this.mouseSensitivity = 0.002;
    this.playerHeight = 1.7;

    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false
    };

    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    this.isPointerLocked = false;
    this.collisionDetector = null;

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.camera.position.y = this.playerHeight;
  }

  setupEventListeners() {
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
    document.addEventListener('pointerlockerror', () => this.onPointerLockError());
  }

  requestPointerLock() {
    this.domElement.requestPointerLock();
  }

  exitPointerLock() {
    document.exitPointerLock();
  }

  onPointerLockChange() {
    this.isPointerLocked = document.pointerLockElement === this.domElement;
  }

  onPointerLockError() {
    console.error('Pointer lock error occurred');
  }

  onKeyDown(event) {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = true;
        break;
    }
  }

  onKeyUp(event) {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = false;
        break;
    }
  }

  onMouseMove(event) {
    if (!this.isPointerLocked) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y -= movementX * this.mouseSensitivity;
    this.euler.x -= movementY * this.mouseSensitivity;
    this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));

    this.camera.quaternion.setFromEuler(this.euler);
  }

  setCollisionDetector(detector) {
    this.collisionDetector = detector;
  }

  update(delta) {
    if (!this.isPointerLocked) return;

    this.velocity.x -= this.velocity.x * 10.0 * delta;
    this.velocity.z -= this.velocity.z * 10.0 * delta;

    this.direction.z = Number(this.keys.forward) - Number(this.keys.backward);
    this.direction.x = Number(this.keys.right) - Number(this.keys.left);
    this.direction.normalize();

    if (this.keys.forward || this.keys.backward) {
      this.velocity.z -= this.direction.z * this.moveSpeed * delta * 50;
    }
    if (this.keys.left || this.keys.right) {
      this.velocity.x -= this.direction.x * this.moveSpeed * delta * 50;
    }

    const moveX = -this.velocity.x * delta;
    const moveZ = -this.velocity.z * delta;

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.camera.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(this.camera.quaternion);
    right.y = 0;
    right.normalize();

    const displacement = new THREE.Vector3();
    displacement.addScaledVector(forward, moveZ);
    displacement.addScaledVector(right, moveX);

    if (this.collisionDetector) {
      const newPosition = this.camera.position.clone().add(displacement);
      if (!this.collisionDetector.checkCollision(newPosition)) {
        this.camera.position.copy(newPosition);
      } else {
        const onlyX = new THREE.Vector3(displacement.x, 0, 0);
        const newPosX = this.camera.position.clone().add(onlyX);
        if (!this.collisionDetector.checkCollision(newPosX)) {
          this.camera.position.copy(newPosX);
        } else {
          const onlyZ = new THREE.Vector3(0, 0, displacement.z);
          const newPosZ = this.camera.position.clone().add(onlyZ);
          if (!this.collisionDetector.checkCollision(newPosZ)) {
            this.camera.position.copy(newPosZ);
          }
        }
      }
    } else {
      this.camera.position.add(displacement);
    }

    this.camera.position.y = this.playerHeight;
  }

  getPosition() {
    return this.camera.position;
  }

  getRotationY() {
    this.euler.setFromQuaternion(this.camera.quaternion);
    return this.euler.y;
  }
}
