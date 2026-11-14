// Quiet summit wildlife (天上), split out of src/mountaintop.js: the
// butterfly visits around the perch and the pooled fly-by birds over the bay.
// SummitManager (src/mountaintop.js) delegates to these methods with
// `this` = the manager, so the code reads exactly as it did in the class.

import * as THREE from 'three';
import { summitWeatherAmount, summitFootprint, pointsPosition } from './common.js?v=20261113a';

function summitBirdWingGeometry() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0.02, 0, 0.1,   0.92, 0, 0.02,   0.56, 0, -0.22,
    0.02, 0, 0.1,   0.56, 0, -0.22,  0.08, 0, -0.13
  ]), 3));
  geo.computeVertexNormals();
  return geo;
}

function summitBirdTailGeometry() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    -0.11, 0, 0,  0.11, 0, 0,  -0.2, 0, -0.42,
     0.11, 0, 0,  0.2, 0, -0.42,  0, 0, -0.28
  ]), 3));
  geo.computeVertexNormals();
  return geo;
}

export const wildlifeMethods = {
  butterflyTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 64, 64);
    const wing = ctx.createRadialGradient(18, 28, 2, 18, 28, 19);
    wing.addColorStop(0, 'rgba(255,255,244,1)');
    wing.addColorStop(0.58, 'rgba(255,236,166,0.96)');
    wing.addColorStop(1, 'rgba(255,205,92,0)');
    ctx.fillStyle = wing;
    ctx.beginPath();
    ctx.ellipse(17, 28, 16, 23, -0.24, 0, Math.PI * 2);
    ctx.ellipse(47, 28, 16, 23, 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(65,43,27,0.9)';
    ctx.beginPath();
    ctx.ellipse(32, 33, 2.4, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  },

  buildAmbientWildlife() {
    // Butterflies are one inexpensive point cloud whose whole visit fades in
    // and out. Anchors are kept separately so their drift never accumulates
    // away from the flowers during a long meditation.
    // Layout: the wildlife's stream draws in the classic order (per butterfly
    // its anchor, seeds and colour, per bird its wingbeat phase, then the
    // first fly-by and visit timers). Anchors, seeds and timers stay on the
    // manager: update() reads them in both sets.
    const butterflyCount = this.previewQuality ? 8 : 18;
    const positions = new Float32Array(butterflyCount * 3);
    const colors = new Float32Array(butterflyCount * 3);
    this._butterflyAnchors = new Float32Array(butterflyCount * 3);
    this._butterflySeeds = new Float32Array(butterflyCount * 3);
    const palette = [0xffd34e, 0x73c9ff, 0xff91b5, 0xd9f278, 0xf7f0e5];
    const color = new THREE.Color();
    for (let i = 0; i < butterflyCount; i++) {
      const a = this.rng() * Math.PI * 2;
      const r = 1.5 + Math.sqrt(this.rng()) * 5.6;
      const x = this.perchLocal.x + Math.cos(a) * r;
      const z = this.perchLocal.z + Math.sin(a) * r;
      const y = 0.65 + this.rng() * 1.15;
      positions[i * 3] = this._butterflyAnchors[i * 3] = x;
      positions[i * 3 + 1] = this._butterflyAnchors[i * 3 + 1] = y;
      positions[i * 3 + 2] = this._butterflyAnchors[i * 3 + 2] = z;
      this._butterflySeeds[i * 3] = this.rng() * 100;
      this._butterflySeeds[i * 3 + 1] = 0.55 + this.rng() * 0.65;
      this._butterflySeeds[i * 3 + 2] = 0.35 + this.rng() * 0.55;
      color.setHex(palette[Math.floor(this.rng() * palette.length)]);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    const birdPhases = [];
    for (let i = 0; i < 4; i++) birdPhases.push(this.rng() * Math.PI * 2);
    this._birdLook = new THREE.Vector3();
    this._birdFlybyTimer = 5 + this.rng() * 7;
    this._butterflyVisitTimer = 2 + this.rng() * 4;
    this._butterflyVisit = 0;

    const butterflies = {
      index: 0, name: 'Summit Butterfly Visitors', x: 0, y: 0, z: 0, positions, colors,
      footprint: summitFootprint(), bind: { butterflies: 'swarm' }
    };
    this.placeAsset('summit-butterflies', butterflies, () => wildlifeMethods.meshButterfliesClassic.call(this, butterflies));
    const birds = { index: 0, x: 0, y: 0, z: 0, phases: birdPhases, footprint: summitFootprint() };
    this.placeAsset('summit-birds', birds, () => wildlifeMethods.meshBirdsClassic.call(this, birds));
    // summit-wildlife is the umbrella row (the butterflies and birds, routed
    // above): the classic set adds nothing of its own; a kit may add visitors.
    const visitors = { index: 0, x: 0, y: 0, z: 0, footprint: summitFootprint() };
    return this.placeAsset('summit-wildlife', visitors, () => null);
  },

  meshButterfliesClassic(layout) {
    const { positions, colors } = layout;
    const butterflyGeo = new THREE.BufferGeometry();
    butterflyGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    butterflyGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.butterflyMat = new THREE.PointsMaterial({
      map: this.butterflyTexture(), size: 0.34, transparent: true, opacity: 0,
      depthWrite: false, vertexColors: true, sizeAttenuation: true
    });
    this.butterflies = new THREE.Points(butterflyGeo, this.butterflyMat);
    this.butterflies.name = 'Summit Butterfly Visitors';
    this.butterflies.frustumCulled = false;
    this.butterflies.visible = false;
    this.group.add(this.butterflies);
  },

  meshBirdsClassic(layout) {
    // A tiny pool of individually articulated birds. They stay hidden until
    // a seeded fly-by, then cross the bay in loose formation and park again.
    const wingGeo = summitBirdWingGeometry();
    const tailGeo = summitBirdTailGeometry();
    const bodyGeo = new THREE.SphereGeometry(0.23, 8, 6);
    const headGeo = new THREE.SphereGeometry(0.135, 8, 6);
    const beakGeo = new THREE.ConeGeometry(0.045, 0.15, 6);
    const birdColors = [
      [0x315f82, 0x8fc6df, 0xe8a33b], // kingfisher blue
      [0xf0eee5, 0xc8d1d4, 0xd6a642], // pale gull
      [0x4b4039, 0x9a6f54, 0xc89335], // mountain thrush
      [0x263c53, 0x718ba0, 0xe0a33d]
    ];
    this.summitBirds = [];
    for (let i = 0; i < 4; i++) {
      const [bodyCol, wingCol, beakCol] = birdColors[i % birdColors.length];
      const bodyMat = new THREE.MeshStandardMaterial({ color: bodyCol, roughness: 0.88, flatShading: true });
      const wingMat = new THREE.MeshStandardMaterial({ color: wingCol, roughness: 0.9, side: THREE.DoubleSide });
      const beakMat = new THREE.MeshStandardMaterial({ color: beakCol, roughness: 0.72 });
      const bird = new THREE.Group();
      bird.name = `Summit Fly-by Bird ${i + 1}`;
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.scale.set(0.85, 0.68, 1.45);
      bird.add(body);
      const head = new THREE.Mesh(headGeo, bodyMat);
      head.position.set(0, 0.045, 0.31);
      bird.add(head);
      const beak = new THREE.Mesh(beakGeo, beakMat);
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 0.025, 0.48);
      bird.add(beak);
      const leftWing = new THREE.Mesh(wingGeo, wingMat);
      leftWing.position.set(0.04, 0.05, 0.06);
      bird.add(leftWing);
      const rightWing = new THREE.Mesh(wingGeo, wingMat);
      rightWing.scale.x = -1;
      rightWing.position.set(-0.04, 0.05, 0.06);
      bird.add(rightWing);
      const tail = new THREE.Mesh(tailGeo, wingMat);
      tail.position.set(0, 0, -0.23);
      bird.add(tail);
      bird.visible = false;
      this.group.add(bird);
      this.summitBirds.push({
        mesh: bird, wings: [leftWing, rightWing], active: false, age: 0,
        duration: 0, direction: 1, startX: 0, baseY: 0, baseZ: 0,
        span: 0, depthDrift: 0, phase: layout.phases[i]
      });
    }
  },

  startBirdFlyby() {
    const count = 1 + Math.floor(this.rng() * 3);
    const direction = this.rng() < 0.5 ? 1 : -1;
    const baseY = 7 + this.rng() * 8;
    const baseZ = 36 + this.rng() * 54;
    // The pool is the classic birds' (a kit summit-birds brings none unless
    // its footprint anchors set summitBirds); a missing pool flies nobody.
    const birds = this.summitBirds || [];
    for (let i = 0; i < birds.length; i++) {
      const bird = birds[i];
      if (i >= count) {
        bird.active = false;
        bird.mesh.visible = false;
        continue;
      }
      bird.active = true;
      bird.age = -i * (0.32 + this.rng() * 0.24);
      bird.duration = 8 + this.rng() * 5;
      bird.direction = direction;
      bird.startX = direction > 0 ? -48 - i * 2.8 : 48 + i * 2.8;
      bird.baseY = baseY + i * 0.65 + (this.rng() - 0.5) * 1.2;
      bird.baseZ = baseZ + i * 2.6 + (this.rng() - 0.5) * 4;
      bird.span = 96 + this.rng() * 18;
      bird.depthDrift = (this.rng() - 0.5) * 18;
      bird.mesh.scale.setScalar(0.85 + this.rng() * 0.55);
      bird.mesh.visible = false;
    }
    this._birdFlybyTimer = 18 + this.rng() * 30;
  },

  updateAmbientWildlife(dt, t, sky) {
    const snowing = summitWeatherAmount(sky, 'snow') > 0.45;
    this._birdFlybyTimer -= dt;
    if (!snowing && this._birdFlybyTimer <= 0) this.startBirdFlyby();
    for (const bird of this.summitBirds || []) {
      if (!bird.active) continue;
      bird.age += dt;
      if (bird.age < 0) continue;
      const u = bird.age / bird.duration;
      if (u >= 1 || snowing) {
        bird.active = false;
        bird.mesh.visible = false;
        continue;
      }
      bird.mesh.visible = true;
      const x = bird.startX + bird.direction * bird.span * u;
      const y = bird.baseY + Math.sin(u * Math.PI) * 4.2 + Math.sin(t * 0.8 + bird.phase) * 0.45;
      const z = bird.baseZ + (u - 0.5) * bird.depthDrift + Math.sin(u * Math.PI * 2 + bird.phase) * 1.4;
      bird.mesh.position.set(x, y, z);
      this._birdLook.set(x + bird.direction * 3, y + Math.cos(u * Math.PI) * 0.3, z + bird.depthDrift * 0.025);
      bird.mesh.lookAt(this._birdLook);
      const flap = Math.sin(t * 11.5 + bird.phase) * 0.62;
      bird.wings[0].rotation.z = flap;
      bird.wings[1].rotation.z = -flap;
    }

    this._butterflyVisitTimer -= dt;
    if (!snowing && this._butterflyVisit <= 0 && this._butterflyVisitTimer <= 0) {
      this._butterflyVisit = 12 + this.rng() * 12;
      this._butterflyVisitTimer = this._butterflyVisit + 16 + this.rng() * 24;
    }
    if (this._butterflyVisit > 0) this._butterflyVisit -= dt;
    const butterflyTarget = !snowing && this._butterflyVisit > 0 ? 0.92 : 0;
    // Kit-safe: the material is the classic step's, so a kit swarm (bound
    // as 'swarm') has none and simply shows for the visit; its points move
    // only if it is a point cloud, and no further than the layout's seeds.
    const mat = this.butterflyMat;
    if (mat) mat.opacity += (butterflyTarget - mat.opacity) * Math.min(1, dt * 1.6);
    if (!this.butterflies) return;
    this.butterflies.visible = (mat ? mat.opacity : butterflyTarget) > 0.015;
    const bp = this.butterflies.visible ? pointsPosition(this.butterflies) : null;
    if (bp && this._butterflySeeds && this._butterflyAnchors) {
      const count = Math.min(bp.count, this._butterflySeeds.length / 3, this._butterflyAnchors.length / 3);
      for (let i = 0; i < count; i++) {
        const seed = this._butterflySeeds[i * 3];
        const speed = this._butterflySeeds[i * 3 + 1];
        const range = this._butterflySeeds[i * 3 + 2];
        const ax = this._butterflyAnchors[i * 3];
        const ay = this._butterflyAnchors[i * 3 + 1];
        const az = this._butterflyAnchors[i * 3 + 2];
        bp.setXYZ(
          i,
          ax + Math.sin(t * speed + seed) * range + Math.cos(t * 0.43 + seed) * 0.25,
          ay + Math.sin(t * (1.2 + speed * 0.4) + seed * 1.7) * 0.32,
          az + Math.cos(t * speed * 0.82 + seed * 1.3) * range
        );
      }
      bp.needsUpdate = true;
    }
  },

  resetAmbientWildlife() {
    if (this.butterflyMat) this.butterflyMat.opacity = 0;
    if (this.butterflies) this.butterflies.visible = false;
    this._butterflyVisit = 0;
    this._butterflyVisitTimer = 2 + this.rng() * 4;
    this._birdFlybyTimer = 5 + this.rng() * 7;
    for (const bird of this.summitBirds || []) {
      bird.active = false;
      bird.mesh.visible = false;
    }
  }
};
