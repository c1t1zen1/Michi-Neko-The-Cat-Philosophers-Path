// Frame capture for the cat-evolution video. Drives a snapshot of src/cat.js
// (any historical version) through scripted shots and POSTs transparent PNG
// frames plus per-frame projected bone / paw positions to the local server.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const params = new URLSearchParams(location.search);
const job = await (await fetch('/jobs/' + params.get('job') + '.json')).json();
const log = (s) => fetch('/log', { method: 'POST', body: `[${job.ver}] ${s}` });

let seed = 20261022;
const reseed = (s) => { seed = s % 2147483646 + 1; };
Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const hash = (str) => { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };

const TAG = '?v=20261022e';
const mod = await import(`/snap/${job.ver}/src/cat.js`);
const { Cat } = mod;
const rim = mod.catRimUniforms || null;
let anat = null, sdf = null;
if (job.ver === 'now') {
  anat = await import('/snap/now/src/cat_anatomy.js' + TAG);
  sdf = await import('/snap/now/src/cat_sdf.js' + TAG);
}

const W = job.w || 1080, H = job.h || 1080;
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.32;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const sun = new THREE.DirectionalLight(0xffd9a8, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 1, far: 60 });
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0x8fa5c9, 0x9a7a55, 0.85);
scene.add(hemi);
const fill = new THREE.DirectionalLight(0x5a4a78, 0.35);
fill.position.set(40, 30, 60);
scene.add(fill);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.3 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

function setLight(kind) {
  const golden = kind === 'golden';
  sun.color.set(golden ? 0xffb070 : 0xffd9a8);
  sun.intensity = golden ? 2.6 : 2.4;
  sun.position.set(-9, golden ? 4 : 14, 10);
  if (rim) {
    rim.uRimStrength.value = golden ? 0.84 : 0.22;
    rim.uRimColor.value.set(golden ? 0xff9a50 : 0xffb264);
    if (golden) rim.uRimDir.value.copy(sun.position).normalize();
    else rim.uRimDir.value.set(-0.55, 0.28, -0.79);
  }
}

const clayMat = new THREE.MeshStandardMaterial({ color: 0xd9c6ab, roughness: 0.62, metalness: 0 });
const wireMat = new THREE.MeshBasicMaterial({ color: 0x8ff6ff, wireframe: true, transparent: true, opacity: 0.85 });

// Bone colours for the skin-weight view: one hue per chain region
function boneColour(name) {
  const H = {
    body: 0.0, hips: 0.02, chest: 0.08, neck: 0.13, head: 0.16,
    scapR: 0.55, humerusR: 0.58, forearmR: 0.61, wristR: 0.64, fpawR: 0.67,
    scapL: 0.72, humerusL: 0.75, forearmL: 0.78, wristL: 0.81, fpawL: 0.84,
    femurR: 0.3, tibiaR: 0.34, metaR: 0.38, hpawR: 0.42,
    femurL: 0.45, tibiaL: 0.48, metaL: 0.51, hpawL: 0.53
  };
  let h = H[name];
  if (h === undefined) h = 0.9 + 0.015 * Number(name.replace('tail', '') || 0);
  const lightness = 0.5 + 0.12 * Math.sin(h * 40);
  return new THREE.Color().setHSL(h % 1, 0.85, lightness);
}

function weightColours(geo, defs) {
  const si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight;
  const cols = defs.map((d) => boneColour(d.name));
  const out = new Float32Array(si.count * 3);
  for (let v = 0; v < si.count; v++) {
    let r = 0, g = 0, b = 0;
    for (let k = 0; k < 4; k++) {
      const w = sw.getComponent(v, k);
      if (!w) continue;
      const c = cols[si.getComponent(v, k)];
      r += c.r * w; g += c.g * w; b += c.b * w;
    }
    out[v * 3] = r; out[v * 3 + 1] = g; out[v * 3 + 2] = b;
  }
  const g2 = geo.clone();
  g2.setAttribute('color', new THREE.BufferAttribute(out, 3));
  return g2;
}

function isOutline(o) {
  return o.material && !Array.isArray(o.material) && o.material.side === THREE.BackSide;
}

