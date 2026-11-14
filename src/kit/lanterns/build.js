// The three lantern builders the family's assets share: stone lanterns (toro,
// street lamps, courtyard and pool toro), hanging chochin and the andon.
// Meshes are named parts; the lit paper and the halo are the `live` ones.
import * as THREE from 'three';
import { merge, indexed, shadows, lerp } from '../craft.js?v=20261113a';
import { stoneLantern, fitStoneLantern } from './stone.js?v=20261113a';
import { litWashi, washiTexture, haloSprite, ownerGlow, freePrivate, lampUpdate } from './light.js?v=20261113a';

const flameColor = (w) => new THREE.Color().setRGB(1, lerp(0.42, 0.72, w), lerp(0.15, 0.4, w));
const paperTint = (w) => new THREE.Color(0xfff6e8).lerp(new THREE.Color(0xffd9a0), w).getHex();
const matOr = (ctx, name, make) => (ctx.MAT && ctx.MAT[name]) || make();
const mesh = (geo, mat, name, cast = true) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = cast; m.receiveShadow = true; return m; };

/** Kasa radius per kind, so a kind of any shape keeps the classic roof footprint. */
export const KASA_R = { kasuga: 0.38, yukimi: 0.55, oribe: 0.34, kotoji: 0.46, street: 0.4 };

/**
 * A stone lantern.
 *   kind     kasuga | yukimi | oribe | street
 *   height   metres to the top of the hoju
 *   kasaR    roof radius to fit (girth is derived from it)
 *   halo     { y?, scale, fog } or null for none; ownHalo: update() writes its opacity
 *   always   lit-paper emissive that stays on in daylight (a lantern seen from inside)
 */
export function buildStoneLantern(ctx, layout, p, { kind, height, kasaR, halo = { scale: 1.4 }, ownHalo = true, always = 0, base = 0.12, gain = 1.7 }) {
  const { tier, kitMaterials: km } = ctx;
  const L = fitStoneLantern(stoneLantern(kind, tier), height, kasaR / KASA_R[kind] * (p.girth || 1));
  const stone = km.stone();
  const dark = matOr(ctx, 'stoneDark', () => stone);
  const group = new THREE.Group();
  const parts = {};
  if (tier === 'far') { // one stone draw: the parts are kept as one named mesh
    const m = mesh(indexed(merge(Object.values(L.parts))), stone, 'kiso');
    group.add(m); parts.kiso = m;
  } else for (const [name, geo] of Object.entries(L.parts)) {
    const m = mesh(geo, name === 'kasa' || name === 'hoju' ? dark : stone, name);
    group.add(m); parts[name] = m;
  }
  const priv = tier !== 'far';
  const lit = priv ? litWashi(washiTexture(km, { ribs: 0 }), { color: paperTint(p.flame), glowColor: flameColor(p.flame).getHex(), glow: base + always }) : null;
  const lamp = mesh(L.lamp.geometry, lit || ownerGlow(ctx), 'lamp', false);
  lamp.position.y = L.lamp.y; group.add(lamp); parts.lamp = lamp;
  const live = [lamp];
  let sprite = null;
  if (halo) {
    sprite = haloSprite(km, { y: L.lamp.y, scale: halo.scale, color: flameColor(p.flame).getHex() });
    if (halo.fog === false) sprite.material.fog = false;
    group.add(sprite); parts.halo = sprite; live.push(sprite);
  }
  shadows(group, true, true);
  lamp.castShadow = false;
  const step = lampUpdate({ lit, halo: sprite, ownHalo: ownHalo && !!sprite, index: layout.index, base, gain, always });
  return {
    group, parts, live,
    update: step,
    dispose() { freePrivate([lit, sprite && sprite.material]); }
  };
}

