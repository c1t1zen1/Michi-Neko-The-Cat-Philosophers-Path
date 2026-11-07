// Live specimen views: one small scene per recipe, built lazily as it scrolls
// near. 'tower' tiles turn the whole tower on a gravel disc under a sky;
// 'part' tiles frame one part of a storey on the white page; 'orig' tiles do
// the same for the game's own builder with the other parts ghosted; 'finish'
// tiles paint one shared diorama; 'special' tiles stage a distance study.
import * as THREE from 'three';
import { LightRig } from '../../shared/light.js';
import { buildPagoda, resolveOpts, towerDims } from './pagoda.js';
import { originalPagoda, ghostOthers } from './original.js';
import { makeAir, patchAir, patchFade, patchRim } from './air.js';
import { Impostor } from './impostor.js';
import { rng, countMesh } from './util.js';
import { FX_LAYER } from './finish.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const DIAG = V(1, 0, 1).normalize();

/** Camera target and position for a view of tower dims D. */
function frameView(view, D, zoom = 1) {
  const S0 = D.S[0], S1 = D.S[Math.min(1, D.n - 1)], W = D.W1;
  switch (view) {
    case 'roof': { const t = V(0, S0.yE + (S0.yR - S0.yE) * 0.3 + S0.rise * 0.4, S0.R * 0.55); return { t, p: t.clone().add(V(S0.R * 0.42, W * 0.1, S0.R * 3.2).multiplyScalar(zoom)) }; }
    case 'corner': { const t = V(S0.w / 2 + S0.proj * 0.35, S0.yTop + S0.b * 0.5, S0.w / 2 + S0.proj * 0.35); return { t, p: t.clone().addScaledVector(V(0.55, 0, 1).normalize(), W * 2.15 * zoom).add(V(0, -W * 0.45 * zoom, 0)) }; }
    case 'eave': { const t = V(S0.R * 0.62, S0.yE - S0.edgeH, S0.R * 0.78); return { t, p: t.clone().add(V(0.25, -0.5, 1).normalize().multiplyScalar(S0.R * 1.35 * zoom)) }; }
    case 'bell': { const t = V(S0.R * 0.92, S0.yE - S0.edgeH - S0.bellH * 1.2, S0.R * 0.92); return { t, p: t.clone().addScaledVector(V(0.2, 0, 1).normalize(), W * 0.9 * zoom).add(V(0, -W * 0.12, 0)) }; }
    case 'hip': { const t = V(S0.R * 0.82, S0.yE + S0.rise * 0.5, S0.R * 0.82); return { t, p: t.clone().addScaledVector(V(1, 0, 0.35).normalize(), W * 1.1 * zoom).add(V(0, W * 0.75 * zoom, 0)) }; }
    case 'body': { const t = V(0, S0.y0 + S0.h * 0.55, S0.w / 2); return { t, p: t.clone().add(V(S0.w * 0.55, S0.h * 0.05, S0.w * 1.55).multiplyScalar(zoom)) }; }
    case 'koran': { const t = V(S1.w * 0.3, S1.y0 + 0.06 * W, S1.w / 2 + D.kd); return { t, p: t.clone().add(V(S1.w * 0.55, S1.w * 0.32, S1.w * 1.1).multiplyScalar(zoom)) }; }
    case 'sorin': { const t = V(0, D.sorinY + D.sorinH * 0.45, 0); return { t, p: t.clone().add(V(D.sorinH * 0.9, D.sorinH * 0.12, D.sorinH * 1.25).multiplyScalar(zoom)) }; }
    case 'suien': { const t = V(0, D.sorinY + D.sorinH * 0.74, 0); return { t, p: t.clone().add(V(D.sorinH * 0.32, D.sorinH * 0.02, D.sorinH * 0.4).multiplyScalar(zoom)) }; }
    case 'base': { const t = V(D.podiumHalf * 0.55, D.podiumH * 1.6, D.podiumHalf * 0.55); return { t, p: t.clone().addScaledVector(DIAG, D.podiumHalf * 2.6 * zoom).add(V(D.podiumHalf * 0.4, D.podiumHalf * 0.9 * zoom, 0)) }; }
    case 'far': { const t = V(0, D.H * 0.45, 0); return { t, p: t.clone().add(V(0.4, 0.04, 1).normalize().multiplyScalar(D.H * 9)) }; }
    default: { const t = V(0, D.H * 0.47, 0); return { t, p: t.clone().add(V(0.62, 0.02, 1).normalize().multiplyScalar(D.H * 1.95 * zoom)) }; }
  }
}

