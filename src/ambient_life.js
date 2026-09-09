import * as THREE from 'three';

/**
 * Shared low-poly bird geometries. Only ~17 birds ever exist at once, so
 * we can afford a proper tapered body, a swept curved wing rooted at the
 * shoulder (rather than a flat rectangle straddling the body) and a small
 * forked tail — a much better silhouette than a bare cone, at a
 * negligible triangle cost. Nose points local +Z, matching the existing
 * `body.rotation.x = Math.PI / 2` convention used for every bird.
 */
let _birdBodyGeo = null, _birdWingGeo = null, _birdTailGeo = null;

function birdBodyGeometry() {
  if (_birdBodyGeo) return _birdBodyGeo;
  const profile = [
    new THREE.Vector2(0.0, -0.19),
    new THREE.Vector2(0.028, -0.08),
    new THREE.Vector2(0.042, 0.03),
    new THREE.Vector2(0.026, 0.13),
    new THREE.Vector2(0.0, 0.19)
  ];
  const geo = new THREE.LatheGeometry(profile, 6);
  geo.computeVertexNormals();
  _birdBodyGeo = geo;
  return geo;
}

function birdWingGeometry() {
  if (_birdWingGeo) return _birdWingGeo;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.008);
  shape.quadraticCurveTo(0.035, 0.028, 0.11, 0.038);
  shape.quadraticCurveTo(0.2, 0.042, 0.28, 0.014);
  shape.quadraticCurveTo(0.2, -0.01, 0.11, -0.016);
  shape.quadraticCurveTo(0.04, -0.02, 0, -0.006);
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape, 4);
  geo.computeVertexNormals();
  _birdWingGeo = geo;
  return geo;
}

function birdTailGeometry() {
  if (_birdTailGeo) return _birdTailGeo;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.02);
  shape.lineTo(0.15, 0.065);
  shape.lineTo(0.09, 0.0);
  shape.lineTo(0.15, -0.065);
  shape.lineTo(0, -0.02);
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  geo.computeVertexNormals();
  _birdTailGeo = geo;
  return geo;
}

export class AmbientLife {
  constructor(scene, audio = null, nestPos = null) {
    this.scene = scene;
    this.audio = audio;
    this.time = 0;
    this.nestPos = nestPos ? nestPos.clone() : new THREE.Vector3(-12.55, 4.9, -3.55);
    this.buildBirds();
    this.buildGuardianBirds();
    this.buildButterflies();
    this.buildKoi();
  }

