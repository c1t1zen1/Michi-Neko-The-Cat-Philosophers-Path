// cad_overrides.js under Node (BUILD_GUIDE_FABLE F1.9).
//
//   node tools/cad_overrides_test.mjs
//
// Proves two things on a fake scene graph:
//   1. an EXISTING override file (classic names + child-index paths,
//      tools/fixtures/cad_overrides_fixture.json) applies exactly as before
//      the kit landed: the same targets, the same fields, unmatched entries
//      skipped;
//   2. on the modular set, a node that names a kit part (`part: 'kasagi'`)
//      resolves `asset:<id>/<part>` first and only then falls back to `rel`,
//      and an entry may address a kit group by `asset: '<id>'`.
// 'three' is stubbed through a module resolve hook (tools/fixtures/).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as nodeModule from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const hooks = new URL('./fixtures/three_stub_hooks.mjs', import.meta.url);
if (typeof nodeModule.registerHooks === 'function') {
  const { resolve } = await import(hooks.href);
  nodeModule.registerHooks({ resolve });
} else {
  nodeModule.register(hooks.href);
}
const { applyOverridesDoc } = await import('../src/cad_overrides.js');

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  -> ' + extra : '')); }
};

/* ------------------------------------------------- fake scene graph ------- */
class Node {
  constructor(name = '', children = []) {
    this.name = name; this.children = []; this.parent = null; this.userData = {};
    this.position = vec(); this.rotation = rot(); this.scale = vec(1, 1, 1);
    this.visible = true; this.renderOrder = 0; this.castShadow = true; this.receiveShadow = true; this.frustumCulled = true;
    this.material = null; this.geometry = null;
    for (const c of children) this.add(c);
  }
  add(c) { c.parent = this; this.children.push(c); return this; }
  traverse(fn) { fn(this); for (const c of this.children) c.traverse(fn); }
}
const vec = (x = 0, y = 0, z = 0) => ({ x, y, z, fromArray(a) { [this.x, this.y, this.z] = a; return this; } });
const rot = () => ({ x: 0, y: 0, z: 0, order: 'XYZ', set(x, y, z, order = 'XYZ') { this.x = x; this.y = y; this.z = z; this.order = order; return this; } });
const color = (hex) => ({ hex, setHex(h) { this.hex = h; } });
const material = (hex = 0xffffff) => ({ color: color(hex), emissive: color(0), roughness: 0.9, metalness: 0, emissiveIntensity: 0, needsUpdate: false });
const mesh = (name, hex) => { const m = new Node(name); m.material = material(hex); m.geometry = { original: true }; return m; };

function classicScene() {
  const teaHouse = new Node('Tea House', [
    new Node('walls', [mesh('plaster', 0xeeeeee), mesh('beam', 0x663300)]),
    mesh('roof', 0x555566),
    mesh('bench', 0x884422)
  ]);
  const lantern = new Node('Toro Lantern 3', [mesh('base'), mesh('firebox'), mesh('cap')]);
  const other = new Node('Toro Lantern 4', [mesh('base'), mesh('firebox'), mesh('cap')]);
  return { scene: new Node('scene', [teaHouse, lantern, other]), teaHouse, lantern, other };
}

/* ------------------------------------------------ 1. classic fixture ------ */
console.log('[1/2] existing override file (classic names + child-index paths)');
{
  const doc = JSON.parse(readFileSync(join(ROOT, 'tools', 'fixtures', 'cad_overrides_fixture.json'), 'utf8'));
  const { scene, teaHouse, lantern, other } = classicScene();
  const beam = teaHouse.children[0].children[1], plaster = teaHouse.children[0].children[0], bench = teaHouse.children[2], roof = teaHouse.children[1];
  const applied = await applyOverridesDoc(scene, doc);
  ok('two entries applied (the unnamed and the missing ones skipped)', applied === 2, String(applied));
  ok('root node: renderOrder set on the named root', teaHouse.renderOrder === 3 && teaHouse.visible === true);
  ok('rel 0.1 → walls/beam position', beam.position.x === 1.5 && beam.position.y === 0.25 && beam.position.z === -2);
  ok('rel 0.1 → rotation with order', beam.rotation.y === 1.57 && beam.rotation.order === 'XYZ');
  ok('rel 0.1 → scale', beam.scale.y === 2);
  ok('rel 0.1 → material colour / roughness / metalness', beam.material.color.hex === 0xff0000 && beam.material.roughness === 0.5 && beam.material.metalness === 0.1 && beam.material.needsUpdate === true);
  ok('sibling plaster untouched', plaster.position.x === 0 && plaster.material.color.hex === 0xeeeeee && plaster.material.needsUpdate === false);
  ok('rel 2 → bench castShadow off', bench.castShadow === false);
  ok('rel 2 → bench geometry replaced from the document', bench.geometry.name === 'cad slab' && bench.geometry.index.array.length === 3 && bench.geometry.attributes.position.count === 3 && bench.geometry.groups.length === 1 && bench.geometry.drawRange.count === 3);
  ok('rel 2 → replacement arrays use the published types', bench.geometry.index.array instanceof Uint16Array && bench.geometry.attributes.position.array instanceof Float32Array);
  ok('roof (rel 1) untouched', roof.geometry.original === true && roof.castShadow === true);
  ok('rel 9.9 (no such child) skipped without error', teaHouse.visible === true);
  ok('second entry: lantern firebox emissive', lantern.children[1].material.emissive.hex === 0xffa500 && lantern.children[1].material.emissiveIntensity === 2);
  ok('same-shaped other lantern untouched (lookup is by exact name)', other.children[1].material.emissive.hex === 0 && other.children[1].material.needsUpdate === false);
  const again = await applyOverridesDoc(scene, { format: 'wrong', overrides: [] });
  ok('wrong format → 0 applied', again === 0);
  ok('missing document → 0 applied', (await applyOverridesDoc(scene, null)) === 0);
}

