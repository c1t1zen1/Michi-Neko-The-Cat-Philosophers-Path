// A floating slab of grass: soil block, one or more cells (each a grass type),
// its own lights, and a cat-collision field. Used for the 20 little cubes
// (one cell) and for the hero slab (a grid of cells).
import * as THREE from 'three';
import { createUniforms, PushField } from './kit.js';
import { soilSideTexture, groundTexture, blobTexture, yarnTexture, paperTexture } from './textures.js';
import { TYPES } from './types.js';

const _tex = {};
const shared = () => (_tex.ready ? _tex : Object.assign(_tex, {
  ready: true, side: soilSideTexture(), ground: groundTexture(), blob: blobTexture(), yarn: yarnTexture(), paper: paperTexture()
}));

export class GrassPatch {
  /**
   * opts: { w, d, cell, thick, trail, texelsPerMeter, seed, ball }
   * The patch is centred on the origin; cell (ix, iz) has its corner at
   * (-w/2 + ix*cell, -d/2 + iz*cell).
   */
  constructor(renderer, opts) {
    this.renderer = renderer;
    this.w = opts.w; this.d = opts.d; this.cellSize = opts.cell;
    this.thick = opts.thick ?? 0.7;
    this.nx = Math.round(this.w / this.cellSize);
    this.nz = Math.round(this.d / this.cellSize);
    this.seed = opts.seed ?? 1;
    this.density = 1;
    this.time = 0;
    this.bob = 0;
    this.bobAmp = opts.bob ?? 0.035;
    this.bobPhase = Math.random() * 6.28;
    this.lift = 0;

    this.scene = new THREE.Scene();
    this.sun = new THREE.DirectionalLight(0xffe4b4, 2.3);
    this.sun.position.set(-5.5, 7.8, 3.2);
    this.hemi = new THREE.HemisphereLight(0xa9cbee, 0x7b8a4a, 0.95);
    this.scene.add(this.sun, this.hemi);
    // fades the stock (Lambert / cat) materials to the page white in cat-eye
    // view; density 0 = off, so toggling never recompiles a program
    this.scene.fog = new THREE.FogExp2(0xffffff, 0);

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.U = createUniforms();
    this.U.uFieldRect.value.set(-this.w / 2, -this.d / 2, 1 / this.w, 1 / this.d);
    this.field = new PushField(renderer, { x0: -this.w / 2, z0: -this.d / 2, sx: this.w, sz: this.d },
      { texelsPerMeter: opts.texelsPerMeter ?? 20, trail: opts.trail ?? true });
    this.U.uFieldOn.value = this.field.ok ? 1 : 0;
    this.U.uTrailOn.value = this.field.ok && (opts.trail ?? true) ? 1 : 0;
    this.U.uField.value = this.field.texture;
    this.U.uTrail.value = this.field.trailTexture;

    this._cache = new Map();
    this.ctx = {
      U: this.U, renderer, density: 1,
      cache: (key, fn) => { if (!this._cache.has(key)) this._cache.set(key, fn()); return this._cache.get(key); },
      tex: shared()
    };

    this.stamps = [];
    for (let i = 0; i < 6; i++) this.stamps.push(new THREE.Vector4(0, 0, 0.3, 0));
    this.stampActive = false;

    this._buildSlab();
    this.cells = [];
    for (let iz = 0; iz < this.nz; iz++) {
      for (let ix = 0; ix < this.nx; ix++) {
        const i = this.cells.length;
        const group = new THREE.Group();
        this.root.add(group);
        this.cells.push({
          i, ix, iz, size: this.cellSize,
          ox: -this.w / 2 + ix * this.cellSize, oz: -this.d / 2 + iz * this.cellSize,
          seed: (this.seed * 131 + i * 17) % 997 + 1, typeId: null, group, made: null, ground: null
        });
      }
    }
    if (opts.ball) this._buildBall();
  }

