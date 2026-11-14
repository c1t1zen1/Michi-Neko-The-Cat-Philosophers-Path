import * as THREE from 'three';
import { toonMat, outlineMaterial, makeCollarTexture, makeBellTexture } from '../../cat_shading.js?v=20261107a';

/**
 * The collar and its bell, as accessory parts for the `collar` and `bell`
 * slots (src/characters/character.js).
 *
 *  - `kumihimo` (slot `collar`): the braided silk cord hugging the coat, with
 *    a little cord bow at the front and the bell mount (`host.bellMount`).
 *  - `suzu` (slot `bell`): brass ring, suzu bell and cap on the bell mount.
 *  - `suzu-master` (slot `bell`): the Master Cat bell (rank 4, C2.4): the
 *    bell turns bright gold and gains a small twin. `setMasterCat()` swaps
 *    `suzu` for it, in place, exactly as the Cat always did.
 *
 * The build code is moved verbatim from Cat.buildMaterials / buildCollar /
 * setMasterCat in src/cat.js (lane c1-rig-split) and sets the same fields:
 * `matRibbon`, `collar`, `bellMount`, `matBellBrass`, `matGoldBell`,
 * `matRing`, `bellR`, `collarBell`, `collarBellTwin`.
 */

/* -------------------------------------------------------------------- */
/*  The cord                                                             */
/* -------------------------------------------------------------------- */

export function collarMaterials(host, ribbonColor) {
  host.matRibbon = toonMat(0xffffff, { map: makeCollarTexture(ribbonColor) });
}

/** Braided silk cord (C2.1 cosmetics) with its outline, the bell mount and the bow. */
export function buildCollarCord(host) {
  const A = host.anatomy;
  const c = A.collar;
  // Braided silk cord hugging the coat (C2.1 cosmetics; Master Cat rank
  // swaps the bell for bright gold and adds a twin — setMasterCat()).
  host.collar = new THREE.Mesh(c.geometry, host.matRibbon);
  host.collar.castShadow = false;
  host.collar.name = 'Collar';
  host.neck.add(host.collar);
  const outline = new THREE.Mesh(c.geometry, outlineMaterial(0.0012));
  host.collar.add(outline);
  (host.outlines ||= []).push(outline);

  // Front fitting: a little cord bow, a brass ring, and the suzu bell
  const front = new THREE.Vector3(...c.front);
  const out = new THREE.Vector3(...c.frontDir);
  const hk = A.face.headScale;
  host.bellMount = new THREE.Group();
  host.bellMount.position.copy(front).addScaledVector(out, 0.0015);
  host.collar.add(host.bellMount);
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.0052 * hk, 12, 10), host.matRibbon);
  knot.scale.set(1.15, 0.9, 0.8);
  host.bellMount.add(knot);
  const loops = [];
  for (const s of [-1, 1]) {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.0068 * hk, 0.0024 * hk, 8, 16), host.matRibbon);
    loop.position.set(s * 0.0085 * hk, 0.001, 0);
    loop.rotation.set(0, Math.PI / 2 * 0.35 * s, s * 0.45);
    loop.scale.set(1, 0.72, 1);
    host.bellMount.add(loop);
    loops.push(loop);
  }
  return { knot, loops };
}

/* -------------------------------------------------------------------- */
/*  The bell                                                             */
/* -------------------------------------------------------------------- */

/** Brass and gold bell materials and the ring metal (both bells are made up front, as always). */
export function bellMaterials(host) {
  host.matBellBrass = new THREE.MeshStandardMaterial({
    map: makeBellTexture(0xc79a4e), metalness: 0.5, roughness: 0.36, envMapIntensity: 1.2
  });
  host.matGoldBell = new THREE.MeshStandardMaterial({
    map: makeBellTexture(0xf5cf55), metalness: 0.62, roughness: 0.26, envMapIntensity: 1.4,
    emissive: new THREE.Color(0x3a2604), emissiveIntensity: 0.35
  });
  host.matRing = new THREE.MeshStandardMaterial({ color: 0xc9a25a, metalness: 0.8, roughness: 0.3 });
}

/** Ring, suzu bell and cap, hung on the collar's bell mount. */
export function buildBell(host) {
  const hk = host.anatomy.face.headScale;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0052 * hk, 0.0014 * hk, 8, 18), host.matRing);
  ring.position.set(0, -0.0068 * hk, 0.001);
  host.bellMount.add(ring);
  host.bellR = 0.0165 * hk;
  host.collarBell = new THREE.Mesh(new THREE.SphereGeometry(host.bellR, 28, 18), host.matBellBrass);
  host.collarBell.position.set(0, -0.0112 * hk - host.bellR, 0.002);
  host.collarBell.castShadow = true;
  host.bellMount.add(host.collarBell);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0028 * hk, 0.0036 * hk, 0.0028 * hk, 10), host.matRing);
  cap.position.set(0, -0.0112 * hk + 0.0006, 0.002);
  host.bellMount.add(cap);
  return { ring, cap };
}

