// Swap matrix for the Fable modular asset swap (BUILD_GUIDE_FABLE.md, step P0.6).
// Pure Node, no dependencies, no browser. Reads:
//   labs/asset_inventory.json     the audited asset rows and their lab evidence
//   catalog/js/asset-loader.mjs   getAssetCapabilities(): which rows have an original / lab adapter
//   labs/ASSET_COVERAGE.md        only to cross-check the coverage counts
// and writes docs/fable/baseline/swap_matrix.md: one row per active inventory
// asset with its owning lane, best lab target, coverage level and adapters.
//
//   node tools/fable_swap_matrix.mjs            check the committed matrix is current (exit 1 if stale)
//   node tools/fable_swap_matrix.mjs --write    regenerate docs/fable/baseline/swap_matrix.md
//   node tools/fable_swap_matrix.mjs --stdout   print the matrix instead of writing it
//
// The output has no timestamps, so regeneration is byte-for-byte repeatable.
// The lane assignments live in LANES below. The generator refuses to run if an
// active inventory row has no lane, has two, or if a lane names an unknown or
// inactive id, so a new inventory row cannot slip past the matrix unnoticed.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getAssetCapabilities } from '../catalog/js/asset-loader.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const INVENTORY = 'labs/asset_inventory.json';
const COVERAGE_DOC = 'labs/ASSET_COVERAGE.md';
const OUTPUT = 'docs/fable/baseline/swap_matrix.md';
const read = (file) => readFileSync(resolve(ROOT, file), 'utf8').replace(/^﻿/, '');

// Same order and rule as tools/labs_coverage.mjs: each row counts once, at its strongest evidence.
const LEVELS = ['direct', 'review', 'embedded', 'related', 'missing'];
const strongest = (asset) => LEVELS.find((level) => asset.coverage.some((c) => c.level === level)) || 'missing';

