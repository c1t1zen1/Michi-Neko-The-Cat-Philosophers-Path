# Handoff: r1-roof-split

What the Integrator must know or do to merge lane `r1-roof-split` (guide
section 12, R1.1 to R1.5, under ruling R57), and what lanes `r2` to `r5` need
to build Roof Road kit pieces. The lane was granted `rooftops/js/build.js`,
`rooftops/js/game.js`, `labs/asset_inventory.json`, `labs/registry.js`,
`labs/roofroad/**`, `tools/labs_coverage*.mjs`, `labs/ASSET_COVERAGE.md` and
`tools/fable_swap_matrix.mjs`. It did not touch `rooftops/js/level.js`,
`rail.js`, `physics.js`, `reach.js`, `autopilot.js` or `companion.js`
(`git diff origin/fable/integration...HEAD` on them is empty).

## 1. What changed

- `rooftops/js/build.js` (2022 lines at 8702cc7) is a facade of about 280
  lines. `buildWorld(level, opts)` keeps its signature and return value; it
  walks `level.pieces` and builds each through the `PIECES` table, then builds
  the ground, the distant city, the three skyline pagodas and the pickups
  through the same contract (`extraLayout`, fix round 1).
- `rooftops/js/pieces/`: one module per piece type (35 files, code moved
  verbatim; only each builder's first line changed from `B.x = (pc, ctx) => {`
  to `export const x = (pc, ctx) => {`), `paint.js` (canvases, material set
  `M`), `common.js` (box, cyl, slope, frameGroup, ribbon, mergeByMaterial),
  `machiya.js` (ridge caps, hira/tsuma roofs, façades, eave details),
  `pickups.js` (Shōki, treats), `skyline.js` (distant city, pagodas) and
  `index.js` (the `PIECES` table). The 13 downtown builders stay in
  `downtown.js` (installed onto the table's `DT` object, as before onto `B`).
- `rooftops/js/game.js`: one import and three lines. It builds an
  `AssetRuntime` the way `src/main.js` does (`assetSet: 'classic'`,
  `search: location.search`, `quality: lowPower ? 'low' : 'high'`), awaits
  `preload()` (a no-op on classic) and passes it as `buildWorld(level, { …,
  assets })`.
- `tools/rooftop_golden.html/.js/.mjs` + `tools/golden/rooftop_classic.json`:
  the numeric golden of the built world, written from the unchanged code
  (772433e), and a routing self-test.
- `labs/roofroad/`: the Roof Road piece shelf (52 tiles); `labs/registry.js`:
  the `roofroad` extra now opens it (the lab links the run and its mouths).
- `labs/asset_inventory.json`: group `Roof Road`, 62 rows; the Roof Road is
  no longer an exclusion. `tools/labs_coverage.mjs` accounts for the Roof
  Road; `tools/fable_swap_matrix.mjs` has lanes r2 to r5.

## 2. Piece ids and lanes (the `PIECES` table)

`rooftops/js/pieces/index.js` is the source of truth. Each entry is
`type: piece(id, lane, file, build, decorate)`; `buildWorld()` builds every
piece with `assets.build(PIECES[type].id, pieceLayout(pc, index, rail), classic)`.
`tools/labs_coverage.mjs` fails if a type has no inventory row (group
`Roof Road`, sources naming its module); `tools/fable_swap_matrix.mjs` fails
if the matrix lane differs from the table's.

| Lane | Piece types → inventory ids |
|---|---|
| r2-roofs-streets | street `roof-street`, steps `roof-river-steps`, bridge `roof-bridge`, kido `roof-kido`, house `roof-machiya` (+ downtown `decorateHouse`), kura `roof-kura`, corner `roof-corner-house`, komayose `roof-komayose`, inuyarai `roof-inuyarai`, roji `roof-roji`, tsuboniwa `roof-tsuboniwa`, deck `roof-yuka`, balcony `roof-balconies`, post `roof-lantern-post`, crate `roof-crates`, barrel `roof-barrels`, komodaru `roof-komodaru`, zushiTunnel `roof-zushi`, alleyPocket `roof-alley-pockets`, alleyRoute `roof-alley-routes`, utilityPole `roof-utility-poles`, trellis `roof-trellises` |
| r3-canal-market | water `roof-canal`, canalQuarter `roof-canal-banks`, steppingStone `roof-stepping-stones`, canalLanding `roof-canal-landings`, canalBridge `roof-footbridge`, toro `roof-toro`, cherry `roof-cherry-boughs`, boat `roof-takasebune`, canopy `roof-canopy`, vent `roof-canopy-vents`, shopfronts `roof-market-stalls`, marketCrossing `roof-skylight-bridge`, rope `roof-lines`, cistern `roof-cistern`, chimney `roof-chimney`, futonRack `roof-futon-racks`, willow `roof-willows`, culvertLedge `roof-culvert-ledges`, tenmanguGate `roof-tenmangu-gate` |
| r4-festival | yatai `roof-yatai` (+ downtown `decorateStall`), rack `roof-lantern-racks`, float `roof-hoko`, gate `roof-temple-gate`, tsuiji `roof-tsuiji`, yamaFloat `roof-yama` |
| r5-roof-cast | villager `roof-villagers` |

Things `buildWorld()` adds around the run, not from a level piece, are routed
too (fix round 1). Each goes through `assets.build(id, extraLayout(…), classic)`,
and a kit instance is placed **unmerged on the root** where the classic one
stands (`placePiece(…, { merge: false })`). No `build.js` edit is needed to
swap them:

| Lane | Inventory id | Instances | `extraLayout` (world coordinates) |
|---|---|---|---|
| r2 | `roof-ground` | 1 | x 0, y −0.7, z 0, ry 0, band `near`, `size` 1400 (the classic plane's side) |
| r4 | `roof-distant-city` | 1 | x 0, y 0, z 0, band `far`, `bounds` (level bounds), `route` (the rail every 2 m as [x, z]; keep roofs off it) |
| r4 | `roof-skyline-pagodas` | 3 (index 0 east, 1 south, 2 west) | x, z of the classic pagoda, band `far`, `scale` (buildPagoda's 1.35 / 1.6 / 1.1) |
| r5 | `roof-shoki` | 7, one per Shōki pickup | x, y, z and ry of the classic Shōki (rail point at `pickup.s`, `pickup.d`; y `pickup.y`; facing the camera then `pickup.face`), band `near`, `s`, `scale` 1.6, `pickup` (the level record) |
| r5 | `roof-treats` | one per treat | as the Shōki, `scale` 1.4 |

The facade does not scale a kit group: `scale` says how large the classic one
reads (build at that size). A kit pickup's group is registered as the pickup
itself (`userData.pickup` = the level record, pushed to `dynamic.shoki` /
`dynamic.treats`), so `game.js` greets it: on a greeting it sets the material
of each of the group's direct children (the Shōki) or hides the group (a
treat), and `world.update()` turns a Shōki's first child a little.

Rows still built where they are, not routed on their own:

| Lane | Inventory ids | Where they are built |
|---|---|---|
| r2 | `roof-kawara-roofs`, `roof-facades` | `pieces/machiya.js`, inside house, kura, kido, gate, float and the downtown kit (replace them through those pieces) |
| r4 | `roof-sky`, `roof-hills`, `roof-okuribi` | `sky.js` (`Sky`, `buildHills`, `buildFires`) |
| r4 | `roof-atmosphere` | `atmosphere.js` |
| r5 | `roof-chidori` | `game.js` (the game's `Cat` with her coat) + `companion.js` |
| r5 | `roof-boatman`, `roof-hayashi` | inside `pieces/boat.js` and `pieces/float.js` (replace them through the boat and float) |

`sky.js`, `atmosphere.js` and `game.js` are not `build.js`: a lane that swaps
the sky, hills, fires or atmosphere adds its `assets.build` call there
(`game.js` is hot; `sky.js` and `atmosphere.js` are Roof Road modules no lane
owns yet, so ask the Integrator).

## 3. How a Roof Road kit piece registers

1. `defineAsset({ id: 'roof-bridge', family: '<your family>', tiers, params, build(ctx, layout) })`
   in `src/kit/<family>/`, exported from the family's `index.js` `assets`;
   run `node tools/kit_index.mjs`. `kit_check` already accepts every id above
   (they are inventory rows).
2. `layout` is `pieceLayout(pc, index, rail)` (`rooftops/js/build.js`):
   `{ index, type, piece, s, x, y: 0, z, ry, band: 'near', footprint: { colliders: [], exclusions: [], anchors: {} } }`.
   `piece` is the level record (read-only: its `s0`/`s1`, `y`, `d`, heights
   and platform ids are gameplay). Build in the **rail frame at the piece's
   middle**: local x along the rail (x = s − layout.s), y up with the street at
   y = 0, z toward the camera (depth `d`). Every piece sits on one straight leg
   or is a corner (`rooftop_test` checks it), so the frame is exact within a
   piece. This is the frame `frameGroup(rail, s)` gives the classic builders.
3. Return the contract's instance: `{ group, parts, sockets, live, footprint }`
   plus, when the piece moves, `dynamic`. The facade then:
   - places `group` at `(layout.x, 0, layout.z)`, rotation y = `layout.ry`;
   - merges it with the static batches unless `group` itself is in `live`;
     other `live` objects are re-parented to the world root, unmerged.
     The merge (`mergeByMaterial`, `pieces/common.js`) keeps a mesh's
     `color` attribute when its material has `vertexColors: true`
     (`km.bag()`, `km.bamboo({ vcol: true })`); a geometry without one in
     the same batch turns white. Under any other material `color` is
     dropped, as before (Integrator patch, r3 handoff §2). A mesh an alley
     passage cuts (`alley-passages.js` rebuilds it from position, normal
     and uv) loses its colours there;
   - turns every socket whose name starts with `light` into a lantern light
     (the run's light list, as `ctx.light` does);
   - appends `dynamic` entries to the world's moving pieces (`boats`,
     `people`, `shoki`, `treats` arrays; `boat`/`float` slots filled if empty),
     so `world.update()` animates a kit boat, float or villager like the
     classic one. Match the classic records: a boat is `{ group, plat, d,
     boatman, pole, wake, bowRing, lastS: null, dir: 1 }` (`pieces/boat.js`),
     the float `{ group, tassels, musicians }` (`pieces/float.js`), a person
     the record `downtown.js` pushes into `people`.
   - calls `assets.update(dt, t, env)` every frame, with `env.hour` 15 → 21
     over the run's night and `env.lanternOn` past half-night.
4. Register no collision: platforms, walls and ceilings belong to
   `level.js`. Draw the surfaces the level record names, at its heights.
5. A thing from the table of extras above builds from `extraLayout` instead
   (world coordinates, its own origin at the classic spot), and its whole
   group goes on the root, unmerged.
6. Prove it: `node tools/rooftop_golden.mjs` must stay EQUAL on classic
   (nothing you add changes the classic build); `node tools/rooftop_golden.mjs
   --query "swap=<id>:modular"` shows exactly your piece's entries changing;
   `node tools/rooftop_test.mjs` 40/40; open
   `/kyoto-rooftops.html?swap=<id>:modular` and `/labs/roofroad/?specimen=<type>`.

Suggested part names (non-binding; `asset:<id>/<part>` per the contract),
taken from what the classic builders draw: `roof-bridge` deck, rails, piers,
cutwaters, giboshi, ramp; `roof-machiya` walls, roof, ridge, facade, eaves,
deck, lanterns, shoji; `roof-kido` posts, beam, roof, leaves; `roof-hoko`
wheels, undercarriage, brocade, deck, roof, mast, tassels, musicians;
`roof-takasebune` hull, bales, planks, boatman, pole, wake; `roof-canopy`
vaults, ribs, skylights, banners; `roof-yatai` frame, awning, counter,
lanterns.

## 4. Integrator patches (hot or other-lane files)

### 4.1 AGENTS.md (rooftops row, cache busting, verification)

In the `rooftops/` table row, after "Meshes in `build.js`":

> Meshes in `build.js` (the `buildWorld` facade) and `pieces/` (one module per
> piece type; the `PIECES` table in `pieces/index.js` maps each type to its
> inventory id and lane, and `buildWorld` builds every piece through its own
> `AssetRuntime`: classic by default, `?assets=` / `?swap=` honoured). Its
> piece shelf is `labs/roofroad/`.

Replace "Its `../../src/cat.js?v=` and `../../src/textures.js?v=` imports carry
the cache tag (bump them with the others)" with:

> Its tagged imports (`game.js`: `src/cat.js`, `src/kit/runtime.js`; `build.js`:
> `src/kit/runtime.js`; `pieces/paint.js` and `pieces/common.js`:
> `src/textures.js`) carry the cache tag (bump them with the others), as do
> `tools/rooftop_golden.js` and its page.

In "Cache busting", replace "bump `rooftops/js/game.js`, `rooftops/js/build.js`
and `labs/shared/game.js` by hand" with "bump `rooftops/js/game.js`,
`rooftops/js/build.js`, `rooftops/js/pieces/paint.js`,
`rooftops/js/pieces/common.js`, `tools/rooftop_golden.js` and
`labs/shared/game.js` by hand".

In "Verification", Roof Road paragraph: "38 checks" → "40 checks", and add:

> `node tools/rooftop_golden.mjs` (the numeric golden of the built world:
> every piece's meshes and bounds, lights, merged batches, moving pieces,
> materials, update samples, plus the level's platforms, walls and ceilings;
> EQUAL is the gate for any change to `build.js` or `pieces/`; it also runs a
> routing self-test with stand-in kit pieces). `--query "assets=modular"` and
> `--query "swap=<id>:modular"` build the same world on the other sets.
> After a deliberate level or mesh change, `--write` with the reason in the
> commit.

In the Labs line: "after editing `src/main.js` or `src/countryside.js`
regenerate it" → "after editing `src/main.js`, `src/countryside.js` or any
anchored `rooftops/js/` module (`build.js`, `game.js`, `downtown.js`,
`sky.js`, `atmosphere.js`, `pieces/*.js`) or `labs/roofroad/js/shelf.js`,
regenerate it".

### 4.2 `catalog/js/links.mjs` (t1-catalog's file): the Roof Road context link

`originalContextLink()` falls back to `index.html` ("Open the game") for the
Roof Road rows, but the game does not load the Roof Road. Add a branch before
the final `const href = …`:

```js
  } else if (/(^| )rooftops\//.test(files)) {
    path = 'kyoto-rooftops.html'; label = 'The Roof Road page';
    note = 'The Roof Road prototype page (not yet in the game). Its piece shelf is labs/roofroad/; ?mouth=1..7 starts at a mouth.';
  }
```

The evidence links already work: every Roof Road target carries a `url`
(`labs/roofroad/index.html?specimen=<type>#specimen-<type>`,
`kyoto-rooftops.html`, `kyoto-rooftops.html?finale=1`), which
`resolveTargetLink()` uses as is (`node tools/catalog_check.mjs` passes).
No `asset-loader.mjs` adapter is added: the shelf is not a workshop
`recipes.js`, so the Roof Road rows have no isolated lab/original viewer yet.

### 4.3 `tools/verify.mjs` (optional): a Roof Road cache-tag check

Nothing checks that `rooftops/js/**` and `tools/rooftop_golden.js` import
with `src/main.js`'s tag (labs_check covers `labs/`, verify covers the summit
and kit). A stale tag would load a second `src/kit/runtime.js` or
`src/textures.js`. Suggested: in verify's static wiring step, grep
`rooftops/js/**/*.js` and `tools/rooftop_golden.*` for `?v=` and fail on any
tag other than main.js's.

### 4.4 Board

Tick R1.1 to R1.5 in `BUILD_GUIDE_FABLE.md` section 12 and the lane on the
master board. Note for the guide's R1.4 line: the Phase 0 mouth captures are
not pixel-repeatable (P0 note), so the gate is the numeric golden, and the
rooftop test count is 40, not 38.

## 5. Porting outside `build.js` edits

Any branch cut before this split (the operator's live Roof Road work under
ruling R65, `feat/rooftops-stage2`, `rooftops-agility`, `rooftops-downtown`)
edits the old single-file `build.js`. git cannot carry those hunks over: the
code they touch now lives in `pieces/`. Port them by hand, one hunk at a time,
after merging that work's other files (`game.js`, `level.js`, `physics.js`,
`downtown.js`, new modules) normally.

1. **Get the diff against the split's base.** With the outside work on a
   commit X whose `build.js` descends from 8702cc7's (or 676506f's):
   `git diff <base> X -- rooftops/js/build.js > /tmp/outside.diff`, where
   `<base>` is the commit X branched from. Keep this checkout's `build.js`
   (the facade) in the merge (`git checkout --ours rooftops/js/build.js` on
   conflict); the hunks are applied below, not merged.
