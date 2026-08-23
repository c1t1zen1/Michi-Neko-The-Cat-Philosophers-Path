import * as THREE from 'three';

const MAT = {
  plasterWarm: new THREE.MeshStandardMaterial({ color: 0xf5ebd9, roughness: 0.9 }),
  timberDark: new THREE.MeshStandardMaterial({ color: 0x3d2516, roughness: 0.85 }),
  timberEngawa: new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: 0.75 }),
  tatami: new THREE.MeshStandardMaterial({ color: 0xbed39f, roughness: 0.95 }),
  tatamiBorder: new THREE.MeshStandardMaterial({ color: 0x2d3a24, roughness: 0.7 }),
  shoji: new THREE.MeshStandardMaterial({ color: 0xfbf7ed, roughness: 0.9, transparent: true, opacity: 0.92 }),
  fusumaPaper: new THREE.MeshStandardMaterial({ color: 0xede0c8, roughness: 0.88 }),
  cushionRed: new THREE.MeshStandardMaterial({ color: 0xa8241e, roughness: 0.65 }),
  goldAntique: new THREE.MeshStandardMaterial({ color: 0xcca040, metalness: 0.75, roughness: 0.3 }),
  grilledFish: new THREE.MeshStandardMaterial({ color: 0xd97c38, roughness: 0.55 }),
  lanternPaper: new THREE.MeshStandardMaterial({ color: 0xffe2a4, emissive: 0xffaa33, emissiveIntensity: 0.85, roughness: 0.6 }),
  stoneToro: new THREE.MeshStandardMaterial({ color: 0x6e7570, roughness: 0.9 }),
  bamboo: new THREE.MeshStandardMaterial({ color: 0x5e8c45, roughness: 0.7 }),
  ceramicWhite: new THREE.MeshStandardMaterial({ color: 0xf3ede2, roughness: 0.4 }),
  ceramicBlue: new THREE.MeshStandardMaterial({ color: 0x3e6b8a, roughness: 0.5 })
};

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export class InteriorManager {
  constructor(game) {
    this.game = game;
    this.isInside = false;
    this.isTransitioning = false;
    this.origin = new THREE.Vector3(0, 100, 0); // Isolated interior coordinate space

    this.group = new THREE.Group();
    this.group.position.copy(this.origin);
    this.game.scene.add(this.group);

    this.colliders = [];
    this.platforms = [];
    this.fishMesh = null;
    this.fishEaten = false;
    this.knockables = [];

    this.wipeEl = document.getElementById('door-wipe');
    this.buildInterior();
    this.buildKnockables();
  }

  /** Small tabletop treasures cats love to shove off tables. */
  buildKnockables() {
    const defs = [
      { geo: new THREE.CylinderGeometry(0.055, 0.045, 0.09, 12), mat: MAT.ceramicWhite, x: -0.55, z: -0.45 },
      { geo: new THREE.CylinderGeometry(0.075, 0.05, 0.07, 14), mat: MAT.ceramicBlue, x: 0.45, z: -0.55 },
      { geo: new THREE.SphereGeometry(0.055, 10, 8), mat: MAT.ceramicWhite, x: 0.6, z: 0.15 }
    ];
    const topY = this.origin.y + 0.58;
    for (const d of defs) {
      const m = new THREE.Mesh(d.geo, d.mat);
      m.castShadow = true;
      m.position.set(this.origin.x + d.x, topY + 0.05, this.origin.z + d.z);
      this.group.add(m);
      this.knockables.push({
        mesh: m,
        vel: new THREE.Vector3(),
        spin: new THREE.Vector3(),
        knocked: false,
        settled: false,
        floorY: this.origin.y + 0.05
      });
    }
  }

  update(dt) {
    const p = window.game ? window.game.player : null;
    for (const k of this.knockables) {
      // Cat brushing against an item while on the table knocks it off
      if (!k.knocked && p && this.isInside &&
          p.mesh.position.x >= this.origin.x - 1.0 && p.mesh.position.x <= this.origin.x + 1.0 &&
          p.mesh.position.z >= this.origin.z - 0.9 && p.mesh.position.z <= this.origin.z + 0.5 &&
          p.mesh.position.y > this.origin.y + 0.4) {
        const dx = k.mesh.position.x - p.mesh.position.x;
        const dz = k.mesh.position.z - p.mesh.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.26) {
          const nx = dist > 0.001 ? dx / dist : 1;
          const nz = dist > 0.001 ? dz / dist : 0;
          k.vel.set(nx * 1.3, 1.6, nz * 1.3);
          k.spin.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
          k.knocked = true;
          if (window.game.audio) window.game.audio.playTrill();
          if (p.cat) p.cat.setMood('playful', 1.0, 2);
          if (window.game.ui) window.game.ui.showToast('Nyaa~ Oops! It rolled right off the table!');
        }
      }
      if (!k.knocked || k.settled) continue;
      // Simple physics: gravity, tumble, floor bounce & settle
      k.vel.y -= 18 * dt;
      k.mesh.position.addScaledVector(k.vel, dt);
      k.mesh.rotation.x += k.spin.x * dt;
      k.mesh.rotation.y += k.spin.y * dt;
      k.mesh.rotation.z += k.spin.z * dt;
      if (k.mesh.position.y <= k.floorY + 0.05 && k.vel.y < 0) {
        k.mesh.position.y = k.floorY + 0.05;
        k.vel.y *= -0.3;
        k.vel.x *= 0.6;
        k.vel.z *= 0.6;
        k.spin.multiplyScalar(0.5);
        if (Math.abs(k.vel.y) < 0.4) {
          k.vel.set(0, 0, 0);
          k.spin.set(0, 0, 0);
          k.settled = true;
        }
      }
    }
  }

  buildInterior() {
    const root = this.group;

    // 1. Room Floor: 8-mat Tatami arrangement (Room size: 8m wide x 7m deep x 3.6m ceiling)
    const floor = new THREE.Group();
    const matW = 1.25, matL = 2.5, matH = 0.08;
    const mats = [
      [-1.25, 0.04, -1.25, false], [1.25, 0.04, -1.25, false],
      [-1.25, 0.04, 1.25, false],  [1.25, 0.04, 1.25, false],
      [-2.5, 0.04, 0, true],       [2.5, 0.04, 0, true]
    ];
    for (const [mx, my, mz, rotated] of mats) {
      const w = rotated ? matL : matW;
      const d = rotated ? matW : matL;
      const m = box(w - 0.04, matH, d - 0.04, MAT.tatami, mx, my, mz);
      const b = box(w, matH * 0.8, d, MAT.tatamiBorder, mx, my - 0.01, mz);
      floor.add(m, b);
    }
    root.add(floor);

    // Raised wood border around tatami
    root.add(box(8.2, 0.1, 7.2, MAT.timberEngawa, 0, 0.02, 0));

    // 2. Room Walls & Ceiling
    const wallH = 3.6;
    // Back Wall (Tokonoma wall)
    root.add(box(8.4, wallH, 0.3, MAT.plasterWarm, 0, wallH / 2, -3.6));
    // Left Wall
    root.add(box(0.3, wallH, 7.2, MAT.plasterWarm, -4.1, wallH / 2, 0));
    // Right Wall (Engawa garden opening)
    root.add(box(0.3, wallH, 2.0, MAT.plasterWarm, 4.1, wallH / 2, -2.6));
    root.add(box(0.3, wallH, 2.0, MAT.plasterWarm, 4.1, wallH / 2, 2.6));
    // Front Wall with sliding entrance Shoji
    root.add(box(2.8, wallH, 0.3, MAT.plasterWarm, -2.7, wallH / 2, 3.6));
    root.add(box(2.8, wallH, 0.3, MAT.plasterWarm, 2.7, wallH / 2, 3.6));
    // Ceiling beams & panel
    root.add(box(8.4, 0.2, 7.4, MAT.timberDark, 0, wallH, 0));
    for (let bx = -3; bx <= 3; bx += 2) {
      root.add(box(0.2, 0.28, 7.2, MAT.timberDark, bx, wallH - 0.14, 0));
    }

    // Hashira timber posts
    for (const sx of [-4.1, 4.1]) {
      for (const sz of [-3.6, 3.6]) {
        root.add(box(0.35, wallH, 0.35, MAT.timberDark, sx, wallH / 2, sz));
      }
    }

    // 3. Tokonoma Alcove (Sacred recess on back wall)
    const toko = new THREE.Group();
    toko.add(box(3.2, 0.22, 1.2, MAT.timberDark, 0, 0.11, -3.0));
    // Hanging Scroll (Kakejiku)
    toko.add(box(1.2, 2.2, 0.04, MAT.fusumaPaper, 0, 1.9, -3.42));
    toko.add(box(0.8, 1.4, 0.05, MAT.timberDark, 0, 1.9, -3.41));
    toko.add(box(1.4, 0.08, 0.08, MAT.timberDark, 0, 0.8, -3.4));
    // Mini Bonsai Pine on polished plinth
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.14, 10), MAT.stoneToro);
    pot.position.set(0.9, 0.28, -3.0);
    toko.add(pot);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.45, 6), MAT.timberDark);
    trunk.position.set(0.9, 0.52, -3.0);
    trunk.rotation.z = -0.25;
    toko.add(trunk);
    for (let c = 0; c < 3; c++) {
      const foliage = new THREE.Mesh(new THREE.SphereGeometry(0.18 - c * 0.03, 8, 6), MAT.bamboo);
      foliage.scale.set(1.4, 0.6, 1.2);
      foliage.position.set(0.95 + c * 0.08, 0.65 + c * 0.12, -3.0 + (c % 2 === 0 ? 0.05 : -0.05));
      toko.add(foliage);
    }
    root.add(toko);

    // 4. Low Chabudai Table with Ceramic Tea Set & Grilled Sea Bream (Fish Feast)
    const table = new THREE.Group();
    table.add(box(1.8, 0.1, 1.3, MAT.timberEngawa, 0, 0.44, 0));
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        table.add(box(0.12, 0.4, 0.12, MAT.timberDark, sx * 0.75, 0.2, sz * 0.52));
      }
    }
    // Ceramic Teapot & Yunomi Cups
    const teapot = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.16, 10), MAT.stoneToro);
    teapot.position.set(-0.45, 0.56, -0.25);
    const teacup1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.07, 8), MAT.plasterWarm);
    teacup1.position.set(-0.25, 0.52, -0.25);
    const teacup2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.07, 8), MAT.plasterWarm);
    teacup2.position.set(-0.45, 0.52, -0.05);
    table.add(teapot, teacup1, teacup2);

    // Grilled Sea Bream Platter
    const platter = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.03, 16), MAT.plasterWarm);
    platter.position.set(0.3, 0.5, 0.1);
    table.add(platter);

    const fish = new THREE.Group();
    const fishBody = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), MAT.grilledFish);
    fishBody.scale.set(1.5, 0.5, 0.6);
    const fishTail = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.16, 4), MAT.grilledFish);
    fishTail.rotation.z = Math.PI / 2;
    fishTail.position.x = -0.24;
    fish.add(fishBody, fishTail);
    fish.position.set(0.3, 0.56, 0.1);
    table.add(fish);
    this.fishMesh = fish;

    table.position.set(0, 0, -0.2);
    root.add(table);

    // 5. Plush Velvet Zabuton Nap Bed (Cozy Nap Spot)
    const bed = new THREE.Group();
    const zabuton = box(0.9, 0.16, 0.9, MAT.cushionRed, 0, 0.08, 0);
    bed.add(zabuton);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        bed.add(box(0.06, 0.04, 0.06, MAT.goldAntique, sx * 0.42, 0.08, sz * 0.42));
      }
    }
    bed.position.set(-2.2, 0, -1.2);
    root.add(bed);

    // 6. Paper Andon Floor Lantern (Warm ambient lighting)
    const andon = new THREE.Group();
    andon.add(box(0.44, 0.06, 0.44, MAT.timberDark, 0, 0.03, 0));
    andon.add(box(0.36, 0.8, 0.36, MAT.lanternPaper, 0, 0.43, 0));
    andon.add(box(0.42, 0.05, 0.42, MAT.timberDark, 0, 0.85, 0));
    andon.position.set(2.8, 0, -2.2);
    root.add(andon);

    // Warm indoor point light
    const indoorLight = new THREE.PointLight(0xffb855, 1.8, 12, 1.2);
    indoorLight.position.set(2.8, 1.2, -2.2);
    root.add(indoorLight);

    const ambientRoomLight = new THREE.PointLight(0xffdfa8, 1.2, 14, 1.0);
    ambientRoomLight.position.set(0, 2.6, 0);
    root.add(ambientRoomLight);

    // 7. Engawa Veranda & Private Zen Courtyard (Right side)
    const engawa = box(1.6, 0.22, 4.4, MAT.timberEngawa, 4.9, 0.11, 0);
    root.add(engawa);
    // Courtyard rock garden gravel
    const garden = box(4.0, 0.1, 6.0, MAT.plasterWarm, 7.2, -0.05, 0);
    root.add(garden);
    // Stone Toro lantern in courtyard
    const toro = new THREE.Group();
    toro.add(box(0.4, 0.1, 0.4, MAT.stoneToro, 0, 0.05, 0));
    toro.add(box(0.2, 0.5, 0.2, MAT.stoneToro, 0, 0.35, 0));
    toro.add(box(0.38, 0.35, 0.38, MAT.lanternPaper, 0, 0.75, 0));
    toro.add(box(0.55, 0.12, 0.55, MAT.stoneToro, 0, 0.98, 0));
    toro.position.set(7.2, 0, -1.2);
    root.add(toro);
    // Courtyard outer timber wall
    root.add(box(0.3, 3.2, 6.4, MAT.timberDark, 9.2, 1.6, 0));
    root.add(box(5.0, 3.2, 0.3, MAT.timberDark, 6.8, 1.6, -3.2));
    root.add(box(5.0, 3.2, 0.3, MAT.timberDark, 6.8, 1.6, 3.2));

    // 8. Sliding Exit Door (Front center)
    const exitDoor = new THREE.Group();
    exitDoor.add(box(2.6, 2.2, 0.08, MAT.shoji, 0, 1.1, 0));
    exitDoor.position.set(0, 0, 3.6);
    root.add(exitDoor);

    // 9. Build Room Colliders (Interior boundaries)
    const bx = (minX, maxX, minZ, maxZ, minY = 0, maxY = 3.6) => {
      this.colliders.push(new THREE.Box3(
        new THREE.Vector3(this.origin.x + minX, this.origin.y + minY, this.origin.z + minZ),
        new THREE.Vector3(this.origin.x + maxX, this.origin.y + maxY, this.origin.z + maxZ)
      ));
    };

    // North wall
    bx(-4.3, 4.3, -3.9, -3.4);
    // West wall
    bx(-4.3, -3.9, -3.6, 3.6);
    // South wall wings
    bx(-4.3, -1.2, 3.4, 3.9);
    bx(1.2, 4.3, 3.4, 3.9);
    // East outer garden wall
    bx(9.0, 9.5, -3.4, 3.4);
    bx(4.0, 9.5, -3.4, -3.0);
    bx(4.0, 9.5, 3.0, 3.4);
    // Table collider
    bx(-1.0, 1.0, -0.9, 0.5, 0, 0.6);

    // Table platform
    this.platforms.push(new THREE.Box3(
      new THREE.Vector3(this.origin.x - 1.0, this.origin.y + 0.44, this.origin.z - 0.9),
      new THREE.Vector3(this.origin.x + 1.0, this.origin.y + 0.58, this.origin.z + 0.5)
    ));
  }

  getGroundHeight(x, z) {
    if (!this.isInside) return 0;
    // Check platforms inside room
    for (const p of this.platforms) {
      if (x >= p.min.x && x <= p.max.x && z >= p.min.z && z <= p.max.z) {
        return p.max.y;
      }
    }
    return this.origin.y;
  }

  transitionToInterior(onComplete = null) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    if (this.game.audio) this.game.audio.playDoorSlide();
    if (this.wipeEl) {
      this.wipeEl.classList.remove('hidden');
      requestAnimationFrame(() => this.wipeEl.classList.add('closed'));
    }

    setTimeout(() => {
      this.isInside = true;
      // Position player at entrance threshold facing the warm room
      const p = this.game.player;
      p.mesh.position.set(this.origin.x, this.origin.y, this.origin.z + 2.6);
      p.heading = Math.PI; // Face north into the room
      p.yaw = Math.PI;
      p.mesh.rotation.y = Math.PI;
      p.velocity.set(0, 0, 0);

      // Align camera
      const cam = this.game.camera;
      cam.position.set(this.origin.x, this.origin.y + 1.4, this.origin.z + 4.6);
      cam.lookAt(p.mesh.position.x, p.mesh.position.y + 0.35, p.mesh.position.z);

      this.game.ui.showToast('Welcome to Hisomu-an Tea House');

      setTimeout(() => {
        if (this.wipeEl) {
          this.wipeEl.classList.remove('closed');
          setTimeout(() => this.wipeEl.classList.add('hidden'), 500);
        }
        this.isTransitioning = false;
        if (onComplete) onComplete();
      }, 350);
    }, 450);
  }

  transitionToExterior(onComplete = null) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    if (this.game.audio) this.game.audio.playDoorSlide();
    if (this.wipeEl) {
      this.wipeEl.classList.remove('hidden');
      requestAnimationFrame(() => this.wipeEl.classList.add('closed'));
    }

    setTimeout(() => {
      this.isInside = false;
      // Position player outdoors in front of tea house door
      const world = this.game.city;
      const spawn = world.secretDoorSpawnPos || new THREE.Vector3(20.0, 0.0, 14.5);
      const heading = world.secretDoorOutHeading !== undefined ? world.secretDoorOutHeading : 0;
      const p = this.game.player;
      p.mesh.position.set(spawn.x, 0.0, spawn.z);
      p.heading = heading;
      p.yaw = heading;
      p.mesh.rotation.y = heading;
      p.velocity.set(0, 0, 0);

      const cam = this.game.camera;
      const camDir = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
      cam.position.set(spawn.x + camDir.x * 3.0, 1.5, spawn.z + camDir.z * 3.0);
      cam.lookAt(p.mesh.position.x, p.mesh.position.y + 0.35, p.mesh.position.z);

      setTimeout(() => {
        if (this.wipeEl) {
          this.wipeEl.classList.remove('closed');
          setTimeout(() => this.wipeEl.classList.add('hidden'), 500);
        }
        this.isTransitioning = false;
        if (onComplete) onComplete();
      }, 350);
    }, 450);
  }

  eatFish() {
    this.fishEaten = true;
    if (this.fishMesh) this.fishMesh.visible = false;
  }
}
