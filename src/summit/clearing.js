// The summit clearing (天上), split out of src/mountaintop.js: the meadow,
// the stepped torii approach, the meditation stone, ensō and path stones, the
// sun pool, light motes and fūrin around the perch, and the lower stone path
// with its lanterns. buildLegacyRearGate() and buildVistaApproach() are kept
// as source reference and are not built.
// SummitManager (src/mountaintop.js) delegates to these methods with
// `this` = the manager, so the code reads exactly as it did in the class.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { worldNoise, glowTexture } from '../textures.js?v=20261107a';
import { lumpyTuftGeometry } from '../foliage.js?v=20261107a';
import {
  mulberry32, box, clamp01, smoothstep, MEADOW_Y, CORRIDOR_W, CORRIDOR_Z0, CORRIDOR_Z1, GATE_Z,
  ENTRY_Y, STEP_COUNT, STEP_RUN, STEP_RISE, LANDING_Z0, LANDING_Z1, LOWER_STEP_COUNT,
  LOWER_STEP_RUN, approachTopAt, lowerStepTopAt, MEDITATE_SECONDS, summitWeatherAmount
} from './common.js?v=20261107a';

export const clearingMethods = {
  buildMeadow() {
    // A compact, level patch beneath the old tree. Keeping the rendered
    // surface and groundAt() on the same MEADOW_Y plane prevents the cat's
    // legs and paws disappearing into a decorative terrain crown.
    const radius = 12.2;
    const notchHalf = CORRIDOR_W + 0.18;
    const rimZ = Math.sqrt(radius * radius - notchHalf * notchHalf);
    const leftAngle = Math.atan2(rimZ, -notchHalf);
    const rightAngle = Math.atan2(rimZ, notchHalf) + Math.PI * 2;
    const shape = new THREE.Shape();
    // Shape Y is -world Z because the geometry rotates -90 degrees to face up.
    shape.moveTo(-notchHalf, -CORRIDOR_Z0);
    shape.lineTo(-notchHalf, -rimZ);
    for (let i = 0; i <= 80; i++) {
      const a = leftAngle + (rightAngle - leftAngle) * (i / 80);
      shape.lineTo(Math.cos(a) * radius, -Math.sin(a) * radius);
    }
    shape.lineTo(notchHalf, -CORRIDOR_Z0);
    shape.closePath();
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const meadow = new THREE.Color(0xb6d986);
    const dry = new THREE.Color(0xd8d287);
    const rimSoil = new THREE.Color(0xae9868);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const r = Math.hypot(x, z);
      pos.setY(i, MEADOW_Y);
      c.copy(meadow).lerp(dry, smoothstep(0.35, 0.9, worldNoise(x * 0.7, z * 0.7, 0.09, 2, 9) * 0.5 + 0.5));
      c.lerp(rimSoil, smoothstep(9.7, radius, r) * 0.55);
      // worn grass along the stair approach
      if (Math.abs(x) < 3.4 && z > 6.5) c.lerp(rimSoil, smoothstep(6.5, 13.5, z) * 0.42);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, this.MAT.meadow);
    m.receiveShadow = true;
    m.name = 'Summit Meadow';
    this.group.add(m);
  },

  buildStepsAndGate() {
    const approach = new THREE.Group();
    approach.name = 'Playable Ocean Torii Approach';

    // Seven low, regular treads connect the arrival landing to the grass.
    // Their visual tops, physics groundAt() bands, and platform boxes share
    // the same constants so there is no invisible ramp or paw clipping.
    for (let i = 0; i < STEP_COUNT; i++) {
      const z0 = CORRIDOR_Z0 + i * STEP_RUN;
      const top = approachTopAt(z0);
      const width = 5.7 - i * 0.09;
      const slab = box(width, 0.34, STEP_RUN + 0.08, this.MAT.stoneWarm,
        0, top - 0.17, z0 + STEP_RUN * 0.5);
      slab.name = `Overlook Step ${i + 1}`;
      approach.add(slab);
      this.addPlatformBox(-width * 0.5, top, z0, width * 0.5, top - 0.5, z0 + STEP_RUN);
    }

    const landingZ = LANDING_Z0;
    const landingDepth = LANDING_Z1 - landingZ;
    const landing = box(5.25, 0.45, landingDepth, this.MAT.stoneWarm,
      0, ENTRY_Y - 0.225, landingZ + landingDepth * 0.5);
    landing.name = 'Overlook Torii Landing';
    approach.add(landing);
    this.addPlatformBox(-2.62, ENTRY_Y, landingZ, 2.62, ENTRY_Y - 0.65, CORRIDOR_Z1 + 0.35);

    // Rope rails echo the reference image while leaving every tread fully
    // walkable. The corridor constraint supplies the safety boundary.
    const postGeo = new THREE.CylinderGeometry(0.07, 0.1, 1.05, 7);
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x58432e, roughness: 1 });
    for (const side of [-1, 1]) {
      const high = [];
      const low = [];
      for (let i = 0; i <= STEP_COUNT; i++) {
        const z = CORRIDOR_Z0 + i * STEP_RUN;
        const stepIndex = Math.min(STEP_COUNT - 1, i);
        const top = Math.max(ENTRY_Y, MEADOW_Y - stepIndex * STEP_RISE);
        const x = side * (2.95 - i * 0.045);
        const post = new THREE.Mesh(postGeo, this.MAT.timberDark);
        post.position.set(x, top + 0.52, z + 0.22);
        post.rotation.z = -side * 0.025;
        post.castShadow = true;
        approach.add(post);
        high.push(new THREE.Vector3(x, top + 0.96, z + 0.22));
        low.push(new THREE.Vector3(x, top + 0.62, z + 0.22));
      }
      for (const points of [high, low]) {
        const rope = new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 44, 0.026, 5, false),
          ropeMat
        );
        approach.add(rope);
      }
    }

    const torii = new THREE.Group();
    torii.name = 'Overlook Entrance Torii';
    // Keep the threshold human-scale during play but visually subordinate to
    // the enormous valley from the seated composition.
    const toriiScale = 0.56;
    const pillarGeo = new THREE.CylinderGeometry(0.22, 0.29, 4.6, 10);
    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(pillarGeo, this.MAT.vermilion);
      pillar.position.set(side * 1.8, 2.3, 0);
      pillar.castShadow = true;
      torii.add(pillar);
      const pillarX = side * 1.8 * toriiScale;
      this.addColliderBox(pillarX - 0.27, ENTRY_Y, GATE_Z - 0.27,
        pillarX + 0.27, ENTRY_Y + 3.86, GATE_Z + 0.27);
    }
    torii.add(box(5.7, 0.32, 0.42, this.MAT.vermilion, 0, 4.72, 0));
    torii.add(box(6.25, 0.25, 0.5, this.MAT.vermilion, 0, 5.12, 0));
    torii.add(box(0.86, 0.28, 0.3, this.MAT.vermilion, 0, 4.42, 0));
    torii.add(box(6.35, 0.1, 0.52, this.MAT.stoneDark, 0, 5.31, 0));
    torii.scale.setScalar(toriiScale);
    torii.position.set(0, ENTRY_Y, GATE_Z);
    approach.add(torii);
    this.torii = torii;

    // Small stone lanterns make the lower landing feel intentional without
    // turning this quiet threshold into another shrine objective.
    for (const side of [-1, 1]) {
      const lantern = new THREE.Group();
      lantern.add(box(0.5, 0.2, 0.5, this.MAT.stone, 0, 0.1, 0));
      lantern.add(box(0.16, 0.85, 0.16, this.MAT.stone, 0, 0.58, 0));
      lantern.add(box(0.46, 0.14, 0.46, this.MAT.stone, 0, 1.04, 0));
      lantern.add(box(0.3, 0.3, 0.3, this.MAT.lanternGlow, 0, 1.27, 0));
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.3, 4), this.MAT.stoneDark);
      cap.position.y = 1.56;
      cap.rotation.y = Math.PI / 4;
      lantern.add(cap);
      lantern.position.set(side * 2.15, ENTRY_Y, 18.15);
      approach.add(lantern);
    }

    this.group.add(approach);
    this.vistaApproach = approach;
  },

  // Kept as source reference for the former oversized rear approach. It is
  // deliberately not built: arrival now happens through the ocean-side gate.
  buildLegacyRearGate() {
    const g = this.group;
    // Earthen stair notch: grass shoulders drop to a stepped stone path that
    // ends on a small landing carrying the torii — the only way back down.
    const stepMat = this.MAT.stoneWarm;
    const stepTops = [-0.32, -0.64, -0.96, -1.28, -1.56];
    for (let i = 0; i < stepTops.length; i++) {
      const z = -30.6 - i * 1.62;
      const slab = box(6.4 - i * 0.12, 0.5, 1.7, stepMat, 0, stepTops[i] - 0.25, z);
      slab.name = `Summit Step ${i + 1}`;
      g.add(slab);
      this.addPlatformBox(-3.2 + i * 0.06, stepTops[i], z - 0.9, 3.2 - i * 0.06, stepTops[i] - 1.2, z + 0.9);
    }
    // Landing under the gate
    const land = box(7.0, 0.5, 9.6, stepMat, 0, -1.85, -43.6);
    land.name = 'Summit Gate Landing';
    g.add(land);
    this.addPlatformBox(-3.45, -1.6, -48.2, 3.45, -2.4, -38.6);

    // Stone curbs flanking the stair corridor
    for (const s of [-1, 1]) {
      const curb = box(0.55, 1.5, 20.5, this.MAT.stoneDark, s * 3.6, -1.1, -38.5);
      curb.rotation.z = -s * 0.05;
      g.add(curb);
      this.addColliderBox(s * 3.6 - 0.5, -2.2, -48.6, s * 3.6 + 0.5, 1.2, -29);
    }

    // The torii — same silhouette language as the valley gate, no climb pegs.
    const torii = new THREE.Group();
    torii.name = 'Summit Torii';
    const pillarGeo = new THREE.CylinderGeometry(0.22, 0.28, 4.6, 10);
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(pillarGeo, this.MAT.vermilion);
      p.position.set(s * 1.8, 2.3, 0);
      p.castShadow = true;
      torii.add(p);
      this.addColliderBox(s * 1.8 - 0.32, -1.6, GATE_Z - 0.32, s * 1.8 + 0.32, 3.0, GATE_Z + 0.32);
    }
    torii.add(box(5.6, 0.32, 0.4, this.MAT.vermilion, 0, 4.75, 0));
    torii.add(box(6.2, 0.28, 0.5, this.MAT.vermilion, 0, 5.15, 0));
    torii.add(box(0.9, 0.3, 0.3, this.MAT.vermilion, 0, 4.45, 0));
    torii.add(box(6.3, 0.1, 0.52, this.MAT.stoneDark, 0, 5.34, 0));
    // Small hanging lantern plaques flanking the gate
    torii.position.set(0, -1.6, GATE_Z);
    g.add(torii);
    this.torii = torii;

    // A pair of weathered toro lanterns marking the descent
    for (const s of [-1, 1]) {
      const l = new THREE.Group();
      l.name = 'Summit Toro Lantern';
      l.add(box(0.55, 0.25, 0.55, this.MAT.stone, 0, 0.12, 0));
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 1.0, 8), this.MAT.stone);
      post.position.y = 0.72;
      post.castShadow = true;
      l.add(post);
      l.add(box(0.5, 0.15, 0.5, this.MAT.stone, 0, 1.3, 0));
      l.add(box(0.34, 0.34, 0.34, this.MAT.lanternGlow, 0, 1.55, 0));
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.34, 4), this.MAT.stoneDark);
      cap.position.y = 1.9;
      cap.rotation.y = Math.PI / 4;
      cap.castShadow = true;
      l.add(cap);
      l.position.set(s * 2.6, -1.6, -41.8);
      l.rotation.y = this.rng() * 0.5;
      g.add(l);
      this.addColliderBox(s * 2.6 - 0.35, -1.6, -42.15, s * 2.6 + 0.35, 0.6, -41.45);
    }

    // Gorinto stone marker — the quiet grave-stone silhouette at the landing's edge
    const gorinto = new THREE.Group();
    gorinto.name = 'Summit Gorinto';
    gorinto.add(box(0.5, 0.22, 0.5, this.MAT.stoneDark, 0, 0.11, 0));
    gorinto.add(box(0.34, 0.3, 0.34, this.MAT.stone, 0, 0.37, 0));
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), this.MAT.stone);
    ball.position.y = 0.64;
    gorinto.add(ball);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.035, 6, 12), this.MAT.stone);
    ring.position.y = 0.86;
    gorinto.add(ring);
    const capc = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.24, 8), this.MAT.stoneDark);
    capc.position.y = 1.08;
    gorinto.add(capc);
    gorinto.position.set(2.9, -1.6, -46.4);
    g.add(gorinto);
    this.addColliderBox(2.55, -1.6, -46.75, 3.25, -0.4, -46.05);

    // The path "continues" past the gate: three descending slabs that
    // dissolve into the cloud bank — pure scenery beyond the trigger line.
    for (let i = 0; i < 3; i++) {
      const s = box(5.4 - i, 0.4, 1.5, stepMat, 0, -2.0 - i * 0.42, -46.2 - i * 1.5);
      s.material = this.MAT.stoneDark;
      g.add(s);
    }
  },

  buildVistaApproach() {
    // A second, purely scenic stair cuts down the sunny face of the hill.
    // It is the strong central line in the reference: meadow -> torii ->
    // tiled neighbourhood -> pagoda -> bay.  The playable boundary ends
    // before the drop, so these slabs never become accidental platforms.
    const g = new THREE.Group();
    g.name = 'Vista Descent';
    const stepMat = this.MAT.stoneWarm;
    for (let i = 0; i < 15; i++) {
      const z = 25.4 + i * 1.38;
      const y = i < 5 ? 0.24 - i * 0.025 : 0.14 - (i - 4) * 0.31;
      const w = 5.2 - i * 0.065;
      const slab = box(w, 0.34, 1.52, stepMat, 0, y, z);
      slab.rotation.y = (this.rng() - 0.5) * 0.035;
      slab.rotation.z = (this.rng() - 0.5) * 0.02;
      g.add(slab);
    }

    const postMat = this.MAT.timberDark;
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x5b4933, roughness: 1 });
    const postGeo = new THREE.CylinderGeometry(0.075, 0.105, 1.15, 7);
    for (const side of [-1, 1]) {
      const points = [];
      for (let i = 0; i < 7; i++) {
        const z = 26.0 + i * 3.05;
        const stairY = z < 31.5 ? 0.16 : 0.16 - (z - 31.5) * 0.225;
        const y = stairY + 0.56;
        const x = side * (3.35 - i * 0.035);
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(x, y, z);
        post.rotation.z = -side * 0.025;
        post.castShadow = true;
        g.add(post);
        points.push(new THREE.Vector3(x, y + 0.44, z));
      }
      // A slightly sagging twin rope reads at distance without thick rails.
      for (const dy of [0, -0.34]) {
        const sagged = points.map((p, i) => p.clone().add(new THREE.Vector3(0,
          dy - (i > 0 && i < points.length - 1 ? 0.13 : 0), 0)));
        const rope = new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sagged), 42, 0.025, 5, false),
          ropeMat
        );
        g.add(rope);
      }
    }

    // The vermilion gate sits below the brow so it never competes with the
    // exit gate behind the player; from the meadow it frames the pagoda.
    const torii = new THREE.Group();
    torii.name = 'Vista Torii';
    const pillarGeo = new THREE.CylinderGeometry(0.18, 0.24, 4.2, 10);
    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(pillarGeo, this.MAT.vermilion);
      pillar.position.set(side * 1.65, 2.05, 0);
      pillar.castShadow = true;
      torii.add(pillar);
    }
    torii.add(box(5.2, 0.3, 0.38, this.MAT.vermilion, 0, 4.2, 0));
    torii.add(box(5.75, 0.22, 0.45, this.MAT.vermilion, 0, 4.58, 0));
    torii.add(box(0.72, 0.26, 0.28, this.MAT.vermilion, 0, 3.88, 0));
    torii.position.set(0, -2.9, 43.2);
    g.add(torii);

    g.position.x = -7.0;
    this.group.add(g);
    this.vistaApproach = g;
  },

  buildMeditationStone() {
    // A low warm stone beside the grassy sitting place. It sits off the main
    // view axis so it frames the cat instead of becoming a dark centre-screen
    // blob in the scenic camera.
    const geo = lumpyTuftGeometry(2, 91, 0.22);
    const stone = new THREE.Mesh(geo, this.MAT.stoneWarm);
    stone.scale.set(0.52, 0.14, 0.46);
    stone.position.set(5.25, MEADOW_Y + 0.065, 3.95);
    stone.rotation.y = 0.48;
    stone.castShadow = stone.receiveShadow = true;
    stone.name = 'Perch-side Warm Stone';
    this.group.add(stone);
    this.perchStone = stone;

    // A weather-softened ensō makes the stone feel placed with intention. It
    // stays decorative, as do the path stones below, so physics remains on the
    // shared grass plane and the cat never bumps over invisible ledges.
    const ensoMat = new THREE.MeshBasicMaterial({
      color: 0x655d4d, transparent: true, opacity: 0.52,
      depthWrite: false, side: THREE.DoubleSide
    });
    const enso = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.022, 5, 28, Math.PI * 1.78), ensoMat);
    enso.rotation.x = -Math.PI / 2;
    enso.rotation.z = 0.36;
    enso.scale.set(1, 0.76, 1);
    enso.position.set(5.25, MEADOW_Y + 0.15, 3.95);
    enso.name = 'Weathered Enso';
    this.group.add(enso);

    // Five half-buried stones curve naturally from the top tread to the
    // sitting place. This is guidance made from landscape rather than UI.
    const defs = [
      [0.15, 7.72, 0.48, 0.36, -0.15],
      [0.62, 6.78, 0.43, 0.33, 0.22],
      [1.22, 5.88, 0.46, 0.34, -0.28],
      [1.94, 5.02, 0.42, 0.32, 0.34],
      [2.64, 4.2, 0.4, 0.3, -0.08]
    ];
    this.meditationPath = [];
    for (let i = 0; i < defs.length; i++) {
      const [x, z, sx, sz, rot] = defs[i];
      const step = new THREE.Mesh(geo, this.MAT.stoneWarm);
      step.scale.set(sx, 0.055 + i * 0.004, sz);
      step.position.set(x, MEADOW_Y + 0.018, z);
      step.rotation.y = rot;
      step.receiveShadow = true;
      step.name = `Meditation Path Stone ${i + 1}`;
      this.group.add(step);
      this.meditationPath.push({ x, z, clearance: Math.max(sx, sz) * 1.12 });
    }
  },

  makeFurinPaperTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 64, 128);
    const paper = ctx.createLinearGradient(0, 0, 64, 128);
    paper.addColorStop(0, 'rgba(255,249,229,0.96)');
    paper.addColorStop(1, 'rgba(224,209,176,0.94)');
    ctx.fillStyle = paper;
    ctx.fillRect(4, 2, 56, 124);
    ctx.strokeStyle = 'rgba(65,102,101,0.62)';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(19, 101);
    ctx.bezierCurveTo(28, 78, 26, 51, 42, 25);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(85,129,119,0.42)';
    ctx.lineWidth = 2;
    for (const [x, y, dx] of [[27, 76, -10], [31, 64, 12], [36, 47, -9]]) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + dx * 0.55, y - 5, x + dx, y - 3);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(177,61,43,0.72)';
    ctx.beginPath();
    ctx.arc(46, 106, 6, 0, Math.PI * 2);
    ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  },

  /**
   * A quiet focal layer around the perch: canopy light, motes that gather as
   * the cat settles, and one glass furin. None of it is an objective marker;
   * it simply lets the meadow acknowledge stillness without putting a meter
   * or prompt over the view.
   */
  buildMeditationAtmosphere() {
    const poolMat = new THREE.MeshBasicMaterial({
      map: glowTexture(255, 226, 154, 64), color: 0xffdfa0,
      transparent: true, opacity: 0.035, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide
    });
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2), poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(this.perchLocal.x, MEADOW_Y + 0.024, this.perchLocal.z);
    pool.renderOrder = 2;
    pool.name = 'Meditation Sun Pool';
    this.group.add(pool);
    this.meditationPool = pool;
    this.meditationPoolMat = poolMat;

    const count = this.previewQuality ? 22 : 54;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    this._meditationMoteAnchors = new Float32Array(count * 3);
    this._meditationMoteSeeds = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = this.rng() * Math.PI * 2;
      const r = 0.65 + Math.sqrt(this.rng()) * 2.85;
      const x = this.perchLocal.x + Math.cos(a) * r;
      const y = 0.28 + this.rng() * 2.35;
      const z = this.perchLocal.z + Math.sin(a) * r;
      positions[i * 3] = this._meditationMoteAnchors[i * 3] = x;
      positions[i * 3 + 1] = this._meditationMoteAnchors[i * 3 + 1] = y;
      positions[i * 3 + 2] = this._meditationMoteAnchors[i * 3 + 2] = z;
      this._meditationMoteSeeds[i * 3] = this.rng() * 100;
      this._meditationMoteSeeds[i * 3 + 1] = 0.3 + this.rng() * 0.65;
      this._meditationMoteSeeds[i * 3 + 2] = 0.14 + this.rng() * 0.34;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.meditationMoteMat = new THREE.PointsMaterial({
      map: glowTexture(255, 239, 181, 40), color: 0xffe9b2,
      size: 0.12, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    this.meditationMotes = new THREE.Points(geo, this.meditationMoteMat);
    this.meditationMotes.name = 'Meditation Light Motes';
    this.meditationMotes.visible = false;
    this.group.add(this.meditationMotes);

    // A small Edo-style glass wind bell hangs from the old shade tree. Its
    // paper strip makes even a light gust readable from the seated camera.
    const furin = new THREE.Group();
    furin.name = 'Summit Furin';
    const threadMat = new THREE.MeshStandardMaterial({ color: 0x5b4431, roughness: 0.9 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xaee7e6, emissive: 0x183b42, emissiveIntensity: 0.22,
      roughness: 0.18, metalness: 0.02, transparent: true, opacity: 0.62,
      depthWrite: false, side: THREE.DoubleSide
    });
    const paperMat = new THREE.MeshStandardMaterial({
      color: 0xf6ead0, emissive: 0x4d3218, emissiveIntensity: 0.12,
      map: this.makeFurinPaperTexture(), transparent: true, opacity: 0.94,
      roughness: 0.96, side: THREE.DoubleSide
    });
    const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.76, 5), threadMat);
    thread.position.y = 0.38;
    furin.add(thread);
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 9, 0, Math.PI * 2, 0, Math.PI * 0.62), glassMat);
    bell.scale.y = 0.82;
    bell.position.y = -0.08;
    furin.add(bell);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.018, 5, 18), glassMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.14;
    furin.add(rim);
    const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), this.MAT.gold);
    clapper.position.y = -0.2;
    furin.add(clapper);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.145, 0.54), paperMat);
    sail.position.y = -0.54;
    furin.add(sail);
    furin.position.set(4.55, 3.75, 5.1);
    furin.scale.setScalar(1.08);
    this.group.add(furin);
    this.furin = furin;
    this.furinSail = sail;
    this.furinClapper = clapper;
  },

  /**
   * The stone path keeps going past the torii landing, down through the
   * trees toward the city, with rope posts and a pair of lanterns: the
   * reference's descending steps. Scenery only, with no platforms, since
   * constrain() holds the cat at the landing.
   */
  buildLowerPath() {
    const rnd = mulberry32(4406);
    const path = new THREE.Group();
    path.name = 'Lower Stone Path';
    // Each tread is two or three fitted stones with mossy joints. They are
    // thick, so they sink into the ramped earth and show only their risers
    // and a sliver of side; two merged meshes carry all of them.
    const stones = [[], []];
    for (let i = 0; i < LOWER_STEP_COUNT; i++) {
      const z0 = LANDING_Z1 + i * LOWER_STEP_RUN;
      const top = lowerStepTopAt(z0 + 0.01);
      const width = 4.4 - i * 0.06;
      const pieces = rnd() < 0.5 ? 2 : 3;
      let left = -width / 2;
      for (let k = 0; k < pieces; k++) {
        const remaining = width / 2 - left;
        const w = k === pieces - 1 ? remaining : remaining / (pieces - k) * (0.75 + rnd() * 0.5);
        const stone = new THREE.BoxGeometry(w - 0.07, 0.72, LOWER_STEP_RUN - 0.06 - rnd() * 0.08);
        stone.rotateY((rnd() - 0.5) * 0.05);
        stone.translate(left + w / 2, top - 0.36 + (rnd() - 0.5) * 0.03,
          z0 + LOWER_STEP_RUN * 0.5 + (rnd() - 0.5) * 0.06);
        stones[rnd() < 0.55 ? 0 : 1].push(stone);
        left += w;
      }
    }
    for (const [list, mat] of [[stones[0], this.MAT.stoneWarm], [stones[1], this.MAT.stone]]) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat);
      mesh.name = 'Lower Path Stones';
      mesh.castShadow = mesh.receiveShadow = true;
      path.add(mesh);
    }

    const postGeo = new THREE.CylinderGeometry(0.07, 0.1, 1.05, 7);
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x58432e, roughness: 1 });
    for (const side of [-1, 1]) {
      const points = [];
      for (let i = 0; i <= LOWER_STEP_COUNT; i += 2) {
        const z = LANDING_Z1 + 0.35 + i * LOWER_STEP_RUN;
        const x = side * (2.55 - i * 0.035);
        const top = lowerStepTopAt(z + 0.01);
        const post = new THREE.Mesh(postGeo, this.MAT.timberDark);
        post.position.set(x, top + 0.46, z);
        post.rotation.z = -side * 0.025 + (rnd() - 0.5) * 0.05;
        post.castShadow = true;
        path.add(post);
        points.push(new THREE.Vector3(x, top + 0.9, z));
      }
      for (const dy of [0, -0.34]) {
        const sagged = points.map((p, i) => p.clone().add(new THREE.Vector3(0,
          dy - (i > 0 && i < points.length - 1 ? 0.1 : 0), 0)));
        path.add(new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sagged), 60, 0.024, 5, false),
          ropeMat
        ));
      }
    }

    // A second pair of stone lanterns partway down the hill.
    for (const side of [-1, 1]) {
      const z = LANDING_Z1 + 5.5 * LOWER_STEP_RUN;
      const lantern = new THREE.Group();
      lantern.add(box(0.46, 0.2, 0.46, this.MAT.stone, 0, 0.1, 0));
      lantern.add(box(0.15, 0.78, 0.15, this.MAT.stone, 0, 0.55, 0));
      lantern.add(box(0.42, 0.13, 0.42, this.MAT.stone, 0, 0.98, 0));
      lantern.add(box(0.28, 0.28, 0.28, this.MAT.lanternGlow, 0, 1.19, 0));
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.28, 4), this.MAT.stoneDark);
      cap.position.y = 1.46;
      cap.rotation.y = Math.PI / 4;
      lantern.add(cap);
      const x = side * 3.15;
      lantern.position.set(x, this.terrainHeightAt(x, z) - 0.05, z);
      lantern.rotation.y = (rnd() - 0.5) * 0.3;
      path.add(lantern);
    }
    this.group.add(path);
    this.lowerPath = path;
  },

  updateMeditationAtmosphere(dt, t, playing, sky) {
    const progress = clamp01(this.meditateT / MEDITATE_SECONDS);
    const target = this.cameraActive ? 0.24 + progress * 0.76 : 0;
    this._meditationGlow += (target - this._meditationGlow) * Math.min(1, dt * (target > 0 ? 0.75 : 1.8));
    const breath = this._reducedMotion ? 1 : 0.88 + Math.sin(t * 0.72) * 0.12;
    if (this.meditationPoolMat) {
      this.meditationPoolMat.opacity = 0.028 + this._meditationGlow * 0.105 * breath;
    }
    if (this.meditationMotes && this.meditationMoteMat) {
      this.meditationMoteMat.opacity = this._meditationGlow * 0.62;
      this.meditationMotes.visible = this.meditationMoteMat.opacity > 0.008;
      if (this.meditationMotes.visible) {
        const pos = this.meditationMotes.geometry.attributes.position;
        const motion = this._reducedMotion ? 0.16 : 1;
        for (let i = 0; i < pos.count; i++) {
          const seed = this._meditationMoteSeeds[i * 3];
          const speed = this._meditationMoteSeeds[i * 3 + 1];
          const range = this._meditationMoteSeeds[i * 3 + 2];
          const ax = this._meditationMoteAnchors[i * 3];
          const ay = this._meditationMoteAnchors[i * 3 + 1];
          const az = this._meditationMoteAnchors[i * 3 + 2];
          pos.setXYZ(
            i,
            ax + Math.sin(t * speed + seed) * range * motion,
            ay + Math.sin(t * (0.7 + speed * 0.35) + seed * 1.7) * 0.2 * motion,
            az + Math.cos(t * speed * 0.82 + seed * 1.3) * range * motion
          );
        }
        pos.needsUpdate = true;
      }
    }

    // The furin is a spatial reward, not a prompt: entering its little patch
    // of shade rings it once per summit visit, then the breeze keeps it alive
    // visually without repeatedly sounding as the cat circles the tree.
    if (this.furin) {
      const gust = 0.8 + summitWeatherAmount(sky, 'snow') * 0.4;
      const motion = this._reducedMotion ? 0.18 : 1;
      this.furin.rotation.z = Math.sin(t * 1.15) * 0.075 * gust * motion;
      this.furin.rotation.x = Math.cos(t * 0.73) * 0.035 * gust * motion;
      this.furinSail.rotation.y = Math.sin(t * 1.7) * 0.48 * motion;
      this.furinClapper.position.x = Math.sin(t * 1.15 + 0.35) * 0.045 * gust * motion;
      const dx = this._localPlayer.x - this.furin.position.x;
      const dz = this._localPlayer.z - this.furin.position.z;
      const near = dx * dx + dz * dz < 8.2;
      if (playing && near && !this._furinNear && !this._furinChimed) {
        this._furinChimed = true;
        if (this.game.audio) this.game.audio.playDreamChime();
      }
      this._furinNear = near;
    }
  }
};
