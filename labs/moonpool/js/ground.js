// Lab 07 specimens for the ground, the stones and the bamboo of the two
// hidden places (promoted into src/kit/hidden/): the mossy apron, the rim
// stones, the sitting slab, the leaf-litter floor, the noded culm ring, the
// boulder, and the whole lantern clearing. Each tile's code is the recipe.
import * as THREE from 'three';
import { TAU, rng, canvas2d, canvasTexture, rockGeometry } from '../../shared/craft.js';
import { chochin } from '../../shared/paperlantern.js';
import { gameHidden } from './recipes.js';

export const GROUND_FAMILIES = [
  { key: 'ground', title: 'Ground that <em>remembers paws</em>', sub: 'Moss with a wet edge, a worn trail and fallen leaves: the floor is a painting, and the painting is the cheapest thing in the scene.' },
  { key: 'stone', title: 'Stones <em>laid by hand</em>', sub: 'A rim, a slab to sit on and a mossy boulder: chiselled planes, a dished top, three variants shared across the ring.' },
  { key: 'grove', title: 'A ring of <em>noded bamboo</em>', sub: 'Nodes, a pale waxy band and slim drooping blades, then the whole clearing with its lanterns.' }
];

const disc = (r, y, tex, k) => {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 1, depthWrite: false }));
  m.position.y = y; m.receiveShadow = true; return m;
};

function mossTexture(seed, { wet = true, trail = true } = {}) {
  const [c, x] = canvas2d(256, 256), r = rng(seed), s = 256;
  const g = x.createRadialGradient(s / 2, s / 2, s * 0.16, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(66,92,58,1)'); g.addColorStop(0.7, 'rgba(84,112,66,.88)'); g.addColorStop(1, 'rgba(92,122,70,0)');
  x.fillStyle = g; x.fillRect(0, 0, s, s);
  if (wet) { const w = x.createRadialGradient(s / 2, s / 2, s * 0.2, s / 2, s / 2, s * 0.29); w.addColorStop(0, 'rgba(30,46,34,.55)'); w.addColorStop(1, 'rgba(30,46,34,0)'); x.fillStyle = w; x.fillRect(0, 0, s, s); }
  for (let i = 0; i < 260; i++) {
    const px = r() * s, py = r() * s; if (Math.hypot(px - s / 2, py - s / 2) < s * 0.24) continue;
    if (i % 5 === 0) { const rad = 4 + r() * 6, m = x.createRadialGradient(px, py, 0, px, py, rad); m.addColorStop(0, 'rgba(60,130,50,.6)'); m.addColorStop(1, 'rgba(60,110,50,0)'); x.fillStyle = m; x.fillRect(px - rad, py - rad, rad * 2, rad * 2); }
    else if (i % 7 === 1) { x.fillStyle = `rgba(168,170,158,${0.3 + r() * 0.3})`; x.beginPath(); x.ellipse(px, py, 1.4, 1, r() * 6, 0, TAU); x.fill(); }
    else { x.fillStyle = `rgba(${60 + r() * 40},${90 + r() * 50},50,${0.12 + r() * 0.2})`; x.fillRect(px, py, 2 + r() * 4, 1 + r() * 2); }
  }
  if (trail) { const t = x.createLinearGradient(0, s * 0.62, 0, s); t.addColorStop(0, 'rgba(150,138,104,0)'); t.addColorStop(0.55, 'rgba(150,138,104,.42)'); t.addColorStop(1, 'rgba(150,138,104,0)'); x.fillStyle = t; x.fillRect(s * 0.42, s * 0.62, s * 0.16, s * 0.38); }
  return canvasTexture(c);
}

function litterTexture(seed) {
  const [c, x] = canvas2d(256, 256), r = rng(seed), s = 256;
  const g = x.createRadialGradient(s / 2, s / 2, s * 0.1, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(158,140,90,1)'); g.addColorStop(0.75, 'rgba(120,128,70,.92)'); g.addColorStop(1, 'rgba(100,126,64,0)');
  x.fillStyle = g; x.fillRect(0, 0, s, s);
  for (let i = 0; i < 320; i++) {
    const px = r() * s, py = r() * s, h = 60 + r() * 30;
    if (i % 8 === 0) { const rad = 5 + r() * 6, m = x.createRadialGradient(px, py, 0, px, py, rad); m.addColorStop(0, 'hsla(95,40%,34%,.5)'); m.addColorStop(1, 'hsla(95,40%,34%,0)'); x.fillStyle = m; x.fillRect(px - rad, py - rad, rad * 2, rad * 2); continue; }
    x.save(); x.translate(px, py); x.rotate(r() * 6.3); x.fillStyle = `hsla(${h - 8 + (i % 3) * 7},${38 + r() * 25}%,${38 + r() * 24}%,${0.4 + r() * 0.4})`;
    x.beginPath(); x.ellipse(0, 0, 3 + r() * 6, 1 + r() * 0.6, 0, 0, TAU); x.fill(); x.restore();
  }
  return canvasTexture(c);
}

function stoneRing(k, n, radius, { seed = 3, size = 1, moss = 0.7 } = {}) {
  const r = rng(seed), mats = k.M.rock({ a: 0x4e5b4a, b: 0x9aa08e, moss, lichen: 0.18 });
  const variants = [0, 1, 2].map((i) => rockGeometry(seed + i * 7, { detail: 2, cuts: 8, cutDepth: 0.66, rough: 0.2, ridge: 0.05 }));
  const lists = [[], [], []];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, s = 0.65 + r() * 0.9;
    lists[i % 3].push({ x: Math.cos(a) * (radius + 0.1 + r() * 0.3), y: 0.07 * s, z: Math.sin(a) * (radius + 0.1 + r() * 0.3), ry: r() * TAU, sx: 0.4 * s * size, sy: 0.3 * s * size, sz: 0.34 * s * size });
  }
  const g = new THREE.Group();
  variants.forEach((v, i) => { const m = k.instances(v, mats, lists[i]); m.castShadow = m.receiveShadow = true; g.add(m); });
  return g;
}

function slab(k, hx, hz, seed) {
  const geo = rockGeometry(seed, { detail: 3, h: 0.3, flat: 0.6, rough: 0.1, ridge: 0.04, cuts: 6, cutDepth: 0.7 });
  geo.computeBoundingBox(); const b = geo.boundingBox, sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  geo.translate(-c.x, -c.y, -c.z); geo.scale(2 * hx / sz.x, 0.1 / sz.y, 2 * hz / sz.z);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const px = pos.getX(i), pz = pos.getZ(i); if (pos.getY(i) > 0.02) pos.setY(i, pos.getY(i) - 0.012 * Math.max(0, 1 - (px * px / (hx * hx) + pz * pz / (hz * hz)))); }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, k.M.rock({ a: 0x6a665e, b: 0xa8a294, moss: 0.4, lichen: 0.3 })); m.position.y = 0.05; m.castShadow = m.receiveShadow = true; return m;
}