2. **Find each hunk's home.** Do not trust the hunk header's function
   name: git prints the last declaration *above* the hunk, so a hunk that
   edits `B.bridge` can be headed `@@ … @@ B.corner`. Locate the target
   instead by either
   - the first `B.<type> =` (or `function <name>(`) line inside the hunk's
     own context or removed lines, when it shows one; or
   - the hunk's old line range (`@@ -<start>,<n>`) against the base file's
     declarations: `git show <base>:rooftops/js/build.js | grep -nE
     '^(B\.[A-Za-z]+ = |(export )?function |const [A-Za-z]+ = )'` lists where
     each block starts, and the hunk belongs to the last block that starts
     at or before `<start>`.

   Then map that old declaration to its new module:

   | Old `build.js` code | Now in |
   |---|---|
   | `B.<type> = (pc, ctx) => {` (35 types) | `pieces/<type>.js`, `export const <type> = …` (`PIECES[type].file` names the file) |
   | canvases, `windMaterial`, `flowWaterMaterial`, `makeMaterials` (the material set `M`) | `pieces/paint.js` |
   | `UP`, `TAU`, `box`, `cyl`, `slope`, `triangle`, `frameGroup`, `ribbon`, `mergeByMaterial`, `paperCapMaterial` | `pieces/common.js` |
   | `ridgeCap`, `hiraRoof`, `tsumaRoof`, `facade`, `streetEaveDetails` | `pieces/machiya.js` |
   | `makeShoki`, `makeTreat` | `pieces/pickups.js` |
   | `buildDistantCity`, `buildPagoda` | `pieces/skyline.js` |
   | `boatHullGeometry` | `pieces/boat.js` |
   | `installDowntown(B, …)` call, the downtown dressing (`decorateHouse`/`decorateStall`) | `pieces/index.js` (`DT`, the `decorate` column) |
   | `buildWorld`: imports, ctx, the piece loop, merging, ground, city, pagodas, pickups, `update()` | `build.js` (the facade; the ground, city, pagodas and pickups now sit inside `assets.build(…)` classic callbacks, `update()` is unchanged apart from a `children[0]` guard on the Shōki wobble) |
   | the file's import lines | the importing module: a new import from `three`, `src/textures.js?v=…` or a sibling module goes into the piece file that uses it |

   Because the piece bodies were moved verbatim, a hunk's context lines
   match its new file exactly, apart from the head line
   (`B.x = (pc, ctx) => {` → `export const x = (pc, ctx) => {`). Apply it
   there: rewrite the hunk's `---`/`+++` paths to the new module and run
   `git apply --recount` (it finds the shifted lines by their context), or
   apply it by hand. A hunk whose context includes the head line needs that
   line edited first. The safety net: `git apply --recount` rejects a hunk
   sent to the wrong file, because its context lines are not there; a
   rejected hunk means the home was misread, so locate it again rather than
   forcing it (`--reject`, `--3way` or hand-editing the context).
