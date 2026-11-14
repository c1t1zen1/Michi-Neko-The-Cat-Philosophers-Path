import * as THREE from 'three';
import { CLASSIC_ASSETS, isAssetInstance, scopeAssets } from './kit/runtime.js?v=20261113a';

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

// Asset routing (BUILD_GUIDE_FABLE §3.4, Integrator rulings R12 / R18). Each
// builder runs a layout step (every this.rand() draw, in the original order,
// recorded as plain data) and hands a classic mesh step to placeAsset(), which
// builds the kit asset instead when one is registered and active for that
// inventory id. The layout step always runs, so the hidden-places stream
// advances the same on both asset sets.

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
  /**
   * `{ assets }`: the asset runtime (main.js hands it in); without one the
   * classic builders run, as in the review sheets and the catalog.
   */
  constructor(scene, city, { assets } = {}) {
    this.scene = scene;
    this.city = city;
    // Hidden places build with their own inline materials: no table to scope with.
    this.assets = scopeAssets(assets, {});
    this.time = 0;
    this.rand = mulberry(0x4d43);
    this.group = new THREE.Group();
    this.group.name = 'Hidden Places';
    scene.add(this.group);

    this.found = { [POOL.id]: false, [GLADE.id]: false };
    this.lanterns = [];
    this.soundTimers = { pool: 3, glade: 2 };
    this.ctx = null;
    // Gameplay anchors (R18: footprint `anchors` land on fields of these
    // names): poolRestPos and gladeRestPos, the two sit-and-watch spots
    // attach() hands to the ContextActionManager.
    this.poolRestPos = null;
    this.gladeRestPos = null;

    this.buildMoonPool();
    this.buildLanternGlade();
  }

  /* ------------------------------------------------------------------ */
  /*  Asset routing                                                      */
  /* ------------------------------------------------------------------ */

  /**
   * Classic: `classicFn()` builds the meshes into `parent` and registers the
   * footprint itself. Kit: the instance's group goes into `parent` at the
   * layout's place and its footprint (by default the layout's) is registered
   * through registerFootprint(), the path the classic builders use.
   */
  placeAsset(id, layout, classicFn, parent = this.group) {
    const out = (this.assets || CLASSIC_ASSETS).build(id, layout, classicFn);
    if (!isAssetInstance(out)) return out;
    const g = out.group;
    if (layout.x !== undefined) g.position.set(layout.x, layout.y || 0, layout.z || 0);
    if (layout.ry) g.rotation.y = layout.ry;
    if (layout.scale) g.scale.setScalar(layout.scale);
    parent.add(g);
    this.registerFootprint(out.footprint || layout.footprint, layout.footprint);
    for (const [field, part] of Object.entries(layout.bind || {})) {
      this[field] = (out.parts && out.parts[part]) || (out.sockets && out.sockets[part]) || null;
    }
    return out;
  }

  /**
   * One footprint into the world's registries, each in its list order:
   * vegetation exclusions, water rects and colliders (the valley's lists,
   * read by Vegetation and the player), then the anchors, each onto the
   * field of its name (R18), which attach() reads. Anchors a kit footprint
   * leaves out are filled from `fallback` (the layout's).
   */
  registerFootprint(fp, fallback = null) {
    if (!fp) return;
    const city = this.city;
    for (const rect of fp.exclusions || []) city.vegetationExclusions.push(rect);
    for (const rect of fp.waterRects || []) city.waterRects.push(rect);
    for (const box of fp.colliders || []) city.colliders.push(box);
    const anchors = { ...((fallback && fallback.anchors) || {}), ...(fp.anchors || {}) };
    for (const [name, value] of Object.entries(anchors)) this[name] = value;
  }

  /* ------------------------------------------------------------------ */
  /*  Moon Pool                                                          */
  /* ------------------------------------------------------------------ */

  buildMoonPool() {
    const layout = this.poolLayout = this.layoutMoonPool();
    const out = this.placeAsset('moon-pool', layout, () => this.meshMoonPoolClassic(layout));
    if (isAssetInstance(out)) this.poolGroup = out.group;
    return out;
  }

  /**
   * Everything the Moon Pool draws from the hidden-places stream, in the
   * order the classic builder drew it: the apron's moss marks and the caustic
   * rings (both painted into textures), the rim stones, lily pads, lotus,
   * then the motes. Positions are local to the pool's group.
   */
  layoutMoonPool() {
    const { x, z, r } = POOL;
    const rand = this.rand;
    const clear = r * 2 + 5;
    const side = r * 1.7;
    const exclusion = { x, z, width: clear, depth: clear };
    const water = [x, z, side, side];
    const poolRestPos = [x, 0, z + r + 0.95];

    // apron texture marks: [r, g, b, a, x/size, y/size, w, h]
    const marks = [];
    for (let i = 0; i < 260; i++) {
      marks.push([60 + rand() * 40, 90 + rand() * 50, 50 + rand() * 30, 0.12 + rand() * 0.2, rand(), rand(), 2 + rand() * 4, 1 + rand() * 2]);
    }
    // caustic texture rings: centre / size, radius, then nine wrapped copies [squash, turn]
    const rings = [];
    for (let i = 0; i < 26; i++) {
      const cx = rand(), cy = rand(), rr = 5 + rand() * 13;
      const copies = [];
      for (let k = 0; k < 9; k++) copies.push([0.55 + rand() * 0.3, rand() * 3]);
      rings.push({ cx, cy, rr, copies });
    }
    // rim stones, leaving the arrival gap on the south shore (+z local)
    const stones = [];
    for (let i = 0; i < 46 && stones.length < 34; i++) {
      const a = (i / 46) * TAU + rand() * 0.06;
      const south = Math.abs(((a - Math.PI / 2 + Math.PI) % TAU) - Math.PI);
      if (south < 0.42) continue;
      const rr = r + 0.12 + rand() * 0.38;
      const s = 0.65 + rand() * 0.9;
      const euler = [rand() * 0.6, rand() * TAU, rand() * 0.6];
      const hsl = [0.28 + rand() * 0.1, 0.1 + rand() * 0.12, 0.34 + rand() * 0.16];
      stones.push({ a, rr, s, euler, hsl });
    }
    const pads = [];
    for (let i = 0; i < 9; i++) {
      const a = rand() * TAU, rr = 0.5 + rand() * (r - 1.1);
      const turn = rand() * TAU;
      const scale = 0.7 + rand() * 0.8;
      pads.push({ index: i, x: Math.cos(a) * rr, y: 0.062, z: Math.sin(a) * rr, ry: turn, scale });
    }
    const lotus = [];
    for (let i = 0; i < 3; i++) {
      const a = 1.0 + i * 2.1 + rand() * 0.4, rr = 0.9 + rand() * 1.0;
      lotus.push({ index: i, x: Math.cos(a) * rr, y: 0.06, z: Math.sin(a) * rr, petals: 7 });
    }
    const motes = [];
    for (let i = 0; i < 42; i++) {
      motes.push({ a: rand() * TAU, rr: rand() * (r - 0.2), y: rand() * 2.4, sp: 0.12 + rand() * 0.2, ph: rand() * TAU });
    }
    const toroAngle = 0.55;
    const toroX = Math.cos(toroAngle) * (r + 1.5), toroZ = Math.sin(toroAngle) * (r + 1.5);

    return {
      index: 0, name: 'Moon Pool', x, y: 0, z, r,
      // the whole pool's footprint (a kit that replaces the whole pool inherits all of it)
      footprint: { colliders: [], exclusions: [exclusion], waterRects: [water], anchors: { poolRestPos } },
      apron: { index: 0, x: 0, y: 0, z: 0, radius: r + 2.4, lift: 0.022, marks, footprint: {} },
      water: { index: 0, x: 0, y: 0, z: 0, radius: r, surface: 0.05, rings, footprint: {} },
      moon: { index: 0, x: r * 0.12, y: 0.09, z: -r * 0.1, size: r * 1.5, footprint: {} },
      rim: { index: 0, x: 0, y: 0, z: 0, capacity: 34, stones, footprint: {} },
      pads: pads.map((p) => Object.assign(p, { footprint: {} })),
      lotus: lotus.map((p) => Object.assign(p, { footprint: {} })),
      seat: { index: 0, x: 0, y: 0, z: r + 0.95, height: 0.09, footprint: { anchors: { poolRestPos } } },
      toro: { index: 0, x: toroX, y: 0, z: toroZ, angle: toroAngle, glowY: 0.84, footprint: {} },
      motes: { index: 0, x: 0, y: 0, z: 0, list: motes, footprint: {} }
    };
  }

  meshMoonPoolClassic(L) {
    const g = new THREE.Group();
    g.name = 'Moon Pool';
    g.position.set(L.x, 0, L.z);
    this.poolGroup = g;

    // Keep trees, bushes and grass off the clearing, and let the cat wade:
    // the inscribed square of the pool counts as water.
    this.registerFootprint({ exclusions: L.footprint.exclusions, waterRects: L.footprint.waterRects });

    this.placeAsset('pool-apron', L.apron, () => this.meshPoolApronClassic(L.apron, g), g);
    this.placeAsset('pool-water', L.water, () => this.meshPoolWaterClassic(L.water, g), g);
    this.placeAsset('pool-moon', L.moon, () => this.meshPoolMoonClassic(L.moon, g), g);
    this.placeAsset('pool-rim', L.rim, () => this.meshPoolRimClassic(L.rim, g), g);

    // Lily pads and three pale lotus blossoms
    const padMat = new THREE.MeshStandardMaterial({ color: 0x4f8a4c, roughness: 0.8, side: THREE.DoubleSide });
    const padGeo = new THREE.CircleGeometry(0.3, 14, 0.4, TAU - 0.5);
    for (const pad of L.pads) {
      this.placeAsset('lily-pads', pad, () => {
        const mesh = new THREE.Mesh(padGeo, padMat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.rotation.z = pad.ry;
        mesh.position.set(pad.x, pad.y, pad.z);
        mesh.scale.setScalar(pad.scale);
        g.add(mesh);
        return mesh;
      }, g);
    }
    const petalMat = new THREE.MeshStandardMaterial({ color: 0xf6dce6, roughness: 0.6, emissive: 0x3a2030, emissiveIntensity: 0.2 });
    const petalGeo = new THREE.ConeGeometry(0.07, 0.2, 6);
    petalGeo.translate(0, 0.1, 0);
    for (const flower of L.lotus) {
      this.placeAsset('lotus', flower, () => {
        const bloom = new THREE.Group();
        for (let p = 0; p < flower.petals; p++) {
          const petal = new THREE.Mesh(petalGeo, petalMat);
          petal.rotation.set(0.9, (p / 7) * TAU, 0, 'YXZ');
          bloom.add(petal);
        }
        bloom.position.set(flower.x, flower.y, flower.z);
        g.add(bloom);
        return bloom;
      }, g);
    }

    this.placeAsset('pool-seat', L.seat, () => this.meshPoolSeatClassic(L.seat, g), g);
    this.placeAsset('pool-toro', L.toro, () => this.meshPoolToroClassic(L.toro, g), g);
    this.placeAsset('pool-motes', L.motes, () => this.meshPoolMotesClassic(L.motes, g), g);

    this.group.add(g);
    this.updatePoolMotes(0, 0);
    return g;
  }

  meshPoolApronClassic(L, g) {
    const marks = L.marks;
    // Mossy ground apron around the water
    const apron = new THREE.Mesh(
      new THREE.CircleGeometry(L.radius, 40),
      new THREE.MeshStandardMaterial({
        map: canvasTexture(128, (ctx, s) => {
          const grad = ctx.createRadialGradient(s / 2, s / 2, s * 0.18, s / 2, s / 2, s / 2);
          grad.addColorStop(0, 'rgba(70,96,62,1)');
          grad.addColorStop(0.7, 'rgba(84,112,66,0.85)');
          grad.addColorStop(1, 'rgba(90,120,70,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, s, s);
          for (const [cr, cg, cb, ca, mx, my, mw, mh] of marks) {
            ctx.fillStyle = `rgba(${cr},${cg},${cb},${ca})`;
            ctx.fillRect(mx * s, my * s, mw, mh);
          }
        }),
        transparent: true, roughness: 1, depthWrite: false
      })
    );
    apron.rotation.x = -Math.PI / 2;
    apron.position.y = L.lift;
    apron.receiveShadow = true;
    g.add(apron);
    return apron;
  }

  meshPoolWaterClassic(L, g) {
    const r = L.radius, rings = L.rings;
    // The water: a deep, slightly glassy disc plus a drifting caustic layer
    this.poolWaterMat = new THREE.MeshStandardMaterial({
      color: 0x24616c, roughness: 0.06, metalness: 0.05, transparent: true, opacity: 0.9,
      emissive: 0x0a2a30, emissiveIntensity: 0.35, envMapIntensity: 1.5
    });
    const water = new THREE.Mesh(new THREE.CircleGeometry(r, 48), this.poolWaterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = L.surface;
    water.renderOrder = 1;
    g.add(water);

    this.causticTex = canvasTexture(128, (ctx, s) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = 'rgba(190,255,240,0.55)';
      ctx.lineWidth = 1.4;
      for (const ring of rings) {
        const cx = ring.cx * s, cy = ring.cy * s, rr = ring.rr;
        let k = 0;
        for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) {
          const [squash, turn] = ring.copies[k++];
          ctx.beginPath();
          ctx.ellipse(cx + ox, cy + oy, rr, rr * squash, turn, 0, TAU);
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
    return water;
  }

  meshPoolMoonClassic(L, g) {
    // Moon pooled on the water: a soft cool disc that only the night wakes
    this.moonTex = glowTexture('rgba(235,246,255,1)', 'rgba(150,200,235,0.45)');
    this.moonMat = new THREE.SpriteMaterial({
      map: this.moonTex, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false
    });
    this.moonGlow = new THREE.Sprite(this.moonMat);
    this.moonGlow.scale.set(L.size, L.size, 1);
    this.moonGlow.position.set(L.x, L.y, L.z);
    this.moonGlow.renderOrder = 3;
    g.add(this.moonGlow);
    return this.moonGlow;
  }

  meshPoolRimClassic(L, g) {
    // Rim stones, with a gap on the south shore for a visitor to arrive by
    const stoneGeo = new THREE.DodecahedronGeometry(0.34, 0);
    const stones = new THREE.InstancedMesh(
      stoneGeo,
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true }),
      L.capacity
    );
    stones.name = 'Moon Pool Stones';
    stones.castShadow = true;
    stones.receiveShadow = true;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const col = new THREE.Color();
    let n = 0;
    for (const { a, rr, s, euler, hsl } of L.stones) {
      e.set(euler[0], euler[1], euler[2]);
      q.setFromEuler(e);
      m4.compose(
        new THREE.Vector3(Math.cos(a) * rr, 0.08 * s, Math.sin(a) * rr),
        q, new THREE.Vector3(s * 1.15, s * 0.62, s)
      );
      stones.setMatrixAt(n, m4);
      col.setHSL(hsl[0], hsl[1], hsl[2]);
      stones.setColorAt(n, col);
      n++;
    }
    stones.count = n;
    stones.instanceMatrix.needsUpdate = true;
    if (stones.instanceColor) stones.instanceColor.needsUpdate = true;
    g.add(stones);
    return stones;
  }

  meshPoolSeatClassic(L, g) {
    // Flat sitting stone on the south shore (the "sit & watch" spot)
    const seat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.7, L.height, 14),
      new THREE.MeshStandardMaterial({ color: 0x8d9288, roughness: 0.95, flatShading: true })
    );
    seat.position.set(L.x, 0.045, L.z);
    seat.receiveShadow = true;
    g.add(seat);
    this.registerFootprint(L.footprint);
    return seat;
  }

  meshPoolToroClassic(L, g) {
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
    toro.position.set(L.x, 0, L.z);
    g.add(toro);
    this.poolToroHaloMat = new THREE.SpriteMaterial({
      map: this.city.lanternHaloTex, color: 0xffc878, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false
    });
    const halo = new THREE.Sprite(this.poolToroHaloMat);
    halo.scale.set(1.5, 1.5, 1);
    halo.position.copy(toro.position).setY(L.glowY);
    g.add(halo);
    return toro;
  }

  meshPoolMotesClassic(L, g) {
    // Motes lifting off the water on still nights
    const count = L.list.length;
    const pos = new Float32Array(count * 3);
    this.poolMotes = L.list.map((m) => ({ ...m }));
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.poolMoteMat = new THREE.PointsMaterial({
      size: 0.13, map: glowTexture('rgba(220,245,255,1)', 'rgba(150,215,235,0.5)'), transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, color: 0xcdeaf5, fog: false
    });
    this.poolMotePoints = new THREE.Points(moteGeo, this.poolMoteMat);
    this.poolMotePoints.frustumCulled = false;
    g.add(this.poolMotePoints);
    return this.poolMotePoints;
  }

  updatePoolMotes(dt, strength) {
    if (!this.poolMotePoints) return; // a kit pool-motes animates itself
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
    const layout = this.gladeLayout = this.layoutLanternGlade();
    // The stalk tops are layout data (the lanterns hang from them on either set)
    this.stalkTops = layout.bamboo.tops.map((t) => ({ ...t }));
    const out = this.placeAsset('lantern-glade', layout, () => this.meshLanternGladeClassic(layout));
    if (isAssetInstance(out)) this.gladeGroup = out.group;
    return out;
  }

  /**
   * Everything the Lantern Glade draws from the hidden-places stream, in the
   * classic order: the floor's leaf litter (painted into its texture), the
   * bamboo ring and its leaves, each lantern's hang and flicker phase, then
   * the fireflies. Positions are local to the glade's group; colliders world.
   */
  layoutLanternGlade() {
    const { x, z, r } = GLADE;
    const rand = this.rand;
    const clear = r * 2 + 4;
    const exclusion = { x, z, width: clear, depth: clear };
    const gladeRestPos = [x, 0, z];

    // floor texture litter: [hue, sat, light, alpha, x/size, y/size, turn, length]
    const litter = [];
    for (let i = 0; i < 320; i++) {
      const h = 60 + rand() * 30;
      litter.push([h, 30 + rand() * 25, 32 + rand() * 24, 0.25 + rand() * 0.3, rand(), rand(), rand() * 3, 2 + rand() * 6]);
    }

    // the ring of tall stalks, open toward the valley (+x), and outer stragglers
    const stalkCount = 44;
    const stalks = [], tops = [], stalkColliders = [];
    for (let i = 0; i < stalkCount; i++) {
      let a, rr;
      if (i < 36) {
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
      const lean = 0.04 + rand() * 0.05;
      const hsl = [0.24 + rand() * 0.06, 0.38 + rand() * 0.14, 0.42 + rand() * 0.12];
      const topX = sx + Math.cos(a) * lean * h, topZ = sz + Math.sin(a) * lean * h;
      tops.push({ x: topX, y: h, z: topZ, a });
      const leaves = [];
      for (let k = 0; k < 6; k++) {
        const ly = h * (0.72 + (k % 3) * 0.12) + rand() * 0.2;
        const euler = [1.5 + rand() * 0.7, (k / 6) * TAU + rand() * 0.8];
        const length = 0.9 + rand() * 0.7;
        leaves.push({ ly, euler, length, hsl: [0.24 + rand() * 0.07, 0.42 + rand() * 0.18, 0.32 + rand() * 0.16] });
      }
      // A slim collider so the cat (and the camera) treat the grove as solid
      const hw = 0.11;
      stalkColliders.push(new THREE.Box3(
        new THREE.Vector3(x + sx - hw, 0, z + sz - hw),
        new THREE.Vector3(x + sx + hw, 3.0, z + sz + hw)
      ));
      stalks.push({ a, sx, sz, h, lean, hsl, leaves });
    }

    // lanterns hang from every third stalk top (eleven of them)
    const picks = tops.filter((_, i) => i % 3 === 0).slice(0, 11);
    const lanterns = picks.map((top, i) => {
      const hang = 2.1 + rand() * 1.4;
      const ix = top.x * 0.8 - Math.cos(top.a) * 0.0;
      const iz = top.z * 0.8;
      const phase = rand() * TAU;
      return {
        index: i, x: ix, y: hang, z: iz, hang, ix, iz, phase, onset: ((i * 0.618) % 1) * 0.42,
        string: [top.x, top.y * 0.62, top.z], footprint: {}
      };
    });

    const flies = [];
    for (let i = 0; i < 34; i++) {
      flies.push({ a: rand() * TAU, rr: 0.4 + rand() * (r - 1.2), y: 0.4 + rand() * 2.6, sp: 0.2 + rand() * 0.4, ph: rand() * TAU });
    }

    const boulderCollider = new THREE.Box3(
      new THREE.Vector3(x - 1.7 - 0.6, 0, z - 0.9 - 0.5),
      new THREE.Vector3(x - 1.7 + 0.6, 0.55, z - 0.9 + 0.5)
    );

    return {
      index: 0, name: 'Lantern Glade', x, y: 0, z, r,
      footprint: { colliders: [...stalkColliders, boulderCollider], exclusions: [exclusion], waterRects: [], anchors: { gladeRestPos } },
      floor: { index: 0, x: 0, y: 0, z: 0, radius: r - 0.4, lift: 0.025, litter, footprint: {} },
      bamboo: { index: 0, x: 0, y: 0, z: 0, stalks, tops, capacity: stalkCount, leavesPerStalk: 6, footprint: { colliders: stalkColliders } },
      lanterns,
      seat: {
        index: 0, x: 0, y: 0, z: 0, boulder: { x: -1.7, y: 0.3, z: -0.9, scale: [1.2, 0.75, 1] },
        footprint: { colliders: [boulderCollider], anchors: { gladeRestPos } }
      },
      flies: { index: 0, x: 0, y: 0, z: 0, list: flies, footprint: {} }
    };
  }

  meshLanternGladeClassic(L) {
    const g = new THREE.Group();
    g.name = 'Lantern Glade';
    g.position.set(L.x, 0, L.z);
    this.gladeGroup = g;

    this.registerFootprint({ exclusions: L.footprint.exclusions });

    this.placeAsset('glade-floor', L.floor, () => this.meshGladeFloorClassic(L.floor, g), g);
    this.placeAsset('glade-bamboo', L.bamboo, () => this.meshGladeBambooClassic(L.bamboo, g), g);

    // Paper lanterns strung from the bamboo; each kindles at its own moment
    const lanternGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.42, 10);
    const stringMat = new THREE.LineBasicMaterial({ color: 0x4a3a28 });
    const haloTex = this.city.lanternHaloTex;
    for (const lantern of L.lanterns) {
      this.placeAsset('glade-lanterns', lantern, () => this.meshGladeLanternClassic(lantern, g, lanternGeo, stringMat, haloTex), g);
    }

    this.placeAsset('glade-seat', L.seat, () => this.meshGladeSeatClassic(L.seat, g), g);
    this.placeAsset('glade-fireflies', L.flies, () => this.meshGladeFliesClassic(L.flies, g), g);

    this.group.add(g);
    this.updateGladeFlies(0, 0);
    return g;
  }

  meshGladeFloorClassic(L, g) {
    const litter = L.litter;
    // Leaf-litter floor
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(L.radius, 36),
      new THREE.MeshStandardMaterial({
        map: canvasTexture(128, (ctx, s) => {
          const grad = ctx.createRadialGradient(s / 2, s / 2, s * 0.1, s / 2, s / 2, s / 2);
          grad.addColorStop(0, 'rgba(150,134,86,1)');
          grad.addColorStop(0.75, 'rgba(120,128,70,0.9)');
          grad.addColorStop(1, 'rgba(100,126,64,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, s, s);
          for (const [h, sat, light, alpha, mx, my, turn, length] of litter) {
            ctx.fillStyle = `hsla(${h},${sat}%,${light}%,${alpha})`;
            ctx.save();
            ctx.translate(mx * s, my * s);
            ctx.rotate(turn);
            ctx.fillRect(0, 0, length, 1);
            ctx.restore();
          }
        }),
        transparent: true, roughness: 1, depthWrite: false
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = L.lift;
    floor.receiveShadow = true;
    g.add(floor);
    return floor;
  }

  meshGladeBambooClassic(L, g) {
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
    const stalkCount = L.capacity;
    const stalks = new THREE.InstancedMesh(stalkGeo, new THREE.MeshStandardMaterial({ map: stalkTex, roughness: 0.55, color: 0xffffff }), stalkCount);
    stalks.name = 'Glade Bamboo';
    stalks.castShadow = true;
    // Slim drooping leaf blades, several to a stalk top, instead of one fat crown
    const leafGeo = new THREE.ConeGeometry(0.17, 1.35, 4);
    leafGeo.translate(0, 0.675, 0);
    const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true }), stalkCount * L.leavesPerStalk);
    leaves.name = 'Glade Bamboo Leaves';
    leaves.castShadow = true;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
    let sn = 0, ln = 0;
    for (const { a, sx, sz, h, lean, hsl, leaves: blades } of L.stalks) {
      // Lean outward a little, like a grove opening to the sky
      e.set(Math.sin(a) * lean, 0, -Math.cos(a) * lean);
      q.setFromEuler(e);
      m4.compose(new THREE.Vector3(sx, 0, sz), q, new THREE.Vector3(1, h, 1));
      stalks.setMatrixAt(sn, m4);
      col.setHSL(hsl[0], hsl[1], hsl[2]);
      stalks.setColorAt(sn, col);
      sn++;
      for (const { ly, euler, length, hsl: tint } of blades) {
        // Out and down from the stalk: rotate about X (droop), then spin
        e.set(euler[0], euler[1], 0, 'YXZ');
        q.setFromEuler(e);
        const lx = sx + Math.cos(a) * lean * ly, lz = sz + Math.sin(a) * lean * ly;
        m4.compose(new THREE.Vector3(lx, ly, lz), q, new THREE.Vector3(1.0, length, 1.0));
        leaves.setMatrixAt(ln, m4);
        col.setHSL(tint[0], tint[1], tint[2]);
        leaves.setColorAt(ln, col);
        ln++;
      }
    }
    stalks.count = sn;
    leaves.count = ln;
    for (const mesh of [stalks, leaves]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      g.add(mesh);
    }
    this.registerFootprint(L.footprint);
    return stalks;
  }

  meshGladeLanternClassic(L, g, lanternGeo, stringMat, haloTex) {
    const { ix, iz, hang } = L;
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
        new THREE.Vector3(L.string[0], L.string[1], L.string[2]),
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
    this.lanterns.push({ mat, haloMat, lamp, onset: L.onset, phase: L.phase, base: hang, ix, iz });
    return lamp;
  }

  meshGladeSeatClassic(L, g) {
    // A flat sitting stone and a mossy boulder in the middle of the ring
    const seat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.78, 0.1, 14),
      new THREE.MeshStandardMaterial({ color: 0x8d9288, roughness: 0.95, flatShading: true })
    );
    seat.position.set(L.x, 0.05, L.z);
    seat.receiveShadow = true;
    g.add(seat);
    const b = L.boulder;
    const boulder = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.55, 0),
      new THREE.MeshStandardMaterial({ color: 0x6f7b62, roughness: 1, flatShading: true })
    );
    boulder.position.set(b.x, b.y, b.z);
    boulder.scale.set(b.scale[0], b.scale[1], b.scale[2]);
    boulder.castShadow = true;
    g.add(boulder);
    this.registerFootprint(L.footprint);
    return seat;
  }

  meshGladeFliesClassic(L, g) {
    // Fireflies that gather once the lanterns are lit
    const count = L.list.length;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    this.gladeFlies = L.list.map((f) => ({ ...f }));
    this.gladeFlyMat = new THREE.PointsMaterial({
      size: 0.16, map: glowTexture('rgba(255,236,150,1)', 'rgba(255,200,90,0.5)'), transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe9a0, fog: false
    });
    this.gladeFlyPoints = new THREE.Points(geo, this.gladeFlyMat);
    this.gladeFlyPoints.frustumCulled = false;
    g.add(this.gladeFlyPoints);
    return this.gladeFlyPoints;
  }

  updateGladeFlies(dt, strength) {
    if (!this.gladeFlyPoints) return; // a kit glade-fireflies animates itself
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
      pos: new THREE.Vector3().fromArray(this.poolRestPos || this.poolLayout.footprint.anchors.poolRestPos),
      poem: 'The water holds the sky very still, and so, for a while, do you.',
      quiet: {
        day: 'Light from the water wanders across the leaves, slow as breathing.',
        night: 'The moon settles on the pool, and the pool lets it stay.',
        rain: 'Each raindrop opens one small circle, and the circles never quite touch.'
      }
    });
    ca.restSpots.push({
      id: 'glade', name: 'Lantern Glade', hidden: true,
      pos: new THREE.Vector3().fromArray(this.gladeRestPos || this.gladeLayout.footprint.anchors.gladeRestPos),
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
    // (each handle exists only when its part was built classic; a kit part animates itself)
    const dayLight = smooth(0.05, 0.4, sunUp);
    if (this.causticMat) {
      this.causticMat.opacity = dayLight * 0.5 * calm;
      this.causticTex.offset.set(this.time * 0.012, this.time * 0.008);
      this.poolWaterMat.emissiveIntensity = 0.3 + night * 0.9;
    }
    if (this.moonMat) {
      this.moonMat.opacity = night * 0.75 * (0.9 + 0.1 * Math.sin(this.time * 1.3));
      this.moonGlow.position.x = POOL.r * 0.12 + Math.sin(this.time * 0.5) * 0.08;
    }
    if (this.poolToroMat) {
      this.poolToroMat.emissiveIntensity = 0.2 + night * 2.0;
      this.poolToroHaloMat.opacity = night * 0.5 * (0.88 + Math.sin(this.time * 7.1) * 0.12);
    }
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
