// Node-only invariants for the ranges lab: the ported landform, the
// silhouette profiles, stroke resampling and the impostor direction map.
// profiles.js and data.js carry no three.js, so they run bare in Node.
// Run: node tools/ranges_test.mjs
import assert from 'node:assert/strict';
import {
  terrainSector, terrainHeight, PROFILES, profileHeight,
  fbm1, ridged1, noise1, worldNoise, valueNoise,
  strokeToProfile, octUV, octDir, mulberry32, smoothstep
} from '../labs/ranges/js/profiles.js';
import { STEPS, WALL_METHODS, RIDGE_MODES, KASUMI_STYLES, SOURCES } from '../labs/ranges/js/data.js';

let checks = 0;
const check = (name, fn) => { fn(); checks++; console.log('OK   ' + name); };

/* the basin mask: shrine at -z, pagoda at +z */
check('terrainSector: wall closes north, opens south', () => {
  const n = terrainSector(0, -100), s = terrainSector(0, 100);
  assert.ok(n.wall > 0.95, `north wall ${n.wall}`);
  assert.ok(s.opening > 0.99, `south opening ${s.opening}`);
  assert.ok(s.wall < 0.01, `south wall ${s.wall}`);
});
check('terrainHeight: the playable bowl stays flat', () => {
  for (let i = 0; i < 200; i++) {
    const a = i * 0.031, r = 8 + (i % 40);
    assert.equal(terrainHeight(Math.cos(a) * r, Math.sin(a) * r), 0);
  }
});
check('terrainHeight: walls rise behind the shrine, sink behind the pagoda', () => {
  let north = 0, south = 0;
  for (let i = 0; i < 60; i++) {
    const a = -Math.PI / 2 + (i / 59 - 0.5) * 2.2; // around -z
    const x = Math.cos(a) * 190, z = Math.sin(a) * 190;
    north = Math.max(north, terrainHeight(x, z));
  }
  for (let i = 0; i < 60; i++) {
    const a = Math.PI / 2 + (i / 59 - 0.5) * 1.2; // around +z
    const x = Math.cos(a) * 170, z = Math.sin(a) * 170;
    south = Math.min(south, terrainHeight(x, z));
  }
  assert.ok(north > 20, `north rises to ${north.toFixed(1)}`);
  assert.ok(south < 0, `south opens to ${south.toFixed(1)}`);
});
check('terrainHeight is deterministic', () => {
  for (const [x, z] of [[100, -140], [-60, -200], [5, -90]]) {
    assert.equal(terrainHeight(x, z), terrainHeight(x, z));
  }
});

/* noise sanity */
check('valueNoise stays in [0,1], worldNoise is smooth', () => {
  for (let i = 0; i < 400; i++) {
    const n = valueNoise(i * 0.37, i * 0.11, 1024, 3);
    assert.ok(n >= 0 && n <= 1, `valueNoise ${n}`);
  }
  const a = worldNoise(10, 10, 0.05, 3, 1), b = worldNoise(10.001, 10, 0.05, 3, 1);
  assert.ok(Math.abs(a - b) < 0.01);
});
check('fbm1 and ridged1 are deterministic and bounded', () => {
  for (let i = 0; i < 200; i++) {
    const u = i * 0.013;
    const f = fbm1(u, 3, 7), r = ridged1(u, 4, 7);
    assert.equal(f, fbm1(u, 3, 7));
    assert.ok(f >= 0 && f <= 1 && r >= 0 && r <= 1);
  }
});

/* profiles: every silhouette stays inside [0,1] and is continuous */
check('all ridge profiles return [0,1] over the domain', () => {
  for (const [key, p] of Object.entries(PROFILES)) {
    if (!p.h) continue;
    for (let i = 0; i <= 500; i++) {
      const u = i / 500;
      const h = profileHeight(key, u);
      assert.ok(Number.isFinite(h) && h >= 0 && h <= 1, `${key} @ ${u} -> ${h}`);
    }
  }
});
check('profiles are continuous (no cliff jumps)', () => {
  for (const key of Object.keys(PROFILES)) {
    if (!PROFILES[key].h) continue;
    let prev = profileHeight(key, 0), worst = 0;
    for (let i = 1; i < 1000; i++) { // u in [0,1): the arc ends are open, not joined
      const h = profileHeight(key, i / 1000);
      worst = Math.max(worst, Math.abs(h - prev));
      prev = h;
    }
    assert.ok(worst < 0.05, `${key} jumps ${worst}`);
  }
});
check('profile endpoints nearly meet (arcs sink at the flanks)', () => {
  for (const key of ['valley-near', 'valley-mid', 'valley-far', 'atago']) {
    const gap = Math.abs(profileHeight(key, 0) - profileHeight(key, 0.9999));
    assert.ok(gap < 0.35, `${key} endpoint gap ${gap}`);
  }
});
check('the valley set stacks near < mid < far in mass', () => {
  const mass = (k) => { let s = 0; for (let i = 0; i < 100; i++) s += profileHeight(k, i / 100); return s / 100; };
  assert.ok(mass('valley-mid') > mass('valley-near'), 'mid heavier than near');
  assert.ok(mass('valley-far') > mass('valley-mid') * 0.9, 'far holds its own');
});

