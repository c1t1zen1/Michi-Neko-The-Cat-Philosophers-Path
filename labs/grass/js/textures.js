// Procedural canvas textures for the Grass Lab: all painted at load time
// (256px or smaller), nothing to download.
import * as THREE from 'three';
import { mulberry32 } from './kit.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function tex(c, { repeat = false, srgb = true, mips = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  t.generateMipmaps = mips;
  t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  return t;
}

/** A painted tuft of ~16 curved blades, root-dark to tip-light, alpha cut-out */
export function tuftTexture(seed = 5) {
  const [c, g] = canvas(256, 256);
  const r = mulberry32(seed);
  g.clearRect(0, 0, 256, 256);
  const blades = 17;
  for (let i = 0; i < blades; i++) {
    const x0 = 128 + (r() - 0.5) * 104;
    const lean = (r() - 0.5) * 120 + (x0 - 128) * 0.7;
    const hgt = 130 + r() * 118;
    const w = 7 + r() * 8;
    const tipX = x0 + lean;
    const tipY = 256 - hgt;
    const midX = x0 + lean * 0.25;
    const midY = 256 - hgt * 0.55;
    const grad = g.createLinearGradient(0, 256, 0, tipY);
    const hue = 88 + r() * 26;
    grad.addColorStop(0, `hsl(${hue + 8},48%,20%)`);
    grad.addColorStop(0.45, `hsl(${hue},52%,34%)`);
    grad.addColorStop(1, `hsl(${hue - 14},62%,${58 + r() * 12}%)`);
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(x0 - w, 258);
    g.quadraticCurveTo(midX - w * 0.55, midY, tipX, tipY);
    g.quadraticCurveTo(midX + w * 0.55, midY, x0 + w, 258);
    g.closePath();
    g.fill();
    // centre vein
    g.strokeStyle = 'rgba(255,255,210,0.14)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(x0, 256);
    g.quadraticCurveTo(midX, midY, tipX, tipY + 8);
    g.stroke();
  }
  return tex(c);
}

/** 2x2 atlas: daisy, buttercup, cosmos, bellflower (transparent background) */
export function flowerAtlas() {
  const [c, g] = canvas(256, 256);
  g.clearRect(0, 0, 256, 256);
  const petals = (cx, cy, n, len, wid, col, col2, centre, centreR) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      g.save();
      g.translate(cx, cy);
      g.rotate(a);
      const gr = g.createLinearGradient(0, 0, 0, -len);
      gr.addColorStop(0, col2); gr.addColorStop(1, col);
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(wid, -len * 0.55, 0, -len);
      g.quadraticCurveTo(-wid, -len * 0.55, 0, 0);
      g.fill();
      g.restore();
    }
    const cg = g.createRadialGradient(cx, cy, 0, cx, cy, centreR);
    cg.addColorStop(0, centre[0]); cg.addColorStop(1, centre[1]);
    g.fillStyle = cg;
    g.beginPath(); g.arc(cx, cy, centreR, 0, Math.PI * 2); g.fill();
  };
  // daisy
  petals(64, 64, 15, 52, 9, '#ffffff', '#f2eddc', ['#ffd24a', '#e8a21c'], 12);
  // buttercup
  petals(192, 64, 5, 40, 24, '#ffe14d', '#f2b705', ['#ffe9a0', '#f0b400'], 8);
  // cosmos
  petals(64, 192, 8, 50, 21, '#ff8fb8', '#d94f86', ['#ffd54a', '#e0951b'], 9);
  // bellflower: five blunt violet petals
  petals(192, 192, 5, 44, 26, '#a98cf2', '#6b4fc8', ['#f3e9ff', '#c9b8ff'], 8);
  return tex(c);
}