// a culm: swollen nodes, a dark ridge, a pale waxy band under each ridge (vertex colour)
function culm(len, rBot, rTop, nodes, radial = 6) {
  const prof = [], shade = [], steps = nodes * 2;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, f = (t * nodes) % 1, d = Math.min(f, 1 - f), bell = Math.exp(-Math.pow(d / 0.045, 2));
    prof.push(new THREE.Vector2((rBot + (rTop - rBot) * t) * (1 + 0.14 * bell), t * len));
    const band = f > 0.8 && f < 1 ? Math.exp(-Math.pow((f - 0.92) / 0.07, 2)) : 0;
    shade.push((1 - 0.6 * Math.exp(-Math.pow(d / 0.04, 2))) * (1 + 0.38 * band));
  }
  const g = new THREE.LatheGeometry(prof, radial), per = radial + 1, col = new Float32Array(g.attributes.position.count * 3);
  for (let r2 = 0; r2 < prof.length; r2++) for (let c = 0; c < per; c++) { const i = (r2 * per + c) * 3, v = shade[r2]; col[i] = v; col[i + 1] = v; col[i + 2] = v; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

function bambooRing(k, n, radius, { seed = 5, h = 3.2 } = {}) {
  const r = rng(seed), g = new THREE.Group(), cm = k.M.bamboo({ color: 0xa9c06a, vcol: true, rough: 0.5 });
  const leafMat = k.M.bamboo({ color: 0xffffff, vcol: false, side: THREE.DoubleSide, rough: 0.8 });
  const blade = new THREE.ConeGeometry(0.1, 0.75, 4).translate(0, 0.375, 0);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + (r() - 0.5) * 0.15, rr = radius + r() * 0.5, hh = h * (0.85 + r() * 0.3), lean = 0.05 + r() * 0.05;
    const m = new THREE.Mesh(culm(hh, 0.05, 0.035, 9), cm); m.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr); m.rotation.set(Math.sin(a) * lean, 0, -Math.cos(a) * lean); m.castShadow = true; g.add(m);
    for (let q = 0; q < 6; q++) {
      const l = new THREE.Mesh(blade, leafMat.clone()); l.material.color.setHSL(0.24 + r() * 0.07, 0.5, 0.36 + r() * 0.1);
      l.position.set(m.position.x, hh * (0.78 + (q % 3) * 0.08), m.position.z); l.rotation.set(1.6 + r() * 0.6, (q / 6) * TAU + r(), 0, 'YXZ'); l.castShadow = true; g.add(l);
    }
  }
  return g;
}