/**
 * Master Cat (rank 4, C2.4): the collar bell becomes gold and gains a
 * small twin. A quiet, permanent identity reward for the whole valley.
 */
export function goldBell(host) {
  host.collarBell.material = host.matGoldBell;
  const hk = host.anatomy.face.headScale;
  const twin = new THREE.Mesh(new THREE.SphereGeometry(host.bellR * 0.72, 22, 14), host.matGoldBell);
  twin.position.copy(host.collarBell.position);
  twin.position.x += 0.024 * hk;
  twin.position.y += 0.005 * hk;
  twin.rotation.y = -0.5;
  host.bellMount.add(twin);
  host.collarBellTwin = twin;
  return twin;
}

/** Back to the plain brass bell (the reverse swap; the game never needs it). */
export function brassBell(host) {
  host.collarBell.material = host.matBellBrass;
  const twin = host.collarBellTwin;
  if (twin) {
    twin.removeFromParent();
    twin.geometry.dispose();
    host.collarBellTwin = undefined;
  }
}

/* -------------------------------------------------------------------- */
/*  The parts                                                            */
/* -------------------------------------------------------------------- */

const COLLAR_FIELDS = ['collar', 'bellMount', 'matRibbon'];
const BELL_FIELDS = ['bellR', 'collarBell', 'collarBellTwin', 'matBellBrass', 'matGoldBell', 'matRing'];
const DEFAULT_RIBBON = 0xd63228;

export const KUMIHIMO = Object.freeze({
  id: 'kumihimo',
  slot: 'collar',
  label: 'Braided silk cord (kumihimo) with a cord bow and the bell mount',
  params: Object.freeze({ color: DEFAULT_RIBBON }),
  materials(host, entry) {
    collarMaterials(host, entry.color ?? DEFAULT_RIBBON);
  },
  /** Same cord, new colour: repaint the ribbon texture in place (the bell stays on). */
  swapTo(host, handle, next, entry) {
    if (next.id !== 'kumihimo') return false;
    const old = host.matRibbon.map;
    host.matRibbon.map = makeCollarTexture(entry.color ?? DEFAULT_RIBBON);
    host.matRibbon.needsUpdate = true;
    if (old) old.dispose();
    handle.owned.textures = [host.matRibbon.map];
    return true;
  },
  build(host) {
    const { knot, loops } = buildCollarCord(host);
    return {
      objects: [host.collar],
      fields: COLLAR_FIELDS,
      owned: {
        geometries: [knot.geometry, ...loops.map((l) => l.geometry)],
        materials: [host.matRibbon],
        textures: [host.matRibbon.map]
      }
    };
  }
});

function bellHandle(host, ring, cap) {
  return {
    objects: [ring, host.collarBell, cap],
    fields: BELL_FIELDS,
    owned: {
      geometries: [ring.geometry, host.collarBell.geometry, cap.geometry],
      materials: [host.matBellBrass, host.matGoldBell, host.matRing],
      textures: [host.matBellBrass.map, host.matGoldBell.map]
    }
  };
}

export const SUZU = Object.freeze({
  id: 'suzu',
  slot: 'bell',
  label: 'Brass suzu bell on a ring',
  mount: 'bellMount',
  master: 'suzu-master',
  materials(host) { bellMaterials(host); },
  build(host) {
    const { ring, cap } = buildBell(host);
    return bellHandle(host, ring, cap);
  },
  /** suzu → suzu-master happens in place: same bell mesh, gold material, plus the twin. */
  swapTo(host, handle, next) {
    if (next.id !== 'suzu-master') return false;
    const twin = goldBell(host);
    handle.objects.push(twin);
    handle.owned.geometries.push(twin.geometry);
    return true;
  }
});

export const SUZU_MASTER = Object.freeze({
  id: 'suzu-master',
  slot: 'bell',
  label: 'Master Cat bell: gold suzu and a small twin',
  mount: 'bellMount',
  master: 'suzu-master',
  materials(host) { bellMaterials(host); },
  build(host) {
    const { ring, cap } = buildBell(host);
    const handle = bellHandle(host, ring, cap);
    const twin = goldBell(host);
    handle.objects.push(twin);
    handle.owned.geometries.push(twin.geometry);
    return handle;
  },
  swapTo(host, handle, next) {
    if (next.id !== 'suzu') return false;
    const twin = host.collarBellTwin;
    brassBell(host);
    handle.objects = handle.objects.filter((o) => o !== twin);
    if (twin) handle.owned.geometries = handle.owned.geometries.filter((g) => g !== twin.geometry);
    return true;
  }
});

/** The classic accessory parts, registered by src/characters/character.js. */
export const COLLAR_PARTS = [KUMIHIMO, SUZU, SUZU_MASTER];