function applyMode(cat, mode) {
  if (cat.blob) cat.blob.visible = false;
  if (mode === 'coat') return;
  const defs = cat.anatomy ? cat.anatomy.bones : null;
  cat.group.traverse((o) => {
    if (o.isLine || o.isLineSegments) { o.visible = false; return; }
    if (!o.isMesh) return;
    if (isOutline(o)) { o.visible = false; return; }
    if (o.material && o.material.map && o.material.transparent && !o.castShadow && o.geometry.type === 'PlaneGeometry') { o.visible = false; return; }
    if (mode === 'clay') o.material = clayMat;
    else if (mode === 'wire') { o.material = wireMat; o.castShadow = false; }
    else if (mode === 'weights') {
      if (o.isSkinnedMesh && defs && o.geometry.attributes.skinIndex) {
        o.geometry = weightColours(o.geometry, defs);
        o.material = new THREE.MeshLambertMaterial({ vertexColors: true });
      } else {
        o.material = new THREE.MeshLambertMaterial({ color: boneColour('head') });
      }
    }
  });
  if (mode === 'wire') ground.visible = false;
}

/** Bind-pose sculpt (as tools/cat_preview ?raw=1), optionally re-sculpted. */
function rawGroup(A, mat, override) {
  const L = A.landmarks;
  const g = new THREE.Group();
  const add = (geo, pos) => {
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  add(override ? override.body : A.body);
  add(A.tail);
  add(override ? override.head : A.head, L.head);
  for (const e of A.face.earBase) {
    const ear = new THREE.Group();
    ear.position.set(L.head[0] + e.pos[0], L.head[1] + e.pos[1], L.head[2] + e.pos[2]);
    ear.rotation.set(-0.12, e.side * 0.35, e.side * -0.32);
    ear.add(new THREE.Mesh(A.ears.outer, mat));
    g.add(ear);
  }
  return g;
}

const REGION_COL = {
  trunk: 0xf2b84b, neck: 0xf08a5d, frontR: 0x4fc3f7, frontL: 0x7986cb,
  hindR: 0x81c784, hindL: 0x4db6ac, head: 0xf48fb1, carve: 0xff3355
};
const sphereGeo = new THREE.SphereGeometry(1, 28, 20);
function primObject(p, mat) {
  if (p.type === 'ellipsoid') {
    const m = new THREE.Mesh(sphereGeo, mat);
    m.scale.set(p.r[0], p.r[1], p.r[2]);
    if (p.rot) m.rotation.set(p.rot[0], p.rot[1], p.rot[2]);
    const g = new THREE.Group();
    g.add(m);
    g.position.set(p.c[0], p.c[1], p.c[2]);
    m.castShadow = true;
    return g;
  }
  const a = new THREE.Vector3(...p.a), b = new THREE.Vector3(...p.b);
  const len = a.distanceTo(b);
  const g = new THREE.Group();
  const inner = new THREE.Group();
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(p.rb, p.ra, len, 28, 1, true), mat);
  cyl.position.y = len / 2;
  const sa = new THREE.Mesh(sphereGeo, mat); sa.scale.setScalar(p.ra);
  const sb = new THREE.Mesh(sphereGeo, mat); sb.scale.setScalar(p.rb); sb.position.y = len;
  for (const m of [cyl, sa, sb]) { m.castShadow = true; inner.add(m); }
  inner.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  g.add(inner);
  g.position.copy(a);
  return g;
}

function primKit(A) {
  const L = A.landmarks, b = A.build;
  const list = [];
  for (const p of anat._bodyPrims(L, b)) list.push({ p, region: p.sub ? 'carve' : (p.region || 'trunk'), off: [0, 0, 0] });
  for (const p of anat._headPrims(b)) list.push({ p, region: p.sub ? 'carve' : 'head', off: L.head });
  const mats = {};
  const g = new THREE.Group();
  const items = list.map((it, i) => {
    const col = REGION_COL[it.region] ?? 0xffffff;
    const key = it.region;
    mats[key] = mats[key] || (it.region === 'carve'
      ? new THREE.MeshBasicMaterial({ color: col, wireframe: true })
      : new THREE.MeshStandardMaterial({ color: col, roughness: 0.45, metalness: 0.05, emissive: col, emissiveIntensity: 0.12 }));
    const o = primObject(it.p, mats[key]);
    o.position.x += it.off[0]; o.position.y += it.off[1]; o.position.z += it.off[2];
    const rest = o.position.clone();
    // Fly in from outside the body, staggered front-to-back
    const dir = rest.clone().sub(new THREE.Vector3(0, 0.42, 0));
    dir.y += 0.25; dir.normalize();
    g.add(o);
    return { o, rest, dir, delay: i / list.length };
  });
  return { group: g, items, count: list.length, carves: list.filter((x) => x.region === 'carve').length };
}