// ---------------------------------------------------------------------------
// Lane assignments. basis says where the assignment comes from, in precedence order:
//   ruling      named in an Integrator ruling (Phase 0 briefs and their correction)
//   card        named by the guide's lane card (sections 9 to 12) or by the lane's source module
//   appendix-d  listed for that lane in guide Appendix D (the gap list)
//   judgement   not named by any of the above; placed from the row's source builder and lab
//               study. The third element is the reason. The Integrator should confirm these.
// ---------------------------------------------------------------------------
const lane = (id, phase, family, lab, rows) => ({ id, phase, family, lab, rows });
const LANES = [
  // Phase 2, wave 2.1: props the cat walks past
  lane('v-lanterns', '2.1', 'lanterns', '11 `labs/lanterns/`', [
    ['toro', 'card'], ['chochin', 'card'], ['street-lamps', 'card'],
    ['andon', 'ruling'], ['courtyard-toro', 'ruling'], ['pool-toro', 'ruling']]),
  lane('v-fences', '2.1', 'fences', '12 `labs/fences/`', [
    ['bamboo-fence', 'card'], ['corral', 'card'], ['corral-sign', 'card']]),
  lane('v-rocks', '2.1', 'rocks', '13 `labs/rocks/`', [
    ['path-boulders', 'card'], ['key-rock', 'card']]),
  lane('v-garden', '2.1', 'garden', '14 `labs/garden/`', [
    ['shishi', 'ruling'], ['wind-chime', 'ruling']]),
  lane('v-greenery', '2.1', 'greenery', '15 `labs/greenery/`', [
    ['street-bushes', 'card'], ['bamboo-groves', 'card'], ['roadside-moss', 'ruling']]),
  lane('v-alley', '2.1', 'alley', '16 `labs/alley/`', [
    ['crates', 'ruling'], ['sake-barrel', 'ruling']]),
  lane('v-keepsakes', '2.1', 'keepsakes', '17 `labs/keepsakes/`', [
    ['yarn', 'card'], ['key', 'card'], ['dango', 'appendix-d'], ['jade-paw', 'appendix-d'],
    ['secret-fish', 'appendix-d'], ['interior-fish', 'appendix-d']]),
  lane('v-nest', '2.1', 'nest', '10 `labs/nest/`', [
    ['nest', 'card'], ['nest-eggs', 'card'], ['guardian-feather', 'ruling']]),
  // Phase 2, wave 2.2: landmarks where players stop
  lane('v-shrine', '2.2', 'shrine', '06 `labs/shrine/`', [
    ['torii', 'card'], ['shrine-hall', 'card'], ['mist-altar', 'card'], ['offering-box', 'appendix-d'],
    ['offering-bells', 'ruling'],
    ['shimenawa', 'judgement', 'built inside `buildShrine`; its study is `shrine/game-rope` in lab 06'],
    ['shrine-bell', 'judgement', 'built inside `buildShrine`; its study is `shrine/suzu` in lab 06']]),
  lane('v-machiya', '2.2', 'machiya', '04 `labs/machiya/`', [
    ['tea-house', 'ruling'], ['residence', 'ruling'], ['secret-house', 'ruling'], ['street-house', 'ruling'], ['village-street', 'ruling'],
    ['kawara-roof', 'card'], ['koushi', 'card'], ['engawa', 'card'],
    ['namako', 'appendix-d'], ['tea-bench', 'appendix-d'], ['secret-door', 'appendix-d'], ['lock-plate', 'appendix-d'],
    ['timber-frame', 'judgement', 'machiya building component; studied as `machiya/frame-original` in lab 04'],
    ['upper-windows', 'judgement', 'machiya building component; studied as `machiya/window-original` in lab 04'],
    ['noren', 'judgement', 'machiya building component; studied as `machiya/cloth-original` in lab 04']]),
  lane('v-pagoda', '2.2', 'pagoda', '08 `labs/pagoda/`', [
    ['distant-pagoda', 'card']]),
  lane('v-hidden', '2.2', 'hidden', '07 `labs/moonpool/`', [
    ['moon-pool', 'card'], ['pool-water', 'card'], ['pool-moon', 'card'], ['lily-pads', 'card'], ['lotus', 'card'],
    ['pool-motes', 'card'], ['glade-lanterns', 'card'], ['glade-fireflies', 'card'],
    ['pool-apron', 'appendix-d'], ['pool-rim', 'appendix-d'], ['pool-seat', 'appendix-d'], ['lantern-glade', 'appendix-d'],
    ['glade-floor', 'appendix-d'], ['glade-bamboo', 'appendix-d'], ['glade-seat', 'appendix-d']]),
  lane('v-interiors', '2.2', 'interiors', '21 `labs/interiors/`', [
    ['tea-interior', 'card'], ['tatami', 'card'], ['shoji-doors', 'card'], ['teaware', 'card'], ['courtyard-gravel', 'card'],
    ['interior-frame', 'appendix-d'], ['tokonoma', 'appendix-d'], ['scroll', 'appendix-d'], ['bonsai', 'appendix-d'],
    ['chabudai', 'appendix-d'], ['zabuton', 'appendix-d'], ['courtyard-wall', 'appendix-d'], ['knockables', 'appendix-d'],
    ['secret-tatami', 'appendix-d'], ['secret-table', 'appendix-d'], ['secret-bed', 'appendix-d'],
    ['secret-andon', 'ruling']]),
  // Phase 2, wave 2.3: systems and life
  lane('v-ground', '2.3', 'ground', '01 `labs/ground/`', [
    ['valley-ground', 'card'], ['path', 'card'], ['path-shoulders', 'card'],
    ['path-slabs', 'judgement', '`buildWalkwaySlabs` is ground work; its study is `ground/slabs` in lab 01']]),
  lane('v-water', '2.3', 'water', '02 `labs/water/`', [
    ['river', 'card'], ['bridge', 'card'], ['paddies', 'card'], ['paddy-bunds', 'ruling'],
    ['rice', 'judgement', 'rice stalks are built inside `buildPaddies`; studied as `water/p-summer` and `water/p-autumn` in lab 02'],
    ['water-ripples', 'judgement', '`buildRipplePool` is the cat and koi ripple pool; studied as `water/ripple` in lab 02; the v-water card says the ripple pools must keep working']]),
  lane('v-ranges', '2.3', 'ranges', '03 `labs/ranges/`', [
    ['mountains', 'card'], ['edge-forest', 'card'], ['edge-undergrowth', 'card'], ['foothill-forest', 'card'],
    ['distant-village', 'card'], ['mist-ring', 'card'], ['dawn-mist', 'card']]),
  lane('v-sky', '2.3', 'sky', '05 `labs/sky/`', [
    ['sky-dome', 'card'], ['clouds', 'card'],
    ['stars', 'appendix-d'], ['moon', 'appendix-d'], ['sky-light', 'appendix-d'], ['god-rays', 'appendix-d'],
    ['ao', 'appendix-d'], ['atmosphere', 'appendix-d'], ['grade', 'appendix-d']]),
  lane('v-weather', '2.3', 'weather', '20 `labs/weather/` and 22 `labs/komorebi/`', [
    ['dappled-light', 'card'], ['rain', 'card'], ['snow', 'card'], ['falling-petals', 'card'], ['river-petals', 'card'],
    ['fireflies', 'appendix-d'], ['dust-motes', 'appendix-d'], ['scent', 'appendix-d'], ['splash', 'appendix-d'], ['landing-dust', 'appendix-d'],
    ['rain-ripples', 'judgement', 'the v-weather card lists "rain rings" and the row is studied as `weather/splash` in lab 20; the v-water card only requires the pool to keep working']]),
  lane('v-trees', '2.3', 'trees', 'new lab (decision D5)', [
    ['sakura', 'appendix-d'], ['maples', 'appendix-d'], ['pines', 'appendix-d'], ['rim-trees', 'appendix-d'],
    ['tree-trunks', 'appendix-d'], ['tree-canopies', 'appendix-d']]),
  lane('v-critters', '2.3', 'critters', '18 `labs/critters/`', [
    ['sparrows', 'ruling'], ['koi', 'ruling'], ['butterflies', 'ruling']]),
  // Phase 3: modular characters
  lane('c2-michi', '3', 'characters (`src/characters/`)', 'villagers lab 19 or a new cat lab', [
    ['michi', 'appendix-d'], ['cat-coat', 'appendix-d'], ['cat-face', 'appendix-d'], ['cat-collar', 'appendix-d'],
    ['master-bells', 'appendix-d'], ['cat-shadow', 'appendix-d']]),
  lane('c3-villagers', '3', 'characters (`src/characters/`)', '19 `labs/villagers/`', [
    ['luna', 'card'], ['mochi', 'card'], ['kuro', 'card']]),
  lane('c4-creatures', '3', 'characters (`src/characters/`)', 'none; the crows get a study from v-critters', [
    ['larry', 'ruling'], ['guardian-crows', 'ruling']]),
  // Phase 4: meditation hilltop (the section 11 table)
  lane('s2-clearing', '4', 'summit (`src/summit/`)', '09 `labs/summit/`', [
    ['summit-meadow', 'card'], ['summit-entry', 'card'], ['summit-trees', 'card'], ['meditation-stone', 'card'],
    ['meditation-atmosphere', 'card'], ['summit-enso', 'card'], ['summit-furin', 'card'], ['summit-path', 'card'],
    ['summit-shoulder', 'judgement', 'the earthen shoulder under the entrance torii and steps, which the s2 row names'],
    ['summit-terrain', 'judgement', 'the brow and flanks around the clearing, pressed into a bed under the torii stairs and the lower path; the basin part overlaps s3 and `terrain.js` is split by s1'],
    ['slope-forest', 'judgement', 'planting on the summit slopes; s2 reuses the `trees` kit for summit trees'],
    ['summit-grass', 'judgement', '`buildGrassField` lays the summit grass; the GrassSystem itself is already at standard (guide section 9), so s2 owns only the summit layout']]),
  lane('s3-vista', '4', 'summit (`src/summit/`)', '09 `labs/summit/`', [
    ['kyoto-city', 'card'], ['summit-pagoda', 'card'], ['summit-bay', 'card'], ['harbour', 'card'], ['bay-bridge', 'card'],
    ['ferris-wheel', 'card'], ['horizon', 'card'], ['summit-clouds', 'card'], ['summit-vista', 'card'],
    ['vista-terrain', 'judgement', 'the Yodo River and road ribbons are part of the layered vista the s3 lane builds']]),
  lane('s4-summit-life', '4', 'summit (`src/summit/`)', '09 `labs/summit/`', [
    ['summit-snow', 'card'], ['summit-rain', 'card'], ['summit-pollen', 'card'], ['summit-petals', 'card'],
    ['summit-wildlife', 'card'], ['summit-butterflies', 'card'], ['summit-birds', 'card'], ['shrine-rays', 'card'], ['summit-light', 'card']]),
  // Not swapped by any lane
  lane('at-standard', '-', '-', '-', [
    ['meadow-system', 'ruling'], ['grass-near', 'ruling'], ['grass-mid', 'ruling'], ['grass-far', 'ruling'], ['grass-thicket', 'ruling'],
    ['grass-flowers', 'ruling'], ['grass-susuki', 'ruling'], ['grass-mown', 'ruling'], ['grass-lantern', 'ruling'], ['grass-sumi', 'ruling'],
    ['grass-yarn', 'ruling'], ['grass-shell', 'ruling'], ['grass-moss', 'ruling'], ['grass-fireflies', 'ruling']]),
  lane('media', '-', '-', '-', [
    ['summit-transition', 'ruling'], ['blender-roofscape', 'ruling']])
];

