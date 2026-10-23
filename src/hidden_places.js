import * as THREE from 'three';

/**
 * Hidden places — secrets of the valley floor, found by wandering rather than
 * by following a marker. Each has its own light and its own sound:
 *
 *   Moon Pool       a still spring tucked behind the shrine grove. By day,
 *                   turquoise caustics and drifting lotus; by night the moon
 *                   pools on the water and pale motes lift off the surface.
 *                   Sound: sparse, glassy drops on a pentatonic scale.
 *   Lantern Glade   a ring of tall bamboo west of the tea house, strung with
 *                   paper lanterns that kindle one by one at dusk. Sound:
 *                   hollow bamboo knocks and a long breath of leaves.
 *
 * Both are also "sit & watch" spots (ContextActionManager.restSpots) so the
 * existing stillness moment, keepsake journal and photo stamps just work.
 * Nothing here is on a hilltop — the summit belongs to src/mountaintop.js.
 *
 * Built in two steps because the vegetation builder reads the world's
 * exclusion/water lists at construction: `new HiddenPlaces(scene, city)`
 * runs before Vegetation, `attach({...})` once the game systems exist.
 */

const POOL = { id: 'moon-pool', x: -20, z: -27, r: 3.0 };
const GLADE = { id: 'lantern-glade', x: -31, z: -10, r: 6.0 };

const TAU = Math.PI * 2;
const PENTATONIC = [440.0, 523.25, 587.33, 659.25, 783.99, 880.0];

// Small seeded generator so the layout is identical every load.
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function canvasTexture(size, draw, repeat = null) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  draw(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  return tex;
}

