// Node checks for the distant-life benches' pure data. Run: node labs/ranges/test_life.mjs
import assert from 'node:assert/strict';
import { villageHouses, dawnStrength, sunHeight, hearthGlow, VILLAGE_CLUSTERS } from './js/life_data.js';

let n = 0;
const check = (name, fn) => { fn(); n++; console.log('OK   ' + name); };

check('village: 48 houses over six clusters, deterministic', () => {
  const a = villageHouses(5), b = villageHouses(5);
  assert.equal(a.length, VILLAGE_CLUSTERS.reduce((s, c) => s + c[2], 0));
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, villageHouses(6));
});
check('village: every house has 1-3 windows on a wall side, size 1.4-3.0', () => {
  for (const h of villageHouses(5)) {
    assert.ok(h.windows.length >= 1 && h.windows.length <= 3);
    for (const [side, , wy] of h.windows) { assert.ok(side === 1 || side === -1); assert.ok(wy >= 0.6 * h.s && wy <= 1.3 * h.s); }
    assert.ok(h.s >= 1.4 && h.s <= 3.0);
  }
});
check('dawn mist: a bell around 06:15, gone by midday and night', () => {
  assert.ok(dawnStrength(6.25) > 0.8);
  for (const h of [0, 3, 11, 12, 15, 20, 22]) assert.ok(dawnStrength(h) < 0.02, `hour ${h}: ${dawnStrength(h)}`);
  assert.ok(dawnStrength(5) > 0.3 && dawnStrength(9) < 0.2);
});
check('dawn mist: weather thickens it and rain leaves a little', () => {
  assert.ok(dawnStrength(12, 'mist') > 0.5);
  assert.ok(Math.abs(dawnStrength(12, 'rain') - 0.25) < 1e-4);
  assert.ok(dawnStrength(6.25, 'mist') <= 1);
});
check('hearth glow: dim at noon, kindled at night, monotone as the sun sets', () => {
  assert.ok(hearthGlow(sunHeight(12)) < 0.11);
  assert.ok(hearthGlow(sunHeight(23)) > 2.5);
  let last = hearthGlow(sunHeight(14));
  for (let h = 14; h <= 22; h += 0.5) { const g = hearthGlow(sunHeight(h)); assert.ok(g >= last - 1e-9, `${h}`); last = g; }
});
console.log(`${n} checks passed`);