const LANE_TITLES = {
  'at-standard': 'already at standard (`src/grass.js`, not rebuilt; guide section 9 wave 2.3)',
  media: 'media, not a kit asset (optional runtime media with fallbacks)'
};
const PHASE_TITLES = { '2.1': 'Phase 2 wave 2.1, props the cat walks past', '2.2': 'Phase 2 wave 2.2, landmarks where players stop', '2.3': 'Phase 2 wave 2.3, systems and life', 3: 'Phase 3, modular characters', 4: 'Phase 4, meditation hilltop' };

// Guide Appendix D (2026-11-11), copied as data so the drift report below can be computed.
// "mist altar" is the guide's wording; the inventory id is mist-altar.
const APPENDIX_D = [
  ['v-lanterns', ['courtyard-toro', 'pool-toro']],
  ['v-fences', ['corral-sign']],
  ['v-keepsakes', ['dango', 'jade-paw', 'secret-fish', 'interior-fish']],
  ['v-shrine', ['offering-box', 'mist-altar']],
  ['v-machiya', ['namako', 'tea-bench', 'secret-door', 'lock-plate', 'village-street']],
  ['v-hidden', ['pool-apron', 'pool-rim', 'pool-seat', 'pool-toro', 'lantern-glade', 'glade-floor', 'glade-bamboo', 'glade-seat']],
  ['v-interiors', ['interior-frame', 'tokonoma', 'scroll', 'bonsai', 'chabudai', 'zabuton', 'courtyard-toro', 'courtyard-wall', 'knockables', 'secret-tatami', 'secret-table', 'secret-bed', 'secret-andon']],
  ['v-ground / v-water', ['paddy-bunds']],
  ['v-ranges', ['foothill-forest', 'distant-village', 'mist-ring', 'dawn-mist']],
  ['v-sky', ['stars', 'moon', 'sky-light', 'god-rays', 'ao', 'atmosphere', 'grade']],
  ['v-weather', ['fireflies', 'grass-fireflies', 'dust-motes', 'scent', 'splash', 'landing-dust']],
  ['v-trees', ['sakura', 'maples', 'pines', 'rim-trees', 'tree-trunks', 'tree-canopies', 'roadside-moss']],
  ['v-critters', ['guardian-crows']],
  ['c2-michi', ['michi', 'cat-coat', 'cat-face', 'cat-collar', 'master-bells', 'cat-shadow']],
  ['c4-creatures', ['larry', 'guardian-crows']]
];

