// LabWorld: the stage most labs play on. The game's real sky and sun, a painted
// plot of ground under the game's grass, ridges and tree masses behind, Michi,
// orbit and cat-eye cameras, click picking, a before/after split, and postcards.
import * as THREE from 'three';
import { CatWalker } from './catwalk.js';
import { Finisher } from './finish.js';
import { flag, SHOT, reduceMotion } from './stage.js';
import { Split } from './ui.js';
import { TAU, clamp, sstep, rng, V3, canvas2d, canvasTexture, fbm3, noise3, merge } from './craft.js';
import { paintify } from './painted.js';

const UI = '.split, .callouts, .callout, .hud, .touch, .dd, button, a, input, select, textarea, label';
const _v = new THREE.Vector3(), _r = new THREE.Raycaster(), _n = new THREE.Vector2();

/** A soft painted ridge line, wrapped round the valley. */
function ridgeTexture(seed, { w = 2048, h = 256, rough = 0.5, peak = 0.82, low = 0.4 } = {}) {
  const [c, x] = canvas2d(w, h);
  const r = rng(seed);
  const H = [];
  for (let i = 0; i < w; i++) {
    const u = i / w * TAU, a = Math.cos(u), b = Math.sin(u);   // loop seamlessly
    const v = fbm3(a * 1.6 + seed, b * 1.6, seed * 0.3, 5);
    const big = fbm3(a * 0.6 + 7 + seed, b * 0.6, 3, 3);
    H.push(h * (1 - (low + (peak - low) * clamp(big * 0.7 + v * rough * 1.1 - 0.05, 0, 1))));
  }
  const g = x.createLinearGradient(0, h * 0.1, 0, h);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#e9eaef'); g.addColorStop(1, '#c2c8d3');
  x.fillStyle = g;
  x.beginPath(); x.moveTo(0, h);
  H.forEach((y, i) => x.lineTo(i, y));
  x.lineTo(w, h); x.closePath(); x.fill();
  // brushed forest shadow down the flanks
  x.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 2400; i++) {
    const px = r() * w, top = H[Math.floor(px) % w], py = top + 4 + r() * r() * (h - top);
    x.fillStyle = `rgba(${90 + r() * 40},${110 + r() * 30},${130 + r() * 30},${0.05 + r() * 0.1})`;
    x.beginPath(); x.ellipse(px, py, 6 + r() * 26, 3 + r() * 9, r() * 0.5 - 0.25, 0, TAU); x.fill();
  }
  x.globalCompositeOperation = 'source-over';
  return canvasTexture(c, { repeat: true, aniso: 2 });
}

