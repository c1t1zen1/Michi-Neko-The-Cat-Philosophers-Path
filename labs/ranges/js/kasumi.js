// Kasumi 霞 — mist bands that divide foreground, middle ground and
// background, in the three documented styles: Heian's soft transparent
// indigo, Kamakura-onward suyari-gasumi (crisp rounded "spear heads"),
// and the Edo gold (kinji) of the Rakuchū rakugai-zu screens.
import * as THREE from 'three';

const tex = (canvas) => {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

/** Soft Heian band: amorphous, transparent, lightly indigo. */
export function heianBand({ width = 200, height = 12 } = {}) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 64;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, 'rgba(176, 192, 214, 0)');
  g.addColorStop(0.38, 'rgba(182, 196, 218, 0.34)');
  g.addColorStop(0.62, 'rgba(188, 200, 220, 0.4)');
  g.addColorStop(1, 'rgba(176, 192, 214, 0)');
  x.fillStyle = g; x.fillRect(0, 0, 512, 64);
  // slow horizontal streaks inside, still soft
  let s = 31;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 26; i++) {
    const y = 18 + rnd() * 28, w = 40 + rnd() * 130, a = 0.05 + rnd() * 0.12;
    const gx = rnd() * 512;
    const lg = x.createLinearGradient(gx - w, 0, gx + w, 0);
    lg.addColorStop(0, 'rgba(200, 210, 228, 0)');
    lg.addColorStop(0.5, `rgba(205, 215, 232, ${a})`);
    lg.addColorStop(1, 'rgba(200, 210, 228, 0)');
    x.fillStyle = lg;
    x.fillRect(gx - w, y - 3 - rnd() * 5, w * 2, 6 + rnd() * 10);
  }
  const t = tex(c);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false })
  );
  return { mesh: m, tex: t };
}

/** Suyari-gasumi: a straight base with cleanly rounded spear-heads rising. */
export function suyariBand({ width = 200, height = 14, lobes = 9, tint = '228, 236, 246' } = {}) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const x = c.getContext('2d');
  let s = 77;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  // base band along the bottom
  x.fillStyle = `rgba(${tint}, 0.86)`;
  x.fillRect(0, 62, 512, 34);
  // spear heads: rounded lobes of varying height along the band
  const heads = [];
  for (let i = 0; i < lobes; i++) {
    const hx = (i + 0.4 + rnd() * 0.4) * (512 / lobes);
    const hw = 20 + rnd() * 26;
    const hh = 26 + rnd() * 44;
    heads.push([hx, hw, hh]);
  }
  for (const [hx, hw, hh] of heads) {
    // faint indigo shadow under the crisp head
    const sg = x.createRadialGradient(hx, 62, hw * 0.2, hx, 62, hw * 1.6);
    sg.addColorStop(0, 'rgba(140, 160, 190, 0.30)');
    sg.addColorStop(1, 'rgba(140, 160, 190, 0)');
    x.fillStyle = sg;
    x.beginPath(); x.ellipse(hx, 62, hw * 1.6, 10, 0, 0, Math.PI * 2); x.fill();
    // the head itself: hard-edged, rounded top
    const hg = x.createLinearGradient(0, 62 - hh, 0, 96);
    hg.addColorStop(0, `rgba(${tint}, 0.94)`);
    hg.addColorStop(0.75, `rgba(${tint}, 0.9)`);
    hg.addColorStop(1, 'rgba(216, 226, 240, 0.86)');
    x.fillStyle = hg;
    x.beginPath();
    x.moveTo(hx - hw, 96);
    x.lineTo(hx - hw, 62);
    x.quadraticCurveTo(hx - hw, 62 - hh, hx, 62 - hh);
    x.quadraticCurveTo(hx + hw, 62 - hh, hx + hw, 62);
    x.lineTo(hx + hw, 96);
    x.closePath(); x.fill();
  }
  const t = tex(c);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false })
  );
  return { mesh: m, tex: t };
}

/** Edo gold band (kinji): opaque gilded mist with a scalloped top. */
export function edoBand({ width = 200, height = 16, lobes = 7 } = {}) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const x = c.getContext('2d');
  let s = 5;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const gold = (l) => `rgb(${196 + l * 40 | 0}, ${156 + l * 42 | 0}, ${88 + l * 44 | 0})`;
  // opaque gold field with a scalloped upper edge
  x.fillStyle = gold(0.42);
  x.beginPath();
  x.moveTo(0, 96); x.lineTo(0, 58);
  const step = 512 / lobes;
  for (let i = 0; i < lobes; i++) {
    const x0 = i * step, x1 = (i + 1) * step, top = 44 - (i % 2 ? 10 : 0) - rnd() * 8;
    x.quadraticCurveTo(x0 + step * 0.25, top, x0 + step * 0.5, top + 6);
    x.quadraticCurveTo(x0 + step * 0.75, top + 12, x1, 58 - rnd() * 8);
  }
  x.lineTo(512, 96); x.closePath(); x.fill();
  // gold-leaf sparkle: square-cut flecks like the screens' kirikane
  for (let i = 0; i < 160; i++) {
    const px = rnd() * 512, py = 46 + rnd() * 46;
    x.fillStyle = `rgba(${230 + rnd() * 25 | 0}, ${200 + rnd() * 40 | 0}, ${130 + rnd() * 50 | 0}, ${0.16 + rnd() * 0.3})`;
    x.fillRect(px, py, 1.5 + rnd() * 3, 1 + rnd() * 2.5);
  }
  // shaded belly under the lobes
  const bg = x.createLinearGradient(0, 62, 0, 96);
  bg.addColorStop(0, 'rgba(120, 88, 44, 0)');
  bg.addColorStop(1, 'rgba(120, 88, 44, 0.28)');
  x.fillStyle = bg; x.fillRect(0, 62, 512, 34);
  const t = tex(c);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false })
  );
  return { mesh: m, tex: t };
}

export const KASUMI = {
  heian: { jp: '平安霞', label: 'Heian soft', make: heianBand },
  suyari: { jp: 'すやり霞', label: 'Suyari crisp', make: suyariBand },
  edo: { jp: '金地雲', label: 'Edo gold', make: edoBand }
};

/** A set of bands for the bench: style key → group of drifting bands. */
export function kasumiGroup(style, layers) {
  const g = new THREE.Group();
  const bands = [];
  for (const [i, L] of layers.entries()) {
    const { mesh, tex } = KASUMI[style].make(L);
    mesh.position.set(L.x || 0, L.y, L.z);
    if (L.bearing !== undefined) mesh.rotation.y = L.bearing;
    mesh.renderOrder = 4 + i;
    g.add(mesh);
    bands.push({ mesh, tex, speed: L.speed || 0.004 });
  }
  return {
    group: g,
    update(dt) { for (const b of bands) b.tex.offset.x += b.speed * dt; }
  };
}
