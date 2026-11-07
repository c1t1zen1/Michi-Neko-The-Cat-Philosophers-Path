// The valley scene: a field disc, the forest wall (in four swappable
// techniques), foothill carpet, the ranges as patch or stack, kasumi bands,
// a mist ring, and one shared air. Built once per technique, toggled by
// visibility — a rebuild bench, not a menu of separate scenes.
import * as THREE from 'three';
import { Air, CloudField } from './air.js';
import { terrainHeight, terrainSector, profileHeight, mulberry32, smoothstep } from './profiles.js';
import { arcFriezeGeometry, terrainPatch, gameRangeColors, meadowColors } from './ridge.js';
import { instancedWall, edgeBelts, foothillCarpet, cardWall, paintedTreeline, driveFoliage, FOREST_GREENS } from './wall.js';
import { kasumiGroup } from './kasumi.js';
import { bakeImpostor, impostorField } from './impostor.js';

const RANGE_PALETTES = {
  'valley-near': { foot: 0x33502c, crown: 0x53793f, rock: 0x5c6650 },
  'valley-mid': { foot: 0x2c4a2e, crown: 0x46683c, rock: 0x64646c },
  'valley-far': { foot: 0x3c4c58, crown: 0x5d6e84, rock: 0x6e7080 },
  'higashiyama': { foot: 0x3a5a34, crown: 0x6d8a48, rock: 0x7a6a54 },
  'kitayama': { foot: 0x2e4a2c, crown: 0x3f6b38, rock: 0x5e6a58 },
  'atago': { foot: 0x364e34, crown: 0x55774a, rock: 0x727a6a },
  'arashiyama': { foot: 0x4a5c30, crown: 0x9a6a3c, rock: 0x7a6a5c },
  'paper': { foot: 0x7a8a9c, crown: 0xa8b8c8, rock: 0x8a94a4 }
};

