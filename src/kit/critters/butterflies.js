// The valley butterflies: ONE InstancedMesh for the whole swarm (a single draw),
// each butterfly a body and a hinged pair of painted wings. The flap is in the
// vertex shader (per-instance phase), the drift is the classic one (same seeds,
// same arithmetic) run on the CPU into the instance matrices. The swarm fades
// in by day and out at night/rain by scaling, like the classic opacity fade.
import * as THREE from 'three';
import { TAU, rng as seeded, canvas2d, canvasTexture } from '../craft.js?v=20261113a';

const _cache = new WeakMap();

/** One right wing (fore + hind, swallowtail) tinted per instance; the top-left texel is the opaque body colour. */
function wingTexture() {
  const [c, x] = canvas2d(128, 128), r = seeded(7);
  x.clearRect(0, 0, 128, 128);
  x.fillStyle = '#2a211a'; x.fillRect(0, 0, 6, 6); // body texel
  const fore = () => { x.beginPath(); x.moveTo(6, 56); x.quadraticCurveTo(14, 8, 92, 6); x.quadraticCurveTo(124, 30, 104, 60); x.quadraticCurveTo(60, 66, 6, 56); x.closePath(); };
  const hind = () => { x.beginPath(); x.moveTo(6, 62); x.quadraticCurveTo(70, 66, 100, 72); x.quadraticCurveTo(110, 100, 84, 112); x.lineTo(78, 126); x.lineTo(68, 108); x.quadraticCurveTo(24, 112, 6, 62); x.closePath(); };
  x.fillStyle = '#f4e3b8'; fore(); x.fill(); hind(); x.fill();
  for (const shape of [fore, hind]) {
    x.save(); shape(); x.clip();
    x.strokeStyle = 'rgba(40,28,20,.8)'; x.lineWidth = 2.2;
    for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(6, 58); x.quadraticCurveTo(46 + i * 8, 40 + i * 8, 104 - i * 3, 14 + i * 20); x.stroke(); }
    x.restore();
    x.strokeStyle = 'rgba(30,20,15,.95)'; x.lineWidth = 5; shape(); x.stroke(); // dark margin
  }
  x.fillStyle = 'rgba(30,20,15,.9)'; x.fillRect(100, 0, 28, 64); // dark apical band
  x.fillStyle = 'rgba(255,245,215,.9)'; for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(110, 14 + i * 10 + r() * 2, 2.6, 0, TAU); x.fill(); }
  x.fillStyle = 'rgba(70,120,200,.85)'; for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(86 - i * 8, 96 - i * 3, 3.2, 0, TAU); x.fill(); } // blue hindwing lunules
  return canvasTexture(c);
}

function geometry(tier, W) {
  const nx = tier === 'far' ? 1 : tier === 'mid' ? 2 : 4;
  const wing = (side) => {
    const g = new THREE.PlaneGeometry(W, W * 1.15, nx, 1).rotateX(-Math.PI / 2).translate(W / 2, 0, 0.0);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      p.setY(i, x * 0.14);                      // a slight dihedral at rest
      uv.setXY(i, 0.02 + (x / W) * 0.96, uv.getY(i)); // right wing of the canvas, y top→bottom = fore→hind (z)
    }
    if (side < 0) { for (let i = 0; i < p.count; i++) p.setX(i, -p.getX(i)); const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const a = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = a; } }
    return g;
  };
  const list = [wing(1), wing(-1)];
  if (tier !== 'far') {
    const b = new THREE.CylinderGeometry(0.006, 0.004, W * 0.9, 5).rotateX(Math.PI / 2);
    const uv = b.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.01, 0.99); // the opaque body texel
    list.push(b);
  }
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const merged = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uvs = new Float32Array(n * 2), idx = [];
  let o = 0;
  for (const g of list) {
    g.computeVertexNormals();
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); uvs.set(g.attributes.uv.array, o * 2);
    for (const i of g.index.array) idx.push(i + o);
    o += g.attributes.position.count; g.dispose();
  }
  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3)); merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  merged.setIndex(idx);
  return merged;
}