  buildBirds() {
    this.birds = [];
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x5a4e44, roughness: 0.9, flatShading: true });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x6e6054, roughness: 0.9, side: THREE.DoubleSide });
    const bodyGeo = birdBodyGeometry();
    const wingGeo = birdWingGeometry();
    const tailGeo = birdTailGeometry();

    for (let i = 0; i < 14; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.rotation.x = Math.PI / 2;
      g.add(body);

      // Wings root right at the shoulder and sweep outward, instead of the
      // old flat rectangle straddling the body
      const lWing = new THREE.Mesh(wingGeo, wingMat);
      lWing.position.set(0.015, 0.008, 0.05);
      g.add(lWing);

      const rWing = new THREE.Mesh(wingGeo, wingMat);
      rWing.scale.x = -1;
      rWing.position.set(-0.015, 0.008, 0.05);
      g.add(rWing);

      const tail = new THREE.Mesh(tailGeo, wingMat);
      tail.position.set(0, 0, -0.19);
      tail.rotation.y = Math.PI / 2;
      g.add(tail);

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
    const scale = 1.4;
    const bodyGeo = birdBodyGeometry();
    const wingGeo = birdWingGeometry();
    const tailGeo = birdTailGeometry();

    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, crowBodyMat);
      body.scale.setScalar(scale);
      body.rotation.x = Math.PI / 2;
      g.add(body);

      // Yellow/orange beak
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 4), beakMat);
      beak.rotation.x = -Math.PI / 2;
      beak.position.set(0, 0, 0.32);
      g.add(beak);

      const lWing = new THREE.Mesh(wingGeo, crowWingMat);
      lWing.scale.setScalar(scale);
      lWing.position.set(0.025, 0.012, 0.09);
      g.add(lWing);

      const rWing = new THREE.Mesh(wingGeo, crowWingMat);
      rWing.scale.set(-scale, scale, scale);
      rWing.position.set(-0.025, 0.012, 0.09);
      g.add(rWing);

      const tail = new THREE.Mesh(tailGeo, crowWingMat);
      tail.scale.setScalar(scale);
      tail.position.set(0, 0, -0.19 * scale);
      tail.rotation.y = Math.PI / 2;
      g.add(tail);

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
        isAggro: false,
        didNudge: false
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
            gb.didNudge = false;
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
              if (!gb.didNudge && this.playerController && this.world) {
                gb.didNudge = true;
                const dx = playerPos.x - gb.mesh.position.x;
                const dz = playerPos.z - gb.mesh.position.z;
                const len = Math.hypot(dx, dz) || 1;
                this.playerController.applyBalanceNudge(dx / len * 0.16, dz / len * 0.16, this.world);
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

  /** Three-step toon ramp shared by every koi: shadow, mid-tone, light. */
  koiGradientMap() {
    if (this._koiRamp) return this._koiRamp;
    const data = new Uint8Array([
      92, 92, 92, 255,
      168, 168, 168, 255,
      238, 238, 238, 255,
      255, 255, 255, 255
    ]);
    const tex = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    this._koiRamp = tex;
    return tex;
  }

  /**
   * Cel-shaded koi pattern painted onto the body's lathe UVs: u runs around
   * the fish (0 and 1 on the belly, 0.5 along the back), v runs tail → nose.
   * Classic nishikigoi varieties: kohaku, sanke, showa, ogon and tancho, each
   * with crisp inked patch edges and a pale belly.
   */
  koiPatternTexture(variant, seed) {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    let s = seed * 9301 + 49297;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const palettes = {
      kohaku: { base: '#fff5e8', patch: ['#e8431d', '#ee5a2a'], ink: '#8a2410', spots: 0 },
      sanke: { base: '#fff5e8', patch: ['#e64d24'], ink: '#8a2410', spots: 5 },
      showa: { base: '#25222c', patch: ['#e64a22', '#fff2e2'], ink: '#111016', spots: 0 },
      ogon: { base: '#f3b63c', patch: [], ink: '#a86f18', spots: 0 },
      tancho: { base: '#fff8ee', patch: [], ink: '#8a2410', spots: 0, tancho: true }
    };
    const pal = palettes[variant] || palettes.kohaku;
    ctx.fillStyle = pal.base;
    ctx.fillRect(0, 0, size, size);

    // Blob = union of circles; ink rim first (slightly larger), then the fill
    const blob = (cx, cy, r, count, color) => {
      const circles = [];
      for (let i = 0; i < count; i++) {
        circles.push([cx + (rnd() - 0.5) * r * 1.3, cy + (rnd() - 0.5) * r * 1.6, r * (0.55 + rnd() * 0.55)]);
      }
      ctx.fillStyle = pal.ink;
      for (const [x, y, rr] of circles) { ctx.beginPath(); ctx.arc(x, y, rr + 2.5, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = color;
      for (const [x, y, rr] of circles) { ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill(); }
    };
    if (pal.patch.length) {
      const patches = 2 + Math.floor(rnd() * 3);
      for (let i = 0; i < patches; i++) {
        const cy = 30 + (i + rnd() * 0.8) * (200 / patches);
        blob(size * 0.5 + (rnd() - 0.5) * 50, cy, 22 + rnd() * 18, 4 + Math.floor(rnd() * 3), pal.patch[i % pal.patch.length]);
      }
    }
    if (pal.spots) {
      ctx.fillStyle = '#1d1a24';
      for (let i = 0; i < pal.spots; i++) {
        ctx.beginPath();
        ctx.ellipse(size * 0.5 + (rnd() - 0.5) * 70, 40 + rnd() * 170, 4 + rnd() * 5, 3 + rnd() * 4, rnd() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (pal.tancho) {
      ctx.fillStyle = pal.ink;
      ctx.beginPath(); ctx.arc(size * 0.5, 46, 25, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8431d';
      ctx.beginPath(); ctx.arc(size * 0.5, 46, 22, 0, Math.PI * 2); ctx.fill();
    }
    // Pale belly: the seam edges (u = 0 / 1) fade to cream
    const belly = ctx.createLinearGradient(0, 0, size, 0);
    belly.addColorStop(0, 'rgba(255,250,240,0.85)');
    belly.addColorStop(0.28, 'rgba(255,250,240,0)');
    belly.addColorStop(0.72, 'rgba(255,250,240,0)');
    belly.addColorStop(1, 'rgba(255,250,240,0.85)');
    ctx.fillStyle = belly;
    ctx.fillRect(0, 0, size, size);
    // Faint scale lattice across the back
    ctx.strokeStyle = variant === 'showa' ? 'rgba(255,255,255,0.08)' : 'rgba(80,40,20,0.1)';
    ctx.lineWidth = 1;
    for (let row = 0; row < 26; row++) {
      const y = 10 + row * 9.5;
      for (let col = 0; col < 12; col++) {
        const x = 64 + col * 11 + (row % 2) * 5.5;
        ctx.beginPath();
        ctx.arc(x, y, 6, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
      }
    }
    // Dorsal ridge highlight for the metallic ogon
    if (variant === 'ogon') {
      const sheen = ctx.createLinearGradient(size * 0.3, 0, size * 0.7, 0);
      sheen.addColorStop(0, 'rgba(255,240,200,0)');
      sheen.addColorStop(0.5, 'rgba(255,245,210,0.5)');
      sheen.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, size, size);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }

  /** Unit-length koi body lathed along +z (nose at +z), laterally compressed with an arched back. */
  koiBodyGeometry() {
    if (this._koiBody) return this._koiBody;
    const profile = [
      [0.012, -0.5], [0.034, -0.43], [0.058, -0.32], [0.08, -0.17], [0.094, -0.02],
      [0.1, 0.12], [0.098, 0.24], [0.088, 0.34], [0.07, 0.42], [0.045, 0.47], [0.012, 0.5]
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const geo = new THREE.LatheGeometry(profile, 22);
    geo.rotateX(Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      pos.setX(i, pos.getX(i) * 0.8);
      pos.setY(i, y > 0 ? y * 1.14 : y * 0.96);
    }
    geo.computeVertexNormals();
    this._koiBody = geo;
    return geo;
  }

  koiFinGeometries() {
    if (this._koiFins) return this._koiFins;
    // Forked caudal fin in the XY plane, root at the origin, sweeping to +x;
    // rotated so +x points backward (-z) once attached to the tail.
    const tail = new THREE.Shape();
    tail.moveTo(0, 0.028);
    tail.quadraticCurveTo(0.13, 0.11, 0.3, 0.17);
    tail.quadraticCurveTo(0.21, 0.07, 0.18, 0.0);
    tail.quadraticCurveTo(0.21, -0.07, 0.3, -0.17);
    tail.quadraticCurveTo(0.13, -0.11, 0, -0.028);
    tail.closePath();
    const tailGeo = new THREE.ShapeGeometry(tail, 6);
    tailGeo.rotateY(Math.PI / 2);
    // Dorsal fin: low sail along the back (shape x → +z)
    const dorsal = new THREE.Shape();
    dorsal.moveTo(-0.14, 0);
    dorsal.quadraticCurveTo(-0.08, 0.075, 0.03, 0.07);
    dorsal.quadraticCurveTo(0.1, 0.05, 0.16, 0);
    dorsal.closePath();
    const dorsalGeo = new THREE.ShapeGeometry(dorsal, 5);
    dorsalGeo.rotateY(-Math.PI / 2);
    // Pectoral fan: root at the origin, reaching outward (+x) and back
    const pect = new THREE.Shape();
    pect.moveTo(0, 0);
    pect.quadraticCurveTo(0.09, -0.015, 0.13, 0.055);
    pect.quadraticCurveTo(0.07, 0.095, 0, 0.045);
    pect.closePath();
    const pectGeo = new THREE.ShapeGeometry(pect, 5);
    pectGeo.rotateX(-Math.PI / 2);
    this._koiFins = { tailGeo, dorsalGeo, pectGeo };
    return this._koiFins;
  }

  /**
   * Anime cel-shaded nishikigoi. Built nose-forward along +z so lookAt()
   * points them where they swim; toon ramp + inked pattern + inverted-hull
   * outline; they cruise BELOW the river surface and only rise to mouth at
   * it now and then, each visit sending out a ring of ripples.
   */
  buildKoi() {
    this.koi = [];
    const ramp = this.koiGradientMap();
    const body = this.koiBodyGeometry();
    const { tailGeo, dorsalGeo, pectGeo } = this.koiFinGeometries();
    const variants = ['kohaku', 'kohaku', 'sanke', 'showa', 'ogon', 'tancho', 'kohaku', 'sanke'];
    const finTints = { kohaku: 0xffd9c2, sanke: 0xffd9c2, showa: 0x4a4250, ogon: 0xf6cf74, tancho: 0xfff1e4 };
    const outlineMat = new THREE.MeshBasicMaterial({ color: 0x1b1418, side: THREE.BackSide });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x14100f });
    const eyeGeo = new THREE.SphereGeometry(0.015, 8, 6);

    for (let i = 0; i < 18; i++) {
      const variant = variants[i % variants.length];
      const len = 0.55 + Math.random() * 0.3;
      const fish = new THREE.Group();
      const bodyMat = new THREE.MeshToonMaterial({ map: this.koiPatternTexture(variant, i + 1), gradientMap: ramp });
      const finMat = new THREE.MeshToonMaterial({
        color: finTints[variant], gradientMap: ramp, side: THREE.DoubleSide, transparent: true, opacity: 0.82
      });

      const bodyMesh = new THREE.Mesh(body, bodyMat);
      bodyMesh.castShadow = true;
      fish.add(bodyMesh);
      const outline = new THREE.Mesh(body, outlineMat);
      outline.scale.set(1.09, 1.07, 1.02);
      fish.add(outline);

      const tailPivot = new THREE.Group();
      tailPivot.position.z = -0.485;
      const tail = new THREE.Mesh(tailGeo, finMat);
      tailPivot.add(tail);
      fish.add(tailPivot);

      const dorsal = new THREE.Mesh(dorsalGeo, finMat);
      dorsal.position.set(0, 0.085, 0.02);
      fish.add(dorsal);

      const pectorals = [];
      for (const side of [-1, 1]) {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.07, -0.02, 0.2);
        const fin = new THREE.Mesh(pectGeo, finMat);
        fin.scale.x = side;
        pivot.add(fin);
        pivot.rotation.z = -side * 0.4;
        fish.add(pivot);
        pectorals.push(pivot);
      }
      for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(side * 0.062, 0.035, 0.37);
        fish.add(eye);
      }

      fish.scale.setScalar(len);
      const x = -45 + Math.random() * 100;
      const lane = (Math.random() - 0.5) * 3.6;
      const z = 29.5 + lane;
      fish.position.set(x, -0.3, z);
      this.scene.add(fish);

      this.koi.push({
        mesh: fish,
        x,
        z,
        cruiseSpeed: 0.4 + Math.random() * 0.4,
        speed: 0.4 + Math.random() * 0.4,
        direction: Math.random() < 0.5 ? -1 : 1,
        lane,
        fleeTimer: 0,
        wobble: Math.random() * 100,
        tail: tailPivot,
        pectorals,
        surfaceTimer: 4 + Math.random() * 16,
        surfacing: 0,
        rippled: false,
        len
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

      // Cruise depth sits in the carved channel; every so often a fish
      // tilts up to mouth at the surface, then sinks back down.
      k.surfaceTimer -= dt;
      if (k.surfaceTimer <= 0 && k.surfacing <= 0) {
        k.surfacing = 2.4;
        k.rippled = false;
        k.surfaceTimer = 10 + Math.random() * 22;
      }
      let rise = 0;
      if (k.surfacing > 0) {
        k.surfacing -= dt;
        const phase = 1 - k.surfacing / 2.4;
        rise = Math.sin(phase * Math.PI);
        if (!k.rippled && phase > 0.45 && this.world && this.world.spawnRipple) {
          this.world.spawnRipple(k.x, z, 0.45);
          k.rippled = true;
        }
      }
      const cruiseY = -0.3 - (1 - Math.abs(k.lane) / 1.8) * 0.06 + Math.sin(t * 1.3 + k.wobble) * 0.03;
      const y = cruiseY + rise * (0.03 - cruiseY - 0.07 * k.len);
      k.mesh.position.set(k.x, y, z);

      // Tail beat quickens with speed; pectorals feather slowly
      const beat = t * (6 + k.speed * 3) + k.wobble;
      k.tail.rotation.y = Math.sin(beat) * (0.42 + k.speed * 0.12);
      for (let i = 0; i < k.pectorals.length; i++) {
        const side = i === 0 ? -1 : 1;
        k.pectorals[i].rotation.z = -side * (0.4 + Math.sin(t * 2.2 + k.wobble + i) * 0.22);
      }
      // Nose leads the path; pitch up while surfacing, gentle body sway
      k.mesh.lookAt(k.x + k.direction, y + rise * 0.12, z + Math.cos(t * 0.55 + k.wobble) * 0.18);
      k.mesh.rotateY(Math.sin(beat) * 0.05);
    }
  }

  update(dt, playerPos, sky = null, playerCat = null, playerController = null, world = null) {
    this.time += dt;
    this.playerController = playerController;
    this.world = world;
    const t = this.time;
    this.updateBirds(dt, t, sky);
    this.updateGuardianBirds(dt, t, playerPos, playerCat);
    this.updateButterflies(dt, t, sky, playerPos);
    this.updateKoi(dt, t);
  }
}