3. **New things.**
   - A new piece type (a new `B.x` or a new `installDowntown` builder that
     the level uses): add a `pieces/<x>.js` (or keep it in `downtown.js`),
     a `PIECES` entry `x: piece('roof-<id>', '<lane>', '<file>', builder)`
     in the same one-line form, an inventory row (group `Roof Road`, sources
     naming the module), a shelf line in `labs/roofroad/js/shelf.js`, a
     target `roofroad/<x>`, and a swap-matrix lane row. `labs_coverage` and
     the matrix fail until all of these agree.
   - A new imported helper module (the reviewer saw `people.js` with
     `makeResident`, `alley-passages.js`, `camera-obstacles.js`): classify it
     in `labs/asset_inventory.json` `sourceFiles` and give every
     `build/create/make` function it declares an owner row or an
     `ignoredBuilders` entry (`makeResident`: probably the
     `roof-villagers` / `roof-hayashi` rows, which then list it as a source).
   - A deleted module (`cutaway.js`): drop its `sourceFiles` entry and its
     `ignoredBuilders` entry (`makeCutaway`), and the import from `build.js`.
4. **Re-check, then re-write the golden.** Run `node tools/rooftop_test.mjs`
   (all pass), then `node tools/rooftop_golden.mjs`: it will read DIFFERENT
   wherever the outside work changed meshes. Confirm that the changed entries
   are exactly the ported pieces (the summary names the first piece that
   changed; `--json` lists all of them), then
   `node tools/rooftop_golden.mjs --write` with the reason in the commit
   ("port <work> into pieces/"). Re-run it plain (EQUAL) and with
   `--query "assets=modular"` (EQUAL, routing self-test passing).
