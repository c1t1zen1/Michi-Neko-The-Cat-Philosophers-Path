// Summit light (天上): the open-sky and warm rim fills, and the god-rays behind
// the valley shrine that mark the unlocked path.
//
// summit-light: the same two lights as classic with the same starting values.
// The summit's own time-of-day driver (updateVistaEnvironment) sets their
// intensity and colour every frame from the sky palette, so the kit leaves
// that alone: the meditation seat's exposure is unchanged by construction.
//
// shrine-rays: nine leaning shafts, a bloom and a ground pool in VALLEY space
// (the layout's space is 'valley'). The facade pulses the list handed back as
// `_rays` (objects with material.opacity and userData.phase / baseOpacity)
// and shows or hides the bound `beacon`. The kit draws the shafts with a
// softer, streaked texture and lets them sway a little.
import * as THREE from 'three';
import { canvas2d, canvasTexture, rng as seeded } from '../craft.js?v=20261113a';
import { glowTexture, sharedTexture, reducedMotion, CALM } from '../weather/sprites.js?v=20261113a';

export function buildSummitLight(ctx, layout, p) {
  const group = new THREE.Group();
  const skyFill = new THREE.HemisphereLight(0xbfe5ff, 0x5b6638, 1.15);
  const warmFill = new THREE.DirectionalLight(0xffedc2, 1.1);
  warmFill.position.set(-32, p.elevation, -18);
  warmFill.castShadow = false;
  warmFill.target.position.set(5, 0, 18);
  group.add(skyFill, warmFill, warmFill.target);
  return { group, parts: { sky_fill: skyFill, warm_fill: warmFill }, live: [skyFill, warmFill], dispose() {} };
}

/** A shaft: soft across, a few faint streaks of dust along it, strong at the foot and gone at the top. */
function rayTexture(km, tier) {
  return sharedTexture(km, `summit-ray:${tier}`, () => {
    const [c, x] = canvas2d(64, 256);
    const gx = x.createLinearGradient(0, 0, 64, 0);
    gx.addColorStop(0, 'rgba(255,238,190,0)'); gx.addColorStop(0.5, 'rgba(255,238,190,0.85)'); gx.addColorStop(1, 'rgba(255,238,190,0)');
    x.fillStyle = gx; x.fillRect(0, 0, 64, 256);
    if (tier !== 'far') {
      const r = seeded(31);
      x.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 9; i++) { const px = 8 + r() * 48; x.fillStyle = `rgba(0,0,0,${0.12 + r() * 0.16})`; x.fillRect(px, 0, 1 + r() * 3, 256); }
      x.globalCompositeOperation = 'destination-in';
    } else x.globalCompositeOperation = 'destination-in';
    const gy = x.createLinearGradient(0, 256, 0, 0);
    gy.addColorStop(0, 'rgba(255,255,255,1)'); gy.addColorStop(0.75, 'rgba(255,255,255,0.55)'); gy.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gy; x.fillRect(0, 0, 64, 256);
    return canvasTexture(c);
  });
}

export function buildShrineRays(ctx, layout, p) {
  const km = ctx.kitMaterials;
  const root = new THREE.Group(), g = new THREE.Group(); // the facade shows and hides the beacon (g)
  root.add(g);
  const rayTex = rayTexture(km, ctx.tier);
  const glow = glowTexture(km, 'beacon', '255, 236, 190', 0.2);
  const pool = glowTexture(km, 'beacon-pool', '255, 232, 176', 0.2);
  const mats = [], rays = [], shafts = [];
  const mat = (map) => { const m = new THREE.MeshBasicMaterial({ map, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }); mats.push(m); return m; };
  const geo = [];
  for (let i = 0; i < 9; i++) {
    const { w, h, phase, baseOpacity } = layout.rays[i];
    const pg = new THREE.PlaneGeometry(w * p.width, h); geo.push(pg);
    const ray = new THREE.Mesh(pg, mat(rayTex));
    const a = (i / 8 - 0.5) * 1.15 * p.fan;
    ray.position.set(Math.sin(a) * 6.8, 8.5, -39.4 - Math.abs(a) * 2);
    ray.rotation.z = a * 0.55;
    ray.rotation.y = a * 0.4;
    ray.userData.phase = phase; ray.userData.baseOpacity = baseOpacity;
    ray.userData.restZ = ray.rotation.z;
    g.add(ray); rays.push(ray); shafts.push(ray);
  }
  const bloomMat = new THREE.SpriteMaterial({ map: glow, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  mats.push(bloomMat);
  const bloom = new THREE.Sprite(bloomMat);
  bloom.position.set(0, 5.2, -38.6); bloom.scale.set(15, 10, 1);
  bloom.userData.phase = 1.7; bloom.userData.baseOpacity = 0.5;
  g.add(bloom); rays.push(bloom);
  const cg = new THREE.CircleGeometry(4.6, ctx.tier === 'far' ? 12 : 28); geo.push(cg);
  const ground = new THREE.Mesh(cg, mat(pool));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0.06, -40.4);
  ground.userData.phase = 0; ground.userData.baseOpacity = 0.55;
  g.add(ground); rays.push(ground);
  g.visible = false;
  const f = layout.footprint || {};
  let clock = 0;
  return {
    group: root, parts: { beacon: g }, live: [...rays],
    footprint: { colliders: f.colliders || [], platforms: f.platforms || [], exclusions: f.exclusions || [], anchors: { ...(f.anchors || {}), _rays: rays } },
    update(dt) {
      if (!g.visible || ctx.tier === 'far') return;
      clock += dt * (reducedMotion() ? CALM : 1);
      for (const s of shafts) s.rotation.z = s.userData.restZ + Math.sin(clock * 0.21 + s.userData.phase) * 0.012;
    },
    dispose() { for (const m of mats) m.dispose(); for (const x of geo) x.dispose(); }
  };
}
