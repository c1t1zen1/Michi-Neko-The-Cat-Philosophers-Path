// Static checks for labs/: module syntax, cache tags, registry sanity.
// Node only, run from the repo root: node tools/labs_check.mjs
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

let failed = 0;
const ok = (m) => console.log('OK   ' + m);
const bad = (m) => { failed++; console.log('FAIL ' + m); };
const strip = (s) => (s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s);

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
});
const files = walk('labs');

for (const f of files) {
  try {
    execFileSync(process.execPath, ['--input-type=module', '--check'], { input: strip(readFileSync(f, 'utf8')), stdio: ['pipe', 'pipe', 'pipe'] });
    ok('syntax ' + f);
  } catch (e) { bad('syntax ' + f + '\n' + String(e.stderr || e.message)); }
}

const main = strip(readFileSync('src/main.js', 'utf8'));
const tag = (main.match(/\?v=([0-9a-z]+)/) || [])[1];
const IMPORT = /(?:from\s*|import\s*\(\s*)['"]([^'"]*src\/[^'"]*)['"]/g;
for (const f of files) {
  const text = strip(readFileSync(f, 'utf8'));
  const hits = [...text.matchAll(IMPORT)].map((m) => m[1]);
  const isBridge = f.replace(/\\/g, '/') === 'labs/shared/game.js';
  if (hits.length && !isBridge) bad(`${f} imports from src/ (only labs/shared/game.js may): ${hits.join(', ')}`);
  for (const h of hits) {
    const t = (h.match(/\?v=([0-9a-z]+)/) || [])[1];
    if (t === tag) ok(`cache tag ${f} ${h}`); else bad(`cache tag ${f}: ${h} (src/main.js uses ${tag})`);
  }
}

const { LABS, EXTRAS } = await import(pathToFileURL(resolve('labs/registry.js')).href);
const check = (c, m) => (c ? ok(m) : bad(m));
check(LABS.length === 22, 'registry has 22 labs');
check(LABS.map((l) => l.n).sort((a, b) => a - b).every((n, i) => n === i + 1), 'registry n = 1..22 unique');
check(new Set(LABS.map((l) => l.slug)).size === LABS.length, 'registry slugs unique');
for (const l of LABS.filter((x) => x.status === 'live')) check(l.href && existsSync(join('labs', l.href, 'index.html')), `live lab ${l.slug} has labs/${l.href}index.html`);
for (const e of EXTRAS) check(existsSync(resolve('labs', e.href.split('?')[0])), `extra ${e.slug} -> ${e.href}`);

console.log(failed ? `\n${failed} check(s) failed` : '\nAll labs checks OK');
process.exit(failed ? 1 : 0);
