// Keepsakes family (Phase 2, wave 2.1): the small things the cat finds and
// eats, from lab 17.
//   yarn          a ball of wound thread (10 in the valley, batted around)
//   key           the antique secret-house key, with a glint
//   dango         the River-Spirit Charm: a golden dango on a skewer
//   jade-paw      the corral reward: a carved jade paw medallion
//   secret-fish   the grilled fish treat in the secret house (the fish only)
//   interior-fish the tea-house sea-bream platter (platter + fish)
// Gameplay finds these by the layout's name and binds: the root group is the
// collectible / key / fish mesh (position, spin and bob stay the game's), so
// every asset here builds around its own origin. Static shapes sit on shared
// merge-able materials; only the glints and the glowing jade and gold are
// live (private materials the game's collectible loop pulses).
import * as THREE from 'three';
import { defineAsset } from '../contract.js?v=20261113a';
import { canvas2d, canvasTexture } from '../craft.js?v=20261113a';
import {
  YARN_DETAIL, yarnThread, KEY_DETAIL, keyGeometry, DANGO_DETAIL, dangoBalls, dangoTrim,
  JADE_DETAIL, jadePawGeometry, FISH_DETAIL, fishGeometry, platterGeometry, garnishGeometry
} from './shapes.js?v=20261113a';

const num = (def, min, max, step, label) => ({ type: 'number', default: def, min, max, step, label });
const mesh = (geo, mat, cast = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; return m; };
const sized = (geo, s) => { if (s !== 1) geo.scale(s, s, s); return geo; };
const matOr = (ctx, name, make) => (ctx.MAT && ctx.MAT[name]) || make();

/** A soft sparkle sprite texture (radial bloom plus a four-point cross), built once. */
let glintMap = null;
function glintTexture() {
  if (glintMap) return glintMap;
  const [c, x] = canvas2d(128, 128);
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  x.globalCompositeOperation = 'lighter';
  for (const a of [0, Math.PI / 2]) {
    x.save(); x.translate(64, 64); x.rotate(a);
    const gr = x.createLinearGradient(-64, 0, 64, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.strokeStyle = gr; x.lineWidth = 3; x.beginPath(); x.moveTo(-64, 0); x.lineTo(64, 0); x.stroke(); x.restore();
  }
  glintMap = canvasTexture(c);
  glintMap.userData.kit = true;
  return glintMap;
}
const glintSprite = (color, strength = 1) => {
  const c = new THREE.Color(color).multiplyScalar(0.4 + 0.6 * strength);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTexture(), color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.2 }));
  s.renderOrder = 10;
  return s;
};

/* ------------------------------------------------------------------ yarn --- */

function buildYarn(ctx, layout, p) {
  const { tier, kitMaterials: km } = ctx;
  const det = YARN_DETAIL[tier] || YARN_DETAIL.mid;
  const group = new THREE.Group();
  // the core is the game's own yarn material: it is the glow the proximity pulse drives (group.material)
  const coreMat = matOr(ctx, 'yarn', () => { const m = new THREE.MeshStandardMaterial({ color: 0xe04a7a, emissive: 0x701030, emissiveIntensity: 0.5, roughness: 0.7 }); m.userData.fallback = true; return m; });
  const core = mesh(sized(new THREE.SphereGeometry(0.188, det[4], det[5]), p.size), coreMat);
  const seed = 3 + ((layout.id || 0) * 7) % 50;
  const thread = mesh(sized(yarnThread(0.2, det, { bands: Math.round(p.bands), warmth: p.warmth, seed }), p.size), km.bag({ rough: 0.9, brush: 0.05 }));
  const wrap = layout.wrap || [0, 0];
  thread.rotation.set(wrap[0], wrap[1], 0);
  group.add(core, thread);
  group.material = coreMat;
  return { group, parts: { core, thread }, sockets: {}, live: [], dispose() { if (coreMat.userData.fallback) coreMat.dispose(); } };
}

/* ------------------------------------------------------------------- key --- */

