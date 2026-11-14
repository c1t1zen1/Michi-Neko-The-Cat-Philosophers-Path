// Summit weather (天上): snow, rain, pollen and the sakura drift, built on the
// weather family's sprite cloud (src/kit/weather/sprites.js). The summit keeps
// its own volumes: a fixed box over the clearing (the cat never leaves it), so
// a kit system moves its own sprites with the classic arithmetic and the
// classic constants, and reads its amounts from `env` (env.snow / env.wet are
// summitWeatherAmount(sky, ...), the same cross-faded value the valley sky
// holds). The first frame snaps to the target, so the summit opens in the
// weather the valley was in instead of ramping up from clear.
//
// Nothing reads Math.random or Date.now: every draw is ctx.rng.
import { weatherCloud, cloudInstance, petalTexture, flakeTexture, glowTexture, reducedMotion, CALM } from '../weather/sprites.js?v=20261113a';
import { buildRain } from '../weather/rain.js?v=20261113a';

const PETAL_TINTS = [0xffcad8, 0xffd2de, 0xf8c2d2, 0xffdbe5, 0xfdbfd0];
const ease = (a, b, k) => a + (b - a) * Math.min(1, k);
/** Active sprite count: the summit's setQuality() narrows the draw range. */
const active = (geo, n, per = 1) => Math.max(0, Math.min(n, Number.isFinite(geo.drawRange.count) ? Math.floor(geo.drawRange.count / per) : n));
/** Motion scale: the comfort setting damps every particle (classic petals: 0.2). */
const motion = () => (reducedMotion() ? CALM : 1);

/** A spawn box for samples (the summit's own volumes, seeded). */
export function summitBox(count, { w, h, d, y0 = 0, seed = 1, verts = 1 }) {
  let s = seed >>> 0 || 1;
  const r = () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const positions = new Float32Array(count * verts * 3);
  for (let i = 0; i < count; i++) {
    const x = (r() - 0.5) * w, y = y0 + r() * h, z = (r() - 0.5) * d;
    for (let v = 0; v < verts; v++) positions.set([x, y + v * 0.4, z], (i * verts + v) * 3);
  }
  return { index: 0, name: 'Summit weather', x: 0, y: 0, z: 0, count, positions, footprint: { colliders: [], platforms: [], exclusions: [], anchors: {} } };
}

/** summit-snow. Part `flakes` (the points the facade's setQuality() trims). Opacity target 0.82 x snow, like classic. */
export function buildSnow(ctx, layout, p) {
  const n = layout.positions.length / 3, r = ctx.rng;
  const cloud = weatherCloud(ctx, layout, {
    map: flakeTexture(ctx.kitMaterials), size: p.size, sizeVar: p.size_var, opacity: 0, spin: 0.45, blink: 0.25, rate: 3
  });
  const seeds = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { seeds[i * 3] = r() * 100; seeds[i * 3 + 1] = 0.55 + r() * 0.7; seeds[i * 3 + 2] = 0.6 + r() * 0.9; }
  const pts = cloud.points, mat = cloud.material, pos = pts.geometry.attributes.position;
  pts.visible = false;
  let first = true;
  const inst = cloudInstance(cloud, {
    update(dt, t, env) {
      const target = ((env && env.snow) || 0) * 0.82;
      mat.opacity = first ? target : ease(mat.opacity, target, dt * 1.4);
      first = false;
      pts.visible = mat.opacity > 0.012;
      if (!pts.visible) return;
      const m = motion() * dt, k = Math.min(n, active(pts.geometry, n));
      for (let i = 0; i < k; i++) {
        const ph = seeds[i * 3], fall = seeds[i * 3 + 1], amp = seeds[i * 3 + 2];
        let x = pos.getX(i) + Math.sin(t * 1.3 + ph) * m * 0.7 * amp;
        let y = pos.getY(i) - fall * m;
        let z = pos.getZ(i) + Math.cos(t * 1.05 + ph * 1.3) * m * 0.55 * amp;
        if (y < 0.1) { y = 24 + r() * 4; x = (r() - 0.5) * 62; z = (r() - 0.5) * 62; }
        pos.setXYZ(i, x, y, z);
      }
      pos.needsUpdate = true;
    }
  });
  inst.parts = { flakes: pts };
  return inst;
}

