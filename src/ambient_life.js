import * as THREE from 'three';

export class AmbientLife {
  constructor(scene, audio = null) {
    this.scene = scene;
    this.audio = audio;
    this.time = 0;
    this.nestPos = new THREE.Vector3(-14, 3.85, -4.5);
    this.buildBirds();
    this.buildGuardianBirds();
    this.buildButterflies();
    this.buildKoi();
  }

  buildBirds() {
    this.birds = [];
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x5a4e44, roughness: 0.9, flatShading: true });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x6e6054, roughness: 0.9, side: THREE.DoubleSide });

    for (let i = 0; i < 14; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.38, 4), bodyMat);
      body.rotation.x = Math.PI / 2;
      g.add(body);

      const lWing = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.12), wingMat);
      lWing.position.set(0, 0.05, 0.04);
      lWing.rotation.y = 0.35;
      g.add(lWing);

      const rWing = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.12), wingMat);
      rWing.position.set(0, -0.05, 0.04);
      rWing.rotation.y = -0.35;
      g.add(rWing);

      const cx = (Math.random() - 0.5) * 90;
      const cz = (Math.random() - 0.5) * 90;
      const yBase = 9 + Math.random() * 8;
      g.position.set(cx + Math.random() * 10, yBase, cz + Math.random() * 10);
      this.scene.add(g);

      this.birds.push({
        mesh: g,
        wings: [lWing, rWing],
        center: new THREE.Vector3(cx, yBase, cz),
        radius: 6 + Math.random() * 12,
        speed: 0.25 + Math.random() * 0.35,
        yAmp: 0.8 + Math.random(),
        yFreq: 0.3 + Math.random() * 0.3,
        seed: Math.random() * 100,
        wingSpeed: 12 + Math.random() * 6
      });
    }
  }

  buildGuardianBirds() {
    this.guardianBirds = [];
    const crowBodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1a24, roughness: 0.6, metalness: 0.2 });
    const crowWingMat = new THREE.MeshStandardMaterial({ color: 0x222230, roughness: 0.6, side: THREE.DoubleSide });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xe0a020, roughness: 0.4 });

    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.52, 6), crowBodyMat);
      body.rotation.x = Math.PI / 2;
      g.add(body);

      // Yellow/orange beak
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 4), beakMat);
      beak.rotation.x = -Math.PI / 2;
      beak.position.set(0, 0, 0.32);
      g.add(beak);

      const lWing = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.18), crowWingMat);
      lWing.position.set(-0.2, 0.04, 0.05);
      g.add(lWing);

      const rWing = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.18), crowWingMat);
      rWing.position.set(0.2, 0.04, 0.05);
      g.add(rWing);

      g.position.set(this.nestPos.x + (i === 0 ? 1.5 : -1.5), 7.5, this.nestPos.z);
      this.scene.add(g);

      this.guardianBirds.push({
        mesh: g,
        wings: [lWing, rWing],
        state: 'circle',
        circleAngle: i * Math.PI,
        swoopProgress: 0,
        swoopStart: new THREE.Vector3(),
        swoopTarget: new THREE.Vector3(),
        swoopTimer: 2.5 + i * 2.0,
        swoopCount: 0,
        isAggro: false
      });
    }
  }

  updateGuardianBirds(dt, t, playerPos, playerCat) {
    const distToNest = playerPos ? playerPos.distanceTo(this.nestPos) : 999;
    const isPlayerNearNest = distToNest < 6.5 && playerPos.y > 1.8;

    for (let i = 0; i < this.guardianBirds.length; i++) {
      const gb = this.guardianBirds[i];
      const flapSpeed = (gb.state === 'dive') ? 22 : 11;
      const flap = Math.sin(t * flapSpeed + i * 2.5);
      gb.wings[0].rotation.z = 0.16 + flap * 0.7;
      gb.wings[1].rotation.z = -0.16 - flap * 0.7;

      if (isPlayerNearNest && !gb.isAggro) {
        gb.isAggro = true;
        if (this.audio) this.audio.playSquawk();
        if (playerCat) playerCat.setMood('startled', 1.0, 2);
      }

      if (!isPlayerNearNest && gb.isAggro && gb.state === 'circle') {
        gb.isAggro = false;
        gb.swoopTimer = 2.5 + i * 0.8;
      }

      if (gb.isAggro) {
        gb.swoopTimer -= dt;

        if (gb.state === 'circle') {
          gb.circleAngle += dt * 2.2;
          const cx = this.nestPos.x + Math.cos(gb.circleAngle) * 3.5;
          const cz = this.nestPos.z + Math.sin(gb.circleAngle) * 3.5;
          const cy = this.nestPos.y + 3.8 + Math.sin(t * 2 + i) * 0.5;
          gb.mesh.position.set(cx, cy, cz);
          gb.mesh.lookAt(playerPos.x, playerPos.y + 0.4, playerPos.z);

          if (gb.swoopTimer <= 0 && isPlayerNearNest) {
            // Initiate Dive Bomb Swoop!
            gb.state = 'dive';
            gb.swoopProgress = 0;
            gb.swoopStart.copy(gb.mesh.position);
            gb.swoopTarget.copy(playerPos).add(new THREE.Vector3(0, 0.4, 0));
            gb.swoopTimer = 3.5 + Math.random() * 2.0;
            if (this.audio) this.audio.playSquawk();
          }
        } else if (gb.state === 'dive') {
          gb.swoopProgress += dt * 1.6;
          const p = gb.swoopProgress;
          if (p < 0.5) {
            // Swooping down at cat
            const tDown = p / 0.5;
            gb.mesh.position.lerpVectors(gb.swoopStart, gb.swoopTarget, tDown);
            gb.mesh.lookAt(gb.swoopTarget);

            // Close call check
            if (p > 0.42 && playerPos && gb.mesh.position.distanceTo(playerPos) < 1.1) {
              if (playerCat && playerCat.mood !== 'startled') {
                playerCat.setMood('startled', 0.8, 3);
              }
            }
          } else if (p < 1.0) {
            // Swooping back up into sky
            const tUp = (p - 0.5) / 0.5;
            const recoverTarget = this.nestPos.clone().add(new THREE.Vector3(
              Math.cos(gb.circleAngle) * 4,
              4.5,
              Math.sin(gb.circleAngle) * 4
            ));
            gb.mesh.position.lerpVectors(gb.swoopTarget, recoverTarget, tUp);
            gb.mesh.lookAt(recoverTarget);
          } else {
            gb.state = 'circle';
            gb.swoopCount++;
          }
        }
      } else {
        // Peaceful high ambient circling above nest
        gb.circleAngle += dt * 0.8;
        const cx = this.nestPos.x + Math.cos(gb.circleAngle) * 5.5;
        const cz = this.nestPos.z + Math.sin(gb.circleAngle) * 5.5;
        const cy = this.nestPos.y + 4.5 + Math.sin(t * 1.2 + i) * 0.6;
        gb.mesh.position.set(cx, cy, cz);
        const nextAngle = gb.circleAngle + 0.1;
        gb.mesh.lookAt(
          this.nestPos.x + Math.cos(nextAngle) * 5.5,
          cy,
          this.nestPos.z + Math.sin(nextAngle) * 5.5
        );
      }
    }
  }

  scatterKoi(x, z) {
    for (const k of this.koi) {
      const dx = k.x - x;
      const dz = k.z - z;
      const d2 = dx * dx + dz * dz;
      if (d2 < 16) {
        k.direction = Math.sign(dx || (Math.random() - 0.5)) || 1;
        k.fleeTimer = 1.8 + Math.random() * 0.8;
        k.speed = 2.0 + Math.random() * 0.6;
      }
    }
  }

  butterflyTexture() {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = 'rgba(255, 245, 220, 0.95)';
    ctx.beginPath();
    ctx.ellipse(9, 16, 7, 11, -0.2, 0, Math.PI * 2);
    ctx.ellipse(23, 16, 7, 11, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(70, 50, 40, 0.8)';
    ctx.beginPath();
    ctx.ellipse(16, 16, 1.5, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    return new THREE.CanvasTexture(c);
  }

  buildButterflies() {
    const count = 50;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    this.bflySeeds = new Float32Array(count * 3);
    const zones = [[-20, 14], [12, 24], [0, 31], [26, 4], [0, -26], [-15, -10], [18, -5]];
    const palette = [new THREE.Color(0xffcc44), new THREE.Color(0x66ccff), new THREE.Color(0xff88aa), new THREE.Color(0xaaff66)];

    for (let i = 0; i < count; i++) {
      const [zx, zz] = zones[i % zones.length];
      pos[i * 3] = zx + (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = 0.8 + Math.random() * 1.6;
      pos[i * 3 + 2] = zz + (Math.random() - 0.5) * 10;
      this.bflySeeds[i * 3] = Math.random() * 100;
      this.bflySeeds[i * 3 + 1] = 0.4 + Math.random() * 0.6;
      this.bflySeeds[i * 3 + 2] = 0.6 + Math.random() * 1.2;
      const color = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.bflyMat = new THREE.PointsMaterial({
      map: this.butterflyTexture(),
      size: 0.22,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      sizeAttenuation: true
    });
    this.butterflies = new THREE.Points(geo, this.bflyMat);
    this.butterflies.frustumCulled = false;
    this.scene.add(this.butterflies);
  }

  buildKoi() {
    this.koi = [];
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xe85b32, roughness: 0.48, flatShading: true });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffe5c5, roughness: 0.55, flatShading: true });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xffc69d, roughness: 0.5, flatShading: true, side: THREE.DoubleSide });

    for (let i = 0; i < 18; i++) {
      const fish = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), i % 3 === 0 ? whiteMat : orangeMat);
      body.scale.set(1.45, 0.42, 0.62);
      fish.add(body);
      const patch = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), i % 3 === 0 ? orangeMat : whiteMat);
      patch.position.set(0.05, 0.055, 0);
      patch.scale.set(1.35, 0.24, 0.72);
      fish.add(patch);

      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 4), tailMat);
      tail.rotation.z = Math.PI / 2;
      tail.position.x = -0.29;
      fish.add(tail);

      const x = -45 + Math.random() * 100;
      const lane = (Math.random() - 0.5) * 4.1;
      const z = 29.5 + lane;
      fish.position.set(x, 0.08, z);
      this.scene.add(fish);

      this.koi.push({
        mesh: fish,
        x,
        z,
        cruiseSpeed: 0.45 + Math.random() * 0.45,
        speed: 0.45 + Math.random() * 0.45,
        direction: Math.random() < 0.5 ? -1 : 1,
        lane,
        fleeTimer: 0,
        wobble: Math.random() * 100,
        tail
      });
    }
  }

  updateBirds(dt, t, sky) {
    const sunUp = sky ? Math.max(0, sky.sunDir.y) : 1;
    const raining = sky && sky.weather === 'rain';
    const active = sunUp > 0.1 && !raining;

    for (const b of this.birds) {
      if (!active) {
        b.mesh.visible = false;
        continue;
      }
      b.mesh.visible = true;

      const angle = t * b.speed + b.seed;
      const r = b.radius;
      const nx = b.center.x + Math.cos(angle) * r;
      const nz = b.center.z + Math.sin(angle * 0.85) * r * 0.65;
      const y = b.center.y + Math.sin(t * b.yFreq + b.seed) * b.yAmp;

      const nextAngle = angle + 0.12;
      const tx = b.center.x + Math.cos(nextAngle) * r;
      const tz = b.center.z + Math.sin(nextAngle * 0.85) * r * 0.65;
      const ty = b.center.y + Math.sin(t * b.yFreq + b.seed + 0.05) * b.yAmp;

      b.mesh.position.set(nx, y, nz);
      b.mesh.lookAt(tx, ty, tz);

      const flap = Math.sin(t * b.wingSpeed + b.seed);
      b.wings[0].rotation.z = flap * 0.45;
      b.wings[1].rotation.z = -flap * 0.45;
    }
  }

  updateButterflies(dt, t, sky, playerPos) {
    const sunUp = sky ? Math.max(0, sky.sunDir.y) : 1;
    const raining = sky && sky.weather === 'rain';
    const day = sunUp > 0.2 && !raining;
    const target = day ? 0.85 : 0;
    this.bflyMat.opacity += (target - this.bflyMat.opacity) * dt * 2;

    const bp = this.butterflies.geometry.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const seed = this.bflySeeds[i * 3];
      const speed = this.bflySeeds[i * 3 + 1];
      const height = this.bflySeeds[i * 3 + 2];
      let x = bp.getX(i) + Math.sin(t * speed + seed) * dt * 0.4 + Math.cos(t * 0.7 + seed) * dt * 0.15;
      let z = bp.getZ(i) + Math.cos(t * speed * 0.8 + seed * 1.3) * dt * 0.4;
      let y = 0.6 + height + Math.sin(t * 1.4 + seed) * 0.25;
      if (playerPos && Math.abs(x - playerPos.x) > 40) x = playerPos.x + (Math.random() - 0.5) * 30;
      if (playerPos && Math.abs(z - playerPos.z) > 40) z = playerPos.z + (Math.random() - 0.5) * 30;
      bp.setXYZ(i, x, y, z);
    }
    bp.needsUpdate = true;
  }

  updateKoi(dt, t) {
    for (const k of this.koi) {
      if (k.fleeTimer > 0) {
        k.fleeTimer -= dt;
        if (k.fleeTimer <= 0) k.speed = k.cruiseSpeed;
      }
      k.x += k.direction * k.speed * dt;
      if (k.x > 62 || k.x < -52) {
        k.direction *= -1;
        k.x = THREE.MathUtils.clamp(k.x, -52, 62);
      }
      const z = 29.5 + k.lane + Math.sin(t * 0.55 + k.wobble) * 0.34;
      const y = 0.075 + Math.sin(t * 1.8 + k.wobble) * 0.018;
      k.mesh.position.set(k.x, y, z);
      k.tail.rotation.y = Math.sin(t * (8 + k.speed * 2) + k.wobble) * 0.58;
      k.mesh.lookAt(k.x + k.direction, y, z + Math.cos(t * 0.55 + k.wobble) * 0.18);
    }
  }

  update(dt, playerPos, sky = null, playerCat = null) {
    this.time += dt;
    const t = this.time;
    this.updateBirds(dt, t, sky);
    this.updateGuardianBirds(dt, t, playerPos, playerCat);
    this.updateButterflies(dt, t, sky, playerPos);
    this.updateKoi(dt, t);
  }
}