/* ------------------------------------------------ 2. modular set ---------- */
console.log('[2/2] kit part names on the modular set');
{
  // A kit torii as the runtime names it: group `asset:torii` (or the legacy
  // name) with userData.asset, parts `asset:torii/<part>`.
  const kasagi = mesh('asset:torii/kasagi', 0xd8482c), postL = mesh('asset:torii/post_l'), postR = mesh('asset:torii/post_r');
  const torii = new Node('Torii Gate', [postL, postR, kasagi]);   // kasagi is child 2; a classic file said rel "0"
  torii.userData.asset = { id: 'torii', family: 'shrine', tier: 'hero', index: 0 };
  const bare = new Node('asset:toro', [mesh('asset:toro/base'), mesh('asset:toro/firebox')]);
  bare.userData.asset = { id: 'toro', family: 'lanterns', tier: 'hero', index: 0 };
  // a classic root whose second child is a kit group: a child-index path must not walk into it
  const kitChild = new Node('asset:toro', [mesh('asset:toro/base'), mesh('asset:toro/firebox')]);
  kitChild.userData.asset = { id: 'toro', family: 'lanterns', tier: 'hero', index: 1 };
  const shrine = new Node('Shrine', [mesh('step'), kitChild]);
  const scene = new Node('scene', [torii, bare, shrine]);
  const warnings = [];
  const doc = {
    format: 'michi-neko-cad-overrides',
    overrides: [
      // part name wins over a (stale) child-index path
      { name: 'Torii Gate', nodes: [
        { part: 'kasagi', rel: '0', state: { material: { color: 0x112233 } } },
        { part: 'asset:torii/post_r', state: { position: [0, 0, 9] } },
        { part: 'no_such_part', rel: '1', state: { visible: false } },          // unknown part: skipped, never the rel guess
        { part: 'gone', state: { renderOrder: 7 } },                             // unknown part, no rel: skipped, never the root
        { rel: '2', state: { castShadow: false } },                              // rel into a kit tree: skipped (kasagi untouched)
        { state: { renderOrder: 3 } }                                            // no part, no rel: the root itself
      ] },
      // a kit group addressed by asset id when the classic name is gone
      { asset: 'toro', nodes: [{ part: 'firebox', state: { material: { emissive: 0xffa500 } } }] },
      // a classic root: rel may reach its classic children but never descend into a kit group
      { name: 'Shrine', nodes: [{ rel: '0', state: { visible: false } }, { rel: '1.1', state: { visible: false } }] },
      // an entry whose every node is skipped does not count as applied
      { name: 'Shrine', nodes: [{ part: 'nothing', state: { visible: false } }] }
    ]
  };
  const applied = await applyOverridesDoc(scene, doc, { warn: (m) => warnings.push(m) });
  ok('three entries applied (the all-skipped one is not counted)', applied === 3, String(applied));
  ok("part 'kasagi' resolved by name, not rel 0 (post_l)", kasagi.material.color.hex === 0x112233 && postL.material.color.hex === 0xffffff);
  ok('full part name accepted', postR.position.z === 9);
  ok('unknown part with a rel is skipped (post_r untouched)', postR.visible === true && postL.visible === true);
  ok('unknown part without a rel is skipped (root untouched)', torii.renderOrder === 3);
  ok('child-index path never descends into a kit group (kasagi keeps its shadow)', kasagi.castShadow === true);
  ok('node with neither part nor rel still targets the root', torii.renderOrder === 3);
  ok('entry.asset finds asset:<id>', bare.children[1].material.emissive.hex === 0xffa500 && bare.children[0].material.emissive.hex === 0);
  ok('classic child under a classic root still resolves by index', shrine.children[0].visible === false);
  ok('rel path into a kit child group is skipped', kitChild.children[1].visible === true && kitChild.visible === true);
  ok('one warning per skipped part', warnings.length === 3 && warnings.every((w) => /\[cadJS\] override for .* skipped: part '/.test(w)), JSON.stringify(warnings));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
