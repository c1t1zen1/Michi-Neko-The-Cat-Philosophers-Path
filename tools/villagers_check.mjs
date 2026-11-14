#!/usr/bin/env node
// Villager defs + modular NPC path, headless: node tools/villagers_check.mjs  (exit 0 all pass)
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const r = spawnSync('node', [path.join(here, 'headless.mjs'), '/tools/villagers_check.html',
  '--wait', 'window.__villagers && window.__villagers.done', '--eval', 'window.__villagers', '--timeout', '120'], { encoding: 'utf8' });
if (r.status !== 0) { console.error(r.stdout, r.stderr); process.exit(2); }
const lines = r.stdout.trim().split('\n');
const v = JSON.parse(lines[lines.length - 2]);
console.log(v.out);
console.log(`${v.passed} passed, ${v.failed} failed`);
process.exit(v.failed ? 1 : 0);
