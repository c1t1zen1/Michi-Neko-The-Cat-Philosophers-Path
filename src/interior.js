import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  plasterTextures, woodTextures, shojiTextures, tatamiTextures, stoneTextures,
  strawTextures, metalTextures, texturedMaterial, worldScaleBoxUVs
} from './textures.js?v=20261107a';
import { lumpyTuftGeometry } from './foliage.js?v=20261107a';

const panel = (m) => { m.userData.uvPanel = true; return m; };
const MAT = {
  plasterWarm: texturedMaterial(plasterTextures(0xf3e8d4, 4), { roughness: 0.94, normalScale: 0.8 }),
  timberDark: texturedMaterial(woodTextures(0x3f2818, 0x1c110a, 6), { roughness: 0.8, normalScale: 0.8 }),
  timberEngawa: texturedMaterial(woodTextures(0x8a5f3a, 0x4a2f1a, 7), { roughness: 0.5, normalScale: 0.6 }),
  tatami: panel(texturedMaterial(tatamiTextures(0xb9c98e), { roughness: 0.95, normalScale: 0.6 })),
  tatamiBorder: texturedMaterial(woodTextures(0x2d3a24, 0x151c12, 8), { roughness: 0.7 }),
  shoji: panel(texturedMaterial(shojiTextures(4, 6), { roughness: 0.9, emissive: 0xffd9a6, emissiveIntensity: 0.28, normalScale: 0.5 })),
  fusumaPaper: texturedMaterial(strawTextures(0xede0c8), { roughness: 0.9, normalScale: 0.25 }),
  cushionRed: new THREE.MeshStandardMaterial({ color: 0xa8241e, roughness: 0.85 }),
  goldAntique: texturedMaterial(metalTextures(0xd9ad4c), { metalness: 0.85, roughness: 0.32 }),
  grilledFish: new THREE.MeshStandardMaterial({ color: 0xd97c38, roughness: 0.55 }),
  lanternPaper: panel(new THREE.MeshStandardMaterial({ color: 0xffe2a4, emissive: 0xffaa33, emissiveIntensity: 0.85, roughness: 0.6 })),
  stoneToro: texturedMaterial(stoneTextures(0x76807a, 9), { roughness: 0.9, normalScale: 0.9 }),
  bamboo: new THREE.MeshStandardMaterial({ color: 0x5e8c45, roughness: 0.6 }),
  ceramicWhite: new THREE.MeshStandardMaterial({ color: 0xf3ede2, roughness: 0.35, envMapIntensity: 0.8 }),
  ceramicBlue: new THREE.MeshStandardMaterial({ color: 0x3e6b8a, roughness: 0.4, envMapIntensity: 0.8 })
};

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const geo = new THREE.BoxGeometry(w, h, d);
  if (!(mat && mat.userData && mat.userData.uvPanel)) worldScaleBoxUVs(geo, 1);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Asset routing (BUILD_GUIDE_FABLE §3.4, Integrator rulings R12 / R18). Each
// builder computes a layout (placements, the room's colliders and platform,
// the gameplay anchors, the knockables' physics) and hands a classic mesh step
// to placeAsset(), which builds the kit asset instead when one is registered
// and active for that inventory id. The interior draws no random numbers.
// src/kit/runtime.js is not on this lane's base yet: these local fallbacks
// stand in for its exports until the Integrator swaps in
//   import { CLASSIC_ASSETS, isAssetInstance, scopeAssets } from './kit/runtime.js?v=20261107a';
const CLASSIC_ASSETS = { build: (id, layout, classicFn) => classicFn(), update() {}, instances: [] };
const isAssetInstance = (x) => x && x.group && x.parts && typeof x.dispose === 'function';
const scopeAssets = (a) => a || CLASSIC_ASSETS;

/**
 * The knick-knacks' physics (F3.2): kept in the layout so a kit interior's
 * knockables fall, bounce and settle exactly like the classic ones.
 *   kick     knock velocity [horizontal, up];  spin   tumble range (rad/s)
 *   reach    how close the cat's body must come;  zone   the tabletop the cat
 *            must be standing on (local x / z ranges, height above the floor)
 *   gravity, bounce (vertical restitution), friction (horizontal keep),
 *   spinKeep, settle (stop below this bounce speed), rest (height above floorY)
 */