/** A hanging chochin: origin at the hanging point, the cord above, the body below. */
export function buildChochin(ctx, layout, p) {
  const { tier, kitMaterials: km } = ctx;
  const seg = tier === 'hero' ? 24 : tier === 'mid' ? 12 : 8;
  const v2 = (a) => a.map(([x, y]) => new THREE.Vector2(x, y));
  const timber = matOr(ctx, 'timberDark', () => km.lacquer({ color: 0x1c1412 }));
  const red = matOr(ctx, 'vermilion', () => km.lacquer());
  const g = new THREE.Group();
  const parts = {};
  const far = tier === 'far';
  const add = (name, geo, mat, y = 0, cast = true) => { const m = mesh(indexed(geo), mat, name, cast); m.position.y = y; g.add(m); parts[name] = m; return m; };
  const rim = (r, h) => new THREE.CylinderGeometry(r, r * 1.04, h, seg, 1);
  const cordGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.35, 5, 1).translate(0, 0.18, 0);
  add('cord', tier === 'hero' ? merge([cordGeo, new THREE.TorusGeometry(0.02, 0.006, 5, 10).translate(0, 0.36, 0)]) : cordGeo, timber, 0, false);
  add('cap', tier === 'far' ? rim(0.11, 0.04) : merge([rim(0.11, 0.04), rim(0.075, 0.03).translate(0, 0.03, 0)]), timber);
  add('foot', tier === 'far' ? rim(0.1, 0.04) : merge([rim(0.1, 0.04), rim(0.07, 0.025).translate(0, -0.03, 0)]), timber, -0.48);
  // the paper: a lathed barrel, widest at the belly; ribs come from the texture
  const half = 0.225;
  const profile = tier === 'far'
    ? [[0.1, half], [0.17, 0], [0.1, -half]]
    : [[0.1, half], [0.14, 0.17], [0.165, 0.08], [0.172, 0], [0.165, -0.08], [0.14, -0.17], [0.1, -half]];
  const paperGeo = new THREE.LatheGeometry(v2(profile), seg);
  const lit = tier === 'far' ? null : litWashi(washiTexture(km, { ribs: 9 }), { color: paperTint(p.flame), glowColor: flameColor(p.flame).getHex(), glow: 0.4 });
  const paper = add('paper', paperGeo, lit || ownerGlow(ctx, 'lanternPaper'), -0.24);
  paper.castShadow = false;
  if (!far) add('band', new THREE.CylinderGeometry(0.178, 0.178, 0.04, seg, 1, true), red, -0.24);
  const tass = [new THREE.CylinderGeometry(0.012, 0.012, 0.06, 6).translate(0, -0.03, 0)];
  if (tier !== 'far') for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    tass.push(new THREE.CylinderGeometry(0.004, 0.003, 0.14, 4).rotateZ(Math.sin(a) * 0.12).rotateX(Math.cos(a) * 0.12).translate(Math.sin(a) * 0.012, -0.12, Math.cos(a) * 0.012));
  } else tass.push(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 4).translate(0, -0.1, 0));
  if (far) { // one timber mesh and the paper
    parts.cap.geometry = indexed(merge([parts.cord.geometry, parts.cap.geometry, parts.foot.geometry.clone().translate(0, -0.48, 0), ...tass.map((t) => t.translate(0, -0.5, 0))]));
    for (const k of ['cord', 'foot']) { g.remove(parts[k]); delete parts[k]; }
  } else add('tassel', merge(tass), red, -0.5);
  const step = lampUpdate({ lit, index: layout.index, base: 0.4, gain: 1.9, always: 0 });
  return { group: g, parts, live: lit ? [paper] : [], update: step, dispose() { freePrivate([lit]); } };
}

/** An andon: a timber frame round four paper panes, 0.88 m tall, origin on the floor. */
export function buildAndon(ctx, layout, p) {
  const { tier, kitMaterials: km } = ctx;
  const timber = matOr(ctx, 'timberDark', () => km.wood({ base: 0x3a2416, dark: 0x1c1008 }));
  const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  const frame = [box(0.44, 0.06, 0.44, 0, 0.03, 0), box(0.42, 0.05, 0.42, 0, 0.855, 0)];
  const hw = 0.18, y0 = 0.06, y1 = 0.83;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) frame.push(box(0.03, y1 - y0, 0.03, sx * hw, (y0 + y1) / 2, sz * hw));
  if (tier !== 'far') {
    for (const y of [0.2, 0.43, 0.66]) {
      if (tier === 'mid' && y !== 0.43) continue;
      frame.push(box(2 * hw, 0.014, 0.014, 0, y, hw), box(2 * hw, 0.014, 0.014, 0, y, -hw), box(0.014, 0.014, 2 * hw, hw, y, 0), box(0.014, 0.014, 2 * hw, -hw, y, 0));
    }
    frame.push(box(0.26, 0.03, 0.26, 0, 0.91, 0), box(0.1, 0.03, 0.1, 0, 0.94, 0));
  }
  const panes = [];
  for (let i = 0; i < 4; i++) {
    const pane = new THREE.PlaneGeometry(2 * hw - 0.03, y1 - y0 - 0.01);
    const a = i * Math.PI / 2;
    pane.rotateY(a).translate(Math.sin(a) * (hw - 0.002), (y0 + y1) / 2, Math.cos(a) * (hw - 0.002));
    panes.push(pane);
  }
  const lit = tier === 'far' ? null : litWashi(washiTexture(km, { ribs: 5 }), { color: paperTint(p.flame), glowColor: flameColor(p.flame).getHex(), glow: 0.4, fall: 0.5 });
  const g = new THREE.Group();
  const f = mesh(indexed(merge(frame)), timber, 'frame');
  const paper = mesh(indexed(merge(panes)), lit || ownerGlow(ctx, 'lanternPaper'), 'paper', false);
  g.add(f, paper);
  // the paper is centred on its own flame so the glow falls off from the middle
  paper.geometry.translate(0, -(y0 + y1) / 2, 0); paper.position.y = (y0 + y1) / 2;
  const step = lampUpdate({ lit, index: layout.index, base: 0.4, gain: 1.4, always: 0 });
  return { group: g, parts: { frame: f, paper }, live: lit ? [paper] : [], update: step, dispose() { freePrivate([lit]); } };
}
