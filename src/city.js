import * as THREE from 'three';

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class City {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.seed = options.seed || 12345;
    this.rng = mulberry32(this.seed);
    this.colliders = [];
    this.collectibles = [];
    this.generate();
  }

  random() {
    return this.rng();
  }

  generate() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const blockSize = 12;
    const streetWidth = 8;
    const cityRadius = 4;
    const buildingMat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.9 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x5C4033 });
    const yarnMat = new THREE.MeshStandardMaterial({ color: 0xff0066, emissive: 0x330011, emissiveIntensity: 0.4 });
    let collectibleId = 0;

    for (let x = -cityRadius; x <= cityRadius; x++) {
      for (let z = -cityRadius; z <= cityRadius; z++) {
        const bx = x * (blockSize + streetWidth);
        const bz = z * (blockSize + streetWidth);

        if (x === 0 && z === 0) continue; // leave spawn area open
        if (this.random() > 0.82) continue;

        const height = 2 + this.random() * 9;
        const building = new THREE.Mesh(new THREE.BoxGeometry(blockSize, height, blockSize), buildingMat);
        building.position.set(bx, height / 2, bz);
        building.castShadow = true;
        building.receiveShadow = true;
        this.scene.add(building);

        const roof = new THREE.Mesh(new THREE.BoxGeometry(blockSize + 0.2, 0.2, blockSize + 0.2), roofMat);
        roof.position.set(bx, height + 0.1, bz);
        roof.castShadow = true;
        this.scene.add(roof);

        this.colliders.push(new THREE.Box3().setFromObject(building));

        if (this.random() > 0.65) {
          const yarn = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), yarnMat);
          yarn.position.set(
            bx + (this.random() - 0.5) * blockSize * 0.8,
            0.4,
            bz + (this.random() - 0.5) * blockSize * 0.8
          );
          yarn.userData.id = collectibleId++;
          this.scene.add(yarn);
          this.collectibles.push(yarn);
        }
      }
    }

    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(60, 100, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -80;
    sun.shadow.camera.right = 80;
    sun.shadow.camera.top = 80;
    sun.shadow.camera.bottom = -80;
    this.scene.add(sun);

    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambient);
  }

  update(dt, playerPos) {
    for (const item of this.collectibles) {
      item.rotation.y += dt * 2;
      item.position.y = 0.4 + Math.sin(Date.now() * 0.005 + item.position.x) * 0.1;
    }
  }
}