function glowTexture(inner, outer) {
  return canvasTexture(64, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 1, s / 2, s / 2, s / 2 - 1);
    g.addColorStop(0, inner);
    g.addColorStop(0.4, outer);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

export class HiddenPlaces {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.time = 0;
    this.rand = mulberry(0x4d43);
    this.group = new THREE.Group();
    this.group.name = 'Hidden Places';
    scene.add(this.group);

    this.found = { [POOL.id]: false, [GLADE.id]: false };
    this.lanterns = [];
    this.soundTimers = { pool: 3, glade: 2 };
    this.ctx = null;

    this.buildMoonPool();
    this.buildLanternGlade();
  }

  /* ------------------------------------------------------------------ */
  /*  Moon Pool                                                          */
  /* ------------------------------------------------------------------ */

  buildMoonPool() {
    const { x, z, r } = POOL;
    const rand = this.rand;
    const g = new THREE.Group();
    g.name = 'Moon Pool';
    g.position.set(x, 0, z);
    this.poolGroup = g;

    // Keep trees, bushes and grass off the clearing, and let the cat wade:
    // the inscribed square of the pool counts as water.
    const clear = r * 2 + 5;
    this.city.vegetationExclusions.push({ x, z, width: clear, depth: clear });
    const side = r * 1.7;
    this.city.waterRects.push([x, z, side, side]);

    // Mossy ground apron around the water
    const apron = new THREE.Mesh(
      new THREE.CircleGeometry(r + 2.4, 40),
      new THREE.MeshStandardMaterial({
        map: canvasTexture(128, (ctx, s) => {
          const grad = ctx.createRadialGradient(s / 2, s / 2, s * 0.18, s / 2, s / 2, s / 2);
          grad.addColorStop(0, 'rgba(70,96,62,1)');
          grad.addColorStop(0.7, 'rgba(84,112,66,0.85)');
          grad.addColorStop(1, 'rgba(90,120,70,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, s, s);
          for (let i = 0; i < 260; i++) {
            ctx.fillStyle = `rgba(${60 + rand() * 40},${90 + rand() * 50},${50 + rand() * 30},${0.12 + rand() * 0.2})`;
            ctx.fillRect(rand() * s, rand() * s, 2 + rand() * 4, 1 + rand() * 2);
          }
        }),
        transparent: true, roughness: 1, depthWrite: false
      })
    );
    apron.rotation.x = -Math.PI / 2;
    apron.position.y = 0.022;
    apron.receiveShadow = true;
    g.add(apron);

    // The water: a deep, slightly glassy disc plus a drifting caustic layer
    this.poolWaterMat = new THREE.MeshStandardMaterial({
      color: 0x24616c, roughness: 0.06, metalness: 0.05, transparent: true, opacity: 0.9,
      emissive: 0x0a2a30, emissiveIntensity: 0.35, envMapIntensity: 1.5
    });
    const water = new THREE.Mesh(new THREE.CircleGeometry(r, 48), this.poolWaterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.05;
    water.renderOrder = 1;
    g.add(water);

    this.causticTex = canvasTexture(128, (ctx, s) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = 'rgba(190,255,240,0.55)';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 26; i++) {
        const cx = rand() * s, cy = rand() * s, rr = 5 + rand() * 13;
        for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) {
          ctx.beginPath();
          ctx.ellipse(cx + ox, cy + oy, rr, rr * (0.55 + rand() * 0.3), rand() * 3, 0, TAU);
          ctx.stroke();
        }
      }
    }, [2.2, 2.2]);
    this.causticMat = new THREE.MeshBasicMaterial({
      map: this.causticTex, transparent: true, opacity: 0.0, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false
    });
    const caustic = new THREE.Mesh(new THREE.CircleGeometry(r * 0.98, 48), this.causticMat);
    caustic.rotation.x = -Math.PI / 2;
    caustic.position.y = 0.056;
    caustic.renderOrder = 2;
    g.add(caustic);

    // Moon pooled on the water: a soft cool disc that only the night wakes
    this.moonTex = glowTexture('rgba(235,246,255,1)', 'rgba(150,200,235,0.45)');
    this.moonMat = new THREE.SpriteMaterial({
      map: this.moonTex, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false
    });
    this.moonGlow = new THREE.Sprite(this.moonMat);
    this.moonGlow.scale.set(r * 1.5, r * 1.5, 1);
    this.moonGlow.position.set(r * 0.12, 0.09, -r * 0.1);
    this.moonGlow.renderOrder = 3;
    g.add(this.moonGlow);

    // Rim stones, with a gap on the south shore for a visitor to arrive by
    const stoneGeo = new THREE.DodecahedronGeometry(0.34, 0);
    const stones = new THREE.InstancedMesh(
      stoneGeo,
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true }),
      34
    );
    stones.name = 'Moon Pool Stones';
    stones.castShadow = true;
    stones.receiveShadow = true;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const col = new THREE.Color();
    let n = 0;
    for (let i = 0; i < 46 && n < 34; i++) {
      const a = (i / 46) * TAU + rand() * 0.06;
      // Skip the arrival gap (+z in local space = south)
      const south = Math.abs(((a - Math.PI / 2 + Math.PI) % TAU) - Math.PI);
      if (south < 0.42) continue;
      const rr = r + 0.12 + rand() * 0.38;
      const s = 0.65 + rand() * 0.9;
      e.set(rand() * 0.6, rand() * TAU, rand() * 0.6);
      q.setFromEuler(e);
      m4.compose(
        new THREE.Vector3(Math.cos(a) * rr, 0.08 * s, Math.sin(a) * rr),
        q, new THREE.Vector3(s * 1.15, s * 0.62, s)
      );
      stones.setMatrixAt(n, m4);
      col.setHSL(0.28 + rand() * 0.1, 0.1 + rand() * 0.12, 0.34 + rand() * 0.16);
      stones.setColorAt(n, col);
      n++;
    }
    stones.count = n;
    stones.instanceMatrix.needsUpdate = true;
    if (stones.instanceColor) stones.instanceColor.needsUpdate = true;
    g.add(stones);

    // Lily pads and three pale lotus blossoms
    const padMat = new THREE.MeshStandardMaterial({ color: 0x4f8a4c, roughness: 0.8, side: THREE.DoubleSide });
    const padGeo = new THREE.CircleGeometry(0.3, 14, 0.4, TAU - 0.5);
    for (let i = 0; i < 9; i++) {
      const a = rand() * TAU, rr = 0.5 + rand() * (r - 1.1);
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.rotation.x = -Math.PI / 2;
      pad.rotation.z = rand() * TAU;
      pad.position.set(Math.cos(a) * rr, 0.062, Math.sin(a) * rr);
      pad.scale.setScalar(0.7 + rand() * 0.8);
      g.add(pad);
    }
    const petalMat = new THREE.MeshStandardMaterial({ color: 0xf6dce6, roughness: 0.6, emissive: 0x3a2030, emissiveIntensity: 0.2 });
    const petalGeo = new THREE.ConeGeometry(0.07, 0.2, 6);
    petalGeo.translate(0, 0.1, 0);
    for (let i = 0; i < 3; i++) {
      const a = 1.0 + i * 2.1 + rand() * 0.4, rr = 0.9 + rand() * 1.0;
      const bloom = new THREE.Group();
      for (let p = 0; p < 7; p++) {
        const petal = new THREE.Mesh(petalGeo, petalMat);
        petal.rotation.set(0.9, (p / 7) * TAU, 0, 'YXZ');
        bloom.add(petal);
      }
      bloom.position.set(Math.cos(a) * rr, 0.06, Math.sin(a) * rr);
      g.add(bloom);
    }

    // Flat sitting stone on the south shore (the "sit & watch" spot)
    const seat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.7, 0.09, 14),
      new THREE.MeshStandardMaterial({ color: 0x8d9288, roughness: 0.95, flatShading: true })
    );
    seat.position.set(0, 0.045, r + 0.95);
    seat.receiveShadow = true;
    g.add(seat);

    // A little stone toro that glows when the light goes
    const toro = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x9a9f93, roughness: 0.95, flatShading: true });
    const piece = (geo, y) => { const m = new THREE.Mesh(geo, stoneMat); m.position.y = y; m.castShadow = true; toro.add(m); };
    piece(new THREE.CylinderGeometry(0.2, 0.26, 0.12, 8), 0.06);
    piece(new THREE.CylinderGeometry(0.07, 0.09, 0.5, 8), 0.37);
    piece(new THREE.CylinderGeometry(0.2, 0.17, 0.1, 8), 0.67);
    this.poolToroMat = new THREE.MeshStandardMaterial({ color: 0xffe2b8, emissive: 0x7a4410, emissiveIntensity: 0.2, roughness: 0.9 });
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), this.poolToroMat);
    lamp.position.y = 0.82;
    toro.add(lamp);
    piece(new THREE.ConeGeometry(0.3, 0.22, 8), 1.03);
    const toroAngle = 0.55;
    toro.position.set(Math.cos(toroAngle) * (r + 1.5), 0, Math.sin(toroAngle) * (r + 1.5));
    g.add(toro);
    this.poolToroHaloMat = new THREE.SpriteMaterial({
      map: this.city.lanternHaloTex, color: 0xffc878, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false
    });
    const halo = new THREE.Sprite(this.poolToroHaloMat);
    halo.scale.set(1.5, 1.5, 1);
    halo.position.copy(toro.position).setY(0.84);
    g.add(halo);

    // Motes lifting off the water on still nights
    const count = 42;
    const pos = new Float32Array(count * 3);
    this.poolMotes = [];
    for (let i = 0; i < count; i++) {
      this.poolMotes.push({
        a: rand() * TAU, rr: rand() * (r - 0.2), y: rand() * 2.4, sp: 0.12 + rand() * 0.2, ph: rand() * TAU
      });
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.poolMoteMat = new THREE.PointsMaterial({
      size: 0.13, map: glowTexture('rgba(220,245,255,1)', 'rgba(150,215,235,0.5)'), transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, color: 0xcdeaf5, fog: false
    });
    this.poolMotePoints = new THREE.Points(moteGeo, this.poolMoteMat);
    this.poolMotePoints.frustumCulled = false;
    g.add(this.poolMotePoints);

    this.group.add(g);
    this.updatePoolMotes(0, 0);
  }

  updatePoolMotes(dt, strength) {
    const attr = this.poolMotePoints.geometry.attributes.position;
    const t = this.time;
    for (let i = 0; i < this.poolMotes.length; i++) {
      const m = this.poolMotes[i];
      m.y += m.sp * dt;
      if (m.y > 2.6) { m.y = 0.05; m.a = this.rand() * TAU; m.rr = this.rand() * (POOL.r - 0.2); }
      const sway = Math.sin(t * 0.7 + m.ph) * 0.18;
      attr.setXYZ(i, Math.cos(m.a) * m.rr + sway, 0.1 + m.y, Math.sin(m.a) * m.rr + Math.cos(t * 0.6 + m.ph) * 0.18);
    }
    attr.needsUpdate = true;
    this.poolMoteMat.opacity = strength * 0.85;
  }

  /* ------------------------------------------------------------------ */
  /*  Lantern Glade                                                      */
  /* ------------------------------------------------------------------ */

  buildLanternGlade() {
    const { x, z, r } = GLADE;
    const rand = this.rand;
    const g = new THREE.Group();
    g.name = 'Lantern Glade';
    g.position.set(x, 0, z);
    this.gladeGroup = g;

    const clear = r * 2 + 4;
    this.city.vegetationExclusions.push({ x, z, width: clear, depth: clear });

    // Leaf-litter floor
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(r - 0.4, 36),
      new THREE.MeshStandardMaterial({
        map: canvasTexture(128, (ctx, s) => {
          const grad = ctx.createRadialGradient(s / 2, s / 2, s * 0.1, s / 2, s / 2, s / 2);
          grad.addColorStop(0, 'rgba(150,134,86,1)');
          grad.addColorStop(0.75, 'rgba(120,128,70,0.9)');
          grad.addColorStop(1, 'rgba(100,126,64,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, s, s);
          for (let i = 0; i < 320; i++) {
            const h = 60 + rand() * 30;
            ctx.fillStyle = `hsla(${h},${30 + rand() * 25}%,${32 + rand() * 24}%,${0.25 + rand() * 0.3})`;
            ctx.save();
            ctx.translate(rand() * s, rand() * s);
            ctx.rotate(rand() * 3);
            ctx.fillRect(0, 0, 2 + rand() * 6, 1);
            ctx.restore();
          }
        }),
        transparent: true, roughness: 1, depthWrite: false
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.025;
    floor.receiveShadow = true;
    g.add(floor);

    // Bamboo: a ring of tall stalks with an opening toward the valley (+x)
    const stalkTex = canvasTexture(64, (ctx, s) => {
      ctx.fillStyle = '#7fa65a';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = 'rgba(40,70,28,0.55)';
        ctx.fillRect(0, (i + 0.5) / 7 * s - 1.5, s, 3);
      }
      ctx.fillStyle = 'rgba(255,255,220,0.18)';
      ctx.fillRect(s * 0.18, 0, s * 0.12, s);
    });
    const stalkGeo = new THREE.CylinderGeometry(0.05, 0.07, 1, 7, 1, true);
    stalkGeo.translate(0, 0.5, 0);
    const stalkCount = 44;
    const stalks = new THREE.InstancedMesh(stalkGeo, new THREE.MeshStandardMaterial({ map: stalkTex, roughness: 0.55, color: 0xffffff }), stalkCount);
    stalks.name = 'Glade Bamboo';
    stalks.castShadow = true;
    // Slim drooping leaf blades, several to a stalk top, instead of one fat crown
    const leafGeo = new THREE.ConeGeometry(0.17, 1.35, 4);
    leafGeo.translate(0, 0.675, 0);
    const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true }), stalkCount * 6);
    leaves.name = 'Glade Bamboo Leaves';
    leaves.castShadow = true;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
    this.stalkTops = [];
    let sn = 0, ln = 0;
    for (let i = 0; i < stalkCount; i++) {
      let a, rr;
      if (i < 36) {
        // Outer ring, skipping the entrance
        a = (i / 36) * TAU + (rand() - 0.5) * 0.12;
        const d = Math.abs(((a + Math.PI) % TAU) - Math.PI);
        if (d < 0.5) continue;
        rr = r - 0.4 + rand() * 1.5;
      } else {
        a = rand() * TAU;
        rr = r + 0.8 + rand() * 1.8;
      }
      const sx = Math.cos(a) * rr, sz = Math.sin(a) * rr;
      const h = 6.0 + rand() * 3.2;
      // Lean outward a little, like a grove opening to the sky
      const lean = 0.04 + rand() * 0.05;
      e.set(Math.sin(a) * lean, 0, -Math.cos(a) * lean);
      q.setFromEuler(e);
      m4.compose(new THREE.Vector3(sx, 0, sz), q, new THREE.Vector3(1, h, 1));
      stalks.setMatrixAt(sn, m4);
      col.setHSL(0.24 + rand() * 0.06, 0.38 + rand() * 0.14, 0.42 + rand() * 0.12);
      stalks.setColorAt(sn, col);
      sn++;
      const topX = sx + Math.cos(a) * lean * h, topZ = sz + Math.sin(a) * lean * h;
      this.stalkTops.push({ x: topX, y: h, z: topZ, a });
      for (let k = 0; k < 6; k++) {
        const ly = h * (0.72 + (k % 3) * 0.12) + rand() * 0.2;
        // Out and down from the stalk: rotate about X (droop), then spin
        e.set(1.5 + rand() * 0.7, (k / 6) * TAU + rand() * 0.8, 0, 'YXZ');
        q.setFromEuler(e);
        const lx = sx + Math.cos(a) * lean * ly, lz = sz + Math.sin(a) * lean * ly;
        m4.compose(new THREE.Vector3(lx, ly, lz), q, new THREE.Vector3(1.0, 0.9 + rand() * 0.7, 1.0));
        leaves.setMatrixAt(ln, m4);
        col.setHSL(0.24 + rand() * 0.07, 0.42 + rand() * 0.18, 0.32 + rand() * 0.16);
        leaves.setColorAt(ln, col);
        ln++;
      }
      // A slim collider so the cat (and the camera) treat the grove as solid
      const hw = 0.11;
      this.city.colliders.push(new THREE.Box3(
        new THREE.Vector3(x + sx - hw, 0, z + sz - hw),
        new THREE.Vector3(x + sx + hw, 3.0, z + sz + hw)
      ));
    }
    stalks.count = sn;
    leaves.count = ln;
    for (const mesh of [stalks, leaves]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      g.add(mesh);
    }

    // Paper lanterns strung from the bamboo; each kindles at its own moment
    const lanternGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.42, 10);
    const stringMat = new THREE.LineBasicMaterial({ color: 0x4a3a28 });
    const haloTex = this.city.lanternHaloTex;
    const picks = this.stalkTops.filter((_, i) => i % 3 === 0).slice(0, 11);
    picks.forEach((top, i) => {
      const hang = 2.1 + rand() * 1.4;
      const ix = top.x * 0.8 - Math.cos(top.a) * 0.0;
      const iz = top.z * 0.8;
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffe4bc, emissive: 0x7a3c0c, emissiveIntensity: 0.25, roughness: 0.9
      });
      const lamp = new THREE.Mesh(lanternGeo, mat);
      lamp.position.set(ix, hang, iz);
      g.add(lamp);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.04, 10), new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.9 }));
      cap.position.set(ix, hang + 0.23, iz);
      g.add(cap);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(top.x, top.y * 0.62, top.z),
          new THREE.Vector3(ix, hang + 0.25, iz)
        ]),
        stringMat
      );
      g.add(line);
      const haloMat = new THREE.SpriteMaterial({
        map: haloTex, color: 0xffc070, transparent: true, opacity: 0,
        depthWrite: false, blending: THREE.AdditiveBlending, fog: false
      });
      const halo = new THREE.Sprite(haloMat);
      halo.scale.set(1.9, 1.9, 1);
      halo.position.set(ix, hang, iz);
      g.add(halo);
      this.lanterns.push({ mat, haloMat, lamp, onset: ((i * 0.618) % 1) * 0.42, phase: rand() * TAU, base: hang, ix, iz });
    });

    // A flat sitting stone and a mossy boulder in the middle of the ring
    const seat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.78, 0.1, 14),
      new THREE.MeshStandardMaterial({ color: 0x8d9288, roughness: 0.95, flatShading: true })
    );
    seat.position.set(0, 0.05, 0);
    seat.receiveShadow = true;
    g.add(seat);
    const boulder = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.55, 0),
      new THREE.MeshStandardMaterial({ color: 0x6f7b62, roughness: 1, flatShading: true })
    );
    boulder.position.set(-1.7, 0.3, -0.9);
    boulder.scale.set(1.2, 0.75, 1);
    boulder.castShadow = true;
    g.add(boulder);
    this.city.colliders.push(new THREE.Box3(
      new THREE.Vector3(x - 1.7 - 0.6, 0, z - 0.9 - 0.5),
      new THREE.Vector3(x - 1.7 + 0.6, 0.55, z - 0.9 + 0.5)
    ));

    // Fireflies that gather once the lanterns are lit
    const count = 34;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    this.gladeFlies = [];
    for (let i = 0; i < count; i++) {
      this.gladeFlies.push({ a: rand() * TAU, rr: 0.4 + rand() * (r - 1.2), y: 0.4 + rand() * 2.6, sp: 0.2 + rand() * 0.4, ph: rand() * TAU });
    }
    this.gladeFlyMat = new THREE.PointsMaterial({
      size: 0.16, map: glowTexture('rgba(255,236,150,1)', 'rgba(255,200,90,0.5)'), transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe9a0, fog: false
    });
    this.gladeFlyPoints = new THREE.Points(geo, this.gladeFlyMat);
    this.gladeFlyPoints.frustumCulled = false;
    g.add(this.gladeFlyPoints);

    this.group.add(g);
    this.updateGladeFlies(0, 0);
  }

  updateGladeFlies(dt, strength) {
    const attr = this.gladeFlyPoints.geometry.attributes.position;
    const t = this.time;
    for (let i = 0; i < this.gladeFlies.length; i++) {
      const f = this.gladeFlies[i];
      f.a += dt * f.sp * 0.35;
      const y = f.y + Math.sin(t * f.sp * 2 + f.ph) * 0.35;
      attr.setXYZ(i, Math.cos(f.a) * f.rr + Math.sin(t * 0.5 + f.ph) * 0.2, y, Math.sin(f.a) * f.rr + Math.cos(t * 0.45 + f.ph) * 0.2);
    }
    attr.needsUpdate = true;
    // Blink: fireflies pulse as a group more than individually, which is plenty at this size
    this.gladeFlyMat.opacity = strength * (0.55 + 0.35 * Math.sin(t * 1.8));
  }

  /* ------------------------------------------------------------------ */
  /*  Wiring + per-frame                                                 */
  /* ------------------------------------------------------------------ */

  /**
   * Register the two places as sit-and-watch spots and keep the handles the
   * per-frame update needs.
   *   { audio, contextActions, ui, progression, discover(section, entry) -> isNew }
   */
  attach(ctx) {
    this.ctx = ctx;
    const ca = ctx.contextActions;
    ca.restSpots.push({
      id: 'moonpool', name: 'Moon Pool', hidden: true,
      pos: new THREE.Vector3(POOL.x, 0, POOL.z + POOL.r + 0.95),
      poem: 'The water holds the sky very still, and so, for a while, do you.',
      quiet: {
        day: 'Light from the water wanders across the leaves, slow as breathing.',
        night: 'The moon settles on the pool, and the pool lets it stay.',
        rain: 'Each raindrop opens one small circle, and the circles never quite touch.'
      }
    });
    ca.restSpots.push({
      id: 'glade', name: 'Lantern Glade', hidden: true,
      pos: new THREE.Vector3(GLADE.x, 0, GLADE.z),
      poem: 'Bamboo knocks softly on bamboo, like someone asking to come in.',
      quiet: {
        day: 'The grove creaks and sways, and the light moves with it.',
        night: 'One by one the lanterns breathe, and the dark makes room.',
        rain: 'Rain drums the leaves overhead; down here, it is only a hush.'
      }
    });
  }

  /** Dusk-to-dark amount shared with the street lanterns (0 by day, 1 at night). */
  static nightness(sky) {
    if (!sky || !sky.sunDir) return 0;
    return Math.max(0, 1 - Math.max(0, sky.sunDir.y) * 5);
  }

  update(dt, playerPos, sky) {
    this.time += dt;
    const night = HiddenPlaces.nightness(sky);
    const sunUp = sky && sky.sunDir ? Math.max(0, sky.sunDir.y) : 0.5;
    const calm = sky && (sky.weather === 'rain' || sky.weather === 'mist') ? 0.5 : 1;

    // ---- Moon Pool ----
    const dayLight = smooth(0.05, 0.4, sunUp);
    this.causticMat.opacity = dayLight * 0.5 * calm;
    this.causticTex.offset.set(this.time * 0.012, this.time * 0.008);
    this.poolWaterMat.emissiveIntensity = 0.3 + night * 0.9;
    this.moonMat.opacity = night * 0.75 * (0.9 + 0.1 * Math.sin(this.time * 1.3));
    this.moonGlow.position.x = POOL.r * 0.12 + Math.sin(this.time * 0.5) * 0.08;
    this.poolToroMat.emissiveIntensity = 0.2 + night * 2.0;
    this.poolToroHaloMat.opacity = night * 0.5 * (0.88 + Math.sin(this.time * 7.1) * 0.12);
    this.updatePoolMotes(dt, night * calm);

    // ---- Lantern Glade ----
    for (let i = 0; i < this.lanterns.length; i++) {
      const l = this.lanterns[i];
      const k = smooth(0, 1, Math.min(1, Math.max(0, (night - l.onset) / 0.5)));
      const flicker = 0.9 + Math.sin(this.time * 6.3 + l.phase) * 0.06 + Math.sin(this.time * 17 + l.phase) * 0.04;
      l.mat.emissiveIntensity = 0.25 + k * 2.4 * flicker;
      l.haloMat.opacity = k * 0.6 * flicker;
      // A breath of sway, more in wind
      l.lamp.position.y = l.base + Math.sin(this.time * 1.1 + l.phase) * 0.03;
    }
    this.updateGladeFlies(dt, smooth(0.5, 1, night));

    if (!playerPos) return;
    this.updateDiscovery(playerPos);
    this.updateSound(dt, playerPos, sky);
  }

  updateDiscovery(playerPos) {
    const c = this.ctx;
    if (!c) return;
    const near = (p, rad) => Math.hypot(playerPos.x - p.x, playerPos.z - p.z) < rad;
    if (!this.found[POOL.id] && near(POOL, POOL.r + 2.5)) {
      this.found[POOL.id] = true;
      const isNew = c.discover('places', { id: 'found-moon-pool', text: 'Found the Moon Pool, tucked away behind the shrine grove' });
      if (isNew) {
        c.ui.showToast('💧 A hidden pool — the Moon Pool', 3400);
        if (c.progression) c.progression.addXP(25, 'Found the Moon Pool');
      }
    }
    if (!this.found[GLADE.id] && near(GLADE, GLADE.r - 0.5)) {
      this.found[GLADE.id] = true;
      const isNew = c.discover('places', { id: 'found-lantern-glade', text: 'Found the Lantern Glade, ringed by singing bamboo' });
      if (isNew) {
        c.ui.showToast('🏮 A hidden grove — the Lantern Glade', 3400);
        if (c.progression) c.progression.addXP(25, 'Found the Lantern Glade');
      }
    }
  }

  /* ---- Sound: synthesised on the fly through the ambient bus ---- */

  audioOut() {
    const a = this.ctx && this.ctx.audio;
    if (!a || !a.initialized || !a.ctx || a.ctx.state !== 'running') return null;
    return { a, out: (a.buses && a.buses.ambient) || a.master };
  }

  /** One glassy drop: a pentatonic ping with a short, bright overtone. */
  playPoolDrop(level) {
    const h = this.audioOut();
    if (!h) return;
    const { a, out } = h;
    const t = a.ctx.currentTime;
    const f = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)] * (Math.random() < 0.3 ? 2 : 1);
    for (const [mul, peak, dur] of [[1, 0.05, 2.4], [2.01, 0.014, 0.9]]) {
      const osc = a.ctx.createOscillator();
      const gain = a.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f * mul * 1.012, t);
      osc.frequency.exponentialRampToValueAtTime(f * mul, t + 0.06);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(peak * level, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0005, t + dur);
      osc.connect(gain).connect(out);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }
  }

  /** A hollow bamboo knock — a short pitched thunk with a woody click. */
  playBambooKnock(level) {
    const h = this.audioOut();
    if (!h) return;
    const { a, out } = h;
    const t = a.ctx.currentTime;
    const f = 300 + Math.random() * 160;
    const osc = a.ctx.createOscillator();
    const gain = a.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f * 1.5, t);
    osc.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.11 * level, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0005, t + 0.34);
    const body = a.ctx.createBiquadFilter();
    body.type = 'bandpass';
    body.frequency.value = f * 1.3;
    body.Q.value = 5;
    osc.connect(body).connect(gain).connect(out);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  /** A long breath of leaves: band-passed noise that swells and recedes. */
  playLeafBreath(level) {
    const h = this.audioOut();
    if (!h) return;
    const { a, out } = h;
    const t = a.ctx.currentTime;
    const dur = 3.4;
    const samples = Math.floor(a.ctx.sampleRate * dur);
    const buf = a.ctx.createBuffer(1, samples, a.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < samples; i++) d[i] = Math.random() * 2 - 1;
    const src = a.ctx.createBufferSource();
    src.buffer = buf;
    const f = a.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(1500, t);
    f.frequency.linearRampToValueAtTime(2300, t + dur * 0.5);
    f.frequency.linearRampToValueAtTime(1300, t + dur);
    f.Q.value = 0.8;
    const gain = a.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.05 * level, t + dur * 0.4);
    gain.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(f).connect(gain).connect(out);
    src.start(t);
  }

  updateSound(dt, playerPos, sky) {
    const raining = sky && sky.weather === 'rain';
    const poolD = Math.hypot(playerPos.x - POOL.x, playerPos.z - POOL.z);
    if (poolD < 15) {
      const level = Math.pow(1 - poolD / 15, 1.6);
      this.soundTimers.pool -= dt;
      if (this.soundTimers.pool <= 0) {
        this.soundTimers.pool = (raining ? 1.2 : 2.4) + Math.random() * 3.6;
        this.playPoolDrop(level);
      }
    }
    const gladeD = Math.hypot(playerPos.x - GLADE.x, playerPos.z - GLADE.z);
    if (gladeD < 17) {
      const level = Math.pow(1 - gladeD / 17, 1.5);
      this.soundTimers.glade -= dt;
      if (this.soundTimers.glade <= 0) {
        this.soundTimers.glade = 2.6 + Math.random() * 4.5;
        if (Math.random() < 0.6) this.playBambooKnock(level);
        else this.playLeafBreath(level);
      }
    }
  }
}
