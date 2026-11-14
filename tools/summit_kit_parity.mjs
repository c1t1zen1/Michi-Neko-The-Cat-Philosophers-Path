#!/usr/bin/env node
// Real-kit parity for the summit (lane s2-clearing): classic vs ?assets=modular must give the same colliders, platforms,
// next summit rng draw, bound handles and landmark positions, with no runtime problems.
//   node tools/summit_kit_parity.mjs        exit 0 equal, 1 different, 2 could not run
import { runPage } from './headless.mjs';
const r = await runPage('/tools/summit_kit_parity.html', { size: '320x200', wait: 'window.__parity', timeout: 120, eval: 'JSON.stringify(window.__parity)' });
if (!r.ok) { console.error('could not run:', r.error, r.errors.slice(0, 3)); process.exit(2); }
const { classic: c, modular: m } = JSON.parse(r.value);
const bad = [];
for (const k of ['colliders', 'platforms', 'nextRng', 'toriiAt', 'furinXZ', 'lanternY', 'binds']) if (JSON.stringify(c[k]) !== JSON.stringify(m[k])) bad.push(`${k}: ${JSON.stringify(c[k])} vs ${JSON.stringify(m[k])}`);
if (m.problems.length) bad.push('modular problems: ' + m.problems.join('; '));
if (c.instances.length) bad.push('classic built kit instances');
console.log(`classic: ${c.colliders} colliders, ${c.platforms} platforms, rng ${c.nextRng}`);
console.log(`modular: ${m.colliders} colliders, ${m.platforms} platforms, rng ${m.nextRng}, kit instances: ${m.instances.join(', ')}`);
console.log(bad.length ? 'DIFFERENT\n  ' + bad.join('\n  ') : 'summit kit parity: EQUAL');
process.exit(bad.length ? 1 : 0);