export class LabWorld {
  /**
   * paint(ctx, size, toPx): draw the plot's ground in canvas pixels. toPx(x, z)
   * maps world metres to canvas pixels. heightAt(x, z) shapes the land.
   */
  constructor(lab, el, {
    SkyClass, hour = 16.5, plot = 13, res = 1024, paint = null, heightAt = () => 0, outer = 0x6a8a48, shadowExtent = 14, shadowRes = 2048,
    camera = {}, views = null, finish = 'background', strength = 1, bounds = null, blocked = null, catStart = { x: 0, z: 2, heading: Math.PI }, coat, fov = 38, ridges = true, wind = 0.6, focusCat = false, ambient = 0.85, sunGain = 1.15, paintMix = 0.62, sat = 1.04, nightAmbient = 2.2, moonGain = 0.75, moonFrom = [0.5, 0.75, -0.42]
  }) {
    this.sat = sat; this.ambient = ambient; this.nightAmbient = nightAmbient; this.moonGain = moonGain; this.sunGain = sunGain; this.paintMix = paintMix;
    this.lab = lab; this.el = el; this.renderer = lab.renderer;
    this.plot = plot; this.heightAt = heightAt; this.bounds = bounds || { x0: -plot + 1, x1: plot - 1, z0: -plot + 1, z1: plot - 1 };
    this.blocked = blocked; this.catStart = catStart; this.coat = coat; this.wind = wind; this.finishMode = flag('finish', finish); this.strength = strength; this.focusCat = focusCat;
    const scene = this.scene = new THREE.Scene();
    this.origin = new THREE.Vector3();
    const sky = this.sky = new SkyClass(scene);
    sky.cycleSpeed = 0; sky.dayTime = hour; sky.weatherTimer = 1e9; sky.weatherPool = ['clear'];
    sky.attachRenderer(this.renderer);
    // PMREM renders to a far plane of 100 and the env dome has radius 200, so
    // the bake was seeing the page's white clear colour instead of the sky
    sky.envDome.scale.setScalar(0.4);
    sky.refreshEnvironment();
    const sc = sky.sun.shadow.camera;
    sc.left = sc.bottom = -shadowExtent; sc.right = sc.top = shadowExtent; sc.near = 90; sc.far = 200;
    sc.updateProjectionMatrix();
    sky.sun.shadow.mapSize.set(shadowRes, shadowRes);
    sky.update(0, this.origin);

    this.moonLight = new THREE.DirectionalLight(0xa9c0ff, 0);
    this.moonLight.position.set(...moonFrom).multiplyScalar(100);
    scene.add(this.moonLight);
    this._buildGround(paint, res, outer);
    if (ridges) this._buildRidges();
    this.finisher = lab.finisher || (lab.finisher = new Finisher(this.renderer));

    this.camera = new THREE.PerspectiveCamera(fov, 1.6, 0.1, 1400);
    const C = { az: 0.7, el: 0.36, dist: 12, focus: [0, 1, 0], ...camera };
    this.orbit = { az: C.az, el: C.el, dist: C.dist, focus: V3(...C.focus) };
    this.goal = { az: C.az, el: C.el, dist: C.dist, focus: V3(...C.focus) };
    this.viewsDef = views || { stage: { label: 'Stage' }, close: { label: 'Close', dist: C.dist * 0.45, el: 0.2 }, eye: { label: 'Cat-eye', eye: true }, high: { label: 'From above', el: 0.95, dist: C.dist * 1.2 } };
    this.viewMode = 'stage';
    this.picks = [];
    this.updaters = [];
    this.cat = null;
    this.F = null; this.grass = null;
    this.t = 0;
    this.compareState = null;
    this.split = new Split(el, { value: 0.5, left: 'The game today', right: 'New' });
    this._bindPointer();
    this.setHour(hour);
    const hudEl = document.createElement('div');
    hudEl.className = 'toast'; hudEl.setAttribute('role', 'status');
    el.append(hudEl);
    this.toast = hudEl;
    if (reduceMotion) this.wind = 0;
    this._shot = 0;
  }

  /* ---------------- construction ---------------- */