5. **Regenerate.** `node tools/labs_coverage.mjs --write` (anchors moved),
   `node tools/fable_swap_matrix.mjs --write` if rows changed, then
   `node tools/labs_check.mjs`, `node --test tools/labs_coverage_test.mjs`,
   and open `/labs/roofroad/` (every tile builds) and
   `/kyoto-rooftops.html?qa=1&auto=1` (the autopilot reaches the finale).

## 6. Merging the operator's stage-2 route (feat/rooftops-stage2, 17c9cae)

Probed without touching that branch (`git merge-tree --write-tree` of this
branch and 17c9cae): **no conflict** (exit 0, tree 4c82f6c). That tree,
exported to a scratch dir:

- `node tools/rooftop_golden.mjs` → `DIFFERENT` (expected: the level grows to
  829 pieces, 1157 platforms; first change `#387 street at s=960.6`), 0 empty
  pieces, routing self-test `ok 27/27`: the facade builds every new piece.
- `node tools/rooftop_test.mjs` → `38 passed, 2 failed`, the same two
  failures as 17c9cae alone ("every piece sits on one straight leg",
  "autopilot reaches the perch") — the operator's work in progress, not this
  lane.

After that merge, rewrite the golden from the merged tree (`node
tools/rooftop_golden.mjs --write`, reason: stage-2 route) once its two
rooftop tests pass, and regenerate `labs/ASSET_COVERAGE.md` if any anchored
module moved. The split assumes nothing about `level.js` beyond its
exports and has no mouth count of its own (`build.js` keeps the original
`level.mouths[6]` float culling line verbatim). The pieces import only `hash1` from `level.js`; the lab reads
`buildLevel()` and `level.mouths`, whatever their number.
