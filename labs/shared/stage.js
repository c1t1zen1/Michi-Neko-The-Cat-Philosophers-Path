// Lab stage kit: renderer, many DOM elements drawn on one fixed canvas
// (Views), the frame loop, the fps meter and the quality governor.
import * as THREE from 'three';

export const Q = new URLSearchParams(location.search);
export const flag = (k, d = null) => (Q.has(k) ? Q.get(k) : d);
export const SHOT = Q.has('shot');
export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function gpuName(renderer) {
  try {
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (!dbg) return 'unknown GPU';
    const raw = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL));
    if (/swiftshader/i.test(raw)) return 'software renderer';
    // "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)" -> the model
    const inner = raw.replace(/^ANGLE \(/, '').replace(/\)$/, '').split(',');
    return (inner[1] || inner[0]).replace(/Direct3D\d*|OpenGL.*|vs_\d_\d|ps_\d_\d|\(0x[0-9a-f]+\)/gi, '').replace(/\s+/g, ' ').trim().slice(0, 40) || raw.slice(0, 40);
  } catch (e) { return 'unknown GPU'; }
}

export function createRenderer(canvas, { clear = 0xffffff, exposure = 1.1, shadows = false, maxPR = 1.75 } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: SHOT });
  } catch (e) {
    document.body.insertAdjacentHTML('afterbegin', '<p style="padding:40px;font:1.2rem Georgia">This page needs WebGL2 — your browser could not create a context.</p>');
    throw e;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, +flag('pr') || maxPR));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(clear, 1);
  if (shadows) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
  renderer.debug.onShaderError = (gl, prog, vs, fs) => {
    console.error('SHADER ERROR\n' + gl.getProgramInfoLog(prog) + '\nVS:' + gl.getShaderInfoLog(vs) + '\nFS:' + gl.getShaderInfoLog(fs));
  };
  addEventListener('resize', () => renderer.setSize(innerWidth, innerHeight, false));
  return { renderer, gpu: gpuName(renderer) };
}

export const inView = (r, margin = 0) => r.bottom > -margin && r.top < innerHeight + margin && r.right > 0 && r.left < innerWidth;

export function renderRect(renderer, rect, scene, camera) {
  const y = innerHeight - rect.bottom;
  renderer.setScissorTest(true);
  renderer.setViewport(rect.left, y, rect.width, rect.height);
  renderer.setScissor(rect.left, y, rect.width, rect.height);
  if (camera.isPerspectiveCamera) {
    const a = rect.width / Math.max(1, rect.height);
    if (Math.abs(camera.aspect - a) > 1e-4) { camera.aspect = a; camera.updateProjectionMatrix(); }
  }
  renderer.render(scene, camera);
}

// each side may carry a third element: a callback run right before it renders
export function renderSplit(renderer, rect, split, [sceneA, camA, prepA], [sceneB, camB, prepB]) {
  const y = innerHeight - rect.bottom;
  const sw = Math.round(rect.width * Math.min(1, Math.max(0, split)));
  renderer.setScissorTest(true);
  renderer.setViewport(rect.left, y, rect.width, rect.height);
  for (const [scene, cam, prep, x, w] of [[sceneA, camA, prepA, rect.left, sw], [sceneB, camB, prepB, rect.left + sw, rect.width - sw]]) {
    if (w <= 0) continue;
    renderer.setScissor(x, y, w, rect.height);
    const a = rect.width / Math.max(1, rect.height);
    if (cam.isPerspectiveCamera && Math.abs(cam.aspect - a) > 1e-4) { cam.aspect = a; cam.updateProjectionMatrix(); }
    prep?.();
    renderer.render(scene, cam);
  }
}