/** Earth strata painted for the sides of a patch (grass lip, loam, clay, stones) */
export function soilSideTexture(seed = 11) {
  const [c, g] = canvas(256, 128);
  const r = mulberry32(seed);
  const bands = [
    [0, 0.16, '#3a5a26'], [0.16, 0.42, '#4a3524'], [0.42, 0.72, '#6a4c33'], [0.72, 1.0, '#7d6a52']
  ];
  for (const [a, b, col] of bands) {
    g.fillStyle = col;
    g.fillRect(0, a * 128, 256, (b - a) * 128 + 1);
  }
  // wobbling band edges and root hairs
  for (let x = 0; x < 256; x += 2) {
    const wob = Math.sin(x * 0.07) * 3 + Math.sin(x * 0.21) * 1.6;
    g.fillStyle = '#4c7a2f';
    g.fillRect(x, 0, 2, 20 + wob);
    if (r() < 0.35) {
      g.fillStyle = 'rgba(90,150,60,0.8)';
      g.fillRect(x, 20 + wob, 1.5, 5 + r() * 12);
    }
  }
  for (let i = 0; i < 900; i++) {
    const y = 20 + r() * 108;
    const l = y / 128;
    g.fillStyle = `rgba(${l < 0.5 ? '30,20,12' : '255,240,210'},${0.05 + r() * 0.12})`;
    g.fillRect(r() * 256, y, 1 + r() * 3, 1 + r() * 2);
  }
  for (let i = 0; i < 16; i++) {
    const x = r() * 256, y = 55 + r() * 65, rad = 2 + r() * 5;
    const grd = g.createRadialGradient(x - 1, y - 1, 0, x, y, rad);
    grd.addColorStop(0, '#b9ada0'); grd.addColorStop(1, '#6d6258');
    g.fillStyle = grd;
    g.beginPath(); g.ellipse(x, y, rad * 1.2, rad, 0, 0, Math.PI * 2); g.fill();
  }
  return tex(c, { repeat: true });
}

/** Mottled ground under the blades; tinted per type with the material colour */
export function groundTexture(seed = 3) {
  const [c, g] = canvas(128, 128);
  const r = mulberry32(seed);
  g.fillStyle = '#7a8466';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1400; i++) {
    const l = 80 + r() * 90;
    g.fillStyle = `rgba(${l},${l + 10},${l - 10},${0.06 + r() * 0.12})`;
    const s = 2 + r() * 7;
    g.fillRect(r() * 128, r() * 128, s, s * (0.5 + r()));
  }
  return tex(c, { repeat: true });
}

/** Soft radial shadow under the floating patches */
export function blobTexture() {
  const [c, g] = canvas(128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(40,52,38,0.42)');
  gr.addColorStop(0.55, 'rgba(40,52,38,0.16)');
  gr.addColorStop(1, 'rgba(40,52,38,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return tex(c, { mips: false });
}

/** Striped yarn ball for the wanderer that tests the physics in each cube */
export function yarnTexture() {
  const [c, g] = canvas(128, 64);
  g.fillStyle = '#e46a52';
  g.fillRect(0, 0, 128, 64);
  g.strokeStyle = 'rgba(255,225,200,0.55)';
  g.lineWidth = 2;
  for (let i = -4; i < 24; i++) {
    g.beginPath();
    g.moveTo(i * 8, 0); g.bezierCurveTo(i * 8 + 18, 20, i * 8 - 14, 44, i * 8 + 6, 64);
    g.stroke();
  }
  g.strokeStyle = 'rgba(150,40,30,0.4)';
  for (let i = 0; i < 18; i++) {
    g.beginPath();
    g.moveTo(0, i * 4 + 2); g.bezierCurveTo(40, i * 4 - 6, 80, i * 4 + 10, 128, i * 4 + 2);
    g.stroke();
  }
  return tex(c, { repeat: true });
}

/** Rice-paper ground for the sumi-e grass */
export function paperTexture() {
  const [c, g] = canvas(128, 128);
  const r = mulberry32(21);
  g.fillStyle = '#f2ecdc';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = `rgba(${150 + r() * 80},${140 + r() * 70},${110 + r() * 60},${0.04 + r() * 0.08})`;
    g.fillRect(r() * 128, r() * 128, 1 + r() * 5, 1 + r() * 1.4);
  }
  return tex(c, { repeat: true });
}
