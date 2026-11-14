# BUILD_GUIDE_FABLE — the modular asset swap

Master build guide for replacing the game's original objects, items and
characters with the best of the Labs research, on a modular, swappable asset
system. Written 2026-11-11 against `main` at `eca7dfa`, cache tag `20261107a`.

**Outcome:** a fully fleshed-out Kyoto village (the valley), meditation hilltop
(the summit, 天上) and level two (the Roof Road, 屋根道), all built from
swappable, cadJS-editable parts, with the original game still one switch away.

**How to use this file:** it is a checklist for a swarm. Read §1–§5 once, then
work only from your lane card (§7–§16). Workers tick boxes in their own lane
status file, never here (§4.4). The Integrator ticks the master board.

---

## Contents

1. [Where we are (verified facts)](#1-where-we-are-verified-facts)
2. [What "AAA" means here](#2-what-aaa-means-here)
3. [Target architecture](#3-target-architecture)
4. [Swarm protocol: roles, worktrees, claims, merges](#4-swarm-protocol)
5. [Rules every agent follows](#5-rules-every-agent-follows)
6. [Master board](#6-master-board)
7. [Phase 0 — Baseline and decisions](#7-phase-0--baseline-and-decisions)
8. [Phase 1 — Foundation (serial)](#8-phase-1--foundation-serial)
9. [Phase 2 — Kyoto village kit (parallel)](#9-phase-2--kyoto-village-kit-parallel)
10. [Phase 3 — Modular characters](#10-phase-3--modular-characters)
11. [Phase 4 — Meditation hilltop](#11-phase-4--meditation-hilltop)
12. [Phase 5 — Roof Road, level two](#12-phase-5--roof-road-level-two)
13. [Phase 6 — Tooling: catalog, cadJS, AI, audio](#13-phase-6--tooling-catalog-cadjs-ai-audio)
14. [Phase 7 — Area polish passes](#14-phase-7--area-polish-passes)
15. [Phase 8 — Hero images and README rewrite](#15-phase-8--hero-images-and-readme-rewrite)
16. [Phase 9 — Final review, then the default flip](#16-phase-9--final-review-then-the-default-flip)
17. [Appendix A — Worker prompt template](#appendix-a--worker-prompt-template)
18. [Appendix B — Lane status file template](#appendix-b--lane-status-file-template)
19. [Appendix C — Verification matrix](#appendix-c--verification-matrix)
20. [Appendix D — Asset gap list by lane](#appendix-d--asset-gap-list-by-lane)

---

## 1. Where we are (verified facts)

Checked in the repo on 2026-11-11. Re-verify anything you depend on.

| Fact | Evidence |
|---|---|
| Buildless game: Three.js r160, vanilla ES modules, import map, no bundler | `index.html`, `AGENTS.md` |
| `main` is the live site (GitHub Pages) | README play badge. **Anything merged to `main` ships to players.** |
| Game source is a few very large builder modules | `src/mountaintop.js` 4127 lines, `src/countryside.js` 3772, `rooftops/js/build.js` 2022, `src/main.js` 1887, `src/foliage.js` 1775, `src/grass.js` 1752, `src/cat.js` 1158 |
| Valley layout is seeded: `Countryside` uses one `mulberry32` stream with 82 `this.random()` call sites | `src/countryside.js:143`. An extra or missing draw shifts everything built after it |
| Static meshes are merged by material; only materials in `MAT` merge | `Countryside._mergeStatics()` |
| Quality tiers exist: `low` / `medium` / `high` / `auto`, plus a two-stage governor and eco floor | `src/settings.js`, `Game.applyQuality()` |
| Asset inventory: 190 rows, 186 active, 89 with a focused lab study (47.8%) | `labs/asset_inventory.json`, `labs/ASSET_COVERAGE.md` |
| Asset Library has 124 original adapters and 71 lab recipes, for viewing and cadJS handoff only | `catalog/js/asset-loader.mjs`, `catalog/README.md` |
| **The game cannot load lab assets today.** cadJS publishes `cad-overrides.json`, which patches transforms, materials and geometry of existing named objects; it never adds, removes or reparents | `src/cad_overrides.js`, `cadJS/README.md` ("Game boundary") |
| cadJS asset package schema 1 blocks structural changes (added/removed parts) | `cadJS/README.md` ("Structural limitation") |
| Labs: 22 registered labs + Grass, 381 shelf specimens, geometry suite 32/32 | `labs/registry.js`, `labs/REVIEW_2026-11-10.md` |
| Only `labs/shared/game.js` imports game modules. The game imports nothing from `labs/` | `AGENTS.md` |
| The cat is an SDF sculpt on a `THREE.Skeleton` with `SkinnedMesh` parts, built inside one `Cat` class | `src/cat.js:200,276`, `src/cat_sdf.js` |
| The Roof Road is a prototype with its own entry page and is **excluded from the inventory** | `labs/asset_inventory.json` `exclusions`, `kyoto-rooftops.html` |
| Roof Road game wiring is designed, not built; four open questions await the operator | `docs/superpowers/specs/2026-10-24-rooftop-road-design.md` §8.2, §11 |
| `mountaintop.js` and the summit UI are marked "owned by a separate effort — don't edit" | `AGENTS.md`. `origin/fix/hilltop-ground-transitions` is fully merged into `main` (0 commits behind) |
| `origin/roof-road` is fully merged into `main`. `origin/graphics-overhaul` has 1 unmerged commit from 2026-09-24 | `git rev-list --left-right --count` |
| README "From the build" uses six `docs/images/capture-*.jpg`; the other five images are concept art | `docs/images/README.md` |

### Coverage by area (from `labs/ASSET_COVERAGE.md`)

| Area | Active rows | Focused lab study | Not yet studied |
|---|---:|---:|---:|
| Characters | 9 | 6 | 3 |
| Cat components | 5 | 0 | 5 |
| Ground and water | 13 | 12 | 1 |
| Landscape | 7 | 3 | 4 |
| Buildings | 5 | 4 | 1 |
| Building components | 10 | 6 | 4 |
| Props | 12 | 11 | 1 |
| Shrine | 7 | 6 | 1 |
| Items | 8 | 4 | 4 |
| Vegetation | 22 | 15 | 7 |
| Effects | 2 | 1 | 1 |
| Hidden places | 16 | 8 | 8 |
| Interiors | 19 | 6 | 13 |
| Sky and effects | 19 | 6 | 13 |
| Summit | 32 | 1 | 31 |
| Roof Road | not inventoried | — | all |

The summit and the Roof Road are the two largest gaps. A study existing does
not mean the study is game-ready: lab recipes are built for a lab stage, with
lab materials and no game colliders.

---

## 2. What "AAA" means here

"AAA" is a quality bar, not a change of engine or scope. The existing design
guardrails stay in force (`AGENTS.md`):

- No fail states, no combat, no timers.
- Procedural painterly textures. No heavy downloads.
- Deepen Kyoto before expanding the map.
- Free exploration first; guidance stays soft and optional.

Within those, an asset is at the bar when it passes **all** of these. This is
the acceptance checklist every lane uses (referred to as **AAA-1…AAA-10**).

| # | Criterion | How it is checked |
|---|---|---|
| AAA-1 | **Reads at cat-eye distance (1–3 m):** no visible box edges, flat untextured faces or separate-cylinder tells | Close capture at 0.35 m camera height, compared with the lab specimen |
| AAA-2 | **Built like the real thing:** every part bears on something; no floating, intersecting or unsupported pieces | `tools/kit_contract_test.html` bearing raycasts (extends `tools/labs_geometry_test.html`) |
| AAA-3 | **Split into named parts** with a stable part tree (§3.3) | `node tools/kit_check.mjs` |
| AAA-4 | **Three detail tiers** (`hero`, `mid`, `far`) with no visible pop at the handover distance | Tier capture strip at the three distances |
| AAA-5 | **Responds to the world:** time of day, lantern light, fog, and where relevant wetness, snow and wind | Captures at dawn, noon, dusk, night; rain and snow where the lab models them |
| AAA-6 | **Keeps the gameplay footprint:** same colliders, climb surfaces, interaction anchors and object names as the original, unless a waiver is recorded | `tools/footprint_golden` (§8, F1.6) |
| AAA-7 | **Inside budget:** triangle, draw-call and build-time budgets set in Phase 0 | `tools/kit_contract_test.html` budget table |
| AAA-8 | **Deterministic:** two builds with the same seed give identical geometry; no draws from the valley's seeded stream | Contract test hash comparison |
| AAA-9 | **Editable:** parameters exposed to cadJS and the AI assistant (§3.5); disposes cleanly | Contract test: param round trip, dispose leak check |
| AAA-10 | **Catalogued:** inventory row, `production` adapter, thumbnail, provenance | `node tools/catalog_check.mjs`, `node tools/labs_coverage.mjs` |

Area-level bar (Phase 7): composition, lighting continuity between assets,
ambient life, audio, and frame time on the three quality tiers.

**Not claimed by this guide:** phone and low-end GPU numbers. No real-device
benchmark exists yet (`AGENTS.md`, open item V1.1/V1.3). Phase 0 records what
can be measured on the dev machine and says so.

---

## 3. Target architecture

Everything in this section is **new** unless marked existing. Names are fixed
here so parallel lanes agree; change them only in Phase 1 and then update this
section.

### 3.1 Two asset sets, one game

```
assetSet = 'classic'   the original builders, exactly as today      (default until Phase 9)
assetSet = 'modular'   the kit builders, part-split, tiered
assetSet = 'auto'      classic on quality 'low', modular otherwise  (enabled in Phase 9)
```

- Setting: `settings.values.assetSet` (key in `src/settings.js`, default
  `'classic'`).
- URL: `?assets=classic|modular|auto` overrides the setting for one session.
- Per-asset: `?swap=torii:modular,toro:classic` for A/B testing (a bare id
  means modular).
- Published choices: `kit-overrides.json` at the repo root (§3.5). A missing
  file is normal.
- The classic builders are **not deleted** in this project. They remain the
  low-GPU path and the reference for every comparison.

Resolution per asset id, as built in `src/kit/runtime.js` (`setFor(id)`):

1. `?swap=` wins for the ids it names.
2. Quality `low` without an explicit `?assets=` resolves to classic (§3.6).
3. `kit-overrides.json` `assets[id].variant`.
4. The global set: `?assets=` over the `assetSet` setting; `auto` is classic
   on quality `low`, modular otherwise.
5. An id with no registered kit builder is classic whatever the above say.

`?assets=` is a developer override and may force the kit on a `low` device;
the setting-driven path never does. `kit-overrides.json` is fetched only
when the set is not classic or a `?swap` asks for the kit, so the classic
default makes no extra request. The runtime is constructed in `Game`
(`this.assets`), `await`ed in `Game.init()` before the valley is built, and
every owner module receives it as `{ assets }` (`Countryside`, `Vegetation`
options; a trailing argument for `HiddenPlaces`, `Particles`,
`AmbientLife`; `InteriorManager` reads `game.assets`). Owners default to
`CLASSIC_ASSETS`, a frozen pass-through whose `build(id, layout, classicFn)`
returns `classicFn()`.

### 3.2 Folder layout

```
src/kit/                      the production asset kit (game-grade) — built in Phase 1
  runtime.js                  AssetRuntime: registry, switch, tiers, fallback, overrides, CLASSIC_ASSETS
  contract.js                 defineAsset(), part naming, param schema, tier policy, validation (pure, Node-importable)
  materials.js                KitMaterials: painterly materials bound into MAT so _mergeStatics merges them
  craft.js                    geometry helpers promoted from labs/shared/craft.js
  rng.js                      mulberry32 + hashId(id) → per-instance seed (pure)
  budgets.js                  per-tier triangle / mesh / build-time limits (twin of docs/fable/baseline/budgets.md)
  index.js                    GENERATED by tools/kit_index.mjs — family loaders, never hand-edited
  <family>/                   one folder per lane, owned by that lane
    index.js                  exports `assets = [defineAsset(...), …]`
    *.js                      the family's builders and shared pieces
src/characters/               NEW  modular characters (Phase 3)
src/summit/                   NEW  the summit split (Phase 4); mountaintop.js stays as the facade
src/rooftops/                 NEW  Roof Road in the game (Phase 5)
rooftops/js/pieces/           NEW  build.js split by piece type (Phase 5)
kit-overrides.json            NEW  optional, published by the catalog/cadJS
docs/fable/                   NEW  swarm working files
  status/<lane>.md            one per lane, owned by that lane
  handoff/<lane>.md           what the Integrator must wire for this lane
  baseline/                   Phase 0 measurements and captures
  decisions.md                operator decisions (D1…)
tools/kit_check.mjs           static kit checks (Node); --root <dir> for fixture trees
tools/kit_index.mjs           generates src/kit/index.js (--check)
tools/kit_test.mjs            node --test: runtime, contract, rng, kit_check fixtures
tools/kit_contract_test.html  browser contract suite (+ .js, and .mjs = headless CLI)
tools/cad_overrides_test.mjs  cad-overrides.js under Node (tools/fixtures/: three stub + override file)
tools/game_shot.mjs           headless game capture with the capture flags; --diff
tools/headless.mjs            shared Playwright page runner (Phase 0)
tools/footprint_golden.*      layout + collider golden (lane f1-golden)
tools/hero_capture.mjs        NEW  hero shot capture (Phase 8)
```

Families load with dynamic `import()` **only when the modular set can be
active**, before the world is constructed (`await this.assets.preload()` in
`Game.init()`, called by the now-async `startGame()`). Classic mode downloads
none of the kit. One family is a handful of files, so the request count
stays small without a bundler. Every import inside `src/kit/**` carries the
cache tag (kit_check enforces it; the AGENTS.md bump one-liner covers
`src/kit`).

### 3.3 The asset contract

Each kit asset is one `defineAsset({...})` record:

```js
defineAsset({
  id: 'torii',                       // must equal the inventory id in labs/asset_inventory.json
  family: 'shrine',
  lab: 'shrine/myojin',              // the lab specimen this was promoted from
  params: {                          // editable, serialisable, with ranges
    span:   { type: 'number', default: 3.2, min: 2.4, max: 4.5, step: 0.05 },
    finish: { type: 'enum', default: 'vermilion', options: ['vermilion', 'weathered', 'stone'] }
  },
  tiers: ['hero', 'mid', 'far'],
  build(ctx, layout, params) { … return instance; }
});
```

Optional fields on the record: `floating` (part keys the bearing check
skips, e.g. a koi), `footprintWaiver` (why the footprint differs from the
classic one; also recorded in the lane status file), `sample` (a layout, or
a function returning one, for the contract test and the catalog), `legacyName`
(the classic object name gameplay looks up, used when the layout gives
none), `label`. `tiers` defaults to all three.

`build` receives:

- `ctx`: `{ THREE, MAT, kitMaterials, tier, rng, quality, textures }` — exactly
  these seven. `rng` is `mulberry32(hashId(id) ^ layout.index)`, **never** the
  valley stream. `MAT` and `textures` are the owning module's own tables:
  every owner with a MAT table and a merge pass (`Countryside`,
  `InteriorManager`, …) writes one line in its constructor,
  `this.assets = scopeAssets(options.assets, { MAT, textures: TEX })`
  (`scopeAssets` from `src/kit/runtime.js`), and builds through that scoped
  view: `ctx.MAT`/`ctx.textures` are that owner's (Vegetation, HiddenPlaces, Particles and AmbientLife scope with the same shared `KIT_TABLES` exported by `countryside.js`, so every owner's `ctx` carries the shared `MAT` + `textures`), the kit materials are
  registered into EVERY bound MAT table (so each owner's `_mergeStatics()`
  merges them) and `scope.instances` lists what the owner built. Given
  nothing or `CLASSIC_ASSETS` it returns `CLASSIC_ASSETS`; `THREE` comes from `main.js`;
  `kitMaterials` is the shared `KitMaterials` set; `quality` is the resolved
  quality tier.
- `layout`: plain data from the classic builder's layout step: position,
  rotation, scale, whatever random choices the classic builder made, plus
  the fields in §3.4 (`index`, `name`, `footprint`, `band`, `bind`, and
  optionally `tier` or `params`).
- `params`: defaults merged with `kit-overrides.json` (`assets[id].params`)
  and `layout.params`, clamped to the schema; unusable values are reported
  once and ignored. The contract test asserts each param reaches the builder
  at its range ends and changes the built result at the asset's most
  detailed tier; a param read only by `update()` declares `visual: false`.

Local-space rule: build with the asset's ground point at the origin and +y
up (ground at `y = 0`); the owning module places `instance.group` from the
layout. The contract test's bearing check reads that frame.

`build` returns an **AssetInstance**:

```js
{
  group,            // THREE.Group named `asset:<id>` (or the legacy name where gameplay looks it up)
  parts,            // { post_l, post_r, kasagi, shimaki, nuki, gakuzuka, … } → Object3D, each named `asset:<id>/<part>`
  sockets,          // named attachment points (lantern hook, rope end, seat) → Object3D
  footprint,        // { colliders: [...], exclusions: [...], anchors: {...} } in the classic builder's format
  live,             // meshes that animate or glow: kept out of _mergeStatics
  update(dt, t, env) {},   // optional; env = { hour, wind, wet, snow, lanternOn }
  setTier(tier) {},        // optional live tier switch
  dispose() {}
}
```

The runtime normalises what a builder returns: part objects are named from
their keys (`asset:<id>/<part>`, so keys are the interface), the group is
named `layout.name || legacyName || asset:<id>` when the builder left it
unnamed and gets `userData.asset = { id, family, tier, index }`, `sockets`,
`live` and `footprint` get their defaults (`footprint` = `layout.footprint`,
R12), and `dispose` is wrapped so geometry under the group is freed (shared
materials and textures never are; mark a shared geometry
`userData.sharedGeometry`). Instances also carry `id`, `tier`, `params`,
`layout` and `buildMs`.

Tiers: an instance's tier is chosen **once, at build time**, from quality ×
distance band (`contract.js` `TIER_POLICY`: on `high` the play field r < 39 m
is `hero`, the rim 39–80 m `mid`, beyond `far`; `medium` is one step less;
`low` never reaches the kit). The layout may force one (`layout.tier`) or
name its band (`layout.band`); otherwise the band comes from the layout's
radius. The choice is clamped to the tiers the asset declares. Rationale:
`_mergeStatics()` bakes static meshes per material and disposes the
originals, so merged geometry cannot change detail later; building at the
right tier and merging keeps the valley's one-draw-call-per-material statics
and makes "no pop at the handover" (AAA-4) hold by construction. `setTier`
is honoured only on instances that implement it (the live, unmerged ones)
and is called from `Game.applyQuality()` through `assets.setQuality(q)`;
merged statics re-tier on the next boot. `medium.near = mid` is deliberate
until the accepted budgets (D1) say otherwise.

`update(dt, t, env)` is called every frame from `Game.update()` for every
instance that defines it (inside the same gate as vegetation and particles:
not on the summit, not indoors). `env` is one reused object:
`hour` (`sky.dayTime`), `wet` (`sky.weatherAmount('rain')`), `snow`
(`weatherAmount('snow')`), `lanternOn` (the valley's lantern state), `wind`
(1 until the weather lane wires a gust signal). `KitMaterials.setEnv(env)`
receives the same object, so every kit surface's wetness and snow follow it.
A throwing `update` is switched off after one warning.

Rules:

1. Part names are a public interface. cadJS overrides, the AI assistant and
   the save of published edits key on them. Renaming a part is a breaking
   change and needs a note in the lane handoff.
2. `footprint` must match the classic asset (AAA-6). If the new object is
   honestly a different shape (for example a real stair where there was a
   ramp), record a waiver in the lane status file (`footprintWaiver` on the
   record) and let the Integrator decide.
3. No kit file imports from `labs/`. Promote the code you need into
   `src/kit/`. Labs may later read the kit through `labs/shared/game.js`.
4. No `Math.random()`, no `Date.now()` in geometry. Use `ctx.rng`.
   `kit_check` rejects them statically; the contract test hashes two builds.
5. A throwing or missing kit builder never breaks the game: the runtime logs
   once per id and builds the classic asset instead (the same for a builder
   that returns something that is not an AssetInstance).
6. Geometry meant to merge is indexed with position, normal and uv (and
   colour for `craft.Bag` meshes) and uses `ctx.kitMaterials` or `ctx.MAT`
   materials; anything animated or glowing goes in `live`.
7. Budgets (AAA-7) are `src/kit/budgets.js` per tier (`budgetFor(id, tier)`;
   per-asset exceptions cite why).

### 3.4 Layout / mesh split in the classic builders

Each classic builder is split in place, without changing what it draws:

```js
buildTorii(x, z) {
  const layout = this.layoutTorii(x, z);        // every this.random() draw happens here, in the original order
  return this.assets.build('torii', layout, () => this.meshToriiClassic(layout));
}
```

`this.assets.build(id, layout, classicFn)` runs the kit builder when the
modular set is active for that id and one is registered; otherwise it calls
`classicFn`. Because the layout step always runs, the seeded stream advances
identically in both sets and the valley does not shift.

**Footprint registration (Integrator ruling R12, binding for f2 and f3):**

1. Every routed classic builder's layout carries
   `layout.footprint = { colliders, exclusions, anchors }` as plain data in
   the classic formats (the same objects and fields the classic code pushes
   into `this.colliders`, `vegetationExclusions`, etc.), computed in the
   layout step from the same arithmetic the classic code uses.
2. The owning module has one helper, e.g.
   `Countryside.placeAsset(id, layout, classicFn)`: classic → `classicFn()`
   (classic registration happens exactly as today); modular → add
   `instance.group` to the scene (or to the parent named in the layout),
   register `instance.footprint` through the same registration code path
   classic uses, in the same order; mesh-reference anchors that gameplay
   holds (door, key, fish meshes etc.) are bound from `instance.parts` /
   `instance.sockets` by part names declared in the layout (e.g.
   `layout.bind = { secretKeyMesh: 'key' }`).
3. Kit assets default their `footprint` to `layout.footprint` ("copied from
   the classic layout", L5); any deviation is a recorded waiver.
4. `_mergeStatics()`: kit-instance meshes merge unless listed in
   `instance.live`.

The contract test compares `instance.footprint` with `layout.footprint`;
the footprint golden run with `?swap=` catches registration drift.

Footprint keys (Integrator ruling R18): `{ colliders, exclusions, anchors }`
is the minimum; a footprint may carry extra keys mirroring the owner's
registries — `platforms` (climb surfaces, AAA-6), `waterRects`, `houseColliders`,
… — in the classic formats, and `placeAsset` registers every key in the
same order the classic builder did. `anchors` is keyed by the owner's own
field name (`this.secretKeyPos`, `this.toriiTopPos`, …) so registration is
`this[name] = value`.

```js
// the owner's helper (sketch); `this.assets` is the scoped view (§3.3)
placeAsset(id, layout, classicFn) {
  const out = this.assets.build(id, layout, classicFn);
  if (!isAssetInstance(out)) return out;                 // classic: already registered
  const parent = layout.parent ? this.scene.getObjectByName(layout.parent) : this.scene;
  out.group.position.set(layout.x, layout.y || 0, layout.z);
  out.group.rotation.y = layout.ry || 0;
  parent.add(out.group);
  const f = out.footprint;                                // same registries, same order as the classic builder
  for (const box of f.colliders) this.colliders.push(box);
  for (const p of f.platforms || []) this.platforms.push(p);
  for (const rect of f.waterRects || []) this.waterRects.push(rect);
  for (const rect of f.exclusions) this.vegetationExclusions.push(rect);
  for (const [name, value] of Object.entries(f.anchors)) this[name] = value;
  for (const [field, part] of Object.entries(layout.bind || {})) this[field] = out.parts[part] || out.sockets[part] || null;
  return out;
}
```

Layout fields the runtime reads: `index` (the instance number within the
builder, seeds `ctx.rng`), `name` (the classic object name, used as the
group name so lookups by name keep working), `footprint`, `band` or the
position (tier band), `tier` (force), `params` (override). The seeded
`this.random()` draws stay in the layout step, in their original order.

`_mergeStatics()` on the modular set: `KitMaterials` is bound into the
`MAT` table (`assets.setContext({ MAT, textures })` does it), so pass 1
takes kit meshes exactly like classic ones; the owner adds every object in
`instance.live` to its protected roots. Verified: 48 kit-material meshes of
three materials add 48 draw calls and merge through `_mergeInto` to 3
(`tools/kit_contract_test.html`, materials section).

This split is done **once, serially, in Phase 1**. After it, parallel lanes add
kit files and never open `countryside.js`.

### 3.5 Editing and swapping

- `kit-overrides.json` (format `michi-neko-kit-overrides`):
  `{ "format": "michi-neko-kit-overrides", "assets": { "torii": { "variant": "modular", "params": { "span": 3.4 } } } }`.
  Read by `AssetRuntime.preload()` when the set is not classic (or a `?swap`
  asks for the kit); missing means ignore, a wrong format warns once and is
  ignored. `variant` is `classic` or `modular`; `params` are validated
  against the asset's schema. An empty, valid file is committed at the repo
  root so modular boots are console-clean (Integrator ruling); a missing
  file is still handled, and unit-tested.
- The existing `cad-overrides.json` path keeps working on both sets
  (`tools/cad_overrides_test.mjs` proves the fixture file applies as
  before). On the modular set a node may carry `part: "kasagi"` (or the
  full `asset:torii/kasagi`), resolved by name; an unknown part skips the
  node with one warning (never the root, never a child-index guess). A
  node without `part` keeps the child-index `rel` path, which never
  descends into a kit group (`userData.asset`). An entry may address a kit
  group by `asset: "torii"` when its classic `name` is gone.
- The catalog gains a third variant, `production`, beside `original` and `lab`
  (Phase 6). `Edit in cadJS` opens `?asset=<id>&variant=production`.
- cadJS gains a parameter panel driven by the `params` schema, and the AI
  designer gains a validated `set_asset_params` action. Model output still
  cannot execute code or write arbitrary files.

### 3.6 Compatibility promises

| Promise | Mechanism |
|---|---|
| The classic game keeps working at every commit on the integration branch | `assetSet` defaults to `classic`; CI-style gate G1 at every merge |
| Saves stay valid | No save schema change for asset swaps. New flags (Roof Road) are additive |
| Lab, catalog, cadJS, review sheets and Roof Road keep using `Cat`, `Countryside`, `SummitManager` | These stay as facades with the same public API |
| Low-power devices are unaffected | Quality `low` always resolves to `classic` and the kit is never downloaded (families, materials, `kit-overrides.json`), whatever the `assetSet` setting or the published file say. The only exceptions are the developer flags `?assets=` and `?swap=` (§3.1) |

---

## 4. Swarm protocol

### 4.1 Roles

| Role | Who | Does |
|---|---|---|
| **Operator** | the human owner | Answers decisions (§7), approves gates, approves anything destructive |
| **Integrator** | one agent or the operator; exactly one at a time | Owns the hot files (§4.5), merges lanes into `fable/integration`, bumps the cache tag, ticks the master board |
| **Workers A, B, C (+)** | three or more medium or smaller models | One lane each at a time, in their own worktree |
| **Reviewer** | Fable, at the end (Phase 9) and at each gate if asked | Reviews and tests; does not write lane code |

### 4.2 Branches

```
main                    live site. Receives merges only at gates, with assetSet still 'classic'.
fable/integration       long-lived integration branch. All lanes merge here.
fable/<lane-id>         one branch per lane, e.g. fable/v-lanterns
```

Nothing lands on `main` between gates. Lanes branch from, and rebase onto,
`fable/integration`.

### 4.3 Worktrees

One worktree per lane, as a sibling of the repo so each can be served on its
own port:

```sh
cd /path/to/Michi-Neko-The-Cat-Philosophers-Path
git fetch origin
git worktree add ../michi-wt/<lane-id> -b fable/<lane-id> origin/fable/integration
cd ../michi-wt/<lane-id>
python3 -m http.server 81NN        # a port unique to the lane
```

Finishing a lane:

```sh
git fetch origin && git rebase origin/fable/integration
# run the lane's checks (Appendix C)
git push -u origin fable/<lane-id>
# open a PR into fable/integration; the Integrator merges
```

Remove a worktree only after its PR is merged, with `git worktree remove`.
Never `--force` it; uncommitted work there belongs to someone.

### 4.4 Claiming and status (how agents avoid colliding)

1. **Claim = pushing the branch.** `git push -u origin fable/<lane-id>` fails
   if another agent already claimed the lane. If it fails, pick another lane.
2. The first commit on the branch creates `docs/fable/status/<lane-id>.md`
   from Appendix B, with the worker's model name and start time.
3. Workers tick boxes **only in their own status file**. That file is the
   lane's record and merges without conflict.
4. This file's master board (§6) is edited only by the Integrator, when a
   lane merges.
5. A lane with no commit for a full working session may be released by the
   Integrator, who notes it in the status file. The branch is kept.

### 4.5 File ownership

**Hot files: Integrator only.** A worker who needs a change here writes it
into `docs/fable/handoff/<lane-id>.md` as an exact patch or instruction.

```
src/main.js   src/bootstrap.js   index.html   src/settings.js
src/countryside.js   src/vegetation.js   src/interior.js   src/hidden_places.js
src/ambient_life.js  src/particles.js    src/sky.js        src/postfx.js
src/mountaintop.js   src/cat.js          src/npc.js        src/player.js
src/kit/runtime.js   src/kit/contract.js src/kit/materials.js src/kit/index.js (generated)
labs/shared/game.js  labs/registry.js    labs/asset_inventory.json
catalog/js/asset-loader.mjs   catalog/metadata.json   catalog/thumbnails.json
rooftops/js/build.js  rooftops/js/game.js  rooftops/js/level.js
AGENTS.md   README.md   BUILD_GUIDE_FABLE.md   every ?v= cache tag
```

Phase 1, Phase 3 step C1, Phase 4 step S1 and Phase 5 step R1 are the planned
moments when a single named agent edits these files. Outside those, they are
closed.

**Lane-owned files: that lane only.**

```
src/kit/<family>/**            the lane's kit family
labs/<slug>/**                 the lane's lab (new specimens, research.md)
docs/fable/status/<lane>.md    docs/fable/handoff/<lane>.md
tools/<lane-specific test>     only if listed on the lane card
```

Two lanes never share a family folder. If a lane needs a helper another
family owns, it asks through its handoff file; the Integrator moves the
helper into `src/kit/craft.js` or `materials.js`.

### 4.6 Merge order and gates

The Integrator merges one lane at a time:

1. Rebase check, lane checks green, status file complete, handoff file read.
2. Apply the handoff (inventory row, loader adapter, registry, hooks).
3. Run `node tools/kit_index.mjs`, then gate **G1** (Appendix C).
4. Merge, tick the master board, push `fable/integration`.

The cache tag is bumped **once per gate**, by the Integrator, on
`fable/integration`. Workers never bump tags: a bump touches every module and
would conflict with every other lane. New files written in a worktree import
with the tag currently on `fable/integration`.

---

## 5. Rules every agent follows

Short enough to paste into a worker prompt (Appendix A does).

1. Read `AGENTS.md`, this section, and your lane card. Nothing else is
   required reading.
2. Work only in your worktree and only in your lane's files (§4.5).
3. Never edit a hot file. Write the handoff instead.
4. Never add, remove or reorder a `this.random()` / `this.rng()` call in
   `countryside.js` or `mountaintop.js`.
5. Never weaken or delete a test to make it pass. Add tests for new behaviour.
6. Never bump cache tags. Never run a bulk `sed` across `src/`.
7. No new dependencies, no build step, no downloaded textures or models.
8. No secrets in files, prompts, logs or commits.
9. No destructive git: no force-push, no reset of shared branches, no branch
   or worktree deletion without the Integrator.
10. Preserve CRLF line endings and UTF-8 (Japanese text, em-dashes). Do not
    rewrite files with PowerShell `Set-Content`.
11. Scratch captures and temporary scripts go outside the repo.
12. If blocked for more than two attempts, stop. Write `BLOCKED:` with what
    you tried at the top of your status file, commit, push, and end the turn.
13. Report what you actually ran and what it printed. "Should pass" is not a
    result.
14. One lane, one PR. Keep the diff inside the lane's file list.

---

## 6. Master board

Integrator-only. `[ ]` open, `[~]` claimed, `[x]` merged into
`fable/integration`. Lane detail lives in `docs/fable/status/`.

### Gates

- [x] **G-P0** Baseline recorded, decisions D1–D8 answered
- [x] **G-F** Foundation merged; classic output proven unchanged (→ may merge to `main`)
- [ ] **G-V1** Village wave 1 (props) merged
- [ ] **G-V2** Village wave 2 (landmarks) merged
- [ ] **G-V3** Village wave 3 (systems, life) merged (→ may merge to `main`)
- [ ] **G-C** Characters merged
- [ ] **G-S** Hilltop merged
- [ ] **G-R** Roof Road merged and wired (→ may merge to `main`)
- [ ] **G-T** Tooling merged
- [ ] **G-A** Area polish accepted for all three areas
- [ ] **G-H** Hero images and README merged
- [ ] **G-FINAL** Fable review passed; operator approves the default flip

### Lanes

| Phase | Lane id | Scope | Needs | Status |
|---|---|---|---|---|
| 0 | `p0-baseline` | Measurements, captures, decisions file | — | [x] |
| 1 | `f1-runtime` | `src/kit/` runtime, contract, tools (F1.6, the footprint golden, was split into lane `f1-golden`, also merged) | G-P0 | [x] |
| 1 | `f2-countryside-split` | Layout/mesh split in `countryside.js` | f1 API frozen | [x] |
| 1 | `f3-systems-split` | Hooks in vegetation, interior, hidden places, ambient life, particles | f1 API frozen | [x] |
| 2.1 | `v-lanterns` | Lanterns (lab 11) | G-F | [x] |
| 2.1 | `v-fences` | Fences and corral (lab 12) | G-F | [ ] |
| 2.1 | `v-rocks` | Rocks and boulders (lab 13) | G-F | [x] |
| 2.1 | `v-garden` | Shishi-odoshi, fūrin, bells (lab 14) | G-F | [ ] |
| 2.1 | `v-greenery` | Bushes, street greenery, bamboo (lab 15) | G-F | [ ] |
| 2.1 | `v-alley` | Climb crates and street clutter (lab 16) | G-F | [ ] |
| 2.1 | `v-keepsakes` | Yarn, key, reward and food items (lab 17) | G-F | [ ] |
| 2.1 | `v-nest` | The nest, eggs, feather (lab 10) | G-F | [ ] |
| 2.2 | `v-shrine` | Torii, sandō, shrine, altar (lab 06) | G-V1 | [ ] |
| 2.2 | `v-machiya` | Machiya, components, street (lab 04) | G-V1 | [ ] |
| 2.2 | `v-pagoda` | Distant pagoda (lab 08) | G-V1 | [ ] |
| 2.2 | `v-hidden` | Moon Pool and Lantern Glade (lab 07) | G-V1 | [ ] |
| 2.2 | `v-interiors` | Tea house and secret house interiors (lab 21) | G-V1 | [ ] |
| 2.3 | `v-ground` | Ground, path, shoulders (lab 01) | G-V2 | [ ] |
| 2.3 | `v-water` | River, bridge, paddies (lab 02) | G-V2 | [ ] |
| 2.3 | `v-ranges` | Forest wall, mountains, mist (lab 03) | G-V2 | [ ] |
| 2.3 | `v-sky` | Sky, clouds, cloud shadows, post (lab 05) | G-V2 | [ ] |
| 2.3 | `v-weather` | Petals, rain, snow, motes, komorebi (labs 20, 22) | G-V2 | [ ] |
| 2.3 | `v-trees` | Sakura, maple, pine, rim trees (new lab) | G-V2 | [ ] |
| 2.3 | `v-critters` | Koi, birds, butterflies, crows (lab 18) | G-V2 | [ ] |
| 3 | `c1-rig-split` | `Cat` split into rig, parts, behaviour (serial) | G-F | [x] |
| 3 | `c2-michi` | Player cat parts, collar, master bells | c1 | [ ] |
| 3 | `c3-villagers` | Luna, Mochi, Kuro (lab 19) | c1 | [ ] |
| 3 | `c4-creatures` | Larry the turtle, guardian crows | c1 | [ ] |
| 4 | `s1-summit-split` | `mountaintop.js` split behind the facade (serial) | G-F, D2 | [ ] |
| 4 | `s2-clearing` | Meadow, stone, ensō, fūrin, torii, path, trees | s1, G-V2 | [ ] |
| 4 | `s3-vista` | City, pagoda, bay, harbour, ranges, clouds | s1, `v-pagoda`, `v-ranges` | [ ] |
| 4 | `s4-summit-life` | Summit weather, pollen, petals, butterflies, birds | s1, `v-weather` | [ ] |
| 5 | `r1-roof-split` | `build.js` split into pieces + inventory (serial) | G-F | [ ] |
| 5 | `r2-roofs-streets` | Mouths 1–2: bridge gate, machiya roofs, Pontochō | r1, `v-machiya` | [ ] |
| 5 | `r3-canal-market` | Mouths 3–5: Takase canal, boat, Nishiki canopy, laundry sky | r1 | [ ] |
| 5 | `r4-festival` | Mouths 6–7: yatai, hoko float, temple gate, Okuribi | r1 | [ ] |
| 5 | `r5-roof-cast` | Chidori, Shōki, boatman, hayashi musicians | r1, c1 | [ ] |
| 5 | `r6-game-wiring` | `RooftopManager`, unlock, save, music (serial) | r2–r5, D3 | [ ] |
| 6 | `t1-catalog` | `production` variant, swap board, thumbnails | G-V1 | [ ] |
| 6 | `t2-cadjs` | Param panel, AI action, package schema 2 | G-V1 | [ ] |
| 6 | `t3-audio` | dawCAT sound hooks for new assets | G-V2 | [ ] |
| 7 | `a1-village` | Village area pass | G-V3, G-C | [ ] |
| 7 | `a2-hilltop` | Hilltop area pass | G-S | [ ] |
| 7 | `a3-rooftops` | Roof Road area pass | G-R | [ ] |
| 8 | `h1-hero` | Hero capture tool and shots | G-A | [ ] |
| 8 | `h2-readme` | README and docs rewrite | h1 | [ ] |
| 9 | `z-final` | Fable review and test | G-H | [ ] |

### Suggested allocation for three workers

| Step | Worker A | Worker B | Worker C | Integrator |
|---|---|---|---|---|
| Phase 1 | `f2-countryside-split` (after f1) | `f3-systems-split` (after f1) | gap specimens for wave 1 labs | `f1-runtime` |
| Wave 2.1 a | `v-lanterns` | `v-fences` | `v-rocks` | merges |
| Wave 2.1 b | `v-garden` | `v-greenery` | `v-alley` | merges |
| Wave 2.1 c | `v-keepsakes` | `v-nest` | `t1-catalog` | merges, G-V1 |
| Wave 2.2 a | `v-shrine` | `v-machiya` | `v-pagoda` | `c1-rig-split` |
| Wave 2.2 b | `v-hidden` | `v-interiors` | `t2-cadjs` | merges, G-V2 |
| Wave 2.3 a | `v-ground` | `v-water` | `v-ranges` | `s1-summit-split` |
| Wave 2.3 b | `v-sky` | `v-weather` | `v-trees` | `r1-roof-split` |
| Wave 2.3 c | `v-critters` | `c2-michi` | `c3-villagers` | merges, G-V3, G-C |
| Hilltop | `s2-clearing` | `s3-vista` | `s4-summit-life` | merges, G-S |
| Roof Road a | `r2-roofs-streets` | `r3-canal-market` | `r4-festival` | merges |
| Roof Road b | `r5-roof-cast` | `c4-creatures` | `t3-audio` | `r6-game-wiring`, G-R |
| Polish | `a1-village` | `a2-hilltop` | `a3-rooftops` | G-A |
| Finish | `h1-hero` | `h2-readme` (after h1) | fixes from review | G-H |

Wave 2.1 comes first on purpose: props are small, repeat many times, and prove
the whole pipeline before anyone touches a system-level asset. The system
lanes in wave 2.3 (`v-ground`, `v-water`, `v-sky`) are the hardest; give them
to the strongest of the workers, and expect the Reviewer to look closely.

---

## 7. Phase 0 — Baseline and decisions

Lane `p0-baseline`. One agent. Changes nothing in the game.

### Steps

- [ ] P0.1 Create `fable/integration` from `main` and push it.
- [ ] P0.2 Run the whole verification matrix (Appendix C) on `main`. Record
      every command and its real output in `docs/fable/baseline/checks.md`.
      A failure on `main` is recorded and reported, not fixed here.
- [ ] P0.3 Record performance on the dev machine in
      `docs/fable/baseline/perf.md`: for quality `low`, `medium`, `high` at four
      fixed spots (street, shrine, river, meadow) note frame time, draw calls
      and triangles from `renderer.info`, and world build time. State the
      machine, browser and GPU backend. State plainly that this is not a phone
      or low-end benchmark.
- [ ] P0.4 Capture baseline images to `docs/fable/baseline/captures/`: every
      sheet of `tools/town_preview.html`, `hidden_preview.html`,
      `tree_preview.html`, `cat_preview.html`, `summit_preview.html` and the
      seven Roof Road mouths plus finale. These are the "before" of every
      later comparison.
- [ ] P0.5 Propose budgets in `docs/fable/baseline/budgets.md`, derived from
      P0.3 (for example: modular `medium` may cost no more than the measured
      classic `high`). Budgets are proposals until the operator accepts them.
- [ ] P0.6 Generate `docs/fable/baseline/swap_matrix.md` from
      `labs/asset_inventory.json` and `catalog/js/asset-loader.mjs`: one row
      per active asset with its lane, best lab target, coverage level, and
      whether a lab adapter exists. Appendix D is the starting point.
- [ ] P0.7 Write `docs/fable/decisions.md` with the questions below and wait.

### Operator decisions

| # | Decision | Default if unanswered |
|---|---|---|
| D1 | Accept the budgets from P0.5? | Lanes proceed; G-V1 cannot pass |
| D2 | **Is the separate summit effort finished, so `mountaintop.js` and the summit UI may be edited by lane `s1`?** `AGENTS.md` still forbids it | Phase 4 stays closed |
| D3 | Roof Road unlock: the Seven Posts railing walk, or one of the alternatives in the spec §11? Answer all four open questions there | `r6-game-wiring` stays closed; r1–r5 proceed |
| D4 | Period palette: keep modern props (bicycle, shop tanuki) out of the default set, as the labs review did? | Yes, period only |
| D5 | Is a new lab allowed for trees (sakura, maple, pine)? They have review sheets but no lab | Yes |
| D6 | May `origin/graphics-overhaul` (one unmerged commit, 2026-09-24) be ignored? | Ignored, not deleted |
| D7 | Which models run Workers A, B, C and the Integrator? | — |
| D8 | Hero images: real in-game captures only, concept art moved to its own labelled section or removed? | Captures only in "From the build"; concept art kept in a labelled section |

**Gate G-P0:** baseline files committed on `fable/integration`; D1–D8 answered
or defaulted in writing.

---

## 8. Phase 1 — Foundation (serial)

This is the only phase that restructures existing game code. It must leave
the classic game byte-for-byte the same on screen. Give `f1` to the
Integrator or the strongest available model. `f2` and `f3` start after `f1`
has merged and its API (§3.3) is frozen.

### Lane `f1-runtime`

Owns: `src/kit/runtime.js`, `contract.js`, `materials.js`, `craft.js`,
`rng.js`, `tools/kit_check.mjs`, `tools/kit_index.mjs`,
`tools/kit_contract_test.html` (+ `.js`), `tools/footprint_golden.html`
(+ `.js`), and the listed edits to `src/settings.js`, `src/main.js`,
`src/bootstrap.js`, `src/cad_overrides.js`, `tools/check_syntax.mjs`.

- [ ] F1.1 `contract.js`: `defineAsset`, param schema validation, part-name
      helper, tier constants. Pure, importable under Node.
- [ ] F1.2 `rng.js`: `mulberry32`, `hashId`. Same algorithm as
      `countryside.js` so behaviour is familiar; separate streams.
- [ ] F1.3 `runtime.js`: `AssetRuntime` with `resolveSet()` (setting, URL,
      quality), `preload()` (dynamic import of families), `build(id, layout,
      classicFn)`, try/catch fallback with one console warning per id,
      `kit-overrides.json` loading, `?swap=` parsing, `instances` registry for
      `update` and `setTier`, `dispose`.
- [ ] F1.4 `materials.js`: painterly kit materials, promoted from
      `labs/shared/painted.js` and `finish.js`, registered so
      `_mergeStatics()` can merge them. Verify by counting draw calls before
      and after on a test scene.
- [ ] F1.5 `tools/kit_check.mjs` (Node, fast): every asset id exists in the
      inventory; ids unique; every family folder has `index.js`; no import
      from `labs/`; no `Math.random`, `Date.now`, `this.random` in `src/kit`;
      param defaults inside their ranges; cache tags on imports of game
      modules match the current tag.
- [ ] F1.6 `tools/footprint_golden`: a page that builds the valley with a
      fixed seed and writes a JSON digest of (a) every named object's world
      position and rotation, (b) every collider, (c) every vegetation
      exclusion rect, (d) interaction anchors. Commit the digest for the
      current `main` as `tools/golden/valley_classic.json`. The same page
      diffs a new build against it. Model it on how the review sheets build
      `Countryside` in isolation.
- [ ] F1.7 `tools/kit_contract_test.html`: for each registered asset and
      tier, build it and assert the AAA-2, 3, 7, 8, 9 checks. With zero
      assets registered it passes trivially and prints `0 assets`.
- [ ] F1.8 Wire: `assetSet` in `settings.js` (default `'classic'`), runtime
      constructed in `Game`, `await runtime.preload()` before `Countryside`,
      `runtime.update()` in the frame loop, tier changes from
      `applyQuality()`. Settings menu entry is added in Phase 9, not now.
- [ ] F1.9 `cad_overrides.js`: resolve `asset:<id>/<part>` names first, then
      the existing child-index path. Existing override files must apply
      exactly as before; add a test fixture proving it.
- [ ] F1.10 Add `src/kit/**` to `tools/check_syntax.mjs` and
      `tools/verify.mjs`.
- [ ] F1.11 Docs: add a "Kit" row to the layout table in `AGENTS.md` and
      reconcile §3 of this guide with what was actually built.

Done when: G1 passes, the golden diff against `main` is empty, and
`?assets=modular` with zero registered assets renders the same game.

### Lane `f2-countryside-split`

Owns: `src/countryside.js` for the duration. Nobody else touches it.

- [ ] F2.1 List the 47 builders (`grep -n '^  build\|^  create' src/countryside.js`)
      in the status file with the inventory ids each one produces.
- [ ] F2.2 For each builder, split into `layoutX()` + `meshXClassic(layout)`
      and route through `this.assets.build(...)` (§3.4). Move code; do not
      rewrite it. Every `this.random()` call stays in the same order.
- [ ] F2.3 After **each** builder, run the footprint golden. The diff must be
      empty. Commit per builder so a regression bisects to one commit.
- [ ] F2.4 Builders called from inside other builders (`createKawaraRoof`,
      `createKoushi`, `createEngawa`, `createChochinLantern`,
      `createClimbCrates`, `buildBirdNest`) get the same treatment, keyed by
      their component ids.
- [ ] F2.5 Leave `_mergeStatics()` behaviour unchanged for classic. For kit
      instances, merge everything not listed in `instance.live`.
- [ ] F2.6 Run the full-game headless boot (`/__boot.html`). No new console
      output beyond the known AudioContext warnings.

Done when: golden diff empty, all review sheets render as the Phase 0
captures, headless boot clean.

### Lane `f3-systems-split`

Owns, for the duration: `src/vegetation.js`, `src/interior.js`,
`src/hidden_places.js`, `src/ambient_life.js`, `src/particles.js`.

- [ ] F3.1 Same split and `assets.build` routing for the 21 builders in
      these modules. `hidden_places.js` must still be built before
      `Vegetation` and attached after `ContextActionManager`.
- [ ] F3.2 Interior: keep knockable physics and nap/interaction anchors in
      the layout data so a kit interior inherits them.
- [ ] F3.3 Extend the footprint golden to the interior and hidden places.
- [ ] F3.4 `src/sky.js`, `src/postfx.js` and `src/grass.js` are **not** split
      here. They are systems, handled in wave 2.3 by one lane each.

**Gate G-F:** G1 and G2 (Appendix C) pass on `fable/integration`; golden
diffs empty; operator may merge to `main` (classic remains default, so
players see no change). Integrator bumps the cache tag.

---

## 9. Phase 2 — Kyoto village kit (parallel)

Every village lane follows the same ten steps. The lane card only adds the
specifics.

### The standard lane recipe

- [ ] L1 **Claim** (§4.4). Create the status file.
- [ ] L2 **Read** the lab's `research.md`, its `js/recipes.js`, the matching
      rows in `labs/ASSET_COVERAGE.md`, and the classic builders named on
      the card.
- [ ] L3 **Choose** the specimen to promote for each inventory id: the best
      of the lab, not all of it. Write the choice and the reason in the
      status file. Where the review recorded a construction fix
      (`labs/REVIEW_2026-11-10.md`), promote the fixed version.
- [ ] L4 **Close gaps first.** For any id on the card with no focused study
      (Appendix D), add a lab specimen in `labs/<slug>/` before writing kit
      code. No study, no swap: an id that cannot get a study this pass stays
      classic and is listed as "deferred" with the reason.
- [ ] L5 **Promote** into `src/kit/<family>/`: one `defineAsset` per id,
      split into named parts, three tiers, params with ranges, `footprint`
      copied from the classic layout, lab materials replaced by
      `KitMaterials`.
- [ ] L6 **Compare** in the game: `?assets=classic` against
      `?swap=<id>:modular` from the same camera at dawn, noon, dusk and
      night. Save the pairs under `docs/fable/status/<lane>/` (small JPGs).
- [ ] L7 **Check**: `node tools/kit_check.mjs`, the contract test page for
      the family, the footprint golden (must still be empty for classic,
      and within waivers for modular), `node tools/labs_check.mjs`.
- [ ] L8 **Self-review** against AAA-1…AAA-10. Tick each in the status file
      or write why it is not met.
- [ ] L9 **Handoff**: write `docs/fable/handoff/<lane>.md`: inventory rows
      to add or update, the `production` adapter ids, new part names, any
      footprint waiver, any helper that should move to shared kit code.
- [ ] L10 **PR** into `fable/integration`. One lane, one PR.

### Wave 2.1 — props the cat walks past

| Lane | Family | Lab | Classic builders | Inventory focus | Notes |
|---|---|---|---|---|---|
| `v-lanterns` | `lanterns` | 11 | `buildToroLantern`, `createChochinLantern`, `buildLanterns` | toro, chochin, street lamps, andon | Hollow firebox with real apertures. Keep the per-lantern kindle onset; expose `lanternOn` through `update(env)` |
| `v-fences` | `fences` | 12 | `buildBambooFence`, `buildBambooCorral` | bamboo-fence, corral, corral-sign | One instanced culm geometry. The corral keeps Larry's patrol bounds in `footprint` |
| `v-rocks` | `rocks` | 13 | `buildPathBoulders`, `buildKeyHidingRock` | path-boulders, key-rock | The key rock's hiding interaction anchor must not move |
| `v-garden` | `garden` | 14 | `buildShishiOdoshi`, `buildWindChime`, `buildOfferingBells` | shishi, wind-chime, offering bells | The pour follows the moving mouth; clack timing drives the existing sound call |
| `v-greenery` | `greenery` | 15 | `buildStreetBushes`, `buildStreetGreenery`, `buildBambooGrove` | street bushes, greenery, bamboo grove, roadside moss | Bamboo grove lives in `vegetation.js`. Must register grass exclusions as today |
| `v-alley` | `alley` | 16 | `createClimbCrates`, `buildVillageStreet` clutter | crates, sake barrel, pots, signs | Climb crates are gameplay: collider tops must match exactly. Modern props stay out unless D4 says otherwise |
| `v-keepsakes` | `keepsakes` | 17 | `buildYarn`, `buildSecretKey`, reward and food builders | yarn, key, dango, jade paw, fish items | Quest logic finds these by name; keep the names. Four items have no study yet (L4) |
| `v-nest` | `nest` | 10 | `buildBirdNest` | nest, eggs, feather | The nap/climb-in anchor stays |

**Gate G-V1:** all eight merged; G1, G2, G3 pass; budgets (D1) hold with the
eight families on `modular`; Reviewer spot-checks two lanes end to end. If
the pipeline needed a rule change, update §3–§5 before wave 2.2 starts.

### Wave 2.2 — landmarks where players stop

| Lane | Family | Lab | Classic builders | Notes |
|---|---|---|---|---|
| `v-shrine` | `shrine` | 06 | `buildTorii`, `buildShrine`, `buildMistAltar`, `buildOfferingBells` | Lintel underside solved at each leaning post. Offering box and mist altar need studies. The shrine thicket open/close (`setShrineThicketOpen`) and bell interaction must still work |
| `v-machiya` | `machiya` | 04 | `buildMachiyaTeaHouse`, `buildMachiyaResidence`, `buildSecretMachiya`, `buildVillageHouse`, `createKawaraRoof`, `createKoushi`, `createEngawa` | The largest prop lane; split it into two PRs (components first, then buildings) if the diff passes about 1500 lines. Doors, the secret door, lock plate and the tea-house entry trigger stay in `footprint`. Closes the open item "skirt walls and fence/lantern detail for the tea house and residence" |
| `v-pagoda` | `pagoda` | 08 | `buildDistantPagoda` | Promote `buildPagoda` with the `valley` preset and its hero/mid/far tiers plus the 16-view impostor. Reused by `s3-vista` and `r4-festival` |
| `v-hidden` | `hidden` | 07 | `hidden_places.js` | Eight of sixteen rows lack studies. Build order and exclusion/water rects are fixed. Never touches the summit |
| `v-interiors` | `interiors` | 21 | `interior.js` | Thirteen of nineteen rows lack studies. Knockables keep their physics; the bream platter and bonsai need specimens |

**Gate G-V2:** as G-V1, plus the headless full-game boot on `?assets=modular`.

### Wave 2.3 — systems and life

These replace shaders and simulations, not just meshes. Each lane is the
single writer of one system module for its duration (granted by the
Integrator in the lane's first commit message).

| Lane | Family | Lab | System module | Notes |
|---|---|---|---|---|
| `v-ground` | `ground` | 01 | ground builders, `BiomeMask` hookup | Port the `GroundField` and the one ground material (height blend, hex tiling, pavings, wetness, puddles, snow). The field must keep writing the grass `BiomeMask`. Mark buffers render with `autoClear = false`. Classic ground stays for `low` |
| `v-water` | `water` | 02 | `buildRiverAndBridge`, `buildPaddies`, water materials | CPU water field driving the chosen shader style; one bridge chosen from the eight; paddies through the seasons. Ripple pools (`rainRipples`, cat and koi) must keep working. Wade/swim behaviour is the player's, not this lane's |
| `v-ranges` | `ranges` | 03 | `buildEdgeForest`, `buildFoothillForest`, `buildEdgeUndergrowth`, `buildMountains`, `buildMistRing`, `buildVillage`, `buildDawnMist` | All seven landscape rows lack a lab adapter. Shared with the summit horizon |
| `v-sky` | `sky` | 05 | `src/sky.js`, `src/postfx.js` | Clouds and cloud shadows. Post-processing changes are tier-gated; `low` keeps today's chain. The summit has its own sky lights; do not change them here |
| `v-weather` | `weather` | 20, 22 | `src/particles.js`, dappled light | Rain rings, wetness, settling snow, petal drifts, komorebi. The two retired builders in the inventory stay retired |
| `v-trees` | `trees` | new | `src/vegetation.js` tree builders, `src/foliage.js` | New lab first (D5). Hero trees keep leaf sprays, rim keeps leaf masses. `src/foliage.js` is shared with the summit: additive changes only |
| `v-critters` | `critters` | 18 | `src/ambient_life.js` | Koi with dorsal and forked tail, paired butterfly wings, flock. Guardian crows need a study. Ripple and startle hooks stay |

`src/grass.js` is already at the new standard and is **not** rebuilt. Lanes
that change the ground or add footprints rely on its biome mask.

**Gate G-V3:** all village lanes merged or explicitly deferred; G1–G4 pass;
performance re-measured at the four spots on all three tiers and compared
with the budgets; operator may merge to `main`.

---

## 10. Phase 3 — Modular characters

Today one `Cat` class builds the skeleton, materials, coat, face, collar and
shadow, and also owns gait, poses, moods and idle behaviour. Villagers, the
Roof Road's Chidori, the lab walker, the review sheets and cadJS all call it.
The goal is a character made of swappable parts with `Cat` kept as the
facade.

### Lane `c1-rig-split` (serial, Integrator or strongest model)

Owns `src/cat.js`, `src/npc.js`, `src/player.js` for the duration.

- [ ] C1.1 Create `src/characters/`: `rig.js` (skeleton, leg IK wiring),
      `parts/coat.js`, `parts/face.js`, `parts/collar.js`, `parts/shadow.js`,
      `behaviour/locomotion.js`, `behaviour/poses.js`, `behaviour/mood.js`,
      `character.js` (`CharacterDef` → assembled character).
- [ ] C1.2 Move code out of `Cat` into those modules without changing
      behaviour. `Cat` keeps every public method and property it has today
      and delegates.
- [ ] C1.3 `CharacterDef`: `{ id, build, palette, face, accessories: [slots],
      scale, personality }`. Accessory slots: `collar`, `bell`, `head`,
      `back`. `setMasterCat()` becomes a slot swap.
- [ ] C1.4 Proof of no change: every `tools/cat_preview.html` sheet
      (anatomy, face, gait, stride, poses, sleep, closeup, coat, npcs)
      matches the Phase 0 capture; `&perf=1` build and update timings are
      within noise; the Roof Road autopilot test still passes.
- [ ] C1.5 The sculpt cache per body type keeps working; a part swap must
      not trigger a re-sculpt.

### Parallel lanes after C1

| Lane | Scope | Notes |
|---|---|---|
| `c2-michi` | Player cat: coat, face, collar, bow, bell, master gold and twin bells, contact shadow | Five "Cat components" rows have no focused study. Add them to the villagers lab or a new cat lab first. Eye shine at dusk from lab 19 |
| `c3-villagers` | Luna, Mochi, Kuro as `CharacterDef`s; idle grooming; personalities | `tools/cat_preview.js` mirrors coat palettes: keep both in step, or better, make it read the defs. Schedules stay in `main.js` |
| `c4-creatures` | Larry the turtle, guardian crows, as non-cat `CharacterDef`s with their own simple rigs | Larry's patrol and the Jade Paw challenge logic stay in `countryside.js`; only the body is swapped |

Character tiers: `hero` (full parts), `mid` (no outline pass, simpler face),
`far` (single merged mesh). Quality `low` keeps the classic character.

**Gate G-C:** cat sheets match, villagers part the grass as before, saves
load, G1–G4 pass.

---

## 11. Phase 4 — Meditation hilltop

**Closed until decision D2.** `AGENTS.md` says the summit is owned by a
separate effort. If the operator opens it, `AGENTS.md` is updated in the same
commit that starts `s1`.

The summit has 32 inventory rows and one focused study. It has its own seeded
stream (`this.rng`, seed `20261004`), its own terrain function
(`terrainHeightAt`) and a protected view: nothing may cover the city or the
sea from the meditation seat (`perchSightlineAt()`).

### Lane `s1-summit-split` (serial, single writer of `mountaintop.js`)

- [ ] S1.1 Record a summit golden: object transforms plus the full
      `node tools/summit_test.mjs` output, and every `summit_preview.html`
      view from Phase 0.
- [ ] S1.2 Split the 27 builders into `src/summit/` modules by concern:
      `terrain.js`, `clearing.js` (meadow, stone, ensō, fūrin, torii, steps,
      path), `planting.js`, `vista.js` (city, pagoda, bay, harbour, bridge,
      Ferris wheel, horizon), `weather.js`, `wildlife.js`, `light.js`.
      `SummitManager` stays in `mountaintop.js` as the facade with the same
      public API and state machine.
- [ ] S1.3 Layout/mesh split and `assets.build` routing as in §3.4, using
      the summit's own stream. No new `this.rng()` draws; the summit grass
      draws nothing from it today and must not start.
- [ ] S1.4 `tools/summit_test.mjs` rewrites import statements of
      `mountaintop.js` to stubs. Update the harness for the new imports
      **without removing any check**.
- [ ] S1.5 `node tools/verify.mjs` wiring checks grep `mountaintop.js` for
      specific strings. Where code moved, point the check at the new file;
      do not delete the check.

### Parallel lanes after S1

| Lane | Scope | Reuses | Notes |
|---|---|---|---|
| `s2-clearing` | Meadow clearing, meditation stone, ensō, fūrin, sun pool and motes, entrance torii and steps, lower stone path and lanterns, brow stones, summit trees | `shrine`, `lanterns`, `rocks`, `garden`, `trees` kits | Add Summit Lab specimens first (the lab has five). Sightline cap applies to every planted or placed object |
| `s3-vista` | Kyoto city, Higashiyama pagoda and evening lanterns, bay water and glints, harbour skyline, islands, bay bridge, Ferris wheel, horizon ranges, cloud banks | `pagoda` far tier and impostor, `ranges`, `sky` | Lit-city wave from the Summit Lab. The optional GLB roofscape keeps its fallback |
| `s4-summit-life` | Snow, rain, pollen, petals, butterflies, fly-by birds, shrine beacon rays, summit lights | `weather`, `critters` | Weather must keep matching the valley's state on entry |

Meditation is the point of this place. Changes are judged first from the
seat: `tools/summit_preview.html?view=meditation` at four times of day.

**Gate G-S:** summit test and verify pass with no check removed; meditation
view accepted by the operator; G1–G4 pass.

---

## 12. Phase 5 — Roof Road, level two

The Roof Road is a playable prototype: seven mouths from the bridge to the
top of a Gion Matsuri float, with the five Okuribi fires as the finale. Its
pure modules (`rail`, `level`, `physics`, `reach`, `autopilot`) are proven by
38 checks. Its meshes are one 2022-line file, and none of it is in the
inventory.

The run's geometry is gameplay. **Platform heights, widths and positions in
`rooftops/js/level.js` do not change in this phase** except by a lane that
runs `node tools/rooftop_test.mjs` after every change and keeps all checks
passing.

### Lane `r1-roof-split` (serial, single writer of `rooftops/js/build.js`)

- [ ] R1.1 Inventory: add a `Roof Road` group to
      `labs/asset_inventory.json` (remove it from `exclusions`), one row per
      piece type and character. Expect roughly forty rows: bridge and
      giboshi, kido gate, machiya roofs (hira and tsuma), façades and eave
      details, side alley, drying decks, futon racks, yuka decks, Takase
      canal and banks, stepping stones, footbridge, takasebune and boatman,
      cherry boughs, Nishiki canopy and skylight bridge, market stalls,
      cistern, chimney cap, laundry and lantern lines, yatai stalls, lantern
      racks, hoko float and wheels, shingi mast, hayashi musicians, temple
      gate, Shōki, treats, Chidori, distant city, pagoda, sky, hills and
      fires, atmosphere effects. Update `tools/labs_coverage.mjs` totals and
      its test.
- [ ] R1.2 Split `build.js` into `rooftops/js/pieces/<type>.js`, one builder
      per piece type, registered in a `PIECES` table that `buildWorld`
      walks. Move code; do not redesign.
- [ ] R1.3 Route each piece through the same `assets.build` contract so the
      Roof Road has `classic` and `modular` sets too.
- [ ] R1.4 Proof: the Phase 0 captures of all seven mouths and the finale
      match; `node tools/rooftop_test.mjs` passes 38/38; `?auto=1` completes.
- [ ] R1.5 Register a Roof Road lab in `labs/registry.js` (promoting the
      `roofroad` extra) with a shelf of the piece types, so each has a
      specimen and a catalog adapter.

### Parallel lanes after R1

| Lane | Mouths | Scope | Reuses |
|---|---|---|---|
| `r2-roofs-streets` | 1–2 | Sanjō bridge, giboshi, kido gate, Awataguchi machiya roofs and façades, side alley, Pontochō rows, yuka decks | `machiya`, `lanterns`, `alley`, `water` kits |
| `r3-canal-market` | 3–5 | Takase canal, banks, stepping stones, footbridge, takasebune, cherry boughs, Nishiki canopy, skylight bridge, stalls, laundry sky, cistern, chimney | `water`, `trees`, `alley` kits |
| `r4-festival` | 6–7 | Hoko-chō yatai, lantern racks and ascent, the hoko float (wheels, textiles, roof, mast), temple gate, distant city, pagoda, hills and the five fires | `pagoda`, `ranges`, `lanterns` kits |
| `r5-roof-cast` | all | Chidori the guide cat, the seven Shōki (several poses), the boatman, the hayashi musicians | `src/characters/` from Phase 3 |

Every Roof Road lane also runs the standard lane recipe (§9), with
`node tools/rooftop_test.mjs` added to L7.

### Lane `r6-game-wiring` (serial, Integrator; needs D3)

Implements the spec's §8.2 table. Summarised:

- [ ] R6.1 Giboshi caps and a Shōki on the valley bridge
      (`buildRiverAndBridge`), caps kept out of `_mergeStatics` so the glow
      can animate.
- [ ] R6.2 Odoi bank and bamboo thicket with its **own** `mulberry32(0x0D01)`
      stream; registers exclusions and colliders; `setOdoiThicketOpen(t)`.
- [ ] R6.3 `src/rooftops/manager.js`: `RooftopManager` shaped like
      `SummitManager` (`setUnlocked`, `enter`, `exit`, `setActive`,
      `update`), pocket origin `(0, −2400, 0)`.
- [ ] R6.4 The pure runner modules moved into `src/rooftops/` verbatim;
      `rooftops/js/` re-exports them so the prototype page and the test keep
      working from one source.
- [ ] R6.5 Save: `worldFlags.rooftopsUnlocked`, `rooftopShoki` (7-bit mask),
      `rooftopFinished`. Never save a pocket position.
- [ ] R6.6 Journal and XP hooks, `music.setScene('Rooftops')`, bell audio
      for the posts.
- [ ] R6.7 `index.html`: the noren veil as a **sibling** element. Do not
      touch `#summit-transition`.
- [ ] R6.8 Tests: extend `tools/verify.mjs` with wiring checks for the
      rooftop manager in the style of the summit ones; a Node state-machine
      test `tools/rooftop_manager_test.mjs` modelled on `summit_test.mjs`.

No fail states: a fall puts the cat back on a roof, as the prototype does.

**Gate G-R:** 38/38 plus the new manager tests; a full play-through from the
valley bridge to the finale and back on `classic` and `modular`; saves from
before the Roof Road load; operator may merge to `main`.

---

## 13. Phase 6 — Tooling: catalog, cadJS, AI, audio

### Lane `t1-catalog` (can start after G-V1)

- [ ] T1.1 `catalog/js/asset-loader.mjs`: add variant `production`, built
      through the kit registry via `labs/shared/game.js`. Still an allowlist;
      source text is never evaluated.
- [ ] T1.2 Inspector: three-way compare (original, lab study, production),
      tier switch, param controls from the schema.
- [ ] T1.3 **Swap board:** per-asset variant and params, saved as
      `kit-overrides.json` through `catalog/server.mjs` with the same
      atomic, revision-checked write used for `metadata.json`. On a static
      host it downloads the file instead.
- [ ] T1.4 Thumbnails for production variants, with provenance, per
      `catalog/THUMBNAILS.md`.
- [ ] T1.5 Tests: extend `catalog/tests/asset-loader.test.mjs` and
      `server.test.mjs`; `node tools/catalog_check.mjs` passes.

### Lane `t2-cadjs`

- [ ] T2.1 Handoff `/cadJS/?asset=<id>&variant=production` loads the kit
      asset with its part tree named and selectable.
- [ ] T2.2 Parameter panel generated from `params`; edits rebuild the asset
      live; Undo/Redo works.
- [ ] T2.3 AI agent: a validated `set_asset_params` action and a
      `swap_asset_variant` action in `agent-protocol.mjs`. Plans are shown
      for review and applied as one undoable transaction, as today.
- [ ] T2.4 Asset package **schema 2**: explicit create/remove/reparent of
      named parts, with a migration from schema 1. Schema 1 packages keep
      importing. This lifts the structural limitation in the cadJS manual.
- [ ] T2.5 "Push to game" writes `kit-overrides.json` for param edits and
      keeps writing `cad-overrides.json` for free-form edits.
- [ ] T2.6 `cd cadJS && npm run check` passes; manual updated.

### Lane `t3-audio`

- [ ] T3.1 List every new asset with a sound moment (shishi-odoshi clack,
      fūrin, lantern kindle, bell, water over stones, noren, float bells,
      boat pole) in `dawCAT/docs/GAME_AUDIO_CATALOG.md`.
- [ ] T3.2 Author or map sounds in dawCAT; export through the existing
      zero-file `sfx-pack.js` route.
- [ ] T3.3 Kit assets call sound through an `env.audio` hook; no kit file
      imports `src/audio.js` directly. `cd dawCAT && npm test` passes.

**Gate G-T:** catalog and cadJS suites pass; a param edit made in cadJS
appears in the game after reload and is reverted by deleting the override
file.

---

## 14. Phase 7 — Area polish passes

One lane per area, after its assets are in. These lanes edit only kit
params, `kit-overrides.json` defaults, and their own area notes; structural
fixes go back to the owning family lane as issues in the status file.

For each area (`a1-village`, `a2-hilltop`, `a3-rooftops`):

- [ ] A.1 **Walk it at cat height** along three fixed routes, at dawn, noon,
      dusk and night, in clear, rain and snow where the area supports it.
      Capture every 10 m. List every frame where something breaks the bar.
- [ ] A.2 **Composition:** landmark sightlines, lantern rhythm along paths,
      clutter density, what closes each view.
- [ ] A.3 **Light:** continuity between neighbouring assets, lantern falloff,
      wet and snow response, no asset that ignores fog or time of day.
- [ ] A.4 **Life:** something moves in every view (cloth, water, leaves,
      critters, villagers), and nothing moves that should not.
- [ ] A.5 **Sound:** each landmark has its sound; nothing loops audibly.
- [ ] A.6 **Performance:** frame time, draw calls and triangles at the fixed
      spots on all three tiers against the budgets. Tune tier distances
      before cutting detail.
- [ ] A.7 **Comfort:** reduce-motion, high-contrast prompts, large text and
      FOV still behave.
- [ ] A.8 Write `docs/fable/status/<lane>.md` with before/after pairs against
      the Phase 0 captures and the remaining issues, ranked.

**Gate G-A:** operator accepts each area from the capture set.

---

## 15. Phase 8 — Hero images and README rewrite

### Lane `h1-hero`

Hero images are **real frames from the game** on `?assets=modular`. No
generated or painted-over image is presented as a capture (D8).

- [ ] H1.1 `tools/hero_capture.mjs` + `docs/images/hero/shots.json`: each
      shot is `{ id, page, cam, hour, weather, season, assets, width,
      height }`. It drives headless Chromium (ANGLE Metal on the Mac, as the
      labs review did) against the served repo, using the existing capture
      flags (`?shot=1&nohud=1`, `?cam=`, `?hour=`). Playwright stays outside
      the repo, pointed at by `PLAYWRIGHT_MODULE` like the catalog suites.
- [ ] H1.2 Shot list, minimum twelve, composed in Photo Mode first then
      written into `shots.json`:
      1. Title hero: the valley at golden hour, pagoda beyond the roofs
      2. Michi at the torii, lanterns kindling at dusk
      3. The machiya lane at cat height after rain
      4. River, bridge and paddies in morning mist
      5. Moon Pool at night with floating lanterns
      6. Lantern Glade self-kindling
      7. Tea-house interior, light through shoji
      8. Luna, Mochi and Kuro together
      9. The meditation seat above the Kyoto basin at dawn
      10. The summit vista at night, the city lit
      11. Roof Road: Michi and Chidori on the roofs at Awataguchi
      12. Roof Road finale: the float top with the Okuribi fires
      13. A parts sheet: one asset exploded into its named parts
      14. A before/after pair: classic and modular from one camera
- [ ] H1.3 Output 2560×1440 masters outside the repo; commit README-sized
      JPGs under about 1 MB each to `docs/images/`, replacing the six
      `capture-*.jpg` files and `title-screen.jpg` (the video poster).
      Descriptive kebab-case names.
- [ ] H1.4 Update `docs/images/README.md`: which files are captures, the
      shot id, date, commit and command that produced each.
- [ ] H1.5 The teaser video is out of scope unless the operator asks.

### Lane `h2-readme`

A full rewrite of `README.md`, not an append. Keep it true: every claim maps
to something merged.

- [ ] H2.1 Structure:
      1. Title, badges, play button, one hero image
      2. What it is, in three sentences
      3. The three areas: Kyoto village, meditation hilltop, Roof Road, each
         with a hero image and what you can do there
      4. From the build: the capture gallery (real frames, dated)
      5. What is new: the modular asset system, in plain words
      6. Play: controls (desktop, touch), comfort settings
      7. Quality and compatibility: `assetSet`, tiers, `?assets=`, low-power
         devices, what has and has not been benchmarked
      8. Project setup: serve, requirements, the one-server option
         (`node cadJS/server.mjs`)
      9. Architecture: the kit, the contract, the part tree, the folder map
      10. Make and swap an asset: lab → kit → catalog → cadJS → game, as a
          short tutorial
      11. Companion tools: Asset Library, cadJS, dawCAT, the Labs
      12. Verification: the commands in Appendix C
      13. Roadmap, how it was made, licence, credits
- [ ] H2.2 Update `INSTALL.md`, `QUICKSTART.md` (Roof Road, new settings),
      `AGENTS.md` (layout table, cache-tag file list, kit rules, summit
      ownership, status), `catalog/README.md`, `cadJS/README.md` ("Game
      boundary" and "Structural limitation" sections), `labs/ASSET_COVERAGE.md`
      (regenerated, not hand-edited).
- [ ] H2.3 Check every link and image path resolves; check the page at
      desktop and phone widths on GitHub.

**Gate G-H:** README reviewed by the operator.

---

## 16. Phase 9 — Final review, then the default flip

### Lane `z-final` (Fable)

- [ ] Z.1 Fresh clone of `fable/integration`. Run the entire verification
      matrix. Record real output.
- [ ] Z.2 Classic regression: footprint golden empty; all Phase 0 captures
      reproduced on `?assets=classic`; headless full boot clean.
- [ ] Z.3 Modular: headless full boot clean; contract suite green for every
      registered asset at every tier; no console errors or shader failures
      across the three areas.
- [ ] Z.4 Fallback drill: delete one family folder locally, confirm the game
      runs with classic assets for that family and one warning; restore.
      Corrupt `kit-overrides.json`, confirm it is ignored.
- [ ] Z.5 Save drill: a save made on `main` before this project loads on
      both sets; a save made on modular loads on classic.
- [ ] Z.6 Performance: the four valley spots, the meditation seat, three
      Roof Road mouths, on all three tiers, against budgets.
- [ ] Z.7 Code review of every hot-file diff since Phase 0 and a sample of
      at least one asset per family against AAA-1…10.
- [ ] Z.8 Inventory truth: `labs/ASSET_COVERAGE.md` regenerated; every
      "shipped" claim in the README matches the inventory.
- [ ] Z.9 Write `docs/FABLE_REVIEW_<date>.md`: findings ranked, what was
      tested and how, what was not tested (phones, low-end GPUs, listening
      tests), and a go / no-go for the flip.

### The default flip (operator approval required)

- [ ] X.1 Settings menu: "Asset set: Auto / Classic / Modular".
- [ ] X.2 Default `assetSet` becomes `'auto'`: classic on `low`, modular
      otherwise. The governor may drop a struggling device back to classic
      at the next load, never mid-session.
- [ ] X.3 Bump the cache tag; merge `fable/integration` into `main`; watch
      the live site.
- [ ] X.4 Rollback is one line: default back to `'classic'`.

### Retiring classic (not part of this project)

Classic builders stay until real-device benchmarks exist and the operator
decides. Removing them is a separate, explicitly approved change.

---

## Appendix A — Worker prompt template

Paste, fill the braces, and give to a medium or smaller model. One lane per
prompt.

```text
You are Worker {A|B|C} on the Michi-Neko modular asset swap.
Your lane: {lane-id}. Your worktree: ../michi-wt/{lane-id} on branch fable/{lane-id}.

Read, in this order, and nothing else first:
1. AGENTS.md
2. BUILD_GUIDE_FABLE.md §3 (architecture), §5 (rules), and the card for {lane-id}
3. docs/fable/status/{lane-id}.md if it exists

Your files (edit only these):
- src/kit/{family}/**
- labs/{slug}/**
- docs/fable/status/{lane-id}.md and docs/fable/handoff/{lane-id}.md

Never edit: any file in the hot-file list in §4.5, any ?v= cache tag,
any test in a way that removes or loosens a check.

Do the standard lane recipe, steps L1 to L10, in order. After each step,
tick it in your status file and commit.

Checks you must run and paste the real output of:
  node tools/kit_check.mjs
  node tools/labs_check.mjs
  node tools/check_syntax.mjs
  {lane-specific checks from Appendix C}
Open tools/kit_contract_test.html?family={family} and
tools/footprint_golden.html in the served worktree and record the results.

If you are blocked after two attempts at the same problem: write
"BLOCKED: <what you tried, what happened>" at the top of your status file,
commit, push, and stop. Do not work around it by editing files you do not own.

When done: rebase on origin/fable/integration, rerun the checks, push, open a
PR into fable/integration, and report: files changed, checks run with their
output, assets promoted, assets deferred and why, footprint waivers.
```

Sizing guidance for small models: one family, at most about ten assets and
about 1500 changed lines per PR. Split a larger lane into `-a` and `-b`
branches with separate status files.

---

## Appendix B — Lane status file template

`docs/fable/status/<lane-id>.md`

```markdown
# <lane-id>

- Worker / model:
- Claimed:            (date, time)
- Branch:             fable/<lane-id>
- Base commit:
- State:              in progress | BLOCKED | ready for review | merged

## Assets
| Inventory id | Promoted from (lab/specimen) | Parts | Tiers | Footprint | State |
|---|---|---|---|---|---|

## Steps
- [ ] L1 Claim
- [ ] L2 Read
- [ ] L3 Choose
- [ ] L4 Close gaps
- [ ] L5 Promote
- [ ] L6 Compare
- [ ] L7 Check
- [ ] L8 Self-review (AAA-1 … AAA-10 per asset)
- [ ] L9 Handoff
- [ ] L10 PR

## Checks run (command → real result)

## Deferred assets and why

## Footprint waivers requested

## Notes for the Integrator
```

---

## Appendix C — Verification matrix

Existing commands are from `AGENTS.md` and `catalog/README.md`. New ones are
created in Phase 1 and marked *(new)*.

| Gate | Command | Proves |
|---|---|---|
| **G1** every merge | `node tools/check_syntax.mjs` | All modules parse (`src/*.js` and `src/kit/**`) |
| | `node tools/verify.mjs` | Syntax, `main.js` wiring (summit + kit), summit state machine, `index.html` sanity, kit checks + units |
| | `node tools/kit_check.mjs` | Kit static rules (ids, exports, imports, determinism, params, tags, generated index) |
| | `node --test tools/kit_test.mjs` | Runtime / contract / rng units; `kit_check` fixture trees |
| | `node tools/cad_overrides_test.mjs` | Existing overrides apply as before; kit part names resolve first |
| | `node tools/labs_check.mjs` | Labs syntax, cache tags, registry, coverage report (regenerate after editing `main.js`/`countryside.js`) |
| | `git diff --check` | No whitespace damage |
| **G2** every gate | `tools/footprint_golden.html` | Classic layout, colliders, anchors unchanged |
| | `node tools/kit_contract_test.mjs` (`tools/kit_contract_test.html`) | AAA-2, 3, 7, 8, 9 + footprint for every asset and tier; `0 assets` passes; self-test; draw-call merge count |
| | `node tools/game_shot.mjs --query "…&shot=1&assets=classic"` vs `…modular` | Same frame on both sets where nothing is swapped (`--diff` at `maxDelta 0`); two boots of one set identical |
| | `tools/labs_geometry_test.html` | Lab construction checks (32 today) |
| | `node tools/rooftop_test.mjs` | Roof Road: 38 checks, autopilot completes |
| | `node tools/summit_test.mjs` | Summit state machine |
| **G3** catalog and tools | `node tools/catalog_check.mjs` | Catalog integrity |
| | `node tools/labs_coverage.mjs` and `node --test tools/labs_coverage_test.mjs` | Inventory and coverage totals |
| | `node --test catalog/tests/*.test.mjs` | Catalog units and API |
| | `cd cadJS && npm run check` | cadJS server modules and tests |
| | `cd dawCAT && npm test` | Audio studio |
| | `node tools/interiors_test.mjs`, `node tools/ranges_test.mjs` | Lab-specific suites |
| **G4** full game | `/__boot.html` headless, on `?assets=classic` and `?assets=modular` | The only check that exercises `main.js` wiring. 15–20 minutes under SwiftShader |
| | Review sheets: `tools/cat_preview.html`, `tree_`, `town_`, `hidden_` | Seeded, repeatable renders against the Phase 0 captures (`node tools/capture_baseline.mjs --compare`; the cat sheets also have `node tools/cat_golden.mjs`) |
| | `summit_`, `grass_preview.html` and the Roof Road sheets | **Not pixel-repeatable** (time-driven loops, unseeded `Math.random`; see `docs/fable/baseline/captures.md`). Their gates are the numeric goldens and tests: `node tools/summit_test.mjs`, `node tools/rooftop_test.mjs`, the footprint and systems goldens |
| | Optional: `catalog/tests/browser-smoke.mjs`, `adapters-browser.mjs`, `cad-handoff-browser.mjs` | Catalog and cadJS in a real browser (needs external Playwright) |

The 44-check browser smoke suite described in `AGENTS.md` lives outside the
repo in `/tmp/michi-test/`. It may no longer exist on this machine; Phase 0
records whether it does. Do not report it as run unless it was.

---

## Appendix D — Asset gap list by lane

Starting point for step L4, from `labs/ASSET_COVERAGE.md` (2026-11-10). Phase
0 step P0.6 regenerates the authoritative version. Ids are inventory ids.

| Lane | Assets without a focused lab study |
|---|---|
| `v-lanterns` | `courtyard-toro`, `pool-toro` (shared with interiors and hidden) |
| `v-fences` | `corral-sign` |
| `v-keepsakes` | `dango`, `jade-paw`, `secret-fish`, `interior-fish` |
| `v-shrine` | `offering-box`, mist altar |
| `v-machiya` | `namako`, `tea-bench`, `secret-door`, `lock-plate`, `village-street` |
| `v-hidden` | `pool-apron`, `pool-rim`, `pool-seat`, `pool-toro`, `lantern-glade`, `glade-floor`, `glade-bamboo`, `glade-seat` |
| `v-interiors` | `interior-frame`, `tokonoma`, `scroll`, `bonsai`, `chabudai`, `zabuton`, `courtyard-toro`, `courtyard-wall`, `knockables`, `secret-tatami`, `secret-table`, `secret-bed`, `secret-andon` |
| `v-ground` / `v-water` | `paddy-bunds` |
| `v-ranges` | `foothill-forest`, `distant-village`, `mist-ring`, `dawn-mist` |
| `v-sky` | `stars`, `moon`, `sky-light`, `god-rays`, `ao`, `atmosphere`, `grade` |
| `v-weather` | `fireflies`, `grass-fireflies`, `dust-motes`, `scent`, `splash`, `landing-dust` |
| `v-trees` | `sakura`, `maples`, `pines`, `rim-trees`, `tree-trunks`, `tree-canopies`, `roadside-moss` |
| `v-critters` | `guardian-crows` |
| `c2-michi` | `michi`, `cat-coat`, `cat-face`, `cat-collar`, `master-bells`, `cat-shadow` |
| `c4-creatures` | `larry`, `guardian-crows` |
| `s2`–`s4` | 31 summit rows with review-sheet evidence only |
| `r1`–`r5` | every Roof Road asset (not yet inventoried) |

`summit-transition` (video) and `blender-roofscape` (optional GLB) are media
with fallbacks, not kit assets. The four inactive inventory rows stay
inactive.

---

*This guide is a plan. Sections 3 and Appendix C describe files that do not
exist until Phase 1 builds them. When what is built differs from what is
written here, the Integrator corrects this file in the same merge.*