const BASIS_TEXT = {
  ruling: 'named in an Integrator ruling',
  card: 'named by the guide lane card (sections 9 to 12), or the row is built in the lane\'s source module',
  'appendix-d': 'listed for the lane in guide Appendix D',
  judgement: 'not named anywhere; placed from the source builder and lab study, to be confirmed'
};
const LEVEL_TEXT = {
  direct: 'a focused lab study exists',
  review: 'only a review sheet (real game page) can inspect it',
  embedded: 'appears inside another specimen; no focused study',
  related: 'similar technique or different object only',
  missing: 'no mapped evidence'
};

const yn = (b) => (b ? 'yes' : 'no');
const familyText = (l) => (l.family.includes('`') ? l.family : '`src/kit/' + l.family + '/`');
const cell = (s) => String(s).replace(/\|/g, '\\|');
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

function load() {
  const inventory = JSON.parse(read(INVENTORY));
  const assets = inventory.assets;
  const byId = new Map(assets.map((a) => [a.id, a]));
  const errors = [];

  // Every assignment must name a real, active row, once.
  const owner = new Map();
  for (const l of LANES) {
    for (const [id, basis, reason] of l.rows) {
      const asset = byId.get(id);
      if (!asset) { errors.push(`lane ${l.id} names unknown inventory id: ${id}`); continue; }
      if (asset.lifecycle !== 'active') errors.push(`lane ${l.id} names an inactive row: ${id}`);
      if (owner.has(id)) errors.push(`id assigned twice: ${id} (${owner.get(id)} and ${l.id})`);
      owner.set(id, l.id);
      if (!['ruling', 'card', 'appendix-d', 'judgement'].includes(basis)) errors.push(`bad basis for ${id}: ${basis}`);
      if (basis === 'judgement' && !reason) errors.push(`judgement row needs a reason: ${id}`);
    }
  }
  for (const a of assets.filter((x) => x.lifecycle === 'active')) {
    if (!owner.has(a.id)) errors.push(`active inventory row has no lane: ${a.id}`);
  }

  const rows = [];
  for (const l of LANES) {
    for (const [id, basis, reason] of l.rows) {
      const asset = byId.get(id);
      if (!asset) continue;
      const level = strongest(asset);
      const best = asset.coverage.find((c) => c.level === level);
      const sameLevel = asset.coverage.filter((c) => c.level === level).length;
      const caps = getAssetCapabilities(id);
      rows.push({
        id, group: asset.group, label: asset.label, lane: l.id, basis, reason, level,
        target: best ? best.target + (sameLevel > 1 ? ` (+${sameLevel - 1})` : '') : '-',
        lab: caps.lab, original: caps.original
      });
    }
  }
  return { inventory, assets, byId, rows, errors };
}