/** summit-rain. Part `drops`: two-vertex streaks (head bright, tail fading), slanted by the wind, 0.56 x rain. */
export function buildSummitRain(ctx, layout, p) {
  const n = layout.positions.length / 3, r = ctx.rng;
  const pos2 = new Float32Array(n * 6);
  for (let i = 0; i < n; i++) { pos2.set(layout.positions.subarray(i * 3, i * 3 + 3), i * 6); pos2.set(layout.positions.subarray(i * 3, i * 3 + 3), i * 6 + 3); }
  const built = buildRain(ctx, { positions: pos2 }, { strength: p.strength });
  const lines = built.parts.lines, mat = lines.material, pos = lines.geometry.attributes.position;
  const seeds = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { seeds[i * 2] = 14 + r() * 11; seeds[i * 2 + 1] = r() * 100; }
  let first = true;
  const place = (i, x, y, z, vx, vy) => {
    const len = p.length / Math.hypot(vx, vy);
    pos.setXYZ(i * 2, x, y, z);
    pos.setXYZ(i * 2 + 1, x - vx * len, y - vy * len, z);
  };
  // streaks start spread through the box (the classic reseed, on first sight)
  for (let i = 0; i < n; i++) place(i, pos2[i * 6], pos2[i * 6 + 1], pos2[i * 6 + 2], 3, -18);
  return {
    group: built.group, parts: { drops: lines }, live: [lines],
    update(dt, t, env) {
      const amt = (env && env.wet) || 0;
      const target = amt * 0.62;
      mat.opacity = first ? target : ease(mat.opacity, target, dt * 2.1);
      first = false;
      lines.visible = mat.opacity > 0.01;
      if (!lines.visible) return;
      const calm = motion(), wind = 2.2 + amt * 2.8;
      const m = calm * dt, k = Math.min(n, active(lines.geometry, n * 2, 2));
      for (let i = 0; i < k; i++) {
        const speed = seeds[i * 2], ph = seeds[i * 2 + 1];
        let x = pos.getX(i * 2) + wind * m;
        let y = pos.getY(i * 2) - speed * m;
        let z = pos.getZ(i * 2) + Math.sin(t * 0.8 + ph) * m * 0.25;
        if (y < 0 || Math.abs(x) > 31 || Math.abs(z) > 31) { x = (r() - 0.5) * 56; y = 14 + r() * 9; z = (r() - 0.5) * 56; }
        place(i, x, y, z, wind, -speed);
      }
      pos.needsUpdate = true;
    },
    dispose: built.dispose
  };
}

/** summit-pollen. Part `pollen`: the facade moves the points (gust-driven); the kit dresses and blinks them. */
export function buildPollen(ctx, layout, p) {
  const cloud = weatherCloud(ctx, layout, {
    map: glowTexture(ctx.kitMaterials, 'pollen', '255, 246, 214', 0.14), size: p.size, sizeVar: 0.5, opacity: 0.65,
    additive: true, blink: p.blink, rate: 1.4
  });
  cloud.material.color.set(0xfff3c8);
  const inst = cloudInstance(cloud);
  inst.parts = { pollen: cloud.points };
  return inst;
}

/** summit-petals. Part `petals`: a ribbon blown from the sakura, the classic gust and respawn, fading out in snow. */
export function buildPetals(ctx, layout, p) {
  const n = layout.positions.length / 3, r = ctx.rng;
  const cloud = weatherCloud(ctx, layout, {
    map: petalTexture(ctx.kitMaterials), size: p.size, sizeVar: 0.35, opacity: 0.7, spin: 1.8 * p.tumble, flip: p.tumble > 0 ? 1 : 0, tints: PETAL_TINTS
  });
  const seeds = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { seeds[i * 3] = r() * Math.PI * 2; seeds[i * 3 + 1] = 0.28 + r() * 0.5; seeds[i * 3 + 2] = 0.16 + r() * 0.32; }
  const pts = cloud.points, mat = cloud.material, pos = pts.geometry.attributes.position;
  let first = true;
  const inst = cloudInstance(cloud, {
    update(dt, t, env) {
      const target = 0.7 * (1 - ((env && env.snow) || 0));
      mat.opacity = first ? target : ease(mat.opacity, target, dt * 1.2);
      first = false;
      pts.visible = mat.opacity > 0.01;
      if (!pts.visible) return;
      const mo = reducedMotion() ? 0.2 : 1;
      const gust = (0.52 + 0.16 * Math.sin(t * 0.31) + 0.1 * Math.sin(t * 0.83)) * mo;
      for (let i = 0; i < n; i++) {
        const ph = seeds[i * 3], speed = seeds[i * 3 + 1], fl = seeds[i * 3 + 2];
        let x = pos.getX(i) + gust * speed * dt;
        let y = pos.getY(i) - (0.045 + speed * 0.035) * dt * mo + Math.sin(t * 1.7 + ph) * dt * fl * mo;
        let z = pos.getZ(i) + Math.cos(t * 0.74 + ph) * dt * fl * 0.45 * mo;
        if (x > 13 || y < 0.14 || z > 12.5 || z < -5.5) { x = -12.5 - r() * 1.5; y = 1.1 + r() * 4.9; z = -3.5 + r() * 14; }
        pos.setXYZ(i, x, y, z);
      }
      pos.needsUpdate = true;
    }
  });
  inst.parts = { petals: pts };
  return inst;
}