const KNOCK_PHYSICS = Object.freeze({
  kick: [1.3, 1.6], spin: 8, reach: 0.26,
  zone: Object.freeze({ x: [-1.0, 1.0], z: [-0.9, 0.5], above: 0.4 }),
  gravity: 18, bounce: 0.3, friction: 0.6, spinKeep: 0.5, settle: 0.4, rest: 0.05
});

export class InteriorManager {
  constructor(game) {
    this.game = game;
    // Kit builders see this module's own material table (its _mergeStatics
    // merges by it); the textures live on those materials.
    this.assets = scopeAssets(game.assets, { MAT });
    this.isInside = false;
    this.isTransitioning = false;
    this.origin = new THREE.Vector3(0, 100, 0); // Isolated interior coordinate space

    this.group = new THREE.Group();
    this.group.name = 'Tea House Interior';
    this.group.position.copy(this.origin);
    this.game.scene.add(this.group);

    this.colliders = [];
    this.platforms = [];
    this.fishMesh = null;
    this.fishEaten = false;
    this.knockables = [];
    // Gameplay anchors from the layout (origin-relative): eatFish, nap,
    // enter, exitZone. See layoutInterior().
    this.anchors = {};
    this.assetInstances = [];

    this.wipeEl = document.getElementById('door-wipe');
    this.buildInterior();
    this.buildKnockables();
    // Room is fully built: collapse the static interior into one draw call
    // per material (knockables and the grilled fish stay separate).
    this._mergeStatics();
  }

  /* ---------------- Asset routing ---------------- */

  /**
   * Classic: `classicFn()` builds into `parent` (and the room registers its
   * footprint itself). Kit: the instance's group goes into `parent` at the
   * layout's place, its footprint (by default the layout's) is registered
   * through registerFootprint() — the path the classic builders use — and
   * the gameplay handles named in `layout.bind` come from its parts.
   */
  placeAsset(id, layout, classicFn, parent = this.group) {
    const out = (this.assets || CLASSIC_ASSETS).build(id, layout, classicFn);
    if (!isAssetInstance(out)) return out;
    const g = out.group;
    if (layout.x !== undefined) g.position.set(layout.x, layout.y || 0, layout.z || 0);
    if (layout.ry) g.rotation.y = layout.ry;
    parent.add(g);
    if (this.assetInstances) this.assetInstances.push(out);
    this.registerFootprint(out.footprint || layout.footprint, out.parts || {});
    for (const [field, part] of Object.entries(layout.bind || {})) {
      this[field] = (out.parts && out.parts[part]) || (out.sockets && out.sockets[part]) || null;
    }
    return out;
  }

  /**
   * One footprint into the interior's registries, each in its list order:
   * colliders, platforms, knockables (a physics record per knick-knack; its
   * mesh is the part named in the entry) and the gameplay anchors.
   */
  registerFootprint(fp, parts = {}) {
    if (!fp) return;
    for (const b of fp.colliders || []) this.colliders.push(b);
    for (const b of fp.platforms || []) this.platforms.push(b);
    for (const k of fp.knockables || []) {
      const mesh = parts[k.part];
      if (!mesh) continue;
      this.knockables.push({
        mesh,
        vel: new THREE.Vector3(),
        spin: new THREE.Vector3(),
        knocked: false,
        settled: false,
        floorY: k.floorY
      });
    }
    if (fp.anchors) this.anchors = Object.assign(this.anchors || {}, fp.anchors);
  }