function buildKey(ctx, layout, p) {
  const { tier } = ctx;
  const det = KEY_DETAIL[tier] || KEY_DETAIL.mid;
  const group = new THREE.Group();
  // goldAntique is the owner's shared gold; the game pulses its emissive when the cat is near
  const gold = matOr(ctx, 'goldAntique', () => ctx.kitMaterials.bronze({ color: 0xd8b24a }));
  const key = mesh(sized(keyGeometry(det), p.size), gold);
  group.add(key);
  const parts = { key }, live = [];
  const glint = glintSprite(0xffe9a0, p.glint);
  glint.position.set(0.05, 0.36 * p.size, 0.04);
  group.add(glint); parts.glint = glint; live.push(glint);
  const phase = (layout.index || 0) * 1.3;
  return {
    group, parts, sockets: {}, live,
    update(dt, t) {
      // a soft glow always, a four-point sparkle blooming every few seconds
      const e = Math.pow((Math.sin(t * 1.6 + phase) + 1) / 2, 18) * p.glint;
      glint.material.opacity = 0.18 + e * 0.8;
      glint.scale.setScalar((0.2 + e * 0.3) * p.size);
      glint.material.rotation = t * 0.3;
    },
    dispose() { glint.material.dispose(); }
  };
}

/* ----------------------------------------------------------------- dango --- */

function buildDango(ctx, layout, p) {
  const { tier, kitMaterials: km } = ctx;
  const det = DANGO_DETAIL[tier] || DANGO_DETAIL.mid;
  const group = new THREE.Group();
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf2c14e, emissive: 0xd9a441, emissiveIntensity: 0.6, metalness: 0.7, roughness: 0.35 });
  const balls = mesh(sized(dangoBalls(det), p.size), goldMat);
  const trim = mesh(sized(dangoTrim(det), p.size), km.bag({ rough: 0.75, brush: 0.05 }));
  group.add(balls, trim);
  group.material = goldMat; // the collectible loop pulses this when the cat is near
  const glow = glintSprite(0xffd37a, p.glow);
  glow.scale.setScalar(0.5 * p.size);
  group.add(glow);
  const parts = { balls, trim, glow };
  return {
    group, parts, sockets: {}, live: [balls, glow],
    update(dt, t) { glow.material.opacity = (0.16 + 0.1 * Math.sin(t * 2.4)) * p.glow * 2; },
    dispose() { goldMat.dispose(); glow.material.dispose(); }
  };
}

/* -------------------------------------------------------------- jade paw --- */

function buildJadePaw(ctx, layout, p) {
  const { tier } = ctx;
  const det = JADE_DETAIL[tier] || JADE_DETAIL.mid;
  const group = new THREE.Group();
  const jade = new THREE.MeshStandardMaterial({ color: 0x76c7a1, emissive: 0x245c48, emissiveIntensity: 0.75, metalness: 0.45, roughness: 0.3 });
  const paw = mesh(sized(jadePawGeometry(det), p.size), jade);
  const gold = matOr(ctx, 'goldAntique', () => ctx.kitMaterials.bronze({ color: 0xd8b24a }));
  const ringGeo = new THREE.TorusGeometry(0.255, 0.03, det === JADE_DETAIL.far ? 4 : 8, det[0]);
  const ring = mesh(sized(ringGeo, p.size), gold);
  group.add(paw, ring);
  group.material = jade; // the collectible loop pulses its emissive
  return { group, parts: { paw, ring }, sockets: {}, live: [paw], dispose() { jade.dispose(); } };
}

/* ------------------------------------------------------------------ fish --- */

// The fish lies on its side in the game's frame; the root is the fishMesh.
function buildSecretFish(ctx, layout, p) {
  const det = FISH_DETAIL[ctx.tier] || FISH_DETAIL.mid;
  const group = new THREE.Group();
  const fish = mesh(sized(fishGeometry(det, 0.12, p.char), p.size), ctx.kitMaterials.bag({ rough: 0.6, brush: 0.04 }));
  group.add(fish);
  return { group, parts: { fish }, sockets: {}, live: [] };
}