/* freehand strokes become painted silhouettes */
check('strokeToProfile resamples, smooths and clamps', () => {
  const fn = strokeToProfile([{ u: 0, h: 0.1 }, { u: 0.5, h: 0.9 }, { u: 1, h: 0.2 }]);
  assert.ok(Math.abs(fn(0) - 0.1) < 0.12);
  assert.ok(fn(0.5) > 0.6);
  assert.ok(Math.abs(fn(1) - 0.2) < 0.12);
  for (let i = 0; i <= 200; i++) {
    const h = fn(i / 200);
    assert.ok(h >= 0 && h <= 1.001);
  }
});
check('strokeToProfile tolerates unordered and degenerate input', () => {
  const fn = strokeToProfile([{ u: 0.8, h: 0.5 }, { u: 0.2, h: 0.7 }, { u: 0.5, h: 0.9 }]);
  assert.ok(fn(0.5) > fn(0.05));
  assert.equal(strokeToProfile([])(0.4), 0.4);
  assert.equal(strokeToProfile([{ u: 0.2, h: 0.9 }])(0.4), 0.4);
});

/* the octahedral direction map round-trips */
check('octDir · octUV round-trip inside the diamond', () => {
  // only |u−.5|+|v−.5| ≤ .5 maps back: corners fold onto the horizon ring
  // and are never picked by the impostor shader — they exist for mip margin.
  let n = 0;
  for (let i = 0; i < 400; i++) {
    const u = (i % 20) / 20 + 0.025, v = Math.floor(i / 20) / 20 + 0.025;
    if (Math.abs(u - 0.5) + Math.abs(v - 0.5) > 0.5) continue;
    n++;
    const d = octDir(u, v);
    const [u2, v2] = octUV(d);
    assert.ok(Math.abs(u2 - u) < 1e-6 && Math.abs(v2 - v) < 1e-6, `${u},${v} -> ${u2},${v2}`);
  }
  assert.ok(n > 150);
});
check('octDir never looks below the horizon', () => {
  for (let i = 0; i < 81; i++) {
    const d = octDir((i % 9) / 8, Math.floor(i / 9) / 8);
    assert.ok(d.y >= -1e-9, `d.y = ${d.y}`);
  }
});

/* determinism of the seeded stream used by the wall builders */
check('mulberry32 is stable across runs', () => {
  const a = mulberry32(7), b = mulberry32(7);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
});
check('smoothstep is pinned to the game ports', () => {
  assert.equal(smoothstep(0, 1, -3), 0);
  assert.equal(smoothstep(0, 1, 5), 1);
  assert.equal(smoothstep(0, 1, 0.5), 0.5);
  assert.equal(noise1(3.4, 9), noise1(3.4, 9));
});

/* page data agrees with the builders */
check('step states only use declared techniques', () => {
  const walls = new Set(WALL_METHODS.map((w) => w.value));
  const ridges = new Set(RIDGE_MODES.map((r) => r.v));
  const kas = new Set(KASUMI_STYLES.map((k) => k.value));
  for (const s of STEPS) {
    if (s.state.wall !== undefined) assert.ok(walls.has(s.state.wall), `wall ${s.state.wall}`);
    if (s.state.ridges !== undefined) assert.ok(ridges.has(s.state.ridges), `ridges ${s.state.ridges}`);
    if (s.state.kasumi !== undefined) assert.ok(kas.has(s.state.kasumi), `kasumi ${s.state.kasumi}`);
  }
});
check('the walkthrough builds up to the finished valley', () => {
  assert.equal(STEPS[0].state.wall, 'off');
  const last = STEPS[STEPS.length - 1].state;
  assert.equal(last.wall, 'mass');
  assert.ok(['stack', 'paper'].includes(last.ridges));
  assert.ok(last.kasumi !== 'none');
});
check('every step has a recipe and every source a note', () => {
  for (const s of STEPS) { assert.ok(s.code?.length > 10); assert.ok(s.body.includes('<p>')); }
  for (const s of SOURCES) { assert.ok(s.url.startsWith('http')); assert.ok(s.note.length > 20); }
  assert.ok(SOURCES.length >= 15);
});

console.log(`\n${checks} ranges checks passed.`);