export class Views {
  constructor(renderer) {
    this.renderer = renderer;
    this.views = [];
    renderer.info.autoReset = false;
  }
  // render: optional (renderer, rect, view) replacing the default renderRect
  add(el, { scene, camera, update, build, render, margin = 500 }) {
    const v = { el, scene, camera, update, build, render, margin, built: !build, cpuMs: 0, stats: { calls: 0, tris: 0 } };
    this.views.push(v);
    return v;
  }
  remove(v) { const i = this.views.indexOf(v); if (i >= 0) this.views.splice(i, 1); }
  render(dt, t) {
    const r = this.renderer;
    r.setScissorTest(false);
    r.clear();
    const rects = this.views.map((v) => v.el.getBoundingClientRect());
    let lazy = null, best = Infinity;
    this.views.forEach((v, i) => {
      if (v.built || !inView(rects[i], v.margin)) return;
      const d = rects[i].top > innerHeight ? rects[i].top - innerHeight : rects[i].bottom < 0 ? -rects[i].bottom : 0;
      if (d < best) { best = d; lazy = v; }
    });
    if (lazy) { Object.assign(lazy, lazy.build()); lazy.built = true; }
    this.views.forEach((v, i) => {
      const rect = rects[i];
      if (!v.built || !v.scene || rect.width < 1 || !inView(rect, 0)) return;
      const t0 = performance.now();
      v.update?.(dt, t, rect, v);
      r.info.reset();
      if (v.render) v.render(r, rect, v); else renderRect(r, rect, v.scene, v.camera);
      v.stats.calls = r.info.render.calls;
      v.stats.tris = r.info.render.triangles;
      v.cpuMs += (performance.now() - t0 - v.cpuMs) * 0.08;
    });
  }
}

export class Loop {
  constructor(fn) { this.fn = fn; this.frames = 0; this.t = 0; this.last = performance.now(); }
  start() {
    const tick = (now) => {
      requestAnimationFrame(tick);
      if (document.hidden) { this.last = now; return; }
      const raw = (now - this.last) / 1000;
      this.last = now;
      const dt = Math.min(raw, 0.05);
      this.t += dt;
      this.fn(dt, this.t, raw);
      window.__frames = ++this.frames;
    };
    requestAnimationFrame(tick);
  }
}

export class Meter {
  constructor(el, gpu) { this.el = el; this.gpu = gpu; this.frameEma = 16; this.jsEma = 1; this.clock = 0; }
  tick(rawDt, jsMs, extra = '') {
    this.frameEma += (rawDt * 1000 - this.frameEma) * 0.05;
    this.jsEma += (jsMs - this.jsEma) * 0.05;
    this.clock += rawDt;
    if (this.clock < 0.5) return;
    this.clock = 0;
    this.el.textContent = `${Math.round(1000 / Math.max(this.frameEma, 1))} fps · ${this.jsEma.toFixed(1)} ms js/frame${extra ? ' · ' + extra : ''} · ${this.gpu}`;
  }
}

export class Governor {
  constructor({ onScale, onPixelRatio }) {
    this.onScale = onScale; this.onPixelRatio = onPixelRatio;
    this.enabled = !SHOT;
    this.scale = 1; this.pixelLowered = false;
    this.ema = 16; this.clock = 0; this.t = 0; this.lastChange = 0;
  }
  tick(dt, frameMs) {
    this.t += dt;
    this.ema += (frameMs - this.ema) * 0.05;
    if (!this.enabled) return;
    this.clock += dt;
    if (this.clock < 1.5) return;
    this.clock = 0;
    const set = (s) => { this.scale = s; this.lastChange = this.t; this.onScale(s); };
    if (this.ema > 30 && this.scale > 0.31) set(Math.max(0.3, this.scale * 0.78));
    else if (this.ema > 34 && this.scale <= 0.31 && !this.pixelLowered) { this.pixelLowered = true; this.lastChange = this.t; this.onPixelRatio(1); }
    else if (this.ema < 19 && this.scale < 1 && this.t - this.lastChange > 6) set(Math.min(1, this.scale * 1.2));
  }
}