export class Valley {
  constructor(renderer, F) {
    this.renderer = renderer;
    this.F = F;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xa8b4cc, 0.0016);
    this.fogBase = 0.0016;
    this.field = new CloudField();
    this.air = new Air(this.field);
    this.walls = {};
    this.belts = null;
    this.friezes = null;
    this.kasumi = {};
    this.wall = 'off';
    this.ridges = 'patch';
    this.kasumiStyle = 'none';
    this.veilK = 1;
    this.wind = 0.8;
    this._buildBase();
    this._buildRidgeModes();
    this._buildMistRing();
  }

  _buildBase() {
    // One heightfield for everything that needs it: meadow floor + foothills.
    const geo = terrainPatch({
      size: 560, seg: 150,
      heightAt: terrainHeight,
      colorAt: (x, z, h, d, c) => {
        this._patchColor(x, z, h, d, c);
        tint(c);
      }
    });
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.air.applyCloudShadow(mat, 0.85);
    this.ground = new THREE.Mesh(geo, mat);
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
    // gentle base disk so the stack's friezes never show a void behind the opening
    const lowland = new THREE.Mesh(
      new THREE.CircleGeometry(520, 64).rotateX(-Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: 0x7d9a4e })
    );
    lowland.position.y = -31.5;
    this.scene.add(lowland);
  }

  _patchColor(x, z, h, d, c) {
    const hazeK = this.ridges === 'patch' ? 1 : 0.4;
    if (d < 46) meadowColors(x, z, h, d, c);
    else if (d < 66) {
      meadowColors(x, z, h, d, c);
      gameRangeColors(x, z, h, d, _blend2, hazeK);
      c.lerp(_blend2, smoothstep(46, 66, d));
    } else gameRangeColors(x, z, h, d, c, hazeK);
  }

  _rebakeGround() {
    const pos = this.ground.geometry.attributes.position;
    const col = this.ground.geometry.attributes.color;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = pos.getY(i), d = Math.hypot(x, z);
      this._patchColor(x, z, h, d, _blend);
      tint(_blend);
      col.setXYZ(i, _blend.r, _blend.g, _blend.b);
    }
    col.needsUpdate = true;
  }

  _buildRidgeModes() {
    // The three frieze arcs — 'valley-near' 'valley-mid' 'valley-far' —
    // stacked over the same heightfield the carpet grows on.
    const specs = [
      ['valley-near', { radius: 96, arc: 5.5, height: 26, depth: 16, dist: 96, footMist: 0.12 }],
      ['valley-mid', { radius: 175, arc: 5.1, height: 82, depth: 26, dist: 175, footMist: 0.18 }],
      ['valley-far', { radius: 300, arc: 4.7, height: 140, depth: 44, dist: 300, footMist: 0.26 }]
    ];
    this.friezes = new THREE.Group();
    for (const [key, s] of specs) {
      const p = RANGE_PALETTES[key];
      const geo = arcFriezeGeometry((u) => profileHeight(key, u), {
        radius: s.radius, bearing: 0, arc: s.arc, height: s.height, depth: s.depth,
        cols: 190, rows: 6, jitter: 0.05, seed: s.radius,
        wall: (a) => terrainSector(Math.sin(a) * s.radius, -Math.cos(a) * s.radius).wall
      });
      const mat = this.air.rangeMaterial({ dist: s.dist, footMist: s.footMist, ...p });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData.profile = key;
      this.friezes.add(mesh);
    }
    this.friezes.visible = false;
    this.scene.add(this.friezes);
  }

  _buildMistRing() {
    // The game's buildMistRing, ported lite: radial-gradient sprites orbiting
    // the forest edge, dawn-lit and slow.
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(228, 236, 246, 0.75)');
    g.addColorStop(0.5, 'rgba(210, 224, 240, 0.28)');
    g.addColorStop(1, 'rgba(210, 224, 240, 0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const rng = mulberry32(31);
    this.mist = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.3, depthWrite: false, fog: false }));
      const a = rng() * Math.PI * 2, r = 58 + rng() * 14;
      m.position.set(Math.cos(a) * r, 2 + rng() * 9, Math.sin(a) * r);
      const s = 12 + rng() * 14;
      m.scale.set(s, s * 0.42, 1);
      m.userData = { a, r, y0: m.position.y, ph: rng() * Math.PI * 2, sp: 0.008 + rng() * 0.01 };
      this.mist.add(m);
    }
    this.scene.add(this.mist);
  }

  /* ---------------- wall techniques, lazy ---------------- */

  _buildWall(kind) {
    if (kind === 'mass') {
      const w = instancedWall(this.F, { count: 230, r0: 37, r1: 44, seed: 7 });
      this.air.applyCloudShadow(w.material, 0.55);
      if (!this.belts) {
        this.belts = edgeBelts(this.F, { r0: 35.5, r1: 43.5, count: 140, seed: 11 }).group;
        this.belts.traverse((o) => { if (o.material) this.air.applyCloudShadow(o.material, 0.5); });
      }
      this.walls.mass = w.group;
      this.scene.add(w.group, this.belts);
    } else if (kind === 'cards') {
      const w = cardWall({ count: 230, r0: 37, r1: 44, seed: 7 });
      this.walls.cards = w.group;
      this.scene.add(w.group);
    } else if (kind === 'impostor') {
      const rng = mulberry32(7);
      const built = this.F.buildCanopy(rng, {
        style: 'masses', scale: 1, trunkH: 1.15, trunkR: 0.14, primaries: 5, tilt: 0.76, tiltVar: 0.22,
        droop: -0.02, bend: 0.12, branchLen: 0.78, secondaries: 2, twigs: false, crownFill: 3,
        colors: FOREST_GREENS, clumpR: 0.36, tuftsPerClump: [3, 3, 2], tuftFlat: 0.74, lump: 0.4, seed: 53
      });
      const obj = new THREE.Group();
      const mat = this.F.createFoliageMaterial({ sss: 0.24, wind: 0, mottle: 0.24, bump: 0.42, vertexColors: true, massMap: this.F.leafMassTexture('leaf'), massScale: 1 / 1.5, ragged: 1 });
      const bark = new THREE.MeshStandardMaterial({ color: 0x6a5a48, roughness: 1 });
      obj.add(new THREE.Mesh(built.tufts, mat), new THREE.Mesh(built.branches, bark));
      const atlas = bakeImpostor(this.renderer, obj, { grid: 4, cell: 160 });
      const positions = [];
      const prng = mulberry32(7);
      for (let i = 0; i < 230; i++) {
        const a = (i / 230) * Math.PI * 2 + prng() * 0.09;
        const r = 37 + prng() * 7;
        const s = 1.8 + prng() * 2.4;
        positions.push({
          x: Math.cos(a) * r, z: Math.sin(a) * r, s,
          yaw: prng() * Math.PI * 2,
          tint: [0.88 + prng() * 0.24, 0.9 + prng() * 0.2, 0.84 + prng() * 0.22, 1]
        });
      }
      const { mesh } = impostorField(atlas, positions, { blend: 1 });
      this.atlas = atlas;
      this.walls.impostor = mesh;
      this.scene.add(mesh);
    } else if (kind === 'painted') {
      const w = paintedTreeline({ radius: 40, height: 8.5, repeat: 7 });
      this.walls.painted = w.group;
      this.scene.add(w.group);
    }
  }

  setWall(kind) {
    this.wall = kind;
    if (kind !== 'off' && !this.walls[kind]) this._buildWall(kind);
    for (const [k, g] of Object.entries(this.walls)) g.visible = k === kind;
    if (this.belts) this.belts.visible = kind === 'mass' || kind === 'impostor' || kind === 'cards';
    return this.walls[kind]?.userData?.stats || null;
  }

  /* ---------------- ranges ---------------- */

  setRidges(mode) {
    this.ridges = mode;
    const friezed = mode === 'stack' || mode === 'paper';
    if (this.friezes) this.friezes.visible = friezed;
    this._veilScaleCache = mode === 'paper' ? 1.4 : 1;
    this._rebakeGround();
    for (const m of this.friezes.children) m.material.uniforms.uPaper.value = mode === 'paper' ? 1 : 0;
    this.setVeil(this.veilK);
  }

  setKasumi(style) {
    this.kasumiStyle = style;
    if (style !== 'none' && !this.kasumi[style]) {
      this.kasumi[style] = kasumiGroup(style, [
        { x: 0, y: 4.2, z: -62, width: 150, height: 12, speed: 0.006 },
        { x: 0, y: 7.5, z: -92, width: 190, height: 15, speed: 0.004 },
        { x: -8, y: 12, z: -168, width: 260, height: 17, speed: 0.003 },
        { x: 10, y: 20, z: -285, width: 340, height: 20, speed: 0.002 }
      ]);
      this.scene.add(this.kasumi[style].group);
    }
    for (const [k, g] of Object.entries(this.kasumi)) g.group.visible = k === style;
    if (this.mist) this.mist.visible = style !== 'none';
  }

  /* ---------------- the air ---------------- */

  setVeil(k) {
    this.veilK = k;
    this.scene.fog.density = this.fogBase * k * (this._veilScaleCache || 1);
    for (const mat of this.air.mats) mat.uniforms.uFogT.value = Math.min(0.97, mat.userData.fogT0 * k * (this._veilScaleCache || 1));
  }

  setClouds(amt) { this.air.setClouds(amt); }

  setWind(v) { this.wind = v; }

  /* ---------------- step state ---------------- */

  applyState(st) {
    if (st.wall !== undefined) this.setWall(st.wall);
    if (st.ridges !== undefined) this.setRidges(st.ridges);
    if (st.kasumi !== undefined) this.setKasumi(st.kasumi);
    if (st.carpet !== undefined) {
      if (!this.carpet && st.carpet) {
        const c = foothillCarpet(this.F, terrainHeight, { count: 3400, r0: 55, r1: 185, seed: 23 });
        for (const m of new Set(c.meshes.map((m) => m.material))) this.air.applyCloudShadow(m, 0.5);
        this.carpet = c.group;
        this.scene.add(this.carpet);
      }
      if (this.carpet) this.carpet.visible = st.carpet;
    }
  }

  ensureCarpet() { if (!this.carpet) this.applyState({ carpet: true }); }

  update(dt, t, rig) {
    this.field.update(dt);
    if (rig) { this.air.update(rig); driveFoliage(this.F, t, rig, this.wind); }
    const kas = this.kasumi[this.kasumiStyle];
    if (kas && this.kasumiStyle !== 'none') kas.update(dt);
    if (this.mist) for (const m of this.mist.children) {
      const u = m.userData;
      u.a += u.sp * dt;
      m.position.set(Math.cos(u.a) * u.r, u.y0 + Math.sin(t * 0.3 + u.ph) * 0.7, Math.sin(u.a) * u.r);
    }
  }

  stats() {
    return { wall: this.wall, ridges: this.ridges };
  }
}
const _blend = new THREE.Color(), _blend2 = new THREE.Color();
// The game treats vertex colour as a TINT over its detail texture and
// normalises luminance ~0.5; without that pass the patch reads far too dark.
function tint(c, target = 0.5) {
  const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  c.multiplyScalar(Math.min(2.4, target / Math.max(0.09, lum)));
}
