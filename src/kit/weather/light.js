// Dappled light (komorebi): warm pools on the ground under the sakura, as ONE
// InstancedMesh (one draw for every pool, per-pool brightness through the
// instance colour). The classic pools were one transparent quad each.
// Nothing here reads Math.random or Date.now.
import * as THREE from 'three';
import { canvas2d, canvasTexture, rng as seeded } from '../craft.js?v=20261113a';
import { sharedTexture, reducedMotion } from './sprites.js?v=20261113a';

/** sin(sun elevation) from the hour: the same asymmetric sun path as Sky.updateDayNight() (daylight 6:00-19:12). */
export function sunHeightAt(hour) {
  const h = ((hour % 24) + 24) % 24;
  const dayStart = 6.0, dayEnd = 19.2;
  let angle;
  if (h >= dayStart && h <= dayEnd) angle = ((h - dayStart) / (dayEnd - dayStart)) * Math.PI;
  else {
    const nightT = h < dayStart ? h + 24 - dayEnd : h - dayEnd;
    angle = Math.PI + (nightT / (24 - (dayEnd - dayStart))) * Math.PI;
  }
  return Math.sin(angle) / Math.sqrt(1.25);   // sunDir = (cos, sin, 0.5) normalised
}

/** The golden-hour weight Vegetation.update() gave the pools: blooms near the horizon, gone at night. */
export function goldenAt(hour) {
  const up = Math.max(0, sunHeightAt(hour));
  return Math.min(0.5, up * Math.exp(-up * 2.4) * 0.66);
}

const GAPS = { hero: 70, mid: 36, far: 12 };

/** A pool of light through leaves: a wide soft wash, bright gaps of every size, a few leaf-shaped. */
export function dappleTexture(km, tier) {
  return sharedTexture(km, `dapple:${tier}`, () => {
    const [c, x] = canvas2d(128, 128);
    const r = seeded(0x6b0e + tier.length);   // a fixed stream: the texture is shared, so it must not eat the instance's draws
    const wash = x.createRadialGradient(64, 64, 0, 64, 64, 62);
    wash.addColorStop(0, 'rgba(255,214,150,0.26)'); wash.addColorStop(0.7, 'rgba(255,214,150,0.1)'); wash.addColorStop(1, 'rgba(255,214,150,0)');
    x.fillStyle = wash; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < GAPS[tier]; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 46;
      const px = 64 + Math.cos(a) * d, py = 64 + Math.sin(a) * d;
      const big = r() < 0.18;
      const rad = big ? 7 + r() * 8 : 2.5 + r() * 5;
      x.save(); x.translate(px, py); x.rotate(r() * 3.14); x.scale(1, 0.55 + r() * 0.4);
      const g = x.createRadialGradient(0, 0, 0, 0, 0, rad);
      g.addColorStop(0, `rgba(255,226,170,${0.45 + r() * 0.25})`); g.addColorStop(0.55, 'rgba(255,214,150,0.22)'); g.addColorStop(1, 'rgba(255,214,150,0)');
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, rad, 0, Math.PI * 2); x.fill(); x.restore();
    }
    return canvasTexture(c);
  });
}

/**
 * One pool per `layout.pools` entry { x, y, z, scale }, in the layout's world
 * coordinates (the instance group sits at the origin, as the classic pools did).
 * update() follows the sun by hour, thins in rain and snow, and stays calm
 * under reduce-motion.
 */
export function buildDappledLight(ctx, layout, p) {
  const { tier, quality } = ctx;
  const r = ctx.rng;
  const pools = layout.pools || [];
  const tex = dappleTexture(ctx.kitMaterials, tier);
  const size = layout.size || 2.6;
  const geo = new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color().setScalar(p.strength), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  // the medium tier thins the pools the way Vegetation.setDensity() does for the classic ones
  const live = Math.max(pools.length ? 1 : 0, Math.round(pools.length * (quality === 'medium' ? 0.75 : 1)));
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, pools.length));
  mesh.count = live;
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const phase = [];
  pools.forEach((pl, i) => {
    q.setFromAxisAngle(up, r() * Math.PI * 2);
    const k = pl.scale * p.spread;
    m4.compose(v.set(pl.x, pl.y, pl.z), q, s.set(k, 1, k));
    mesh.setMatrixAt(i, m4);
    mesh.setColorAt(i, new THREE.Color(1, 1, 1));
    phase.push(i * 2.1 + r() * 0.5);
  });
  mesh.instanceMatrix.needsUpdate = true;
  const col = new THREE.Color();
  const group = new THREE.Group();
  group.add(mesh);
  return {
    group, parts: { pools: mesh }, live: [mesh],
    update(dt, t, env) {
      const calm = reducedMotion();
      const hour = env && typeof env.hour === 'number' ? env.hour : 12;
      const weather = 1 - 0.85 * Math.min(1, Math.max(env ? env.wet || 0 : 0, env ? env.snow || 0 : 0));
      const flicker = calm ? 0.94 : 0.88 + Math.sin(t * 0.9) * 0.12;
      mat.opacity = goldenAt(hour) * flicker * weather;
      mesh.visible = mat.opacity > 0.003;
      if (!mesh.visible) return;
      for (let i = 0; i < live; i++) {
        const b = calm ? 0.92 : 0.85 + Math.sin(t * 0.6 + phase[i]) * 0.15;
        mesh.setColorAt(i, col.setRGB(b, b, b));
      }
      mesh.instanceColor.needsUpdate = true;
    },
    dispose() { geo.dispose(); mat.dispose(); mesh.dispose(); }
  };
}