  _buildGround(paint, res, outerHex) {
    const P = this.plot, hAt = this.heightAt;
    const [c, x] = canvas2d(res, res);
    const toPx = (wx, wz) => [(wx / (P * 2) + 0.5) * res, (wz / (P * 2) + 0.5) * res];
    x.fillStyle = '#6a8a48'; x.fillRect(0, 0, res, res);
    if (paint) paint(x, res, toPx, rng(7)); else defaultPaint(x, res, rng(7));
    // feather to the outer colour so the plot melts into the fields
    const edge = new THREE.Color(outerHex).convertLinearToSRGB();
    const e = `${Math.round(edge.r * 255)},${Math.round(edge.g * 255)},${Math.round(edge.b * 255)}`;
    const g = x.createRadialGradient(res / 2, res / 2, res * 0.42, res / 2, res / 2, res * 0.5);
    g.addColorStop(0, `rgba(${e},0)`); g.addColorStop(1, `rgba(${e},1)`);
    x.fillStyle = g; x.fillRect(0, 0, res, res);
    this.groundCanvas = c; this.groundCtx = x; this.groundToPx = toPx;
    const tex = this.groundTex = canvasTexture(c, { aniso: 8 });
    const disc = polarDisc(P, 56, 96, (px, pz, r) => hAt(px, pz) - 0.08 * sstep(P * 0.96, P, r));
    const uvA = new Float32Array(disc.attributes.position.count * 2);
    for (let i = 0; i < disc.attributes.position.count; i++) { uvA[i * 2] = disc.attributes.position.getX(i) / (P * 2) + 0.5; uvA[i * 2 + 1] = disc.attributes.position.getZ(i) / (P * 2) + 0.5; }
    disc.setAttribute('uv', new THREE.BufferAttribute(uvA, 2));
    // a canvas texture's first row is uv v=1 unless flipped: match toPx exactly
    tex.flipY = false;
    tex.needsUpdate = true;
    const matG = this.groundMat = paintify(new THREE.MeshStandardMaterial({ map: tex, roughness: 1, envMapIntensity: 0.6 }), { brush: 0.11, dab: 5, bump: 0.05, bumpK: 3 });
    const ground = this.ground = new THREE.Mesh(disc, matG);
    ground.receiveShadow = true; ground.name = 'Plot';
    this.scene.add(ground);
    // the fields beyond the plot: a coarse ring that climbs into foothills
    const ringG = polarRing(P - 1.5, 260, 90, 32, (px, pz) => this.ringY(px, pz) - 0.02);
    const col = new Float32Array(ringG.attributes.position.count * 3);
    const a = new THREE.Color(outerHex).multiplyScalar(0.62), b = new THREE.Color(0x24391f), s = new THREE.Color();
    for (let i = 0; i < ringG.attributes.position.count; i++) {
      const px = ringG.attributes.position.getX(i), pz = ringG.attributes.position.getZ(i), r = Math.hypot(px, pz);
      s.copy(a).lerp(b, clamp(sstep(P + 1, 40, r) + (noise3(px * 0.08, 0, pz * 0.08) - 0.5) * 0.35, 0, 1));
      col[i * 3] = s.r; col[i * 3 + 1] = s.g; col[i * 3 + 2] = s.b;
    }
    ringG.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const ring = new THREE.Mesh(ringG, paintify(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), { brush: 0.12, dab: 0.8 }));
    ring.receiveShadow = true; ring.name = 'Fields';
    this.scene.add(ring);
    this.fields = ring;
  }

  /** Height of the fields and foothills beyond the plot. */
  ringY(x, z) {
    const r = Math.hypot(x, z), t = sstep(this.plot + 2, 200, r);
    return this.heightAt(x, z) + t * t * 34 * (0.55 + fbm3(x * 0.012, 0, z * 0.012, 3)) + (fbm3(x * 0.03, 2, z * 0.03, 3) - 0.5) * t * 12;
  }

  _buildRidges() {
    this.ridges = [];
    const defs = [[250, 74, 3, 0.55], [320, 110, 11, 0.5], [410, 160, 23, 0.5]];
    for (const [r, h, seed, rough] of defs) {
      const tex = ridgeTexture(seed, { rough });
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 72, 1, true), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, alphaTest: 0.5, fog: false, toneMapped: true }));
      m.position.y = h / 2 - 8;
      m.rotation.y = seed;
      m.name = 'Ridge';
      m.renderOrder = -900;
      this.scene.add(m);
      this.ridges.push(m);
    }
  }

  async loadFoliage(F, { count = 44, inner = null, outer = null, colors = null, seed = 5 } = {}) {
    this.F = F;
    const P = this.plot, rmin = inner ?? P + 4, rmax = outer ?? P + 54, r = rng(seed);
    const mats = {
      leaf: F.createFoliageMaterial({ sss: 0.3, wind: 0.6, mottle: 0.22, bump: 0.4, massMap: F.leafMassTexture('leaf'), massScale: 1 / 1.1, ragged: 1, vertexColors: true }),
      needle: F.createFoliageMaterial({ sss: 0.18, wind: 0.4, mottle: 0.24, bump: 0.4, massMap: F.leafMassTexture('needle'), massScale: 1 / 1.2, ragged: 1, vertexColors: true })
    };
    const bark = new THREE.MeshStandardMaterial({ color: 0x4a3a2e, roughness: 1 });
    const geos = { leaf: [], needle: [], bark: [] };
    const g = new THREE.Group(); g.name = 'Backdrop trees';
    for (let i = 0; i < count; i++) {
      const a = r() * TAU, d = rmin + r() * (rmax - rmin), x = Math.cos(a) * d, z = Math.sin(a) * d;
      const kind = r() < 0.42 ? 'needle' : 'leaf', s = 1.6 + r() * 2;
      const built = F.buildCanopy(r, {
        style: 'masses', scale: s, trunkH: 1.6, trunkR: 0.12, primaries: 4 + Math.floor(r() * 3), tilt: 0.8, tiltVar: 0.25, droop: kind === 'needle' ? 0.2 : 0,
        bend: 0.1, branchLen: 1.1, secondaries: 2, twigs: false, crownFill: 3, clumpR: kind === 'needle' ? 0.5 : 0.44,
        colors: colors?.[kind] || (kind === 'needle' ? [0x24401f, 0x33582f, 0x4a7040, 0x5f8850] : [0x2f4f1c, 0x3f6626, 0x5a8536, 0x7aa348]),
        tuftsPerClump: [3, 3, 2], tuftFlat: kind === 'needle' ? 0.45 : 0.74, pad: kind === 'needle', lump: 0.38, seed: i + 3
      });
      const m = new THREE.Matrix4().makeRotationY(r() * TAU).setPosition(x, this.heightAt(x, z) - 0.2, z);
      geos[kind].push(built.tufts.applyMatrix4(m));
      geos.bark.push(built.branches.applyMatrix4(m));
    }
    for (const [k, list] of Object.entries(geos)) {
      if (!list.length) continue;
      const mesh = new THREE.Mesh(merge(list), k === 'bark' ? bark : mats[k]);
      mesh.castShadow = false; mesh.receiveShadow = true; g.add(mesh);
    }
    this.scene.add(g); this.trees = g;
  }

  /**
   * The forest: the game's own foothill recipe (instanced lumpy cones wearing a
   * painted needle mass) plus tall sugi spires with trunks close to the plot.
   * keepOut(x, z) holds sightlines and paths open.
   */
  loadForest(F, { near = 30, nearInner = null, far = 200, nearCount = 42, farCount = 2600, keepOut = null, seed = 9, cedars = true, tone = 1 } = {}) {
    this.F = F;
    const P = this.plot, r = rng(seed), rNear0 = nearInner ?? P * 0.86;
    const needleMat = F.createFoliageMaterial({ sss: 0.15, wind: 0.5, mottle: 0.24, vertexColors: false, massMap: F.leafMassTexture('needle'), massScale: 1 / 2.4 });
    const needleNear = F.createFoliageMaterial({ sss: 0.2, wind: 0.5, mottle: 0.26, bump: 0.5, vertexColors: false, massMap: F.leafMassTexture('needle'), massScale: 1 / 1.3, ragged: 1 });
    const leafMat = F.createFoliageMaterial({ sss: 0.15, wind: 0.5, mottle: 0.24, vertexColors: false, massMap: F.leafMassTexture('leaf'), massScale: 1 / 3 });
    const g = new THREE.Group(); g.name = 'Forest';
    const cone = F.lumpyConeGeometry(1, 8, 0.3), cone2 = F.lumpyConeGeometry(1, 12, 0.34), round = F.lumpyTuftGeometry(1, 8, 0.36);
    const meshes = [new THREE.InstancedMesh(cone, needleMat, farCount), new THREE.InstancedMesh(cone2, needleMat, farCount), new THREE.InstancedMesh(round, leafMat, farCount)];
    const placed = [0, 0, 0], dummy = new THREE.Object3D(), col = new THREE.Color();
    const groundY = (x, z) => this.ringY(x, z);
    for (let i = 0; i < farCount; i++) {
      const a = r() * TAU, d = near + Math.pow(r(), 0.75) * (far - near), x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (keepOut?.(x, z)) continue;
      const kind = r() < (d < 60 ? 0.55 : 0.8) ? (r() < 0.5 ? 0 : 1) : 2, y = groundY(x, z);
      const s = kind === 2 ? 1.5 + r() * 1.9 : 1.4 + r() * 1.7;
      dummy.position.set(x, y + (kind === 2 ? s * 0.45 : -0.2), z);
      dummy.scale.set(s * (0.85 + r() * 0.35), s * (1.0 + r() * 0.5) * (kind === 2 ? 1 : 1.25), s * (0.85 + r() * 0.35));
      dummy.rotation.set((r() - 0.5) * 0.12, r() * Math.PI, (r() - 0.5) * 0.12);
      if (kind === 2) col.setHSL(0.22 + r() * 0.07, 0.36 + r() * 0.14, (0.17 + r() * 0.1) * tone); else col.setHSL(0.27 + r() * 0.06, 0.26 + r() * 0.12, (0.13 + r() * 0.08) * tone);
      dummy.updateMatrix();
      meshes[kind].setMatrixAt(placed[kind], dummy.matrix);
      meshes[kind].setColorAt(placed[kind], col);
      placed[kind]++;
    }
    for (let k = 0; k < 3; k++) { meshes[k].count = placed[k]; meshes[k].instanceMatrix.needsUpdate = true; if (meshes[k].instanceColor) meshes[k].instanceColor.needsUpdate = true; meshes[k].frustumCulled = false; g.add(meshes[k]); }
    if (cedars) {
      const bark = paintify(new THREE.MeshStandardMaterial({ color: 0x5c4332, roughness: 1 }), { brush: 0.12, dab: 7, bump: 0.05, bumpK: 8 });
      const trunkG = new THREE.CylinderGeometry(0.09, 0.36, 1, 8, 1).translate(0, 0.5, 0);
      const list = [];
      for (let i = 0, tries = 0; i < nearCount && tries < 2000; tries++) {
        const a = r() * TAU, d = rNear0 + Math.pow(r(), 0.8) * (near - rNear0), x = Math.cos(a) * d, z = Math.sin(a) * d;
        if (keepOut?.(x, z) || list.some((t) => Math.hypot(t.x - x, t.z - z) < 2.1)) continue;
        const H = 15 + r() * 8;
        list.push({ x, z, H, y: this.heightAt(x, z) - 0.1, ry: r() * TAU, tilt: (r() - 0.5) * 0.04 });
        i++;
      }
      const crowns = new THREE.InstancedMesh(cone, needleNear, list.length), crowns2 = new THREE.InstancedMesh(cone2, needleNear, list.length), trunks = new THREE.InstancedMesh(trunkG, bark, list.length);
      list.forEach((t, i) => {
        dummy.position.set(t.x, t.y, t.z); dummy.rotation.set(t.tilt, t.ry, t.tilt); dummy.scale.set(1, t.H, 1); dummy.updateMatrix(); trunks.setMatrixAt(i, dummy.matrix);
        const s = t.H * 0.18;
        dummy.position.set(t.x, t.y + t.H * 0.34, t.z); dummy.rotation.set(t.tilt, t.ry, t.tilt); dummy.scale.set(s * 1.05, t.H * 0.26, s * 1.05); dummy.updateMatrix(); crowns.setMatrixAt(i, dummy.matrix); col.setHSL(0.28 + (i % 5) * 0.012, 0.3, 0.16 + (i % 3) * 0.02); crowns.setColorAt(i, col);
        dummy.position.set(t.x, t.y + t.H * 0.62, t.z); dummy.rotation.set(t.tilt, t.ry + 1.1, t.tilt); dummy.scale.set(s * 0.62, t.H * 0.17, s * 0.62); dummy.updateMatrix(); crowns2.setMatrixAt(i, dummy.matrix); col.setHSL(0.29, 0.32, 0.19); crowns2.setColorAt(i, col);
      });
      for (const m of [crowns, crowns2, trunks]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.castShadow = m === trunks; m.receiveShadow = true; m.frustumCulled = false; g.add(m); }
      this.cedarList = list;
    }
    this.scene.add(g);
    this.forest = g;
    return g;
  }

  /**
   * Grow the game's grass over the plot. paint(mask) marks what is bare via
   * mask.paint('excl', fn) / disc / rect, and meadow flowers via 'flower' / 'wild'.
   */
  loadGrass(GM, { paint = null, spacing = 0.13, zones = null, palette = null } = {}) {
    const P = this.plot;
    const mask = this.mask = new GM.BiomeMask(-P, -P, P * 2, 256);
    mask.paint('excl', (x, z) => sstep(P - 2.4, P - 0.6, Math.hypot(x, z)));
    paint?.(mask);
    mask.bake();
    const opts = { mask, wind: this.wind, gustLit: 0.45 };
    if (palette) opts.palette = palette;
    const grass = this.grass = new GM.GrassSystem(this.scene, opts);
    const Z = zones || [['near', spacing], ['thicket', 0.42], ['flowers', 0.3], ['susuki', 0.8]];
    for (const [name, sp] of Z) grass.addZone(name, { name, x: 0, z: 0, hw: P, hd: P, spacing: sp });
  }

  async loadCat(Cat = true) {
    const st = this.catStart;
    const cat = this.cat = new CatWalker({
      parent: this.scene, dom: this.el, camera: () => this.camera, ground: this.ground, heightAt: (x, z) => this.catHeight(x, z), bounds: this.bounds,
      blocked: this.blocked, start: st, coat: this.coat
    });
    cat.clickToGo = false;
    await cat.load({ scene: this.scene, renderer: this.renderer, sunDir: this.sky.sunDir, rig: { applyEnv() {} } });
    return cat;
  }
  catHeight(x, z) { return this.heightAt(x, z); }

  /* ---------------- interaction ---------------- */

  /** pick(objectOrObjects, fn, label): click to call fn(hit). */
  addPick(obj, fn, label = '') { this.picks.push({ objs: [].concat(obj), fn, label }); }

  _ray(e) {
    const r = this.el.getBoundingClientRect();
    _n.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    _r.setFromCamera(_n, this.camera);
    return _r;
  }
  _hitPick(e) {
    const ray = this._ray(e);
    let best = null, bd = Infinity;
    for (const p of this.picks) {
      const h = ray.intersectObjects(p.objs, true)[0];
      if (h && h.distance < bd) { bd = h.distance; best = { pick: p, hit: h }; }
    }
    return best;
  }
  /** World position of the ground under the pointer (or null). */
  groundAt(e) { const h = this._ray(e).intersectObjects([this.ground, this.fields], false)[0]; return h ? h.point : null; }

  _bindPointer() {
    const el = this.el;
    let drag = null;
    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest(UI)) return;
      drag = { x: e.clientX, y: e.clientY, az: this.goal.az, el: this.goal.el, moved: false };
      if (this.onDragStart?.(e)) { drag.custom = true; }
    });
    addEventListener('pointermove', (e) => {
      if (!drag) {
        if (e.target instanceof Node && this.el.contains(e.target) && !e.target.closest(UI)) {
          const h = this._hitPick(e);
          this.el.style.cursor = h ? 'pointer' : '';
          this.hoverLabel = h ? h.pick.label : '';
          this.onHover?.(e, h);
        }
        return;
      }
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.hypot(dx, dy) > 6) drag.moved = true;
      if (drag.custom) { this.onDrag?.(e, dx, dy); return; }
      if (drag.moved && !this.isEye) {
        this.goal.az = drag.az - dx * 0.006;
        this.goal.el = clamp(drag.el + dy * 0.004, 0.04, 1.45);
      }
    });
    addEventListener('pointerup', (e) => {
      if (!drag) return;
      const was = drag; drag = null;
      if (was.custom) { this.onDragEnd?.(e); if (was.moved) return; }
      if (!was.moved && !e.target.closest?.(UI)) this._click(e);
    });
    el.addEventListener('wheel', (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      this.goal.dist = clamp(this.goal.dist * Math.exp(e.deltaY * 0.01), 1.2, 60);
    }, { passive: false });
    addEventListener('keydown', (e) => {
      if (!this.active || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === 'KeyV') this.view(this.isEye ? 'stage' : 'eye');
      if (e.code === 'KeyQ') this.goal.az -= 0.3;
      if (e.code === 'KeyE') this.goal.az += 0.3;
      this.onKey?.(e);
    });
  }

  _click(e) {
    const h = this._hitPick(e);
    if (h) { h.pick.fn(h.hit, e); return; }
    if (this.onGround) { const p = this.groundAt(e); if (p && this.onGround(p, e)) return; }
    if (!this.cat) return;
    const p = this.groundAt(e);
    if (p) this.cat.goTo(p.x, p.z);
  }

  say(text, ms = 3200) {
    this.toast.textContent = text;
    this.toast.classList.add('on');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => this.toast.classList.remove('on'), ms);
  }

  get isEye() { return this.viewMode === 'eye'; }
  view(name) {
    const d = this.viewsDef[name];
    if (!d) return;
    this.viewMode = name;
    if (d.eye) { if (this.cat) this.cat.eyeInit = false; return; }
    const g = this.goal, C = this.viewsDef.stage;
    g.az = d.az ?? C.az ?? g.az; g.el = d.el ?? C.el ?? g.el; g.dist = d.dist ?? C.dist ?? g.dist;
    if (d.focus) g.focus.set(...d.focus); else if (C.focus) g.focus.set(...C.focus);
    this.onView?.(name);
  }
  focusOn(p, dist) { this.goal.focus.copy(p); if (dist) this.goal.dist = dist; }

  setHour(h) {
    this.hour = h;
    const sky = this.sky;
    sky.dayTime = ((h % 24) + 24) % 24;
    sky.update(0, this.origin);
    sky.invalidateEnvironment();
    this.night = clamp((0.05 - sky.sunDir.y) / 0.2, 0, 1);
    if (this.ridges) {
      const pal = sky.resolvePalette(), sun = Math.max(0, sky.sunDir.y);
      const dim = 0.42 + sun * 0.9;
      const fog = pal.fog, far = _a.copy(fog).lerp(pal.mid, 0.12), near = _b.copy(pal.fog).lerp(pal.top, 0.55).multiplyScalar(0.82);
      this.ridges.forEach((m, i) => {
        const k = i / (this.ridges.length - 1);
        m.material.color.copy(near).lerp(far, k * 0.7 + 0.05).multiplyScalar(dim * (0.92 + k * 0.1));
      });
    }
    this.onHour?.(h);
  }

  /**
   * A warm glow at a point: an additive halo that kindles after sunset and, for
   * the first few, a real point light. Returns { set(on) } so a lab can light it.
   */
  addGlow(p, { color = 0xffc878, size = 1.5, light = true, intensity = 5, distance = 8, on = true } = {}) {
    if (!this.glows) this.glows = [];
    if (!glowTex) {
      const [c, x] = canvas2d(128, 128), g = x.createRadialGradient(64, 64, 2, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.14, 'rgba(255,255,255,.42)'); g.addColorStop(0.42, 'rgba(255,255,255,.07)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 128, 128); glowTex = canvasTexture(c);
    }
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    spr.position.copy(p); spr.scale.setScalar(size); spr.renderOrder = 5;
    this.scene.add(spr);
    const g = { spr, base: size, on: on ? 1 : 0, now: 0, ph: this.glows.length * 2.1, light: null, intensity };
    if (light && this.glows.filter((x) => x.light).length < 4) {
      g.light = new THREE.PointLight(color, 0, distance, 2);
      g.light.position.copy(p);
      this.scene.add(g.light);
    }
    this.glows.push(g);
    return { set: (b) => { g.on = b ? 1 : 0; }, g };
  }

  _updateGlows(dt, t) {
    if (!this.glows) return;
    const dark = clamp(1 - Math.max(0, this.sky.sunDir.y + 0.04) * 6, 0, 1);
    for (const g of this.glows) {
      g.now += ((g.on ? 1 : 0) - g.now) * Math.min(1, dt * 2.2);
      const flick = 1 + (reduceMotion ? 0 : Math.sin(t * 8.3 + g.ph) * 0.05 + Math.sin(t * 13.1 + g.ph * 1.7) * 0.03);
      const v = g.now * dark * flick;
      g.spr.material.opacity = Math.min(0.75, v * 0.6);
      g.spr.scale.setScalar(g.base * (0.92 + v * 0.14));
      if (g.light) g.light.intensity = g.intensity * v;
    }
  }

  /** Show a split: prep(side) runs before each side renders. */
  setCompare(on, prep = null, labels = null) {
    this.compareState = on ? prep : null;
    this.split.enabled = !!on;
    if (labels) this.split.setLabels(labels[0], labels[1]);
  }

  setFinish(name) { this.finishMode = name; }

  /** Save the stage as an image (grabbed right after the next frame). */
  postcard(name = 'michi-postcard') { this._shot = name; }

  /* ---------------- per frame ---------------- */

  frame(dt, t, rect) {
    this.t = t;
    this.active = rect.top < innerHeight * 0.55 && rect.bottom > innerHeight * 0.4;
    if (this.cat) this.cat.active = this.active;
    const sky = this.sky;
    sky.update(dt, this.origin);
    // the game's sky is balanced for its own post pass; here the sun has to carry
    // the picture, so shade stays deep and blue instead of lifting to grey
    const nf = this.night ?? 0;
    sky.hemi.intensity *= this.ambient + (this.nightAmbient - this.ambient) * nf; sky.fill.intensity *= 0.5; sky.sun.intensity *= this.sunGain;
    this.moonLight.intensity = nf * this.moonGain;
    sky.bounce && (sky.bounce.intensity *= 0.6);
    if (sky.envDrifted?.()) sky.refreshEnvironment();
    if (this.F) this.F.updateFoliage(t, sky, this.focusV());
    this._updateGlows(dt, t);
    for (const u of this.updaters) u(dt, t, this);
    this.onUpdate?.(dt, t, this);
    if (this.cat) this.cat.update(dt, { camera: this.camera });
    // camera
    const O = this.orbit, G = this.goal, k = Math.min(1, dt * 5);
    O.az += (G.az - O.az) * k; O.el += (G.el - O.el) * k; O.dist += (G.dist - O.dist) * k; O.focus.lerp(G.focus, k);
    const focus = this.focusCat && this.cat ? _v.set(this.cat.pos.x, this.cat.y + 0.5, this.cat.pos.y) : O.focus;
    if (this.isEye && this.cat) this.cat.eyeCamera(this.camera, dt);
    else {
      const ce = Math.cos(O.el);
      this.camera.position.set(focus.x + Math.sin(O.az) * ce * O.dist, focus.y + Math.sin(O.el) * O.dist, focus.z + Math.cos(O.az) * ce * O.dist);
      this.camera.lookAt(focus);
    }
    // never let the orbit dip under the ground
    const gy = this.heightAt(this.camera.position.x, this.camera.position.z) + 0.2;
    if (this.camera.position.y < gy) this.camera.position.y = gy;
    if (this.grass) this.grass.update(dt, { renderer: this.renderer, camera: this.camera, focus: this.focusV(), cat: this.cat?.cat, sky, wind: this.wind + (this.gust || 0) });
  }

  focusV() { return this.cat ? this._fv.set(this.cat.pos.x, 0, this.cat.pos.y) : this._fv.set(0, 0, 0); }
  _fv = new THREE.Vector3();

  /** Screen position of the sun, for the painted glow. */
  _sunUV() {
    const sky = this.sky;
    _v.copy(this.camera.position).addScaledVector(sky.sunDir, 500).project(this.camera);
    const vis = sky.sunDir.y > -0.02 && _v.z < 1 ? clamp(sky.sunDir.y * 4, 0.15, 1) : 0;
    return _s3.set(_v.x * 0.5 + 0.5, _v.y * 0.5 + 0.5, vis);
  }

  render(r, rect) {
    this.camera.updateMatrixWorld();
    const opts = { strength: this.strength, sun: this._sunUV(), time: this.t, lineFar: 300, kasumi: 0, paintMix: this.paintMix, sat: this.sat };
    if (this.compareState) {
      const s = this.split.value;
      this.compareState(0);
      this.finisher.render(this.scene, this.camera, rect, this.finishMode, { ...opts, clip: [0, s] });
      this.compareState(1);
      this.finisher.render(this.scene, this.camera, rect, this.finishMode, { ...opts, clip: [s, 1] });
    } else this.finisher.render(this.scene, this.camera, rect, this.finishMode, opts);
    if (this._shot) this._capture(r, rect);
  }

  _capture(r, rect) {
    const name = this._shot; this._shot = 0;
    const pr = r.getPixelRatio(), W = Math.round(rect.width * pr), H = Math.round(rect.height * pr), src = r.domElement;
    const [c, x] = canvas2d(W, H);
    x.drawImage(src, -Math.round(rect.left * pr), -Math.round(rect.top * pr));
    c.toBlob((b) => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${name}-${String(Math.floor(this.hour)).padStart(2, '0')}h.png`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    }, 'image/png');
  }
}
const _a = new THREE.Color(), _b = new THREE.Color(), _s3 = new THREE.Vector3();
let glowTex = null;

/* ---------------- meshes ---------------- */

/** A disc of rings and spokes with denser rings near the rim. */
export function polarDisc(R, rings, spokes, y) {
  const pos = [0, y(0, 0, 0), 0], idx = [];
  for (let i = 1; i <= rings; i++) {
    const r = R * Math.pow(i / rings, 0.7);
    for (let j = 0; j < spokes; j++) { const a = j / spokes * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r; pos.push(x, y(x, z, r), z); }
  }
  for (let j = 0; j < spokes; j++) idx.push(0, 1 + (j + 1) % spokes, 1 + j);
  for (let i = 0; i < rings - 1; i++) for (let j = 0; j < spokes; j++) {
    const a = 1 + i * spokes + j, b = 1 + i * spokes + (j + 1) % spokes, c = a + spokes, d = b + spokes;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function polarRing(R0, R1, spokes, rings, y) {
  const pos = [], idx = [];
  for (let i = 0; i <= rings; i++) {
    const r = R0 + (R1 - R0) * Math.pow(i / rings, 1.7);
    for (let j = 0; j < spokes; j++) { const a = j / spokes * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r; pos.push(x, y(x, z, r), z); }
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < spokes; j++) {
    const a = i * spokes + j, b = i * spokes + (j + 1) % spokes, c = a + spokes, d = b + spokes;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Paint helpers for the plot canvas. */
export function blotch(x, cx, cy, r, color, rand, { n = 24, alpha = 0.5 } = {}) {
  for (let i = 0; i < n; i++) {
    const a = rand() * TAU, d = rand() * r, px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d, rad = r * (0.08 + rand() * 0.3);
    x.fillStyle = color.replace('A', (alpha * (0.3 + rand() * 0.7)).toFixed(3));
    x.beginPath(); x.ellipse(px, py, rad, rad * (0.5 + rand() * 0.5), rand() * 3, 0, TAU); x.fill();
  }
}

export function defaultPaint(x, res, r) {
  x.fillStyle = '#68824a'; x.fillRect(0, 0, res, res);
  for (let i = 0; i < 500; i++) {
    const c = ['rgba(90,120,60,A)', 'rgba(120,130,70,A)', 'rgba(70,100,50,A)', 'rgba(130,120,80,A)'][Math.floor(r() * 4)];
    blotch(x, r() * res, r() * res, 30 + r() * 80, c, r, { n: 10, alpha: 0.35 });
  }
}