export const GROUND_SPECIMENS = [
  { id: 'game-ground', family: 'ground', original: true, name: 'Today’s apron and stones', jp: '今の苔', tag: 'A radial gradient with 260 dashes, and a ring of dodecahedra', plinth: 'moss', hour: 12,
    blurb: 'The real pool with the water lifted off: one gradient disc speckled with tiny dashes, a ring of flat-shaded dodecahedra and a cylinder to sit on.',
    how: ['CircleGeometry with a 128 px canvas map.', 'One InstancedMesh of dodecahedra, tinted per instance.'], use: 'Baseline.', sources: ['shinji'],
    build(k) { const h = gameHidden(), g = h.poolGroup; g.position.set(0, 0, 0); g.traverse((o) => { if ((o.geometry?.type === 'CircleGeometry' && o.geometry.parameters.radius <= 3.01) || o.isSprite || o.isPoints || o.geometry?.type === 'ConeGeometry' || o.geometry?.type === 'BoxGeometry') o.visible = false; }); return g; } },
  { id: 'apron-moss', family: 'ground', name: 'Moss with a wet edge', jp: '苔の縁', tag: 'Clumps, pebbles and a worn trail', plinth: 'moss', hour: 12,
    blurb: 'The same disc with a wet dark band where the stones keep the ground damp, soft moss clumps, pale pebbles and a paler trail up the south shore where visitors arrive.',
    how: ['Radial gradient, then a second gradient for the wet band.', 'Every fifth mark becomes a moss clump (its own radial), every seventh a pebble.', 'A vertical gradient strip is the trail; the sheet’s bottom is south.'], use: 'Pool apron; any ground that should look walked on.', sources: ['shinji'],
    build(k) { const g = new THREE.Group(); g.add(disc(3.6, 0.022, mossTexture(11), k)); g.add(stoneRing(k, 26, 1.7, { seed: 4, size: 0.85 })); return g; } },
  { id: 'rim-chisel', family: 'stone', name: 'A chiselled rim', jp: '縁石', tag: 'Three variants, a gap for the arrival', plinth: 'moss', hour: 12,
    blurb: 'A ring of stones from three chiselled variants (planes cut from an icosphere, then displaced), each sunk a little, with a gap on the south shore.',
    how: ['rockGeometry(seed, { cuts, cutDepth, rough, ridge }), three seeds, shared round the ring.', 'Scale 1.15 : 0.62 : 1 so each reads as a water-worn slab.'], use: 'Ponds, wells, the lip of any basin.', sources: ['shinji'],
    build(k) { return stoneRing(k, 30, 1.5, { seed: 9, size: 1.1, moss: 0.9 }); } },
  { id: 'seat-slab', family: 'stone', name: 'A slab worn to sit on', jp: '腰掛け石', tag: 'Flat, dished a centimetre', plinth: 'moss', hour: 12,
    blurb: 'The sitting stone: a flat chiselled slab whose top is pressed in a little where people sit. Top height matches the old cylinder so the rest spot does not move.',
    how: ['rockGeometry with a low h and flat 0.6, fitted to half extents.', 'Top vertices are lowered by a paraboloid.'], use: 'Rest spots.', sources: ['shinji'],
    build(k) { const g = new THREE.Group(); g.add(slab(k, 0.67, 0.62, 21)); return g; } },
  { id: 'glade-litter', family: 'ground', name: 'Fallen blades', jp: '落ち葉', tag: 'Pointed leaves, moss, a worn clearing', plinth: 'moss', hour: 12,
    blurb: 'Leaf litter drawn as pointed ellipses in olive and gold instead of one-pixel dashes, with moss patches and a paler worn middle.',
    how: ['320 strokes: 1 in 8 a moss gradient, the rest an ellipse rotated at random.', 'A small radial gradient in the middle lightens the trodden clearing.'], use: 'Glade and grove floors.', sources: ['shinji'],
    build(k) { const g = new THREE.Group(); g.add(disc(3.2, 0.02, litterTexture(31), k)); return g; } },
  { id: 'bamboo-nodes', family: 'grove', name: 'Culms with nodes', jp: '節', tag: 'Swollen nodes, a dark ridge, a waxy band', plinth: 'moss', hour: 12,
    blurb: 'A ring of tall culms with real nodes (a swelling, a dark ridge line and the pale waxy band just below it) and slim drooping blades in place of fat cones.',
    how: ['LatheGeometry with a bell-shaped bulge at every node; node shade in vertex colour.', 'Blades leave the stalk at a droop angle and spin about it.'], use: 'Glade bamboo; any grove the cat can touch.', sources: ['shinji'],
    build(k) { return bambooRing(k, 14, 1.6, { seed: 5, h: 3.6 }); } },
  { id: 'boulder-moss', family: 'stone', name: 'A boulder with a slab', jp: '苔岩', tag: 'Moss on top, the seat beside it', plinth: 'moss', hour: 12,
    blurb: 'The glade’s centre: a chiselled boulder, moss weighted to its upper faces by the rock material, beside the sitting slab. The boulder’s box matches the collider.',
    how: ['rockGeometry fitted to half extents 0.6 × 0.41 × 0.5.', 'The rock material grows moss where the surface faces up.'], use: 'Anywhere a landmark rock needs a seat.', sources: ['shinji'],
    build(k) {
      const g = new THREE.Group(); g.add(slab(k, 0.76, 0.74, 41));
      const bg = rockGeometry(51, { detail: 3, h: 0.8, rough: 0.16, ridge: 0.06, cuts: 7, cutDepth: 0.7, flat: 0.25 }); bg.computeBoundingBox();
      const b = bg.boundingBox, sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()); bg.translate(-c.x, -c.y, -c.z); bg.scale(1.2 / sz.x, 0.82 / sz.y, 1 / sz.z);
      const m = new THREE.Mesh(bg, k.M.rock({ a: 0x4a5640, b: 0x8c9b7a, moss: 0.9, lichen: 0.25 })); m.position.set(-1.7, 0.41, -0.9); m.castShadow = m.receiveShadow = true; g.add(m); return g;
    } },
  { id: 'glade-whole', family: 'grove', name: 'The whole clearing', jp: '竹あかりの庭', tag: 'Litter, culms, lanterns and a seat', plinth: 'moss', hour: 21, animatedShadow: false,
    blurb: 'Everything above in one small clearing: the floor, a ring of noded bamboo, four lanterns strung from the culms and the slab. Set the hour to dusk.',
    how: ['Each lantern is a chochin hung by a thin cord from a culm top.', 'In the game one merged paper mesh lights all eleven from a vertex attribute.'], use: 'The Lantern Glade.', sources: ['shinji'],
    build(k) {
      const g = new THREE.Group(); g.add(disc(3.4, 0.02, litterTexture(33), k)); g.add(bambooRing(k, 11, 2.2, { seed: 8, h: 3.4 })); const s = slab(k, 0.7, 0.68, 61); g.add(s);
      for (const [a, hang] of [[0.4, 1.7], [1.9, 2.0], [3.4, 1.8], [5.0, 2.1]]) { const l = chochin({ h: 0.5, belly: 0.17, glow: 1.4 }); l.position.set(Math.cos(a) * 1.9, hang, Math.sin(a) * 1.9); g.add(l); }
      return g;
    } }
];