  _buildSlab() {
    const T = shared();
    const sideTex = (rx) => { const t = T.side.clone(); t.repeat.set(rx, 1); t.needsUpdate = true; return t; };
    const mk = (rx) => new THREE.MeshLambertMaterial({ map: sideTex(rx), color: 0xffffff });
    this.sideMats = [mk(this.d / 1.4), mk(this.d / 1.4), new THREE.MeshLambertMaterial({ color: 0x4b3a28 }),
      new THREE.MeshLambertMaterial({ color: 0x2c2118 }), mk(this.w / 1.4), mk(this.w / 1.4)];
    const box = new THREE.Mesh(new THREE.BoxGeometry(this.w, this.thick, this.d), this.sideMats);
    box.position.y = -this.thick / 2 - 0.004;
    this.slab = box;
    this.root.add(box);

    const blob = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: T.blob, transparent: true, depthWrite: false, opacity: 1, toneMapped: false })
    );
    blob.rotation.x = -Math.PI / 2;
    blob.scale.set(this.w * 1.45, this.d * 1.45, 1);
    blob.position.y = -this.thick - 0.55;
    this.blob = blob;
    this.scene.add(blob);
    this.slabBottom = -this.thick;
  }

  _buildBall() {
    const T = shared();
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 20, 14),
      new THREE.MeshLambertMaterial({ map: T.yarn })
    );
    m.position.y = 0.19;
    this.ball = m;
    this.root.add(m);
    this.ballPhase = Math.random() * 10;
  }

  setSoilTint(hex) {
    for (const i of [0, 1, 4, 5]) this.sideMats[i].color.set(hex);
  }

  /** Assign a grass type to one cell (rebuilds that cell only). */
  setCell(i, typeId) {
    const cell = this.cells[i];
    if (cell.typeId === typeId) return;
    this._clearCell(cell);
    cell.typeId = typeId;
    if (typeId == null) return;
    const type = TYPES[typeId];
    const gm = this.ctx.cache('ground:' + type.ground + (type.groundKind || ''), () => {
      if (type.groundKind === 'paper') return new THREE.MeshBasicMaterial({ color: 0xffffff, map: this.ctx.tex.paper });
      // the mottled map averages ~0.2 linear, so lift the tint or the gaps between blades read as black
      const m = new THREE.MeshLambertMaterial({ color: type.ground, map: this.ctx.tex.ground });
      m.color.multiplyScalar(3.2);
      return m;
    });
    const ground = new THREE.Mesh(this.ctx.cache('groundGeo' + cell.size, () => {
      const g = new THREE.PlaneGeometry(cell.size, cell.size);
      g.rotateX(-Math.PI / 2);
      const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * cell.size * 0.9, uv.getY(k) * cell.size * 0.9);
      return g;
    }), gm);
    ground.position.set(cell.ox + cell.size / 2, 0, cell.oz + cell.size / 2);
    if (type.noGround) ground.visible = false;
    cell.group.add(ground);
    cell.ground = ground;
    const t0 = performance.now();
    cell.made = type.make(this.ctx, cell);
    cell.buildMs = performance.now() - t0;
    for (const o of cell.made.objects) cell.group.add(o);
  }

  setAll(typeIds) {
    for (let i = 0; i < this.cells.length; i++) this.setCell(i, typeIds[i % typeIds.length]);
  }

  _clearCell(cell) {
    if (cell.made) {
      for (const o of cell.made.objects) {
        cell.group.remove(o);
        if (o.material) o.material.dispose();
        // per-cell instanced geometries only share attribute objects with the
        // cached base; three re-uploads a freed attribute on next use
        if (o.geometry && o.geometry.isInstancedBufferGeometry) o.geometry.dispose();
        if (o.userData.dispose) o.userData.dispose();
      }
      cell.made = null;
    }
    if (cell.ground) { cell.group.remove(cell.ground); cell.ground = null; }
  }

  setDensity(f) {
    this.density = f;
    this.ctx.density = f;
    for (const c of this.cells) if (c.made) c.made.setDensity(f);
  }

  setStamp(i, x, z, r, s) { this.stamps[i].set(x, z, r, s); }
  clearStamps() { for (const s of this.stamps) s.w = 0; }

  /** Ball path for the cube physics demo; `speed` scales the roll. */
  _updateBall(dt, t, excite) {
    if (!this.ball) return;
    const ax = this.w * 0.5 - 0.5, az = this.d * 0.5 - 0.5;
    const tt = (t + this.ballPhase) * 0.62 * (1 + excite * 0.8);
    const x = Math.sin(tt * 0.93) * ax;
    const z = Math.sin(tt * 1.37 + 1.2) * az;
    const px = this.ball.position.x, pz = this.ball.position.z;
    this.ball.position.x = x; this.ball.position.z = z;
    const dx = x - px, dz = z - pz;
    const dist = Math.hypot(dx, dz);
    if (dist > 1e-5) {
      this.ball.rotation.z -= dx / 0.19; this.ball.rotation.x += dz / 0.19;
    }
    this.setStamp(0, x, z, 0.46, 1);
    this.U.uFocus.value.set(x, 0.1, z);
  }

  update(dt, t, { hover = 0, wind } = {}) {
    this.time = t;
    this.U.uTime.value = t;
    if (wind != null) this.U.uWind.value = wind;
    this.lift += (hover - this.lift) * Math.min(1, dt * 7);
    this.root.position.y = Math.sin(t * 0.9 + this.bobPhase) * this.bobAmp + this.lift * 0.14;
    if (this.ball) this._updateBall(dt, t, hover);
    let active = false;
    for (const s of this.stamps) if (s.w > 0) { active = true; break; }
    this.field.step(dt, this.stamps, active);
    this.U.uField.value = this.field.texture;
    this.U.uTrail.value = this.field.trailTexture;
    for (const c of this.cells) if (c.made && c.made.update) c.made.update(this);
  }

  stats() {
    let items = 0, tris = 0, draws = 0, kb = 0, build = 0;
    for (const c of this.cells) {
      if (!c.made) continue;
      const s = c.made.stats();
      items += s.items; tris += s.tris; draws += s.draws; kb += s.kb; build += c.buildMs || 0;
    }
    return { items, tris, draws, kb, build };
  }

  dispose() {
    for (const c of this.cells) this._clearCell(c);
    this.field.dispose();
  }
}
