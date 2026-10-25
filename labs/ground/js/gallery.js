// "Eight Kyoto grounds": lazy 2 x 2 m slabs, each the same shader with its own
// recipe, an earth-cut skirt, and a card underneath.
import * as THREE from 'three';
import { LightRig } from '../../shared/light.js';
import { Terrain } from './terrain.js';
import { createGroundMaterial } from './material.js';
import { SteppingStones, makeRock } from './stones.js';
import { EaveDrips } from './weather.js';
import { RECIPES, texReads } from './recipes.js';

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const BANDS = [[0.0, [0.2, 0.14, 0.09]], [-0.05, [0.4, 0.29, 0.2]], [-0.2, [0.6, 0.45, 0.32]], [-0.38, [0.48, 0.46, 0.45]]];

function skirt(t) {
  const N = 48, bottom = -0.5, pos = [], col = [], h = t.size / 2;
  const edge = (i, e) => { const s = (i / N - 0.5) * t.size; return e === 0 ? [s, -h] : e === 1 ? [h, s] : e === 2 ? [-s, h] : [-h, -s]; };
  for (let e = 0; e < 4; e++) for (let i = 0; i < N; i++) {
    const [ax, az] = edge(i, e), [bx, bz] = edge(i + 1, e), ha = t.groundAt(ax, az), hb = t.groundAt(bx, bz);
    for (let b = 0; b < BANDS.length; b++) {
      const lo = b + 1 < BANDS.length ? BANDS[b + 1][0] : bottom, c = BANDS[b][1];
      const ta = b === 0 ? ha : Math.min(BANDS[b][0], ha), tb = b === 0 ? hb : Math.min(BANDS[b][0], hb);
      const la = Math.min(lo, ha), lb = Math.min(lo, hb);
      pos.push(ax, ta, az, bx, tb, bz, bx, lb, bz, ax, ta, az, bx, lb, bz, ax, la, az);
      for (let k = 0; k < 6; k++) col.push(c[0] * (0.92 + 0.08 * ((i + b) % 2)), c[1], c[2]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }));
}

export function buildGallery({ mount, views, weather, getHour, layers, gameTex, onPlant, rigStage }) {
  mount.innerHTML = RECIPES.map((r, i) => `<article class="tile" id="g-${r.id}" data-i="${i}">
    <div class="view" role="button" tabindex="0" aria-label="Plant ${esc(r.name)} on the stage"></div>
    <h3 class="name">${r.name} <span class="jp">${r.jp}</span></h3>
    <p class="tag"><i>${r.romaji}</i> · ${r.tag}</p>
    <p class="blurb">${esc(r.blurb)}</p>
    <dl class="stats"><div><dd class="s-tris">–</dd><dt>tris</dt></div><div><dd class="s-calls">–</dd><dt>draws</dt></div><div><dd class="s-cpu">–</dd><dt>ms cpu</dt></div><div><dd>≈ ${texReads(r)}</dd><dt>texture reads / px</dt></div></dl>
    <p class="stats2">built in <span class="s-build">–</span> ms</p>
    <details><summary>How it’s made</summary>
      <ul class="how">${r.how.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
      <pre class="code"><code>${esc(r.code)}</code></pre>
      <p class="use"><b>Use it for</b> ${esc(r.use)}</p>
      <ul class="srcs">${r.sources.map(([l, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(l)}</a></li>`).join('')}</ul>
    </details></article>`).join('');
  const out = [];
  mount.querySelectorAll('.tile').forEach((card) => {
    const r = RECIPES[+card.dataset.i], el = card.querySelector('.view'), info = { card, r, built: 0 };
    let hover = 0, hoverT = 0;
    el.addEventListener('pointerenter', () => { hoverT = 1; });
    el.addEventListener('pointerleave', () => { hoverT = 0; });
    const go = () => onPlant(r.id);
    el.addEventListener('click', go);
    card.querySelector('.name').addEventListener('click', go);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    info.view = views.add(el, {
      build() {
        const t0 = performance.now();
        const scene = new THREE.Scene();
        const rig = new LightRig(scene, { hour: getHour(), sky: false, fog: false, shadows: false, background: false });
        const t = new Terrain({ size: 2, res: 96, hres: 49, seg: 64 });
        t.weather = weather;
        const mat = createGroundMaterial(t, { layers, rig, gameTex });
        t.mesh.material = mat; t.mesh.receiveShadow = false;
        const stones = new SteppingStones(t, scene);
        let eave = null;
        const u = mat.userData.u;
        const env = {
          stones, setCobble: (v) => { u.uCobble.value = v; }, tint: (c) => u.uTint.value.set(...c),
          rock: (x, z, rad) => { const m = makeRock(rad); m.position.set(x, t.groundAt(x, z) + rad * 0.05, z); t.props.add(m); },
          wall: (wallZ, drip) => {
            const wall = new THREE.Mesh(new THREE.BoxGeometry(2, 1.0, 0.16), new THREE.MeshStandardMaterial({ color: 0xe6dcc3, roughness: 0.95 }));
            wall.position.set(0, 0.5, wallZ); wall.castShadow = false;
            const roof = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.06, drip - wallZ + 0.1), new THREE.MeshStandardMaterial({ color: 0x3f444b, roughness: 0.7 }));
            roof.position.set(0, 0.97, (drip + wallZ - 0.1) / 2);
            t.props.add(wall, roof);
          },
          eave: (o) => { eave = new EaveDrips(mat, null, { ...o, y: 0.97 }); scene.add(eave.mesh); }
        };
        r.paint(t, env);
        t.flush();
        const sk = skirt(t), group = new THREE.Group();
        group.add(t.group, sk);
        scene.add(group);
        const cam = new THREE.OrthographicCamera(-1.65, 1.65, 1.65, -1.65, 0.1, 60);
        const az = Math.PI / 4, el = 0.58;
        cam.position.set(Math.cos(az) * Math.cos(el) * 20, Math.sin(el) * 20, Math.sin(az) * Math.cos(el) * 20);
        cam.lookAt(0, -0.1, 0);
        info.built = performance.now() - t0;
        card.querySelector('.s-build').textContent = info.built.toFixed(0);
        info.mat = mat;
        return {
          scene, camera: cam,
          update(dt, time) {
            hover += (hoverT - hover) * Math.min(1, dt * 8);
            group.position.y = hover * 0.08;
            if (rig.hour !== getHour()) rig.setHour(getHour());
            weather.bind(mat, t, time);
            u.uSunCol.value.copy(rig.sun.color).multiplyScalar(rig.sun.intensity * 0.4);
            stones.setWet(weather.wet);
            if (eave) eave.update(time, weather.rain);
            t.flush();
          }
        };
      }
    });
    info.tris = 8192;
    out.push(info);
  });
  return {
    tiles: out,
    refreshStats() {
      for (const o of out) {
        if (!o.view.built) continue;
        const c = o.card;
        c.querySelector('.s-tris').textContent = o.view.stats.tris;
        c.querySelector('.s-calls').textContent = o.view.stats.calls;
        c.querySelector('.s-cpu').textContent = o.view.cpuMs.toFixed(2);
      }
    }
  };
}
