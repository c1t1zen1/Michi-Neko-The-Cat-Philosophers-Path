// mist-ring and dawn-mist (Phase 2 v-ranges): soft haze sprites. Each sprite
// keeps its OWN material (Countryside.update() drives opacity, scale and
// visibility per sprite) and its name `mist_N`; the textures are painted
// wisps instead of the classic single radial blob, tinted by the hour.
// Dawn mist keeps its per-time-of-day fade (updateDawnMist: opacity 0 and
// hidden until first light).
import * as THREE from 'three';
import { rng as seeded, canvas2d, canvasTexture } from '../craft.js?v=20261113a';

const TEX_SIZE = Object.freeze({ hero: 256, mid: 128, far: 64 });

/** A painted wisp: overlapping soft lobes, seeded, alpha only (the sprite colour tints it). */
function wispTexture(size, { lobes = 7, wide = 1, seed = 4 } = {}) {
  const [cv, g] = canvas2d(size, size);
  const r = seeded(seed);
  g.clearRect(0, 0, size, size);
  for (let i = 0; i < lobes; i++) {
    const cx = size * (0.5 + (r() - 0.5) * 0.46 * wide), cy = size * (0.5 + (r() - 0.5) * 0.3);
    const rad = size * (0.2 + r() * 0.2);
    const grad = g.createRadialGradient(cx, cy, rad * 0.1, cx, cy, rad);
    const a = 0.2 + r() * 0.18;
    grad.addColorStop(0, `rgba(255,255,255,${a})`);
    grad.addColorStop(0.55, `rgba(255,255,255,${a * 0.5})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.save(); g.translate(cx, cy); g.scale(1.0 + 0.5 * wide, 0.7, 1); g.translate(-cx, -cy);
    g.fillRect(0, 0, size, size);
    g.restore();
  }
  // fade the border to nothing so no sprite edge can show
  g.globalCompositeOperation = 'destination-in';
  const edge = g.createRadialGradient(size / 2, size / 2, size * 0.18, size / 2, size / 2, size * 0.5);
  edge.addColorStop(0, 'rgba(0,0,0,1)'); edge.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = edge; g.fillRect(0, 0, size, size);
  return canvasTexture(cv, { srgb: true, aniso: 1 });
}

/** Sprite tint by hour: cream by day, peach at dusk, blue-grey at night. */
const DAY = new THREE.Color(0xf4ece0), DUSK = new THREE.Color(0xf7c9a4), NIGHT = new THREE.Color(0x9aa6c4);
export function mistTint(hour, out = new THREE.Color()) {
  const dusk = Math.exp(-(((hour - 18.2) / 1.1) ** 2)) + Math.exp(-(((hour - 5.6) / 0.8) ** 2)) * 0.6;
  const night = hour > 20 || hour < 5 ? 1 : hour > 19 ? hour - 19 : hour < 6 ? 6 - hour : 0;
  return out.copy(DAY).lerp(DUSK, Math.min(1, dusk) * 0.7).lerp(NIGHT, Math.min(1, night) * 0.8);
}

function spriteGroup(ctx, layout, p, { opacity, hidden, color, order, wide, seed }) {
  const T = ctx.THREE;
  const tex = wispTexture(TEX_SIZE[ctx.tier] || 128, { lobes: ctx.tier === 'far' ? 4 : 7, wide, seed });
  const group = new T.Group(), parts = {}, mats = [];
  (layout.sprites || []).forEach((m, i) => {
    const mat = new T.SpriteMaterial({ map: tex, transparent: true, opacity, depthWrite: false, color });
    const spr = new T.Sprite(mat);
    spr.position.set(m.x, m.y, m.z);
    spr.scale.set(m.scale[0] * p.size, m.scale[1] * p.size, 1);
    if (hidden) { spr.visible = false; spr.renderOrder = order; }
    group.add(spr); parts[`mist_${i + 1}`] = spr; mats.push(mat);
  });
  return { group, parts, mats, tex };
}

export function buildMistRing(ctx, layout, p) {
  const { group, parts, mats, tex } = spriteGroup(ctx, layout, p, { opacity: 0.75, hidden: false, color: p.tint, order: 0, wide: 1, seed: 11 });
  const tint = new THREE.Color(), base = new THREE.Color(p.tint);
  const paint = (hour) => { mistTint(hour, tint).multiply(base); for (const m of mats) m.color.copy(tint); };
  paint(12);
  return {
    group, parts, sockets: {}, live: [],
    update(dt, t, env) { if (env && typeof env.hour === 'number') paint(env.hour); },
    dispose() { for (const m of mats) m.dispose(); tex.dispose(); }
  };
}

export function buildDawnMist(ctx, layout, p) {
  const { group, parts, mats, tex } = spriteGroup(ctx, layout, p, { opacity: 0, hidden: true, color: 0xf6efe4, order: 1, wide: 2.2, seed: 23 });
  return { group, parts, sockets: {}, live: [], dispose() { for (const m of mats) m.dispose(); tex.dispose(); } };
}
