import * as THREE from 'three';

export class SceneBuilder {
  constructor(scene) {
    this.scene = scene;
    this.collisionMeshes = [];
    this.roomSize = { width: 12, height: 3, depth: 10 };
  }

  build() {
    this.createFloor();
    this.createCeiling();
    this.createWalls();
    this.createWindows();
    this.createFurniture();
    this.createLights();
    return this.collisionMeshes;
  }

  createFloor() {
    const floorGeometry = new THREE.PlaneGeometry(this.roomSize.width, this.roomSize.depth);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B7355,
      roughness: 0.8,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  createCeiling() {
    const ceilingGeometry = new THREE.PlaneGeometry(this.roomSize.width, this.roomSize.depth);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: 0xFAF0E6,
      roughness: 0.9,
      metalness: 0.0
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = this.roomSize.height;
    this.scene.add(ceiling);
  }

  createWalls() {
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xF5F5DC,
      roughness: 0.7,
      metalness: 0.0
    });

    const wallThickness = 0.2;

    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(this.roomSize.width, this.roomSize.height, wallThickness),
      wallMaterial
    );
    backWall.position.set(0, this.roomSize.height / 2, -this.roomSize.depth / 2);
    backWall.receiveShadow = true;
    this.scene.add(backWall);
    this.collisionMeshes.push(backWall);

    const frontWall = new THREE.Mesh(
      new THREE.BoxGeometry(this.roomSize.width, this.roomSize.height, wallThickness),
      wallMaterial
    );
    frontWall.position.set(0, this.roomSize.height / 2, this.roomSize.depth / 2);
    frontWall.receiveShadow = true;
    this.scene.add(frontWall);
    this.collisionMeshes.push(frontWall);

    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, this.roomSize.height, this.roomSize.depth),
      wallMaterial
    );
    leftWall.position.set(-this.roomSize.width / 2, this.roomSize.height / 2, 0);
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);
    this.collisionMeshes.push(leftWall);

    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, this.roomSize.height, this.roomSize.depth),
      wallMaterial
    );
    rightWall.position.set(this.roomSize.width / 2, this.roomSize.height / 2, 0);
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);
    this.collisionMeshes.push(rightWall);
  }

  createWindows() {
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x87CEEB,
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
      metalness: 0.9
    });

    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x4A4A4A,
      roughness: 0.5,
      metalness: 0.5
    });

    const windowWidth = 2;
    const windowHeight = 1.5;
    const frameThickness = 0.1;

    const window1 = new THREE.Mesh(
      new THREE.PlaneGeometry(windowWidth, windowHeight),
      windowMaterial
    );
    window1.position.set(-3, this.roomSize.height / 2, -this.roomSize.depth / 2 + 0.01);
    this.scene.add(window1);

    const window1FrameTop = new THREE.Mesh(
      new THREE.BoxGeometry(windowWidth + 0.2, frameThickness, frameThickness),
      frameMaterial
    );
    window1FrameTop.position.set(-3, this.roomSize.height / 2 + windowHeight / 2 + frameThickness / 2, -this.roomSize.depth / 2 + 0.05);
    this.scene.add(window1FrameTop);

    const window1FrameBottom = window1FrameTop.clone();
    window1FrameBottom.position.y = this.roomSize.height / 2 - windowHeight / 2 - frameThickness / 2;
    this.scene.add(window1FrameBottom);

    const window1FrameLeft = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, windowHeight + 0.2, frameThickness),
      frameMaterial
    );
    window1FrameLeft.position.set(-3 - windowWidth / 2 - frameThickness / 2, this.roomSize.height / 2, -this.roomSize.depth / 2 + 0.05);
    this.scene.add(window1FrameLeft);

    const window1FrameRight = window1FrameLeft.clone();
    window1FrameRight.position.x = -3 + windowWidth / 2 + frameThickness / 2;
    this.scene.add(window1FrameRight);

    const window2 = new THREE.Mesh(
      new THREE.PlaneGeometry(windowWidth, windowHeight),
      windowMaterial
    );
    window2.position.set(3, this.roomSize.height / 2, -this.roomSize.depth / 2 + 0.01);
    this.scene.add(window2);

    const window2FrameTop = window1FrameTop.clone();
    window2FrameTop.position.x = 3;
    this.scene.add(window2FrameTop);

    const window2FrameBottom = window1FrameBottom.clone();
    window2FrameBottom.position.x = 3;
    this.scene.add(window2FrameBottom);

    const window2FrameLeft = window1FrameLeft.clone();
    window2FrameLeft.position.x = 3 - windowWidth / 2 - frameThickness / 2;
    this.scene.add(window2FrameLeft);

    const window2FrameRight = window1FrameRight.clone();
    window2FrameRight.position.x = 3 + windowWidth / 2 + frameThickness / 2;
    this.scene.add(window2FrameRight);
  }

  createFurniture() {
    this.createDesk(-3, 0.75, -2);
    this.createChair(-3, 0.4, -0.5);
    this.createDesk(3, 0.75, -2);
    this.createChair(3, 0.4, -0.5);
    this.createBookshelf(-this.roomSize.width / 2 + 0.4, this.roomSize.height / 2, 2);
    this.createLamp(0, this.roomSize.height - 0.1, 0);
    this.createTable(0, 0.4, 2);
    this.createSofa(3, 0.4, 3);
  }

  createDesk(x, y, z) {
    const deskGroup = new THREE.Group();

    const topGeometry = new THREE.BoxGeometry(1.8, 0.08, 0.8);
    const topMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.6,
      metalness: 0.1
    });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = y * 2;
    top.castShadow = true;
    top.receiveShadow = true;
    deskGroup.add(top);
    this.collisionMeshes.push(top);

    const legGeometry = new THREE.BoxGeometry(0.08, y * 2, 0.08);
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x5D3A1A,
      roughness: 0.7,
      metalness: 0.1
    });

    const legPositions = [
      [-0.8, y, -0.35],
      [0.8, y, -0.35],
      [-0.8, y, 0.35],
      [0.8, y, 0.35]
    ];

    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      deskGroup.add(leg);
      this.collisionMeshes.push(leg);
    });

    deskGroup.position.set(x, 0, z);
    this.scene.add(deskGroup);
  }

  createChair(x, y, z) {
    const chairGroup = new THREE.Group();

    const seatGeometry = new THREE.BoxGeometry(0.5, 0.08, 0.5);
    const chairMaterial = new THREE.MeshStandardMaterial({
      color: 0x2F4F4F,
      roughness: 0.5,
      metalness: 0.3
    });
    const seat = new THREE.Mesh(seatGeometry, chairMaterial);
    seat.position.y = y * 2;
    seat.castShadow = true;
    chairGroup.add(seat);
    this.collisionMeshes.push(seat);

    const backGeometry = new THREE.BoxGeometry(0.5, 0.6, 0.08);
    const back = new THREE.Mesh(backGeometry, chairMaterial);
    back.position.set(0, y * 2 + 0.3, -0.25);
    back.castShadow = true;
    chairGroup.add(back);
    this.collisionMeshes.push(back);

    const legGeometry = new THREE.BoxGeometry(0.06, y * 2, 0.06);
    const legPositions = [
      [-0.2, y, -0.2],
      [0.2, y, -0.2],
      [-0.2, y, 0.2],
      [0.2, y, 0.2]
    ];

    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, chairMaterial);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      chairGroup.add(leg);
      this.collisionMeshes.push(leg);
    });

    chairGroup.position.set(x, 0, z);
    chairGroup.rotation.y = Math.PI;
    this.scene.add(chairGroup);
  }

  createBookshelf(x, y, z) {
    const shelfGroup = new THREE.Group();

    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.6,
      metalness: 0.1
    });

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, this.roomSize.height - 0.2, 0.05),
      frameMaterial
    );
    back.position.x = 0.025;
    back.castShadow = true;
    shelfGroup.add(back);
    this.collisionMeshes.push(back);

    const sideLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, this.roomSize.height - 0.2, 0.4),
      frameMaterial
    );
    sideLeft.position.set(0, 0, 0.2);
    sideLeft.castShadow = true;
    shelfGroup.add(sideLeft);
    this.collisionMeshes.push(sideLeft);

    const sideRight = sideLeft.clone();
    sideRight.position.z = -0.2;
    shelfGroup.add(sideRight);
    this.collisionMeshes.push(sideRight);

    const shelfCount = 4;
    for (let i = 0; i < shelfCount; i++) {
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.03, 0.4),
        frameMaterial
      );
      shelf.position.set(0, -1 + i * 0.8, 0);
      shelf.castShadow = true;
      shelfGroup.add(shelf);
      this.collisionMeshes.push(shelf);

      this.addBooks(shelfGroup, 0, -1 + i * 0.8 + 0.15, 0);
    }

    shelfGroup.position.set(x, y, z);
    shelfGroup.rotation.y = Math.PI / 2;
    this.scene.add(shelfGroup);
  }

  addBooks(parent, x, y, z) {
    const bookColors = [0x8B0000, 0x006400, 0x00008B, 0x8B8B00, 0x4B0082, 0x8B008B];
    for (let i = 0; i < 5; i++) {
      const bookHeight = 0.25 + Math.random() * 0.1;
      const bookGeometry = new THREE.BoxGeometry(0.15, bookHeight, 0.08);
      const bookMaterial = new THREE.MeshStandardMaterial({
        color: bookColors[Math.floor(Math.random() * bookColors.length)],
        roughness: 0.7,
        metalness: 0.0
      });
      const book = new THREE.Mesh(bookGeometry, bookMaterial);
      book.position.set(x - 0.5 + i * 0.25, y + bookHeight / 2, z);
      book.castShadow = true;
      parent.add(book);
      this.collisionMeshes.push(book);
    }
  }

  createLamp(x, y, z) {
    const lampGroup = new THREE.Group();

    const poleGeometry = new THREE.CylinderGeometry(0.03, 0.03, y - 0.1, 16);
    const poleMaterial = new THREE.MeshStandardMaterial({
      color: 0x2F4F4F,
      roughness: 0.3,
      metalness: 0.8
    });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = (y - 0.1) / 2;
    pole.castShadow = true;
    lampGroup.add(pole);

    const baseGeometry = new THREE.CylinderGeometry(0.2, 0.25, 0.05, 32);
    const base = new THREE.Mesh(baseGeometry, poleMaterial);
    base.position.y = 0.025;
    base.castShadow = true;
    lampGroup.add(base);

    const shadeGeometry = new THREE.ConeGeometry(0.4, 0.4, 32, 1, true);
    const shadeMaterial = new THREE.MeshStandardMaterial({
      color: 0xFAFAD2,
      side: THREE.DoubleSide,
      roughness: 0.5,
      metalness: 0.0
    });
    const shade = new THREE.Mesh(shadeGeometry, shadeMaterial);
    shade.position.y = y - 0.2;
    shade.castShadow = true;
    lampGroup.add(shade);

    const bulbLight = new THREE.PointLight(0xFFE4B5, 1, 5, 2);
    bulbLight.position.set(0, y - 0.3, 0);
    bulbLight.castShadow = true;
    lampGroup.add(bulbLight);

    lampGroup.position.set(x, 0, z);
    this.scene.add(lampGroup);
  }

  createTable(x, y, z) {
    const tableGroup = new THREE.Group();

    const topGeometry = new THREE.BoxGeometry(1.2, 0.08, 0.8);
    const topMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.6,
      metalness: 0.1
    });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = y * 2;
    top.castShadow = true;
    top.receiveShadow = true;
    tableGroup.add(top);
    this.collisionMeshes.push(top);

    const legGeometry = new THREE.BoxGeometry(0.08, y * 2, 0.08);
    const legPositions = [
      [-0.5, y, -0.3],
      [0.5, y, -0.3],
      [-0.5, y, 0.3],
      [0.5, y, 0.3]
    ];

    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, topMaterial);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      tableGroup.add(leg);
      this.collisionMeshes.push(leg);
    });

    tableGroup.position.set(x, 0, z);
    this.scene.add(tableGroup);
  }

  createSofa(x, y, z) {
    const sofaGroup = new THREE.Group();

    const sofaMaterial = new THREE.MeshStandardMaterial({
      color: 0x4169E1,
      roughness: 0.8,
      metalness: 0.1
    });

    const baseGeometry = new THREE.BoxGeometry(2, 0.4, 0.8);
    const base = new THREE.Mesh(baseGeometry, sofaMaterial);
    base.position.y = y;
    base.castShadow = true;
    sofaGroup.add(base);
    this.collisionMeshes.push(base);

    const backGeometry = new THREE.BoxGeometry(2, 0.6, 0.2);
    const back = new THREE.Mesh(backGeometry, sofaMaterial);
    back.position.set(0, y + 0.3, -0.3);
    back.castShadow = true;
    sofaGroup.add(back);
    this.collisionMeshes.push(back);

    const armGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.8);
    const armLeft = new THREE.Mesh(armGeometry, sofaMaterial);
    armLeft.position.set(-0.925, y + 0.25, 0);
    armLeft.castShadow = true;
    sofaGroup.add(armLeft);
    this.collisionMeshes.push(armLeft);

    const armRight = armLeft.clone();
    armRight.position.x = 0.925;
    sofaGroup.add(armRight);
    this.collisionMeshes.push(armRight);

    sofaGroup.position.set(x, 0, z);
    sofaGroup.rotation.y = Math.PI;
    this.scene.add(sofaGroup);
  }

  createLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(5, 8, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -10;
    mainLight.shadow.camera.right = 10;
    mainLight.shadow.camera.top = 10;
    mainLight.shadow.camera.bottom = -10;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x87CEEB, 0.3);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);
  }
}