function ground(radius, color = 0xcfc7b4) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), new THREE.MeshStandardMaterial({ color, roughness: 1 }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}
function ridges(scene, air, radius) {
  const R = rng(4);
  for (const [k, col] of [[1, 0x3c5c3a], [1.6, 0x3d5244]]) {
    const pos = [], idx = [], seg = 96;
    for (let j = 0; j <= seg; j++) {
      const a = (j / seg) * Math.PI * 2, h = radius * k * (0.08 + 0.05 * Math.sin(a * 3 + R() * 6) + 0.03 * Math.sin(a * 11));
      pos.push(Math.cos(a) * radius * k, -2, Math.sin(a) * radius * k, Math.cos(a) * radius * k, h, Math.sin(a) * radius * k);
    }
    for (let j = 0; j < seg; j++) { const a = j * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, patchAir(new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide }), air)));
  }
}
function trees(scene, air, H, n = 18) {
  const R = rng(12), g = new THREE.IcosahedronGeometry(1, 1);
  const m = new THREE.InstancedMesh(g, patchAir(new THREE.MeshLambertMaterial(), air), n), o = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, r = H * (0.9 + R() * 0.9), s = H * (0.08 + R() * 0.07);
    o.position.set(Math.cos(a) * r, s * 0.6, Math.sin(a) * r); o.scale.set(s, s * 1.1, s); o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
    m.setColorAt(i, new THREE.Color().setHSL(R() < 0.4 ? 0.04 + R() * 0.05 : 0.28, 0.5, 0.3 + R() * 0.1));
  }
  m.castShadow = true;
  scene.add(m);
}
function airFromRig(air, rig) {
  air.uAirCol.value.copy(rig.palette.horizon).lerp(rig.palette.skyTop, 0.25);
  air.uSunCol.value.copy(rig.palette.sun);
  air.uSunW.value.copy(rig.sunDir);
}