  /**
   * Merge the room's static meshes into one per material, baking transforms
   * relative to the interior group. The knockable tabletop objects (physics)
   * and the grilled fish (visible toggle) keep their own meshes. Kit
   * instances merge like classic meshes, except the objects in their `live`.
   */
  _mergeStatics() {
    const matSet = new Set(Object.values(MAT));
    const protectedRoots = new Set();
    for (const k of this.knockables) if (k.mesh) protectedRoots.add(k.mesh);
    if (this.fishMesh) protectedRoots.add(this.fishMesh);
    for (const inst of this.assetInstances || []) {
      for (const o of inst.live || []) protectedRoots.add(o);
      inst.group.traverse((o) => { if (o.isMesh && o.material && !Array.isArray(o.material)) matSet.add(o.material); });
    }

    const inProtected = (o) => {
      for (let p = o; p; p = p.parent) if (protectedRoots.has(p)) return true;
      return false;
    };

    this.group.updateMatrixWorld(true);
    const eligible = [];
    this.group.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh) return;
      if (inProtected(o)) return;
      const mat = o.material;
      if (!matSet.has(mat) || mat.transparent) return;
      const g = o.geometry;
      if (!g.index || !g.attributes.position || !g.attributes.normal || !g.attributes.uv) return;
      eligible.push(o);
    });
    if (eligible.length < 2) return;

    const groups = new Map();
    for (const m of eligible) {
      const sig = m.material.uuid + '|' + (m.castShadow ? 1 : 0) + (m.receiveShadow ? 1 : 0) + '|' +
        Object.keys(m.geometry.attributes).sort().join('+');
      if (!groups.has(sig)) groups.set(sig, []);
      groups.get(sig).push(m);
    }
    const inv = new THREE.Matrix4().copy(this.group.matrixWorld).invert();
    for (const list of groups.values()) {
      if (list.length < 2) continue;
      const geos = [];
      for (const m of list) {
        const g = m.geometry.clone();
        if (m.matrixWorld.determinant() < 0) {
          const idx = g.index.array;
          for (let i = 0; i < idx.length; i += 3) {
            const t = idx[i]; idx[i] = idx[i + 2]; idx[i + 2] = t;
          }
        }
        g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
        geos.push(g);
      }
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      const first = list[0];
      const mesh = new THREE.Mesh(merged, first.material);
      mesh.castShadow = first.castShadow;
      mesh.receiveShadow = first.receiveShadow;
      this.group.add(mesh);
      for (const m of list) {
        if (m.parent) m.parent.remove(m);
        m.geometry.dispose();
      }
    }
  }

  /** Small tabletop treasures cats love to shove off tables. */
  buildKnockables() {
    const layout = this.layoutKnockables();
    this.knockPhysics = layout.physics;
    return this.placeAsset('knockables', layout, () => this.meshKnockablesClassic(layout));
  }

  /**
   * The three knick-knacks: shape, material, where each rests and the floor
   * it settles on, plus the physics (F3.2). `rest` and `floorY` are in the
   * numbers the classic code uses: the room group already sits at the
   * origin, yet these add the origin again (so the meshes hang 100 m above
   * the table) — kept exactly as built; see docs/fable/handoff/f3-systems-split.md.
   */
  layoutKnockables() {
    const o = this.origin;
    const topY = o.y + 0.58;
    const items = [
      { part: 'cup', shape: 'cylinder', size: [0.055, 0.045, 0.09, 12], mat: 'ceramicWhite', x: -0.55, z: -0.45 },
      { part: 'bowl', shape: 'cylinder', size: [0.075, 0.05, 0.07, 14], mat: 'ceramicBlue', x: 0.45, z: -0.55 },
      { part: 'ball', shape: 'sphere', size: [0.055, 10, 8], mat: 'ceramicWhite', x: 0.6, z: 0.15 }
    ].map((d, i) => ({ ...d, index: i, name: `Table Knick-knack ${i + 1}`, rest: [o.x + d.x, topY + 0.05, o.z + d.z], floorY: o.y + 0.05 }));
    return {
      index: 0, x: 0, y: 0, z: 0, items, physics: { ...KNOCK_PHYSICS },
      footprint: { knockables: items.map((d) => ({ part: d.part, rest: d.rest, floorY: d.floorY })) }
    };
  }

  meshKnockablesClassic(L) {
    const parts = {};
    for (const d of L.items) {
      const geo = d.shape === 'sphere'
        ? new THREE.SphereGeometry(d.size[0], d.size[1], d.size[2])
        : new THREE.CylinderGeometry(d.size[0], d.size[1], d.size[2], d.size[3]);
      const m = new THREE.Mesh(geo, MAT[d.mat]);
      m.name = d.name;
      m.castShadow = true;
      m.position.set(d.rest[0], d.rest[1], d.rest[2]);
      this.group.add(m);
      parts[d.part] = m;
      this.registerFootprint({ knockables: L.footprint.knockables.filter((k) => k.part === d.part) }, parts);
    }
    return parts;
  }

  /**
   * Light the room only while the cat is in it. Changing the number of
   * visible lights re-specialises the shaders, so this is called only on the
   * interior transition, which is already hidden behind the door wipe.
   */
  setLightsActive(on) {
    if (this._lightsActive === on) return;
    this._lightsActive = on;
    for (const l of this.roomLights || []) l.visible = on;
  }

  update(dt) {
    const p = window.game ? window.game.player : null;
    const P = this.knockPhysics || KNOCK_PHYSICS;
    const Z = P.zone;
    for (const k of this.knockables) {
      // Cat brushing against an item while on the table knocks it off
      if (!k.knocked && p && this.isInside &&
          p.mesh.position.x >= this.origin.x + Z.x[0] && p.mesh.position.x <= this.origin.x + Z.x[1] &&
          p.mesh.position.z >= this.origin.z + Z.z[0] && p.mesh.position.z <= this.origin.z + Z.z[1] &&
          p.mesh.position.y > this.origin.y + Z.above) {
        const dx = k.mesh.position.x - p.mesh.position.x;
        const dz = k.mesh.position.z - p.mesh.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < P.reach) {
          const nx = dist > 0.001 ? dx / dist : 1;
          const nz = dist > 0.001 ? dz / dist : 0;
          k.vel.set(nx * P.kick[0], P.kick[1], nz * P.kick[0]);
          k.spin.set((Math.random() - 0.5) * P.spin, (Math.random() - 0.5) * P.spin, (Math.random() - 0.5) * P.spin);
          k.knocked = true;
          if (window.game.audio) window.game.audio.playTrill();
          if (p.cat) p.cat.setMood('playful', 1.0, 2);
          if (window.game.ui) window.game.ui.showToast('Nyaa~ Oops! It rolled right off the table!');
        }
      }
      if (!k.knocked || k.settled) continue;
      // Simple physics: gravity, tumble, floor bounce & settle
      k.vel.y -= P.gravity * dt;
      k.mesh.position.addScaledVector(k.vel, dt);
      k.mesh.rotation.x += k.spin.x * dt;
      k.mesh.rotation.y += k.spin.y * dt;
      k.mesh.rotation.z += k.spin.z * dt;
      if (k.mesh.position.y <= k.floorY + P.rest && k.vel.y < 0) {
        k.mesh.position.y = k.floorY + P.rest;
        k.vel.y *= -P.bounce;
        k.vel.x *= P.friction;
        k.vel.z *= P.friction;
        k.spin.multiplyScalar(P.spinKeep);
        if (Math.abs(k.vel.y) < P.settle) {
          k.vel.set(0, 0, 0);
          k.spin.set(0, 0, 0);
          k.settled = true;
        }
      }
    }
  }

  buildInterior() {
    const layout = this.layoutInterior();
    return this.placeAsset('tea-interior', layout, () => this.meshInteriorClassic(layout));
  }

  /**
   * The room as data: where each part stands (local to the interior group;
   * the classic meshes keep their own frames), the room's colliders and the
   * table platform (world, origin-offset, registered after the meshes as
   * before), and the gameplay anchors (origin-relative) the transitions and
   * the context actions use (F3.2).
   */
  layoutInterior() {
    const o = this.origin;
    const wallH = 3.6;
    // 9. Build Room Colliders (Interior boundaries)
    const bx = (minX, maxX, minZ, maxZ, minY = 0, maxY = 3.6) => new THREE.Box3(
      new THREE.Vector3(o.x + minX, o.y + minY, o.z + minZ),
      new THREE.Vector3(o.x + maxX, o.y + maxY, o.z + maxZ)
    );
    const colliders = [
      bx(-4.3, 4.3, -3.9, -3.4),        // North wall
      bx(-4.3, -3.9, -3.6, 3.6),        // West wall
      bx(-4.3, -1.2, 3.4, 3.9),         // South wall wings
      bx(1.2, 4.3, 3.4, 3.9),
      bx(9.0, 9.5, -3.4, 3.4),          // East outer garden wall
      bx(4.0, 9.5, -3.4, -3.0),
      bx(4.0, 9.5, 3.0, 3.4),
      bx(-1.0, 1.0, -0.9, 0.5, 0, 0.6)  // Table collider
    ];
    // Table platform
    const platforms = [new THREE.Box3(
      new THREE.Vector3(o.x - 1.0, o.y + 0.44, o.z - 0.9),
      new THREE.Vector3(o.x + 1.0, o.y + 0.58, o.z + 0.5)
    )];
    const anchors = {
      eatFish: [0.3, 0.5, -0.1],                 // the platter (context action "eat Grilled Sea Bream")
      nap: [-2.2, 0.1, -1.2],                    // the zabuton (context action "cozy nap")
      enter: { at: [0, 0, 2.6], heading: Math.PI, camera: [0, 1.4, 4.6] },
      exitZone: { minZ: 1.8, halfX: 1.8, rearmZ: 1.2 }
    };
    return {
      index: 0, name: 'Tea House Interior', x: 0, y: 0, z: 0, wallH,
      bind: { fishMesh: 'fish' },
      footprint: { colliders, platforms, anchors },
      tatami: {
        index: 0, name: 'Tatami Floor', x: 0, y: 0, z: 0, mat: { w: 1.25, l: 2.5, h: 0.08 },
        mats: [
          [-1.25, 0.04, -1.25, false], [1.25, 0.04, -1.25, false],
          [-1.25, 0.04, 1.25, false],  [1.25, 0.04, 1.25, false],
          [-2.5, 0.04, 0, true],       [2.5, 0.04, 0, true]
        ],
        footprint: {}
      },
      frame: { index: 0, x: 0, y: 0, z: 0, size: [8.4, wallH, 7.2], beams: [-3, -1, 1, 3], posts: [-4.1, 4.1, -3.6, 3.6], footprint: {} },
      tokonoma: { index: 0, name: 'Tokonoma Alcove', x: 0, y: 0, z: -3.0, footprint: {} },
      scroll: { index: 0, x: 0, y: 0.8, z: -3.42, footprint: {} },
      bonsai: { index: 0, x: 0.9, y: 0.21, z: -3.0, footprint: {} },
      chabudai: { index: 0, name: 'Chabudai Table', x: 0, y: 0, z: -0.2, top: 0.49, footprint: {} },
      teaware: { index: 0, x: -0.45, y: 0.49, z: -0.25, footprint: {} },
      fish: { index: 0, name: 'Grilled Sea Bream', x: 0.3, y: 0.49, z: 0.1, bind: { fishMesh: 'fish' }, footprint: { anchors: { eatFish: anchors.eatFish } } },
      zabuton: { index: 0, name: 'Zabuton Nap Bed', x: -2.2, y: 0, z: -1.2, footprint: { anchors: { nap: anchors.nap } } },
      andon: { index: 0, name: 'Andon Lantern', x: 2.8, y: 0, z: -2.2, footprint: {} },
      gravel: { index: 0, x: 7.2, y: 0, z: 0, size: [4.0, 0.1, 6.0], footprint: {} },
      toro: { index: 0, name: 'Courtyard Toro Lantern', x: 7.2, y: 0, z: -1.2, footprint: {} },
      courtyardWall: { index: 0, x: 0, y: 0, z: 0, footprint: {} },
      door: { index: 0, name: 'Exit Door', x: 0, y: 0, z: 3.6, footprint: { anchors: { exitZone: anchors.exitZone } } }
    };
  }

  /**
   * The classic room. Sub-parts route under their own inventory ids; the
   * room's colliders, platform and anchors are registered last, as before
   * (a kit part brings its meshes, not the room's collision).
   */
  meshInteriorClassic(L) {
    const root = this.group;

    this.placeAsset('tatami', L.tatami, () => this.meshTatamiClassic(L.tatami, root), root);
    this.placeAsset('interior-frame', L.frame, () => this.meshFrameClassic(L.frame, root), root);

    // 3. Tokonoma Alcove (Sacred recess on back wall)
    this.placeAsset('tokonoma', L.tokonoma, () => {
      const toko = new THREE.Group();
      toko.name = 'Tokonoma Alcove';
      toko.add(box(3.2, 0.22, 1.2, MAT.timberDark, 0, 0.11, -3.0));
      this.placeAsset('scroll', L.scroll, () => this.meshScrollClassic(L.scroll, toko), toko);
      this.placeAsset('bonsai', L.bonsai, () => this.meshBonsaiClassic(L.bonsai, toko), toko);
      root.add(toko);
      return toko;
    }, root);

    // 4. Low Chabudai Table with Ceramic Tea Set & Grilled Sea Bream (Fish Feast)
    this.placeAsset('chabudai', L.chabudai, () => {
      const table = new THREE.Group();
      table.name = 'Chabudai Table';
      table.add(box(1.8, 0.1, 1.3, MAT.timberEngawa, 0, 0.44, 0));
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          table.add(box(0.12, 0.4, 0.12, MAT.timberDark, sx * 0.75, 0.2, sz * 0.52));
        }
      }
      this.placeAsset('teaware', L.teaware, () => this.meshTeawareClassic(L.teaware, table), table);
      this.placeAsset('interior-fish', L.fish, () => this.meshFishClassic(L.fish, table), table);
      table.position.set(L.chabudai.x, 0, L.chabudai.z);
      root.add(table);
      return table;
    }, root);

    this.placeAsset('zabuton', L.zabuton, () => this.meshZabutonClassic(L.zabuton, root), root);
    this.placeAsset('andon', L.andon, () => this.meshAndonClassic(L.andon, root), root);

    // Warm indoor point light
    // Warm andon glow plus a soft ceiling fill (candela-scale intensities)
    // Three counts every *visible* light in the scene into NUM_POINT_LIGHTS
    // and every lit fragment loops over all of them — so these two, 100 m
    // overhead in a room nobody is standing in, were being evaluated on
    // every surface in the valley. They start dark and only switch on with
    // the interior itself; the door wipe covers the shader recompile.
    const indoorLight = new THREE.PointLight(0xffb855, 7.5, 12, 1.4);
    indoorLight.name = 'Andon Glow Light';
    indoorLight.position.set(L.andon.x, 1.2, L.andon.z);
    indoorLight.visible = false;
    root.add(indoorLight);

    const ambientRoomLight = new THREE.PointLight(0xffdfa8, 4.5, 14, 1.2);
    ambientRoomLight.name = 'Room Fill Light';
    ambientRoomLight.position.set(0, 2.6, 0);
    ambientRoomLight.visible = false;
    root.add(ambientRoomLight);
    this.roomLights = [indoorLight, ambientRoomLight];

    // 7. Engawa Veranda & Private Zen Courtyard (Right side)
    const engawa = box(1.6, 0.22, 4.4, MAT.timberEngawa, 4.9, 0.11, 0);
    root.add(engawa);
    this.placeAsset('courtyard-gravel', L.gravel, () => this.meshGravelClassic(L.gravel, root), root);
    this.placeAsset('courtyard-toro', L.toro, () => this.meshCourtyardToroClassic(L.toro, root), root);
    this.placeAsset('courtyard-wall', L.courtyardWall, () => this.meshCourtyardWallClassic(L.courtyardWall, root), root);
    this.placeAsset('shoji-doors', L.door, () => this.meshExitDoorClassic(L.door, root), root);

    this.registerFootprint(L.footprint);
    return root;
  }

  meshTatamiClassic(L, root) {
    // 1. Room Floor: 8-mat Tatami arrangement (Room size: 8m wide x 7m deep x 3.6m ceiling)
    const floor = new THREE.Group();
    floor.name = 'Tatami Floor';
    const matW = L.mat.w, matL = L.mat.l, matH = L.mat.h;
    for (const [mx, my, mz, rotated] of L.mats) {
      const w = rotated ? matL : matW;
      const d = rotated ? matW : matL;
      const m = box(w - 0.04, matH, d - 0.04, MAT.tatami, mx, my, mz);
      const b = box(w, matH * 0.8, d, MAT.tatamiBorder, mx, my - 0.01, mz);
      floor.add(m, b);
    }
    root.add(floor);
    return floor;
  }

  meshFrameClassic(L, root) {
    // Raised wood border around tatami
    root.add(box(8.2, 0.1, 7.2, MAT.timberEngawa, 0, 0.02, 0));

    // 2. Room Walls & Ceiling
    const wallH = L.size[1];
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
    for (const bx of L.beams) {
      root.add(box(0.2, 0.28, 7.2, MAT.timberDark, bx, wallH - 0.14, 0));
    }

    // Hashira timber posts
    for (const sx of [L.posts[0], L.posts[1]]) {
      for (const sz of [L.posts[2], L.posts[3]]) {
        root.add(box(0.35, wallH, 0.35, MAT.timberDark, sx, wallH / 2, sz));
      }
    }
    return root;
  }

  meshScrollClassic(L, toko) {
    // Hanging Scroll (Kakejiku)
    toko.add(box(1.2, 2.2, 0.04, MAT.fusumaPaper, 0, 1.9, -3.42));
    toko.add(box(0.8, 1.4, 0.05, MAT.timberDark, 0, 1.9, -3.41));
    toko.add(box(1.4, 0.08, 0.08, MAT.timberDark, 0, 0.8, -3.4));
    return toko;
  }

  meshBonsaiClassic(L, toko) {
    // Mini Bonsai Pine on polished plinth
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.14, 10), MAT.stoneToro);
    pot.position.set(0.9, 0.28, -3.0);
    toko.add(pot);
    const bonsaiWood = [];
    const bonsaiTrunk = new THREE.CylinderGeometry(0.04, 0.07, 0.45, 6);
    bonsaiTrunk.rotateZ(-0.25);
    bonsaiTrunk.translate(0.9, 0.52, -3.0);
    bonsaiWood.push(bonsaiTrunk);
    for (const [angle, x, y] of [[-0.9, 0.82, 0.64], [0.9, 1.0, 0.72], [-0.72, 0.92, 0.82]]) {
      const limb = new THREE.CylinderGeometry(0.014, 0.025, 0.28, 5);
      limb.rotateZ(angle);
      limb.translate(x, y, -3.0);
      bonsaiWood.push(limb);
    }
    const bonsaiSkeleton = new THREE.Mesh(mergeGeometries(bonsaiWood, false), MAT.timberDark);
    bonsaiSkeleton.castShadow = true;
    toko.add(bonsaiSkeleton);
    for (const geometry of bonsaiWood) geometry.dispose();

    const bonsaiPads = [];
    const padBase = lumpyTuftGeometry(1, 37, 0.34);
    const padMatrix = new THREE.Matrix4();
    const padPosition = new THREE.Vector3();
    const padScale = new THREE.Vector3();
    for (const [x, y, z, sx, sy, sz] of [
      [0.72, 0.68, -3.0, 0.24, 0.075, 0.18],
      [1.08, 0.76, -3.02, 0.22, 0.07, 0.17],
      [0.86, 0.87, -2.98, 0.18, 0.065, 0.15],
      [1.04, 0.96, -3.0, 0.14, 0.06, 0.12]
    ]) {
      padPosition.set(x, y, z);
      padScale.set(sx, sy, sz);
      padMatrix.compose(padPosition, new THREE.Quaternion(), padScale);
      bonsaiPads.push(padBase.clone().applyMatrix4(padMatrix));
    }
    const bonsaiFoliage = new THREE.Mesh(mergeGeometries(bonsaiPads, false), MAT.bamboo);
    bonsaiFoliage.castShadow = true;
    toko.add(bonsaiFoliage);
    for (const geometry of bonsaiPads) geometry.dispose();
    return pot;
  }

  meshTeawareClassic(L, table) {
    // Ceramic Teapot & Yunomi Cups
    const teapot = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.16, 10), MAT.stoneToro);
    teapot.position.set(-0.45, 0.56, -0.25);
    const teacup1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.07, 8), MAT.plasterWarm);
    teacup1.position.set(-0.25, 0.52, -0.25);
    const teacup2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.07, 8), MAT.plasterWarm);
    teacup2.position.set(-0.45, 0.52, -0.05);
    table.add(teapot, teacup1, teacup2);
    return teapot;
  }

  meshFishClassic(L, table) {
    // Grilled Sea Bream Platter
    const platter = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.03, 16), MAT.plasterWarm);
    platter.position.set(L.x, 0.5, L.z);
    table.add(platter);

    const fish = new THREE.Group();
    fish.name = 'Grilled Sea Bream';
    const fishBody = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), MAT.grilledFish);
    fishBody.scale.set(1.5, 0.5, 0.6);
    const fishTail = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.16, 4), MAT.grilledFish);
    fishTail.rotation.z = Math.PI / 2;
    fishTail.position.x = -0.24;
    fish.add(fishBody, fishTail);
    fish.position.set(L.x, 0.56, L.z);
    table.add(fish);
    this.fishMesh = fish;
    return fish;
  }

  meshZabutonClassic(L, root) {
    // 5. Plush Velvet Zabuton Nap Bed (Cozy Nap Spot)
    const bed = new THREE.Group();
    bed.name = 'Zabuton Nap Bed';
    const zabuton = box(0.9, 0.16, 0.9, MAT.cushionRed, 0, 0.08, 0);
    bed.add(zabuton);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        bed.add(box(0.06, 0.04, 0.06, MAT.goldAntique, sx * 0.42, 0.08, sz * 0.42));
      }
    }
    bed.position.set(L.x, 0, L.z);
    root.add(bed);
    return bed;
  }

  meshAndonClassic(L, root) {
    // 6. Paper Andon Floor Lantern (Warm ambient lighting)
    const andon = new THREE.Group();
    andon.name = 'Andon Lantern';
    andon.add(box(0.44, 0.06, 0.44, MAT.timberDark, 0, 0.03, 0));
    andon.add(box(0.36, 0.8, 0.36, MAT.lanternPaper, 0, 0.43, 0));
    andon.add(box(0.42, 0.05, 0.42, MAT.timberDark, 0, 0.85, 0));
    andon.position.set(L.x, 0, L.z);
    root.add(andon);
    return andon;
  }

  meshGravelClassic(L, root) {
    // Courtyard rock garden gravel
    const garden = box(L.size[0], L.size[1], L.size[2], MAT.plasterWarm, L.x, -0.05, L.z);
    root.add(garden);
    return garden;
  }

  meshCourtyardToroClassic(L, root) {
    // Stone Toro lantern in courtyard
    const toro = new THREE.Group();
    toro.name = 'Courtyard Toro Lantern';
    toro.add(box(0.4, 0.1, 0.4, MAT.stoneToro, 0, 0.05, 0));
    toro.add(box(0.2, 0.5, 0.2, MAT.stoneToro, 0, 0.35, 0));
    toro.add(box(0.38, 0.35, 0.38, MAT.lanternPaper, 0, 0.75, 0));
    toro.add(box(0.55, 0.12, 0.55, MAT.stoneToro, 0, 0.98, 0));
    toro.position.set(L.x, 0, L.z);
    root.add(toro);
    return toro;
  }

  meshCourtyardWallClassic(L, root) {
    // Courtyard outer timber wall
    root.add(box(0.3, 3.2, 6.4, MAT.timberDark, 9.2, 1.6, 0));
    root.add(box(5.0, 3.2, 0.3, MAT.timberDark, 6.8, 1.6, -3.2));
    root.add(box(5.0, 3.2, 0.3, MAT.timberDark, 6.8, 1.6, 3.2));
    return root;
  }

  meshExitDoorClassic(L, root) {
    // 8. Sliding Exit Door (Front center)
    const exitDoor = new THREE.Group();
    exitDoor.name = 'Exit Door';
    exitDoor.add(box(2.6, 2.2, 0.08, MAT.shoji, 0, 1.1, 0));
    exitDoor.position.set(L.x, 0, L.z);
    root.add(exitDoor);
    return exitDoor;
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
      const enter = this.anchors.enter; // origin-relative (layoutInterior)
      p.mesh.position.set(this.origin.x + enter.at[0], this.origin.y + enter.at[1], this.origin.z + enter.at[2]);
      p.heading = enter.heading; // Face north into the room
      p.yaw = enter.heading;
      p.mesh.rotation.y = enter.heading;
      p.velocity.set(0, 0, 0);

      // Align camera
      const cam = this.game.camera;
      cam.position.set(this.origin.x + enter.camera[0], this.origin.y + enter.camera[1], this.origin.z + enter.camera[2]);
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