const ease = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;

async function postFrame(shot, i) {
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  await fetch(`/frame?shot=${encodeURIComponent(shot)}&i=${i}`, { method: 'POST', body: blob });
}

function project(v, camera) {
  const p = v.clone().project(camera);
  return [Math.round(((p.x + 1) / 2) * W * 10) / 10, Math.round(((1 - p.y) / 2) * H * 10) / 10, Math.round(p.z * 1000) / 1000];
}

function stats(cat) {
  let meshes = 0, tris = 0, outlines = 0;
  cat.group.traverse((o) => {
    if (!o.isMesh) return;
    if (isOutline(o)) { outlines++; return; }
    meshes++;
    const g = o.geometry;
    tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
  });
  const s = { meshes, outlines, tris: Math.round(tris) };
  if (cat.anatomy) {
    const A = cat.anatomy;
    const t = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;
    Object.assign(s, {
      bones: A.bones.length, buildMs: Math.round(A.buildMs),
      bodyVerts: A.body.attributes.position.count, bodyTris: t(A.body),
      headVerts: A.head.attributes.position.count, headTris: t(A.head),
      tailTris: t(A.tail), timings: A.timings
    });
  }
  return s;
}

function applyEvent(cat, shot, ev) {
  if (ev.do === 'idle') {
    cat.idleAction = ev.action;
    cat.idleActionTimer = 0;
    cat.idleActionDuration = ev.action === 'sleep' ? Infinity : (ev.duration || 10);
  } else if (ev.do === 'mood') cat.setMood(ev.name, ev.duration || 10, 3);
  else if (ev.do === 'jump') cat.onJump();
  else if (ev.do === 'drink') cat.setDrinking(true);
  else if (ev.do === 'meow' && cat.triggerMeow) cat.triggerMeow();
  else if (ev.do === 'speed') { shot.speed = ev.speed; shot.sprint = !!ev.sprint; }
}

// Named anatomy handles, present on every version (the rebuilt cat kept
// the primitive cat's public part handles)
function anchorObjects(cat) {
  const o = {
    head: cat.head, muzzle: cat.muzzle, nose: cat.nose, chest: cat.chest, hips: cat.hips, neck: cat.neck,
    tailRoot: cat.tailRoot, collar: cat.collar, bell: cat.bellMount || cat.bell
  };
  if (cat.tailSegs && cat.tailSegs.length) o.tailTip = cat.tailSegs[cat.tailSegs.length - 1];
  if (cat.eyes) { o.eyeR = cat.eyes[0]; o.eyeL = cat.eyes[1]; }
  if (cat.ears) { o.earR = cat.ears[0]; o.earL = cat.ears[1]; }
  (cat.legs || []).forEach((l, i) => {
    const k = ['fR', 'fL', 'hR', 'hL'][i];
    if (l.root) o[k + 'root'] = l.root;
    if (l.knee) o[k + 'knee'] = l.knee;
    if (l.paw) o[k + 'paw'] = l.paw;
  });
  for (const k of Object.keys(o)) if (!o[k] || !o[k].isObject3D) delete o[k];
  return o;
}

function landmarkAnchors(A) {
  const L = A.landmarks;
  const a = {
    hips: L.hips, chest: L.chest, neck: L.neck, head: L.head,
    fLscap: L.front.L.scap, fLshoulder: L.front.L.shoulder, fLelbow: L.front.L.elbow, fLwrist: L.front.L.wrist, fLpaw: L.front.L.knuckle,
    hLhip: L.hind.L.hip, hLstifle: L.hind.L.stifle, hLhock: L.hind.L.hock, hLpaw: L.hind.L.ball,
    tail0: L.tail[0], tailTip: L.tail[L.tail.length - 1],
    muzzle: [L.head[0], L.head[1] - 0.03, L.head[2] + 0.1], cheekL: [L.head[0] + 0.07, L.head[1] - 0.03, L.head[2] + 0.02],
    earL: [L.head[0] + A.face.earBase[1].pos[0], L.head[1] + A.face.earBase[1].pos[1], L.head[2] + A.face.earBase[1].pos[2]]
  };
  const out = {};
  for (const [k, v] of Object.entries(a)) out[k] = new THREE.Vector3(v[0], v[1], v[2]);
  return out;
}