export function buildTile(v, ctx) {
  const t0 = performance.now();
  const T = v.tile, scene = new THREE.Scene();
  scene.environment = ctx.env;
  const air = makeAir();
  const sky = T.kind !== 'part' && T.kind !== 'orig' || T.view === 'tower' || T.view === 'far';
  const hour = T.hour ?? (T.which === 'rim' ? 17.7 : T.which === 'night' ? 19.6 : 15.5);
  const rig = new LightRig(scene, { hour, shadows: T.kind === 'finish', shadowSize: 30, sky, fog: false, background: false });
  airFromRig(air, rig);
  const camera = new THREE.PerspectiveCamera(T.kind === 'part' || T.kind === 'orig' ? 34 : 30, 1, 0.05, 6000);
  camera.layers.enable(FX_LAYER);
  scene.userData.camera = camera;
  let subject, D, counts, update = () => {}, render = null, spin = !(T.kind === 'part' || T.kind === 'orig') || T.view === 'tower';
  let tower = null;

  if (T.kind === 'orig') {
    const o = originalPagoda();
    if (T.parts) ghostOthers(o, T.parts);
    subject = o.group; D = o.dims; counts = o.counts;
    scene.add(subject);
    if (T.view === 'far' || T.view === 'tower') scene.add(ground(D.H * 1.4));
  } else if (T.kind === 'part' || T.kind === 'tower') {
    const slice = T.kind === 'tower' ? 'all' : { roof: 'base', corner: 'base', eave: 'base', bell: 'base', hip: 'base', body: 'base', base: 'base', koran: 'two', sorin: 'top', suien: 'top' }[T.view] || 'all';
    tower = buildPagoda(T.opts, { detail: T.kind === 'tower' ? 'mid' : 'hero', slice });
    subject = tower.group; D = tower.dims; counts = tower.counts;
    scene.add(subject);
    if (T.kind === 'tower') { scene.add(ground(D.H * 1.6)); trees(scene, air, D.H, 10); }
    const wind = T.wind ?? 0.6;
    update = (dt, t) => tower.update(dt, t, { wind, windDir: V(Math.cos(t * 0.3), 0, Math.sin(t * 0.2)) });
  } else if (T.kind === 'finish') {
    tower = buildPagoda({ preset: 'yasaka' }, { detail: 'mid', shadows: true });
    subject = tower.group; D = tower.dims; counts = tower.counts;
    scene.add(subject, ground(D.H * 4, 0xb9b08f));
    trees(scene, air, D.H, 26);
    ridges(scene, air, D.H * 14);
    subject.traverse((m) => { if (m.isMesh) for (const mat of [].concat(m.material)) patchAir(mat, air); });
    const fit = rig.sun.shadow.camera;
    fit.left = fit.bottom = -D.H; fit.right = fit.top = D.H; fit.far = D.H * 8; fit.updateProjectionMatrix();
    rig.sun.position.copy(rig.sunDir).multiplyScalar(D.H * 3);
    render = (r, rect) => ctx.finisher.render(scene, camera, rect, T.finish, { kasumi: 0.6, time: performance.now() / 1000, lineFar: D.H * 30, sun: null });
  } else if (T.kind === 'special') {
    ({ subject, D, counts, update, render, spin } = special(T.which, scene, rig, air, ctx));
  }

  const f = frameView(T.kind === 'finish' ? 'tower' : T.view || 'tower', D, T.zoom ?? (T.kind === 'finish' ? 1.25 : 1));
  if (T.kind === 'finish') f.p.y = D.H * 0.32;
  camera.position.copy(f.p);
  camera.lookAt(f.t);
  const base = camera.position.clone().sub(f.t);
  rig.applyEnv();
  const built = performance.now() - t0;
  let hover = 0;
  return {
    scene, camera, built, counts, subject, setHover: (h) => { hover = h; },
    update(dt, t, rect) {
      if (spin && !ctx.reduceMotion && !hover && subject) subject.rotation.y += dt * 0.12;
      else if (!spin && !ctx.reduceMotion && !hover && (T.kind === 'part' || T.kind === 'orig')) {
        const a = Math.sin(t * 0.25) * 0.22;
        camera.position.copy(f.t).add(base.clone().applyAxisAngle(V(0, 1, 0), a));
        camera.lookAt(f.t);
      }
      update(dt, t, rect);
      camera.near = Math.max(0.02, camera.position.distanceTo(f.t) * 0.01);
      camera.updateProjectionMatrix();
    },
    render
  };
}

/* ---------------- distance studies ---------------- */

