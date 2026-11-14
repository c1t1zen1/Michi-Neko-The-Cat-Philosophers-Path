#!/usr/bin/env node
// Kit material census (guide Appendix C, optional; ruling R52).
// Boots the full game on the modular set and lists every KitMaterials material:
// which family created it, which families reuse it, and how many scene draws
// (baked statics / instanced / plain meshes), casters and triangles sit on it.
// A PR can report "+N merged materials" by diffing two runs (--out a.json, b.json).
//
// Attribution needs an instrumented copy of src/kit/materials.js. The tool makes
// that copy in the OS temp dir (never in the repo) and serves it; the repo is not touched.
//
//   export PLAYWRIGHT_MODULE=/path/to/node_modules/playwright
//   node tools/kit_material_census.mjs [--tier low|medium|high] [--query "?assets=modular"] [--out file.json] [--json] [--keep]
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`usage: node tools/kit_material_census.mjs [--tier low|medium|high] [--query "?assets=modular"] [--out file.json] [--json] [--keep]

Boots the game headless on the modular set (default tier high) from an instrumented temp copy of
src/ and lists every kit material (KitMaterials): creator family, reusers, scene draws (baked /
instanced / plain), shadow casters, triangles. Prints a summary line "N kit materials, M on static
merged draws" so a PR can report "+N merged materials" (diff two --out files). Takes about a minute.
Needs PLAYWRIGHT_MODULE (see tools/headless.mjs). The repo is never modified.`);
  process.exit(0);
}
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : dflt; };
const tier = opt('--tier', 'high'), suffix = opt('--query', '?assets=modular'), out = opt('--out', null);
const asJson = args.includes('--json');

const tmp = mkdtempSync(path.join(tmpdir(), 'kit-census-'));
for (const f of ['src', 'assets']) cpSync(path.join(ROOT, f), path.join(tmp, f), { recursive: true });
for (const f of ['index.html', 'kit-overrides.json', '__boot.html']) { try { cpSync(path.join(ROOT, f), path.join(tmp, f)); } catch { /* optional */ } }
const mf = path.join(tmp, 'src/kit/materials.js');
let ms = readFileSync(mf, 'utf8');
const anchor = '  _once(name, args, make) {\n    const key = name + JSON.stringify(args);\n';
if (!ms.includes(anchor)) { console.error('census: src/kit/materials.js _once() changed shape; update the anchor in this tool'); rmSync(tmp, { recursive: true, force: true }); process.exit(2); }
const probe = "    { const st = new Error().stack || ''; const fams = [...new Set([...st.matchAll(/src\\/kit\\/([a-z0-9-]+)\\/([a-z0-9_-]+)\\.js/g)].map((m) => m[1] + '/' + m[2]))]; const by = [...st.matchAll(/\\/(src|tools)\\/([a-z0-9_\\/-]+)\\.js/g)].map((m) => m[2]).filter((p) => !/kit\\/materials/.test(p)).slice(0, 4); (globalThis.__kitUse ||= []).push({ key, fams, by, created: !this.memo.has(key) }); }\n";
writeFileSync(mf, ms.replace(anchor, anchor + probe));

const { openPage, waitForExpression } = await import('./headless.mjs');
const s = await openPage('/index.html' + suffix, { root: tmp, timeout: 300, session: { catwalk_autostart: 'new' }, local: { catwalk_settings_v1: { quality: tier } } });
let result;
try {
  await waitForExpression(s.page, 'window.game?.menu?.isPlaying && window.game?._bootDissolved', Date.now() + 240000);
  result = await s.page.evaluate(() => {
    const g = window.game, km = g.assets.kitMaterials;
    const inv = new Map(); for (const [k, m] of km.memo) inv.set(m, k);
    const uses = window.__kitUse || [];
    const famsOf = (key) => [...new Set(uses.filter((u) => u.key === key).flatMap((u) => u.fams.length ? u.fams : u.by.slice(0, 1)))];
    const creator = (key) => { const u = uses.find((x) => x.key === key && x.created); return u ? (u.fams[0] || u.by[0]) : '?'; };
    const draws = new Map();
    g.scene.traverse((o) => {
      if (!(o.isMesh || o.isSprite || o.isPoints || o.isLine)) return;
      for (const m of [].concat(o.material || [])) {
        if (!m || !m.userData.kit) continue;
        const d = draws.get(m) || { objects: 0, baked: 0, instanced: 0, plain: 0, casters: 0, tris: 0 };
        d.objects++;
        if (/^Baked Statics/.test(o.name)) d.baked++; else if (o.isInstancedMesh || o.geometry?.isInstancedBufferGeometry) d.instanced++; else d.plain++;
        if (o.castShadow) d.casters++;
        const gg = o.geometry;
        if (gg && gg.attributes?.position) d.tris += Math.round((gg.index ? gg.index.count : gg.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1));
        draws.set(m, d);
      }
    });
    const mats = km.created.map((m) => {
      const key = inv.get(m) || '?';
      return { name: m.name, key, creator: creator(key), families: famsOf(key), draws: draws.get(m) || null };
    });
    return { quality: g.settings.resolveQuality(), count: mats.length, mats, onceCalls: uses.length };
  });
  result.errors = s.errors.length;
} finally { await s.close(); if (!args.includes('--keep')) rmSync(tmp, { recursive: true, force: true }); }

if (out) writeFileSync(out, JSON.stringify(result, null, 1));
if (asJson) console.log(JSON.stringify(result));
else {
  for (const m of result.mats) {
    const d = m.draws;
    console.log(`${m.name.padEnd(12)} ${String(m.creator).padEnd(22)} fam=[${m.families.join(' ')}] draws=${d ? `${d.objects} (baked ${d.baked}, inst ${d.instanced}, plain ${d.plain}, casters ${d.casters}, tris ${d.tris})` : 0}  ${m.key.slice(0, 100)}`);
  }
  const merged = result.mats.filter((m) => m.draws && (m.draws.baked || m.draws.plain)).length;
  console.log(`quality ${result.quality}: ${result.count} kit materials, ${merged} on static (baked or plain) draws, ${result.mats.filter((m) => !m.draws).length} not in the scene; page errors ${result.errors}`);
}