export function buildButterflies(ctx, layout, p) {
  const { tier, kitMaterials: km } = ctx;
  if (!_cache.has(km)) _cache.set(km, { tex: null });
  const S = _cache.get(km);
  const W = 0.1 * p.size;
  const geo = geometry(tier, W); // one swarm: this mesh owns its geometry (the per-instance phase lives on it)
  const tex = (S.tex ||= wingTexture());
  const n = layout.count;
  const u = { uT: { value: 0 }, uRate: { value: p.flutter } };
  const mat = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.45, side: THREE.DoubleSide, name: 'critters:butterfly@' + p.flutter });
  mat.onBeforeCompile = (s) => {
    s.uniforms.uT = u.uT; s.uniforms.uRate = u.uRate;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aPhase; uniform float uT; uniform float uRate;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float fl = pow(abs(sin(uT * uRate + aPhase)), 0.7);
        float a = sign(position.x) * mix(-0.25, 1.0, fl);
        float ca = cos(a), sa = sin(a);
        transformed = vec3(position.x * ca - position.y * sa, position.x * sa + position.y * ca, position.z);`);
    s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * 0.35; // thin wings glow with the light through them');
  };
  mat.customProgramCacheKey = () => 'critters-butterfly';
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  mesh.name = 'swarm'; mesh.frustumCulled = false; mesh.castShadow = false;
  const phase = new Float32Array(n), r = ctx.rng, c = new THREE.Color();
  const state = new Float32Array(layout.positions); // own copy of the spawn positions
  for (let i = 0; i < n; i++) {
    phase[i] = r() * TAU;
    c.setRGB(layout.colors[i * 3], layout.colors[i * 3 + 1], layout.colors[i * 3 + 2]);
    mesh.setColorAt(i, c);
  }
  geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));

  const group = new THREE.Group(); group.add(mesh);
  const dummy = new THREE.Object3D(), yaw = new Float32Array(n);
  let fade = 0;
  const seeds = layout.seeds;
  const place = (i, x, y, z, t, seed, f) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(Math.sin(t * 1.4 + seed) * 0.12, yaw[i], 0);
    dummy.scale.setScalar(Math.max(0.001, f));
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  };
  const update = (dt, t) => {
    u.uT.value = t;
    const sky = layout.sky, pp = layout.playerPos;
    const sunUp = sky ? Math.max(0, sky.sunDir.y) : 1;
    const day = sunUp > 0.2 && !(sky && sky.weather === 'rain');
    fade += ((day ? 1 : 0) - fade) * Math.min(1, dt * 2);
    mesh.visible = fade > 0.02;
    if (!mesh.visible) return;
    for (let i = 0; i < n; i++) {
      const seed = seeds[i * 3], speed = seeds[i * 3 + 1], height = seeds[i * 3 + 2];
      const dx = Math.sin(t * speed + seed) * dt * 0.4 + Math.cos(t * 0.7 + seed) * dt * 0.15;
      const dz = Math.cos(t * speed * 0.8 + seed * 1.3) * dt * 0.4;
      let x = state[i * 3] + dx, z = state[i * 3 + 2] + dz;
      const y = 0.6 + height + Math.sin(t * 1.4 + seed) * 0.25;
      if (pp && Math.abs(x - pp.x) > 40) x = pp.x + (r() - 0.5) * 30;
      if (pp && Math.abs(z - pp.z) > 40) z = pp.z + (r() - 0.5) * 30;
      state[i * 3] = x; state[i * 3 + 1] = y; state[i * 3 + 2] = z;
      if (dt > 0) { const want = Math.atan2(dx, dz); let d = want - yaw[i]; d -= TAU * Math.round(d / TAU); yaw[i] += d * Math.min(1, dt * 3); }
      place(i, x, y, z, t, seed, fade);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  for (let i = 0; i < n; i++) place(i, state[i * 3], 0.6 + seeds[i * 3 + 2], state[i * 3 + 2], 0, seeds[i * 3], 1); // the resting pose (contract hash, first frame)
  return { group, parts: { swarm: mesh }, sockets: {}, live: [mesh], update, dispose() { geo.dispose(); mat.dispose(); } };
}