const camera = new THREE.PerspectiveCamera(32, W / H, 0.02, 100);
const t0 = performance.now();

for (const shot of job.shots) {
  const ts = performance.now();
  reseed(hash(shot.name));
  setLight(shot.light || 'day');
  ground.visible = shot.ground !== false;
  const frames = shot.frames || 1;
  const fdt = shot.dt ?? 1 / 30;
  const mode = shot.mode || 'coat';
  let cat = null, root = null, kit = null, A = null;
  const meta = { shot: shot.name, ver: job.ver, w: W, h: H, frames: [] };

  if (mode === 'raw' || mode === 'rawwire' || mode === 'prims' || mode === 'blend') {
    A = anat.getCatAnatomy(anat.BUILDS[shot.build || 'michi']);
    if (mode === 'prims') {
      kit = primKit(A);
      root = kit.group;
      meta.prims = kit.count; meta.carves = kit.carves;
    } else {
      root = rawGroup(A, mode === 'rawwire' ? wireMat : clayMat);
      if (mode === 'rawwire') ground.visible = false;
    }
    scene.add(root);
  } else {
    cat = new Cat({ ...(shot.palette || {}), build: shot.build || 'michi' });
    root = cat.group;
    scene.add(root);
    const sp = shot.speed || 0;
    if (shot.prowl) cat.setProwling(true);
    const warm = shot.warm ?? 1.5;
    for (let t = 0; t < warm; t += 1 / 60) cat.update(1 / 60, sp, true, !!shot.sprint, false);
    // Pre-roll: settle into a pose before the first frame
    for (const ev of shot.pre || []) applyEvent(cat, shot, ev);
    for (let t = 0; t < (shot.settle || 0); t += 1 / 60) cat.update(1 / 60, shot.speed || 0, true, !!shot.sprint, false);
    if (shot.phase !== undefined) { cat.phase = shot.phase; cat.update(1e-5, sp, true, !!shot.sprint, false); }
    applyMode(cat, mode);
    meta.stats = stats(cat);
    if (cat.bones && cat.anatomy) {
      meta.boneNames = cat.anatomy.bones.map((d) => d.name);
      meta.boneParents = cat.anatomy.bones.map((d) => (d.parent ? cat.anatomy.boneIndex.get(d.parent) : -1));
    }
  }
  sun.target.position.set(0, 0, 0);

  const anchors = cat ? anchorObjects(cat) : (A ? landmarkAnchors(A) : {});
  meta.anchorNames = Object.keys(anchors);

  // Teardown: every rigid part of a primitive-built cat flies off its rig
  let parts = null;
  if (cat && shot.explode) {
    cat.group.updateMatrixWorld(true);
    const centre = new THREE.Vector3(0, 0.42, 0);
    parts = [];
    cat.group.traverse((o) => {
      if (!o.isMesh || (o.parent && o.parent.isMesh) || !o.visible) return;
      const w0 = o.getWorldPosition(new THREE.Vector3());
      const dir = w0.clone().sub(centre);
      dir.x += (Math.random() - 0.5) * 0.2; dir.y += 0.15 + Math.random() * 0.2; dir.z += (Math.random() - 0.5) * 0.2;
      dir.normalize();
      const axis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      parts.push({ o, w0, dir, axis, q0: o.quaternion.clone(), spin: 2 + Math.random() * 5, delay: Math.random() * 0.25, reach: 0.7 + Math.random() * 0.9 });
    });
    meta.parts = parts.length;
  }

  let blendGeo = null;
  for (let f = 0; f < frames; f++) {
    const tl = frames > 1 ? f / (frames - 1) : 0;
    const te = shot.ease === 'linear' ? tl : shot.ease === 'out' ? easeOut(tl) : ease(tl);
    const c = shot.cam;
    const az = THREE.MathUtils.degToRad(lerp(c.az0, c.az1 ?? c.az0, te));
    const el = THREE.MathUtils.degToRad(lerp(c.el0, c.el1 ?? c.el0, te));
    const dist = lerp(c.dist0, c.dist1 ?? c.dist0, te);
    const ty = lerp(c.ty0 ?? 0.42, c.ty1 ?? c.ty0 ?? 0.42, te);
    const tz = lerp(c.tz0 ?? 0, c.tz1 ?? c.tz0 ?? 0, te);
    const tx = lerp(c.tx0 ?? 0, c.tx1 ?? c.tx0 ?? 0, te);
    camera.fov = c.fov || 32;
    camera.updateProjectionMatrix();
    const target = new THREE.Vector3(tx, ty, tz);
    camera.position.set(
      target.x + Math.sin(az) * Math.cos(el) * dist,
      target.y + Math.sin(el) * dist,
      target.z + Math.cos(az) * Math.cos(el) * dist
    );
    camera.lookAt(target);

    const fr = {};
    if (cat) {
      for (const ev of shot.events || []) if (ev.at === f) applyEvent(cat, shot, ev);
      if (parts) {
        for (const p of parts) {
          const k = THREE.MathUtils.clamp((tl - p.delay) / (1 - p.delay), 0, 1);
          const e = k * k;
          const target = p.w0.clone().addScaledVector(p.dir, e * p.reach);
          target.y -= 0.0; // keep them flying out, not falling
          p.o.position.copy(p.o.parent.worldToLocal(target));
          p.o.quaternion.copy(p.q0).premultiply(new THREE.Quaternion().setFromAxisAngle(p.axis, e * p.spin));
        }
      } else if (f > 0 || shot.advanceFirst) {
        const sub = 2;
        const grounded = shot.airborne ? !(f >= shot.airborne[0] && f < shot.airborne[1]) : true;
        for (let k = 0; k < sub; k++) cat.update(fdt / sub, shot.speed || 0, grounded, !!shot.sprint, false);
      }
      if (meta.boneNames) {
        cat.group.updateMatrixWorld(true);
        fr.bones = cat.bones.map((b) => project(b.getWorldPosition(new THREE.Vector3()), camera));
        fr.paws = cat.legs.map((l) => {
          const p = l.paw.getWorldPosition(new THREE.Vector3());
          return Math.round(p.y * 1000) / 1000;
        });
      }
    }
    // Every mode: projected anatomy anchors, for labels that track the cat
    root.updateMatrixWorld(true);
    fr.anchors = {};
    for (const [k, v] of Object.entries(anchors)) {
      fr.anchors[k] = project(v.isObject3D ? v.getWorldPosition(new THREE.Vector3()) : v, camera);
    }
    if (cat) {
      meta.frames.push(fr);
    } else if (kit) {
      // Assemble: each primitive flies in on its own beat
      const span = shot.assemble ?? 0;
      for (const it of kit.items) {
        let p = 1;
        if (span > 0) p = THREE.MathUtils.clamp((tl - it.delay * 0.55) / 0.45, 0, 1);
        const e = easeOut(p);
        it.o.position.copy(it.rest).addScaledVector(it.dir, (1 - e) * 0.9);
        it.o.scale.setScalar(Math.max(0.001, e));
      }
      meta.frames.push(fr);
    } else if (mode === 'blend') {
      // Re-sculpt with every smooth-union fillet scaled toward its final width
      const s = shot.blendScales ? shot.blendScales[f] : tl;
      const scaleBlend = (list) => list.map((p) => ({ ...p, blend: (p.blend ?? 0) * s }));
      const L = A.landmarks, b = A.build;
      const body = sdf.sculptGeometry(sdf.compilePrims(scaleBlend(anat._bodyPrims(L, b))), 0.0085);
      const head = sdf.sculptGeometry(sdf.compilePrims(scaleBlend(anat._headPrims(b))), 0.005);
      scene.remove(root);
      if (blendGeo) { blendGeo.body.dispose(); blendGeo.head.dispose(); }
      blendGeo = { body, head };
      root = rawGroup(A, clayMat, blendGeo);
      scene.add(root);
      fr.blendScale = s;
      meta.frames.push(fr);
    } else {
      meta.frames.push(fr);
    }

    renderer.render(scene, camera);
    await postFrame(shot.name, f);
  }
  scene.remove(root);
  meta.ms = Math.round(performance.now() - ts);
  await fetch(`/meta?shot=${encodeURIComponent(shot.name)}`, { method: 'POST', body: JSON.stringify(meta) });
  await log(`shot ${shot.name}: ${frames} frames in ${meta.ms} ms` + (meta.stats ? ' ' + JSON.stringify(meta.stats) : ''));
}

await log(`job done in ${Math.round(performance.now() - t0)} ms`);
await fetch('/done', { method: 'POST', body: job.name || '' });