// The tea-house platter: the room binds `fish` (the part the cat eats) and the
// platter stays when the fish goes, as in classic.
function buildInteriorFish(ctx, layout, p) {
  const { tier, kitMaterials: km } = ctx;
  const det = FISH_DETAIL[tier] || FISH_DETAIL.mid;
  const group = new THREE.Group();
  const china = matOr(ctx, 'plasterWarm', () => km.plain(0xeadfc8, { rough: 0.5 }));
  const platter = mesh(sized(platterGeometry(det), p.size), china);
  platter.position.y = 0.01;
  const fishHolder = new THREE.Group();
  fishHolder.position.y = 0.07;
  const body = mesh(sized(fishGeometry(det, 0.14, p.char), p.size), km.bag({ rough: 0.6, brush: 0.04 }));
  fishHolder.add(body);
  const garnish = mesh(sized(garnishGeometry(det), p.size), km.bag({ rough: 0.6, brush: 0.04 }), false);
  garnish.position.y = 0.022;
  group.add(platter, fishHolder, garnish);
  return { group, parts: { platter, fish: fishHolder, garnish }, sockets: {}, live: [] };
}

/* ------------------------------------------------------------------ sample --- */

export const assets = [
  defineAsset({
    id: 'yarn', family: 'keepsakes', lab: 'keepsakes/wound', label: 'Yarn ball', legacyName: 'Yarn Ball 00',
    params: { size: num(1, 0.8, 1.25, 0.05, 'Size'), bands: num(5, 2, 5, 1, 'Thread bands'), warmth: num(0, 0, 1, 1, 'Warm colours') },
    sample: { index: 0, name: 'Yarn Ball 00', x: 0, y: 0.35, z: 0, id: 0, wrap: [0.6, 1.9] }, build: buildYarn
  }),
  defineAsset({
    id: 'key', family: 'keepsakes', lab: 'keepsakes/old-key', label: 'Antique key', legacyName: 'Secret Key',
    params: { size: num(1, 0.8, 1.3, 0.05, 'Size'), glint: num(0.8, 0, 1, 0.1, 'Glint') },
    sample: { index: 0, name: 'Secret Key', x: 0, y: 0.55, z: 0 }, build: buildKey
  }),
  defineAsset({
    id: 'dango', family: 'keepsakes', lab: 'keepsakes/dango', label: 'River-Spirit Charm', legacyName: 'River-Spirit Charm',
    params: { size: num(1, 0.8, 1.3, 0.05, 'Size'), glow: num(0.6, 0, 1, 0.1, 'Glow') },
    sample: { index: 0, name: 'River-Spirit Charm', x: 0, y: 0.28, z: 0 }, build: buildDango
  }),
  defineAsset({
    id: 'jade-paw', family: 'keepsakes', lab: 'keepsakes/jade-paw', label: 'Jade Paw', legacyName: 'Jade Paw Reward',
    params: { size: num(1, 0.8, 1.3, 0.05, 'Size') },
    sample: { index: 0, name: 'Jade Paw Reward', x: 0, y: 0.42, z: 0 }, build: buildJadePaw
  }),
  defineAsset({
    id: 'secret-fish', family: 'keepsakes', lab: 'keepsakes/fish', label: 'Grilled fish treat', legacyName: 'Grilled Fish Treat',
    params: { size: num(1, 0.8, 1.3, 0.05, 'Size'), char: num(0.5, 0, 1, 0.1, 'Char') },
    sample: { index: 0, name: 'Grilled Fish Treat', x: 0, y: 0.52, z: 0 }, build: buildSecretFish
  }),
  defineAsset({
    id: 'interior-fish', family: 'keepsakes', lab: 'keepsakes/fish', label: 'Sea-bream platter', legacyName: 'Grilled Sea Bream',
    params: { size: num(1, 0.8, 1.3, 0.05, 'Size'), char: num(0.5, 0, 1, 0.1, 'Char') },
    sample: { index: 0, name: 'Grilled Sea Bream', x: 0, y: 0.49, z: 0 }, build: buildInteriorFish
  })
];