function special(which, scene, rig, air, ctx) {
  const opts = resolveOpts({ preset: 'yasaka' });
  const D = towerDims(opts);
  const patched = (b) => { b.group.traverse((m) => { if (m.isMesh) for (const mat of [].concat(m.material)) patchAir(mat, air, { uplight: true }); }); return b; };

  if (which === 'shin') {
    const b = buildPagoda(opts, { detail: 'hero' });
    b.setFrame(true);
    scene.add(b.group);
    return {
      subject: b.group, D, counts: b.counts, spin: true, render: null,
      update: (dt, t) => { const q = Math.max(0, Math.sin(t * 0.5)) ** 2; b.setQuake(q); b.update(dt, t, { wind: 0.2 }); }
    };
  }
  if (which === 'tiers' || which === 'dither') {
    const builds = ['hero', 'mid', 'far'].map((detail) => {
      const b = patched(buildPagoda(opts, { detail }));
      b.uFade = { value: 1 };
      b.group.traverse((m) => { if (m.isMesh) for (const mat of [].concat(m.material)) patchFade(mat, b.uFade); });
      scene.add(b.group);
      return b;
    });
    scene.add(ground(D.H * 30, 0xbcb39a));
    trees(scene, air, D.H, 22);
    rig.dome.scale.setScalar(8);
    return {
      subject: null, D, spin: false, render: null,
      counts: () => countMesh(scene),
      update: (dt, t, rect) => {
        if (which === 'tiers') {
          const d = D.H * (1.6 + 26 * (0.5 - 0.5 * Math.cos(t * 0.35)));
          const c = scene.userData.camera;
          c.position.set(d * 0.55, D.H * 0.4 + d * 0.04, d * 0.84);
          c.lookAt(0, D.H * 0.45, 0);
          const pxH = (D.H * rect.height) / (2 * d * Math.tan(THREE.MathUtils.degToRad(c.fov / 2)));
          const want = pxH >= 380 ? 0 : pxH >= 110 ? 1 : 2;
          builds.forEach((b, i) => { b.group.visible = i === want; b.uFade.value = 1; });
        } else {
          const k = 0.5 + 0.5 * Math.sin(t * 1.1);
          builds[0].group.visible = false;
          builds[1].group.visible = builds[2].group.visible = true;
          builds[1].uFade.value = k; builds[2].uFade.value = 1 - k;
        }
      }
    };
  }
  if (which === 'impostor') {
    const far = patched(buildPagoda(opts, { detail: 'far' }));
    const im = new Impostor(ctx.renderer, air);
    scene.add(im.mesh, ground(D.H * 3, 0xbcb39a));
    let baked = false;
    return {
      subject: null, D, spin: false, render: null, counts: () => ({ meshes: 1, tris: 2, instances: 0 }),
      update: (dt, t) => {
        if (!baked) { im.bake(far.group, rig, scene.environment); baked = true; }
        const c = scene.userData.camera, a = t * 0.3, d = D.H * 2.6;
        c.position.set(Math.sin(a) * d, D.H * 0.5, Math.cos(a) * d);
        c.lookAt(0, D.H * 0.45, 0);
      }
    };
  }
  if (which === 'air') {
    const group = new THREE.Group();
    const b = patched(buildPagoda(opts, { detail: 'far' }));
    for (const [z, x] of [[0, 0], [-650, -60], [-1950, 150]]) { const g = b.group.clone(); g.position.set(x, 0, z); group.add(g); }
    scene.add(group, ground(4000, 0x8e9a62));
    ridges(scene, air, 3200);
    rig.dome.scale.setScalar(12);
    return {
      subject: null, D, spin: false, counts: () => countMesh(group), render: null,
      update: () => { const c = scene.userData.camera; c.position.set(40, D.H * 0.35, 250); c.lookAt(40, D.H * 0.55, -600); c.fov = 26; c.far = 9000; c.updateProjectionMatrix(); }
    };
  }
  // rim and night: the mid tower in its precinct at a chosen hour
  const uRim = { value: which === 'rim' ? 0.7 : 0 };
  air.uUplight.value = which === 'night' ? 1.6 : 0;
  air.uUpH.value = D.H;
  const b = buildPagoda(opts, { detail: 'mid' });
  b.group.traverse((m) => { if (m.isMesh) for (const mat of [].concat(m.material)) { patchAir(mat, air, { uplight: true }); patchRim(mat, air, uRim); } });
  scene.add(b.group, ground(D.H * 4, 0x8f8a70));
  trees(scene, air, D.H, 20);
  return {
    subject: null, D, spin: false, counts: b.counts, render: null,
    update: (dt, t) => {
      const c = scene.userData.camera, s = rig.sunDir, a = Math.atan2(s.x, s.z) + Math.PI + Math.sin(t * 0.2) * 0.25;
      const d = D.H * 2.6;
      c.position.set(Math.sin(a) * d, D.H * 0.25, Math.cos(a) * d);
      c.lookAt(0, D.H * 0.55, 0);
    }
  };
}