// The coverage totals and per-area counts must equal what labs_coverage.mjs wrote into ASSET_COVERAGE.md.
function crossCheckCoverage(assets, warnings, errors) {
  const active = assets.filter((a) => a.lifecycle === 'active');
  const doc = read(COVERAGE_DOC);
  const row = (re) => { const m = doc.match(re); return m ? m.slice(1).map(Number) : null; };
  const labels = { direct: 'Focused lab study', review: 'Review sheet', embedded: 'Embedded in a specimen', related: 'Related evidence only', missing: 'No mapped evidence' };
  for (const level of LEVELS) {
    const got = row(new RegExp('^\\| ' + labels[level] + ' \\| (\\d+) \\|', 'm'));
    const mine = active.filter((a) => strongest(a) === level).length;
    if (!got) warnings.push(`${COVERAGE_DOC}: could not find the "${labels[level]}" total; cross-check skipped`);
    else if (got[0] !== mine) errors.push(`${COVERAGE_DOC} says ${got[0]} ${level} rows, the inventory gives ${mine}`);
  }
  for (const group of new Set(active.map((a) => a.group))) {
    const got = row(new RegExp('^\\| ' + group.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\| (\\d+) \\| (\\d+) \\| (\\d+) \\| (\\d+) \\| (\\d+) \\| (\\d+) \\|', 'm'));
    const rows = active.filter((a) => a.group === group);
    const mine = [rows.length, ...LEVELS.map((l) => rows.filter((a) => strongest(a) === l).length)];
    if (!got) warnings.push(`${COVERAGE_DOC}: could not find the "${group}" area row; cross-check skipped`);
    else if (got.join() !== mine.join()) errors.push(`${COVERAGE_DOC} area "${group}" is ${got.join('/')}, the inventory gives ${mine.join('/')}`);
  }
}

function render({ inventory, assets, rows }) {
  const active = assets.filter((a) => a.lifecycle === 'active');
  const inactive = assets.filter((a) => a.lifecycle === 'inactive');
  const out = [];
  const w = (s = '') => out.push(s);
  const count = (list, level) => list.filter((r) => r.level === level).length;
  const labCount = (list) => list.filter((r) => r.lab).length;
  const origCount = (list) => list.filter((r) => r.original).length;

  // adapter totals as the catalog counts them
  const allTargets = new Set(); let links = 0;
  for (const a of assets) for (const t of getAssetCapabilities(a.id).targets) { allTargets.add(t.id); links++; }
  const origAll = assets.filter((a) => getAssetCapabilities(a.id).original).length;
  const labAll = assets.filter((a) => getAssetCapabilities(a.id).lab).length;

  w('# Swap matrix: every active asset, its lane, its lab target (P0.6)');
  w();
  w('Generated by `node tools/fable_swap_matrix.mjs --write`. Do not edit by hand: change `LANES` in the generator and regenerate.');
  w('`node tools/fable_swap_matrix.mjs` (no arguments) checks that this file is current and exits 1 if it is stale.');
  w();
  w(`Sources: \`${INVENTORY}\` (schema ${inventory.schemaVersion}, reviewed ${inventory.reviewedAt}), \`catalog/js/asset-loader.mjs\` (\`getAssetCapabilities\`), the lane cards in \`BUILD_GUIDE_FABLE.md\` sections 8 to 12, its Appendix D, and the Integrator rulings listed below. Coverage totals are cross-checked against \`${COVERAGE_DOC}\` by the generator.`);
  w();
  w('## Totals');
  w();
  w(`- Inventory rows: **${assets.length}**, of which **${active.length} active** and **${inactive.length} inactive**. This matrix has **${rows.length} rows, one per active row**; the generator refuses to run if any active row has no lane or two.`);
  w(`- Coverage of the ${active.length} active rows (strongest evidence, as \`${COVERAGE_DOC}\`): ${LEVELS.map((l) => `${l} ${count(rows, l)}`).join(', ')}. Rows without a focused lab study: ${rows.length - count(rows, 'direct')}.`);
  w(`- Asset Library adapters: ${origAll} rows have an original adapter; ${labAll} rows have a lab adapter, backed by ${allTargets.size} unique lab specimens (${links} row-to-specimen links). The guide's "71 lab recipes" is the ${allTargets.size} specimens, not the ${labAll} rows.`);
  w();
  w('## Lanes and the rules used to assign them');
  w();
  w('Precedence for the **Basis** column, strongest first:');
  w();
  for (const [k, v] of Object.entries(BASIS_TEXT)) w(`- \`${k}\`: ${v}.`);
  w();
  w('Integrator rulings applied (made during Phase 0 while the operator was asleep; the operator may overturn them):');
  w();
  w('- `offering-bells` goes to **v-shrine** (its focused study is in `labs/shrine`). **v-garden** owns `shishi` and `wind-chime`.');
  w('- **v-lanterns** owns `toro`, `chochin`, `street-lamps`, `andon`, `courtyard-toro` and `pool-toro`.');
  w('- `secret-andon` goes to **v-interiors**. `guardian-feather` goes to **v-nest**, with `nest` and `nest-eggs`.');
  w('- `larry` and `guardian-crows` go to **c4-creatures**; **v-critters** adds the lab study for the crows. `sparrows`, `koi` and `butterflies` go to **v-critters**.');
  w('- `roadside-moss` goes to **v-greenery**. `paddy-bunds` goes to **v-water**.');
  w('- Climb crates, the sake barrel and any other pots or signs clutter go to **v-alley**; `village-street` and the houses go to **v-machiya**.');
  w('- The grass rows (`meadow-system`, every `grass-*`, `grass-fireflies`) are **already at standard** (`src/grass.js`, not rebuilt; guide section 9 wave 2.3), so they have no swap lane.');
  w('- Summit rows go to **s2-clearing**, **s3-vista** or **s4-summit-life** by the section 11 table. `summit-transition` and `blender-roofscape` are **media, not a kit asset**.');
  w('- The four inactive inventory rows are listed at the end and are not part of the matrix.');
  w();
  w('Coverage levels, as in the inventory:');
  w();
  for (const l of LEVELS) w(`- \`${l}\`: ${LEVEL_TEXT[l]}.`);
  w();
  w('"Best lab target" is the first evidence target at the row\'s strongest level, as `lab/selector` (`(+n)` means n more targets at the same level). "Lab adapter" and "Original adapter" are what the Asset Library can load today (`getAssetCapabilities(id).lab` and `.original`); the specimens the catalog opens for a row can differ from the inventory\'s evidence target.');
  w();
  const adapterOnly = rows.filter((r) => r.lab && r.level !== 'direct');
  const studyOnly = rows.filter((r) => !r.lab && r.level === 'direct');
  w(`A lab adapter is not a focused study, and the reverse. ${plural(adapterOnly.length, 'row')} ${adapterOnly.length === 1 ? 'has' : 'have'} a lab adapter without a \`direct\` study (the catalog opens a specimen that embeds or relates to the row): ${adapterOnly.map((r) => `\`${r.id}\``).join(', ')}. ${plural(studyOnly.length, 'row')} ${studyOnly.length === 1 ? 'has' : 'have'} a \`direct\` study but no lab adapter, mostly because the ground, water, ranges, sky, weather, grass and summit labs are not wired into the catalog (see the "Lab adapter" counts per lane below).`);
  w();

  w('## Summary per lane');
  w();
  w('| Lane | Phase | Kit family or module | Lab | Rows | direct | review | embedded | related | missing | No focused study | Lab adapter | Original adapter |');
  w('|---|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|');
  for (const l of LANES) {
    const list = rows.filter((r) => r.lane === l.id);
    const title = LANE_TITLES[l.id];
    w(`| ${l.id} | ${l.phase} | ${cell(title || familyText(l))} | ${cell(title ? '-' : l.lab)} | ${list.length} | ${LEVELS.map((x) => count(list, x)).join(' | ')} | ${list.length - count(list, 'direct')} | ${labCount(list)} | ${origCount(list)} |`);
  }
  w(`| **All lanes** | | | | **${rows.length}** | ${LEVELS.map((x) => `**${count(rows, x)}**`).join(' | ')} | **${rows.length - count(rows, 'direct')}** | **${labCount(rows)}** | **${origCount(rows)}** |`);
  w();
  w('Roof Road lanes `r1` to `r5` have no rows here: the Roof Road is listed under `exclusions` in the inventory and r1 adds roughly forty rows (guide section 12, R1.1).');
  w();

  // ---- gap list (Appendix D regenerated) ----
  w('## Asset gap list by lane (Appendix D, regenerated)');
  w();
  w('Active rows whose strongest evidence is not `direct`. Under the standard lane recipe (guide section 9, step L4) a row with no focused study gets a lab specimen first, or stays classic and is listed as deferred. The level is shown in brackets.');
  w();
  const gapLanes = LANES.filter((l) => !['at-standard', 'media'].includes(l.id));
  for (const l of gapLanes) {
    const gaps = rows.filter((r) => r.lane === l.id && r.level !== 'direct');
    w(`- **${l.id}** (${gaps.length} of ${rows.filter((r) => r.lane === l.id).length}): ${gaps.length ? gaps.map((r) => `\`${r.id}\` (${r.level})`).join(', ') : 'none'}`);
  }
  const atStd = rows.filter((r) => r.lane === 'at-standard' && r.level !== 'direct');
  const media = rows.filter((r) => r.lane === 'media');
  w(`- **at-standard** (${atStd.length} of ${rows.filter((r) => r.lane === 'at-standard').length} without a focused study): ${atStd.length ? atStd.map((r) => `\`${r.id}\` (${r.level})`).join(', ') : 'none'}; these are not rebuilt, so no study is needed.`);
  w(`- **media** (${media.length}): ${media.map((r) => `\`${r.id}\` (${r.level})`).join(', ')}; optional runtime media with fallbacks.`);
  w();

  // ---- drift vs the guide's Appendix D ----
  w('### Differences from the guide\'s Appendix D');
  w();
  const laneOf = new Map(rows.map((r) => [r.id, r.lane]));
  const inD = new Set(APPENDIX_D.flatMap(([, ids]) => ids));
  const moved = [], notGap = [];
  for (const [dLane, ids] of APPENDIX_D) {
    const accepted = dLane.split(' / ');
    for (const id of ids) {
      const mine = laneOf.get(id);
      const level = rows.find((r) => r.id === id)?.level;
      if (level === 'direct') notGap.push(`\`${id}\` (listed under ${dLane}; the inventory has \`direct\` coverage)`);
      else if (!accepted.includes(mine)) moved.push(`\`${id}\` (Appendix D: ${dLane}; this matrix: ${mine})`);
    }
  }
  const summitReview = rows.filter((r) => ['s2-clearing', 's3-vista', 's4-summit-life'].includes(r.lane) && r.level !== 'direct').length;
  const unlisted = rows.filter((r) => r.level !== 'direct' && !inD.has(r.id) && !['s2-clearing', 's3-vista', 's4-summit-life', 'media'].includes(r.lane));
  w(`- Moved by a ruling: ${moved.length ? [...new Set(moved)].join('; ') : 'none'}.`);
  w(`- Listed in Appendix D but not a gap in the inventory: ${notGap.length ? notGap.join('; ') : 'none'}.`);
  w(`- Gaps in the inventory that Appendix D does not list (outside the summit and media rows): ${unlisted.length ? unlisted.map((r) => `\`${r.id}\` (${r.level}, ${r.lane})`).join(', ') : 'none'}.`);
  w(`- Appendix D says "31 summit rows with review-sheet evidence only" for s2 to s4. In the inventory that is ${summitReview} kit rows assigned to s2, s3 and s4 plus the media row \`blender-roofscape\` (review) = ${summitReview + 1}${summitReview + 1 === 31 ? ', which matches' : ', which does NOT match'}; \`kyoto-city\` is \`direct\`.`);
  w();

  // ---- overlaps ----
  w('### Overlaps and judgement calls to confirm');
  w();
  w('Places where the guide names one row on two lane cards, or where a lane module and the row\'s source module differ. Each is resolved above; they are listed so the Integrator can overturn any of them.');
  w();
  const OVERLAPS = [
    '`offering-bells`: the v-garden card (wave 2.1) and the v-shrine card (wave 2.2) both name `buildOfferingBells`. Ruling: v-shrine.',
    '`courtyard-toro` and `pool-toro`: Appendix D lists `courtyard-toro` under v-interiors and `pool-toro` under v-hidden, and lists both under v-lanterns ("shared with interiors and hidden"). Ruling: v-lanterns builds both; v-interiors and v-hidden reuse the asset.',
    '`guardian-crows`: the v-critters card ("Guardian crows need a study") and the c4-creatures card both claim it. Ruling: c4-creatures promotes it; v-critters adds the lab study first.',
    '`interior-fish`: Appendix D and the v-keepsakes card list it, while the v-interiors card says "the bream platter and bonsai need specimens". This matrix follows Appendix D: v-keepsakes.',
    '`god-rays`: Appendix D puts it with v-sky, but it is built in `src/particles.js`, which v-weather owns as single writer for its duration. v-sky\'s kit asset needs an Integrator hook there.',
    '`river-petals`: built in `src/particles.js` (v-weather), but its lab study `water/hanaikada` lives in lab 02 (v-water).',
    '`splash` (in `src/player.js`), `landing-dust` (in `src/context_actions.js`) and `scent` (in `src/scent.js`) sit in modules outside the v-weather lane card; Appendix D assigns them to v-weather, so hooks go through the Integrator.',
    '`glade-bamboo` is v-hidden\'s (Appendix D), but its bamboo should reuse the v-greenery culm builder, which the v-greenery lane keeps parametric for that purpose.',
    '`summit-grass`: the summit grass is laid out in `buildGrassField`, but the GrassSystem is not rebuilt (guide section 9). s2 owns only the layout, so this row may end as a no-op.'
  ];
  for (const o of OVERLAPS) w(`- ${o}`);
  w();
  w('Rows marked `judgement` in the matrix, with the reason each was placed where it was:');
  w();
  for (const r of rows.filter((x) => x.basis === 'judgement')) w(`- \`${r.id}\` to ${r.lane}: ${r.reason}.`);
  w();

  // ---- the matrix ----
  w('## Matrix');
  w();
  w(`One table per lane, in guide order. ${rows.length} rows in total.`);
  w();
  for (const l of LANES) {
    const list = rows.filter((r) => r.lane === l.id);
    w(`### ${l.id}`);
    w();
    if (LANE_TITLES[l.id]) w(`${plural(list.length, 'row')}: ${LANE_TITLES[l.id]}.`);
    else w(`${PHASE_TITLES[l.phase]} · kit family ${familyText(l)} · lab ${l.lab} · ${plural(list.length, 'row')}, ${count(list, 'direct')} with a focused study.`);
    w();
    w('| Inventory id | Area | Lane | Basis | Best lab target | Coverage | Lab adapter | Original adapter |');
    w('|---|---|---|---|---|---|---|---|');
    for (const r of list) w(`| \`${r.id}\` | ${cell(r.group)} | ${r.lane} | ${r.basis} | ${r.target === '-' ? '-' : '`' + r.target + '`'} | ${r.level} | ${yn(r.lab)} | ${yn(r.original)} |`);
    w();
  }

  w('## Inactive rows (not part of the matrix)');
  w();
  w('These stay inactive (guide Appendix D, closing note; the v-weather card: "The two retired builders in the inventory stay retired"). They have no lane.');
  w();
  for (const a of inactive) w(`- ${a.id}: ${a.label} (${a.group}). ${a.note || ''}`.trim());
  return out.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const known = ['--write', '--stdout', '--help'];
  if (args.some((a) => !known.includes(a))) {
    console.error('Usage: node tools/fable_swap_matrix.mjs [--write | --stdout]');
    process.exitCode = 2;
    return;
  }
  if (args.includes('--help')) {
    console.log('Usage: node tools/fable_swap_matrix.mjs [--write | --stdout]\n  (no argument)  check that ' + OUTPUT + ' is current\n  --write        regenerate ' + OUTPUT + '\n  --stdout       print the matrix');
    return;
  }
  const data = load();
  const warnings = [];
  crossCheckCoverage(data.assets, warnings, data.errors);
  for (const w of warnings) console.warn('WARN ' + w);
  if (data.errors.length) {
    console.error(data.errors.map((e) => 'FAIL ' + e).join('\n'));
    process.exitCode = 1;
    return;
  }
  const text = render(data) + '\n';
  const active = data.assets.filter((a) => a.lifecycle === 'active').length;
  if (args.includes('--stdout')) { process.stdout.write(text); return; }
  if (args.includes('--write')) {
    writeFileSync(resolve(ROOT, OUTPUT), text);
    console.log(`Wrote ${OUTPUT}: ${data.rows.length} rows for ${active} active inventory rows`);
    return;
  }
  let current = '';
  try { current = read(OUTPUT); } catch { /* a missing file is stale */ }
  if (current !== text) {
    console.error(`FAIL ${OUTPUT} is stale; run node tools/fable_swap_matrix.mjs --write`);
    process.exitCode = 1;
    return;
  }
  console.log(`OK swap matrix: ${data.rows.length} rows = ${active} active inventory rows, ${LANES.length - 2} lanes plus at-standard and media, ${data.rows.filter((r) => r.basis === 'judgement').length} judgement calls`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
