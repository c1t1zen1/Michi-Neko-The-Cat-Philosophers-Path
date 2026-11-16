# Lane brief: f2-countryside-split (Phase 1 — layout/mesh split of every builder in src/countryside.js)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/f2-countryside-split   Branch: fable/f2-countryside-split
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/f2-countryside-split-report.md
Common rules: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md
Lane card: BUILD_GUIDE_FABLE.md §8 "Lane f2-countryside-split" (F2.1–F2.6) and §3.3/§3.4. Read both closely.

You own `src/countryside.js` for the duration (hot file, granted). Nobody else touches it. You also own
`docs/fable/status/f2-countryside-split.md` and `docs/fable/handoff/f2-countryside-split.md`. Nothing else.

## The one thing that must not happen
The valley is seeded: one `mulberry32` stream, ~82 `this.random()` call sites. Every draw stays, in the same order.
The classic game must stay byte-for-byte the same on screen. Your net: `node tools/footprint_golden.mjs` (from lane
f1-golden, merged before you start) builds the valley headlessly and diffs (a) named object transforms, (b) colliders,
(c) exclusion rects, (d) anchors and (e) the number of rng draws consumed against `tools/golden/valley_classic.json`.
It must print equal (exit 0) after EVERY builder you split. Commit per builder (F2.3) so a regression bisects to one
commit. Never regenerate the golden (`--write`) to make it pass.
Golden hook coupling (from its reviewer): the page counts draws by intercepting the `this.rng =` assignment on the
instance (an accessor on `Countryside.prototype.rng`), and tracks `addOrientedPlatform`, `addSlopedRoofPlatforms` and
`_mergeStatics` on `Countryside.prototype`. Keep those names/assignments where they are; if you must move one, the
golden will fail loudly (`probe:false`, premerge warning) — that is a harness problem, not a valley regression: stop
and report it. Its "first builder to change" line locates where draw COUNTS diverge; a value-only reorder inside one
builder can be attributed downstream — read the collider/platform indices to find the real builder. Before you start,
copy the headless tool UNTRACKED: `git fetch origin && git show origin/fable/p0-browser:tools/headless.mjs > tools/headless.mjs`
(never stage it; when the controller says Phase 0 merged, delete it and `git rebase fable/integration`). Phase 0 capture
masters in `/Users/c1t1zen/Documents/GitHub/michi-wt/_baseline/` may still be in progress — use them at the END.

## Interfaces (frozen; lane f1-runtime is building the runtime in parallel)
- Runtime arrives as `options.assets` in `new Countryside(scene, options)` (f1-runtime's `src/main.js` passes it).
  Default when absent (review sheets, golden page): a classic pass-through. Import `CLASSIC_ASSETS` from
  `./kit/runtime.js?v=<tag>` if that file exists on fable/integration when you start; otherwise define a local
  `const CLASSIC_ASSETS = { build: (id, layout, classicFn) => classicFn(), update() {}, instances: [] }` with a comment
  that f1-runtime's export replaces it at merge (the Integrator reconciles). `isAssetInstance(x)`: the runtime exports
  it; local fallback `x && x.group && x.parts && typeof x.dispose === 'function'`.
- §3.4 shape: `buildX(...) { const layout = this.layoutX(...); return this.placeAsset('<inventory-id>', layout, () => this.meshXClassic(layout)); }`
  Every `this.random()` draw happens in `layoutX`, in the original order. `meshXClassic` draws nothing.
- Integrator ruling R12 (footprint registration — binding):
  1. Every routed builder's layout carries `layout.footprint = { colliders, exclusions, anchors }` as plain data in the
     classic formats (the same objects/fields the classic code pushes into `this.colliders`, `this.vegetationExclusions`,
     platforms, waterRects, etc.), computed in the layout step from the same arithmetic the classic code uses.
  2. One helper `placeAsset(id, layout, classicFn)`: classic → `classicFn()` (classic registration exactly as today);
     modular (result `isAssetInstance`) → add `instance.group` to the scene (or a parent named in the layout), register
     `instance.footprint` through the SAME registration code path classic uses, in the same order; mesh-reference
     anchors that gameplay holds (secret door/key/fish meshes, animated parts, lanterns list entries…) are bound from
     `instance.parts`/`instance.sockets` by part names declared in the layout (e.g. `layout.bind = { secretKeyMesh: 'key' }`).
  3. Kit assets default their footprint to `layout.footprint`; deviations are waivers recorded by the kit lane.
  4. F2.5: `_mergeStatics()` unchanged for classic; for kit instances merge everything not in `instance.live`.
  Write a small Node or page-level test proving placeAsset's modular path registers a fake instance's footprint
  exactly like the classic path (scratch fake instance; do not register any real kit asset).
- Inventory ids: use the ids in `labs/asset_inventory.json` (read-only for you). Builders that produce several ids
  (e.g. `buildVillageStreet`) route each sub-object separately where the classic code has a natural seam; record the
  id map in your status file (F2.1). Nested builders (F2.4: `createKawaraRoof`, `createKoushi`, `createEngawa`,
  `createChochinLantern`, `createClimbCrates`, `buildBirdNest`) route by their component ids; their layout is computed
  inside the parent's layout step at the point the parent originally called them (draw order!).
- Sub-object ids later kit lanes depend on (route each under its own id where the classic code has a natural seam;
  otherwise route the parent whole and list why): shrine — `shimenawa`, `shrine-bell`, `offering-box`, `offering-bells`;
  machiya — `kawara-roof`, `koushi`, `engawa`, `timber-frame`, `upper-windows`, `noren`, `namako`, `tea-bench`,
  `secret-door`, `lock-plate`, `secret-tatami`, `secret-table`, `secret-bed`, `secret-andon`, `secret-fish`;
  props/items — `nest-eggs`, `guardian-feather`, `corral-sign`, `jade-paw`, `dango`, `sake-barrel`, `crates`, `chochin`;
  ground/water — `path`, `path-slabs`, `path-shoulders`, `path-boulders`, `key-rock`, `river`, `bridge`, `paddies`,
  `paddy-bunds`, `rice`, `water-ripples`, `rain-ripples`, `valley-ground`; landscape — `mountains`, `edge-forest`,
  `edge-undergrowth`, `foothill-forest`, `distant-village`, `mist-ring`, `dawn-mist`; creatures — `larry` (body only;
  patrol/Jade Paw logic stays in countryside.js).

## Steps
F2.1–F2.6 as written. Work builder by builder, smallest/simplest first to settle the pattern, then the big ones.
After each: `node tools/footprint_golden.mjs` (must exit 0) and `node tools/check_syntax.mjs`; commit with the
builder name in the subject. Every ~10 builders also run `node tools/verify.mjs`. At the end: review sheets
(`tools/town_preview.html`, `hidden_preview.html`, `tree_preview.html`, `grass_preview.html` sheets) captured with
`node tools/headless.mjs` and `--diff`ed against the Phase 0 masters in `/Users/c1t1zen/Documents/GitHub/michi-wt/_baseline/`
(noise floor in `docs/fable/baseline/captures.md`), and the full headless boot (F2.6). Line endings: check whether
countryside.js is CRLF and preserve it.
If a builder genuinely cannot be split without changing draw order or output, leave it unsplit, route it whole
(`placeAsset(id, { ...positional args }, () => this.buildXOriginal(...))`), and list it with the reason.

## Done when
Golden equal after every commit (log the final run); verify/check_syntax/labs_check/`git diff --check fable/integration...HEAD` green; review
sheets within the noise floor; headless boot clean; status file lists every builder → id(s) → split/whole. Push; PR.
